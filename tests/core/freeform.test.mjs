/** NPC3: Freeform Strike and Freeform Jutsu tables and math (pure; the Bingo Book). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { strikeTable, jutsuDamageTable, freeformDR, freeformCost } from "../../module/config/freeform.mjs";
import { strikeDamage, combineAttacks, riderDC, freeformRanks, freeformCostFor, effectiveLevel, jutsuDamage, splitDamage,
  defensiveValue, supportValue, stepValue, averageOf } from "../../module/rules/freeform.mjs";

test("Freeform Strike table rows match the book (1, 6, 11, 30)", () => {
  assert.deepEqual(strikeTable.low[0], ["1d4", 1]);
  assert.deepEqual(strikeTable.medium[5], ["1d6+2", 2]);
  assert.deepEqual(strikeTable.high[5], ["1d8+5", 3]);
  assert.deepEqual(strikeTable.low[10], ["2d6+6", 1]);
  assert.deepEqual(strikeTable.high[10], ["2d6+2", 4]);
  assert.deepEqual(strikeTable.low[29], ["2d12+5", 1]);
  assert.deepEqual(strikeTable.medium[29], ["1d12+11", 3]);
  assert.deepEqual(strikeTable.high[29], ["3d12+5", 4]);
  assert.equal(strikeTable.high[0], null, "High starts at level 3");
});

test("Freeform Jutsu tables match the book (rows 1, 13, 30)", () => {
  assert.equal(jutsuDamageTable.standard.D[0], "1d4+2");
  assert.equal(jutsuDamageTable.standard.S[29], "12d12+24");
  assert.equal(jutsuDamageTable.elite.D[12], "8d4+10");
  assert.equal(jutsuDamageTable.elite.S[12], "12d10+24");
  assert.equal(jutsuDamageTable.elite.D[29], "14d6+15");
  assert.equal(jutsuDamageTable.elite.S[29], "20d12+62");
  assert.equal(freeformDR.solo.S, "2d6+6");
});

test("strike damage: class column, rider penalties, the first printed row", () => {
  assert.deepEqual(strikeDamage(6, "elite"), { formula: "1d8+5", attacks: 3, level: 6, column: "high" });
  assert.equal(strikeDamage(8, "elite", 1).level, 6, "Tier 1 rider: 2 levels lower");
  assert.equal(strikeDamage(9, "elite", 2).level, 6, "Tier 2 rider: 3 levels lower");
  assert.equal(strikeDamage(1, "solo").level, 3, "High has no rows below 3");
  assert.equal(strikeDamage(1, "minion", 2).level, 1, "clamped at 1");
  assert.equal(strikeDamage(6, "standard").column, "medium");
  assert.equal(combineAttacks("1d8+5", 3), "3d8+15");
  assert.equal(combineAttacks("1d4", 1), "1d4");
});

test("rider DC by class: Minion lowest, Standard middle, Elite and Solo highest", () => {
  const dcs = [13, 15, 12];
  assert.equal(riderDC("minion", dcs), 12);
  assert.equal(riderDC("standard", dcs), 13);
  assert.equal(riderDC("elite", dcs), 15);
  assert.equal(riderDC("solo", dcs), 15);
  assert.equal(riderDC("elite", []), 10);
});

test("Freeform ranks open at the book's levels", () => {
  assert.deepEqual(freeformRanks("standard", 1), ["D"]);
  assert.deepEqual(freeformRanks("standard", 5), ["D", "C"]);
  assert.deepEqual(freeformRanks("standard", 17), ["D", "C", "B", "A", "S"]);
  assert.deepEqual(freeformRanks("minion", 20), ["D", "C", "B"]);
  assert.deepEqual(freeformRanks("elite", 3), ["D", "C"]);
  assert.deepEqual(freeformRanks("solo", 15), ["D", "C", "B", "A", "S"]);
});

test("effective level: every penalty, and the clamp", () => {
  assert.equal(effectiveLevel(10, { area: true }).level, 8);
  assert.equal(effectiveLevel(10, { effects: [1, 2] }).level, 7);
  assert.equal(effectiveLevel(10, { noDamageOnSave: true }).level, 11);
  assert.equal(effectiveLevel(10, { lowestAttack: true }).level, 11);
  assert.equal(effectiveLevel(10, { preestablished: 1 }).level, 11);
  assert.equal(effectiveLevel(10, { preestablished: 2 }).level, 12);
  assert.equal(effectiveLevel(1, { area: true, effects: [2] }).level, 1);
  assert.equal(effectiveLevel(30, { preestablished: 2 }).level, 30);
  assert.equal(effectiveLevel(10, { area: true, effects: [1] }).parts.length, 2);
});

test("jutsu damage from the class's table, split across attacks", () => {
  assert.equal(jutsuDamage(13, "elite", "D").formula, "8d4+10");
  assert.equal(jutsuDamage(15, "elite", "D", { area: true }).formula, "8d4+10");
  assert.equal(jutsuDamage(1, "minion", "D").formula, "1d4+2");
  assert.equal(splitDamage("8d6+12", 2), "4d6+6");
  assert.equal(jutsuDamage(13, "elite", "D", {}, 2).perAttack, "4d4+5");
});

test("defensive and support values; C and A use the rank below (Q-N40)", () => {
  assert.equal(stepValue({ D: 3, B: 4, S: 5 }, "C"), 3);
  assert.equal(stepValue({ D: 3, B: 4, S: 5 }, "A"), 4);
  assert.equal(defensiveValue("ac", { rank: "S" }).value, 5);
  assert.equal(defensiveValue("dr", { rank: "B", klass: "elite" }).value, "1d8+4");
  assert.equal(defensiveValue("tempHp", { klass: "standard" }).value, null);
  assert.equal(defensiveValue("immunity", { rank: "B" }).value, null);
  assert.equal(supportValue("attack", { rank: "A" }).value, 2);
  assert.equal(supportValue("damage", { rank: "D" }).value, null);
  assert.equal(supportValue("speed", { rank: "C" }).value, 20);
  assert.equal(averageOf("1d8+4"), 8);
  assert.equal(averageOf("2"), 2);
});

test("chakra cost by rank (Q-N33); Minions pay nothing", () => {
  assert.deepEqual(freeformCost, { D: 5, C: 9, B: 14, A: 20, S: 30 });
  assert.equal(freeformCostFor("B", "elite"), 14);
  assert.equal(freeformCostFor("B", "minion"), 0);
});

test("a Striker reads the Freeform tables 1 level higher", async () => {
  const { buildStrike, buildJutsu } = await import("../../module/rules/freeform.mjs");
  const plain = buildStrike({ name: "Claw", range: "melee", countsAs: "freeform", damageType: "slashing" }, { level: 5, klass: "elite", dcs: [] });
  const striker = buildStrike({ name: "Claw", range: "melee", countsAs: "freeform", damageType: "slashing" }, { level: 5, klass: "elite", damageLevel: 1, dcs: [] });
  assert.equal(plain.system.activities[0].damage.parts[0].formula, "1d12+4");
  assert.equal(striker.system.activities[0].damage.parts[0].formula, "1d8+5");
  const j = buildJutsu({ name: "Fireball", rank: "D", effects: [] }, { level: 12, klass: "elite", damageLevel: 1 });
  assert.equal(j.system.activities[0].damage.parts[0].formula, "8d4+10");
});
