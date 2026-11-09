import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateFormula } from "../module/rules/formula.mjs";
import { damagePlan } from "../module/rules/damage.mjs";

test("N5e numeric formulas prioritize addition/subtraction and retain explicit grouping", () => {
  assert.equal(evaluateFormula("10 - 2 * 3"), 24);
  assert.equal(evaluateFormula("10 + 2 / 3"), 4);
  assert.equal(evaluateFormula("10 - (2 * 3)"), 4);
  assert.equal(evaluateFormula("2 * 3 + 4"), 14);
  assert.equal(evaluateFormula("1 + @prof * 2", { prof: 3 }), 8);
  assert.equal(evaluateFormula("floor(@level / 2) + 1", { level: 5 }), 3);
  assert.equal(evaluateFormula("max(1, 2 + 3 * 2)"), 10);
  assert.equal(evaluateFormula("-2 + 4 * 3"), 6);
});

test("bounded numeric formulas reject code, malformed expressions and nonfinite results", () => {
  for ( const source of ["globalThis.game", "1; 2", "1 / 0", "1 2", "abs(1,2)", "(1", "1**2", Infinity, "(".repeat(100)+"1"+")".repeat(100)] ) assert.equal(evaluateFormula(source, {}, -99), -99);
});

test("damage flat subtraction precedes multipliers; identical factors apply once and opposites cancel", () => {
  const actor = { system: { dr: 4, hp: { value: 100, temp: 0, max: 100 }, cp: { value: 100, temp: 0 }, traits: {} } };
  const hit = traits => ({ ...actor, system: { ...actor.system, traits } });
  const damage = [{ amount: 20, type: "fire" }];
  assert.equal(damagePlan(actor, damage, { multiplier: 0.5 }).health, 8);
  assert.equal(damagePlan(actor, damage, { multiplier: 2 }).health, 32);
  assert.equal(damagePlan(hit({ resist: ["fire"] }), damage, { multiplier: 0.5 }).health, 8);
  assert.equal(damagePlan(hit({ vuln: ["fire"] }), damage, { multiplier: 0.5 }).health, 16);
  assert.equal(damagePlan(hit({ resist: ["fire"] }), damage, { multiplier: 2 }).health, 16);
  assert.equal(damagePlan(hit({ immune: ["fire"] }), damage, { multiplier: 2 }).health, 0);
  assert.equal(damagePlan(hit({ immune: ["fire"] }), damage, { piercing: true, multiplier: 0.5 }).health, 9);
  assert.equal(damagePlan(actor, damage, { flatReduction: 6, multiplier: 0.5 }).health, 5);
  assert.equal(damagePlan(actor, damage, { flatReduction: 6, pierce: 3 }).health, 13);
});
