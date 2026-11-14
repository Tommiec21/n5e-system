/** CLASH1: Jutsu Clash rules (Jiraiya's Jutsu Compendium; King 2026-11-14). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { clashSkill, rankMastery, releaseOf, elementalAdvantage, contestCount, clashResult } from "../../module/rules/clash.mjs";
import { skills } from "../../module/config/core.mjs";

test("the triggering jutsu's discipline sets the skill for both sides", () => {
  assert.equal(clashSkill("nin", skills), "nin");
  assert.equal(clashSkill("tai", skills), "mar");
  assert.equal(clashSkill("buki", skills), "mar");
  assert.equal(clashSkill("gen", skills), "ill");
});

test("rank bonus: +1 Mastery rank per rank higher, capped at rank 3", () => {
  assert.deepEqual(rankMastery("C", "C"), { ranks: 0, bonus: 0 });
  assert.deepEqual(rankMastery("C", "A"), { ranks: 0, bonus: 0 }, "lower rank gains nothing");
  assert.deepEqual(rankMastery("B", "C"), { ranks: 1, bonus: 2 });
  assert.deepEqual(rankMastery("S", "D", 2), { ranks: 1, bonus: 2 }, "capped at rank 3");
  assert.deepEqual(rankMastery("S", "D", 3), { ranks: 0, bonus: 0 });
});

test("elements: the superior Release rolls at advantage", () => {
  assert.equal(releaseOf(["fireRelease", "clash"]), "fire");
  assert.equal(releaseOf(["clash"]), null);
  assert.equal(elementalAdvantage("water", "fire"), "mine");
  assert.equal(elementalAdvantage("fire", "water"), "theirs");
  assert.equal(elementalAdvantage("fire", "earth"), null);
  assert.equal(elementalAdvantage("fire", null), null);
});

test("contests and results: single, best of 3, Draw on ties and double auto-win", () => {
  assert.equal(contestCount("B", "A"), 3);
  assert.equal(contestCount("B", "C"), 1);
  assert.equal(clashResult([15], [12], 1).winner, "a");
  assert.equal(clashResult([12], [12], 1).winner, "draw", "a tied Clash is a Draw");
  assert.equal(clashResult([15], [], 1).winner, null, "waiting for the other side");
  assert.equal(clashResult([10, 20, 9], [12, 14, 18], 3).winner, "b");
  assert.equal(clashResult([10, 10, 15], [10, 10, 12], 3).winner, "draw", "one win of three isn't enough");
  assert.equal(clashResult([], [], 3, { autoA: true, autoB: true }).winner, "draw");
  assert.equal(clashResult([], [], 1, { autoB: true }).winner, "b");
});
