/**
 * Phase 4: damage pipeline (King's rulings), healing, concentration on damage, death saves,
 * conditions read from save text.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeActor, baseAbilities } from "./helpers/actor.mjs";
import { damagePlan, healPlan, concentrationOnDamage, deathSaveResult } from "../module/rules/damage.mjs";
import { parseActivities } from "../module/rules/activity-parse.mjs";

const target = (traits = {}, extra = {}) => {
  const a = makeActor({ system: { ...structuredClone(baseAbilities), traits: { dr: 3, ...traits }, ...extra } });
  a.system.hp.value = 30;
  a.system.hp.temp = 0;
  a.system.cp.value = 20;
  return a;
};

test("DR applies once to the whole calculation, before resistance; Pierce lowers it", () => {
  const a = target({ resist: ["fire"] });
  const p = damagePlan(a, [{ amount: 10, type: "fire" }, { amount: 6, type: "slashing" }]);
  // DR 3 comes off the first instance (10 -> 7), then fire resisted (7 -> 3); slashing 6.
  assert.equal(p.health, 3 + 6);
  assert.match(p.steps[0], /DR 3: −3/);
  const pierced = damagePlan(a, [{ amount: 10, type: "slashing" }], { pierce: 2 });
  assert.equal(pierced.health, 9, "DR 3 - Pierce 2 = 1");
});

test("vulnerability doubles, both cancel, immunity zeroes, half rounds down", () => {
  assert.equal(damagePlan(target({ dr: 0, vuln: ["cold"] }), [{ amount: 7, type: "cold" }]).health, 14);
  assert.equal(damagePlan(target({ dr: 0, vuln: ["cold"], resist: ["cold"] }), [{ amount: 7, type: "cold" }]).health, 7);
  assert.equal(damagePlan(target({ dr: 0, immune: ["poison"] }), [{ amount: 9, type: "poison" }]).health, 0);
  assert.equal(damagePlan(target({ dr: 0 }), [{ amount: 9, type: "fire" }], { multiplier: 0.5 }).health, 4);
});

test("Genjutsu psychic ignores DR; Chakra damage hits CP; temp pools absorb first", () => {
  assert.equal(damagePlan(target({ dr: 5 }), [{ amount: 8, type: "psychic" }], { genjutsu: true }).health, 8);
  assert.equal(damagePlan(target({ dr: 5 }), [{ amount: 8, type: "psychic" }]).health, 3, "non-Genjutsu psychic uses DR");
  const a = target({ dr: 0 });
  a.system.hp.temp = 5;
  a.system.cp.temp = 2;
  const p = damagePlan(a, [{ amount: 8, type: "fire" }, { amount: 6, type: "chakra" }]);
  assert.equal(p.update["system.hp.temp"], 0);
  assert.equal(p.update["system.hp.value"], 27);
  assert.equal(p.update["system.cp.temp"], 0);
  assert.equal(p.update["system.cp.value"], 16);
});

test("0 HP: Dying, instant death, failures while at 0", () => {
  const a = target({ dr: 0 });
  const max = a.system.hp.max;
  assert.ok(damagePlan(a, [{ amount: 35, type: "fire" }]).dropsToZero);
  assert.ok(damagePlan(a, [{ amount: 30 + max, type: "fire" }]).instantDeath, "leftover >= max HP");
  a.system.hp.value = 0;
  assert.equal(damagePlan(a, [{ amount: 4, type: "fire" }]).deathFailures, 1);
  assert.equal(damagePlan(a, [{ amount: 4, type: "fire" }], { crit: true }).deathFailures, 2);
});

test("healing: Envenomed blocks HP; healing at 0 revives; temp keeps the higher", () => {
  const a = target();
  a.system.hp.value = 0;
  const h = healPlan(a, 5);
  assert.ok(h.revived);
  assert.equal(h.update["system.hp.value"], 5);
  assert.equal(h.update["system.deathSaves.success"], 0);
  const v = makeActor({ system: structuredClone(baseAbilities), conditions: [{ key: "envenomed", ranks: 1 }] });
  assert.match(healPlan(v, 5).blocked, /Envenomed/);
  a.system.hp.temp = 8;
  assert.equal(healPlan(a, 5, "tempHp").update["system.hp.temp"], 8);
});

test("concentration on damage: DC max(15 + ranks, half damage); Stable is safe", () => {
  const J = (id, rank, kw) => ({ _id: id.padEnd(16, "0"), name: id, type: "jutsu", system: { discipline: "nin", rank, keywords: kw,
    cost: { mode: "chakra", value: 4 }, duration: { unit: "minute", value: 1, concentration: true } } });
  const a = makeActor({ system: structuredClone(baseAbilities), items: [J("mist", "C", ["ninjutsu"]), J("wall", "B", ["ninjutsu", "stable"])] });
  a.system.combat.concentrating = ["mist000000000000", "wall000000000000"];
  const c = concentrationOnDamage(a, 10);
  assert.equal(c.dc, 15 + 2 + 3);
  assert.deepEqual(c.atRisk.map(j => j.name), ["mist"], "Stable jutsu can't be lost to damage");
  assert.equal(concentrationOnDamage(a, 60).dc, 30, "half the damage when higher");
  assert.equal(concentrationOnDamage(a, 0), null);
});

test("death saves", () => {
  assert.deepEqual(deathSaveResult({ success: 0, failure: 0 }, 12), { success: 1, failure: 0, outcome: "continue" });
  assert.equal(deathSaveResult({ success: 2, failure: 0 }, 10).outcome, "stable");
  assert.deepEqual(deathSaveResult({ success: 1, failure: 1 }, 1), { success: 1, failure: 3, outcome: "dead" });
  assert.deepEqual(deathSaveResult({ success: 1, failure: 2 }, 20), { success: 0, failure: 0, regain: 1, outcome: "revive" });
});

test("compendium jutsu: what a failed save inflicts", () => {
  const SRC = path.join(import.meta.dirname, "..", "packs", "_source", "jutsu");
  const get = n => fs.readdirSync(SRC).map(f => JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8"))).find(d => d.name === n);
  const save = n => parseActivities(get(n).system.description, { discipline: get(n).system.discipline }).find(a => a.type === "save");
  assert.deepEqual(save("Butterfly Kick").inflicts.map(i => [i.key, i.ranks]), [["concussed", 1]]);
  assert.deepEqual(save("Snake Constricting Grip").inflicts.map(i => i.key), ["restrained"]);
  assert.deepEqual(save("Fire Release: Flame Whip").inflicts.map(i => i.key), ["prone", "burned"]);
  assert.deepEqual(save("Leaf Hurricane").inflicts.map(i => i.key), ["prone"]);
});
