import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldCoordinate, submitWorkflow, prepareWorkflow, sourceStamp } from "../module/automation/multiplayer.mjs";
import { asGM } from "../module/socket.mjs";

function fixture() {
  let ledger = { version: 1, epoch: 1, entries: [] }, updates = 0;
  const actor = { uuid: "Actor.mp", documentName: "Actor", name: "Ninja", isOwner: true,
    system: { resources: { focus: { value: 5, maxValue: 5 } } }, items: { get: () => null }, flags: {} };
  actor.update = async changes => {
    updates++;
    for ( const [path, value] of Object.entries(changes) ) {
      const parts = path.split("."); let object = actor;
      for ( const part of parts.slice(0, -1) ) object = object[part] ??= {};
      object[parts.at(-1)] = value;
    }
  };
  const warnings = [], messages = new Map();
  globalThis.game = { ready: true, user: { isGM: true, targets: new Set() }, users: { activeGM: { isSelf: true } },
    settings: { get: (scope, key) => key === "requestReceipts" ? ledger : key === "multiplayerCoordination",
      set: async (scope, key, value) => { ledger = value; } } };
  globalThis.ui = { notifications: { warn: message => warnings.push(message), info() {} } };
  globalThis.fromUuid = async uuid => uuid === actor.uuid ? actor : messages.get(uuid);
  globalThis.Hooks = { call: () => true, callAll() {} };
  globalThis.CONFIG = { ChatMessage: { documentClass: { getSpeaker: () => ({}) } } };
  return { actor, warnings, messages, ledger: () => ledger, updates: () => updates };
}

test("coordinated resources execute on GM, return durable results and coalesce simultaneous clicks", async () => {
  const f = fixture();
  assert.equal(shouldCoordinate(false), true); assert.equal(shouldCoordinate(true), false);
  const request = { actorUuid: f.actor.uuid, cost: { pool: "focus", amount: 1 } };
  const results = await Promise.all([submitWorkflow("resource", request), submitWorkflow("resource", request)]);
  assert.equal(f.actor.system.resources.focus.value, 4); assert.equal(f.updates(), 1);
  assert.equal(results[0].amount, 1); assert.equal(results[1].amount, 1);
  assert.equal(f.ledger().entries[0].state, "committed");
});

test("duplicate transport delivery replays the same resource result without a second spend", async () => {
  const f = fixture(), payload = { operation: "resource", actorUuid: f.actor.uuid, cost: { pool: "focus", amount: 2 } };
  const first = await asGM("workflow", payload, { requestId: "mp-replay" });
  const second = await asGM("workflow", payload, { requestId: "mp-replay" });
  assert.deepEqual(second, first); assert.equal(f.updates(), 1); assert.equal(f.actor.system.resources.focus.value, 3);
});

test("failed actions are isolated; a later independent action still executes", async () => {
  const f = fixture(), update = f.actor.update;
  f.actor.update = async () => { throw new Error("Document unavailable"); };
  assert.equal(await submitWorkflow("resource", { actorUuid: f.actor.uuid, cost: { pool: "focus", amount: 1 } }), null);
  assert.equal(f.ledger().entries[0].state, "uncertain"); assert.match(f.warnings[0], /before retrying/);
  f.actor.update = update;
  assert.equal((await submitWorkflow("resource", { actorUuid: f.actor.uuid, cost: { pool: "focus", amount: 2 } })).amount, 2);
  assert.equal(f.actor.system.resources.focus.value, 3);
});

test("no connected GM means no player-side mutation or fallback", async () => {
  const f = fixture(); game.user.isGM = false; game.users.activeGM = null;
  assert.equal(await submitWorkflow("resource", { actorUuid: f.actor.uuid, cost: { pool: "focus", amount: 1 } }), null);
  assert.equal(f.updates(), 0); assert.match(f.warnings[0], /GM needs to be connected/);
});

test("typed workflow boundary rejects unknown operations, property paths and invalid quantities", async () => {
  const f = fixture();
  for ( const patch of [{ operation: "eval", script: "alert(1)" }, { cost: { pool: "constructor", amount: 1 } },
    { cost: { pool: "focus.value", amount: 1 } }, { cost: { pool: "focus", amount: -1 } }] ) {
    await assert.rejects(prepareWorkflow({ operation: "resource", actorUuid: f.actor.uuid, cost: { pool: "focus", amount: 1 }, ...patch }));
  }
  assert.equal(f.updates(), 0);
});

test("source fingerprints refuse changed cards and missing selected actors before execution", async () => {
  const f = fixture();
  const message = { uuid: "ChatMessage.mp", documentName: "ChatMessage", content: "Original", getFlag: () => undefined };
  f.messages.set(message.uuid, message);
  const fingerprint = await sourceStamp(message); message.content = "Changed";
  await assert.rejects(prepareWorkflow({ operation: "damage", actorUuid: f.actor.uuid, messageUuid: message.uuid, sourceFingerprint: fingerprint, mode: "full" }), /source card changed/);
  await assert.rejects(prepareWorkflow({ operation: "resource", actorUuid: f.actor.uuid, cost: { pool: "focus", amount: 1 }, selectedActorUuids: ["Actor.missing"] }), /target no longer exists/);
  assert.equal(f.updates(), 0);
});

test("card actions execute stored button data, not client-supplied costs or GM selections", async () => {
  const f = fixture();
  const dataset = { n5eAct: "roll", cost: JSON.stringify({ pool: "focus", amount: 1 }) };
  globalThis.DOMParser = class { parseFromString() { return { querySelectorAll: () => [{ dataset: { ...dataset } }] }; } };
  const message = { uuid: "ChatMessage.activity", documentName: "ChatMessage", content: "Original activity", getFlag: (scope, key) => key === "actorUuid" ? f.actor.uuid : undefined };
  f.messages.set(message.uuid, message);
  const prepared = await prepareWorkflow({ operation: "activity", messageUuid: message.uuid, sourceFingerprint: await sourceStamp(message), buttonIndex: 0,
    selectedActorUuids: [], targetActorUuids: [], cost: { pool: "focus", amount: 99 } });
  assert.equal(JSON.parse(prepared.details.originalAction.cost).amount, 1);
  const result = await prepared.run();
  assert.equal(result.value.amount, 1); assert.equal(f.actor.system.resources.focus.value, 4);
});
