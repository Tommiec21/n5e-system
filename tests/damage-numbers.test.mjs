/** DMG1: Bruised, Weakened, Petrified and Exhaustion change the damage numbers (King 2026-11-13). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { damagePlan, reduceInstances, dealtDamagePenalty, exhaustedRollTotal } from "../module/rules/damage.mjs";

globalThis.game = { settings: { get: () => false } };
const target = (pen = {}, extra = {}) => ({ type: "character", system: { hp: { value: 50, temp: 0, max: 50 }, cp: { value: 20, temp: 0 }, dr: 0, traits: {},
  deathSaves: {}, conditionPenalties: { damageTaken: 0, damageDealt: 0, flags: {}, ...pen }, ...extra } });

test("Bruised: +4 to the first HP damage type before DR", () => {
  const plan = damagePlan(target({ damageTaken: 4 }, { dr: 3 }), [{ amount: 0, type: "chakra" }, { amount: 5, type: "fire" }]);
  assert.equal(plan.health, 6, "5 + 4 − 3 DR");
  assert.ok(plan.steps.some(s => /Bruised: \+4/.test(s)));
  assert.equal(damagePlan(target({ damageTaken: 4 }), [{ amount: 6, type: "chakra" }]).chakra, 6, "chakra-only damage gets no Bruised bonus");
  assert.equal(damagePlan(target({ damageTaken: 4 }), [{ amount: 0, type: "fire" }]).health, 0, "no damage, no bonus");
});

test("Petrified: resistance to all damage; immunity still wins; Half does not stack with it", () => {
  const p = target({ flags: { resistAll: true } });
  assert.equal(damagePlan(p, [{ amount: 10, type: "fire" }, { amount: 7, type: "slashing" }]).health, 5 + 3);
  p.system.traits = { immune: new Set(["poison"]) };
  assert.equal(damagePlan(p, [{ amount: 10, type: "poison" }]).health, 0);
  assert.equal(damagePlan(target({ flags: { resistAll: true } }), [{ amount: 10, type: "fire" }], { multiplier: 0.5 }).health, 5);
});

test("Weakened and Exhaustion on dealt damage: first type first, never below 0", () => {
  assert.equal(dealtDamagePenalty({ system: { conditionPenalties: { damageDealt: -8 }, exhaustion: 2 } }), 10);
  assert.equal(dealtDamagePenalty({ system: {} }), 0);
  assert.deepEqual(reduceInstances([{ amount: 8, type: "slashing" }, { amount: 6, type: "fire" }], 10).instances.map(i => i.amount), [0, 4]);
  assert.equal(reduceInstances([{ amount: 3, type: "fire" }], 10).removed, 3);
  const plan = damagePlan(target(), [{ amount: 8, type: "slashing" }, { amount: 6, type: "fire" }], { dealtPenalty: 4 });
  assert.equal(plan.health, 10);
  assert.ok(plan.steps.some(s => /Weakened\/Exhaustion: −4/.test(s)));
});

test("Exhaustion on healing and recovery rolls: −1 per rank once per roll", () => {
  assert.equal(exhaustedRollTotal(9, { system: { exhaustion: 3 } }), 6);
  assert.equal(exhaustedRollTotal(2, { system: { exhaustion: 3 } }), 0);
  assert.equal(exhaustedRollTotal(9, { system: {} }), 9);
});
