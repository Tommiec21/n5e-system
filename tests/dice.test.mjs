/**
 * Phase 3 roll rules: what each click rolls, crit thresholds, kept naturals, Will of Fire awards.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeActor, load, baseAbilities, taiSpec } from "./helpers/actor.mjs";
import { clickMode, critThreshold, rollSpec, readD20, willOfFireAward, MODES } from "../module/dice/d20.mjs";

const actor = () => makeActor({ system: structuredClone(baseAbilities), items: [taiSpec(5), load("clans", "Uchiha")] });

test("click modifiers", () => {
  assert.deepEqual(clickMode({}), { mode: "normal", dialog: false });
  assert.deepEqual(clickMode({ shiftKey: true }), { mode: "normal", dialog: true });
  assert.equal(clickMode({ altKey: true }).mode, "advantage");
  assert.equal(clickMode({ ctrlKey: true }).mode, "disadvantage");
  assert.equal(MODES.advantage, "2d20kh");
});

test("roll specs use the sheet's totals", () => {
  const a = actor();
  const s = a.system;
  assert.equal(rollSpec(a, "ability", "str").bonus, s.abilities.str.mod);
  assert.equal(rollSpec(a, "save", "con").bonus, s.saves.con.total);
  assert.equal(rollSpec(a, "skill", "ath").bonus, s.skills.ath.total);
  assert.equal(rollSpec(a, "initiative").bonus, s.initiative.total);
  assert.equal(rollSpec(a, "attack", "tai").bonus, s.disciplines.tai.attack);
  assert.equal(rollSpec(a, "attack", "tai").scope, "tai");
  assert.ok(rollSpec(a, "save", "con").breakdown, "breakdown for the hover");
  assert.equal(rollSpec(a, "nope", "x"), null);
});

test("skill actions carry the tier penalty and outcome text", () => {
  const a = actor();
  const stab = rollSpec(a, "skillAction", "stabilize");
  const med = a.system.skills.med;
  assert.equal(stab.penalty, med.isProficient ? 0 : -3);
  assert.equal(stab.bonus, med.total + stab.penalty);
  assert.match(stab.outcome, /stable/);
  assert.match(stab.roll, /DC 20/);
});

test("conditions lower ability checks once per roll", () => {
  const plain = actor().system.abilities.str.check;
  const tired = makeActor({ system: structuredClone(baseAbilities), items: [taiSpec(5)], conditions: [{ key: "exhaustion", ranks: 2 }] });
  assert.equal(tired.system.abilities.str.check, plain - 2);
});

test("crit threshold: scope bonuses stack to a +3 cap", () => {
  const a = actor();
  assert.equal(critThreshold(a, "tai"), 20);
  a.system.critRange = { all: 1, tai: 1 };
  assert.equal(critThreshold(a, "tai"), 18);
  assert.equal(critThreshold(a, "nin"), 19);
  a.system.critRange = { all: 2, tai: 3 };
  assert.equal(critThreshold(a, "tai"), 17);
});

test("reading the kept d20", () => {
  const adv = { total: 25, dice: [{ faces: 20, results: [{ result: 4, active: false, discarded: true }, { result: 19, active: true }] }] };
  assert.deepEqual(readD20(adv, 19), { natural: 19, total: 25, crit: true, fumble: false, willOfFireTrigger: false });
  const one = { total: 6, dice: [{ faces: 20, results: [{ result: 1, active: true }] }] };
  assert.ok(readD20(one).fumble && readD20(one).willOfFireTrigger);
});

test("Will of Fire: first natural 1 or 20 per encounter, max 3, only in combat", () => {
  const a = actor();
  a.system.willOfFire.value = 1;
  assert.deepEqual(willOfFireAward(a, { natural: 20 }, "c1"), { award: true, value: 2 });
  assert.equal(willOfFireAward(a, { natural: 20 }, null).award, false, "no encounter");
  assert.equal(willOfFireAward(a, { natural: 15 }, "c1").award, false);
  a.flags = { n5e: { wofEncounter: "c1" } };
  assert.equal(willOfFireAward(a, { natural: 1 }, "c1").award, false, "already earned this encounter");
  assert.equal(willOfFireAward(a, { natural: 1 }, "c2").award, true, "new encounter");
  a.system.willOfFire.value = 3;
  assert.equal(willOfFireAward(a, { natural: 20 }, "c3").award, false, "max 3");
});

test("effect key catalog covers n5e keys and every skill", async () => {
  const { changeKeyCatalog } = await import("../module/rules/change-keys.mjs");
  const N5E = (await import("../module/config/index.mjs")).default;
  const keys = changeKeyCatalog(N5E).map(c => c.key);
  for ( const k of ["n5e.dr", "n5e.critRange.tai", "n5e.cost.nin", "n5e.cost.keyword.fireRelease", "n5e.mastery.skill.ste",
    "n5e.mastery.tool.poison", "system.bonuses.ac", "system.abilities.str.value"] ) assert.ok(keys.includes(k), k);
  assert.equal(new Set(keys).size, keys.length, "no duplicates");
});
