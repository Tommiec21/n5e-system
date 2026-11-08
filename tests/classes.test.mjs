/**
 * Classes imported 1-5 by the data-driven builder (tools/content/classes_spec.py): Genjutsu
 * Specialist, Hunter-Nin, Medical-Nin, Taijutsu Specialist, Weapon Specialist.
 */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { makeActor, baseAbilities, load } from "./helpers/actor.mjs";
import { advancementSteps, validate } from "../module/advancement/steps.mjs";
import { resourceCost } from "../module/rules/resource-cost.mjs";
import { restPlan } from "../module/rules/rest.mjs";
import { turnStartPlan } from "../module/rules/turn-start.mjs";
import { attacksPerAction } from "../module/rules/features.mjs";

const settings = {};
globalThis.game = { settings: { get: (s, k) => settings[k] } };
afterEach(() => { for ( const k of Object.keys(settings) ) delete settings[k]; });

const CLASSES = ["genjutsu-specialist", "hunter-nin", "medical-nin", "taijutsu-specialist", "weapon-specialist"];
const withClass = (ident, level, features = []) => {
  const cls = load("classes", ident);
  cls.system.levels = level;
  return makeActor({ system: structuredClone(baseAbilities), items: [cls, ...features.map(f => load("features", f))] });
};

test("each class: book dice, proficiencies, advancement only up to 5th, subclasses with features", () => {
  const dice = { "genjutsu-specialist": ["d6", "d12"], "hunter-nin": ["d10", "d8"], "medical-nin": ["d8", "d10"],
    "taijutsu-specialist": ["d12", "d6"], "weapon-specialist": ["d10", "d8"] };
  for ( const ident of CLASSES ) {
    const c = load("classes", ident);
    assert.deepEqual([c.system.hitDie, c.system.chakraDie], dice[ident], ident);
    assert.equal(c.system.saves.length, 3, `${ident} saves`);
    assert.ok(c.system.advancement.every(a => a.level <= 5), `${ident}: nothing above 5th`);
    assert.ok(c.system.advancement.some(a => a.level === 1 && a.type === "feature"), `${ident}: 1st-level features`);
    assert.ok(c.system.subclasses.length >= 5, `${ident}: subclasses`);
    assert.equal(c.system.jutsuKnown[0], 6, `${ident}: 6 jutsu at 1st`);
  }
  assert.equal(load("classes", "taijutsu-specialist")._id, "n5eTaiSpecClass1", "keeps the Phase 1 sample's id");
});

test("option counts follow the class table", () => {
  const counts = (ident, key) => load("classes", ident).system.advancement.filter(a => a.key === key).map(a => [a.level, a.count]);
  assert.deepEqual(counts("genjutsu-specialist", "gen-mirage"), [[2, 2], [4, 1]]);
  assert.deepEqual(counts("hunter-nin", "hunter-exploit"), [[2, 2], [5, 1]]);
  assert.deepEqual(counts("taijutsu-specialist", "tai-technique"), [[1, 2]]);
  assert.deepEqual(counts("weapon-specialist", "weapon-kata"), [[2, 1], [5, 1]]);
  const mirages = load("classes", "genjutsu-specialist").system.advancement.find(a => a.key === "gen-mirage").uuids.length;
  assert.equal(mirages, 46, "48 Mirages minus the 9th- and 15th-level ones");
});

test("Hunter-Nin 5th-level Mastery is a choice; Lethal Attack dice come from the table", () => {
  const hunter = withClass("hunter-nin", 5);
  const cls = hunter.items.find(i => i.type === "class");
  const steps = advancementSteps(cls, 5, cls.id);
  const m = steps.find(s => s.type === "masteryChoice");
  assert.ok(m);
  assert.deepEqual(validate([m], {}), [`${m.title}: choose 1 more`]);
  assert.equal(hunter.system.grants.scale.hunterNin.lethalAttack, 2, "2d8 at 5th");
  assert.ok(steps.length > 0);
});

test("class pools: Actualization, Domain Charges (by level), Martial Dice (per turn), Discipline (d12)", () => {
  const gen = withClass("genjutsu-specialist", 1, ["actualization"]);
  assert.equal(gen.system.resources.actualizationDice.maxValue, 1 + gen.system.prof);
  const med = withClass("medical-nin", 3, ["medical-domain"]);
  assert.equal(med.system.resources.domainCharges.maxValue, 4);
  const tai = withClass("taijutsu-specialist", 5, ["martial-adept"]);
  assert.equal(tai.system.resources.martialDice.maxValue, 2, "2 Martial Dice at 5th");
  tai.system.resources.martialDice.value = 0;
  const plan = turnStartPlan(tai, {});
  assert.equal(plan.update["system.resources.martialDice.value"], 2, "refilled at turn start");
  const ws = withClass("weapon-specialist", 1, ["discipline-n5e"]);
  assert.equal(ws.system.resources.discipline.die, "d12");
  ws.system.resources.discipline.value = 0;
  assert.equal(restPlan(ws, "short").update["system.resources.discipline.value"], 2, "Short Rest: all back");
});

test("Mental Refocus: Actualization Dice back on a Short Rest only with the feature", () => {
  const without = withClass("genjutsu-specialist", 5, ["actualization"]);
  without.system.resources.actualizationDice.value = 0;
  assert.equal(restPlan(without, "short").update["system.resources.actualizationDice.value"], undefined);
  const withIt = withClass("genjutsu-specialist", 5, ["actualization", "mental-refocus"]);
  withIt.system.resources.actualizationDice.value = 0;
  assert.equal(restPlan(withIt, "short").update["system.resources.actualizationDice.value"], 2, "2 at 5th");
});

test("option costs: Martial Techniques, Katas (only when they spend), Skilled Exploits", () => {
  assert.deepEqual(resourceCost(load("features", "arresting-technique")), { pool: "martialDice", amount: 1, uses: false });
  assert.equal(resourceCost(load("features", "quivering-strike")).amount, 5);
  assert.equal(resourceCost(load("features", "disciplined-illusions")).pool, null, "gains Discipline, costs nothing");
  assert.equal(resourceCost(load("features", "efficient-bukijutsu")).pool, "discipline");
  assert.equal(resourceCost(load("features", "aim")).pool, "skilledExploits");
  assert.equal(resourceCost(load("features", "battle-cry")).pool, null, "Combat Exploits forgo Lethal Attack dice instead");
});

test("Taijutsu and Weapon Specialist Extra Attack: two attacks (Kunai third is Scout-Nin only)", () => {
  const taiEa = { name: "Extra Attack", type: "feat", system: { identifier: "extra-attack", requirement: { class: "taijutsu-specialist" } } };
  const r = attacksPerAction(makeActor({ items: [load("classes", "taijutsu-specialist"), taiEa] }));
  assert.equal(r.base, 2);
  assert.equal(r.implements, 2);
});
