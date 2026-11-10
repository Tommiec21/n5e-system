import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseJutsuBook, parseKeywords, buildJutsuDocument, splitJutsuText } from "../tools/content/build-jutsu.mjs";
import { n5eRollFormula } from "../module/dice/n5e-roll.mjs";
import { effectiveActivities } from "../module/rules/activity-parse.mjs";
import { makeActor, baseAbilities, load } from "./helpers/actor.mjs";
import { castPlan } from "../module/workflow/cast-plan.mjs";
import { activityFields } from "../module/data/fields/shared.mjs";
import { unknownActivityFields } from "../module/rules/activity-contract.mjs";

const root = path.resolve(import.meta.dirname, "..");
const walk = p => fs.readdirSync(p, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(p, d.name)) : d.name.endsWith(".json") ? [path.join(p, d.name)] : []);
const all = walk(path.join(root, "packs/_source/jutsu")).map(p => JSON.parse(fs.readFileSync(p, "utf8")));
const docs = all.filter(d => d.type === "jutsu"), folders = new Map(all.filter(d => d.type === "Item").map(d => [d._id, d]));
const book = JSON.parse(fs.readFileSync(path.join(root, "tools/content/sources/jiraiya-jutsu.json"), "utf8"));
const byName = name => docs.find(d => d.name === name);

test("whole jutsu book is imported exactly once with stable source identity and discipline totals", () => {
  assert.equal(book.entries.length, 968); assert.equal(docs.length, 968);
  assert.equal(new Set(docs.map(d => d._id)).size, 968);
  assert.equal(new Set(docs.map(d => d.system.identifier)).size, 968);
  for ( const [disc, count] of Object.entries({ nin: 403, gen: 167, tai: 146, buki: 252 }) ) assert.equal(docs.filter(d => d.system.discipline === disc).length, count);
  const sourceLines = new Set();
  for ( const doc of docs ) {
    const flag = doc.flags.n5e.jutsuBookImport, source = book.entries.find(e => e.line === flag.sourceLine);
    assert.ok(source); assert.equal(doc.name, source.name); assert.equal(flag.sourceText, source.raw); assert.equal(flag.sourceHash, source.sourceHash);
    sourceLines.add(flag.sourceLine); assert.ok(doc.system.description.length);
  }
  assert.equal(sourceLines.size, 968);
});

test("each jutsu is filed Discipline / Nature or Group / Rank with complete folder references", () => {
  for ( const doc of docs ) {
    const chain = []; let folder = folders.get(doc.folder);
    while ( folder ) { chain.unshift(folder.name); folder = folders.get(folder.folder); assert.ok(chain.length <= 3); }
    assert.equal(chain.length, 3); assert.equal(chain[0], doc.flags.n5e.jutsuBookImport.discipline);
    assert.equal(chain[1], doc.flags.n5e.jutsuBookImport.group === "Taijutsu" ? "General" : doc.flags.n5e.jutsuBookImport.group);
    assert.equal(chain[2], `${doc.system.rank}-Rank`);
  }
  assert.equal(folders.size, 118);
});

test("all source keywords and stimuli survive normalization without inventing missing labels", () => {
  for ( const doc of docs ) {
    const expected = parseKeywords(doc.flags.n5e.jutsuBookImport.header.keywords);
    assert.deepEqual(doc.system.keywords, expected.keywords); assert.deepEqual(doc.system.stimuli, expected.stimuli); assert.equal(doc.system.unaware, expected.unaware);
  }
  assert.deepEqual(parseKeywords("Genjutsu (Visual, Inhale, Unaware)"), { keywords: ["genjutsu"], stimuli: ["visual", "inhaled"], unaware: true });
  assert.ok(parseKeywords("Taijutsu Water Release").keywords.includes("waterRelease"));
});

test("all source expressions retain exact text/offset/context; activity fields and formulas fit the existing engine", () => {
  let expressions = 0;
  for ( const doc of docs ) {
    const source = book.entries.find(e => e.line === doc.flags.n5e.jutsuBookImport.sourceLine);
    for ( const expression of doc.flags.n5e.jutsuBookImport.expressions ) {
      assert.equal(source.description.slice(expression.offset, expression.offset + expression.expression.length), expression.expression);
      assert.ok(expression.context.length); expressions++;
    }
    for ( const activities of [doc.system.activities, ...Object.values(doc.flags.n5e.jutsuBookImport.activitiesByRank)] ) for ( const activity of activities ) {
      assert.deepEqual(unknownActivityFields(activity, activityFields()), [], doc.name);
      for ( const formula of [...activity.damage?.parts?.map(p => p.formula) ?? [], activity.heal?.formula, activity.roll?.formula, activity.strike?.extraDice].filter(Boolean) ) assert.doesNotThrow(() => n5eRollFormula(formula), `${doc.name}: ${formula}`);
    }
  }
  assert.equal(expressions, 1535);
});

test("same-named Brutal Block variants are separate and prior core jutsu IDs are preserved", () => {
  const variants = docs.filter(d => d.name === "Brutal Block");
  assert.equal(variants.length, 2); assert.notEqual(variants[0]._id, variants[1]._id); assert.notEqual(variants[0].system.identifier, variants[1].system.identifier);
  assert.deepEqual(variants.map(d => d.flags.n5e.jutsuBookImport.group).sort(), ["Power", "Shinobi Basics"]);
  for ( const [name, id] of Object.entries({ "Dynamic Entry": "n5eDynamicEntry1", "Leaf Hurricane": "n5eLeafHurrican1", "Chakra Shield": "n5eBNdg8qjsq07DE", "Fire Release: Flame Whip": "n5eGBuBPx5BSU05q" }) ) assert.equal(byName(name)._id, id);
});

test("conditional and repeating damage is not silently combined into one base roll", () => {
  for ( const name of ["Mental Prison", "Medical Release: Acid Whips", "Lightning Release: Lightning Ball", "Breath of Wind: Claws"] ) {
    const doc = byName(name);
    assert.ok(doc.flags.n5e.jutsuBookImport.manual.length);
    assert.ok(doc.system.activities.every(a => (a.damage?.parts?.length ?? 0) <= 1), name);
    assert.ok(doc.system.activities.some(a => a.type === "roll"), name);
  }
  const tusk = byName("Earth Release: Lazuli Tusk");
  assert.equal(tusk.system.activities.find(a => a.type === "attack").damage.parts.length, 2, "explicit simultaneous piercing + earth is retained");
});

test("source-clear upcasting selects ranked damage without mutating the base or mixing in finisher damage", () => {
  const whip = byName("Fire Release: Flame Whip"), base = effectiveActivities(whip), raised = effectiveActivities(whip, { rank: "C" });
  assert.equal(base[0].damage.parts[0].formula, "2d10+2"); assert.match(raised[0].damage.parts[0].formula, /1d10\+1/);
  assert.equal(whip.system.activities[0].damage.parts[0].formula, "2d10+2");
  assert.equal(Object.keys(byName("Leaf Hurricane").flags.n5e.jutsuBookImport.activitiesByRank).length, 0, "ambiguous rider growth remains manual");
});

test("fixed special costs charge the printed amount; unresolved/scheduled costs cannot cast as free", () => {
  const special = docs.find(d => d.system.cost.mode === "special" && d.system.cost.value > 0 && !d.flags.n5e.jutsuBookImport.manualCost);
  const actor = makeActor({ system: { ...structuredClone(baseAbilities), cp: { value: 500, maxOverride: 500 } }, items: [special] });
  const before = actor.system.cp.value, plan = castPlan(actor, actor.items[0]);
  assert.equal(plan.update["system.cp.value"], Math.max(0, before - plan.cost));
  const unresolved = docs.find(d => d.flags.n5e.jutsuBookImport.manualCost);
  const other = makeActor({ system: structuredClone(baseAbilities), items: [unresolved] });
  assert.ok(castPlan(other, other.items[0]).problems.some(p => p.includes("source-defined cost")));
  assert.equal(byName("Fire Release: Fox Fire").system.cost.value, 3);
});

test("header parser retains pre-header boxes, plain titles and documented source typo corrections", () => {
  const text = "# Ninjutsu\n## Fire Release\n### D-Rank\nPlain Name\n[BOX]\n| Source table |\n[/BOX]\nRank: D-Rank\nCasting Time 1 Action\nRange 30 Feet\nDuration: Instant\nComponents: HS Cost: 3 Chakra\nKeywords Ninjutsu, Fire Release\nDescription: Deal 2d6 fire damage.\n";
  const parsed = parseJutsuBook(text);
  assert.equal(parsed.entries.length, 1); assert.equal(parsed.entries[0].name, "Plain Name");
  assert.match(parsed.entries[0].description, /Source table/); assert.equal(parsed.entries[0].time, "1 Action");
  const generated = buildJutsuDocument(parsed.entries[0]); assert.equal(generated.system.discipline, "nin");
  const blocks = splitJutsuText("Base. Finisher: Other. At Higher Ranks: Increase by 1d6.");
  assert.equal(blocks.main, "Base."); assert.match(blocks.finisher, /Finisher/); assert.match(blocks.upcast, /Higher Ranks/);
  assert.equal(book.corrections.length, 4);
});

test("existing starter authoring remains compatible with preparation and source-scoped effects", () => {
  const bull = load("jutsu", "forceful-bull");
  assert.equal(bull.system.activities[0].effect.changes[0].value, "18"); assert.equal(bull.system.activities[0].effect.tempHp, "8");
  assert.ok(byName("Fire Release: Fox Fire").system.activities.some(a => a.effect?.expires === "nextTurnEnd"));
});
