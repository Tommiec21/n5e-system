/** PRESTD1 Part D-ii: hazards and vehicles (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkShortcut, saveShortcut, damageShortcut, hazardLines, vehicleLines, board, leave, hasSeat, isNpcLike } from "../../module/rules/hazards.mjs";

test("check shortcuts for skills, toolkits and abilities", () => {
  assert.equal(checkShortcut("prc", 15, "Notice"), "[[/check prc dc=15]]{Notice}");
  assert.equal(checkShortcut("tool:trappers", 18, "Disable {it}"), "[[/check tool=trappers dc=18]]{Disable it}");
  assert.equal(checkShortcut("dex", 0, "Steer"), "[[/check dex]]{Steer}");
  assert.equal(checkShortcut("nope", 10, "x"), "");
  assert.equal(saveShortcut("dex", 14, "Dodge"), "[[/save dex dc=14]]{Dodge}");
  assert.equal(damageShortcut("2d10"), "[[/damage 2d10]]");
});

test("hazard and vehicle card lines", () => {
  const h = { kind: "complex", stealthDC: 16, disable: { skill: "tool:security", dc: 18, note: "Two successes" } };
  assert.match(hazardLines("Pit", h, "notice")[0], /\[\[\/check prc dc=16\]\]/);
  assert.deepEqual(hazardLines("Pit", h, "disable").length, 2);
  assert.match(hazardLines("Pit", h, "trigger")[0], /each round/);
  const v = { pilot: { skill: "dex", dc: 15 }, collision: { damage: "2d10", save: "dex", dc: 15 } };
  assert.match(vehicleLines("Cart", v, "pilot")[0], /\[\[\/check dex dc=15\]\]/);
  assert.match(vehicleLines("Cart", v, "collision")[0], /\[\[\/damage 2d10\]\].*\[\[\/save dex dc=15\]\]/);
});

test("boarding: seats, moving between crew and passengers, leaving", () => {
  const v = { crew: ["a"], passengers: [], capacity: { crew: 1, passengers: 2 } };
  assert.throws(() => board(v, "b", "crew"), /No crew seat/);
  assert.deepEqual(board(v, "a", "passengers"), { crew: [], passengers: ["a"] });
  assert.deepEqual(board(v, "b", "passengers"), { crew: ["a"], passengers: ["b"] });
  assert.deepEqual(leave(v, "a"), { crew: [], passengers: [] });
  assert.equal(hasSeat(["x", "y"], 0), true);
  assert.equal(isNpcLike("vehicle"), true);
  assert.equal(isNpcLike("loot"), false);
});
