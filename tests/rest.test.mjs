/**
 * Phase 5: rests (limits, rations, recoveries).
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { makeActor, baseAbilities, load } from "./helpers/actor.mjs";
import { restCheck, restPlan, shortRestDice } from "../module/rules/rest.mjs";

const settings = {};
globalThis.game = { settings: { get: (s, k) => settings[k] } };
afterEach(() => { for ( const k of Object.keys(settings) ) delete settings[k]; });

const scout = (extra = {}) => {
  const a = makeActor({ system: structuredClone(baseAbilities), items: [load("classes", "scout-nin")], ...extra });
  return a;
};

test("Short Rest dice: half the max (min 1), no more than remain", () => {
  assert.equal(shortRestDice({ max: 5, value: 5 }), 2);
  assert.equal(shortRestDice({ max: 1, value: 1 }), 1);
  assert.equal(shortRestDice({ max: 6, value: 1 }), 1);
  assert.equal(shortRestDice({ max: 0, value: 0 }), 0);
});

test("rests are free by default; count and time limits are GM options", () => {
  const a = scout({ flags: { rest: { srSinceLr: 5, lrSinceFr: 9, lastLr: 0 } } });
  assert.equal(restCheck(a, "short").ok, true);
  assert.equal(restCheck(a, "long").ok, true);
  settings.restLimit = "count";
  settings.shortRestsPerLong = 2;
  assert.equal(restCheck(a, "short").ok, false);
  assert.equal(restCheck(a, "long").ok, false);
  settings.longRestsPerFull = 0;
  assert.equal(restCheck(a, "long").ok, true, "0 = unlimited");
  settings.restLimit = "time";
  assert.equal(restCheck(a, "long", { now: 3600 }).ok, false);
  assert.equal(restCheck(a, "long", { now: 90000 }).ok, true);
});

test("Ration Pool: costs, shortage gives no benefit, no Full Rest on missions", () => {
  const a = scout();
  settings.rations = true;
  const ok = restCheck(a, "long", { rations: 12 });
  assert.equal(ok.benefit, true);
  assert.equal(ok.rationCost, 10);
  const short = restCheck(a, "long", { rations: 4 });
  assert.equal(short.ok, true);
  assert.equal(short.benefit, false);
  assert.equal(restCheck(a, "full", { rations: 20 }).ok, false);
  settings.rationFullOnMissions = true;
  assert.equal(restCheck(a, "full", { rations: 20 }).ok, true);
  settings.rationLongCost = 3;
  assert.equal(restCheck(a, "long", { rations: 4 }).rationCost, 3, "editable cost");
});

test("Long/Full Rest needs 1 HP; Envenomed rests give no benefit", () => {
  const a = scout();
  a.system.hp.value = 0;
  assert.equal(restCheck(a, "long").ok, false);
  assert.equal(restCheck(a, "short").ok, true);
  const v = scout({ conditions: [{ key: "envenomed", ranks: 1 }] });
  assert.equal(restCheck(v, "short").benefit, false);
});

test("Short Rest spends dice, adds the roll, advances the counter", () => {
  const a = scout();
  a.system.hp.value = 3;
  const p = restPlan(a, "short", { hdSpent: 1, hdRoll: 7 });
  assert.equal(p.update["system.hp.value"], Math.min(a.system.hp.max, 10));
  assert.equal(p.update["system.hitDice.spent"], 1);
  assert.equal(p.update["flags.n5e.rest"].srSinceLr, 1);
});

test("Long Rest: half HP/CP, half spent dice back, temp pools end, counters reset", () => {
  const a = scout({ flags: { rest: { srSinceLr: 2 } } });
  a.system.hp.value = 1;
  a.system.hp.temp = 5;
  const p = restPlan(a, "long", { now: 100 });
  assert.equal(p.update["system.hp.value"], Math.min(a.system.hp.max, 1 + Math.floor(a.system.hp.max / 2)));
  assert.equal(p.update["system.hp.temp"], 0);
  assert.deepEqual(p.update["flags.n5e.rest"], { srSinceLr: 0, lrSinceFr: 1, lastLr: 100 });
});

test("Full Rest restores everything; no-benefit rest only advances counters", () => {
  const a = scout();
  a.system.hp.value = 1;
  const full = restPlan(a, "full");
  assert.equal(full.update["system.hp.value"], a.system.hp.max);
  assert.equal(full.update["system.hitDice.spent"], 0);
  const none = restPlan(a, "long", { benefit: false });
  assert.deepEqual(Object.keys(none.update), ["flags.n5e.rest"]);
});
