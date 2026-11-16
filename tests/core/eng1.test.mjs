/** ENG1: missing capabilities (per-turn healing, damage and saves on effects; formulas that read the target; marks). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { triggersFor, triggerOutcomes } from "../../module/rules/triggers.mjs";
import { targetFormula, conditionRanksOn } from "../../module/rules/target-formula.mjs";
import { validateConditionalRules } from "../../module/rules/effect-authoring.mjs";
import { summarizeElement } from "../../module/rules/action-effects.mjs";

const table = cls => JSON.parse(fs.readFileSync(`content/automation/${cls}.json`, "utf8")).features;

test("ENG1a: an effect's turn triggers heal, post damage and roll a save that ends it", () => {
  // CCOND1b: Life Pulse and Hemorrhage Vitality are condition cards; the cast options apply them and
  // the cards' rules ride on the condition (the end-of-turn save is the card's resave).
  const cardRules = key => {
    const dir = "packs/_source/conditions";
    return JSON.parse(fs.readFileSync(`${dir}/${fs.readdirSync(dir).find(f => f.startsWith(`${key}-`))}`, "utf8"));
  };
  assert.equal(table("medical-nin")["medical-perfection-supreme-medic"].castOptions.find(o => o.label.startsWith("Hemorrhage")).effect.condition, "hemorrhage-vitality");
  const hemoCard = cardRules("hemorrhage-vitality");
  const hemo = hemoCard.flags.n5e.rules;
  validateConditionalRules(hemo);
  const victim = { statuses: new Set(), items: [], effects: [{ id: "fx1", name: "Hemorrhage Vitality", changes: [], flags: { n5e: { rules: hemo } } }] };
  const start = triggerOutcomes(triggersFor(victim, "turnStart"));
  assert.deepEqual(start.damage.map(d => [d.formula, d.type, d.who]), [["6d6", "necrotic", "self"], ["6d6", "chakra", "self"]]);
  assert.deepEqual(hemoCard.system.resave, { ability: "con", source: "nin", dc: null });

  const pulse = cardRules("life-pulse").flags.n5e.rules;
  const ally = { statuses: new Set(), items: [], effects: [{ id: "fx2", changes: [], flags: { n5e: { rules: pulse } } }] };
  assert.deepEqual(triggerOutcomes(triggersFor(ally, "turnStart")).heal.map(h => [h.formula, h.pool]), [["4d6", "hp"], ["2d6", "cp"]]);

  assert.equal(table("ninjutsu-specialist")["over-the-limit-blaze-walker"].activities[0].effect.amp, "crash-overheat");
  const ampDir = "packs/_source/amps";
  const overheat = fs.readdirSync(ampDir).filter(n => !n.startsWith("_folder")).map(n => JSON.parse(fs.readFileSync(`${ampDir}/${n}`, "utf8")))
    .find(c => c.system.identifier === "crash-overheat").flags.n5e.rules;
  const hot = { system: { level: 6 }, statuses: new Set(), items: [], effects: [{ id: "fx3", changes: [], flags: { n5e: { rules: overheat } } }] };
  assert.deepEqual(triggerOutcomes(triggersFor(hot, "turnEnd")).damage.map(d => [d.formula, d.type, d.unreducible]), [["1d6", "fire", true]]);
  assert.match(summarizeElement(overheat.find(r => r.on)), /Takes 1d6 fire damage \(can't be reduced\)/);
});

test("ENG1a: formulas read the target's condition ranks and states; marks carry a limit", () => {
  const target = { effects: [{ system: { key: "envenomed", ranks: 3 } }, { system: { key: "bleed", ranks: 1 } }, { flags: { n5e: { state: "blighted" } } }] };
  assert.equal(conditionRanksOn(target, "envenomed"), 3);
  assert.equal(targetFormula("(@target.ranks.envenomed)d12", target), "(3)d12");
  assert.equal(targetFormula("(@target.ranks.envenomed)d12", null), "(0)d12");
  assert.equal(targetFormula("@target.state.blighted * 2", target), "1 * 2");
  const curse = table("medical-nin")["reapers-arsenal"].activities[0].effect;
  assert.equal(curse.limit, "lvl(2:1,18:2)");
  assert.equal(table("medical-nin")["toxic-chakra"].activities.find(a => a.label === "Septic Detonation").damage.parts[0].formula, "(@target.ranks.envenomed)d12");
});

test("ENG1b: Widened, Dragwind and Subtle change the jutsu as cast", async () => {
  const { castShaping } = await import("../../module/rules/elements.mjs");
  const { areaOf } = await import("../../module/rules/area.mjs");
  const { jutsuComponents } = await import("../../module/rules/cast-checks.mjs");
  const nin = table("ninjutsu-specialist");
  const fx = (entry, name) => ({ rules: entry.effects.find(e => e.name === name).rules });
  const widened = castShaping([fx(nin["widened-ninjutsu"], "Widened Ninjutsu")]);
  const cone = { target: { area: { shape: "cone", size: 15 } } };
  assert.equal(areaOf(cone, { grow: widened.grow }).size, 25);
  assert.equal(areaOf({ target: { area: { shape: "sphere", size: 10 } } }, { grow: widened.grow }).size, 15);
  const drag = castShaping([fx(nin["tempest-pressure-storm-terror"], "Dragwind")], 10);
  assert.equal(areaOf(cone, { grow: drag.grow }).size, 25, "+10 ft at 10th level");
  assert.deepEqual(castShaping([fx(nin["subtle-ninjutsu"], "Subtle Ninjutsu")]).ignore, ["hs"]);
  assert.deepEqual(jutsuComponents({ system: { components: { hs: true, cm: true } } }).filter(c => !["hs"].includes(c)), ["cm"]);
});

test("ENG1c: a nearby creature's reaction protects the damaged one (Vitality Guard)", async () => {
  const { allyReactionOffers, authoredReactionOffers } = await import("../../module/rules/authored-reactions.mjs");
  const fs2 = (await import("node:fs")).default;
  const walk = d => fs2.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith(".json") ? [`${d}/${e.name}`] : []);
  const asc = walk("packs/_source/features").map(f => JSON.parse(fs2.readFileSync(f, "utf8"))).find(d => d.system?.identifier === "healing-ascension");
  const medic = (state, extra = {}) => ({ name: "Medic", statuses: new Set(), flags: { n5e: { economy: {} } }, items: [{ ...asc, id: "asc" }],
    effects: state ? [{ flags: { n5e: { state } } }] : [], system: { resources: { healingSurges: { value: 2 } } }, ...extra });
  const ally = { name: "Ally", statuses: new Set(), items: [], effects: [] };
  const hit = { combat: true, instances: [{ amount: 10, type: "fire" }] };
  const offers = allyReactionOffers(ally, { ...hit, others: [{ actor: medic("ascension"), distance: 25 }] });
  assert.deepEqual(offers.map(o => [o.reactor.name, o.terms.multiplier, o.terms.cost]), [["Medic", 0.5, 1]]);
  assert.equal(allyReactionOffers(ally, { ...hit, others: [{ actor: medic("ascension"), distance: 35 }] }).length, 0, "out of range");
  assert.equal(allyReactionOffers(ally, { ...hit, others: [{ actor: medic(null), distance: 10 }] }).length, 0, "not in Ascension");
  assert.equal(allyReactionOffers(ally, { ...hit, others: [{ actor: medic("ascension", { system: { resources: { healingSurges: { value: 0 } } } }), distance: 10 }] }).length, 0, "no Surge");
  assert.equal(authoredReactionOffers(medic("ascension"), hit).length, 0, "not for the medic itself");
});

test("ENG1d: auras give their effect to the right creatures in range, and take it back", async () => {
  const { auraPlan, auraCounts } = await import("../../module/rules/auras.mjs");
  assert.equal(auraCounts("hostile", 1, -1), true);
  assert.equal(auraCounts("hostile", 1, 1), false);
  assert.equal(auraCounts("hostile", 1, 0), false, "neutral creatures aren't hostile");
  assert.equal(auraCounts("friendly", 1, 1), true);
  const bastion = table("ninjutsu-specialist")["mountains-aegis-bastion-stone-crusher"].activities[0].effect.aura;
  const auras = [{ uuid: "A.bastion", actorUuid: "A", disposition: 1, aura: bastion }];
  const at = (actorUuid, disposition, feet, children = []) => ({ actorUuid, disposition, distanceTo: () => feet, children });
  const plan = auraPlan(auras, [at("A", 1, 0), at("B", 1, 15), at("C", 1, 25), at("D", -1, 5),
    at("E", 1, 40, [{ auraFrom: "A.bastion", effectId: "e1" }]), at("F", 1, 5, [{ auraFrom: "gone", effectId: "e2" }])]);
  assert.deepEqual(plan.add.map(a => a.actorUuid), ["A", "B", "F"], "itself and allies within 20 ft");
  assert.deepEqual(plan.remove.map(r => [r.actorUuid, r.effectId]), [["E", "e1"], ["F", "e2"]], "left the aura; its aura ended");
  assert.deepEqual(bastion.effect.changes.map(c => c.value), ["bruised", "dazed", "chilled"]);
  const storm = table("ninjutsu-specialist")["storm-terror-storm-terror"].castOptions[0].effect.aura.effect.rules[0];
  const { rollOptions } = await import("../../module/rules/elements.mjs");
  assert.ok(rollOptions({ statuses: new Set(), effects: [], items: [] }, { kind: "attack", ranged: true }).has(storm.predicate));
});
