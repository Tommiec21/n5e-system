/**
 * Phase 5: condition lifecycle (turn damage, turn-end decay/endings, durations, removal, resistance).
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { makeActor, baseAbilities } from "./helpers/actor.mjs";
import { conditionTurnStart, conditionTurnEnd, defaultDuration, removalOptions, removalResult, resistsAny }
  from "../module/rules/condition-lifecycle.mjs";

const settings = {};
globalThis.game = { settings: { get: (s, k) => settings[k] } };
afterEach(() => { for ( const k of Object.keys(settings) ) delete settings[k]; });

const withConds = (conditions, system = {}) => makeActor({ system: { ...structuredClone(baseAbilities), ...system }, conditions });

test("Burned and Bleed roll per rank at turn start; toggle turns it off", () => {
  const a = withConds([{ key: "burned", ranks: 3 }, { key: "bleed", ranks: 2 }, { key: "shaken", ranks: 1 }]);
  const hits = conditionTurnStart(a);
  assert.deepEqual(hits.map(h => [h.key, h.formula, h.type]), [["burned", "3d8", "fire"], ["bleed", "2d6", "necrotic"]]);
  settings.conditionTurnDamage = false;
  assert.equal(conditionTurnStart(a).length, 0);
});

test("turn end: decay one rank, end next-turn conditions, skip ones gained this turn", () => {
  const a = withConds([{ key: "shaken", ranks: 2 }, { key: "shocked", ranks: 1 }, { key: "dazed" }, { key: "staggered" }]);
  a.effects.find(e => e.system.key === "staggered").duration = { startRound: 2, startTurn: 1 };
  const r = conditionTurnEnd(a, { now: { round: 2, turn: 1 } });
  assert.deepEqual(r.decay.map(d => d.key), ["shaken"]);
  assert.deepEqual(r.end.map(e => e.key).sort(), ["dazed", "shocked"]);
  settings.conditionDecay = false;
  const off = conditionTurnEnd(a, { now: { round: 2, turn: 1 } });
  assert.equal(off.decay.length + off.end.length, 0);
});

test("1-minute default only for conditions that don't persist or end on their own", () => {
  assert.deepEqual(defaultDuration("burned"), { seconds: 60, rounds: 10 });
  assert.equal(defaultDuration("bleed"), null, "[Persists]");
  assert.equal(defaultDuration("dazed"), null, "ends at turn end");
  const a = withConds([{ key: "burned", ranks: 1 }, { key: "bleed", ranks: 1 }]);
  const r = conditionTurnEnd(a, { isExpired: () => true });
  assert.deepEqual(r.end.map(e => e.key), ["burned"]);
});

test("removal: DC, Bleed extra ranks per 2 over, Sealed DC rises on failure", () => {
  const a = withConds([{ key: "bleed", ranks: 4 }, { key: "sealed", ranks: 2 }]);
  const bleed = a.effects.find(e => e.system.key === "bleed");
  const [opt] = removalOptions(bleed);
  assert.equal(opt.dc, 20);
  assert.equal(opt.checks[0].type, "skill");
  assert.deepEqual(removalResult(opt, 24, 4), { success: true, ranks: 3, raiseDC: 0 });
  assert.equal(removalResult(opt, 26, 4).ranks, "all");
  const sealed = a.effects.find(e => e.system.key === "sealed");
  const [sOpt] = removalOptions(sealed);
  assert.equal(removalResult(sOpt, 10, 2).raiseDC, 4);
  sealed.flags = { n5e: { removalDC: 4 } };
  assert.equal(removalOptions(sealed)[0].dc, 24);
});

test("condition resistance gives advantage on the save", () => {
  const a = withConds([], { traits: { conditionResist: ["burned"] } });
  assert.equal(resistsAny(a, ["burned"]), true);
  assert.equal(resistsAny(a, ["bleed"]), false);
  settings.conditionResistance = false;
  assert.equal(resistsAny(a, ["burned"]), false);
});
