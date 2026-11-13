import { test } from "node:test";
import assert from "node:assert/strict";
import { contextualModifiers, contextualSpec, rollOptions, ruleToggles, testPredicate } from "../module/rules/elements.mjs";
import { activeCoatings, coatingData, spendCoatings } from "../module/rules/coatings.mjs";
import { cleanupSummons, coatWeapon, setRuleElements, summonTokens } from "../module/workflow/automation.mjs";
import { rollWithSpec, spendWillOfFire } from "../module/dice/roll.mjs";
import { onActivityClick } from "../module/workflow/activity-buttons.mjs";

const item = (rules, extra = {}) => ({ uuid: "Actor.a.Item.i", name: "Feature", flags: { n5e: { rules, ...extra } } });
const modifier = (value, extra = {}) => ({ key: "modifier", selector: "attack", value, ...extra });
const actor = items => ({ uuid: "Actor.a", name: "Hero", system: { combat: { fury: 1 }, willOfFire: { value: 0 } }, items, effects: [], statuses: new Set() });

test("predicates combine nested all/any/not and reject malformed expressions", () => {
  const options = new Set(["a", "b"]);
  assert.equal(testPredicate({ all: ["a", { any: ["b", "c"] }], not: ["d"] }, options), true);
  assert.equal(testPredicate({ not: ["a"] }, options), false);
  for ( const bad of [null, 4, { eval: "a" }, { any: [] }, { all: "a" }] ) assert.equal(testPredicate(bad, options), false);
});

test("context uses one target and active statuses, fury and tracker kinds", () => {
  const a = actor([]);
  const t = actor([]);
  t.effects = [{ flags: { n5e: { tracker: { kind: "mark" } } } }, { disabled: true, flags: { n5e: { state: "offGuard" } } }];
  const options = rollOptions(a, { kind: "attack", scope: "tai" }, t);
  assert.ok(options.has("target:tracker:mark"));
  assert.ok(options.has("self:state:furious"));
  assert.ok(!options.has("target:state:offGuard"));
  assert.ok(!rollOptions(a).has("target"));
});

test("modifiers stack by source without mutating a prepared breakdown; toggles and selectors gate them", () => {
  const a = actor([item([modifier(2)]), item([modifier(4)], { ruleToggle: { enabled: false } }),
    item([modifier(1, { predicate: "target:status:marked" })]), item([modifier(99, { selector: undefined })])]);
  const spec = { label: "Strike", kind: "attack", type: "weaponAttack", bonus: 6, breakdown: { parts: [{ label: "Base", value: 6 }] } };
  const result = contextualSpec(a, spec, { statuses: ["marked"] });
  assert.equal(result.bonus, 9);
  assert.equal(spec.breakdown.parts.length, 1);
  assert.equal(result.breakdown.parts.length, 3);
  assert.equal(contextualSpec(a, spec).bonus, 8);
  assert.equal(ruleToggles(a).length, 1);
});

test("transferred effects count once, inactive stances and disabled effects never contribute", () => {
  const effect = { name: "Effect", active: true, flags: { n5e: { rules: [modifier(3)] } } };
  const a = actor([{ ...item([modifier(10)]), type: "stance", id: "off", effects: [effect] }]);
  a.allApplicableEffects = function* () { yield effect; yield { ...effect, active: false }; };
  assert.equal(contextualModifiers(a, { kind: "attack" }).bonus, 3);
  a.items[0].id = "on";
  a.system.combat.activeStance = "on";
  assert.equal(contextualModifiers(a, { kind: "attack" }).bonus, 13);
});

test("save tier shifts include existing Active Effects; damage modifiers use their own selector", () => {
  const a = actor([item([{ key: "degreeShift", selector: "save", value: -1 }, modifier(5, { selector: "damage", predicate: "self:state:furious" })])]);
  a.system.saveTierShift = 2;
  assert.equal(contextualModifiers(a, { kind: "save" }).shift, 1);
  assert.equal(contextualModifiers(a, { kind: "damage" }).bonus, 5);
  assert.equal(contextualModifiers(a, { kind: "attack" }).bonus, 0);
});

test("coatings expire at the boundary and spend once; authored weapon data stays intact", async () => {
  const c = coatingData({ id: "venom", label: "Venom", duration: 60, uses: 1, parts: [{ formula: "1d6", type: "poison" }] }, 10);
  assert.equal(c.expires, 70);
  assert.equal(activeCoatings({ flags: { n5e: { coatings: [c] } } }, 69).length, 1);
  assert.equal(activeCoatings({ flags: { n5e: { coatings: [c] } } }, 70).length, 0);
  assert.equal(spendCoatings([c])[0].uses, 0);
  assert.equal(c.uses, 1);
  assert.equal(spendCoatings([{ ...c, uses: null }])[0].uses, null);
  assert.throws(() => coatingData({ ...c, duration: -1 }));
  globalThis.game = { time: { worldTime: 10 } };
  const weapon = { type: "weapon", isOwner: true, system: { damage: { die: "1d8" } }, update: async data => data };
  const update = await coatWeapon(weapon, { id: "fire", parts: [{ formula: "1d6", type: "fire" }] });
  assert.deepEqual(Object.keys(update), ["flags.n5e.coatings"]);
  assert.equal(weapon.system.damage.die, "1d8");
  await assert.rejects(setRuleElements({ isOwner: false }, []));
});

test("summons are Allied NPCs: unlinked tokens owned by the summoner; cleanup deletes only expired summons", async () => {
  const created = [];
  const removed = [];
  const a = actor([]);
  const i = { id: "j", uuid: "Actor.a.Item.j", actor: a };
  const scene = { tokens: [], createEmbeddedDocuments: async (kind, data) => { created.push(...data); return data; },
    deleteEmbeddedDocuments: async (kind, ids) => removed.push(...ids) };
  globalThis.game = { user: { id: "gm1", isGM: true }, time: { worldTime: 10 }, users: { activeGM: { isSelf: true } }, scenes: [scene] };
  globalThis.canvas = { ready: true, scene, dimensions: { size: 100 }, tokens: { controlled: [], placeables: [] } };
  globalThis.Hooks = { callAll() {} };
  globalThis.fromUuid = async () => ({ documentName: "Actor", prototypeToken: { width: 1 },
    getTokenDocument: async data => ({ toObject: () => ({ _id: "old", ...data }) }) });
  await summonTokens(a, i, { uuid: "Actor.template", x: 100, y: 100, count: 2, seconds: 60 });
  assert.equal(created.length, 2);
  assert.equal(created[0].actorLink, false);
  assert.equal(created[1].x, 200);
  assert.equal(created[0]._id, undefined);
  assert.equal(created[0].delta.ownership.gm1, 3);
  assert.equal(created[0].delta.system.allied, true);
  assert.equal(created[0].disposition, 1);
  assert.deepEqual(created[0].flags.n5e.allied, { ownerId: "gm1", casterUuid: a.uuid, itemId: "j" });
  scene.tokens = [{ id: "expired", flags: { n5e: { summon: { expires: 5 } } } }, { id: "normal" },
    { id: "live", flags: { n5e: { summon: { expires: 90 } } } }];
  await cleanupSummons();
  assert.deepEqual(removed, ["expired"]);
  game.user.isGM = false;
  a.testUserPermission = () => false;
  await assert.rejects(summonTokens(a, i, { uuid: "Actor.template" }), /own the summoner/);
});

test("live roll pipeline shows sources, selects only the matching save tier and persists its result", async () => {
  globalThis.game = { user: { targets: new Set() }, settings: { get: () => false } };
  globalThis.CONFIG = { ChatMessage: { documentClass: { getSpeaker: () => ({}) } } };
  globalThis.Roll = class {
    constructor(formula, data) { this.total = 10 + data.bonus; this.dice = [{ faces: 20, results: [{ result: 10 }] }]; }
    async evaluate() { return this; }
    async toMessage(data) { return data; }
  };
  const a = actor([item([modifier(2, { selector: "save" })])]);
  const result = await rollWithSpec(a, { kind: "save", type: "save", key: "wis", label: "Wisdom", bonus: 0 },
    { dc: 12, fourTier: true, onFail: "Unrelated failure buttons", tiers: { success: "Success effect", failure: "Failure effect", critFailure: "Critical failure effect" } });
  assert.equal(result.flags.n5e.roll.degree, 2);
  assert.match(result.flavor, /Roll breakdown/);
  assert.match(result.flavor, /Success effect/);
  assert.doesNotMatch(result.flavor, /Failure effect|Critical failure effect/);
  assert.equal(result.flags.n5e.roll.bonus, 2);
});

test("Will of Fire reroll recomputes a stored save result using the original contextual bonus", async () => {
  const a = actor([]);
  a.isOwner = true;
  a.system.willOfFire.value = 1;
  a.update = async () => {};
  globalThis.fromUuid = async () => a;
  globalThis.CONFIG = { ChatMessage: { documentClass: { getSpeaker: () => ({}) } } };
  globalThis.Roll = class {
    constructor() { this.total = 19; this.dice = [{ faces: 20, results: [{ result: 19 }] }]; }
    async evaluate() { return this; }
    async toMessage(data) { return data; }
  };
  const result = await spendWillOfFire({ getFlag: () => ({ actorUuid: a.uuid, kind: "save", label: "Wisdom", bonus: 0,
    dc: 12, degree: 0, degreeShift: 0, fourTier: true, tiers: { critFailure: "Old outcome", critSuccess: "New outcome" } }) }, "reroll");
  assert.equal(result.flags.n5e.roll.degree, 3);
  assert.match(result.flavor, /New outcome/);
  assert.doesNotMatch(result.flavor, /Old outcome/);
});

test("coated critical damage doubles the coating dice without duplicating the weapon ability bonus", async () => {
  const formulas = [];
  const updates = [];
  const a = actor([]);
  const weapon = { type: "weapon", isOwner: true, flags: { n5e: { coatings: [coatingData({ id: "fire", uses: 1,
    parts: [{ formula: "1d6", type: "fire" }] })] } }, update: async data => updates.push(data) };
  a.items.get = () => weapon;
  globalThis.fromUuid = async () => a;
  globalThis.game = { time: { worldTime: 0 }, user: { targets: new Set() } };
  globalThis.CONFIG = { N5E: { damageTypes: { fire: { label: "Fire" }, slashing: { label: "Slashing" } } },
    ChatMessage: { documentClass: { getSpeaker: () => ({}), create: async data => data } } };
  globalThis.Roll = class {
    constructor(formula) { formulas.push(formula); this.total = 6; }
    async evaluate() { return this; }
  };
  const result = await onActivityClick({ getFlag: (scope, key) => key === "actorUuid" ? a.uuid : undefined },
    { dataset: { n5eAct: "damage", weaponId: "w", crit: "1", mod: "3", parts: JSON.stringify([{ formula: "1d8 + 3", type: "slashing" }]) } }, {});
  assert.deepEqual(formulas, ["2d8 + 3 + 3", "2d6"]);
  assert.equal(updates[0]["flags.n5e.coatings"][0].uses, 0);
  assert.deepEqual(result.flags.n5e.damage.instances.map(i => i.type), ["slashing", "fire"]);
});
