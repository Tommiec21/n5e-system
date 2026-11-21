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

// ---------------------------------------------------------------- Hunter-Nin (STD6d)
test("Hunter-Nin: every feature reviewed; Combat Exploits roll Lethal Attack with their dice forgone", () => {
  const table = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "content/automation/hunter-nin.json"), "utf8"));
  assert.equal(Object.keys(table.features).length, 86);
  const feint = load("features", "feint").system.activities;
  assert.deepEqual(feint.filter(a => a.type === "damage").map(a => a.damage.parts[0].formula),
    ["(max(0, @scale.hunterNin.lethalAttack - 2))d8", "(max(0, ceil(@scale.hunterNin.lethalAttack/2) - 2))d8"]);
  assert.equal(feint.find(a => a.type === "save").save.abilities[0], "wis");
  assert.deepEqual(load("features", "hunters-exploits").system.resourcePools.map(p => [p.id, p.max, p.recovery.map(r => r.on)]), [["skilledExploits", "1 + @prof", ["lr"]]], "King Q-D24");
  assert.deepEqual(load("features", "aim").system.activities[0].cost, { pool: "skilledExploits", amount: 1 });
  assert.ok(load("features", "uncanny-dodge").flags.n5e.reaction, "its reaction still halves the damage");
});

test("Lethal Precision's Dexterity follows the level-up choice (effects gated by requiresOption)", async () => {
  const { optionChosen } = await import("../module/rules/features.mjs");
  const fx = load("features", "lethal-precision").effects.filter(e => e.flags.n5e.std6d);
  assert.deepEqual(fx.map(e => [e.flags.n5e.requiresOption, e.changes[0].key]),
    [["lethalPrecision:tai", "n5e.keywordAbility.taijutsu"], ["lethalPrecision:buki", "n5e.keywordAbility.bukijutsu"]]);
  const actor = chosen => ({ items: [{ type: "class", system: { advancement: [{ type: "option", key: "lethalPrecision", chosen }] } }] });
  assert.equal(optionChosen(actor(["tai"]), "lethalPrecision:tai"), true);
  assert.equal(optionChosen(actor(["tai"]), "lethalPrecision:buki"), false);
  assert.equal(optionChosen(actor([]), "lethalPrecision:tai"), false);
});

test("Lethal Attack (King Q-D25): unticked full and half rows in the damage window, counted only when ticked", async () => {
  const { diceParts, composeDice } = await import("../module/rules/roll-math.mjs");
  const { diceDialogHTML } = await import("../module/dice/roll-dialog.mjs");
  const { validateConditionalRules } = await import("../module/rules/effect-authoring.mjs");
  const rules = load("features", "lethal-attack").flags.n5e.rules.filter(r => r.key === "damage");
  assert.deepEqual(rules.map(r => [r.formula, r.optional]), [["(@scale.hunterNin.lethalAttack)d8", true], ["(ceil(@scale.hunterNin.lethalAttack/2))d8", true]]);
  assert.doesNotThrow(() => validateConditionalRules(rules));
  assert.throws(() => validateConditionalRules([{ key: "modifier", selector: "attack", value: 1, optional: true }]));
  assert.equal(load("features", "lethal-attack").system.activities.length, 0, "no separate buttons");
  const parts = diceParts([{ formula: "1d8", type: "slashing" }, { formula: "3d8", type: "slashing", label: "Lethal Attack (3d8)", optional: true }]);
  assert.equal(parts[1].situational, true);
  const html = diceDialogHTML({ parts });
  assert.match(html, /name="on_d0" checked/);
  assert.doesNotMatch(html, /name="on_d1" checked/);
  assert.deepEqual(composeDice(parts, {}).parts.map(p => p.formula), ["1d8"]);
  assert.deepEqual(composeDice(parts, { on: ["d1"] }).parts.map(p => p.formula), ["1d8", "3d8"]);
});

// ---------------------------------------------------------------- Genjutsu Specialist (STD6d)
test("Genjutsu Specialist: every feature reviewed; Genjutsu use Charisma when it's higher (Actualization)", () => {
  const table = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "content/automation/genjutsu-specialist.json"), "utf8"));
  assert.equal(Object.keys(table.features).length, 107);
  const fx = load("features", "actualization").effects.find(e => e.name === "Actualization: Genjutsu with Charisma");
  assert.deepEqual(fx.changes.map(c => [c.key, c.value]), [["n5e.keywordAbility.discipline:gen", "cha"]]);
  const abilities = { abilities: { str: { value: 10 }, dex: { value: 10 }, con: { value: 12 }, int: { value: 10 }, wis: { value: 12 }, cha: { value: 18 } } };
  const gen = load("jutsu", "shadow-bite");
  const nin = load("jutsu", "medical-release-acid-armor");
  const a = makeActor({ system: abilities, items: [taiSpec(1), gen, nin], n5eChanges: [{ key: "n5e.keywordAbility.discipline:gen", value: "cha" }] });
  const [g, n] = ["shadow-bite", "medical-release-acid-armor"].map(id => a.items.find(i => i.system.identifier === id).system.live);
  assert.equal(g.ability, "cha");
  assert.notEqual(n.ability, "cha", "other disciplines keep theirs");
});

test("Genjutsu Specialist: Black Fangs on Shadow Bite (jutsu:id), Rending Thoughts by level, Mirage cast options", async () => {
  const { jutsuFacts } = await import("../module/rules/jutsu-facts.mjs");
  assert.ok(jutsuFacts(load("jutsu", "shadow-bite")).includes("jutsu:id:shadow-bite"));
  const fangs = load("features", "black-fangs").flags.n5e.rules.find(r => r.key === "critRange");
  assert.deepEqual([fangs.predicate, fangs.value], ["jutsu:id:shadow-bite", 1]);
  const rend = load("features", "rending-thoughts").system.activities;
  assert.deepEqual(rend.filter(x => x.type === "damage").map(x => x.damage.parts[0].formula),
    ["lvl(1:1d6,6:2d6,10:3d6,14:4d6)", "lvl(1:2d6,6:3d6,10:4d6,14:5d6)", "lvl(1:3d6,6:4d6,10:5d6,14:6d6)"]);
  const piece = load("features", "piece-of-mind").flags.n5e.castOption ?? load("features", "piece-of-mind").flags.n5e.castOptions[0];
  assert.deepEqual([piece.appliesTo.namePrefix, piece.castAs], ["Mind Sliver", "bonus"]);
  const misty = load("features", "misty-thoughts").flags.n5e.castOption ?? load("features", "misty-thoughts").flags.n5e.castOptions[0];
  assert.equal(misty.costDelta, "zero");
});

test("Genjutsu Specialist: Duplicity and Phantasm summons, Mentally Compromised", () => {
  const summon = id => load("features", id).system.activities.find(x => x.type === "summon").summon.uuid;
  const dup = load("summons", "duplicity-"), ph = load("summons", "phantasm-");
  assert.equal(summon("beguiling-duplicity"), `Compendium.n5e.summons.Actor.${dup._id}`);
  assert.equal(summon("phantasm"), `Compendium.n5e.summons.Actor.${ph._id}`);
  assert.deepEqual([dup.system.hpMax, dup.flags.n5e.fromSummoner["attributes.ac.flat"]], [1, "@dc.gen"]);
  assert.deepEqual([ph.system.hpMax, ph.system.attributes.ac.flat, ph.system.traits.size], [10, 20, "small"]);
  assert.ok(!ph.system.traits.immune.includes("psychic") && ph.system.traits.immune.includes("fire"));
  assert.ok(load("conditions", "mentally-compromised"));
  for ( const id of ["collapsing-your-world", "corrupt-influence-corrupt-thoughts"] ) {
    assert.equal(load("features", id).system.activities.find(x => x.type === "effect").effect.condition, "mentally-compromised", id);
  }
});

test("King Q-D26: the Genjutsu ability is the higher by default, or the player's pick on the sheet", () => {
  const abilities = { abilities: { str: { value: 10 }, dex: { value: 10 }, con: { value: 12 }, int: { value: 10 }, wis: { value: 12 }, cha: { value: 18 } } };
  const changes = [{ key: "n5e.keywordAbility.discipline:gen", value: "cha" }];
  const withPick = pick => {
    const cls = taiSpec(1);
    cls.flags = { n5e: { abilityChoice: { gen: pick } } };
    const a = makeActor({ system: abilities, items: [cls, load("jutsu", "shadow-bite")], n5eChanges: changes });
    return a.items.find(i => i.type === "jutsu").system.live.ability;
  };
  assert.equal(withPick(""), "cha", "Auto: the higher");
  assert.equal(withPick("wis"), "wis", "a manual pick of the discipline's own ability");
  assert.equal(withPick("cha"), "cha");
  assert.equal(withPick("str"), "cha", "a pick that isn't one of its abilities is ignored");
});

test("King Q-D28: Illusory items worn over armor change the AC (Armor of Psychosis; Reality Shift's save DC)", async () => {
  const { overlayAC, computeAC } = await import("../module/rules/ac.mjs");
  const f = { abilityMod: k => ({ dex: 1, cha: 4 })[k] ?? 0, discipline: d => (d === "gen" ? { mod: 4, dc: 17 } : null), disciplineLabel: () => "Genjutsu" };
  const psychosis = overlayAC([{ name: "Armor of Psychosis", ability: "gen" }], f);
  assert.equal(psychosis.dexMod, 4);
  assert.equal(computeAC({ dexMod: psychosis.dexMod, dexLabel: psychosis.dexLabel, prof: 2 }).value, 10 + 4 + 1);
  const shift = [{ name: "Reality Shift", fromDC: "gen", whileState: "realityShift" }];
  assert.equal(overlayAC(shift, { ...f, hasState: () => false }).baseFloor, undefined, "only in the Reality Shift");
  const inShift = overlayAC(shift, { ...f, hasState: s => s === "realityShift" });
  assert.equal(computeAC({ dexMod: 1, prof: 2, baseFloor: inShift.baseFloor, bonus: 1 }).value, 17 + 1, "the DC when higher, then bonuses");
  assert.equal(computeAC({ dexMod: 1, prof: 2, baseFloor: { label: "x", value: 5 } }).value, 12, "not when lower");
  const item = load("equipment", "armor-of-psychosis");
  assert.deepEqual([item.system.category, item.system.overlay.ability], ["illusory", "gen"]);
  const a = makeActor({ system: { abilities: { str: { value: 10 }, dex: { value: 12 }, con: { value: 10 }, int: { value: 10 }, wis: { value: 18 }, cha: { value: 10 } } },
    items: [taiSpec(1), { ...item, system: { ...item.system, equipped: true } }] });
  const b = makeActor({ system: { abilities: { str: { value: 10 }, dex: { value: 12 }, con: { value: 10 }, int: { value: 10 }, wis: { value: 18 }, cha: { value: 10 } } },
    items: [taiSpec(1)] });
  assert.equal(a.system.ac.value - b.system.ac.value, a.system.disciplines.gen.mod - 1, "the Genjutsu modifier in place of Dex +1");
});

test("King Q-D27: the Duplicity is an illusion of you: your look, size and speeds", async () => {
  const { summonerLook, alliedTokenData } = await import("../module/workflow/allied.mjs");
  const { summonerData, summonerDelta } = await import("../module/rules/summoner-links.mjs");
  const dup = load("summons", "duplicity-");
  assert.equal(dup.flags.n5e.summonerLook, true);
  const look = summonerLook({ name: "Kurenai", width: 1, height: 1, texture: { src: "k.webp", scaleX: 1 } }, null);
  const [t] = alliedTokenData({ name: "Duplicity", texture: { src: "d.webp" } }, { count: 1, positions: [{ x: 5, y: 5 }], ownerId: "u", casterUuid: "Actor.k", look });
  assert.deepEqual([t.name, t.texture.src, t.x], ["Kurenai", "k.webp", 5]);
  const linked = summonerDelta(dup.flags.n5e.fromSummoner, summonerData({ level: 7, traits: { size: "small", speed: { walk: 35, fly: 20 } }, disciplines: { gen: { dc: 15 } } }));
  assert.deepEqual([linked.traits.size, linked.traits.speed.walk, linked.traits.speed.fly, linked.attributes.ac.flat], ["small", 35, 20, 15]);
});
