/** PRESTD1 Part A: optional rules (pure parts). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { critFormula } from "../../module/rules/activity-parse.mjs";
import { damagePlan } from "../../module/rules/damage.mjs";
import { readChoice } from "../../module/rules/roll-math.mjs";
import { rules } from "../../module/config/rules.mjs";

test("A1: critical damage modes", () => {
  assert.equal(critFormula("2d6 + 3", 3), "4d6 + 3 + 3", "the book: double dice and the ability modifier");
  assert.equal(critFormula("2d6 + 3", 3, "total"), "2 * (2d6 + 3)");
  assert.equal(critFormula("2d6 + 1d4 + 3", 3, "maximize"), "2d6 + 1d4 + 3 + 16 + 3");
});

test("A2: resistances skipped when the rule is off, and named", () => {
  const target = { system: { hp: { value: 30, max: 30, temp: 0 }, cp: { value: 10, max: 10, temp: 0 }, dr: { value: 0 },
    traits: { resist: new Set(["fire"]), immune: new Set(["poison"]), vuln: new Set() }, conditionPenalties: {} } };
  const on = damagePlan(target, [{ amount: 10, type: "fire" }, { amount: 6, type: "poison" }]);
  const off = damagePlan(target, [{ amount: 10, type: "fire" }, { amount: 6, type: "poison" }], { ignoreTraits: true });
  assert.equal(on.health, 5);
  assert.equal(off.health, 16);
  assert.ok(off.steps.some(s => /Not applied \(rule off\): Resists fire, Immune poison/.test(s)));
});

test("A8: the roll dialog's Secret box is read", () => {
  assert.equal(readChoice({ secret: true }, []).secret, true);
  assert.equal(readChoice({}, []).secret, false);
});

test("Part A rules exist with defaults that keep play as it was", () => {
  assert.equal(rules.critDamage.default, "dice");
  assert.equal(rules.applyResistances.default, true);
  assert.equal(rules.removeExpiredEffects.default, true);
  assert.equal(rules.npcRollBreakdowns.default, true);
  for ( const k of ["hideNpcDamage", "hideNpcConditions", "hideNpcNames", "secretChecks"] ) assert.equal(rules[k].default, false, k);
});

test("A-ii: token sizes, defeated, encumbrance", async () => {
  const { tokenSizeFor, isDefeated, encumbranceChange } = await import("../../module/rules/token-size.mjs");
  assert.deepEqual(tokenSizeFor("tiny"), { width: 0.5, height: 0.5 });
  assert.deepEqual(tokenSizeFor("huge"), { width: 3, height: 3 });
  assert.equal(tokenSizeFor("colossal"), null);
  assert.equal(isDefeated({ type: "npc", hp: 0, statuses: new Set() }), true);
  assert.equal(isDefeated({ type: "character", hp: 0, statuses: new Set(["dying"]) }), false, "a Dying character isn't defeated");
  assert.equal(isDefeated({ type: "character", hp: 0, statuses: new Set(["dead"]) }), true);
  assert.equal(encumbranceChange(true, false), "add");
  assert.equal(encumbranceChange(false, true), "remove");
  assert.equal(encumbranceChange(true, true), null);
  for ( const k of ["sharedVision", "partyStatsVisible", "scaleTokens", "defeatedMarker", "encumbranceStatus"] ) assert.equal(rules[k].default, false, k);
});

test("A15–A19: free feat track, proficiency modes, homebrew, world clock, tables", async () => {
  const { proficiencyFor, freeFeatCount } = await import("../../module/rules/progression.mjs");
  const { parseHomebrew, mergeHomebrew, worldTimeParts, tableFor } = await import("../../module/rules/variants.mjs");
  assert.equal(freeFeatCount("2, 6, 10", 7), 2);
  assert.equal(freeFeatCount("", 20), 0);
  assert.equal(proficiencyFor(10), 6, "the book");
  assert.equal(proficiencyFor(10, "fixed", 4), 4);
  assert.equal(proficiencyFor(10, "slow"), 3);
  assert.equal(proficiencyFor(17, "slow"), 5);
  assert.deepEqual(parseHomebrew("Storm Release, Lava Release, ,"), { stormRelease: "Storm Release", lavaRelease: "Lava Release" });
  const list = { fire: { label: "Fire" } };
  assert.deepEqual(mergeHomebrew(list, { fire: "Fire", sound: "Sound" }, label => ({ label })), ["sound"]);
  assert.equal(list.fire.label, "Fire", "existing entries are kept");
  assert.equal(worldTimeParts(0).label, "Day 1, 00:00");
  assert.equal(worldTimeParts(86400 * 2 + 3600 * 14 + 300).label, "Day 3, 14:05");
  assert.deepEqual(tableFor({ kind: "attack", natural: 20 }, { crit: "Crits" }), { which: "crit", name: "Crits" });
  assert.equal(tableFor({ kind: "attack", natural: 20 }, { crit: "" }), null);
  assert.equal(tableFor({ kind: "save", natural: 1 }, { fumble: "Fumbles" }), null);
  assert.equal(rules.flatProficiency.default, "book");
  assert.equal(rules.worldClock.default, false);
});

test("A14 gradual ability increases: +1 ability at 2/6/10/14/18; feat and Mastery at 4/8/12/16/19 (King Q-P12, Q-P14)", async () => {
  const { asiParts } = await import("../../module/rules/progression.mjs");
  assert.deepEqual(asiParts(4, false), { ability: true, feat: true, mastery: true });
  assert.equal(asiParts(2, false), null);
  assert.deepEqual(asiParts(2, true), { ability: true, feat: false, mastery: false });
  assert.deepEqual(asiParts(19, true), { ability: false, feat: true, mastery: true });
  assert.equal(asiParts(5, true), null);
});
