/** CARD2: combat cards laid out like the SW5e card (docs/CARD2_SPEC.md). */
import "./helpers/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { MULTIPLIERS, defaultMultiplier, multiplied, diceSummary, saveTile } from "../module/rules/card-layout.mjs";

test("King Q-C2: the Apply multipliers are −1, 0, ¼, ½, 1, 2", () => {
  assert.deepEqual(MULTIPLIERS.map(m => m.label), ["−1", "0", "¼", "½", "1", "2"]);
  assert.deepEqual(MULTIPLIERS.map(m => m.mode), ["heal", "none", "quarter", "half", "full", "double"]);
});

test("each creature starts on its damage share: half on a successful save, none when immune", () => {
  assert.equal(defaultMultiplier("half"), "half");
  assert.equal(defaultMultiplier("none"), "none");
  assert.equal(defaultMultiplier("full"), "full");
  assert.equal(defaultMultiplier(null), "full");
  assert.deepEqual(["heal", "none", "quarter", "half", "full", "double"].map(m => multiplied(23, m)), [-23, 0, 5, 11, 23, 46]);
});

test("a tile's arrow lists the dice; a save tile shows saved or failed (King Q-C4)", () => {
  const roll = { dice: [{ number: 4, faces: 6, results: [{ result: 3 }, { result: 5 }, { result: 1, active: false }, { result: 6 }] }, { number: 1, faces: 10, results: [{ result: 8 }] }] };
  assert.deepEqual(diceSummary(roll), [{ formula: "4d6", results: [3, 5, 6] }, { formula: "1d10", results: [8] }]);
  assert.deepEqual(saveTile({ name: "Ozari", label: "Dex", total: 14, degree: 2, visible: true }), { name: "Ozari", label: "Dex", total: 14, mark: "✓", outcome: "saved" });
  assert.equal(saveTile({ name: "Ozari", degree: 0, visible: true }).outcome, "failed");
  assert.equal(saveTile({ name: "Ozari", degree: 2, visible: false }).total, "?", "hidden saves stay hidden");
});

test("quarter and none are apply modes everywhere damage is applied", async () => {
  const fs = await import("node:fs");
  for ( const f of ["module/workflow/apply-damage.mjs", "module/workflow/coordinated-damage.mjs", "module/automation/receipts.mjs"] ) {
    const s = fs.readFileSync(f, "utf8");
    assert.ok(s.includes("quarter") && s.includes("none"), f);
  }
});
