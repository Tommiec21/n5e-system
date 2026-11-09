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

test("GM coordinated damage commits one roll/cost/reaction and cannot repeat on the same card", async () => {
  const actor = { ...target(), documentName: "Actor", uuid: "Actor.target", id: "target", name: "Defender", isOwner: true, flags: {}, statuses: new Set(), _stats: { modifiedTime: 1 } };
  actor.system.resources = { discipline: { value: 2 } };
  actor.items = [{ id: "d", name: "Discipline", actor, system: { identifier: "discipline" } }, { type: "class", system: { identifier: "weapon-specialist", levels: 11 } }];
  actor.items.get = id => actor.items.find(i => i.id === id);
  actor.testUserPermission = () => true;
  actor.update = async update => { for ( const [key, value] of Object.entries(update) ) { const keys = key.split("."); let object = actor; for ( const k of keys.slice(0, -1) ) object = object[k] ??= {}; object[keys.at(-1)] = value; } actor._stats.modifiedTime++; };
  const gm = { id: "gm", active: true, isGM: true }, users = [gm]; users.activeGM = { isSelf: true };
  let ledger = { version: 1, epoch: 1, entries: [] }, rolls = 0;
  const messages = new Map();
  globalThis.game = { user: gm, users, messages, combat: { id: "c", started: true, round: 1, turn: 0 },
    settings: { get: (scope, key) => key === "requestReceipts" ? ledger : ["coordinatedDamage", "reactionWindows"].includes(key) ? true : key === "reactionTimeoutSeconds" ? 0 : false,
      set: async (scope, key, value) => { ledger = value; } } };
  globalThis.canvas = { tokens: { controlled: [{ actor }] } };
  globalThis.fromUuid = async () => actor;
  globalThis.ui = { notifications: { info() {}, warn() {} } };
  globalThis.Hooks = { callAll() {} };
  globalThis.Roll = class { async evaluate() { rolls++; this.total = 6; return this; } async toMessage() {} };
  globalThis.CONFIG = { ChatMessage: { documentClass: { getSpeaker: () => ({}), create: async data => {
    const message = { ...data, id: String(messages.size), author: gm, getFlag: (scope, key) => message.flags?.n5e?.[key] };
    if ( data.flags?.n5e?.reactionWindow ) data.flags.n5e.reactionWindow.state = "accepted"; // Simulates an already reviewed GM decision.
    messages.set(message.id, message); return message;
  } } } };
  const data = { instances: [{ amount: 20, type: "fire" }], total: 20 };
  const source = { uuid: "ChatMessage.source", getFlag: () => data }, button = { dataset: { n5eApply: "full" } };
  await onApplyClick(source, button, {});
  assert.equal(actor.system.hp.value, 91); assert.equal(actor.system.resources.discipline.value, 1); assert.equal(actor.flags.n5e.economy.reaction, true);
  await onApplyClick(source, button, {});
  assert.equal(rolls, 1); assert.equal(actor.system.hp.value, 91); assert.equal(ledger.entries[0].state, "committed");
});
