/** AMP1f: jutsu Amps (docs/AMP1F_SPEC.md), review batch 1. */
import "./helpers/actor.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ampDefinition, ampVersionFor, ampCardsFor, ampEffectPlan, withChoice, ownsAmp, ampLimitConflict } from "../module/rules/amp-cards.mjs";
import { ampAuditOf } from "../module/rules/amp-audit.mjs";
import { validateIntent } from "../module/automation/owner-intents.mjs";

const root = path.join(import.meta.dirname, "..");
const ampsDir = path.join(root, "packs/_source/amps");
const cards = fs.readdirSync(ampsDir).filter(f => !f.startsWith("_folder")).map(f => JSON.parse(fs.readFileSync(path.join(ampsDir, f), "utf8")));
const registry = Object.fromEntries(cards.map(c => [c.system.identifier, ampDefinition(c)]));
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const jutsu = Object.fromEntries(["packs/_source/jutsu", "packs/_source/clans"].flatMap(d => walk(path.join(root, d)))
  .filter(f => f.endsWith(".json") && !path.basename(f).startsWith("_folder")).map(f => JSON.parse(fs.readFileSync(f, "utf8")))
  .filter(d => d.type === "jutsu").map(d => [d.name, d]));

const BATCH1 = ["Gaslight", "Basilisk Art: Adaptive Camouflage", "Boil Release: Erupting Steam Wall", "Crystal Release: Crystal Armor", "Hanami Style: Sapping Fist",
  "Magnet Release: Dust Coat", "Beast Fist: Forceful Bull", "Beast Fist: Graceful Cat", "Beast Fist: Rushing Lion", "Beast Fist: Wise Turtle", "Cloak of Shadows",
  "Earth Release: Jade Devotion", "Enhanced Blocking", "Environmental Affinity", "Lightning Release: Spark", "Medical Release: Acid Armor", "Medical Release: Grim Mask",
  "Psionics: Fortress", "Psionics: Keen Meditation", "Semblance of Dread", "Warriors Zone", "Water Release: Viscous Water Mass", "Wind Release: Zephyr Strike"];
const REJECTED = ["Misty Hallucination", "Chakra Skin", "Earth Release: Bedrock Coffin", "Earth Release: Geo Breastplate", "Earth Release: Resonating Geo Isotoma",
  "Fire Release: Fox Fire", "Sealing Art: Chakra Mark"];

test("AMP1f batch 1: every confirmed jutsu starts its typeless, jutsu-owned card; Hijutsu aren't Clan", () => {
  for ( const name of BATCH1 ) {
    const j = jutsu[name];
    const button = j.system.activities.find(a => a.effect?.amp);
    assert.ok(button, `${name} has a button`);
    const def = registry[button.effect.amp];
    assert.ok(def, `${name}: its card exists`);
    assert.equal(def.ampType, "", `${name} is typeless (Q-F3, Q-F2 for Hijutsu)`);
    assert.deepEqual(def.owner, { kind: "jutsu", id: j.system.identifier, subclass: "" });
    assert.equal(ampAuditOf(j).status, "linked", `${name} leaves the candidates`);
  }
  assert.equal(cards.filter(c => c.system.owner?.kind === "jutsu").length, 156, "batch 1: 75; batch 2: 49 (3 in-the-aura cards); batch 3: 16; batch 4: 16 (1 in-the-aura card)");
});

test("King Q-F5 and batch 1 verdicts: rejected jutsu carry notAmp and leave the audit", () => {
  for ( const name of REJECTED ) {
    assert.ok(jutsu[name].flags?.n5e?.notAmp, name);
    assert.equal(ampAuditOf(jutsu[name]), null, name);
  }
  assert.match(jutsu["Chakra Skin"].flags.n5e.notAmp, /Q-F5/);
});

test("King Q-F1: a card per cast rank, the highest at or below the cast", () => {
  const base = "jutsu-shoton-crystal-release-crystal-armor";
  assert.equal(ampVersionFor(registry, base, 1, "D"), base);
  assert.equal(ampVersionFor(registry, base, 1, "C"), base, "C uses the D card");
  assert.equal(ampVersionFor(registry, base, 1, "B"), `${base}-b`);
  assert.equal(ampVersionFor(registry, base, 1, "A"), `${base}-b`);
  assert.equal(ampVersionFor(registry, base, 1, "S"), `${base}-s`);
  assert.equal(ampVersionFor(registry, base, 1, ""), base, "no rank: the base");
  assert.deepEqual(registry[`${base}-s`].changes.filter(c => c.key === "n5e.immune").map(c => c.value), ["bludgeoning", "piercing", "slashing"]);
  const acid = "jutsu-medical-release-acid-armor";
  assert.deepEqual(["D", "C", "B", "A", "S"].map(r => registry[ampVersionFor(registry, acid, 1, r)].tempHp), ["10", "15", "20", "25", "30"]);
  assert.equal(registry[`${acid}-c`].label, "Medical Release: Acid Armor (C-Rank)");
  assert.equal(ampVersionFor(registry, "jutsu-gaslight", 11, "E"), "jutsu-gaslight-11", "Gaslight grows by character level (AMP1g)");
  assert.equal(ampVersionFor(registry, "chakra-surge-flow", 20), "chakra-surge-flow-19", "level versions still work");
});

test("King Q-F1: an options menu adds the pick's effects (and its duration)", () => {
  const lion = registry["jutsu-beast-fist-rushing-lion"];
  assert.deepEqual(lion.choose.options.map(o => o.label), ["Strength", "Dexterity"]);
  const plan = withChoice(ampEffectPlan("jutsu-beast-fist-rushing-lion", lion), lion, 1);
  assert.ok(plan.changes.some(c => c.key === "system.abilities.dex.value" && c.value === "18"));
  assert.equal(plan.name, "Beast Fist: Rushing Lion: Dexterity");
  const gas = registry["jutsu-gaslight"];
  const reaction = withChoice(ampEffectPlan("jutsu-gaslight", gas), gas, 1);
  assert.equal(reaction.expires, "nextTurnEnd", "as a Reaction it lasts until the end of your next turn");
  assert.equal(reaction.concentration, false);
  assert.equal(withChoice(ampEffectPlan("jutsu-gaslight", gas), gas, 0).concentration, true);
  assert.deepEqual(validateIntent("applyAmp", { key: "jutsu-gaslight", targetUuid: "Actor.abcdefghijklmnop", choice: 1 }), { key: "jutsu-gaslight", targetUuid: "Actor.abcdefghijklmnop", choice: [1] });
});

test("AMP1f: a jutsu's Amp is owned by knowing the jutsu, starts only by casting, and counts for the limits", () => {
  const def = registry["jutsu-wind-release-zephyr-strike"];
  const caster = { system: { level: 5 }, items: [{ type: "jutsu", name: "Zephyr Strike", system: { identifier: "wind-release-zephyr-strike" } }], effects: [], flags: {} };
  assert.equal(ownsAmp(caster, def), true);
  assert.equal(ownsAmp({ items: [], effects: [] }, def), false);
  assert.ok(!ampCardsFor(caster, registry).some(c => c.key.startsWith("jutsu-")), "not offered on the Amps panel");
  const amp = id => ({ id, system: { ampType: "" } });
  assert.ok(ampLimitConflict([amp("1"), amp("2"), amp("3")], amp("4"), "ruleOfThree"), "a typeless jutsu Amp still counts for Rule of 3's");
});

const BATCH2 = ["Conqueror’s Art: Wyrmcaller’s Pulse", "Crystal Release: Crystal Wheel", "Hanami Style: Defensive Cloak", "Synthetic Art: Adaptive Biology",
  "Uzumaki Art: Red Hot-Blooded Vitality", "Breath of Sound: Score", "Earth Release: Sand Armor", "Fire Release: Flame Armor", "Guardian Knight", "Lightning Release: Jolt",
  "Lightning Release: Lightning Chakra Armor", "Lightning Release: Lightning King’s Mantle", "Medical Release: Medical Aura", "Royal Flush", "Sparking Flail",
  "Water Release: Blessing of Poseidon", "Wind Release: Wind Rider"];
const REJECTED2 = ["Adamantine Barrier", "Magnet Release: Dust Mesh", "Test Cutting: Senta Piercing", "Fire Release: Heated Body", "Outflank", "Shadow Clone Technique",
  "Water Release: Heavenly Mirror of Pain", "Wind Release: Vacuum Field"];

test("AMP1f batch 2: confirmed C-Rank jutsu start their cards; the rest leave the audit", () => {
  for ( const name of BATCH2 ) {
    const button = jutsu[name].system.activities.find(a => a.effect?.amp);
    assert.ok(registry[button?.effect?.amp], name);
    assert.equal(ampAuditOf(jutsu[name]).status, "linked", name);
  }
  for ( const name of REJECTED2 ) assert.equal(ampAuditOf(jutsu[name]), null, name);
  assert.match(jutsu["Fire Release: Heated Body"].flags.n5e.notAmp, /Q-F8/);
});

test("King Q-F6: an aura applies the Amp card; the aura card itself is outside the limits", () => {
  const mantle = "jutsu-lightning-release-lightning-kings-mantle";
  const c = registry[mantle];
  assert.equal(c.outsideLimits, true);
  assert.equal(c.aura.radius, 10);
  assert.equal(c.aura.effect.amp, `${mantle}-aura`);
  assert.equal(registry[ampVersionFor(registry, mantle, 1, "B")].aura.radius, 20);
  assert.equal(registry[ampVersionFor(registry, mantle, 1, "B")].aura.effect.amp, `${mantle}-aura-b`);
  const inAura = registry[`${mantle}-aura`];
  assert.equal(inAura.outsideLimits, false, "the Amp the aura gives counts toward Rule of 3's");
  assert.equal(inAura.ampType, "");
  const plan = ampEffectPlan(mantle, c);
  assert.equal(plan.aura.effect.amp, `${mantle}-aura`, "the effect carries the aura");
  const medical = registry["jutsu-medical-release-medical-aura-aura"];
  assert.ok(medical.changes.some(ch => ch.key === "n5e.conditionImmune" && ch.value === "bleed"));
});

test("King Q-F7 and Q-F9: two picks at A-Rank, and a changeable pick", async () => {
  const { ampChoiceUpdate } = await import("../module/rules/amp-cards.mjs");
  const bio = registry["jutsu-jinzo-synthetic-art-adaptive-biology"];
  const bioA = registry["jutsu-jinzo-synthetic-art-adaptive-biology-a"];
  assert.equal(bio.choose.count, 1);
  assert.equal(bioA.choose.count, 2);
  const fire = bioA.choose.options.findIndex(o => o.label === "Fire damage");
  const shaken = bioA.choose.options.findIndex(o => o.label === "Shaken (condition)");
  const plan = withChoice(ampEffectPlan("jutsu-jinzo-synthetic-art-adaptive-biology-a", bioA), bioA, [fire, shaken]);
  assert.deepEqual(plan.changes.map(c => `${c.key}=${c.value}`), ["n5e.resist=fire", "n5e.conditionResist=shaken"]);
  assert.deepEqual(plan.ampChoice, [fire, shaken]);
  const score = registry["jutsu-breath-of-sound-score"];
  assert.equal(score.choose.changeable, true);
  const swap = ampChoiceUpdate(score, [3]);
  assert.equal(swap.name, "Breath of Sound: Score: Andante");
  assert.ok(swap["flags.n5e.rules"].some(r => /Andante/.test(r.text ?? "")));
  assert.deepEqual(swap["flags.n5e.ampChoice"], [3]);
  const jolt = registry["jutsu-lightning-release-jolt-b"];
  assert.equal(withChoice(ampEffectPlan("jutsu-lightning-release-jolt-b", jolt), jolt, 1).tempHp, "5d10", "Overcharge steps the die up");
});

// AMP1f batch 3 (B-Rank), King 2026-11-20: Q-F10–Q-F14.
const BATCH3 = ["Plasma Release: Light Binding Step", "Full Sage: Nature Transfiguration", "Basilisk Art: Pythons Gaze", "Conqueror’s Art: Dragon Cloak", "Blade Heart",
  "Misleading Duplicate", "Fire Release: Investiture of Flame", "Medical Release: Investiture of Acid", "Medical Release: Strength of 100", "Bestial Art: Hunter",
  "Sealing Art: Gift of the Apex"];
const REJECTED3 = ["Lava Release: Rubber Wall Enhancement", "Spider Art: Silk Burial", "Kujaku Art: Star Wall", "Twin Rising Dragons", "Encroaching Darkness", "Memory Domination"];

test("AMP1f batch 3: 11 B-Rank jutsu start their cards; 6 marked not Amps (Q-F10 Twin Rising Dragons)", () => {
  for ( const name of BATCH3 ) {
    const button = jutsu[name].system.activities.find(a => a.effect?.amp);
    assert.ok(button && registry[button.effect.amp], `${name}: its button starts a card`);
    assert.equal(registry[button.effect.amp].ampType, "", `${name}: typeless (Q-F3)`);
  }
  for ( const name of REJECTED3 ) assert.ok(jutsu[name].flags?.n5e?.notAmp, `${name}: marked not an Amp`);
  assert.match(jutsu["Twin Rising Dragons"].flags.n5e.notAmp, /Q-F10/);
  assert.deepEqual(["B", "A", "S"].map(r => ampVersionFor(registry, "jutsu-ryu-conquerors-art-dragon-cloak", 20, r)).map(k => registry[k].tempHp),
    ["2d12 + 15", "3d12 + 15", "4d12 + 15"]);
});

test("King Q-F11: Blade Heart's Parrying stance is a button on the active Amp", () => {
  const def = registry["jutsu-blade-heart"];
  assert.equal(def.buttons.length, 1);
  const b = def.buttons[0];
  assert.deepEqual([b.label, b.activation, b.effect.expires], ["Parrying stance", "bonus", "turnStart"]);
  assert.deepEqual(b.effect.changes.map(c => [c.key, c.value]), [["system.bonuses.ac", "2"], ["n5e.save.dex", "2"]]);
});

test("King Q-F12: Misleading Duplicate's Amp carries the Invisible status", () => {
  const def = registry["jutsu-misleading-duplicate"];
  assert.deepEqual(def.statuses, ["invisible"]);
  assert.deepEqual(ampEffectPlan("jutsu-misleading-duplicate", def).statuses, ["invisible"]);
});

test("King Q-F13: Strength of 100 leaves its own condition, Overexerted, ending after an hour or a rest", () => {
  const def = registry["jutsu-medical-release-strength-of-100"];
  assert.equal(def.onEnd.condition, "medical-release-strength-of-100-overexerted");
  const card = JSON.parse(fs.readFileSync(path.join(root, "packs/_source/conditions/medical-release-strength-of-100-overexerted-n5eCondStr100Ovr.json"), "utf8"));
  assert.deepEqual([card.name, card.system.seconds, card.system.endsAt, card._id.length], ["Strength of 100: Overexerted", 3600, "rest", 16]);
  assert.deepEqual(card.flags.n5e.rules[0], { key: "disadvantage", selector: "check", predicate: "ability:str", label: "Strength of 100: Overexerted" });
});

test("AMP1f batch 3: n5e.vulnerable adds a damage vulnerability (the Investitures)", async () => {
  const { parseN5eChanges } = await import("../module/rules/change-keys.mjs");
  assert.deepEqual(parseN5eChanges([{ key: "n5e.vulnerable", value: "cold", mode: 2 }]).vulnerable, ["cold"]);
  assert.ok(registry["jutsu-fire-release-investiture-of-flame"].changes.some(c => c.key === "n5e.vulnerable" && c.value === "cold"));
});

/* AMP1f batch 4 (A and S-Rank), King 2026-11-21: Q-F15–Q-F20. */
const BATCH4 = ["Boil Release: Freight Train", "Lotus Nonself Connected Cannons", "Demon Hunter", "Overcomer", "Unlimited Pleasure",
  "Earth Release: Diamond Bone Hardening", "Medical Release: Aura of Power", "Wind Release: Neverending Breath", "Magnum Knuckle", "Supreme Violence",
  "Tiger Lily", "The Zone", "Fire Release: Body of Dawn", "Medical Release: Strength of 1000"];
const REJECTED4 = ["Demonic Instrument: Chains of Fantasia", "Moon-Fang Piercer", "Medical Release: Heal", "Water Release: Water Heavens Convergence"];
const condCard = file => JSON.parse(fs.readFileSync(path.join(root, "packs/_source/conditions", file), "utf8"));

test("AMP1f batch 4: 14 A and S-Rank jutsu start their cards; 4 marked not Amps (Q-F19 Water Heavens Convergence)", () => {
  for ( const name of BATCH4 ) {
    const button = jutsu[name].system.activities.find(a => a.effect?.amp);
    assert.ok(button && registry[button.effect.amp], `${name}: its button starts a card`);
    assert.equal(registry[button.effect.amp].ampType, "", `${name}: typeless (Q-F3)`);
  }
  for ( const name of REJECTED4 ) assert.ok(jutsu[name].flags?.n5e?.notAmp, `${name}: marked not an Amp`);
  assert.match(jutsu["Water Release: Water Heavens Convergence"].flags.n5e.notAmp, /Q-F19/);
  assert.deepEqual(["A", "S"].map(r => registry[ampVersionFor(registry, "jutsu-earth-release-diamond-bone-hardening", 20, r)].changes.find(c => c.key === "n5e.dr").value), ["14", "16"]);
  assert.equal(jutsu["Lotus Nonself Connected Cannons"].system.activities.find(a => a.effect?.amp).label, "Maintain the cannon", "Q-F18");
});

test("King Q-F15: Aura of Power gives allies the Amp and hostile creatures a −2 on saves against Ninjutsu", async () => {
  const { expandAuras, auraPlan } = await import("../module/rules/auras.mjs");
  const aura = registry["jutsu-medical-release-aura-of-power"].aura;
  assert.equal(aura.effect.amp, "jutsu-medical-release-aura-of-power-aura");
  assert.equal(aura.also[0].who, "hostile");
  assert.equal(registry["jutsu-medical-release-aura-of-power"].outsideLimits, true);
  const auras = expandAuras([{ uuid: "A", actorUuid: "me", disposition: 1, aura }]);
  assert.deepEqual(auras.map(a => [a.uuid, a.aura.who]), [["A", "friendly"], ["A#also0", "hostile"]]);
  const near = () => 5;
  const plan = auraPlan(auras, [{ actorUuid: "me", disposition: 1, distanceTo: near, children: [] }, { actorUuid: "ally", disposition: 1, distanceTo: near, children: [] },
    { actorUuid: "foe", disposition: -1, distanceTo: near, children: [] }]);
  assert.deepEqual(plan.add, [{ actorUuid: "ally", auraUuid: "A" }, { actorUuid: "foe", auraUuid: "A#also0" }], "not the caster (its allies of choice)");
  assert.deepEqual(registry["jutsu-medical-release-aura-of-power-aura"].rules[0], { key: "modifier", selector: "save", predicate: "against:jutsu:discipline:nin", value: 2, label: "Aura of Power" });
  assert.equal(aura.also[0].effect.rules[0].value, -2);
});

test("King Q-F16: Freight Train leaves Freight Train: Overheated, Incapacitated until the end of your next turn", async () => {
  const { cardDefinition } = await import("../module/rules/condition-cards.mjs");
  assert.equal(registry["jutsu-futton-boil-release-freight-train"].onEnd.condition, "boil-release-freight-train-overheated");
  const card = condCard("boil-release-freight-train-overheated-n5eCondFrtTrOvht.json");
  assert.deepEqual([card.name, card.system.endsAt, card._id.length], ["Freight Train: Overheated", "nextTurnEnd", 16]);
  assert.deepEqual(cardDefinition(card).statuses, ["incapacitated"]);
});

test("King Q-F17: Strength of 1000 ends with Strength of 100 and leaves Shock until a full rest", async () => {
  const { ampsEndingWith, activeAmpOfSeries } = await import("../module/rules/amp-cards.mjs");
  const def = registry["jutsu-medical-release-strength-of-1000"];
  assert.equal(def.endsWith, "jutsu-medical-release-strength-of-100");
  assert.equal(def.onEnd.condition, "medical-release-strength-of-1000-shock");
  assert.equal(def.duration.concentration, false);
  const effects = [{ id: "s100", type: "amp", system: { key: "jutsu-medical-release-strength-of-100" } }, { id: "s1000", type: "amp", system: { key: "jutsu-medical-release-strength-of-1000" } },
    { id: "other", type: "amp", system: { key: "jutsu-tiger-lily" } }];
  assert.deepEqual(ampsEndingWith(effects, "jutsu-medical-release-strength-of-100", registry), ["s1000"]);
  assert.deepEqual(ampsEndingWith(effects, "jutsu-tiger-lily", registry), []);
  assert.equal(activeAmpOfSeries(effects, def.endsWith, registry).id, "s100");
  const card = condCard("medical-release-strength-of-1000-shock-n5eCondStr1kShck.json");
  assert.deepEqual([card.name, card.system.endsAt], ["Strength of 1000: Shock", "fullRest"]);
});

test("King Q-F20: The Zone's pause button ends it without The Zone: Spent; any other end leaves it until a full rest", () => {
  const def = registry["jutsu-the-zone"];
  assert.deepEqual(def.buttons.map(b => [b.label, b.end]), [["End early (pause)", "pause"]]);
  assert.equal(def.onEnd.condition, "the-zone-spent");
  assert.equal(condCard("the-zone-spent-n5eCondZoneSpent.json").system.endsAt, "fullRest");
  assert.ok(def.changes.some(c => c.key === "n5e.saveDC.tai" && c.value === "1"));
});

test("AMP1f batch 4: Supreme Violence's AC is half the Taijutsu modifier; Tiger Lily 60 ft blindsight", () => {
  assert.deepEqual(registry["jutsu-supreme-violence"].changes[0], { key: "system.bonuses.ac", value: "floor(@disciplines.tai.mod / 2)", mode: 2 });
  assert.deepEqual(registry["jutsu-tiger-lily"].changes[0], { key: "system.traits.senses.blindsight", value: "60", mode: 4 });
});
