/** AMP1e: typeless self-buff states, stances in the audit, Coordinated conditions (docs/AMP1E_SPEC.md). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import "./helpers/actor.mjs";
import { ampDefinition, ampEffectPlan, ampLimitConflict, ampsEndingOn, ampCardsFor, AMP_END_TRIGGERS } from "../module/rules/amp-cards.mjs";
import { AmpCardData } from "../module/data/item/amp-card.mjs";
import { ampAuditOf } from "../module/rules/amp-audit.mjs";
import { isFinisherCast } from "../module/rules/cast-tracking.mjs";
import { cardDefinition, resolveCardLevels } from "../module/rules/condition-cards.mjs";
import { parseN5eChanges } from "../module/rules/change-keys.mjs";

const root = path.join(import.meta.dirname, "..");
const read = f => JSON.parse(fs.readFileSync(path.join(root, f), "utf8"));
const ampsDir = "packs/_source/amps";
const cardFile = (dir, id) => fs.readdirSync(path.join(root, dir)).find(f => f.startsWith(`${id}-`));
const ampCard = id => read(path.join(ampsDir, cardFile(ampsDir, id)));
const condition = id => read(path.join("packs/_source/conditions", cardFile("packs/_source/conditions", id)));

test("King Q-E1: every stance is labelled Stance in the audit, never a candidate", () => {
  for ( const dir of ["packs/_source/stances", "packs/_source/clans"] ) {
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    for ( const f of walk(path.join(root, dir)).filter(x => x.endsWith(".json")) ) {
      const doc = JSON.parse(fs.readFileSync(f, "utf8"));
      if ( doc.type !== "stance" ) continue;
      assert.equal(ampAuditOf(doc).status, "stance", doc.name);
    }
  }
});

test("King Q-E3: an Amp outside the limits never triggers Rule of 3's and takes no place in it", () => {
  assert.ok(Object.keys(AmpCardData.defineSchema()).includes("outsideLimits"));
  const amp = (id, extra = {}) => ({ id, system: { ampType: "battle", ...extra } });
  const three = [amp("1"), amp("2"), amp("3")];
  assert.equal(ampLimitConflict(three, amp("4", { ampType: "", outsideLimits: true }), "ruleOfThree"), null, "it doesn't trigger the limit");
  const withForm = [amp("1"), amp("2"), amp("f", { ampType: "", outsideLimits: true })];
  assert.equal(ampLimitConflict(withForm, amp("4"), "ruleOfThree"), null, "it doesn't take one of the three places");
  const c = ampLimitConflict([...three, amp("f", { ampType: "", outsideLimits: true })], amp("4"), "ruleOfThree");
  assert.deepEqual(c.candidates.map(a => a.id), ["1", "2", "3", "4"], "it is never offered in the keep dialog");
});

test("AMP1e: DYNAMIC FORM! and Flawless are typeless cards outside the limits, owned by their features", () => {
  const form = ampDefinition(ampCard("dynamic-form"));
  assert.equal(form.ampType, "");
  assert.equal(form.outsideLimits, true);
  assert.deepEqual(form.endsOn, ["finisherCast"]);
  assert.equal(form.duration.until, "combatEnd", "it also ends when initiative ends");
  assert.deepEqual(form.owner, { kind: "feat", id: "never-ending-combo", subclass: "" });
  assert.equal(form.state, "dynamicForm", "rules that check the state still see it");
  const flawless = ampDefinition(ampCard("flawless"));
  assert.equal(flawless.ampType, "");
  assert.equal(flawless.outsideLimits, true);
  assert.equal(flawless.startOnInitiative, "auto");
  assert.equal(flawless.duration.until, "combatEnd");
  assert.deepEqual(flawless.owner, { kind: "feat", id: "genius-talent", subclass: "" });
  const plan = ampEffectPlan("flawless", flawless);
  assert.equal(plan.outsideLimits, true, "the effect carries it, so the limits see it");
  const actor = { system: { level: 3 }, items: [{ type: "feat", name: "Genius Talent", system: { identifier: "genius-talent" } }], effects: [], flags: {} };
  const row = ampCardsFor(actor, { flawless }).find(r => r.key === "flawless");
  assert.ok(row?.outsideLimits, "the Amps panel marks it");
});

test("AMP1e: the feature buttons start the cards", () => {
  const acts = f => read(f).system.activities.map(a => a.effect?.amp).filter(Boolean);
  assert.ok(acts("packs/_source/features/never-ending-combo-n5eIhlSdNECLxjGJ.json").includes("dynamic-form"));
  assert.ok(acts("packs/_source/features/genius-talent-n5eu2Casb4aurgnd.json").includes("flawless"));
});

test("AMP1e: casting a Finisher ends the Amps that end on one", () => {
  assert.ok(AMP_END_TRIGGERS.finisherCast);
  assert.equal(isFinisherCast({ type: "jutsu", system: { keywords: ["taijutsu", "finisher"] } }), true);
  assert.equal(isFinisherCast({ type: "jutsu", system: { keywords: new Set(["combo"]) } }), false);
  assert.equal(isFinisherCast({ type: "feat", system: { keywords: ["finisher"] } }), false);
  const actor = { effects: [
    { id: "form", type: "amp", disabled: false, flags: { n5e: { ampEnds: ["finisherCast", "combatEnd"] } } },
    { id: "other", type: "amp", disabled: false, flags: { n5e: { ampEnds: ["staggered"] } } }] };
  assert.deepEqual(ampsEndingOn(actor, "finisherCast").map(e => e.id), ["form"]);
});

test("King Q-E4/Q-E5: Coordinated is a condition card scaled by the Nara's character level", () => {
  const combat = cardDefinition(condition("nara-combat-coordinated"));
  assert.equal(combat.owner.id, "nara");
  const at = level => parseN5eChanges(resolveCardLevels(combat, level).changes).mastery.filter(m => m.target === "initiative").length;
  assert.equal(at(5), 1);
  assert.equal(at(7), 2);
  assert.equal(at(15), 3);
  assert.equal(resolveCardLevels(combat, null).changes, null, "without an applier the bearer's level is used later");
  const social = cardDefinition(condition("nara-diplomatic-coordinated"));
  assert.deepEqual(social.choose.options.map(o => o.label), ["Deception", "Persuasion", "Intimidation"]);
  const picked = resolveCardLevels(social, 16).choose.options[1];
  assert.equal(picked.key, "n5e.mastery.skill.per");
  assert.equal(parseN5eChanges([picked]).mastery.length, 3, "3 ranks at 15th");
  const team = read("packs/_source/clans/organized/land-of-fire/nara/features/team-coordination-5fb8e872dffc694d.json");
  assert.deepEqual(team.system.activities.map(a => a.effect.condition), ["nara-combat-coordinated", "nara-diplomatic-coordinated"]);
  const box = read("packs/_source/clans/organized/land-of-fire/nara/features/operational-contingencies-da810dd0a8f3e2e0.json");
  assert.equal(ampAuditOf(box), null, "the Nara box is a condition, not an Amp candidate");
});

test("AMP1e: a Mastery source written 'Source ×N' raises N steps", () => {
  const m = parseN5eChanges([{ key: "n5e.mastery.skill.dec", value: "Words ×2" }, { key: "n5e.mastery.skill.ath", value: "Plain" }]).mastery;
  assert.deepEqual(m.map(x => `${x.target}:${x.source}`), ["skill.dec:Words 1", "skill.dec:Words 2", "skill.ath:Plain"]);
});

test("King Q-E4: no Combat Coordinated Amp card is left", () => {
  const ids = fs.readdirSync(path.join(root, ampsDir)).filter(f => !f.startsWith("_folder")).map(f => read(path.join(ampsDir, f)).system.identifier);
  assert.ok(!ids.some(id => id.startsWith("combat-coordinated")));
});
