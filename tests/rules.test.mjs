/**
 * Pure rules functions (module/rules/): progression, cost, conditions, degree of success, Chain, AC,
 * formulas, change keys.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  proficiencyForLevel, masteryCap, masteryRank, masteryBonus, poolMax, inventorySlots, maxRankForLevel,
  upcastRanks, rankForLevel, asiCount, abilityMod, stepRank
} from "../module/rules/progression.mjs";
import { computeJutsuCost, upkeepCost, concentrationDC } from "../module/rules/cost.mjs";
import { aggregatePenalties } from "../module/rules/conditions.mjs";
import { degreeOfSuccess } from "../module/rules/degree.mjs";
import { resolveChainCast, chainTurnStart, newChainState } from "../module/rules/chain.mjs";
import { computeAC } from "../module/rules/ac.mjs";
import { evaluateFormula, dieFaces, stepDie } from "../module/rules/formula.mjs";

test("proficiency by level (KB 01)", () => {
  const expected = { 1: 3, 3: 3, 4: 4, 6: 4, 7: 5, 9: 5, 10: 6, 12: 6, 13: 7, 15: 7, 16: 8, 18: 8, 19: 9, 20: 9 };
  for ( const [lvl, p] of Object.entries(expected) ) assert.equal(proficiencyForLevel(Number(lvl)), p, `level ${lvl}`);
});

test("mastery caps and bonuses (KB 01)", () => {
  assert.equal(masteryCap(1), 1);
  assert.equal(masteryCap(6), 1);
  assert.equal(masteryCap(7), 2);
  assert.equal(masteryCap(11), 2);
  assert.equal(masteryCap(12), 3);
  assert.equal(masteryRank(3, 5), 1, "three sources at level 5 cap at rank 1");
  assert.equal(masteryRank(5, 20), 3, "never above rank 3");
  assert.equal(masteryRank(0, 20), 0);
  assert.deepEqual([0, 1, 2, 3].map(masteryBonus), [0, 2, 4, 6]);
});

test("ASI levels grant a Mastery rank each (universal rule)", () => {
  assert.equal(asiCount(3), 0);
  assert.equal(asiCount(4), 1);
  assert.equal(asiCount(7), 1);
  assert.equal(asiCount(19), 5);
});

test("alpha.1 checklist: Taijutsu Specialist, +2 Con", () => {
  // d12 HD / d6 CD. Level 1: HP 10 + 12 + 2 = 24, CP 10 + 6 + 2 = 18.
  assert.equal(poolMax({ level: 1, dieMax: 12, conMod: 2 }), 24);
  assert.equal(poolMax({ level: 1, dieMax: 6, conMod: 2 }), 18);
  // Each later level +14 HP, +8 CP. Level 7: 24 + 6 x 14 = 108 HP; 18 + 6 x 8 = 66 CP.
  assert.equal(poolMax({ level: 2, dieMax: 12, conMod: 2 }) - 24, 14);
  assert.equal(poolMax({ level: 7, dieMax: 12, conMod: 2 }), 108);
  assert.equal(poolMax({ level: 7, dieMax: 6, conMod: 2 }), 66);
  assert.equal(proficiencyForLevel(7), 5);
  assert.equal(masteryCap(7), 2);
  // Martial Technique AC unarmored = 10 + prof + Dex. Prof +3, Dex +2 -> 15.
  assert.equal(computeAC({ calc: "martialTechnique", dexMod: 2, prof: 3 }).value, 15);
});

test("HP is retroactive on Con changes", () => {
  const before = poolMax({ level: 5, dieMax: 10, conMod: 1 });
  const after = poolMax({ level: 5, dieMax: 10, conMod: 2 });
  assert.equal(after - before, 5);
});

test("AC formulas (KB 01, 08)", () => {
  // Naruto example: padded cloth +1, Dex +0, prof 3 -> 12.
  assert.equal(computeAC({ dexMod: 0, prof: 3, armor: { bonus: 1, dexCap: 5 } }).value, 12);
  // Medium caps Dex at +3.
  assert.equal(computeAC({ dexMod: 5, prof: 3, armor: { bonus: 4, dexCap: 3 } }).value, 18);
  // Heavy ignores Dex entirely (including negative).
  assert.equal(computeAC({ dexMod: -1, prof: 3, armor: { bonus: 6, dexCap: 0 } }).value, 17);
  // Martial Technique falls back to the armor formula while armored.
  assert.equal(computeAC({ calc: "martialTechnique", dexMod: 2, prof: 3, armor: { bonus: 2, dexCap: 5 } }).calc, "default");
  // Exhaustion 3 -> AC -3.
  assert.equal(computeAC({ dexMod: 2, prof: 3, penalty: -3 }).value, 10);
});

test("inventory slots = 10 + 2 x Str mod", () => {
  assert.equal(inventorySlots(0), 10);
  assert.equal(inventorySlots(3), 16);
  assert.equal(inventorySlots(-1), 8);
  assert.equal(inventorySlots(2, 10), 24, "Shinobi Backpack +10");
});

test("rank helpers (KB 04)", () => {
  assert.equal(maxRankForLevel(1), "D");
  assert.equal(maxRankForLevel(5), "C");
  assert.equal(maxRankForLevel(9), "B");
  assert.equal(maxRankForLevel(13), "A");
  assert.equal(maxRankForLevel(17), "S");
  assert.deepEqual(upcastRanks("D", "B"), ["C", "B"]);
  assert.deepEqual(upcastRanks("C", "C"), []);
  assert.equal(rankForLevel(5), "D");
  assert.equal(rankForLevel(6), "C");
  assert.equal(rankForLevel(18), "S");
  assert.equal(stepRank("S", 1), "S");
  assert.equal(abilityMod(15), 2);
  assert.equal(abilityMod(9), -1);
});

test("chakra cost order and floor (KB 04)", () => {
  // Base -> add -> sub -> mul -> div, never below half base.
  assert.equal(computeJutsuCost({ base: 10, subtractions: [3] }).cost, 7);
  assert.equal(computeJutsuCost({ base: 10, subtractions: [9] }).cost, 5, "floor is half base");
  assert.equal(computeJutsuCost({ base: 9, subtractions: [9] }).cost, 4, "half base rounds down");
  // Upcast changes the base first: D 5 cast at B (2 ranks, +3 each) -> base 11, floor 5.
  const up = computeJutsuCost({ base: 5, upcastRanks: 2, costPerRank: 3, subtractions: [10] });
  assert.equal(up.base, 11);
  assert.equal(up.cost, 5);
  // Multipliers don't stack: one applies.
  assert.equal(computeJutsuCost({ base: 20, multipliers: [0.5, 0.75] }).cost, 10);
  // Special: no reductions, increases allowed.
  assert.equal(computeJutsuCost({ base: 12, mode: "special", subtractions: [5], free: true }).cost, 12);
  assert.equal(computeJutsuCost({ base: 12, mode: "special", additions: [4] }).cost, 16);
  // None costs nothing.
  assert.equal(computeJutsuCost({ base: null, mode: "none" }).cost, 0);
});

test("alpha.1 checklist: Sealed 2 adds +8 to Ninjutsu base cost", () => {
  const pen = aggregatePenalties([{ key: "sealed", ranks: 2 }]);
  assert.equal(pen.baseCost.nin, 8);
  assert.equal(pen.baseCost.gen, 8);
  assert.equal(pen.baseCost.tai, 0);
  const r = computeJutsuCost({ base: 5, baseAdds: [pen.baseCost.nin] });
  assert.equal(r.cost, 13);
});

test("alpha.1 checklist: Exhaustion 3 = AC -3, save DCs -3, all dice -3", () => {
  const pen = aggregatePenalties([{ key: "exhaustion", ranks: 3 }]);
  assert.equal(pen.ac, -3);
  assert.equal(pen.saveDC, -3);
  assert.equal(pen.allDice, -3);
});

test("condition ranks clamp to max; unranked count once; Corroded uses source rank", () => {
  assert.equal(aggregatePenalties([{ key: "shaken", ranks: 9 }]).d20Physical, -5);
  assert.equal(aggregatePenalties([{ key: "bruised", ranks: 4 }]).damageTaken, 4);
  assert.equal(aggregatePenalties([{ key: "corroded", ranks: 1, sourceRank: "B" }]).dr, -6);
  const both = aggregatePenalties([{ key: "exhaustion", ranks: 2 }, { key: "concussed", ranks: 1 }]);
  assert.equal(both.saveDC, -3);
});

test("upkeep and concentration DC (KB 04)", () => {
  assert.equal(upkeepCost(13), 6);
  assert.equal(upkeepCost(13, { efficient: true }), 0);
  assert.equal(concentrationDC({ rankValues: [2, 3], damage: 20 }), 20);
  assert.equal(concentrationDC({ rankValues: [2, 3], damage: 50 }), 25);
});

test("four-tier degree of success (KB 10)", () => {
  assert.equal(degreeOfSuccess(20, 15).key, "critSuccess");
  assert.equal(degreeOfSuccess(15, 15).key, "success", "meet = success (A33 default)");
  assert.equal(degreeOfSuccess(14, 15).key, "failure");
  assert.equal(degreeOfSuccess(10, 15).key, "critFailure");
  assert.equal(degreeOfSuccess(5, 15, { natural: 20 }).key, "success", "nat 20 save always passes");
  assert.equal(degreeOfSuccess(16, 15, { shift: -1 }).key, "failure");
});

test("Chain: Action raises one step per turn, BA maintains, can sit at 3", () => {
  let s = newChainState();
  let r = resolveChainCast(s, { isChain: true, activation: "action", name: "A" });
  assert.equal(r.appliedRank, 1); s = r.state;
  s = chainTurnStart(s);
  r = resolveChainCast(s, { isChain: true, activation: "action", name: "B" });
  assert.equal(r.appliedRank, 2); s = r.state;
  r = resolveChainCast(s, { isChain: true, activation: "bonus", name: "C" });
  assert.equal(r.appliedRank, 2, "bonus action maintains"); s = r.state;
  s = chainTurnStart(s);
  r = resolveChainCast(s, { isChain: true, activation: "action", name: "D" }); s = r.state;
  assert.equal(s.value, 3);
  s = chainTurnStart(s);
  r = resolveChainCast(s, { isChain: true, activation: "action", name: "E" }); s = r.state;
  assert.equal(s.value, 3, "sits at Chain 3");
});

test("Chain: resets on non-Chain jutsu or an idle turn; opt-out doesn't reset; no repeats", () => {
  let s = resolveChainCast(newChainState(), { isChain: true, activation: "action", name: "A" }).state;
  assert.equal(resolveChainCast(s, { isChain: false, activation: "action" }).state.value, 0);
  s = chainTurnStart(s);           // raised last turn -> stays
  assert.equal(s.value, 1);
  s = chainTurnStart(s);           // idle turn -> reset
  assert.equal(s.value, 0);
  s = resolveChainCast(newChainState(), { isChain: true, activation: "action", name: "A" }).state;
  const opt = resolveChainCast(chainTurnStart(s), { isChain: true, activation: "action", choice: "optOut", name: "B" });
  assert.equal(opt.state.value, 1);
  assert.equal(opt.appliedRank, null);
  assert.equal(resolveChainCast(opt.state, { isChain: true, activation: "bonus", name: "A" }).error, "repeat");
});

test("formula evaluator", () => {
  assert.equal(evaluateFormula("1 + @prof", { prof: 4 }), 5);
  assert.equal(evaluateFormula("floor(@level / 2)", { level: 7 }), 3);
  assert.equal(evaluateFormula("@missing + 2", {}), 2);
  assert.equal(evaluateFormula("alert(1)", {}, -1), -1, "rejects code");
  assert.equal(evaluateFormula("", {}, 7), 7);
  assert.equal(dieFaces("d12"), 12);
  assert.equal(dieFaces("1d6"), 6);
  assert.equal(stepDie(6, 1), 8);
  assert.equal(stepDie(12, 1), 12);
});

test("skill action penalties don't stack (Core Ch6 + King 2026-11-07)", async () => {
  const { skillActionPenalty } = await import("../module/rules/skill-actions.mjs");
  assert.equal(skillActionPenalty("np", { proficient: false, masteryRank: 0 }), 0);
  assert.equal(skillActionPenalty("p", { proficient: false, masteryRank: 0 }), -3);
  assert.equal(skillActionPenalty("p", { proficient: true, masteryRank: 0 }), 0);
  assert.equal(skillActionPenalty("m", { proficient: false, masteryRank: 0 }), -5, "not -8");
  assert.equal(skillActionPenalty("m", { proficient: true, masteryRank: 0 }), -5);
  assert.equal(skillActionPenalty("m", { proficient: false, masteryRank: 1 }), -3);
  assert.equal(skillActionPenalty("m", { proficient: true, masteryRank: 1 }), 0);
});

test("caster chooses between cost multipliers", () => {
  const preview = computeJutsuCost({ base: 20, multipliers: [0.5, 0.75] });
  assert.equal(preview.cost, 10, "preview uses the best");
  assert.deepEqual(preview.choices.multipliers, [0.5, 0.75], "dialog is told to ask");
  assert.equal(computeJutsuCost({ base: 20, multipliers: [0.5, 0.75], multiplierChoice: 1 }).cost, 15);
});
