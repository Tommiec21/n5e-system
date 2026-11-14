/** CARD1d: the rider tables (content/riders) are valid, applied, and merge without losing other cast options. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyRiders, mergedFlags, riderTables } from "../tools/content/apply-riders.mjs";

test("every rider table is valid and applied to its feature", () => {
  const { changed, problems } = applyRiders({ check: true });
  assert.deepEqual(problems, []);
  assert.deepEqual(changed, []);
  assert.ok(riderTables().length >= 7);
});

test("merging keeps a feature's other cast options and replaces only riders", () => {
  const n5e = { generated: true, castOptions: [{ label: "Hellrend" }, { label: "Old rider", rider: {} }] };
  const out = mergedFlags(n5e, { castRiders: [{ label: "New rider", rider: { label: "N" } }], riders: [{ label: "T" }] });
  assert.deepEqual(out.castOptions.map(o => o.label), ["Hellrend", "New rider"]);
  assert.deepEqual(out.riders.map(r => r.label), ["T"]);
  assert.equal(out.generated, true);
  assert.deepEqual(mergedFlags({ castOption: { label: "Only" } }, { castRiders: [], riders: [] }), { castOption: { label: "Only" } });
});
