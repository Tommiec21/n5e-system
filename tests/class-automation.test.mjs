/**
 * Class-feature automation (0.8.1): Genjutsu Specialist, Hunter-Nin, Medical-Nin, Taijutsu Specialist
 * and Weapon Specialist features carry activities, pools, cast options and effects; Skilled Exploits
 * get a check button for their skill.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeActor, baseAbilities, load } from "./helpers/actor.mjs";
import { activityButtons } from "../module/workflow/activity-buttons.mjs";

globalThis.game = { settings: { get: () => undefined } };

const render = (feature, cls = "hunter-nin") => {
  const item = load("features", feature);
  const a = makeActor({ system: structuredClone(baseAbilities), items: [load("classes", cls), item] });
  const owned = a.items.find(i => i.name === item.name);
  return activityButtons(a, owned, owned.system.activities);
};

test("Skilled Exploits get a check button with the text's activation", () => {
  const aim = load("features", "aim-n5e").system.activities;
  assert.equal(aim.length, 1);
  assert.deepEqual([aim[0].type, aim[0].check.skill, aim[0].activation], ["check", "prc", "bonus"]);
  assert.match(render("aim-n5e"), /data-n5e-act="check"/);
});

test("counter pools: Carnage starts empty and has gain and spend buttons", () => {
  const c = load("features", "carnage-n5e").system;
  const pool = c.resourcePools.find(p => p.id === "carnage");
  assert.deepEqual([pool.max, pool.value, pool.recovery[0].on], ["3", 0, "event"]);
  assert.ok(c.activities.some(x => x.cost.gain));
  assert.ok(c.activities.some(x => x.cost.pool === "carnage" && !x.cost.gain));
});

test("Rending Thoughts: a Wisdom save on the Genjutsu DC plus one damage button per tier", () => {
  const acts = load("features", "rending-thoughts").system.activities;
  assert.deepEqual([acts[0].save.abilities[0], acts[0].save.dc.source], ["wis", "gen"]);
  assert.deepEqual(acts.slice(1).map(x => x.damage.parts[0].formula), ["1d6", "2d6", "3d6"]);
});

test("cast options: Channeled Healing (medical healing, once per turn) and Tyrant (Taijutsu stance)", () => {
  const ch = load("features", "channeled-healing").flags.n5e.castOption;
  assert.deepEqual(ch.appliesTo, { keywords: ["medical"], requiresHealing: true });
  assert.equal(ch.heal.formula, "@scale.medicalNin.channeledHealing");
  assert.ok(ch.oncePerTurn && ch.auto);
  const ty = load("features", "path-of-the-tyrant").flags.n5e.castOption;
  assert.equal(ty.appliesTo.stance, "taijutsu");
  assert.equal(ty.damage.formula, "lvl(1:2,11:4)");
});

test("transfer effects: Critical Focus widens the Bukijutsu crit range; Demon Sight grants darkvision", () => {
  const cf = load("features", "critical-focus").effects[0].changes[0];
  assert.deepEqual([cf.key, cf.value], ["n5e.critRange.buki", "1"]);
  const ds = load("features", "demon-sight").effects[0].changes[0];
  assert.deepEqual([ds.key, ds.value, ds.mode], ["system.traits.senses.darkvision", "120", 4]);
});

test("amplification states: Reality Shift spends an Actualization Die for 1 minute", () => {
  const rs = load("features", "alteration-of-reality").system.activities[0];
  assert.deepEqual([rs.type, rs.effect.state, rs.effect.ampType, rs.effect.seconds], ["effect", "realityShift", "will", 60]);
  assert.deepEqual(rs.cost, { pool: "actualizationDice", amount: 1 });
});
