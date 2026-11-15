/** STD6b: stance weapons, roll facts, rerollBelow, criticalHit triggers, stance data. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { qualifiesForStance, weaponFacts } from "../../module/rules/stance-weapons.mjs";
import { contextualAdvantage, contextualRoll, rollOptions, shapeDice, ELEMENT_EVENTS } from "../../module/rules/elements.mjs";
import { triggersFor, triggerOutcomes } from "../../module/rules/triggers.mjs";
import { automationOf } from "../../module/rules/automation-summary.mjs";
import { validateConditionalRules } from "../../module/rules/effect-authoring.mjs";

const dir = "packs/_source/stances";
const stances = fs.readdirSync(dir).filter(n => !n.startsWith("_")).map(n => JSON.parse(fs.readFileSync(path.join(dir, n), "utf8")));
const stance = name => stances.find(s => s.name === name);
const weapon = (name, groups = [], properties = {}) => ({ id: name, name, type: "weapon", system: { groups, properties, equipped: true } });

/** An actor in a stance (the stance item active), with the stance's transfer effects for its level. */
function inStance(name, level = 1, extra = {}) {
  const s = { ...stance(name), id: "st" };
  const effects = (s.effects ?? []).filter(e => {
    const g = e.flags?.n5e?.levels;
    return !g || ((!g.min || level >= g.min) && (!g.max || level <= g.max));
  });
  return { system: { combat: { activeStance: "st" } }, statuses: new Set(extra.statuses ?? []), effects, items: [s], allApplicableEffects: () => effects };
}

test("Q-S1: the stance weapons qualify by group, property or item", () => {
  const katana = weapon("Katana", ["blade"], { deadly: 1 });
  const club = weapon("Great Club", ["power"], { heavy: 1, twoHanded: 1 });
  const claw = weapon("Iron Claw", [], {});
  assert.equal(qualifiesForStance(katana, stance("Blade Stance")), true);
  assert.equal(qualifiesForStance(club, stance("Blade Stance")), false);
  assert.equal(qualifiesForStance(club, stance("Great Weapon Stance")), true);
  assert.equal(qualifiesForStance(club, stance("Power Stance")), true);
  assert.equal(qualifiesForStance(claw, stance("Silent Killing")), true);
  assert.equal(qualifiesForStance(katana, stance("Silent Killing")), true, "Deadly");
  assert.equal(qualifiesForStance(katana, stance("Iron Fist Stance")), false, "no list, nothing qualifies");
  assert.deepEqual(weaponFacts(katana, stance("Blade Stance")), ["weapon", "weapon:group:blade", "weapon:property:deadly", "weapon:stance"]);
  assert.deepEqual(weaponFacts(null), ["weapon:unarmed"]);
  const opts = rollOptions({ statuses: new Set(), effects: [], items: [] }, { kind: "attack", facts: ["attack:opportunity", "weapon:stance"] });
  assert.ok(opts.has("attack:opportunity") && opts.has("weapon:stance"));
});

test("Blade: advantage on Opportunity Attacks with a Ronin weapon only", () => {
  const actor = inStance("Blade Stance");
  const facts = weaponFacts(weapon("Katana", ["blade"]), stance("Blade Stance"));
  const spec = { kind: "attack", type: "weaponAttack", scope: "weapon" };
  assert.deepEqual(contextualAdvantage(actor, { ...spec, facts: [...facts, "attack:opportunity"] }).advantage, ["Blade Stance"]);
  assert.deepEqual(contextualAdvantage(actor, { ...spec, facts }).advantage, [], "not an Opportunity Attack");
  assert.deepEqual(contextualAdvantage(actor, { ...spec, facts: ["weapon", "attack:opportunity"] }).advantage, [], "not a Ronin weapon");
});

test("criticalHit triggers: Blade's Bleeding (one more at 10th), Power's Bruised", () => {
  assert.ok(ELEMENT_EVENTS.includes("criticalHit"));
  const ronin = { kind: "attack", type: "weaponAttack", facts: weaponFacts(weapon("Katana", ["blade"]), stance("Blade Stance")) };
  const at = level => triggerOutcomes(triggersFor(inStance("Blade Stance", level), "criticalHit", { spec: ronin })).inflict;
  assert.deepEqual(at(1).map(i => [i.condition, i.ranks, i.who]), [["bleed", 1, "target"]]);
  assert.equal(at(10).length, 2);
  assert.equal(triggersFor(inStance("Blade Stance"), "criticalHit", { spec: { kind: "attack", facts: ["weapon"] } }).length, 0);
  const raid = { kind: "attack", facts: weaponFacts(weapon("Maul", ["power"]), stance("Power Stance")) };
  assert.deepEqual(triggerOutcomes(triggersFor(inStance("Power Stance"), "criticalHit", { spec: raid })).inflict.map(i => i.condition), ["bruised"]);
});

test("Q-S2 Great Weapon: every weapon damage die rerolls 1s and 2s once, with a Berserker weapon", () => {
  const actor = inStance("Great Weapon Stance");
  const dmg = facts => ({ kind: "damage", type: "damage", scope: "weapon", facts });
  const heavy = weaponFacts(weapon("Great Sword", ["blade"], { heavy: 1 }), stance("Great Weapon Stance"));
  assert.equal(contextualRoll(actor, dmg(heavy)).rerollBelow, 2);
  assert.equal(contextualRoll(actor, dmg(["weapon"])).rerollBelow, 0);
  assert.equal(shapeDice("2d6 + 1d6 + 3", { rerollBelow: 2 }), "2d6r<=2 + 1d6r<=2 + 3");
  assert.equal(shapeDice("1d12", { rerollBelow: 2, minimum: 3 }), "1d12min3r<=2");
  assert.equal(shapeDice("1d10r<=2", { rerollBelow: 2 }), "1d10r<=2", "never twice");
  assert.equal(stance("Great Weapon Stance").flags.n5e.weaponDie, undefined, "the old die flag is gone");
  assert.equal(contextualRoll(actor, dmg(heavy)).critAbilityMod, 1, "King: a critical hit triples the modifier (the rule doubles it, the stance adds one more)");
  assert.equal(contextualRoll(actor, dmg(["weapon"])).critAbilityMod, 0);
});

test("Guardian: Dodging gives advantage on Strength and Dexterity saves", () => {
  const save = key => ({ kind: "save", type: "save", key });
  assert.deepEqual(contextualAdvantage(inStance("Guardian Stance", 1, { statuses: ["dodging"] }), save("str")).advantage, ["Guardian Stance (Dodging)"]);
  assert.deepEqual(contextualAdvantage(inStance("Guardian Stance", 1, { statuses: ["dodging"] }), save("wis")).advantage, []);
  assert.deepEqual(contextualAdvantage(inStance("Guardian Stance"), save("dex")).advantage, []);
});

test("Q-S3: every stance has its rules as data or notes; level-gated notes carry their levels", () => {
  assert.equal(stances.length, 24);
  for ( const s of stances ) {
    const a = automationOf(s);
    assert.notEqual(a.status, "none", `${s.name} has something authored`);
    validateConditionalRules(s.flags?.n5e?.rules ?? []);
    for ( const e of s.effects ?? [] ) {
      if ( !e.flags?.n5e?.std6b ) continue;
      assert.ok([5, 10].includes(e.flags.n5e.levels.min), `${s.name}: ${e.name}`);
      assert.equal(e._key, `!items.effects!${s._id}.${e._id}`);
      validateConditionalRules(e.flags.n5e.rules);
    }
  }
  assert.ok(automationOf(stance("Wolf Fist Stance")).notes.some(n => /battle cry/.test(n.text)));
});
