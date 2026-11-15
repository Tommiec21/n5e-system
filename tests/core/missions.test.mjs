/** PRESTD1 Part E: mission numbers (pure; the Bingo Book's tables). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { missionNumbers, encounterCost, spentOf, missionPayout } from "../../module/rules/missions.mjs";

test("rank and tier give the budget, ryo range and failure payout", () => {
  const c = missionNumbers("C", "extreme", 4);
  assert.equal(c.xpPerPlayer, 312);   // 250 × 1.25 = 312.5, rounded down
  assert.equal(c.budget, 1248);
  assert.deepEqual(c.ryo, [625, 937]);
  assert.equal(c.failure, 25);
  assert.equal(c.adversaryLevel, 2);
  const d = missionNumbers("D", "trivial", 3);
  assert.equal(d.xpPerPlayer, 75);
  assert.deepEqual(d.ryo, [187, 375]);
  assert.equal(missionNumbers("S", "moderate", 5).budget, 6250);
});

test("encounter costs scale by rank (minions don't, per the text)", () => {
  assert.equal(encounterCost("intrigue", "C"), 20);
  assert.equal(encounterCost("solo", "C"), 100);
  assert.equal(encounterCost("minions", "C"), 5);
  assert.equal(encounterCost("escort", "S"), 100);
  // The book's example at C-Rank: 2 Intrigue 40, 2 Hostile 60, 15 Standard 300, 5 Elites 250, 1 Solo 100.
  assert.equal(spentOf([{ key: "intrigue", count: 2 }, { key: "hostile", count: 2 }, { key: "standard", count: 15 }, { key: "elite", count: 5 }, { key: "solo", count: 1 }], "C"), 750);
  assert.equal(spentOf([{ key: "minions", count: 4, cost: 10 }], "C"), 40);
});

test("payout: split evenly; failure takes the tier's share", () => {
  assert.deepEqual(missionPayout({ spent: 990, players: 4, ryo: 500, downtime: 6, success: true, tier: "extreme" }), { xp: 247, ryo: 500, downtime: 6, percent: 100 });
  assert.deepEqual(missionPayout({ spent: 1000, players: 4, ryo: 400, downtime: 6, success: false, tier: "moderate" }), { xp: 125, ryo: 200, downtime: 3, percent: 50 });
  assert.deepEqual(missionPayout({ spent: 1000, players: 4, ryo: 400, downtime: 6, success: false, tier: "trivial" }), { xp: 187, ryo: 300, downtime: 4, percent: 75 });
});
