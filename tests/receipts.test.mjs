import { test } from "node:test";
import assert from "node:assert/strict";
import { createReceiptCoordinator } from "../module/automation/receipts.mjs";

function fixture() {
  let ledger = { version: 1, entries: [] }, active = true, failWrite = false;
  const options = { read: async () => ledger, write: async value => { if ( failWrite ) throw new Error("storage failed"); ledger = value; }, authority: () => active };
  return { service: () => createReceiptCoordinator(options), ledger: () => ledger, active: value => { active = value; }, fail: () => { failWrite = true; } };
}
const request = { id: "receipt-1", type: "spendRations", payload: { amount: 1 } };

test("concurrent duplicate requests and a new coordinator share one durable result", async () => {
  const f = fixture(); let calls = 0, approvals = 0;
  const approve = async () => { approvals++; return true; }, apply = async () => { calls++; };
  const results = await Promise.all([f.service().execute(request, approve, apply), f.service().execute(request, approve, apply)]);
  assert.equal(calls, 1); assert.equal(approvals, 1); assert.ok(results.some(r => r.replay));
  assert.equal((await f.service().execute(request, approve, apply)).ok, true); assert.equal(calls, 1);
  await assert.rejects(f.service().execute({ ...request, payload: { amount: 2 } }, approve, apply), /different content/);
});
test("declined requests never mutate and cannot be replayed as accepted", async () => {
  const f = fixture(); let calls = 0;
  await f.service().execute(request, async () => false, async () => calls++);
  const result = await f.service().execute(request, async () => true, async () => calls++);
  assert.equal(result.ok, false); assert.equal(calls, 0);
});
test("lost authority during the review stops mutation", async () => {
  const f = fixture(); let calls = 0;
  await assert.rejects(f.service().execute(request, async () => { f.active(false); return true; }, async () => calls++), /active GM/);
  assert.equal(calls, 0); f.active(true);
  await assert.rejects(f.service().execute(request, async () => true, async () => calls++), /uncertain/);
});
test("partial apply or failed receipt persistence is uncertain and never retried", async () => {
  for ( const failAfterApply of [false, true] ) {
    const f = fixture(); let calls = 0;
    await assert.rejects(f.service().execute(request, async () => true, async () => { calls++; if ( failAfterApply ) f.fail(); else throw new Error("partial application"); }));
    await assert.rejects(f.service().execute(request, async () => true, async () => calls++), /uncertain/);
    assert.equal(calls, 1);
  }
});
test("unavailable storage and invalid payloads never execute", async () => {
  const f = fixture(); f.fail(); let calls = 0;
  await assert.rejects(f.service().execute(request, async () => true, async () => calls++), /storage/);
  await assert.rejects(f.service().execute({ ...request, id: "__proto__.bad" }, async () => true, async () => calls++), /Invalid/);
  await assert.rejects(f.service().execute({ ...request, payload: { amount: Infinity } }, async () => true, async () => calls++), /JSON/);
  assert.equal(calls, 0);
});

test("an archived epoch rejects old packets and full history never evicts replay protection", async () => {
  let ledger = { version: 1, epoch: 2, entries: [] }, calls = 0;
  const service = createReceiptCoordinator({ read: async () => ledger, write: async v => { ledger = v; }, authority: () => true, limit: 1 });
  await assert.rejects(service.execute(request, async () => true, async () => calls++), /archived/);
  await service.execute({ ...request, epoch: 2 }, async () => true, async () => calls++);
  await assert.rejects(service.execute({ ...request, id: "new", epoch: 2 }, async () => true, async () => calls++), /history is full/);
  assert.equal(calls, 1);
});
