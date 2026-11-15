/** ROLL1: the roll dialog's math (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAdded, d20Parts, situationalParts, composeD20, groupParts, diceParts, composeDice, readChoice } from "../../module/rules/roll-math.mjs";

const spec = { bonus: 8, breakdown: { parts: [{ label: "Str", value: 4, base: true }, { label: "Proficiency", value: 4 }] } };

test("added modifiers: numbers and dice, nothing else", () => {
  assert.deepEqual(parseAdded("2"), { ok: true, number: 2 });
  assert.deepEqual(parseAdded(" -1 "), { ok: true, number: -1 });
  assert.deepEqual(parseAdded("1d4"), { ok: true, dice: "1d4" });
  assert.deepEqual(parseAdded("+1d6 + 2"), { ok: true, dice: "1d6+2" });
  assert.equal(parseAdded("2d8 - 1").dice, "2d8-1");
  for ( const bad of ["x", "1d", "@prof", "2*3", "1d4; drop"] ) assert.equal(parseAdded(bad).ok, false, bad);
  assert.equal(parseAdded("").empty, true);
});

test("every part of the bonus is listed; a difference outside the breakdown is its own part", () => {
  assert.deepEqual(d20Parts(spec).map(p => [p.id, p.label, p.value]), [["p0", "Str", 4], ["p1", "Proficiency", 4]]);
  assert.deepEqual(d20Parts({ ...spec, bonus: 3, penalty: -5 }).at(-1), { id: "p2", label: "Skill action penalty", value: -5 });
  assert.deepEqual(d20Parts({ ...spec, bonus: 10 }).at(-1).label, "Other");
  assert.deepEqual(d20Parts({ bonus: 5 }), [{ id: "p0", label: "Bonus", value: 5, base: true }]);
});

test("any part can be unticked, including ability and proficiency; added numbers and dice", () => {
  const parts = d20Parts(spec);
  const untouched = composeD20(parts, {});
  assert.deepEqual([untouched.bonus, untouched.extra, untouched.edited], [8, "", false]);
  const out = composeD20(parts, { off: ["p0"], added: [{ label: "Bless", value: "1d4" }, { value: "2" }, { value: "nope" }] }, "Athletics");
  assert.deepEqual([out.bonus, out.extra, out.edited], [6, "1d4", true]);
  assert.deepEqual(out.breakdown.parts.map(p => [p.label, p.removed ?? false, p.added ?? false]),
    [["Str", true, false], ["Proficiency", false, false], ["Bless (1d4)", false, true], ["Added", false, true]]);
  assert.equal(out.breakdown.total, 6);
});

test("situational modifiers are listed unticked and count only when ticked", () => {
  const parts = [...d20Parts(spec), ...situationalParts([{ label: "Forest stalker", value: 2, when: "in forests" }])];
  assert.equal(parts.at(-1).label, "Forest stalker (in forests)");
  assert.equal(composeD20(parts, {}).bonus, 8);
  const on = composeD20(parts, { on: ["s0"] });
  assert.deepEqual([on.bonus, on.edited, on.breakdown.parts.at(-1).added], [10, true, true]);
});

test("a group: one row per label, with whether every creature has the same value", () => {
  const rows = groupParts([spec, { bonus: 6, breakdown: { parts: [{ label: "Str", value: 2, base: true }, { label: "Proficiency", value: 4 }] } }]);
  assert.deepEqual(rows.map(r => [r.label, r.same, r.values]), [["Str", false, [4, 2]], ["Proficiency", true, [4, 4]]]);
});

test("dice: parts and flat modifiers, unticked, added typed damage, Critical", () => {
  const parts = diceParts([{ formula: "1d8 + 3", type: "slashing", abilityMod: 3 }, { formula: "2d6", type: "fire" }], [{ label: "Rage", value: 2 }]);
  assert.deepEqual(parts.map(p => [p.id, p.flat ?? false]), [["d0", false], ["d1", false], ["m0", true]]);
  assert.deepEqual(composeDice(parts, {}).parts.map(p => p.formula), ["(1d8 + 3) + (2)", "2d6"]);
  const out = composeDice(parts, { off: ["d1"], added: [{ label: "Hex", value: "1d6", type: "necrotic" }], crit: true });
  assert.deepEqual(out.parts.map(p => [p.formula, p.type]), [["(1d8 + 3) + (2)", "slashing"], ["1d6", "necrotic"]]);
  assert.deepEqual([out.crit, out.edited], [true, true]);
  assert.deepEqual(composeDice(parts, { off: ["d0", "d1"] }).parts, [{ formula: "2", type: "slashing", abilityMod: 0 }], "only the flat part is left");
});

test("the form becomes a choice; bad entries are reported, not rolled", () => {
  const parts = [...d20Parts(spec), ...situationalParts([{ label: "Forest", value: 2 }])];
  const choice = readChoice({ on_p0: false, on_p1: true, on_s0: true, addLabel_0: "Bless", addValue_0: "1d4", addValue_1: "oops", addValue_2: "", mode: "advantage" }, parts);
  assert.deepEqual(choice.off, ["p0"]);
  assert.deepEqual(choice.on, ["s0"]);
  assert.deepEqual(choice.added, [{ label: "Bless", value: "1d4", type: "" }]);
  assert.deepEqual(choice.invalid, ["oops"]);
  assert.equal(choice.mode, "advantage");
});
