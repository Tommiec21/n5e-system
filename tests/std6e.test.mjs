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

test("King Q-E8–Q-E11: Combo/Finisher Boon, Divine Wind's text, Blazing Aura's damage, turn-start charges expire", async () => {
  const combo = item("hanami", "hanami-hanami-boons-banes-combo-finisher-boon");
  assert.match(combo.system.description, /gain the Combo keyword/);
  assert.equal(combo.system.activities[0].cost.pool, "boonsBanes");
  assert.doesNotMatch(item("hanami", "hanami-hanami-boons-banes-boosting-boon").system.description, /Combo\/Finisher/);
  assert.ok(load("clans", "clan-98ed1c91b88a7e93").flags.n5e.referenceOptions.some(o => o.id === combo._id));
  const stance = item("fushin", "fushin-stance-divine-wind").system.description;
  assert.match(stance, /Divine Wind chakra stance as a bonus action/);
  assert.doesNotMatch(stance, /Wind Scythe state/);
  const aura = item("shakuton", "shakuton-desiccated-heat-blazing-aura").system.activities.find(a => a.type === "damage");
  assert.equal(aura.damage.parts[0].formula, "lvl(3:1d6,7:2d6,15:3d6)");
  const src = (await import("node:fs")).readFileSync(new URL("../module/workflow/recovery.mjs", import.meta.url), "utf8");
  assert.match(src, /stampGain\(/, "turn-start gains are stamped");
});

test("STD6e E3 Land of Lightning: every Chinoike, Keton and Ranton item reviewed, with its pools, stances and Blood Detonation", () => {
  for ( const clan of ["chinoike", "keton", "ranton"] ) {
    const t = clanTables().find(x => x.clan === clan);
    assert.ok(t, clan);
    for ( const id of Object.keys(t.features) ) assert.equal(item(clan, id).flags.n5e.reviewed, true, `${clan} ${id}`);
  }
  const pool = (clan, id, p) => item(clan, id).system.resourcePools.find(x => x.id === p);
  assert.equal(pool("chinoike", "chinoike-ketsuryugan", "crimsonCharges").max, "1 + @prof");
  assert.equal(pool("keton", "keton-stargazer", "starlights").lifetime, 60);
  assert.equal(pool("keton", "keton-stellar-convergence", "stellarCharges").recovery[0].amount, "empty");
  assert.equal(pool("ranton", "ranton-storm-incarnate", "voltage").max, "lvl(1:4,7:5,15:6)");
  const sphere = item("chinoike", "chinoike-sanguine-sphere");
  assert.equal(sphere.flags.n5e.castOption.cost.amount, 2);
  assert.equal(sphere.flags.n5e.castOption.appliesTo.namePrefix, "Sanguine Sphere");
  const solar = item("keton", "keton-stance-solar-flare").system.activities.map(a => a.label);
  assert.deepEqual(solar, ["Stellar Knuckle", "Plasma Burst"]);
  assert.equal(item("ranton", "ranton-stance-laser-circus").system.activities[0].attack.discipline, "highest");
  assert.equal(item("chinoike", "chinoike-crimson-architect").system.uses.per, "lr");
  assert.match(item("chinoike", "chinoike-blood-dragon-ascension").system.activities[0].summon.uuid, /n5e6xblImso76jRj$/);
});

test("STD6e E3: combat recovery honors the pool's amount (Jiton +1 a turn; Stellar Charges and Voltage empty each combat)", async () => {
  const { combatRecoveryPlan } = await import("../module/rules/recovery.mjs");
  const actor = { items: [], system: { resources: {
    magnetic: { label: "Magnetic Charges", value: 1, maxValue: 4, recovery: [{ on: "turn", amount: "formula", formula: "1" }] },
    stellar: { label: "Stellar Charges", value: 3, maxValue: 4, recovery: [{ on: "encounter", amount: "empty" }] },
    martial: { label: "Martial Dice", value: 0, maxValue: 2, recovery: [{ on: "turn" }] } } } };
  assert.deepEqual(combatRecoveryPlan(actor, ["turn"]).update, { "system.resources.magnetic.value": 2, "system.resources.martial.value": 2 });
  assert.deepEqual(combatRecoveryPlan(actor, ["encounter"]).update, { "system.resources.stellar.value": 0 });
});

test("King Q-E12 and Q-E16: copied Amp text removed; Crimson Weaponry's ammunition die", () => {
  assert.doesNotMatch(item("chinoike", "chinoike-crimson-architect").system.description, /#### Crimson Pact/);
  assert.doesNotMatch(item("keton", "keton-stellar-convergence-aphelion-the-mirror").system.description, /#### Event Horizon/);
  assert.doesNotMatch(item("keton", "keton-stellar-convergence").system.description, /#### Event Horizon/);
  assert.match(item("chinoike", "chinoike-crimson-pact").system.description, /#### Crimson Pact/, "the Pact keeps its own");
  assert.match(item("chinoike", "chinoike-crimson-weaponry").flags.n5e.automation?.rules?.[0]?.text ?? JSON.stringify(item("chinoike", "chinoike-crimson-weaponry").flags), /doesn't drop a step on a 1 or 2/);
});

test("STD6e E4 Land of Water: every Genwa, Hoshigaki, Hozuki, Kaguya, Vesper, Yamada and Yuki item reviewed", () => {
  for ( const clan of ["genwa", "hoshigaki", "hozuki", "kaguya", "vesper", "yamada", "yuki"] ) {
    const t = clanTables().find(x => x.clan === clan);
    assert.ok(t, clan);
    for ( const id of Object.keys(t.features) ) assert.equal(item(clan, id).flags.n5e.reviewed, true, `${clan} ${id}`);
  }
  const pool = (clan, id, p) => item(clan, id).system.resourcePools.find(x => x.id === p);
  assert.equal(pool("hozuki", "hozuki-hydration", "hydration").recovery[0].on, "lr");
  assert.equal(pool("kaguya", "kaguya-shikotsumyaku-stance", "battleLust").max, "5");
  assert.equal(pool("yuki", "yuki-the-looking-glass", "iceMirrors").lifetime, 60);
  assert.equal(item("hozuki", "hozuki-water-blob").flags.n5e.castOption.cost.pool, "hydration");
  assert.equal(item("vesper", "vesper-stance-claws-of-night").system.unarmedDie, "1d8");
  assert.match(item("yamada", "yamada-stance-tameshi-itto-ryu").system.description, /Executioners Instrument/);
  assert.doesNotMatch(item("hoshigaki", "hoshigaki-ravenous-chakra").system.description, /#### Apex Predator/);
  assert.match(item("hozuki", "hozuki-steaming-danger-tyranny").system.activities[0].summon.uuid, /n5eb2WwgDK4N1W25$/);
  assert.ok(item("hoshigaki", "hoshigaki-apex-berserker").system.activities.some(a => a.effect?.amp === "apex-predator-15"));
});

test("STD6e E5 Land of Sound: every Jinzo, Jūgo, Kashu, Shoton and Tsuchigumo item reviewed; Q-E17/Q-E18; rest and combat empty", async () => {
  for ( const clan of ["jinzo", "jugo", "kashu", "shoton", "tsuchigumo"] ) {
    const t = clanTables().find(x => x.clan === clan);
    assert.ok(t, clan);
    for ( const id of Object.keys(t.features) ) assert.equal(item(clan, id).flags.n5e.reviewed, true, `${clan} ${id}`);
  }
  const pool = (clan, id, p) => item(clan, id).system.resourcePools.find(x => x.id === p);
  assert.equal(pool("jugo", "jugo-nature-energy", "natureEnergy").recovery[0].amount, "empty");
  assert.equal(pool("kashu", "kashu-resonance-crown", "resonance").lifetime, 60);
  assert.equal(pool("shoton", "shoton-crystal-form", "hardness").max, "1 + @prof");
  assert.match(item("kashu", "kashu-conductors-throne").system.activities[0].summon.uuid, /n5egse2CKvWfq9kB$/);
  assert.match(item("shoton", "shoton-crystal-release-prismatic-dragon-of-heaven").system.activities[0].summon.uuid, /n5eNuujawHgtw3s6$/);
  assert.match(item("tsuchigumo", "tsuchigumo-king-of-the-brood").system.activities[0].summon.uuid, /n5eJxCsMDaq3FJQl$/);
  assert.doesNotMatch(item("tsuchigumo", "tsuchigumo-web-walker").system.description, /#### Arachnid/);
  // King Q-E17 and Q-E18.
  assert.equal(item("hozuki", "hozuki-hydration").system.activities[0].cost.amount, 1);
  assert.ok(!clanItems("vesper").has("vesper-stance-claws-of-the-night"));
  const src = (await import("node:fs")).readFileSync(new URL("../module/rules/rest.mjs", import.meta.url), "utf8");
  assert.match(src, /r\.amount === "empty" \) v = 0/);
});

test("STD6e E6 Land of Fire I: every Aburame, Akimichi, Hatake, Hyūga, Iburi, Inuzuka and Kurama item reviewed", () => {
  for ( const clan of ["aburame", "akimichi", "hatake", "hyuga", "iburi", "inuzuka", "kurama"] ) {
    const t = clanTables().find(x => x.clan === clan);
    assert.ok(t, clan);
    for ( const id of Object.keys(t.features) ) assert.equal(item(clan, id).flags.n5e.reviewed, true, `${clan} ${id}`);
  }
  const pool = (clan, id, p) => item(clan, id).system.resourcePools.find(x => x.id === p);
  assert.equal(pool("akimichi", "akimichi-caloric-arts", "calories").max, "1 + @prof");
  assert.equal(pool("hatake", "hatake-pack-leader", "commandDice").recovery[0].on, "lr");
  assert.equal(pool("kurama", "kurama-onijutsu", "oniCoils").max, "1 + @prof");
  const pay = item("akimichi", "akimichi-empty-crash").flags.n5e.castOptions.find(o => o.label.startsWith("Pay with Calories"));
  assert.equal(pay.costDelta, "zero");
  assert.equal(item("kurama", "kurama-onijutsu-will-breaker").flags.n5e.castOption.appliesTo.discipline, "gen");
  assert.equal(item("hyuga", "hyuga-stance-gentle-fist").system.unarmedDie, "1d8");
  assert.match(item("inuzuka", "inuzuka-stance-four-legs").system.description, /drop down on all fours/);
  assert.doesNotMatch(item("hatake", "hatake-last-to-move-loses").system.description, /#### White Wolf/);
});

test("King Q-E20: one damage roll dealt as two types (alsoAs) survives the roll dialog", async () => {
  const { diceParts, composeDice } = await import("../module/rules/roll-math.mjs");
  const parts = diceParts([{ formula: "10d12", type: "poison", alsoAs: "chakra" }]);
  assert.equal(parts[0].alsoAs, "chakra");
  assert.equal(composeDice(parts).parts[0].alsoAs, "chakra");
  const act = item("aburame", "aburame-parasitic-giant-insect").system.activities[0];
  assert.deepEqual(act.damage.parts[0], { formula: "10d12", type: "poison", alsoAs: "chakra" });
  const src = (await import("node:fs")).readFileSync(new URL("../module/workflow/activity-buttons.mjs", import.meta.url), "utf8");
  assert.match(src, /if \( p\.alsoAs \) instances\.push\(\{ amount: roll\.total \+ after, type: p\.alsoAs \}\)/);
});

test("STD6e E7 Land of Fire II: every Namikaze, Nara, Sarutobi, Senju, Uchiha, Uzumaki and Yamanaka item reviewed", () => {
  for ( const clan of ["namikaze", "nara", "sarutobi", "senju", "uchiha", "uzumaki", "yamanaka"] ) {
    const t = clanTables().find(x => x.clan === clan);
    assert.ok(t, clan);
    for ( const id of Object.keys(t.features) ) assert.equal(item(clan, id).flags.n5e.reviewed, true, `${clan} ${id}`);
  }
  const pool = (clan, id, p) => item(clan, id).system.resourcePools.find(x => x.id === p);
  assert.equal(pool("namikaze", "namikaze-blood-of-the-swift", "speedSeals").die, "d8");
  assert.equal(pool("sarutobi", "sarutobi-the-legacy-of-the-past", "will").max, "1 + @prof");
  assert.equal(pool("senju", "senju-built-different", "senjuCells").max, "lvl(1:2,7:4,15:6)");
  assert.equal(pool("uchiha", "uchiha-sharingan", "ocularCharges").recovery[0].on, "rest");
  assert.equal(pool("uzumaki", "uzumaki-wellspring-of-chakra", "spiralCells").max, "lvl(1:2,7:4,15:6)");
  // Nara's Bright / Dimly Lit options: Shadow Imitation's stop at D-Rank so Shadow Imitation Field doesn't get them.
  const bright = item("nara", "nara-shadow-imitation").flags.n5e.castOptions.find(o => o.label === "Bright");
  assert.equal(bright.appliesTo.maxRank, "D");
  assert.equal(item("yamanaka", "yamanaka-mental-recalibration-efficient-mind").flags.n5e.castOption.costDelta, "-rank");
  const burial = item("senju", "senju-wood-release-tree-bind-flourishing-burial").system.activities.find(a => a.type === "damage");
  assert.deepEqual(burial.damage.parts[0], { formula: "6d8", type: "earth", alsoAs: "chakra" });
  assert.equal(item("uzumaki", "uzumaki-stance-binding-chain").flags.n5e.reviewed, true);
  // King Q-E9 / Q-E12 applied.
  assert.match(item("sarutobi", "sarutobi-stance-cross-style").system.description, /Unified Form/);
  assert.match(item("senju", "senju-stance-mokuton-infusion").system.description, /Will of the Buddha/);
  assert.match(item("uchiha", "uchiha-stance-agile-fist").system.description, /Great Assault/);
  for ( const [clan, id, amp] of [["namikaze", "namikaze-interdiction-seal", "Speed Sovereign"], ["sarutobi", "sarutobi-embers-guardian", "Blazing"], ["uchiha", "uchiha-sharingan", "Sharingan"]] ) {
    assert.doesNotMatch(item(clan, id).system.description, new RegExp(`#### ${amp} /`), id);
  }
  assert.match(item("senju", "senju-wood-release-wood-dragon-summoning").flags.n5e.rules[0].text, /H9/);
});

test("STD6e E8 Minor Lands: every Hebi, Hoshi, Kuru, Ryu and Shikigami item reviewed", async () => {
  for ( const clan of ["hebi", "hoshi", "kuru", "ryu", "shikigami"] ) {
    const t = clanTables().find(x => x.clan === clan);
    assert.ok(t, clan);
    for ( const id of Object.keys(t.features) ) assert.equal(item(clan, id).flags.n5e.reviewed, true, `${clan} ${id}`);
  }
  const pool = (clan, id, p) => item(clan, id).system.resourcePools.find(x => x.id === p);
  assert.equal(pool("hebi", "hebi-serpents-blood", "viperBlood").max, "1 + @prof");
  assert.equal(pool("hoshi", "hoshi-star-chakra", "starChakra").max, "1 + @prof");
  assert.equal(pool("kuru", "kuru-miraigan", "foresight").recovery[0].on, "rest");
  assert.equal(pool("ryu", "ryu-wrath-of-the-dragon", "draconicChakra").max, "1 + @prof");
  const rei = pool("shikigami", "shikigami-origami", "rei");
  assert.equal(rei.max, "4");
  assert.deepEqual(rei.recovery.map(r => [r.on, r.amount]), [["turn", "formula"], ["encounter", "empty"]]);
  // Hoshi's Irradiated version: no chakra, spends Star Chakra.
  const irr = item("hoshi", "hoshi-kujaku-art-comet-beam").flags.n5e.castOption;
  assert.equal(irr.costDelta, "zero");
  assert.deepEqual(irr.cost, { pool: "starChakra", amount: 2 });
  // The Kujaku Beast summon: AC and hit points by rank.
  const { SUMMONS } = await import("../tools/content/build-summons.mjs");
  const beast = SUMMONS.kujakuBeast;
  assert.equal(beast._id, "n5eUznLAdjVLA63C");
  assert.equal(beast.flags.n5e.fromSummoner["attributes.ac.flat"], "12 + 2 * max(0, @rankValue - 1)");
  const sum = item("hoshi", "hoshi-kujaku-art-kujaku-beast").system.activities.find(a => a.type === "summon");
  assert.equal(sum.summon.uuid, "Compendium.n5e.summons.Actor.n5eUznLAdjVLA63C");
  // Hebi's duplicate stance is gone (as King Q-E18); one stance item, holding Serpent's Coil.
  const fs = await import("node:fs");
  const dir = new URL("../packs/_source/clans/organized/minor-land/hebi/stances/", import.meta.url);
  const stances = fs.readdirSync(dir).filter(f => !f.startsWith("_"));
  assert.equal(stances.length, 1);
  assert.match(JSON.parse(fs.readFileSync(new URL(stances[0], dir), "utf8")).system.description, /Viper Strike/);
  // King Q-E9 / Q-E12 applied.
  assert.match(item("kuru", "kuru-stance-black-fang").system.description, /Past Strike/);
  assert.match(item("shikigami", "shikigami-stance-muscle-weave").system.description, /Muscle Weave/);
  for ( const [clan, id, amp] of [["hebi", "hebi-serpents-guile", "Basilisk’s Blessing"], ["hoshi", "hoshi-irradiated-apex", "Kujaku Sanseijin"], ["kuru", "kuru-visions-of-what-will-be", "Black Okami"], ["ryu", "ryu-wrath-of-the-dragon", "Dragons Rage"], ["shikigami", "shikigami-secret-pages", "Origami Angel/Demon"]] ) {
    assert.doesNotMatch(item(clan, id).system.description, new RegExp(`#### ${amp} /`), id);
  }
});
