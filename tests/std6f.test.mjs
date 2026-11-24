/* STD6f: jutsu as data (docs/STD6f_SPEC.md). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { jutsuTables, sectionJutsu, tableProblems } from "../tools/content/apply-automation.mjs";
import { validateIntent, INTENT_TYPES } from "../module/automation/owner-intents.mjs";
import { inflictOn } from "../module/workflow/trackers.mjs";

const table = section => jutsuTables().find(t => t.section === section);
const jutsu = (section, id) => {
  const t = table(section);
  return sectionJutsu(section, t.ranks).get(id).doc;
};

test("STD6f F1 Taijutsu I: every E- to C-Rank Taijutsu has an entry and is reviewed", () => {
  const t = table("taijutsu/general");
  assert.ok(t);
  assert.deepEqual(t.ranks.slice(0, 3), ["E", "D", "C"]);
  const items = sectionJutsu("taijutsu/general", ["E", "D", "C"]);
  assert.equal(items.size, 91);
  for ( const [id, { doc }] of items ) {
    assert.ok(t.features[id], id);
    assert.equal(doc.flags.n5e.reviewed, true, id);
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
});

test("STD6f F1: Finisher versions are their own buttons; upcasts carry their dice", () => {
  const hammer = jutsu("taijutsu/general", "hammer");
  const labels = hammer.system.activities.map(a => a.label);
  assert.deepEqual(labels, ["Hammer", "Hammer: Concussed", "Finisher: Hammer", "Finisher: Concussed"]);
  assert.equal(hammer.system.activities[3].inflicts[0].ranks, 2);
  const byRank = hammer.flags.n5e.jutsuBookImport.activitiesByRank;
  assert.equal(byRank.S.find(a => a.label === "Hammer").strike.extraDice, "1d12 + 4d12");
  // Noble Impact: +1 attack per rank.
  const noble = jutsu("taijutsu/general", "noble-impact").flags.n5e.jutsuBookImport.activitiesByRank;
  assert.equal(noble.C[0].attack.count, 5);
  assert.equal(noble.S[0].attack.count, 8);
  // Bolting Blossom: die steps up per rank, +1 attack from B-Rank.
  const bb = jutsu("taijutsu/general", "bolting-blossom").flags.n5e.jutsuBookImport.activitiesByRank;
  assert.equal(bb.C[0].damage.parts[0].formula, "3d8");
  assert.equal(bb.B[0].attack.count, 3);
  assert.equal(bb.S[0].damage.parts[0].formula, "3d12");
  // A note-only jutsu has no guessed buttons.
  const late = jutsu("taijutsu/general", "late-death");
  assert.deepEqual(late.system.activities, []);
  assert.equal(late.flags.n5e.rules[0].key, "note");
});

test("STD6f F-D3: an effect's conditions and states with no save (inflicts)", async () => {
  assert.ok(INTENT_TYPES.includes("inflictConditions"));
  const ok = validateIntent("inflictConditions", { targetUuid: "Actor.x", inflicts: [{ key: "prone", kind: "state", ranks: 1 }, { key: "dazed", kind: "condition", ranks: 2 }] });
  assert.deepEqual(ok.inflicts.map(i => i.key), ["prone", "dazed"]);
  assert.throws(() => validateIntent("inflictConditions", { targetUuid: "Actor.x", inflicts: [{ key: "x y", kind: "condition" }] }));
  assert.throws(() => validateIntent("inflictConditions", { targetUuid: "Actor.x", inflicts: [] }));
  const calls = [];
  const actor = { toggleStatusEffect: async (k, o) => calls.push(["state", k, o.active]), addCondition: async (k, r) => calls.push(["condition", k, r]) };
  await inflictOn(actor, [{ key: "prone", kind: "state" }, { key: "weakened", kind: "condition", ranks: 3 }]);
  assert.deepEqual(calls, [["state", "prone", true], ["condition", "weakened", 3]]);
  const drop = jutsu("taijutsu/general", "falcon-drop").system.activities.find(a => a.type === "effect");
  assert.deepEqual(drop.effect.inflicts.map(i => i.key), ["prone", "weakened", "bruised"]);
});

test("STD6f F2 Taijutsu II: every B- to S-Rank Taijutsu reviewed; the whole section is done", () => {
  const t = table("taijutsu/general");
  assert.deepEqual(t.ranks, ["E", "D", "C", "B", "A", "S"]);
  const items = sectionJutsu("taijutsu/general", ["B", "A", "S"]);
  assert.equal(items.size, 55);
  for ( const [id, { doc }] of items ) assert.equal(doc.flags.n5e.reviewed, true, id);
  assert.equal(Object.keys(t.features).length, 146);
  // King's Fang: +1 attack at S-Rank, base and Finisher.
  const kf = jutsu("taijutsu/general", "kings-fang").flags.n5e.jutsuBookImport.activitiesByRank;
  assert.equal(kf.A.find(a => a.label === "King’s Fang").attack.count, 2);
  assert.equal(kf.S.find(a => a.label === "Finisher: King’s Fang").attack.count, 3);
  // Daytime Tiger: two damage types on one attack.
  const dt = jutsu("taijutsu/general", "daytime-tiger").system.activities[0];
  assert.deepEqual(dt.damage.parts.map(p => p.type), ["bludgeoning", "force"]);
  // No-save conditions (F-D3) on Violent Strangling.
  const vs = jutsu("taijutsu/general", "violent-strangling").system.activities.find(a => a.label === "On a hit");
  assert.deepEqual(vs.effect.inflicts.map(i => i.key), ["grappled", "restrained", "exhaustion"]);
  // Kept Amps (King Q-J2).
  assert.equal(jutsu("taijutsu/general", "tiger-lily").system.activities[0].effect.amp, "jutsu-tiger-lily");
});

test("STD6f F3 Bukijutsu I: Shinobi Basics and Blade reviewed at every rank; weapon strikes and @weapon", () => {
  for ( const [section, count] of [["bukijutsu/shinobi-basics", 68], ["bukijutsu/blade", 35]] ) {
    const t = table(section);
    assert.deepEqual(t.ranks, ["E", "D", "C", "B", "A", "S"]);
    const items = sectionJutsu(section, t.ranks);
    assert.equal(items.size, count, section);
    for ( const [id, { doc }] of items ) {
      assert.ok(t.features[id], id);
      assert.equal(doc.flags.n5e.reviewed, true, id);
    }
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
  // Weapon strike with per-rank extra dice and a Chain button.
  const fang = jutsu("bukijutsu/shinobi-basics", "breath-of-beasts-fang");
  assert.equal(fang.system.activities[0].strike.kind, "weapon");
  assert.equal(fang.system.activities[0].attack.count, 2);
  const fangC = fang.flags.n5e.jutsuBookImport.activitiesByRank.C[0];
  assert.equal(fangC.strike.extraDice, "1d6");
  assert.equal(fang.flags.n5e.jutsuBookImport.activitiesByRank.B[0].attack.count, 3);
  assert.ok(fang.system.activities.some(a => a.label.startsWith("Chain 1:")));
  // A save dealing [Weapon damage] + typed dice (F-D5 @weapon), growing only the typed part.
  const smash = jutsu("bukijutsu/shinobi-basics", "breath-of-earth-smash");
  assert.deepEqual(smash.system.activities[0].damage.parts.map(p => p.formula), ["@weapon", "1d8"]);
  assert.deepEqual(smash.flags.n5e.jutsuBookImport.activitiesByRank.C[0].damage.parts.map(p => p.formula), ["@weapon", "(1d8) + (1d8)"]);
  // Kept Amps (King Q-J2).
  for ( const [s, id] of [["bukijutsu/shinobi-basics", "breath-of-sound-score"], ["bukijutsu/shinobi-basics", "guardian-knight"], ["bukijutsu/blade", "blade-heart"], ["bukijutsu/shinobi-basics", "the-zone"]] )
    assert.ok(jutsu(s, id).system.activities.some(a => a.effect?.amp), id);
  // Note-only action economy.
  assert.deepEqual(jutsu("bukijutsu/shinobi-basics", "baton-pass").system.activities, []);
});

test("STD6f F4 Bukijutsu II: Flail and Polearm reviewed at every rank; Amps kept; @wdie", () => {
  for ( const section of ["bukijutsu/flail", "bukijutsu/polearm"] ) {
    const t = table(section);
    const items = sectionJutsu(section, t.ranks);
    assert.equal(items.size, 33, section);
    for ( const [id, { doc }] of items ) {
      assert.ok(t.features[id], id);
      assert.equal(doc.flags.n5e.reviewed, true, id);
    }
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
  // Kept Amps (King Q-J2), including Demon Hunter's and Overcomer's beside new buttons.
  for ( const [s, id] of [["flail", "warriors-zone"], ["flail", "sparking-flail"], ["polearm", "enhanced-blocking"], ["polearm", "demon-hunter"], ["polearm", "overcomer"]] )
    assert.ok(jutsu(`bukijutsu/${s}`, id).system.activities.some(a => a.effect?.amp === `jutsu-${id}`), id);
  assert.ok(!jutsu("bukijutsu/polearm", "overcomer").system.activities.some(a => a.type === "save"));
  // Extra attacks at higher ranks.
  const holes = jutsu("bukijutsu/polearm", "holes-of-despair").flags.n5e.jutsuBookImport.activitiesByRank;
  assert.equal(holes.C[0].attack.count, 2);
  assert.equal(holes.B[0].attack.count, 3);
  assert.equal(jutsu("bukijutsu/flail", "whip-like-strikes").flags.n5e.jutsuBookImport.activitiesByRank.S[0].attack.count, 5);
  // The weapon damage die alone (@wdie) and twice [Weapon damage].
  assert.equal(jutsu("bukijutsu/polearm", "merciless-havoc").system.activities[0].damage.parts[0].formula, "@wdie + 2d8");
  assert.equal(jutsu("bukijutsu/flail", "chain-kill").system.activities[0].damage.parts[0].formula, "@weapon + @weapon");
  // Delayed conditions are effect buttons, not save results.
  const aura = jutsu("bukijutsu/flail", "abyssal-aura").system.activities;
  assert.ok(aura.filter(a => a.type === "save").every(a => !a.inflicts?.length));
  assert.deepEqual(aura.filter(a => a.type === "effect").map(a => a.effect.inflicts[0].key), ["demoralized", "concussed", "dazzled"]);
});

test("STD6f F5 Bukijutsu III: Power and Ammunition reviewed; Fury users tagged (F-D2); Binding Fury Stance's Fury on its effect", () => {
  for ( const [section, count] of [["bukijutsu/power", 30], ["bukijutsu/ammunition", 53]] ) {
    const t = table(section);
    const items = sectionJutsu(section, t.ranks);
    assert.equal(items.size, count, section);
    for ( const [id, { doc }] of items ) {
      assert.ok(t.features[id], id);
      assert.equal(doc.flags.n5e.reviewed, true, id);
    }
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
  // F-D2: every Power jutsu that gains or spends Fury says so in its data; others don't.
  const power = sectionJutsu("bukijutsu/power", table("bukijutsu/power").ranks);
  const tagged = [...power].filter(([, { doc }]) => doc.flags.n5e.trackers?.includes("fury")).map(([id]) => id).sort();
  assert.ok(tagged.length >= 10 && tagged.every(id => id.startsWith("binding-fury")), tagged.join());
  // Binding Fury Stance: the Fury trigger rides on its concentration effect (it was predicated on a stance item it isn't).
  const stance = jutsu("bukijutsu/power", "binding-fury-stance");
  assert.ok(!(stance.flags.n5e.rules ?? []).some(r => r.key === "resource"));
  const rule = stance.system.activities[0].effect.rules[0];
  assert.deepEqual([rule.on, rule.selector, rule.pool, rule.oncePerTurn, rule.predicate], ["damageDealt", "damage:weapon", "fury", true, undefined]);
  // Upcasts: Tyger Claws' critical range +2 from B-Rank; Tendon Shot's 1d4+1 grows its die.
  assert.ok(jutsu("bukijutsu/ammunition", "tyger-claws").flags.n5e.jutsuBookImport.activitiesByRank.B.some(a => a.label === "+2 critical range"));
  assert.equal(jutsu("bukijutsu/ammunition", "tendon-shot").flags.n5e.jutsuBookImport.activitiesByRank.S.find(a => a.type === "roll").roll.formula, "1d8 + 1");
  assert.deepEqual(jutsu("bukijutsu/ammunition", "rundas-ammo").system.activities, []);
});

test("STD6f F6 Non-Elemental: every jutsu reviewed; its summons are built from the Summon Stat Blocks and linked by rank", async () => {
  const section = "ninjutsu/non-elemental";
  const t = table(section);
  const items = sectionJutsu(section, t.ranks);
  assert.equal(items.size, 86);
  for ( const [id, { doc }] of items ) {
    assert.ok(t.features[id], id);
    assert.equal(doc.flags.n5e.reviewed, true, id);
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
  const { SUMMONS } = await import("../tools/content/build-summons.mjs");
  const { linkValue, summonerData } = await import("../module/rules/summoner-links.mjs");
  const byId = Object.fromEntries(Object.values(SUMMONS).filter(d => d?.type === "npc").map(d => [d._id, d]));
  // Each summoning jutsu points at its NPC.
  for ( const [id, name, count] of [["beast-imitating-art-bat-snake", "Ink Bat/Snake", 1], ["beast-imitating-art-reptile", "Ink Reptile", 1],
    ["beast-imitating-art-predator", "Ink Predator", 1], ["sealing-art-inanimate-puppet", "Inanimate Puppet", 1], ["beast-imitating-art-oni-twins", "Ink Oni", 2], ["shadow-clone-technique", "Clone", 1]] ) {
    const s = jutsu(section, id).system.activities.find(a => a.type === "summon");
    assert.equal(byId[s.summon.uuid.split(".").pop()]?.name, name, id);
    assert.equal(s.summon.count, count, id);
  }
  // AC and hit points by the rank cast: Ink Predator (C-Rank jutsu; its block counts from D-Rank) at B-Rank.
  const pred = SUMMONS.inkPredator.flags.n5e.fromSummoner;
  const atB = { ...summonerData({ prof: 3, level: 7 }), rankValue: 3 };
  assert.equal(linkValue(pred["attributes.ac.flat"], atB), 18);
  assert.equal(linkValue(pred.hpMax, atB), 50);
  assert.equal(SUMMONS.inkOni.system.traits.dr, 6);
  assert.deepEqual(SUMMONS.inanimatePuppet.system.traits.vuln, ["lightning"]);
  assert.equal(SUMMONS.clone.flags.n5e.fromSummoner["attributes.ac.flat"], "@dc.nin");
  // Oni Twins: a third Oni at S-Rank.
  assert.equal(jutsu(section, "beast-imitating-art-oni-twins").flags.n5e.jutsuBookImport.activitiesByRank.S[0].summon.count, 3);
  // Arms of Buddha: +1d8 at C, a second attack at B, Fists of Peace at A, +1d8 more at S.
  const buddha = jutsu(section, "arms-of-buddha").flags.n5e.jutsuBookImport.activitiesByRank;
  assert.deepEqual(["C", "B", "A", "S"].map(r => [buddha[r][0].damage.parts[0].formula, buddha[r][0].attack.count, buddha[r].length]),
    [["5d8", 1, 1], ["5d8", 2, 1], ["5d8", 2, 2], ["6d8", 2, 2]]);
  assert.deepEqual(jutsu(section, "chakra-hands").system.activities, []);
});

test("STD6f F7 Medical: every jutsu reviewed; Amps kept; wrong buttons fixed; the Supreme Poison Deity summon", async () => {
  const section = "ninjutsu/medical-release";
  const t = table(section);
  const items = sectionJutsu(section, t.ranks);
  assert.equal(items.size, 68);
  for ( const [id, { doc }] of items ) {
    assert.ok(t.features[id], id);
    assert.equal(doc.flags.n5e.reviewed, true, id);
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
  const j = id => jutsu(section, `medical-release-${id}`);
  for ( const id of ["acid-armor", "grim-mask", "medical-aura", "investiture-of-acid", "strength-of-100", "aura-of-power", "strength-of-1000"] )
    assert.ok(j(id).system.activities.some(a => a.effect?.amp === `jutsu-medical-release-${id}`), id);
  // Wounds and Chakra Needles are attacks (the import made them saves); Wounds' Bleed grows by rank.
  assert.equal(j("wounds").system.activities[0].type, "attack");
  assert.equal(j("chakra-needles").system.activities[0].type, "attack");
  assert.equal(j("wounds").flags.n5e.jutsuBookImport.activitiesByRank.S.find(a => a.type === "save").inflicts[0].ranks, 5);
  // Corrosive Plume no longer gives 5 Envenomed; Ensnaring Strike's damage is its own button.
  assert.deepEqual(j("corrosive-plume").system.activities[0].inflicts.map(x => x.key), ["corroded"]);
  assert.ok(!j("ensnaring-strike").system.activities.find(a => a.type === "save").damage?.parts?.length);
  // Healing Elixir: 4d8+12 at B and A, 4d12+24 at S; Acid Armor's temporary hit points 10 + 5 per rank.
  const elixir = j("healing-elixir").flags.n5e.jutsuBookImport.activitiesByRank;
  assert.deepEqual(["C", "B", "A", "S"].map(r => elixir[r][0].heal.formula), ["4d6 + 6", "4d8 + 12", "4d8 + 12", "4d12 + 24"]);
  assert.equal(j("acid-armor").flags.n5e.jutsuBookImport.activitiesByRank.S.find(a => a.type === "heal").heal.formula, "30");
  // The Supreme Poison Deity: fixed numbers, your Ninjutsu numbers.
  const { SUMMONS } = await import("../tools/content/build-summons.mjs");
  const deity = SUMMONS.poisonDeity;
  assert.deepEqual([deity.system.attributes.ac.flat, deity.system.hpMax, deity.system.traits.dr, deity.system.traits.size], [22, 90, 8, "huge"]);
  assert.equal(j("supreme-poison-deity").system.activities[0].summon.uuid, `Compendium.n5e.summons.Actor.${deity._id}`);
});

test("STD6f F8 Earth and Wind: every jutsu reviewed; Mud Wolf and Stone Dragon from the Summon Stat Blocks; Earth Clone uses the Clone", async () => {
  for ( const [section, count] of [["ninjutsu/earth-release", 54], ["ninjutsu/wind-release", 50]] ) {
    const t = table(section);
    const items = sectionJutsu(section, t.ranks);
    assert.equal(items.size, count, section);
    for ( const [id, { doc }] of items ) {
      assert.ok(t.features[id], id);
      assert.equal(doc.flags.n5e.reviewed, true, id);
    }
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
  const e = id => jutsu("ninjutsu/earth-release", `earth-release-${id}`), w = id => jutsu("ninjutsu/wind-release", `wind-release-${id}`);
  for ( const id of ["jade-devotion", "sand-armor", "diamond-bone-hardening"] ) assert.ok(e(id).system.activities.some(a => a.effect?.amp === `jutsu-earth-release-${id}`), id);
  for ( const id of ["zephyr-strike", "wind-rider", "neverending-breath"] ) assert.ok(w(id).system.activities.some(a => a.effect?.amp === `jutsu-wind-release-${id}`), id);
  const { SUMMONS } = await import("../tools/content/build-summons.mjs");
  const { linkValue, summonerData } = await import("../module/rules/summoner-links.mjs");
  const uuid = d => `Compendium.n5e.summons.Actor.${d._id}`;
  assert.equal(e("mud-wolf").system.activities[0].summon.uuid, uuid(SUMMONS.mudWolf));
  assert.equal(e("mud-wolf").system.activities[0].summon.count, 2);
  assert.equal(e("mud-wolf").flags.n5e.jutsuBookImport.activitiesByRank.S[0].summon.count, 5);
  assert.equal(e("stone-dragon").system.activities[0].summon.uuid, uuid(SUMMONS.stoneDragon));
  assert.equal(e("earth-clone").system.activities[0].summon.uuid, uuid(SUMMONS.clone));
  // Mud Wolf AC: 12 + your Ninjutsu modifier (+3 with a +6 Ninjutsu attack at proficiency 3); 35 hit points at B-Rank.
  const links = SUMMONS.mudWolf.flags.n5e.fromSummoner, data = { ...summonerData({ prof: 3, level: 7 }), attack: { nin: 6 }, prof: 3, rankValue: 3 };
  assert.equal(linkValue(links["attributes.ac.flat"], data), 15);
  assert.equal(linkValue(links.hpMax, data), 35);
  assert.equal(SUMMONS.stoneDragon.system.traits.dr, 8);
  // Upcasts: Crystalized Ascension's bonuses, Sand Binding's riders, Splitting Breeze's S-Rank shockwave.
  const crys = e("crystalized-ascension").flags.n5e.jutsuBookImport.activitiesByRank;
  assert.deepEqual(["B", "A", "S"].map(r => crys[r].find(a => a.type === "heal").heal.formula), ["24", "24", "32"]);
  assert.equal(e("sand-binding").flags.n5e.jutsuBookImport.activitiesByRank.A.length, 4);
  assert.ok(w("splitting-breeze").flags.n5e.jutsuBookImport.activitiesByRank.S.some(a => a.label === "S-Rank critical: shockwave"));
  // Wrong import conditions removed: Bottomless Swamp's Dying, Cherishing Breezes' Dead and Dying.
  assert.ok(!e("bottomless-swamp").system.activities.some(a => (a.inflicts ?? []).some(x => x.key === "dying")));
  assert.ok(!w("cherishing-breezes").system.activities.some(a => a.inflicts?.length));
});

test("STD6f F9 Fire and Water: every jutsu reviewed; Flame Spider, Water Shark, Medical Jellyfish and Supreme Water Lion built; Clones place the Clone", async () => {
  for ( const [section, count] of [["ninjutsu/fire-release", 51], ["ninjutsu/water-release", 50]] ) {
    const t = table(section);
    const items = sectionJutsu(section, t.ranks);
    assert.equal(items.size, count, section);
    for ( const [id, { doc }] of items ) {
      assert.ok(t.features[id], id);
      assert.equal(doc.flags.n5e.reviewed, true, id);
    }
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
  const f = id => jutsu("ninjutsu/fire-release", `fire-release-${id}`), w = id => jutsu("ninjutsu/water-release", `water-release-${id}`);
  for ( const id of ["flame-armor", "investiture-of-flame", "body-of-dawn"] ) assert.ok(f(id).system.activities.some(a => a.effect?.amp === `jutsu-fire-release-${id}`), id);
  for ( const id of ["viscous-water-mass", "blessing-of-poseidon"] ) assert.ok(w(id).system.activities.some(a => a.effect?.amp === `jutsu-water-release-${id}`), id);
  const { SUMMONS } = await import("../tools/content/build-summons.mjs");
  const uuid = d => `Compendium.n5e.summons.Actor.${d._id}`;
  for ( const [j, d, count] of [[f("crimson-spider"), SUMMONS.flameSpider, 1], [w("piranha-shark"), SUMMONS.waterShark, 1], [w("shark-bomb"), SUMMONS.waterShark, 2],
    [w("medical-jellyfish"), SUMMONS.jellyfish, 1], [w("supreme-water-lion"), SUMMONS.waterLion, 1], [f("explosive-clone"), SUMMONS.clone, 1], [w("water-clone"), SUMMONS.clone, 1]] ) {
    const s = j.system.activities.find(a => a.type === "summon");
    assert.equal(s.summon.uuid, uuid(d), j.name);
    assert.equal(s.summon.count, count, j.name);
  }
  assert.equal(w("shark-bomb").flags.n5e.jutsuBookImport.activitiesByRank.S[0].summon.count, 3);
  assert.deepEqual([SUMMONS.waterLion.system.attributes.ac.flat, SUMMONS.waterLion.system.hpMax, SUMMONS.waterLion.system.traits.size], [23, 105, "huge"]);
  assert.equal(SUMMONS.flameSpider.system.details.blurb, "Fire Release: Crimson Spider (D-Rank)");
  // Flat-bonus dice grow both parts (4d6 + 4 → 8d6 + 8 at S); attacks the import made saves are attacks again.
  assert.equal(f("fireball").flags.n5e.jutsuBookImport.activitiesByRank.S[0].damage.parts[0].formula, "8d6 + 8");
  for ( const id of ["dolphin-break", "syrup-water-shuriken", "tsunami-mallet", "sharks-maw"] ) assert.equal(w(id).system.activities[0].type, "attack", id);
  // Drown and Heavenly Mirror of Pain no longer apply Dying or Sealed.
  assert.ok(!w("drown").system.activities.some(a => (a.inflicts ?? []).some(x => x.key === "dying")));
  assert.ok(!w("heavenly-mirror-of-pain").system.activities.some(a => a.inflicts?.length));
});

test("STD6f F10 Lightning: every jutsu reviewed; Lightning Beast and Lightning Dragon built; the import's wrong buttons fixed", async () => {
  const t = table("ninjutsu/lightning-release");
  const items = sectionJutsu("ninjutsu/lightning-release", t.ranks);
  assert.equal(items.size, 44);
  for ( const [id, { doc }] of items ) {
    assert.ok(t.features[id], id);
    assert.equal(doc.flags.n5e.reviewed, true, id);
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
  const l = id => jutsu("ninjutsu/lightning-release", `lightning-release-${id}`);
  for ( const id of ["spark", "jolt", "lightning-chakra-armor", "lightning-kings-mantle"] ) assert.ok(l(id).system.activities.some(a => a.effect?.amp === `jutsu-lightning-release-${id}`), id);
  const { SUMMONS } = await import("../tools/content/build-summons.mjs");
  const uuid = d => `Compendium.n5e.summons.Actor.${d._id}`;
  for ( const [j, d] of [[l("beast-lightning"), SUMMONS.lightningBeast], [l("lightning-dragon"), SUMMONS.lightningDragon], [l("lightning-clone"), SUMMONS.clone]] ) {
    const s = j.system.activities.find(a => a.type === "summon");
    assert.equal(s.summon.uuid, uuid(d), j.name);
  }
  assert.deepEqual([SUMMONS.lightningDragon.system.attributes.ac.flat, SUMMONS.lightningDragon.system.hpMax, SUMMONS.lightningDragon.system.traits.dr], [22, 60, 8]);
  assert.equal(SUMMONS.lightningBeast.system.details.blurb, "Lightning Release: Beast Lightning (B-Rank)");
  // Banquet of Lightning and Static Falcon are saves (half), not bare damage; Lightning Reflex is no save; Railgun gives no Shocked.
  for ( const id of ["banquet-of-lightning", "static-falcon"] ) assert.equal(l(id).system.activities[0].save.onSuccess, "half", id);
  assert.ok(!l("lightning-reflex").system.activities.some(a => a.type === "save"));
  assert.ok(!l("railgun").system.activities.some(a => (a.inflicts ?? []).some(x => x.key === "shocked")));
  // Lightning Claw: three attacks; B-Rank adds an attack to Thunder Punch; A-Rank deals 6d6.
  const claw = l("lightning-claw");
  assert.deepEqual(claw.system.activities.map(a => a.type), ["attack", "attack", "attack"]);
  assert.equal(claw.flags.n5e.jutsuBookImport.activitiesByRank.B[0].attack.count, 2);
  assert.equal(claw.flags.n5e.jutsuBookImport.activitiesByRank.A[0].damage.parts[0].formula, "6d6");
});

test("STD6f F11 Phantasm and Hallucinogenic: every jutsu reviewed; four-tier Genjutsu saves; Dance Macabre places 4 Dark Phantasms", async () => {
  for ( const [section, count] of [["genjutsu/phantasm", 53], ["genjutsu/hallucinogenic", 22]] ) {
    const t = table(section);
    const items = sectionJutsu(section, t.ranks);
    assert.equal(items.size, count, section);
    for ( const [id, { doc }] of items ) {
      assert.ok(t.features[id], id);
      assert.equal(doc.flags.n5e.reviewed, true, id);
    }
  }
  assert.deepEqual(tableProblems().filter(p => p.startsWith("jutsu/")), []);
  const p = id => jutsu("genjutsu/phantasm", id), h = id => jutsu("genjutsu/hallucinogenic", id);
  for ( const [j, id] of [[p, "gaslight"], [p, "semblance-of-dread"], [h, "unlimited-pleasure"]] ) assert.ok(j(id).system.activities.some(a => a.effect?.amp === `jutsu-${id}`), id);
  // Genjutsu saves carry their four tiers as text.
  const fear = p("cause-fear").system.activities[0];
  assert.equal(fear.save.fourTier, true);
  assert.match(fear.save.tiers.failure, /^Failure:/);
  assert.equal(p("cause-fear").flags.n5e.jutsuBookImport.activitiesByRank.S[0].inflicts[0].ranks, 3);
  // Damage that differs by tier is one button per tier.
  assert.deepEqual(p("corruption-abhorrent-apparition").system.activities.filter(a => a.type === "damage").map(a => a.damage.parts[0].formula), ["2d8", "4d8", "7d8"]);
  // Phantom Dragon's Sealed comes from Draconic Madness on a hit, not the save.
  assert.ok(!p("phantom-dragon").system.activities.find(a => a.type === "save").inflicts?.length);
  const { SUMMONS } = await import("../tools/content/build-summons.mjs");
  const s = p("dance-macabre").system.activities.find(a => a.type === "summon");
  assert.equal(s.summon.uuid, `Compendium.n5e.summons.Actor.${SUMMONS.darkPhantasm._id}`);
  assert.equal(s.summon.count, 4);
  assert.deepEqual([SUMMONS.darkPhantasm.system.attributes.ac.flat, SUMMONS.darkPhantasm.system.hpMax], [20, 10]);
});
