import { test } from "node:test";
import assert from "node:assert/strict";
import { n5eRollFormula, createN5eRoll } from "../module/dice/n5e-roll.mjs";

test("N5e roll grouping puts addition/subtraction before multiplication/division", () => {
  assert.equal(n5eRollFormula("1d6 + 3 * 2"), "(1d6+3)*2");
  assert.equal(n5eRollFormula("2 * 1d6 + 3"), "2*(1d6+3)");
  assert.equal(n5eRollFormula("1d6 - 2 / 3"), "(1d6-2)/3");
  assert.equal(n5eRollFormula("1d6 * (2 + 3)"), "1d6 * (2 + 3)");
  assert.equal(n5eRollFormula("floor(1d6 + 3 / 2)"), "floor((1d6+3)/2)");
  assert.equal(n5eRollFormula("{1d6 + 3 * 2,1d8}kh"), "{(1d6+3)*2,1d8}kh");
});
test("ordinary dice, keep/reroll modifiers and flavor annotations remain unchanged", () => {
  for ( const formula of ["1d20 + @bonus", "2d20kh1 + 3", "2d6r1 + 2", "1d6cs>=-1 + 2", "1d6[fire+lightning]", "{1d6,1d8}kh"] ) assert.equal(n5eRollFormula(formula), formula);
  assert.equal(n5eRollFormula("@damage * 2", { damage: "1d6 + 3" }), "(1d6 + 3)*2");
  assert.equal(n5eRollFormula("1d6[king's sword + 1] * 2"), "1d6[king's sword + 1] * 2");
  for ( const formula of ["1d6 ** 2", "(1d6", "1d6 +", "1d6 % 2"] ) assert.throws(() => n5eRollFormula(formula));
});
test("the factory passes grouped formulas to the existing Roll implementation without replacing it", () => {
  const Original = class { constructor(formula, data, options) { this.formula = formula; this.data = data; this.options = options; } };
  globalThis.Roll = Original;
  const roll = createN5eRoll("1d6 + @bonus * 2", { bonus: 3 }, { custom: true });
  assert.ok(roll instanceof Original); assert.equal(globalThis.Roll, Original);
  assert.equal(roll.formula, "(1d6+@bonus)*2"); assert.equal(roll.options.custom, true);
});
