/** STD3: conditions and states as data. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { conditions, states } from "../../module/config/conditions.mjs";
import { conditionRoll, conditionCastProblems, conditionDamageHandling, activeEntries } from "../../module/rules/condition-elements.mjs";
import { validateConditionalRules } from "../../module/rules/effect-authoring.mjs";

const who = (statuses = [], senses = {}, extra = {}) => ({ statuses: new Set(statuses), senses, ...extra });

test("every condition and state entry's elements pass validation", () => {
  for ( const [key, e] of Object.entries({ ...conditions, ...states }) ) {
    if ( e.rules ) assert.doesNotThrow(() => validateConditionalRules(e.rules), key);
  }
});

test("the engines name no condition or state", () => {
  const keys = Object.keys({ ...conditions, ...states });
  for ( const f of ["module/rules/advantage.mjs", "module/rules/cast-checks.mjs", "module/rules/condition-elements.mjs"] ) {
    const code = fs.readFileSync(f, "utf8").split("\n").filter(l => !/^\s*(\*|\/\/)/.test(l)).join("\n");
    for ( const k of keys ) assert.ok(!new RegExp(`["'\`]${k}["'\`]`).test(code), `${f} names "${k}"`);
  }
});

test("Encumbered, Helped and Dazzled", () => {
  assert.deepEqual(conditionRoll({ roller: who([], {}, { encumbered: true }), kind: "save", ability: "con" }).disadvantage, ["Encumbered"]);
  assert.deepEqual(conditionRoll({ roller: who(["helped"]), kind: "attack" }).consume, ["helped"]);
  assert.deepEqual(conditionRoll({ roller: who(["dazzled", "invisible"]), target: who(), kind: "attack" }).advantage, []);
});

test("casting limits and damage handling come from the entries", () => {
  assert.deepEqual(conditionCastProblems(who(["petrified"]), ["cm"]).length, 1);
  assert.match(conditionCastProblems(who(["grappled"]), ["hs", "cm"])[0], /Hand Seals need free hands/);
  assert.deepEqual(conditionCastProblems(who(["slowed"]), ["hs", "cm"]), []);
  assert.equal(conditionDamageHandling(who(["petrified"])).resistAll, true);
  assert.equal(conditionDamageHandling(who(["prone"])).resistAll, false);
  assert.deepEqual(activeEntries(who(["notACondition"])), []);
});
