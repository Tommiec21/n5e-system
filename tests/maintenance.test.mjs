/** Regression coverage for the modularity audit: exercise complete boundaries, not just helpers. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import "./helpers/foundry-stub.mjs";
import { activityFields } from "../module/data/fields/shared.mjs";
import { unknownActivityFields } from "../module/rules/activity-contract.mjs";
import { itemModels } from "../module/data/_index.mjs";
import { parseActivities, parseInflicted } from "../module/rules/activity-parse.mjs";
import { withActorLock, withActorLocks } from "../module/workflow/commands.mjs";
import { resourceChange } from "../module/rules/resources.mjs";
import { payPoolCost, onActivityClick, activityButtons } from "../module/workflow/activity-buttons.mjs";
import { applyHealing } from "../module/workflow/health.mjs";
import { registerSocket, asGM, validateEffectRequest } from "../module/socket.mjs";
import { MIGRATIONS, checkMigrations } from "../module/migration/runner.mjs";

function environment() {
  globalThis.game = { user: { isGM: true, targets: new Set() }, users: { activeGM: { isSelf: true } },
    settings: { get: () => undefined }, combat: { started: true, id: "combat", round: 1, turn: 0 } };
  globalThis.ui = { notifications: { info() {}, warn() {}, error() {} } };
  globalThis.canvas = { tokens: { controlled: [] } };
  globalThis.CONFIG = { N5E: { conditions: {}, damageTypes: {} }, ChatMessage: { documentClass: { getSpeaker: () => ({}), create: async data => data } } };
}

function actor() {
  const a = { uuid: "Actor.test", name: "Test", isOwner: true, documentName: "Actor", flags: { n5e: {} }, items: [], effects: [],
    system: { hp: { value: 0, max: 20 }, cp: { value: 4, max: 10 }, deathSaves: { success: 2, failure: 1 }, resources: { focus: { value: 2, maxValue: 5, label: "Focus" } } } };
  a.items.get = id => a.items.find(i => i.id === id);
  a.update = async data => {
    for ( const [path, value] of Object.entries(data) ) {
      const keys = path.split("."); let target = a;
      for ( const k of keys.slice(0, -1) ) target = target[k] ??= {};
      target[keys.at(-1)] = value;
    }
  };
  a.statusChanges = [];
  a.toggleStatusEffect = async (key, options) => a.statusChanges.push([key, options.active]);
  return a;
}

test("every authored activity survives its real schema without dropping supported flags", () => {
  let count = 0;
  const root = new URL("../packs/_source/", import.meta.url);
  for ( const pack of fs.readdirSync(root) ) for ( const file of fs.readdirSync(new URL(`${pack}/`, root)) ) {
    const data = JSON.parse(fs.readFileSync(new URL(`${pack}/${file}`, root), "utf8"));
    if ( !itemModels[data.type] || !data.system?.activities?.length ) continue;
    const model = new itemModels[data.type](data.system);
    data.system.activities.forEach((activity, i) => {
      assert.deepEqual(unknownActivityFields(activity, activityFields()), [], data.name);
      for ( const [group, key] of [["cost", "gain"], ["cost", "choose"], ["save", "resave"]] ) {
        if ( activity[group]?.[key] ) { count++; assert.equal(model.activities[i][group][key], true, `${data.name}: ${group}.${key}`); }
      }
    });
  }
  assert.ok(count >= 25);
  assert.deepEqual(unknownActivityFields({ cost: { imaginary: true } }, activityFields()), ["activity.cost.imaginary"]);
});

test("live registry additions are recognized and alternative save damage never accumulates", () => {
  environment();
  CONFIG.N5E.conditions.soaked = { label: "Soaked" };
  CONFIG.N5E.damageTypes.moonlight = { label: "Moonlight" };
  assert.equal(parseInflicted("gain the Soaked condition")[0].key, "soaked");
  assert.deepEqual(parseInflicted("The creature is immune to the Burned condition."), []);
  assert.deepEqual(parseInflicted("Remove the Burned condition."), []);
  const acts = parseActivities("The target makes a Wisdom saving throw. On a failure it takes 1d6 psychic damage. On a critical failure it takes 2d6 psychic damage.", { discipline: "gen" });
  assert.deepEqual(acts[0].damage.parts, []);
  assert.match(acts[0].save.tiers.failure, /1d6/);
  assert.match(acts[0].save.tiers.critFailure, /2d6/);
  assert.equal(parseActivities("Deals 1d6 moonlight damage.")[0].damage.parts[0].type, "moonlight");
});

test("resource mutations serialize, reject negative/fractional amounts and preserve explicit zero", async () => {
  environment(); const a = actor();
  for ( const amount of [-1, 1.5, Infinity, NaN] ) assert.throws(() => resourceChange(a.system.resources.focus, amount));
  assert.equal(resourceChange(a.system.resources.focus, 0), 2);
  assert.throws(() => resourceChange(a.system.resources.focus, 4, { gain: true }));
  const result = await Promise.all([payPoolCost(a, { pool: "focus", amount: 2 }), payPoolCost(a, { pool: "focus", amount: 2 })]);
  assert.equal(a.system.resources.focus.value, 0);
  assert.equal(result.filter(Boolean).length, 1);
  await assert.rejects(withActorLock(a, async () => { throw new Error("failed"); }));
  assert.equal(await withActorLock(a, async () => 7), 7);
});

test("multi-actor lock order handles opposing actions without deadlocking", async () => {
  const a = { uuid: "A" }, b = { uuid: "B" }, order = [];
  await Promise.all([withActorLocks([a, b], async () => order.push(1)), withActorLocks([b, a], async () => order.push(2))]);
  assert.equal(order.length, 2);
});

test("all healing blocks Envenomed and revives through one shared service", async () => {
  environment(); const a = actor();
  a.effects = [{ type: "condition", system: { key: "envenomed" } }];
  assert.match((await applyHealing(a, 5)).blocked, /Envenomed/);
  assert.equal(a.system.hp.value, 0);
  a.effects = [];
  await applyHealing(a, 5);
  assert.equal(a.system.hp.value, 5);
  assert.equal(a.system.deathSaves.success, 0);
  assert.equal(a.system.deathSaves.failure, 1);
  assert.deepEqual(a.statusChanges, [["dying", false], ["unconscious", false], ["stabilized", false]]);
});

test("once-per-turn resource-only activity executes once across separate chat buttons", async () => {
  environment(); const a = actor();
  const activity = { id: "gain", type: "roll", label: "Gain Focus", oncePerTurn: true, activation: "bonus", cost: { pool: "focus", amount: 1, gain: true } };
  a.items.push({ id: "feature", system: { activities: [activity] } });
  globalThis.fromUuid = async () => a;
  const message = { getFlag: (scope, key) => key === "actorUuid" ? a.uuid : null };
  const button = () => ({ dataset: { n5eAct: "roll", item: "feature", activity: "gain", once: "1", activation: "bonus", cost: JSON.stringify(activity.cost) } });
  await Promise.all([onActivityClick(message, button(), {}), onActivityClick(message, button(), {})]);
  assert.equal(a.system.resources.focus.value, 3);
  assert.equal(a.flags.n5e.economy.bonus, true);
  game.combat.turn++;
  await onActivityClick(message, button(), {});
  assert.equal(a.system.resources.focus.value, 4);
});

test("cancelled activity refunds its resource payment and does not consume the turn allowance", async () => {
  environment(); const a = actor();
  globalThis.fromUuid = async () => a;
  // A cancelled/unsupported action must not leave a resource debit behind.
  const result = await onActivityClick({ getFlag: (s, k) => k === "actorUuid" ? a.uuid : null },
    { dataset: { n5eAct: "strike", cost: JSON.stringify({ pool: "focus", amount: 1 }), strike: '{"kind":"weapon"}' } }, {});
  assert.equal(result, undefined);
  assert.equal(a.system.resources.focus.value, 2);
});

test("manual activity kinds display instructions instead of silently disappearing", () => {
  const html = activityButtons({ system: {} }, { id: "j", name: "Step", system: {} }, [{ type: "movement", label: "Move", text: "Move 10 feet." }]);
  assert.match(html, /Move 10 feet/);
  assert.doesNotMatch(html, /data-n5e-act=/);
});

test("GM relay refuses remote document deletion and requires approval for target effects", async () => {
  environment(); let callback, applied = 0, approvals = 0;
  const emitted = [];
  game.socket = { on: (channel, handler) => { callback = handler; }, emit: (channel, data) => emitted.push(data) };
  globalThis.fromUuid = async () => ({ documentName: "Actor", name: "Target", createEmbeddedDocuments: async () => applied++ });
  foundry.applications = { api: { DialogV2: { confirm: async () => { approvals++; return false; } } } };
  registerSocket();
  await callback({ requestId: "delete-test", type: "deleteEffects", payload: { uuids: ["Actor.target"] } });
  assert.equal(emitted[0].ok, false);
  await callback({ requestId: "effect-test", type: "createEffects", payload: { actorUuid: "Actor.target", effects: [{ name: "Mark", type: "generic" }] } });
  assert.equal(approvals, 1); assert.equal(applied, 0);
  foundry.applications.api.DialogV2.confirm = async () => true;
  await callback({ requestId: "approved-test", type: "createEffects", payload: { actorUuid: "Actor.target", effects: [{ name: "Mark", type: "generic" }] } });
  assert.equal(applied, 1);
  await callback({ requestId: "approved-test", type: "createEffects", payload: { actorUuid: "Actor.target", effects: [{ name: "Mark", type: "generic" }] } });
  assert.equal(applied, 1);
  assert.throws(() => validateEffectRequest({ name: "Bad", changes: [{ key: "ownership.default", mode: 5, value: "3" }] }));
  await assert.rejects(asGM("spendRations", { amount: -1 }));
});

test("failed migration records retry details and never advances its version", async () => {
  environment(); const saved = [], steps = [...MIGRATIONS];
  game.actors = { size: 1 }; game.items = { size: 0 };
  game.settings = { get: () => 0, set: async (scope, key, value) => saved.push({ key, value }) };
  foundry.applications = { api: { DialogV2: { confirm: async () => true } } };
  MIGRATIONS.splice(0, MIGRATIONS.length, { id: 1, run: async () => { const e = new Error("failed"); e.failures = [{ uuid: "Actor.a", error: "write failed" }]; throw e; } });
  try {
    await assert.rejects(checkMigrations(), /failed/);
    assert.equal(saved.some(s => s.key === "migrationVersion"), false);
    assert.equal(saved[0].value.errors[0].uuid, "Actor.a");
  } finally { MIGRATIONS.splice(0, MIGRATIONS.length, ...steps); }
});

test("upgrade repairs only dropped booleans and preserves ids and homebrew activity values", async () => {
  environment();
  foundry.utils = { deepClone: structuredClone };
  const item = { id: "keep-id", uuid: "Item.keep-id", name: "Custom name", type: "feat", _source: { type: "feat" },
    _stats: { compendiumSource: "Compendium.n5e.features.source" },
    system: { activities: [{ id: "activity", label: "Custom label", cost: { pool: "focus", amount: 9 } }] },
    update: async data => { item.system.activities = data["system.activities"]; } };
  game.actors = []; game.items = [item]; game.items._source = [{ _id: item.id, type: "feat", system: {} }];
  globalThis.fromUuid = async () => ({ _source: { system: { activities: [{ id: "activity", label: "Book label", cost: { amount: 1, gain: true, choose: true } }] } } });
  await MIGRATIONS[1].run([]);
  assert.equal(item.id, "keep-id");
  assert.equal(item.system.activities[0].label, "Custom label");
  assert.equal(item.system.activities[0].cost.amount, 9);
  assert.equal(item.system.activities[0].cost.gain, true);
  assert.equal(item.system.activities[0].cost.choose, true);
});

test("migration validates replacement and restores the original when creation fails", async () => {
  environment(); foundry.utils = { deepClone: structuredClone };
  const original = { _id: "old", name: "Old jutsu", type: "spell", system: { level: 1 } };
  let deleted = 0, restored = null, validated = false;
  class Document {
    constructor(data) { this.data = data; }
    validate() { validated = true; }
    static async create(data) { if ( data.type === "jutsu" ) throw new Error("create failed"); restored = data; }
  }
  const doc = new Document(original);
  Object.assign(doc, { id: "old", uuid: "Item.old", name: "Old jutsu", _source: original,
    update: async () => { throw new Error("type update refused"); },
    delete: async () => { assert.equal(validated, true); deleted++; }, toObject: () => structuredClone(original) });
  game.actors = []; game.items = [doc]; game.items._source = [original];
  await assert.rejects(MIGRATIONS[0].run([]), /could not be migrated/);
  assert.equal(deleted, 1);
  assert.equal(restored._id, "old");
  assert.equal(restored.type, "spell");
});
