import { test } from "node:test";
import assert from "node:assert/strict";
import { damagePlan } from "../module/rules/damage.mjs";
import { deflectionOffer } from "../module/rules/deflection.mjs";
import { onApplyClick } from "../module/workflow/apply-damage.mjs";

const target = () => ({ system: { dr: 5, hp: { value: 100, temp: 0, max: 100 }, cp: { value: 100, temp: 0 }, traits: {} } });
test("static and rolled DR each protect HP and CP; chosen type order changes resistance outcomes", () => {
  const actor = target();
  const both = damagePlan(actor, [{ amount: 8, type: "fire" }, { amount: 8, type: "chakra" }]);
  assert.equal(both.health, 3); assert.equal(both.chakra, 3); assert.equal(both.requiresDROrder, false);
  const roll = damagePlan(actor, [{ amount: 12, type: "fire" }, { amount: 12, type: "chakra" }], { flatReduction: 3 });
  assert.equal(roll.health, 4); assert.equal(roll.chakra, 4);
  actor.system.traits.resist = new Set(["fire"]);
  const hit = [{ amount: 8, type: "fire" }, { amount: 8, type: "lightning" }];
  assert.equal(damagePlan(actor, hit).requiresDROrder, true);
  assert.equal(damagePlan(actor, hit, { drOrder: ["fire", "lightning"] }).health, 9);
  assert.equal(damagePlan(actor, hit, { drOrder: ["lightning", "fire"] }).health, 7);
  assert.throws(() => damagePlan(actor, hit, { drOrder: ["fire", "fire"] }), /exactly once/);
  assert.equal(damagePlan(actor, hit, { ignoreDR: true, flatReduction: 3 }).requiresDROrder, false);
});

test("Deflection offers scale and respect allowances, pools, exempt damage and upgraded techniques", () => {
  const actor = { ...target(), flags: {}, statuses: new Set(), items: [{ id: "d", system: { identifier: "discipline" } }, { type: "class", system: { identifier: "weapon-specialist", levels: 11 } }] };
  actor.system.resources = { discipline: { value: 1 } };
  const context = { combat: true, instances: [{ type: "fire", amount: 10 }] };
  assert.equal(deflectionOffer(actor, context).dice, 2);
  actor.items[1].system.levels = 20; assert.equal(deflectionOffer(actor, context).dice, 3);
  assert.equal(deflectionOffer(actor, { ...context, ignoreDR: true }), null);
  assert.equal(deflectionOffer(actor, { ...context, genjutsu: true, instances: [{ amount: 10, type: "psychic" }] }), null);
  actor.flags.n5e = { economy: { reaction: true } }; assert.equal(deflectionOffer(actor, context), null);
});

function coordinatedFixture({ uncanny = false, visible = true, missingSource = false } = {}) {
  const actor = { ...target(), documentName: "Actor", uuid: "Actor.target", id: "target", name: "Defender", isOwner: true, flags: {}, statuses: new Set(), _stats: { modifiedTime: 1 } };
  actor.system.resources = { discipline: { value: 2 } };
  actor.items = [{ id: "d", name: "Discipline", actor, system: { identifier: "discipline" } }, { type: "class", system: { identifier: "weapon-specialist", levels: 11 } }];
  if ( uncanny ) actor.items[0] = { id: "u", name: "Uncanny Dodge", actor, system: { identifier: "uncanny-dodge" } };
  actor.items.get = id => actor.items.find(i => i.id === id);
  actor.testUserPermission = () => true;
  actor.update = async update => { for ( const [key, value] of Object.entries(update) ) { const keys = key.split("."); let object = actor; for ( const k of keys.slice(0, -1) ) object = object[k] ??= {}; object[keys.at(-1)] = value; } actor._stats.modifiedTime++; };
  const gm = { id: "gm", active: true, isGM: true }, users = [gm]; users.activeGM = { isSelf: true };
  let ledger = { version: 1, epoch: 1, entries: [] }, rolls = 0;
  const messages = new Map();
  globalThis.game = { user: gm, users, messages, combat: { id: "c", started: true, round: 1, turn: 0 },
    settings: { get: (scope, key) => key === "requestReceipts" ? ledger : ["coordinatedDamage", "reactionWindows"].includes(key) ? true : key === "reactionTimeoutSeconds" ? 0 : false,
      set: async (scope, key, value) => { ledger = value; } } };
  const observer = { actor, document: { parent: { id: "s" }, elevation: 0, sight: { enabled: true }, detectionModes: [{ id: "basicSight", enabled: true, range: 30 }] } };
  observer.vision = missingSource ? null : { object: observer, los: {} };
  const attacker = { actor: { uuid: "Actor.attacker", effects: [], statuses: new Set() }, document: { parent: { id: "s" }, elevation: 0 }, center: { x: 10, y: 0 } };
  globalThis.canvas = { ready: true, scene: { id: "s" }, tokens: { controlled: [observer], get: () => attacker } };
  globalThis.fromUuid = async () => actor;
  globalThis.ui = { notifications: { info() {}, warn() {} } };
  globalThis.Hooks = { callAll() {} };
  // The GM owns this creature, so the GM is asked directly (dnd5e parity): accept the reaction.
  globalThis.foundry = { ...(globalThis.foundry ?? {}), applications: { api: { DialogV2: { wait: async () => "accepted", confirm: async () => true } } } };
  globalThis.Roll = class { async evaluate() { rolls++; this.total = 6; return this; } async toMessage() {} };
  globalThis.CONFIG = { Canvas: { detectionModes: { basicSight: { testVisibility: () => visible } } }, ChatMessage: { documentClass: { getSpeaker: () => ({}), create: async data => {
    const message = { ...data, id: String(messages.size), author: gm, getFlag: (scope, key) => message.flags?.n5e?.[key] };
    if ( data.flags?.n5e?.reactionWindow ) data.flags.n5e.reactionWindow.state = "accepted"; // Simulates an already reviewed GM decision.
    messages.set(message.id, message); return message;
  } } } };
  const data = { instances: [{ amount: 20, type: "fire" }], total: 20 };
  const source = { uuid: "ChatMessage.source", speaker: { scene: "s", token: "attacker" }, getFlag: (scope, key) => key === "actorUuid" ? "Actor.attacker" : data }, button = { dataset: { n5eApply: "full" } };
  return { actor, source, button, ledger: () => ledger, rolls: () => rolls };
}

test("GM coordinated damage commits one roll/cost/reaction and cannot repeat on the same card", async () => {
  const { actor, source, button, ledger, rolls } = coordinatedFixture();
  await onApplyClick(source, button, {});
  assert.equal(actor.system.hp.value, 91); assert.equal(actor.system.resources.discipline.value, 1); assert.equal(actor.flags.n5e.economy.reaction, true);
  await onApplyClick(source, button, {});
  assert.equal(rolls(), 1); assert.equal(actor.system.hp.value, 91); assert.equal(ledger().entries[0].state, "committed");
});

test("authored damage reaction commits through the common DR and receipt pipeline", async () => {
  const { actor, source, button, ledger, rolls } = coordinatedFixture();
  actor.items[0].system.identifier = "custom-defense";
  actor.items[0].flags = { n5e: { reaction: { version: 1, enabled: true, reduction: "1d6", multiplier: 0.5,
    requireSight: false, spendReaction: true, pool: "discipline", cost: 2 } } };
  await onApplyClick(source, button, {});
  assert.equal(actor.system.hp.value, 96);
  assert.equal(actor.system.resources.discipline.value, 0);
  assert.equal(actor.flags.n5e.economy.reaction, true);
  await onApplyClick(source, button, {});
  assert.equal(rolls(), 1); assert.equal(ledger().entries[0].state, "committed");
});

test("coordinated Dodge uses observer visibility, halves after DR, and never spends Discipline", async () => {
  const { actor, source, button, rolls } = coordinatedFixture({ uncanny: true });
  await onApplyClick(source, button, {});
  assert.equal(actor.system.hp.value, 93); assert.equal(actor.flags.n5e.economy.reaction, true);
  assert.equal(actor.system.resources.discipline.value, 2); assert.equal(rolls(), 0);
});

test("unseen sources do not offer Dodge; unresolved sight blocks automatic damage without expenditure", async () => {
  const hidden = coordinatedFixture({ uncanny: true, visible: false });
  await onApplyClick(hidden.source, hidden.button, {});
  assert.equal(hidden.actor.system.hp.value, 85); assert.equal(hidden.actor.flags.n5e?.economy?.reaction, undefined);
  const unknown = coordinatedFixture({ uncanny: true, missingSource: true });
  await onApplyClick(unknown.source, unknown.button, {});
  assert.equal(unknown.actor.system.hp.value, 100); assert.equal(unknown.actor.system.resources.discipline.value, 2);
  assert.equal(unknown.ledger().entries[0].state, "rejected");
});
