/** STD6d: the class automation engine pieces and the Medical-Nin data. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { jutsuFacts, resolveRankValues } from "../../module/rules/jutsu-facts.mjs";
import { availableCastOptions, applyCastOptions, levelRank } from "../../module/rules/cast-options.mjs";
import { actionEffectsOf, cardElements } from "../../module/rules/action-effects.mjs";
import { contextualRoll, rollOptions } from "../../module/rules/elements.mjs";
import { automationOf } from "../../module/rules/automation-summary.mjs";
import { effectiveActivities } from "../../module/rules/activity-parse.mjs";
import { parseN5eChanges } from "../../module/rules/change-keys.mjs";
import { validateConditionalRules } from "../../module/rules/effect-authoring.mjs";

const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name))
  : e.name.endsWith(".json") && !e.name.startsWith("_folder") ? [path.join(d, e.name)] : []);
const features = walk("packs/_source/features").map(f => JSON.parse(fs.readFileSync(f, "utf8")));
const feature = id => ({ ...features.find(f => f.system.identifier === id), id: id });
const jutsu = (name, keywords, rank = "C", activation = "action") => ({ type: "jutsu", name, system: { keywords: new Set(keywords), rank, discipline: "nin", activation: { type: activation }, description: "" } });

test("jutsu facts and rank-valued action effects", () => {
  assert.deepEqual(jutsuFacts(jutsu("Mystic Hand", ["medical"]), { rank: "B", discipline: "nin" }),
    ["jutsu", "jutsu:keyword:medical", "jutsu:rank:B", "jutsu:discipline:nin"]);
  assert.deepEqual(jutsuFacts({ type: "feat" }), []);
  assert.deepEqual(resolveRankValues([{ key: "maximizeDice", value: "@rankValue" }, { key: "modifier", value: "2*@rankValue" }], 3).map(r => r.value), [3, 6]);
  assert.doesNotThrow(() => validateConditionalRules([{ key: "maximizeDice", selector: "healing", value: "@rankValue" }]));
  const opts = rollOptions({ statuses: new Set(), effects: [], items: [] }, { kind: "damage", facts: jutsuFacts(jutsu("X", ["medical"])) });
  assert.ok(opts.has("jutsu:keyword:medical"));
});

test("cast options: name prefix, rank cap by level, cast as a Bonus Action; options pick their own action effect", () => {
  assert.equal(levelRank("lvl(2:D,10:C,18:B)", 12), "C");
  const reaper = feature("reapers-techniques");
  const actor = { system: { level: 9 }, items: [reaper], effects: [], flags: {} };
  const grimD = jutsu("Grim Reaping", [], "D");
  assert.equal(availableCastOptions(actor, grimD).length, 1);
  assert.equal(availableCastOptions(actor, jutsu("Grim Harvest", [], "C")).length, 0, "C-Rank only from 10th level");
  assert.equal(availableCastOptions({ ...actor, system: { level: 10 } }, jutsu("Grim Harvest", [], "C")).length, 1);
  assert.equal(availableCastOptions(actor, jutsu("Mystic Hand", [], "D")).length, 0, "not a Grim jutsu");
  const avail = availableCastOptions(actor, grimD);
  assert.deepEqual(applyCastOptions(actor, grimD, [{ id: avail[0].id }], avail, "D").castAs, ["bonus"]);

  const domain = feature("medical-domain");
  const named = new Map([[domain.id, ["Preserve Life"]]]);
  const fx = actionEffectsOf([domain], { only: named });
  assert.deepEqual(fx.map(f => f.label), ["Preserve Life"]);
  const card = fx.map(f => ({ ...f, rules: resolveRankValues(f.rules, 3) }));
  const extra = cardElements(card, { isActor: true, rollerUuid: "a" });
  const healer = { statuses: new Set(), effects: [], items: [] };
  assert.equal(contextualRoll(healer, { kind: "healing", type: "healing" }, null, extra).maximizeDice, 3, "B-Rank: 3 healing dice maximized");
  assert.equal(contextualRoll(healer, { kind: "damage", type: "damage" }, null, extra).maximizeDice, 0);
});

test("Hematoxic Touch rerolls 1s and 2s on the Medical jutsu's damage; Medical Release's Wisdom key parses", () => {
  const hema = feature("hematoxic-touch");
  const extra = cardElements(actionEffectsOf([hema]), { isActor: true, rollerUuid: "a" });
  assert.equal(contextualRoll({ statuses: new Set(), effects: [], items: [] }, { kind: "damage", type: "damage" }, null, extra).rerollBelow, 2);
  const changes = feature("medical-release").effects.flatMap(e => e.changes);
  assert.deepEqual(parseN5eChanges(changes).keywordAbility, { medical: ["wis"] });
});

test("Medical-Nin: every feature reviewed, text not parsed, the Automation tab lists cast options", () => {
  const med = features.filter(f => f.system.requirement?.class === "medical-nin");
  assert.equal(med.length, 51);
  for ( const f of med ) assert.equal(f.flags.n5e.reviewed, true, f.name);
  const front = feature("never-on-the-front-lines");
  assert.deepEqual(effectiveActivities(front), [], "a reviewed note-only feature gets no guessed buttons");
  assert.equal(automationOf(front).status, "note");
  const channeled = automationOf(feature("channeled-healing"));
  assert.equal(channeled.channels[0].kind, "Cast option");
  assert.match(channeled.channels[0].summary, /medical, heals/);
  const chakra = feature("chakra-enhanced-combat-combat-medic");
  assert.deepEqual(chakra.flags.n5e.rules.filter(r => r.key === "attacks").map(r => r.value), [2]);
  assert.equal(feature("healing-ascension").system.resourcePools[0].max, "lvl(2:3,10:5)");
});

test("Ninjutsu Specialist: clash advantage by keywords, Flow's concentration advantage, Overheat by level", async () => {
  const { contextualAdvantage, contextualModifiers } = await import("../../module/rules/elements.mjs");
  const tide = feature("tidebreaker-blaze-walker");
  const actor = { system: { level: 10 }, statuses: new Set(), effects: [], items: [tide] };
  const clash = against => ({ kind: "check", type: "skill", key: "nin",
    facts: ["clash", ...jutsuFacts(jutsu("Fire Ball", ["fireRelease"])), `clash:against:keyword:${against}`] });
  assert.deepEqual(contextualAdvantage(actor, clash("waterRelease")).advantage, ["Tidebreaker"]);
  assert.deepEqual(contextualAdvantage(actor, clash("earthRelease")).advantage, []);

  const flow = feature("chakra-surge").system.activities.find(a => a.label === "Enter Flow").effect;
  const inFlow = { system: { level: 5 }, statuses: new Set(), items: [], effects: [{ name: "Flow", flags: { n5e: { rules: flow.rules } } }] };
  const conc = d => ({ kind: "check", type: "skill", key: "cha", facts: ["concentration", `concentration:discipline:${d}`] });
  assert.deepEqual(contextualAdvantage(inFlow, conc("nin")).advantage, ["Flow"]);
  assert.deepEqual(contextualAdvantage(inFlow, conc("gen")).advantage, []);
  assert.ok(flow.rules.some(r => r.on === "turnStart" && r.pool === "focus"));

  const overheat = feature("over-the-limit-blaze-walker").system.activities[0].effect;
  const hot = level => ({ system: { level }, statuses: new Set(), items: [], effects: [{ name: "Overheat", flags: { n5e: { rules: overheat.rules } } }] });
  const fire = { kind: "damage", type: "damage", facts: jutsuFacts(jutsu("Fire Ball", ["fireRelease"])) };
  assert.equal(contextualModifiers(hot(6), fire).bonus, 2);
  assert.equal(contextualModifiers(hot(10), fire).bonus, 4);
  assert.equal(contextualModifiers(hot(10), { kind: "damage", type: "damage", facts: jutsuFacts(jutsu("Gust", ["windRelease"])) }).bonus, 0);
});

test("Ninjutsu Specialist: 0-cost Chakra Compression from 11th, Potent counts the lowest dice as maximum, every feature reviewed", async () => {
  const { maximizeAfterBonus } = await import("../../module/rules/elements.mjs");
  const comp = feature("chakra-compression");
  const at = level => availableCastOptions({ system: { level }, items: [comp], effects: [], flags: {} }, jutsu("Gust", [], "D"));
  assert.equal(at(10).length, 1, "only the −rank option before 11th");
  assert.equal(at(11).length, 2);
  const avail = at(11);
  const zero = avail.find(o => o.def.costDelta === "zero");
  assert.equal(applyCastOptions({ system: { level: 11 } }, jutsu("Gust", [], "D"), [{ id: zero.id }], avail, "D").zeroCost, true);
  assert.equal(maximizeAfterBonus([{ faces: 10, result: 1 }, { faces: 10, result: 9 }, { faces: 10, result: 4 }, { faces: 10, result: 2 }], 3), 9 + 8 + 6);
  const potent = cardElements(actionEffectsOf([feature("potent-ninjutsu")]), { isActor: true, rollerUuid: "a" });
  assert.equal(contextualRoll({ statuses: new Set(), effects: [], items: [] }, { kind: "damage", type: "damage" }, null, potent).maximizeAfter, 3);
  const nin = features.filter(f => f.system.requirement?.class === "ninjutsu-specialist");
  assert.equal(nin.length, 84);
  for ( const f of nin ) assert.equal(f.flags.n5e.reviewed, true, f.name);
  assert.equal(automationOf(feature("quickened-ninjutsu")).channels[0].kind, "Casting time");
});
