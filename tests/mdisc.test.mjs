/** MDISC1: multi-discipline casting (King 2026-11-13, N5e-Context decisions 11, 14, 15). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeActor, baseAbilities } from "./helpers/actor.mjs";
import { castPlan } from "../module/workflow/cast-plan.mjs";
import { activityButtons } from "../module/workflow/activity-buttons.mjs";
import { learnableJutsu } from "../module/advancement/steps.mjs";
import { castableDisciplines, castDisciplineOf, resolveCastDiscipline, countsAsDiscipline, knowsJutsuOf, sameTypeForSwap,
  disciplineAllowed, defenseSkillFor, genjutsuRidersApply, caughtBy } from "../module/rules/cast-discipline.mjs";
import N5E from "../module/config/index.mjs";

const ID = "mdisc00000000001";
// A B-Rank Ninjutsu + Genjutsu concentration jutsu (requirement 16).
const dual = () => ({ _id: ID, name: "Twin Mist", type: "jutsu", system: { discipline: "nin", disciplines: ["nin", "gen"], rank: "B",
  keywords: ["ninjutsu", "genjutsu"], cost: { mode: "chakra", value: 6 }, duration: { unit: "minute", value: 1, concentration: true },
  description: "<p>Make a ranged jutsu attack. On a hit, the target takes 2d6 psychic damage.</p>" } });
const abilities = { ...baseAbilities.abilities, int: { value: 16 }, wis: { value: 12 } };
function actor({ flags = {}, concentrating = [], items = [] } = {}) {
  const a = makeActor({ system: { abilities, combat: { concentrating } }, items: [dual(), ...items], flags });
  a.system.cp.value = 50;
  a.system.grants.maxRank = "S"; // a level-1 test actor caps at D; the B-Rank requirement is what's tested
  for ( const i of a.items ) i.system.prepareActorDerived?.(a);
  return a;
}
const jutsuOf = a => a.items.find(i => i.id === ID);

test("live numbers per discipline; the ability requirement follows the cast discipline", () => {
  const a = actor();
  const j = jutsuOf(a);
  assert.deepEqual(Object.keys(j.system.liveByDiscipline).sort(), ["gen", "nin"]);
  assert.equal(j.system.liveAs("nin").ability, "int");
  assert.equal(j.system.liveAs("gen").ability, "wis");
  assert.equal(j.system.liveAs("nin").meetsRequirement, true, "Int 16");
  assert.equal(j.system.liveAs("gen").meetsRequirement, false, "Wis 12 < 16");
  assert.ok(castPlan(a, j, { discipline: "nin" }).ok);
  const asGen = castPlan(a, j, { discipline: "gen" });
  assert.ok(asGen.problems.some(p => /WIS 16/.test(p)), asGen.problems.join());
  assert.match(castPlan(a, j, { discipline: "tai" }).problems.join(), /can't be cast as tai/);
});

test("the cast discipline is locked while concentrating, and drives Moldings and the Gates", () => {
  const a = actor();
  const plan = castPlan(a, jutsuOf(a), { discipline: "nin" });
  assert.equal(plan.discipline, "nin");
  assert.equal(plan.update[`flags.n5e.castDiscipline.${ID}`], "nin");
  const locked = actor({ flags: { castDiscipline: { [ID]: "gen" } }, concentrating: [ID] });
  assert.equal(castDisciplineOf(locked, jutsuOf(locked)), "gen");
  assert.equal(resolveCastDiscipline(locked, jutsuOf(locked), ""), "gen");
  assert.throws(() => resolveCastDiscipline(locked, jutsuOf(locked), "nin"), /stays gen/);
  assert.match(castPlan(locked, jutsuOf(locked), { discipline: "nin" }).problems.join(), /stays gen/);
  const free = actor({ flags: { castDiscipline: { [ID]: "gen" } } });
  assert.equal(castDisciplineOf(free, jutsuOf(free)), "nin", "no longer concentrating: the lock is gone");
});

test("card buttons: attack bonus and Genjutsu damage follow the cast discipline", () => {
  const a = actor();
  const j = jutsuOf(a);
  const acts = [{ type: "attack", attack: { kind: "ranged" }, damage: { parts: [{ formula: "2d6", type: "psychic" }] } }];
  const asNin = activityButtons(a, j, acts, { discipline: "nin" });
  const asGen = activityButtons(a, j, acts, { discipline: "gen" });
  assert.match(asNin, new RegExp(`data-bonus="${j.system.liveAs("nin").attack}"`));
  assert.match(asGen, new RegExp(`data-bonus="${j.system.liveAs("gen").attack}"`));
  assert.doesNotMatch(asNin, /data-gen="1"/, "cast as Ninjutsu: psychic damage doesn't ignore DR");
  assert.match(asGen, /data-gen="1"/);
});

test("known lists, swaps, learning limits and defenses", () => {
  const twin = dual();
  const buki = { type: "jutsu", system: { discipline: "tai", disciplines: ["tai"], keywords: ["bukijutsu"] } };
  assert.deepEqual(castableDisciplines(twin), ["nin", "gen"]);
  assert.ok(countsAsDiscipline(twin, "gen") && countsAsDiscipline(twin, "nin") && !countsAsDiscipline(twin, "tai"));
  assert.ok(countsAsDiscipline(buki, "buki") && countsAsDiscipline(buki, "tai"));
  const a = actor();
  assert.ok(knowsJutsuOf(a, { disciplines: ["gen"], keyword: "genjutsu" }));
  assert.ok(!knowsJutsuOf(a, { disciplines: ["tai"] }));
  assert.ok(sameTypeForSwap(twin, { system: { discipline: "gen" } }), "swap for either discipline");
  assert.ok(!sameTypeForSwap(twin, buki));
  assert.ok(disciplineAllowed(twin, ["gen"]) && disciplineAllowed(twin, []) && !disciplineAllowed(twin, ["tai"]));
  const learnable = learnableJutsu([{ name: "Twin Mist", system: twin.system }, { name: "Strike", system: buki.system }],
    { maxRank: "S", affinities: new Set(), known: new Set(), keywords: {}, allowedDisciplines: ["gen"] });
  assert.deepEqual(learnable.map(j => j.name), ["Twin Mist"]);
  assert.deepEqual(["nin", "tai", "gen", "buki"].map(d => defenseSkillFor(d, N5E.skills)), ["nin", "mar", "ill", "mar"]);
  assert.ok(genjutsuRidersApply("gen") && !genjutsuRidersApply("nin"));
  assert.ok(caughtBy(twin, ["gen"]) && !caughtBy(twin, ["tai"]));
});
