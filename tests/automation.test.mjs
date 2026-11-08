/**
 * Automation pass (0.7.1): stance Unarmed dice, stance strikes and effects, feature cast options,
 * feature choices, proficiency grants, Reinforced, recovery requirements, turn-based expiry.
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { makeActor, baseAbilities, load } from "./helpers/actor.mjs";
import { unarmedSpec, stepDie, resolveFormula } from "../module/rules/unarmed.mjs";
import { attacksPerAction, featureCritRange, recoveryAllowed } from "../module/rules/features.mjs";
import { availableCastOptions, applyCastOptions, halveDice, pyroclasmGain } from "../module/rules/cast-options.mjs";
import { expiringEffects } from "../module/rules/trackers.mjs";
import { activityButtons } from "../module/workflow/activity-buttons.mjs";
import { castPlan } from "../module/workflow/cast-plan.mjs";

const settings = {};
globalThis.game = { settings: { get: (s, k) => settings[k] } };
afterEach(() => { for ( const k of Object.keys(settings) ) delete settings[k]; });

const withStance = (stanceName, extra = []) => {
  const st = load("stances", stanceName);
  const a = makeActor({ system: structuredClone(baseAbilities), items: [load("classes", "scout-nin"), st, ...extra] });
  a.system.combat.activeStance = a.items.find(i => i.type === "stance").id;
  return a;
};

test("level-scaled formulas and die steps", () => {
  const a = { system: { level: 11 } };
  assert.equal(resolveFormula("lvl(1:1d8,5:2d8,11:3d8)", a), "3d8");
  assert.equal(resolveFormula("lvl(3:1,11:2,19:3) + @level", a), "2 + 11");
  assert.equal(stepDie("1d6", 1), "1d8");
  assert.equal(stepDie("1d8", -1), "1d6");
  assert.equal(stepDie("1", 1), "1d4");
  assert.equal(halveDice("5d10"), "3d10");
});

test("stance Unarmed dice: Taijutsu d6, Serpent piercing, Silent Killing slashing, Iron Fist d8 with bracers", () => {
  assert.equal(unarmedSpec(withStance("wolf-fist")).die, "1d6");
  assert.equal(unarmedSpec(withStance("serpent-fist")).type, "piercing");
  const sk = unarmedSpec(withStance("silent-killing"));
  assert.deepEqual([sk.die, sk.type], ["1d6", "slashing"]);
  assert.equal(unarmedSpec(withStance("blade-stance")).die, "1", "Bukijutsu stance leaves Unarmed alone");
  const bracers = { name: "Combat Bracers", type: "weapon", system: { equipped: true } };
  const iron = withStance("iron-fist", [bracers]);
  // Iron Fist d8 needs Strength as the Taijutsu ability too.
  const expected = iron.system.disciplines.tai.ability === "str" ? "1d8" : "1d6";
  assert.equal(unarmedSpec(iron).die, expected);
});

test("stances carry their strikes and effects", () => {
  const wolf = load("stances", "wolf-fist").system.activities[0];
  assert.deepEqual([wolf.label, wolf.strike.dieSteps, wolf.strike.attacks], ["Wolf Fang Fist", 1, "lvl(1:2,10:3)"]);
  const rabbit = load("stances", "rabbit-fist");
  assert.equal(rabbit.effects[0].changes[0].key, "system.bonuses.speed");
  const a = withStance("iron-fist");
  const html = activityButtons(a, a.items.find(i => i.type === "stance"), a.items.find(i => i.type === "stance").system.activities);
  assert.equal(a.system.level, 1);
  assert.doesNotMatch(html, /Bone Breaking/, "5th-level strike hidden at level 1");
  const flail = withStance("flailing");
  const fh = activityButtons(flail, flail.items.find(i => i.type === "stance"), flail.items.find(i => i.type === "stance").system.activities);
  assert.match(fh, /data-n5e-act="strike"/);
  assert.match(fh, /data-n5e-act="effect"/);
  assert.match(fh, /DC \d+ Dexterity save/);
});

test("Titan Fist: Reinforced = Taijutsu modifier without armor", () => {
  const a = makeActor({ system: structuredClone(baseAbilities), items: [load("classes", "scout-nin")], n5eChanges: [{ key: "n5e.reinforced", value: 2 }] });
  assert.equal(a.system.dr, Math.max(0, a.system.disciplines.tai.mod));
});

test("feat proficiency grants: skill, or Mastery when already proficient", () => {
  const ir = load("feats", "illusionist-research");
  const a = makeActor({ system: structuredClone(baseAbilities), items: [ir] });
  assert.ok(a.system.grants.skills.has("ill"));
  const b = makeActor({ system: { ...structuredClone(baseAbilities), skills: { ill: { proficient: true } } }, items: [ir] });
  assert.ok(b.system.skills.ill.mastery >= 1, "already proficient: Mastery instead");
});

test("Extra Attack, Superior Assault crit with the Primary discipline, Tenketsu-gated recovery", () => {
  const ea = { name: "Extra Attack", type: "feat", system: { identifier: "extra-attack", requirement: { class: "scout-nin" } } };
  assert.equal(attacksPerAction(makeActor({ items: [ea] })).base, 2);
  assert.equal(attacksPerAction(makeActor({ items: [ea] })).implements, 3, "Scout-Nin: three with Kunai");
  const taiEa = { name: "Extra Attack", type: "feat", system: { identifier: "extra-attack", requirement: { class: "taijutsu-specialist" } } };
  assert.equal(attacksPerAction(makeActor({ items: [taiEa] })).implements, 2, "other classes: two");
  const sh = { name: "Switch Hitter", type: "feat", system: { identifier: "switch-hitter" }, flags: { n5e: { choice: { value: "tai" } } } };
  const sa = { name: "Superior Assault", type: "feat", system: { identifier: "superior-assault" } };
  const a = makeActor({ items: [sh, sa] });
  assert.deepEqual(featureCritRange(a), { tai: 1 });
  assert.equal(a.system.critRange.tai, 1);
  const ns = load("classes", "ninjutsu-specialist");
  const sr = ns.system.resourcePools[0].recovery.find(r => r.on === "sr");
  assert.equal(sr.requires, "tenketsu-refinement");
  assert.equal(recoveryAllowed(makeActor(), sr), false);
});

test("cast options: Chakra Compression, Crash, Warfare, Hellrend, Pyroclasm gain", () => {
  const whip = load("jutsu", "flame-whip");
  const cls = load("classes", "ninjutsu-specialist");
  cls.system.levels = 3;
  const items = [cls, load("classes", "blaze-walker"), whip,
    load("features", "chakra-compression"), load("features", "chakra-surge"), load("features", "pyroclasm")];
  const a = makeActor({ system: structuredClone(baseAbilities), items });
  a.system.cp.value = 50;
  const j = a.items.find(i => i.type === "jutsu");
  const now = { round: 1, turn: 0 };
  const avail = availableCastOptions(a, j, [], now);
  const labels = avail.map(o => o.label);
  assert.ok(labels.includes("Chakra Compression (cost −rank)"));
  assert.ok(!labels.includes("Crash: bonus damage"), "needs the Crash state");
  assert.ok(labels.includes("Hellrend (Pyroclasm)"));
  const base = castPlan(a, j, { featureOptions: [], now }).cost;
  const cc = avail.find(o => o.label.startsWith("Chakra Compression"));
  const compressed = castPlan(a, j, { featureOptions: [{ id: cc.id }], now });
  assert.equal(compressed.cost, Math.max(0, base - 1), "D-Rank: −1");
  assert.ok(compressed.update[`flags.n5e.optionTurn.${cc.id}`], "once per turn");
  // Crash: the state turns on its damage option (auto) and stops cost reduction.
  a.effects.push({ id: "crash", type: "generic", disabled: false, flags: { n5e: { state: "crash" } } });
  const crashOpts = availableCastOptions(a, j, [], now);
  const crash = crashOpts.find(o => o.label === "Crash: bonus damage");
  assert.ok(crash?.auto);
  const plan = castPlan(a, j, { featureOptions: [{ id: cc.id }, { id: crash.id }], now });
  assert.equal(plan.cost, base, "Crash: no cost reduction");
  assert.equal(plan.extraDamage[0].formula, "1d10");
  const hell = crashOpts.find(o => o.label.startsWith("Hellrend"));
  a.system.resources.pyroclasm.value = 2;
  const fx = applyCastOptions(a, j, [{ id: hell.id, amount: 2 }], crashOpts, "D");
  assert.equal(fx.pools.pyroclasm, 2);
  assert.equal(fx.effects[0].effect.changes[0].value, "-2*2");
  assert.equal(pyroclasmGain(a, j, now)["system.resources.pyroclasm.value"], 3);
});

test("effects end on the source's turn", () => {
  const placed = { round: 1, turn: 1 };
  const e = at => ({ flags: { n5e: { expires: { at, sourceUuid: "A", placed } } } });
  const all = [e("turnStart"), e("turnEnd"), e("nextTurnEnd")];
  assert.equal(expiringEffects("A", all, "turnStart", { round: 2, turn: 1 }).length, 1);
  assert.equal(expiringEffects("A", all, "turnEnd", placed).length, 1, "nextTurnEnd survives the turn it was placed");
  assert.equal(expiringEffects("A", all, "turnEnd", { round: 2, turn: 1 }).length, 2);
  assert.equal(expiringEffects("B", all, "turnEnd", placed).length, 0);
});
