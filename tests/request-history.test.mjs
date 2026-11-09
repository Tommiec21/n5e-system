import { test } from "node:test";
import assert from "node:assert/strict";
import { requestHistory, archiveRequestHistory } from "../module/automation/history.mjs";

test("only the active GM can archive; cancellation retains receipts and export precedes epoch rotation", async () => {
  let ledger = { version: 1, epoch: 4, entries: [{ id: "a", state: "uncertain" }] }, confirm = false;
  const events = [];
  globalThis.game = { user: { isGM: false }, users: { activeGM: { isSelf: false } }, settings: {
    get: () => ledger, set: async (scope, key, value) => { events.push("rotate"); ledger = value; }
  } };
  globalThis.foundry = { applications: { api: { DialogV2: { confirm: async () => confirm } } } };
  globalThis.saveDataToFile = () => events.push("export");
  assert.throws(() => requestHistory(), /Only a GM/);
  await assert.rejects(archiveRequestHistory({ reconciled: true }), /active GM/);
  game.user.isGM = true; game.users.activeGM.isSelf = true;
  await assert.rejects(archiveRequestHistory(), /reconcile/);
  assert.equal(await archiveRequestHistory({ reconciled: true }), false); assert.equal(ledger.epoch, 4);
  confirm = true;
  await archiveRequestHistory({ reconciled: true });
  assert.deepEqual(events, ["export", "rotate"]); assert.deepEqual(ledger, { version: 1, epoch: 5, entries: [] });
});

test("failed archive export preserves the authoritative ledger", async () => {
  const ledger = { version: 1, epoch: 1, entries: [] }; let writes = 0;
  globalThis.game = { user: { isGM: true }, users: { activeGM: { isSelf: true } }, settings: { get: () => ledger, set: async () => writes++ } };
  globalThis.foundry = { applications: { api: { DialogV2: { confirm: async () => true } } } };
  globalThis.saveDataToFile = () => { throw new Error("export failed"); };
  await assert.rejects(archiveRequestHistory({ reconciled: true }), /export/); assert.equal(writes, 0);
});
