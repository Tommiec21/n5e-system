/** PRESTD1 Part D: wands, flanking and crafting (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { wandAction, overchargeHolds, segmentHitsRect, flanks, flankingEffect, craftNumbers, craftOutcome } from "../../module/rules/pf2e-emulation.mjs";
import { rules } from "../../module/config/rules.mjs";

test("wand: cast, overcharge, destroy, broken", () => {
  assert.equal(wandAction({}), "cast");
  assert.equal(wandAction({ used: true }), "overcharge");
  assert.equal(wandAction({ used: true, overcharged: true }), "destroy");
  assert.equal(wandAction({ broken: true }), "destroy");
  assert.equal(overchargeHolds(10), true);
  assert.equal(overchargeHolds(9), false);
});

test("flanking: opposite sides flank, same side does not", () => {
  const target = { x: 100, y: 100, w: 100, h: 100 };
  const west = { centre: { x: 50, y: 150 }, inReach: true };
  const east = { centre: { x: 250, y: 150 }, inReach: true };
  const north = { centre: { x: 150, y: 50 }, inReach: true };
  const nw = { centre: { x: 50, y: 50 }, inReach: true };
  const se = { centre: { x: 250, y: 250 }, inReach: true };
  assert.equal(flanks(west, east, target), true);
  assert.equal(flanks(nw, se, target), true);
  assert.equal(flanks(west, north, target), false);
  assert.equal(flanks(west, { ...east, inReach: false }, target), false);
  assert.equal(segmentHitsRect({ x: 0, y: 0 }, { x: 50, y: 0 }, target), false);
});

test("flanking effect follows the setting", () => {
  assert.equal(flankingEffect("off"), null);
  assert.deepEqual(flankingEffect("ac"), { bonus: 2, label: "Flanking (target −2 AC)" });
  assert.deepEqual(flankingEffect("advantage"), { advantage: "Flanking" });
});

test("crafting numbers and outcomes", () => {
  const s = { dcD: 12, daysD: 1, dcB: 18, daysB: 4, materials: 0.5 };
  assert.deepEqual(craftNumbers("B", s), { dc: 18, days: 4, materials: 0.5 });
  assert.deepEqual(craftNumbers("E", s), { dc: 12, days: 1, materials: 0.5 });
  assert.deepEqual(craftOutcome(28, 18, { price: 100, materials: 0.5, days: 4 }), { degree: "critical", cost: 50, days: 2, made: true });
  assert.deepEqual(craftOutcome(18, 18, { price: 100, materials: 0.5, days: 4 }), { degree: "success", cost: 50, days: 4, made: true });
  assert.deepEqual(craftOutcome(17, 18, { price: 100 }), { degree: "failure", cost: 0, days: 0, made: false });
  assert.deepEqual(craftOutcome(8, 18, { price: 100, materials: 0.5 }), { degree: "criticalFailure", cost: 25, days: 0, made: false });
});

test("crafting and flanking settings exist with the defaults", () => {
  const byKey = rules;
  assert.equal(byKey.flanking?.default, "off");
  assert.equal(byKey.craftDCB?.default, 18);
  assert.equal(byKey.craftMaterials?.default, 0.5);
});
