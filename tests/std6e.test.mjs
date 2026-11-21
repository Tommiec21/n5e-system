/** STD6e: clans as data (docs/STD6e_SPEC.md). E1 Land of Earth: Bakuton, Futton, Shí Hóu, Yoton. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { clanTables, clanItems } from "../tools/content/apply-automation.mjs";
import { highestDiscipline } from "../module/workflow/activity-buttons.mjs";
import { summonerData, summonerDelta } from "../module/rules/summoner-links.mjs";
import { effectiveActivities } from "../module/rules/activity-parse.mjs";
import { load } from "./helpers/actor.mjs";

/** A clan item by its identifier. */
const item = (clan, id) => clanItems(clan).get(id).doc;

test("E1 clan tables: every Land of Earth clan item has an entry and is marked reviewed", () => {
  const tables = Object.fromEntries(clanTables().map(t => [t.clan, t]));
  for ( const clan of ["bakuton", "futton", "shi-hou", "yoton"] ) {
    const items = clanItems(clan);
    assert.ok(items.size > 10, clan);
    for ( const [id, { doc }] of items ) {
      assert.ok(tables[clan].features[id], `${clan} ${id}`);
      assert.equal(doc.flags.n5e.reviewed, true, id);
    }
  }
});

test("'your highest jutsu save DC' and attack bonus: the best casting discipline", () => {
  const actor = { system: { disciplines: { nin: { dc: 14, attack: 6 }, tai: { dc: 16, attack: 5 }, gen: { dc: 12, attack: 7 } } } };
  assert.deepEqual(highestDiscipline(actor, "dc"), { key: "tai", value: 16 });
  assert.deepEqual(highestDiscipline(actor, "attack"), { key: "gen", value: 7 });
  const prime = item("bakuton", "bakuton-priming-cataclysm").system.activities.find(a => a.type === "save");
  assert.equal(prime.save.dc.source, "highest");
});

test("Hijutsu upcasts: each higher rank's buttons carry the extra dice", () => {
  const soot = item("bakuton", "bakuton-explosion-release-soot-pile");
  const at = r => effectiveActivities(soot, { rank: r }).find(a => a.label === "Soot Pile: failure").damage.parts[0].formula;
  assert.equal(at(""), "3d6");
  assert.equal(at("C"), "(3d6) + (1d6)");
  assert.equal(at("S"), "(3d6) + (4d6)");
  const stream = effectiveActivities(item("yoton", "yoton-lava-release-lava-stream"), { rank: "B" })[0].damage.parts.map(p => p.formula);
  assert.deepEqual(stream, ["(1d10) + (2d10)", "(1d10) + (2d10)"], "both damage types grow");
});

test("Clay constructs: summoned with your Ninjutsu numbers and hit points by the cast rank", () => {
  const spider = load("summons", "clay-spider-");
  const linked = rank => summonerDelta(spider.flags.n5e.fromSummoner, summonerData({ prof: 3, level: 5, disciplines: { nin: { dc: 15, attack: 7 } } }, { rank }));
  assert.equal(linked("D").hpMax, 10);
  assert.equal(linked("B").hpMax, 20);
  assert.equal(linked("S").hpMax, 40);
  assert.equal(linked("D").attributes.ac.flat, 10 + 4, "10 + your Ninjutsu modifier");
  const uuid = item("bakuton", "bakuton-explosion-release-clay-spiders").system.activities[0].summon.uuid;
  assert.equal(uuid, `Compendium.n5e.summons.Actor.${spider._id}`);
});

test("Clan stances and pools: Ballistic Knuckle's 2d8 force; Primes, Pressure and Inner Chi", () => {
  const knuckle = item("bakuton", "bakuton-stance-ballistic-knuckle");
  assert.deepEqual([knuckle.system.unarmedDie, knuckle.system.unarmedType], ["2d8", "force"]);
  assert.equal(item("bakuton", "bakuton-priming-cataclysm").system.resourcePools[0].max, "lvl(3:4,7:5,15:6)");
  assert.equal(item("futton", "futton-broiling-rampart").system.resourcePools[0].id, "pressure");
  assert.equal(item("shi-hou", "shi-hou-inner-chi").system.resourcePools[0].max, "1 + @prof");
});
