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
