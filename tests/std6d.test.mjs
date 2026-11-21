/** STD6d: class automation on prepared actors (Medical Release's Wisdom on Medical jutsu). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeActor, load, taiSpec } from "./helpers/actor.mjs";

test("Medical Release: Medical jutsu use Wisdom when it is higher; others keep the discipline's ability", () => {
  const abilities = { abilities: { str: { value: 10 }, dex: { value: 10 }, con: { value: 14 }, int: { value: 12 }, wis: { value: 18 }, cha: { value: 10 } } };
  const medical = load("jutsu", "medical-release-acid-armor");
  const plain = load("jutsu", "medical-release-acid-armor");
  plain.system.keywords = ["ninjutsu"];
  const with_ = makeActor({ system: abilities, items: [taiSpec(1), medical, plain], n5eChanges: [{ key: "n5e.keywordAbility.medical", value: "wis" }] });
  const [m, p] = with_.items.filter(i => i.type === "jutsu").map(i => i.system.live);
  assert.equal(m.ability, "wis");
  assert.equal(m.dc - p.dc, 4 - 1, "Wis +4 instead of Int +1");
  const without = makeActor({ system: abilities, items: [taiSpec(1), load("jutsu", "medical-release-acid-armor")] });
  assert.notEqual(without.items.find(i => i.type === "jutsu").system.live.ability, "wis");
});

// ---------------------------------------------------------------- Taijutsu Specialist (STD6d)
import { elementValue } from "../module/rules/elements.mjs";
import { weaponFacts } from "../module/rules/stance-weapons.mjs";
import { parseN5eChanges } from "../module/rules/change-keys.mjs";
import fs from "node:fs";
import path from "node:path";

test("a pool die can grow with level, and formulas read its size (@pools.<id>.faces)", () => {
  const feature = load("features", "martial-adept");
  for ( const [level, die] of [[1, "d6"], [7, "d8"], [13, "d10"], [19, "d12"]] ) {
    const a = makeActor({ items: [taiSpec(level), structuredClone(feature)] });
    assert.equal(a.system.resources.martialDice.die, die, `level ${level}`);
    assert.equal(a.system.getRollData().pools.martialDice.faces, Number(die.slice(1)));
  }
});

test("an element value can be the highest of some ability modifiers (Agile)", () => {
  const owner = { system: { level: 7, abilities: { int: { mod: 1 }, wis: { mod: 3 }, cha: { mod: -1 } } } };
  assert.equal(elementValue("mod(int,wis,cha)", owner), 3);
  assert.equal(elementValue("lvl(3:2,10:4)", { system: { level: 12 } }), 4);
  assert.equal(elementValue(5, owner), 5);
});

test("n5e.rankCost gives a fixed Special cost by cast rank (Unwasted Movements); Special and None jutsu keep theirs", () => {
  assert.deepEqual(parseN5eChanges([{ key: "n5e.rankCost.tai", value: "D:3,C:5,B:9,A:14,S:20" }]).rankCost[0].table, { D: 3, C: 5, B: 9, A: 14, S: 20 });
  const jutsu = load("jutsu", "DynamicEntry");
  const a = makeActor({ items: [taiSpec(5), jutsu], n5eChanges: [{ key: "n5e.rankCost.tai", value: "D:3,C:5,B:9,A:14,S:20" }] });
  const j = a.items.find(i => i.type === "jutsu");
  assert.equal(j.system.live.cost, 3);
  assert.equal(j.system.live.costBreakdown.special, true);
  assert.equal(j.system.computeCost(a.system, "C").cost, 5, "the cast rank's cost");
  const special = load("jutsu", "DynamicEntry");
  special.system.cost = { mode: "special", value: 7, text: "Special" };
  const b = makeActor({ items: [taiSpec(5), special], n5eChanges: [{ key: "n5e.rankCost.tai", value: "D:3" }] });
  assert.equal(b.items.find(i => i.type === "jutsu").system.live.cost, 7);
  const none = load("jutsu", "DynamicEntry");
  none.system.cost = { mode: "none", value: 0, text: "None" };
  const c = makeActor({ items: [taiSpec(5), none], n5eChanges: [{ key: "n5e.rankCost.tai", value: "D:3" }] });
  assert.equal(c.items.find(i => i.type === "jutsu").system.live.cost, 0, "a None cost stays None (King Q-D10)");
});

test("the Unarmed Strike item answers to weapon:unarmed", () => {
  assert.ok(weaponFacts({ system: { identifier: "unarmedStrike", groups: [], properties: {} } }).includes("weapon:unarmed"));
  assert.ok(!weaponFacts({ system: { identifier: "kunai", groups: [], properties: {} } }).includes("weapon:unarmed"));
  assert.deepEqual(weaponFacts(null), ["weapon:unarmed"]);
});

test("Taijutsu Specialist: every feature reviewed; Martial Strength and Unwasted Movements need a Taijutsu stance", () => {
  const table = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "content/automation/taijutsu-specialist.json"), "utf8"));
  assert.equal(Object.keys(table.features).length, 84);
  const mt = load("features", "martial-technique");
  assert.ok(mt.flags.n5e.reviewed);
  const fx = mt.effects.filter(e => e.flags.n5e.std6d);
  assert.deepEqual(fx.map(e => e.flags.n5e.requiresStance), ["taijutsu", "taijutsu", "taijutsu", "taijutsu"]);
  assert.deepEqual(fx.find(e => e.name === "Martial Strength d10").flags.n5e.levels, { min: 13, max: 18 });
  const agile = load("features", "agile");
  assert.equal(agile.flags.n5e.rules[0].value, "mod(int,wis,cha)");
});

// ---------------------------------------------------------------- Weapon Specialist (STD6d)
import { rollOptions } from "../module/rules/elements.mjs";

test("a class's level-up options are roll facts (option:<key>:<value>)", () => {
  const actor = { items: [{ type: "class", system: { advancement: [{ type: "option", key: "weaponFocus", chosen: ["Thrown/Ammunition"] }, { type: "feature", key: "", chosen: [] }] } }], system: {} };
  const o = rollOptions(actor, { kind: "attack" });
  assert.ok(o.has("option:weaponFocus:thrown-ammunition"));
});

test("Weapon Specialist: every feature reviewed; Critical Focus only with the chosen Weapon Focus group", () => {
  const table = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "content/automation/weapon-specialist.json"), "utf8"));
  assert.equal(Object.keys(table.features).length, 101);
  const cf = load("features", "critical-focus");
  assert.equal(cf.effects.length, 1, "the imported blanket +1 is gone");
  const rule = cf.effects[0].flags.n5e.rules[0];
  const facts = (...f) => new Set(["self", "kind:attack", ...f]);
  assert.ok(gatherTest(rule.predicate, facts("option:weaponFocus:blade", "weapon:group:blade")));
  assert.ok(!gatherTest(rule.predicate, facts("option:weaponFocus:blade", "weapon:group:polearm")));
  assert.ok(gatherTest(rule.predicate, facts("option:weaponFocus:thrown-ammunition", "weapon:group:ammunition")));
  assert.equal(rule.value, "lvl(5:1,11:2,18:3)");
  const eb = load("features", "efficient-bukijutsu").flags.n5e.castOption;
  assert.deepEqual([eb.costDelta, eb.cost, eb.appliesTo], ["-rank", { pool: "discipline", amount: 1 }, { keywords: ["bukijutsu"] }]);
  const ward = load("features", "obsidian-ward");
  assert.equal(ward.system.resourcePools[0].max, "11 + @level + lvl(1:0,10:@prof)");
  assert.equal(ward.system.activities[0].cost.formula, "lvl(3:1d12,10:2d12,17:3d12)");
});
import { testPredicate as gatherTest } from "../module/rules/elements.mjs";

// ---------------------------------------------------------------- Scout-Nin (STD6d)
test("Scout-Nin: every feature reviewed; Superior Assault's critical range follows the Primary casting discipline", () => {
  const table = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "content/automation/scout-nin.json"), "utf8"));
  assert.equal(Object.keys(table.features).length, 187);
  const rule = load("features", "superior-assault").effects.find(e => e.flags.n5e.std6d).flags.n5e.rules[0];
  const facts = (...f) => new Set(["self", "kind:attack", ...f]);
  assert.ok(gatherTest(rule.predicate, facts("option:primaryDiscipline:nin", "jutsu:discipline:nin")));
  assert.ok(!gatherTest(rule.predicate, facts("option:primaryDiscipline:nin", "jutsu:discipline:gen")));
  assert.ok(gatherTest(rule.predicate, facts("option:primaryDiscipline:buki", "jutsu:discipline:tai", "jutsu:keyword:bukijutsu")));
  assert.ok(!gatherTest(rule.predicate, facts("option:primaryDiscipline:tai", "jutsu:discipline:tai", "jutsu:keyword:bukijutsu")), "Bukijutsu isn't the Taijutsu Primary");
  assert.equal(rule.value, "lvl(3:1,10:2)");
  const pools = id => load("features", id).system.resourcePools.map(p => [p.id, p.max]);
  assert.deepEqual(pools("phantoms-flame-phantom-scout"), [["ghostfire", "lvl(3:3,10:5)"]]);
  assert.deepEqual(pools("chakra-barrier-barrier-scout"), [["chakraBarrier", "2 * @level"]]);
  assert.deepEqual(pools("master-of-tactics-tactical-scout"), [["tacticalInsight", "4"]]);
});

test("a placed effect's value can name the caster's ability modifier or proficiency (validated, resolved on placement)", async () => {
  const { validateConditionalRules } = await import("../module/rules/effect-authoring.mjs");
  assert.doesNotThrow(() => validateConditionalRules([{ key: "modifier", selector: "save", value: "floor(@abilities.con.mod / 2)" }]));
  assert.throws(() => validateConditionalRules([{ key: "modifier", selector: "save", value: "@something.else" }]));
});
