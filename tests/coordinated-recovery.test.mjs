import { test } from "node:test";
import assert from "node:assert/strict";
import { coordinateCommand } from "../module/automation/commands.mjs";
import { createReactionDispatcher } from "../module/workflow/reaction-dispatch.mjs";

function setup() {
  let ledger = { version: 1, epoch: 1, entries: [] };
  globalThis.game = { users: { activeGM: { isSelf: true } }, settings: {
    get: () => ledger, set: async (scope, key, value) => { ledger = value; }
  } };
  return { command: { id: "resume-example", type: "damage", payload: { message: "ChatMessage.a", target: "Actor.a", mode: "half" } }, ledger: () => ledger };
}

test("resume review reuses the original receipt only before application and asks afresh", async () => {
  const f = setup(); let applications = 0, approvals = 0;
  await assert.rejects(coordinateCommand(f.command, { approve: async () => {
    game.users.activeGM.isSelf = false; throw new Error("Handover");
  }, apply: async () => { applications++; } }), /Handover/);
  assert.equal(f.ledger().entries[0].state, "reviewing"); assert.equal(f.ledger().entries[0].mode, "half");
  game.users.activeGM.isSelf = true;
  const result = await coordinateCommand({ ...f.command, resumeReview: true }, {
    approve: async () => { approvals++; return true; }, apply: async () => { applications++; }
  });
  assert.equal(result.state, "committed"); assert.equal(approvals, 1); assert.equal(applications, 1);
  assert.equal(f.ledger().entries.length, 1);
});

test("resume cannot replay uncertain mutations or alter original request content", async () => {
  const f = setup(); let applications = 0;
  const handlers = { approve: async () => true, apply: async () => { applications++; throw new Error("Partial write"); } };
  await assert.rejects(coordinateCommand(f.command, handlers), /Partial write/);
  await assert.rejects(coordinateCommand({ ...f.command, resumeReview: true }, handlers), /uncertain/);
  await assert.rejects(coordinateCommand({ ...f.command, resumeReview: true, payload: { ...f.command.payload, mode: "double" } }, handlers), /different content/);
  assert.equal(applications, 1);
});

test("resume refuses a currently running local command instead of waiting behind its own prompt", async () => {
  const f = setup(); let release, entered;
  const ready = new Promise(resolve => { entered = resolve; });
  const pending = coordinateCommand(f.command, { approve: () => { entered(); return new Promise(resolve => { release = resolve; }); }, apply: async () => {} });
  await ready;
  await assert.rejects(coordinateCommand({ ...f.command, resumeReview: true }, { approve: async () => true, apply: async () => {} }), /still running/);
  release(false); assert.equal((await pending).state, "declined");
});

test("commit validation rechecks eligibility after an allocation dialog without rerolling", async () => {
  let turn = 1, canReact = true, rolls = 0;
  const item = { id: "a" }, actor = { uuid: "Actor.a", items: [item], _stats: { modifiedTime: 1 } };
  const dispatcher = createReactionDispatcher({ authority: () => true, stamp: () => turn, open: async () => ({}), wait: async () => "accepted" });
  dispatcher.register("custom", { events: ["beforeDamage"], offer: () => canReact ? { item } : null,
    prepare: async () => { rolls++; return { flatReduction: 3 }; } });
  const selected = await dispatcher.choose(actor, "beforeDamage");
  const prepared = await selected.prepare(); await prepared.validate();
  canReact = false; await assert.rejects(prepared.validate(), /eligibility changed/);
  canReact = true; turn++; await assert.rejects(prepared.validate(), /changed before commit/);
  assert.equal(rolls, 1);
});
