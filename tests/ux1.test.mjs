/** UX1: a readable Amp card and effect editor (docs/UX1_SPEC.md). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import "./helpers/foundry-stub.mjs";
import { N5E } from "../module/config/index.mjs";
import { fieldInfo, FIELD_CATEGORIES } from "../module/config/effect-fields.mjs";
import { changeKeyCatalog } from "../module/rules/change-keys.mjs";
import { effectFieldCatalog, validateEffectChanges, validateConditionalRules } from "../module/rules/effect-authoring.mjs";
import { describeChange, describeRule, ruleToRow, rowToRule, RULE_KINDS } from "../module/rules/plain-language.mjs";
import { pickerGroups, changeCards, ruleRows, normalizeModes } from "../module/view-models/effect-editor.mjs";
import { ampDefinition } from "../module/rules/amp-cards.mjs";
import { itemVM } from "../module/view-models/item.mjs";

const catalog = effectFieldCatalog(N5E);
const sentences = text => (String(text).match(/[.!?](\s|$)/g) ?? []).length;

test("every field has a plain name, a category and a definition of at most 2 sentences", () => {
  for ( const f of changeKeyCatalog(N5E) ) {
    const info = fieldInfo(f.key, N5E);
    assert.ok(info, `no dictionary entry for ${f.key}`);
    assert.ok(info.name && !info.name.includes("n5e."), f.key);
    assert.ok(FIELD_CATEGORIES.includes(info.category), `${f.key}: ${info.category}`);
    assert.ok(info.what && sentences(info.what) <= 2, `${f.key}: ${info.what}`);
    assert.ok(info.enter, `${f.key} says what to enter`);
  }
  assert.equal(fieldInfo("n5e.unarmed.die", N5E).name, "Unarmed Damage Die");
  assert.equal(fieldInfo("n5e.mastery.skill.ath", N5E).name, "Athletics Mastery");
});

test("the picker shows plain names grouped by category, searchable by synonyms and the key", () => {
  const groups = pickerGroups(catalog);
  assert.deepEqual(groups.map(g => g.category), FIELD_CATEGORIES.filter(c => groups.some(g => g.category === c)));
  const unarmed = groups.flatMap(g => g.fields).find(f => f.key === "n5e.unarmed.die");
  assert.equal(unarmed.name, "Unarmed Damage Die");
  assert.ok(unarmed.search.includes("punch") && unarmed.search.includes("n5e.unarmed.die"));
  assert.ok(unarmed.what && unarmed.enter && unarmed.stacks);
});

test("King Q-U1: N5e fields have no mode (a stray mode becomes Add); core fields keep mode and priority", () => {
  const cards = changeCards([{ key: "n5e.unarmed.die", mode: 4, value: "1d10" }, { key: "system.bonuses.speed", mode: 2, value: "10", priority: 20 },
    { key: "n5e.resist", mode: 2, value: "fire" }, { key: "made.up", mode: 2, value: "1" }], catalog, {}, N5E);
  assert.equal(cards[0].name, "Unarmed Damage Die");
  assert.equal(cards[0].fixedMode, 2);
  assert.equal(cards[0].modes, null);
  assert.ok(cards[1].modes.length > 1);
  assert.equal(cards[2].input, "select", "damage types are a dropdown");
  assert.ok(cards[2].options.some(o => o.value === "fire" && o.selected));
  assert.equal(cards[3].name, "Unknown field");
  assert.deepEqual(normalizeModes([{ key: "n5e.unarmed.die", mode: 4 }, { key: "system.bonuses.speed", mode: 4 }], catalog).map(c => c.mode), [2, 4]);
  const bad = changeCards([{ key: "n5e.resist", mode: 2, value: "1" }], catalog, {}, N5E)[0];
  assert.equal(bad.options[0].label, "— Pick one —", "an invalid value doesn't pretend to be the first choice");
});

test("problems are in plain words, on the change that has them", () => {
  const report = validateEffectChanges([{ key: "n5e.dr", mode: 2, value: "2" }, { key: "n5e.resist", mode: 2, value: "1" }, { key: "n5e.unarmed.die", mode: 2, value: "big" }], [], catalog);
  assert.equal(report.rows[0], undefined);
  assert.equal(report.rows[1].problem, "Pick a damage type.");
  assert.equal(report.rows[2].problem, "Enter dice, like 1d8.");
  const cards = changeCards([{ key: "n5e.resist", mode: 2, value: "1" }], catalog, validateEffectChanges([{ key: "n5e.resist", mode: 2, value: "1" }], [], catalog), N5E);
  assert.ok(cards[0].blocking);
});

test("changes read as plain lines", () => {
  assert.equal(describeChange({ key: "n5e.dr", value: "2" }, catalog), "+2 Damage Reduction");
  assert.equal(describeChange({ key: "n5e.cost.nin", value: "-2" }, catalog), "−2 Ninjutsu Cost");
  assert.equal(describeChange({ key: "n5e.cost.all", value: "*0.5" }, catalog), "All Jutsu Cost ×0.5");
  assert.equal(describeChange({ key: "n5e.unarmed.die", value: "1d10" }, catalog), "Unarmed Damage Die: 1d10");
  assert.equal(describeChange({ key: "n5e.mastery.skill.ath", value: "White Wolf" }, catalog), "Athletics Mastery (from White Wolf)");
  assert.equal(describeChange({ key: "system.bonuses.speed", value: "10", mode: 2 }, catalog), "+10 Speed");
});

test("roll rules read as sentences", () => {
  assert.equal(describeRule({ key: "advantage", selector: "attack", predicate: "self:stance:iron-fist" }, N5E), "Advantage on your attack rolls while you're in the iron-fist stance.");
  assert.equal(describeRule({ key: "modifier", selector: ["save:str", "save:dex"], value: -2 }, N5E), "−2 to your Strength saves and Dexterity saves.");
  assert.equal(describeRule({ key: "resource", on: "damageDealt", pool: "fury", amount: 1, oncePerTurn: true }, N5E), "When you deal damage: +1 fury (once per turn).");
  assert.match(describeRule({ key: "damageHandling", selector: "damage", resistAll: true }, N5E), /custom rule/);
});

// Every rule in the content survives the builder unchanged (selectors of one entry may become a string).
const norm = r => JSON.parse(JSON.stringify(r, (k, v) => (k === "selector" && Array.isArray(v) && v.length === 1 ? v[0] : v)));
const sortKeys = o => (Array.isArray(o) ? o.map(sortKeys) : o && typeof o === "object" ? Object.fromEntries(Object.keys(o).sort().map(k => [k, sortKeys(o[k])])) : o);
function contentRules() {
  const out = [];
  const walk = dir => {
    for ( const f of fs.readdirSync(dir, { withFileTypes: true }) ) {
      const p = path.join(dir, f.name);
      if ( f.isDirectory() ) walk(p);
      else if ( f.name.endsWith(".json") ) {
        const visit = v => { if ( Array.isArray(v) ) v.forEach(visit); else if ( v && typeof v === "object" ) { if ( Array.isArray(v.rules) ) out.push(...v.rules.filter(r => r && typeof r === "object" && r.key)); Object.values(v).forEach(visit); } };
        try { visit(JSON.parse(fs.readFileSync(p, "utf8"))); } catch { /* not JSON content */ }
      }
    }
  };
  walk(path.join(import.meta.dirname, "..", "packs/_source"));
  return out;
}

test("the builder keeps every rule in the content intact", () => {
  const rules = contentRules();
  assert.ok(rules.length > 50, `found ${rules.length} rules`);
  for ( const rule of rules ) {
    const row = ruleToRow(rule, N5E);
    const back = rowToRule({ ...row, orig: row.raw, raw: row.raw });
    assert.deepEqual(sortKeys(norm(back)), sortKeys(norm(rule)), JSON.stringify(rule));
  }
});

test("a builder row makes a valid rule; editing a row changes only what it shows", () => {
  const row = { ...ruleToRow({ key: "modifier", selector: "attack", value: 1, scope: "action" }, N5E) };
  row.orig = row.raw;
  const out = rowToRule({ ...row, kind: "advantage", base: "save", details: ["dex"], when: "self:status", whenDetail: "prone", whenNot: true });
  assert.deepEqual(out, { scope: "action", key: "advantage", selector: "save:dex", predicate: { not: ["self:status:prone"] } });
  validateConditionalRules([out]);
  const dmg = rowToRule({ kind: "damage", base: "damage", details: ["unarmed"], formula: "1d6", damageType: "fire", when: "", direction: "self" });
  assert.deepEqual(dmg, { key: "damage", selector: "damage:unarmed", formula: "1d6", damageType: "fire" });
  validateConditionalRules([dmg]);
  assert.throws(() => rowToRule({ kind: "custom", raw: "{bad" }), /JSON/);
});

test("the builder rows show plain choices and the sentence", () => {
  const [row] = ruleRows([{ key: "advantage", selector: ["save:str", "save:dex"] }], N5E);
  assert.equal(row.kind, "advantage");
  assert.ok(row.detailOptions.find(o => o.value === "str").checked);
  assert.ok(row.sentence.startsWith("Advantage on your Strength saves"));
  assert.equal(row.what, RULE_KINDS.advantage.what);
  const [custom] = ruleRows([{ key: "damageHandling", selector: "damage", resistAll: true }], N5E);
  assert.ok(custom.custom);
});

test("an Amp card's own effects are part of its buff", () => {
  const def = ampDefinition({ name: "Iron Body", system: { identifier: "iron-body", changes: [{ key: "n5e.dr", value: "1", mode: 2 }] },
    effects: [{ changes: [{ key: "system.bonuses.speed", value: "10", mode: 2 }], flags: { n5e: { rules: [{ key: "advantage", selector: "save:con" }] } } },
      { disabled: true, changes: [{ key: "n5e.dr", value: "9", mode: 2 }] }] });
  assert.deepEqual(def.changes.map(c => c.key), ["n5e.dr", "system.bonuses.speed"]);
  assert.deepEqual(def.rules, [{ key: "advantage", selector: "save:con" }]);
});

test("the Amp card sheet: plain sections, definitions, Advanced collapsed, and What it does", () => {
  const src = { identifier: "iron-body", ampType: "", owner: { kind: "clan", id: "kaguya" }, duration: { seconds: 60, until: "" }, uses: {}, endsOn: [], changes: [] };
  const item = { type: "amp", name: "Iron Body", img: "", system: src, _source: { system: src }, flags: {},
    effects: [{ changes: [{ key: "n5e.dr", value: "2", mode: 2 }], flags: { n5e: { rules: [{ key: "advantage", selector: "save:con" }] } } }] };
  const vm = itemVM(item);
  assert.deepEqual(vm.details.map(s => s.label), ["What it is", "Starting it", "How long it lasts", "What ends it early", "What it does", "Advanced"]);
  assert.ok(vm.details.at(-1).collapsed);
  const type = vm.details[0].fields.find(f => f.path === "system.ampType");
  assert.ok(type.hinted && type.hint.includes("Rule of 3's"));
  assert.ok(type.options.every(o => o.hint));
  const lines = vm.details.find(s => s.label === "What it does").fields[0].lines;
  assert.deepEqual(lines, ["+2 Damage Reduction", "Advantage on your Constitution saves."]);
  assert.match(vm.subtitle, /Clan Amp/);
});

// King 2026-11-16: Ability Check Mastery covers the ability's checks and every skill under it.
import { makeActor, baseAbilities, taiSpec } from "./helpers/actor.mjs";
test("Ability Check Mastery raises the ability's checks and every skill that uses it", () => {
  assert.equal(fieldInfo("n5e.mastery.check.str", N5E).name, "Strength Check Mastery");
  assert.ok(catalog.some(f => f.key === "n5e.mastery.check.dex" && f.category === "Skills & Mastery"));
  const a = makeActor({ system: baseAbilities, items: [taiSpec(12)], n5eChanges: [{ key: "n5e.mastery.check.str", value: "White Wolf", mode: 2 },
    { key: "n5e.mastery.skill.ath", value: "Training", mode: 2 }, { key: "n5e.mastery.skill.ath", value: "White Wolf", mode: 2 }] });
  const s = a.system;
  assert.equal(s.masteryFor("check.str").rank, 1, "Strength checks");
  assert.ok(s.breakdowns["check.str"].parts.some(p => /Mastery/.test(p.label)), "on the check's breakdown");
  assert.equal(s.skills.ath.mastery, 2, "Athletics: White Wolf counts once, plus Training");
  assert.equal(s.skills.acr.mastery, 0, "a Dexterity skill is unaffected");
});

// King 2026-11-16: Condition resistance: advantage on saves against a condition or a condition group.
import { resistsAny } from "../module/rules/condition-lifecycle.mjs";
test("Condition Resistance: an effect field for a condition or a whole group, giving advantage on its saves", () => {
  assert.equal(fieldInfo("n5e.conditionResist", N5E).name, "Condition Resistance");
  const [card] = changeCards([{ key: "n5e.conditionResist", mode: 2, value: "group:physical" }], catalog, {}, N5E);
  assert.equal(card.input, "select");
  assert.ok(card.options.find(o => o.value === "group:physical" && o.selected));
  assert.ok(card.options.some(o => o.value === "bruised"));
  assert.equal(describeChange({ key: "n5e.conditionResist", value: "group:physical" }, catalog, N5E), "Condition Resistance: all Physical conditions");
  assert.equal(validateEffectChanges([{ key: "n5e.conditionResist", mode: 2, value: "bruised" }], [], catalog).errors.length, 0);
  const a = makeActor({ system: baseAbilities, items: [taiSpec(1)], n5eChanges: [{ key: "n5e.conditionResist", value: "group:physical", mode: 2 }, { key: "n5e.conditionResist", value: "dazed", mode: 2 }] });
  const physical = Object.entries(N5E.conditions).find(([, d]) => (d.tags ?? []).includes("physical") && !(d.tags ?? []).includes("mental"))[0];
  const mentalOnly = Object.entries(N5E.conditions).find(([k, d]) => (d.tags ?? []).length && (d.tags ?? []).every(t => t === "mental") && k !== "dazed")[0];
  assert.ok(resistsAny(a, [physical]), `${physical} is Physical`);
  assert.ok(resistsAny(a, ["dazed"]), "a named condition");
  assert.ok(!resistsAny(a, [mentalOnly]), `${mentalOnly} isn't resisted`);
});

// King 2026-11-16: the unarmed die steps up or down from whatever it is now.
import { stepUnarmed, unarmedSpec } from "../module/rules/unarmed.mjs";
test("Unarmed Damage Die Step moves the current die along 1 > d4 > d6 > d8 > d10 > d12, capped at both ends", () => {
  assert.equal(stepUnarmed("1", 1), "1d4");
  assert.equal(stepUnarmed("1d6", 2), "1d10");
  assert.equal(stepUnarmed("1d10", 5), "1d12");
  assert.equal(stepUnarmed("1d6", -1), "1d4");
  assert.equal(stepUnarmed("1d4", -3), "1");
  assert.equal(stepUnarmed("d8", 1), "1d10");
  assert.equal(fieldInfo("n5e.unarmed.step", N5E).name, "Unarmed Damage Die Step");
  const up = makeActor({ system: baseAbilities, items: [taiSpec(1)], n5eChanges: [{ key: "n5e.unarmed.step", value: "2", mode: 2 }] });
  assert.equal(unarmedSpec(up).die, "1d6", "no stance: 1, two steps up");
  const both = makeActor({ system: baseAbilities, items: [taiSpec(1)], n5eChanges: [{ key: "n5e.unarmed.die", value: "1d8", mode: 2 }, { key: "n5e.unarmed.step", value: "-1", mode: 2 }] });
  assert.equal(unarmedSpec(both).die, "1d6", "the override first, then the step");
});

// King 2026-11-16: Condition Immunity, State Resistance and State Immunity.
import { traitCovers } from "../module/rules/condition-lifecycle.mjs";
test("Condition Immunity (key or group) and State Resistance / Immunity", () => {
  for ( const k of ["n5e.conditionImmune", "n5e.stateResist", "n5e.stateImmune"] ) assert.ok(fieldInfo(k, N5E)?.name, k);
  const [state] = changeCards([{ key: "n5e.stateImmune", mode: 2, value: "prone" }], catalog, {}, N5E);
  assert.equal(state.input, "select");
  assert.ok(state.options.some(o => o.value === "grappled") && !state.options.some(o => o.value === "inCombat"));
  assert.equal(describeChange({ key: "n5e.stateResist", value: "grappled" }, catalog, N5E), "State Resistance: Grappled");
  assert.equal(validateEffectChanges([{ key: "n5e.stateImmune", mode: 2, value: "dead" }], [], catalog).rows[0].problem, "Pick a state.");
  const a = makeActor({ system: baseAbilities, items: [taiSpec(1)], n5eChanges: [{ key: "n5e.conditionImmune", value: "group:mental", mode: 2 },
    { key: "n5e.stateResist", value: "grappled", mode: 2 }, { key: "n5e.stateImmune", value: "prone", mode: 2 }] });
  const mental = Object.entries(N5E.conditions).find(([, d]) => (d.tags ?? []).includes("mental"))[0];
  assert.ok(traitCovers(a, "Immune", mental), `${mental} is Mental`);
  assert.ok(traitCovers(a, "Immune", "prone"));
  assert.ok(!traitCovers(a, "Immune", "grappled"));
  assert.ok(resistsAny(a, ["grappled"]), "a state can be resisted");
});

// King 2026-11-16 bug: a field shown twice on a sheet came back as an array ("must be an integer").
import { collapseDuplicates } from "../module/applications/schema-form.mjs";
test("a field shown twice on a sheet saves the value the user changed", () => {
  const source = { system: { hp: { value: 12 }, details: { xp: 0 }, traits: { resist: ["fire"] } } };
  const flat = collapseDuplicates({ "system.hp.value": [12, 9], "system.details.xp": [0, 0], "system.traits.resist": ["fire", "cold"], "system.abilities.str.value": 16 }, source);
  assert.equal(flat["system.hp.value"], 9);
  assert.equal(flat["system.details.xp"], 0);
  assert.deepEqual(flat["system.traits.resist"], ["fire", "cold"], "real arrays stay");
  assert.equal(flat["system.abilities.str.value"], 16);
});

// King 2026-11-16 polish: no generic Attack pill; Amp rows carry their type key; jutsu pill view.
import { combatVM } from "../module/view-models/combat.mjs";
import { jutsuVM } from "../module/view-models/character.mjs";
test("Basic Combat has no Attack pill (the Strikes row attacks); the jutsu tab can show pills", () => {
  const a = makeActor({ system: baseAbilities, items: [taiSpec(1)] });
  const core = combatVM(a).basic.sections.find(s => s.key === "core") ?? combatVM(a).basic.sections[0];
  assert.ok(!core.pills.some(p => p.name === "Attack"));
  assert.ok(core.pills.some(p => p.name === "Dash"));
  assert.equal(jutsuVM(a, { view: "pills" }).pills, true);
  assert.equal(jutsuVM(a).pills, false);
});
