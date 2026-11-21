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
  assert.equal(cards.filter(c => c.system.owner?.kind === "jutsu").length, 75);
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
  assert.deepEqual(validateIntent("applyAmp", { key: "jutsu-gaslight", targetUuid: "Actor.abcdefghijklmnop", choice: 1 }), { key: "jutsu-gaslight", targetUuid: "Actor.abcdefghijklmnop", choice: 1 });
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
