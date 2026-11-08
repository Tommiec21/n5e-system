/**
 * Phase 6: Stamina, Chilled, Fury, Marks/Branded/Amps, 8-Inner Gates, resaves, party overview.
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { makeActor, baseAbilities, load } from "./helpers/actor.mjs";
import {
  usesStamina, chilledMove, furyMax, gainFury, furyTurnEnd, bindingFuryTrigger, jutsuTrackers, trackerEffectData,
  marksToExpire, ampsToDisable, gateLimit, gateChanges, nextGate, closeGatesPlan, hasResave, resavesDue
} from "../module/rules/trackers.mjs";
import { resourceCost } from "../module/rules/resource-cost.mjs";
import { parseActivities } from "../module/rules/activity-parse.mjs";
import { partyRowVM } from "../module/view-models/party.mjs";
import { parseN5eChanges } from "../module/rules/change-keys.mjs";

const settings = {};
globalThis.game = { settings: { get: (s, k) => settings[k] } };
afterEach(() => { for ( const k of Object.keys(settings) ) delete settings[k]; });

const feat = (per, name = "Test Feat") => ({ name, type: "feat", system: { uses: { max: "2", per } } });
const char = (o = {}) => makeActor({ system: structuredClone(baseAbilities), items: [load("classes", "scout-nin"), ...(o.items ?? [])], ...o });

test("Stamina: off by default; on = pool of proficiency bonus that rest-based feat uses draw from", () => {
  const off = char({ items: [feat("lr")] });
  assert.equal(off.system.resources.stamina, undefined);
  assert.equal(resourceCost(off.items.find(i => i.type === "feat")).uses, true);
  settings.stamina = true;
  const a = char({ items: [feat("lr"), feat("turn", "Per Turn")] });
  assert.equal(a.system.resources.stamina.maxValue, a.system.prof);
  assert.equal(a.system.resources.stamina.value, a.system.prof, "starts full");
  const [lr, turn] = a.items.filter(i => i.type === "feat");
  assert.equal(usesStamina(lr), true);
  assert.deepEqual(resourceCost(lr), { pool: "stamina", amount: 1, uses: false });
  assert.equal(usesStamina(turn), false, "per-turn uses keep their own count");
});

test("Chilled: more than 5 ft of willing movement, once per turn, 1d10 cold per rank", () => {
  const a = makeActor({ system: structuredClone(baseAbilities), conditions: [{ key: "chilled", ranks: 2 }] });
  const now = { round: 1, turn: 0 };
  let r = chilledMove(a, { feet: 5, now });
  assert.equal(r.hit, null);
  a.flags.n5e.chilledMove = r.state;
  r = chilledMove(a, { feet: 5, now });
  assert.equal(r.hit.formula, "2d10");
  a.flags.n5e.chilledMove = r.state;
  assert.equal(chilledMove(a, { feet: 30, now }).hit, null, "once per turn");
  assert.notEqual(chilledMove(a, { feet: 30, now: { round: 2, turn: 0 } }).hit, null, "new turn");
  assert.equal(chilledMove(a, { feet: 30, willing: false, now: { round: 3, turn: 0 } }).hit, null, "forced movement");
});

test("Fury: single state, lasts until the end of the turn after gaining it; n5e.fury.max stacks it", () => {
  const a = char();
  assert.equal(furyMax(a), 1);
  const g = gainFury(a, { round: 1, turn: 0 }, 3);
  assert.equal(g["system.combat.fury"], 1);
  a.system.combat.fury = 1;
  a.flags.n5e.furyGained = { round: 1, turn: 0 };
  assert.equal(furyTurnEnd(a, { round: 1, turn: 0 }), null, "same turn: keeps it");
  assert.equal(furyTurnEnd(a, { round: 2, turn: 0 })["system.combat.fury"], 0);
  assert.equal(parseN5eChanges([{ key: "n5e.fury.max", value: 2 }]).furyMax, 2);
});

test("Binding Fury Stance grants Fury once per turn on weapon damage", () => {
  const a = char({ items: [{ _id: "stance000000001", name: "Binding Fury Stance", type: "stance", system: {} }] });
  assert.equal(bindingFuryTrigger(a, { round: 1, turn: 0 }), null, "stance not active");
  a.system.combat.activeStance = "stance000000001";
  const u = bindingFuryTrigger(a, { round: 1, turn: 0 });
  assert.equal(u["system.combat.fury"], 1);
  a.flags.n5e.furyTurnGain = { round: 1, turn: 0 };
  assert.equal(bindingFuryTrigger(a, { round: 1, turn: 0 }), null);
});

test("Marks, Branded and Amps are read from jutsu; Marks expire at the end of the marker's next turn", () => {
  const t = jutsuTrackers({ name: "Apollo's Ammo", system: { description: "<p>...</p>" } });
  assert.equal(t.mark.label, "Apollo");
  const b = jutsuTrackers({ name: "Punishment", system: { description: "<p>the target is Branded until...</p>" } });
  assert.equal(b.branded.label, "Branded (Punishment)");
  const amp = jutsuTrackers({ name: "Iron Skin", system: { description: "<p>You gain a Fortitude Amp: +2 AC.</p>" } });
  assert.equal(amp.amp.ampType, "fortitude");
  const placed = { round: 1, turn: 2 };
  const e = { ...trackerEffectData("mark", t.mark, { sourceUuid: "A", sourceName: "Ren", now: placed }) };
  assert.equal(marksToExpire("A", [e], placed).length, 0, "placed this turn");
  assert.equal(marksToExpire("A", [e], { round: 2, turn: 2 }).length, 1);
  assert.equal(marksToExpire("B", [e], { round: 2, turn: 2 }).length, 0, "only the marker's");
});

test("Amp limits: Singleton per type, Rule of 3's overall", () => {
  const amps = [{ id: 1, system: { ampType: "battle" } }, { id: 2, system: { ampType: "will" } }, { id: 3, system: { ampType: "battle" } }];
  assert.deepEqual(ampsToDisable(amps, "battle", "singleton").map(a => a.id), [1, 3]);
  assert.deepEqual(ampsToDisable(amps, "reflex", "ruleOfThree").map(a => a.id), [1]);
  assert.equal(ampsToDisable(amps, "battle", "none").length, 0);
});

test("8-Inner Gates: access by takes, cumulative bonuses, Exhaustion on closing", () => {
  const gates = { name: "8-Inner Gates: Seimon", type: "feat", system: {} };
  assert.equal(gateLimit(char()), 0);
  const a = char({ items: [gates] });
  assert.equal(gateLimit(a), 3);
  assert.equal(nextGate(a, 0).ok, true);
  assert.equal(nextGate(a, 3).ok, false);
  const ch = gateChanges(3);
  assert.equal(ch.filter(c => c.key === "n5e.attack.tai").length, 1);
  assert.equal(ch.filter(c => c.key === "system.bonuses.speed").length, 2);
  assert.ok(ch.some(c => c.key === "n5e.unarmed.dice" && c.value === "1d8"));
  assert.equal(gateChanges(8).find(c => c.key === "n5e.pierce").value, "12", "highest gate's Pierce");
  assert.deepEqual(closeGatesPlan(3), { exhaustion: 2, bruised: false, death: false, shortRestRecovery: false });
  assert.equal(closeGatesPlan(7).bruised, true);
  assert.equal(closeGatesPlan(8).death, true);
  a.flags.n5e.gates = { cooldownUntil: 1000 };
  assert.equal(nextGate(a, 0, { worldTime: 500 }).ok, false, "10-minute cooldown");
});

test("Unarmed dice from gates join the Unarmed formula", async () => {
  const { unarmedFormula } = await import("../module/rules/activity-parse.mjs");
  const a = char({ n5eChanges: [{ key: "n5e.unarmed.dice", value: "1d8" }] });
  assert.match(unarmedFormula(a), /^1 \+ 1d8/);
});

test("resaves: read from the save text, stored on the effect, due at the end of later turns", () => {
  assert.equal(hasResave("The target can repeat the saving throw at the end of each of its turns, ending the effect on a success."), true);
  assert.equal(hasResave("At the end of each of its turns, the target makes a Wisdom saving throw."), true);
  assert.equal(hasResave("The target takes 2d6 fire damage."), false);
  const acts = parseActivities("<p>Each creature must make a Wisdom saving throw or become Dazed. It can repeat the saving throw at the end of each of its turns.</p>", { discipline: "gen" });
  assert.equal(acts.find(x => x.type === "save").save.resave, true);
  const a = makeActor({ system: structuredClone(baseAbilities), conditions: [{ key: "dazed" }] });
  a.effects[0].flags = { n5e: { resave: { ability: "wis", dc: 14, label: "X", applied: { round: 1, turn: 0 } } } };
  assert.equal(resavesDue(a, { round: 1, turn: 0 }).length, 0);
  assert.equal(resavesDue(a, { round: 2, turn: 0 })[0].dc, 14);
});

test("party overview row: pools, conditions, concentration, badges", () => {
  const a = makeActor({ system: structuredClone(baseAbilities), conditions: [{ key: "shaken", ranks: 2 }] });
  a.system.combat.fury = 1;
  const row = partyRowVM(a);
  assert.equal(row.conditions.length, 1);
  assert.ok(row.badges.includes("Fury 1"));
  assert.equal(row.hp.max, a.system.hp.max);
});
