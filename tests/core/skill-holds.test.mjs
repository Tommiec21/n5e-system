/** FIN2a: size limits, holds and Escape (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { sizeGate, skillActionGate, holdBroken, skillActionEffects, WEAPON_SKILL_ACTIONS, SIZE_GATED } from "../../module/rules/skill-resolution.mjs";

test("size: disadvantage one size larger, impossible two or more", () => {
  assert.equal(sizeGate("medium", "medium"), "normal");
  assert.equal(sizeGate("medium", "small"), "normal");
  assert.equal(sizeGate("medium", "large"), "disadvantage");
  assert.equal(sizeGate("medium", "huge"), "impossible");
  assert.equal(sizeGate("medium", "unknown"), "normal");
});

test("the size rule applies to Trip only (the book states it there)", () => {
  assert.deepEqual(SIZE_GATED, ["trip"]);
  assert.match(skillActionGate("trip", { actorSize: "small", targetSize: "large" }).refuse, /two or more sizes larger/);
  assert.deepEqual(skillActionGate("trip", { actorSize: "medium", targetSize: "large" }), { refuse: null, disadvantage: ["Target one size larger"] });
  assert.deepEqual(skillActionGate("grapple", { actorSize: "small", targetSize: "huge" }), { refuse: null, disadvantage: [] });
});

test("Pin, Takedown, Choke and Muffle need a hold on the target", () => {
  for ( const key of ["pin", "takedown", "choke", "muffle"] ) {
    assert.match(skillActionGate(key, { holding: false }).refuse, /grappling/);
    assert.equal(skillActionGate(key, { holding: true }).refuse, null);
  }
});

test("Escape needs a hold, and is at disadvantage when the hold restrains", () => {
  assert.match(skillActionGate("escape", {}).refuse, /aren't being held/);
  assert.deepEqual(skillActionGate("escape", { held: { by: "Actor.h", restrained: false } }), { refuse: null, disadvantage: [] });
  assert.deepEqual(skillActionGate("escapeAcrobatics", { held: { by: "Actor.h", restrained: true } }).disadvantage, ["Restrained by the hold"]);
  assert.deepEqual(skillActionEffects("escape", { result: "success" }).notes, ["the hold ends"]);
});

test("a hold breaks past 5 ft; weapon properties map to their skill actions", () => {
  assert.equal(holdBroken(5), false);
  assert.equal(holdBroken(10), true);
  assert.deepEqual(WEAPON_SKILL_ACTIONS, { disarm: ["disarm", "grapple"], trip: ["trip", "shove"] });
});
