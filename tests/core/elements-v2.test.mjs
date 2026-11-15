/** STD1/STD2: rule elements v2 and action effects (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { gatherElements, contextualRoll, contextualAdvantage, shapeDice, mergeHandling, actsFromActor } from "../../module/rules/elements.mjs";
import { actionEffectsOf, cardElements, spentBy, describeElement } from "../../module/rules/action-effects.mjs";
import { validateConditionalRules } from "../../module/rules/effect-authoring.mjs";

const actor = (rules = [], extra = {}) => ({ uuid: extra.uuid ?? "A", system: {}, statuses: new Set(), items: [], effects: [],
  allApplicableEffects: function* () { yield { name: "Src", flags: { n5e: { rules } }, disabled: false }; }, ...extra });

test("directions: self acts from the actor; action-scoped and triggered ones do not; against acts on rolls aimed at the owner", () => {
  assert.equal(actsFromActor({ key: "advantage" }), true);
  assert.equal(actsFromActor({ key: "advantage", scope: "action" }), false);
  assert.equal(actsFromActor({ key: "advantage", direction: "imposed" }), false);
  assert.equal(actsFromActor({ key: "advantage", on: "hit" }), false);
  const dodger = actor([{ key: "disadvantage", selector: "attack", direction: "against", label: "Dodging" }], { uuid: "T" });
  const me = actor([]);
  const got = contextualAdvantage(me, { kind: "attack", type: "attack" }, dodger);
  assert.deepEqual(got.disadvantage, ["Dodging"]);
  assert.deepEqual(contextualAdvantage(dodger, { kind: "attack", type: "attack" }, null).disadvantage, [], "not on its own attacks");
});

test("contextualRoll collects the non-numeric keys", () => {
  const a = actor([{ key: "autoSucceed", selector: "save", label: "Iron Will" }, { key: "critRange", selector: "attack", value: 1 },
    { key: "reroll", selector: "save", mode: "higher", label: "Lucky" }, { key: "damage", selector: "damage", formula: "1d6", damageType: "fire" },
    { key: "damageHandling", selector: "damage", ignoreResistance: true, drMultiplier: 0.5 }, { key: "note", selector: "save", text: "Remember" }]);
  const save = contextualRoll(a, { kind: "save", type: "save", key: "wis" });
  assert.deepEqual(save.autoSucceed, ["Iron Will"]);
  assert.equal(save.reroll.mode, "higher");
  assert.equal(save.notes.length, 1);
  assert.equal(contextualRoll(a, { kind: "attack", type: "attack" }).critRange, 1);
  const dmg = contextualRoll(a, { kind: "damage", type: "damage" });
  assert.deepEqual(dmg.damage, [{ formula: "1d6", type: "fire", label: "Src" }]);
  assert.deepEqual(dmg.handling, { ignoreResistance: true, immunityAsResistance: false, drMultiplier: 0.5 });
  assert.deepEqual(mergeHandling(dmg.handling, { drMultiplier: 0.25, immunityAsResistance: true }), { ignoreResistance: true, immunityAsResistance: true, drMultiplier: 0.25 });
});

test("dice shaping", () => {
  assert.equal(shapeDice("2d6 + 3", { maximize: 1 }), "6 + 1d6 + 3");
  assert.equal(shapeDice("1d8", { minimum: 3 }), "1d8min3");
  assert.equal(shapeDice("1d8", {}), "1d8");
});

test("action effects: copied from chosen items; self for the actor, imposed for targets; uses and one target", () => {
  const precise = { id: "p", name: "Precise Ninjutsu", effects: [{ id: "e1", name: "Precise Ninjutsu", flags: { n5e: { applyTo: "action", rules: [{ key: "advantage", selector: "attack", direction: "self", scope: "action" }] } } }] };
  const heightened = { id: "h", name: "Heightened Ninjutsu", effects: [{ id: "e2", name: "Heightened Ninjutsu", flags: { n5e: { applyTo: "action", rules: [{ key: "disadvantage", selector: "save", direction: "imposed", scope: "action", targets: "one", uses: 1 }] } } },
    { id: "e3", name: "Other", flags: { n5e: {} } }] };
  const fx = actionEffectsOf([precise, heightened]);
  assert.deepEqual(fx.map(f => f.id), ["p.e1", "h.e2"]);
  const forCaster = cardElements(fx, { isActor: true, rollerUuid: "C" });
  assert.deepEqual(forCaster.map(x => x.element.key), ["advantage"]);
  const t1 = cardElements(fx, { isActor: false, rollerUuid: "T1" });
  assert.deepEqual(t1.map(x => x.element.key), ["disadvantage"]);
  const consumed = spentBy(t1, "T1");
  assert.deepEqual(consumed, [{ elementId: "h.e2#0", rollerUuid: "T1" }]);
  assert.deepEqual(cardElements(fx, { isActor: false, rollerUuid: "T2", consumed }), [], "one target: the first to roll used it");
  const target = actor([], { uuid: "T2" });
  assert.deepEqual(gatherElements(target, { kind: "save", type: "save" }, null, t1).map(g => g.label), ["Heightened Ninjutsu"]);
  assert.match(describeElement(heightened.effects[0].flags.n5e.rules[0]), /Disadvantage on one target's first save/);
});

test("validation: v2 keys and fields", () => {
  assert.doesNotThrow(() => validateConditionalRules([{ key: "damageHandling", selector: "damage", direction: "self", scope: "action", ignoreResistance: true, immunityAsResistance: true, drMultiplier: 0.5 }]));
  assert.doesNotThrow(() => validateConditionalRules([{ key: "note", text: "Read me" }]));
  assert.throws(() => validateConditionalRules([{ key: "advantage", selector: "attack", direction: "sideways" }]), /direction/);
  assert.throws(() => validateConditionalRules([{ key: "reroll", selector: "save" }]), /reroll mode/);
  assert.throws(() => validateConditionalRules([{ key: "advantage", selector: "attack", bogus: 1 }]), /Unsupported property/);
  assert.throws(() => validateConditionalRules([{ key: "disadvantage", selector: "save", uses: 0 }]), /uses/);
});

test("STD4: attacks, initiative choices, active stance option, trigger outcomes", async () => {
  const { attackElements, initiativeChoices, rollOptions } = await import("../../module/rules/elements.mjs");
  const { triggerOutcomes } = await import("../../module/rules/triggers.mjs");
  const a = { system: { combat: { activeStance: "s1" } }, statuses: new Set(), effects: [],
    items: [{ id: "s1", type: "stance", name: "Binding Fury Stance", system: {}, flags: {} },
      { id: "x", type: "feat", name: "Extra Attack", flags: { n5e: { rules: [{ key: "attacks", value: 2 }, { key: "attacks", value: 3, implementsOnly: true }] } } },
      { id: "y", type: "feat", name: "Adaptive Initiative", flags: { n5e: { rules: [{ key: "initiativeOptions", skills: ["ath", "ins"], text: "GM decides." }] } } }] };
  assert.deepEqual(attackElements(a), { base: 2, implements: 3, notes: [] });
  assert.deepEqual(initiativeChoices(a).skills, ["ath", "ins"]);
  assert.ok(rollOptions(a).has("self:stance:binding-fury-stance"));
  const out = triggerOutcomes([{ element: { key: "inflict", condition: "prone", who: "target", oncePerTurn: true }, label: "Trip", key: "k" },
    { element: { key: "note", text: "Remember" }, label: "Tip", key: "n" }]);
  assert.deepEqual(out.inflict, [{ condition: "prone", ranks: 1, who: "target", label: "Trip" }]);
  assert.deepEqual(out.notes, ["Tip: Remember"]);
  assert.deepEqual(out.onceKeys, ["k"]);
  assert.doesNotThrow(() => validateConditionalRules([{ key: "resource", on: "damageDealt", selector: "damage:weapon", pool: "fury", amount: 1, oncePerTurn: true, predicate: "self:stance:x" }]));
});
