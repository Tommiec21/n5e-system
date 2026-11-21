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

test("E1 and E2 clan tables: every Land of Earth and Land of Wind clan item has an entry and is marked reviewed", () => {
  const tables = Object.fromEntries(clanTables().map(t => [t.clan, t]));
  for ( const clan of ["bakuton", "futton", "shi-hou", "yoton", "fushin", "hanami", "jiton", "konjiki", "shakuton"] ) {
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

test("King Q-E5: Clay Centipede and Chain Reaction Blitz are their own Hijutsu, out of Absolute Death Bombing", () => {
  const items = clanItems("bakuton");
  const centipede = items.get("bakuton-explosion-release-clay-centipede").doc;
  const blitz = items.get("bakuton-explosion-release-chain-reaction-blitz").doc;
  assert.deepEqual([centipede.system.rank, centipede.system.cost.value, blitz.system.rank, blitz.system.cost.value], ["B", 14, "B", 12]);
  assert.equal(centipede.system.activities[0].summon.uuid, `Compendium.n5e.summons.Actor.${load("summons", "clay-centipede-")._id}`);
  assert.equal(blitz.system.activities[0].strike.extraDice, "4d10");
  assert.doesNotMatch(items.get("bakuton-explosion-release-absolute-death-bombing").doc.system.description, /Clay Centipede|Chain Reaction/);
  const clan = load("clans", "clan-378e90e21cd0c9da");
  for ( const d of [centipede, blitz] ) assert.ok(clan.flags.n5e.hijutsuUuids.includes(`Compendium.n5e.clans.Item.${d._id}`));
});

test("King Q-E7: Ballistic Knuckle's Unarmed Damage adds no ability modifier", async () => {
  const { unarmedSpec } = await import("../module/rules/unarmed.mjs");
  const stance = item("bakuton", "bakuton-stance-ballistic-knuckle");
  const actor = { system: { combat: { activeStance: "s1" }, abilities: { str: { mod: 3 }, dex: { mod: 1 } }, modifiers: {}, disciplines: { tai: { ability: "str" } } },
    items: [{ id: "s1", type: "stance", name: stance.name, system: { ...stance.system, categories: new Set(stance.system.categories) } }] };
  const spec = unarmedSpec(actor);
  assert.deepEqual([spec.die, spec.type, spec.mod, spec.formula], ["2d8", "force", 0, "2d8"]);
});

test("King Q-E6: Primes and Pressure last 1 minute each unless spent (oldest spent first)", async () => {
  const { stampGain, stampSpend, expireStamps } = await import("../module/rules/pool-expiry.mjs");
  let stamps = stampGain([], 2, 100);
  stamps = stampGain(stamps, 1, 130);
  assert.deepEqual(stampSpend(stamps, 1), [100, 130], "spending uses the oldest");
  assert.deepEqual(expireStamps(stamps, { value: 3, now: 159, lifetime: 60 }), { stamps: [100, 100, 130], dropped: 0, value: 3 });
  assert.deepEqual(expireStamps(stamps, { value: 3, now: 160, lifetime: 60 }), { stamps: [130], dropped: 2, value: 1 });
  assert.deepEqual(expireStamps(stamps, { value: 1, now: 120, lifetime: 60 }).stamps, [130], "a value lowered by hand drops the oldest");
  const primes = item("bakuton", "bakuton-priming-cataclysm").system.resourcePools[0];
  const pressure = item("futton", "futton-broiling-rampart").system.resourcePools[0];
  assert.deepEqual([primes.lifetime, primes.recovery, pressure.lifetime, pressure.recovery], [60, [], 60, []]);
});

test("E2: Scorch options spend Scorch Charges on their own Hijutsu; clan pools", () => {
  const flame = item("shakuton", "shakuton-scorch-release-murderous-flame");
  const opt = flame.flags.n5e.castOption ?? flame.flags.n5e.castOptions[0];
  assert.deepEqual([opt.appliesTo.namePrefix, opt.cost], ["Scorch Release: Murderous Flame", { pool: "scorchCharges", amount: 2 }]);
  const scorch = item("shakuton", "shakuton-heating-up").system.resourcePools[0];
  assert.deepEqual([scorch.max, scorch.lifetime], ["lvl(1:2,3:4,7:6,11:8,15:10)", 60]);
  assert.equal(item("fushin", "fushin-divine-winds").system.resourcePools[0].lifetime, 60);
  assert.deepEqual(item("konjiki", "konjiki-alomancy").system.resourcePools[0].recovery.map(r => r.on), ["sr"]);
  assert.equal(item("hanami", "hanami-hanami-boons-banes").system.resourcePools[0].max, "1 + @prof");
  const fist = item("hanami", "hanami-stance-medical-fist");
  assert.equal(fist.system.unarmedDie, "1d6");
  assert.ok(fist.effects.some(e => e.changes.some(c => c.key === "n5e.mastery.skill.ath")));
  const drizzle = effectiveActivities(item("jiton", "jiton-magnet-release-dust-particle-drizzle"), { rank: "C" }).find(a => a.label === "Drizzle: damage").damage.parts.map(p => p.formula);
  assert.deepEqual(drizzle, ["(1d12) + (1d12)", "(1d12) + (1d12)"]);
});
