import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeActor } from "./helpers/actor.mjs";
import { itemChoiceAllowed, validateItemChoices } from "../module/advancement/eligibility.mjs";
import { stepsForLevel } from "../module/advancement/steps.mjs";
import { applyLevel, revertLevel } from "../module/advancement/manager.mjs";
import { resourceCost } from "../module/rules/resource-cost.mjs";

const root = path.resolve(import.meta.dirname, "..");
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
const docs = ["classes", "features", "stances"].flatMap(pack => walk(path.join(root, "packs/_source", pack)).filter(f => f.endsWith(".json"))
  .map(file => { const d = JSON.parse(fs.readFileSync(file, "utf8")); return { ...d, uuid: `Compendium.n5e.${pack}.Item.${d._id}` }; }));
const index = JSON.parse(fs.readFileSync(path.join(root, "content/classes/source-index.json"), "utf8"));
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const baseName = d => norm(d.name.replace(/\s*\([^)]*\)$/, ""));
const cls = name => docs.find(d => d.type === "class" && d.name === name);
const resolve = async uuid => docs.find(d => d.uuid === uuid);

test("all seven source trees include every core heading, all 42 subclasses and all 313 subclass features", async () => {
  let subCount = 0, featureCount = 0;
  for ( const expected of index ) {
    const c = cls(expected.name);
    assert.ok(c);
    const features = docs.filter(d => d.type === "feat" && d.system.requirement?.class === c.system.identifier);
    for ( const f of expected.core ) assert.ok(features.some(d => baseName(d) === norm(f.name)), `${c.name}: ${f.name}`);
    for ( const expectedSubclass of expected.subclasses ) {
      const sc = docs.find(d => d.type === "subclass" && d.system.classIdentifier === c.system.identifier && norm(d.name) === norm(expectedSubclass.name));
      assert.ok(sc, expectedSubclass.name);
      assert.ok(c.system.subclasses.includes(sc.uuid));
      const granted = (await Promise.all(sc.system.advancement.filter(a => a.type === "feature").flatMap(a => a.uuids).map(resolve))).filter(Boolean);
      for ( const name of expectedSubclass.features ) {
        assert.ok(granted.some(d => baseName(d) === norm(name)), `${sc.name}: ${name}`);
        featureCount++;
      }
      subCount++;
    }
  }
  assert.equal(subCount, 42);
  assert.equal(featureCount, 313);
});

test("all 258 audited source options exist and all class/subclass advancement links resolve", async () => {
  let count = 0;
  for ( const expected of index ) {
    const c = cls(expected.name);
    for ( const name of expected.options ) {
      assert.ok(docs.some(d => d.type === "feat" && d.system.requirement?.class === c.system.identifier && baseName(d) === norm(name)), `${c.name}: ${name}`);
      count++;
    }
  }
  assert.equal(count, 258);
  for ( const d of docs.filter(d => ["class", "subclass"].includes(d.type)) ) for ( const a of d.system.advancement ) {
    assert.ok(a.level >= 1 && a.level <= 20);
    for ( const uuid of a.uuids.filter(u => u.startsWith("Compendium.")) ) assert.ok(await resolve(uuid), `${d.name}: ${uuid}`);
  }
});

test("late options require their actual level and stale or forged selections are rejected", async () => {
  const dream = docs.find(d => d.name === "Dreamscape");
  assert.equal(dream.system.requirement.level, 9);
  const actor = { items: [] };
  assert.equal(itemChoiceAllowed(dream, { actor, level: 8 }), false);
  assert.equal(itemChoiceAllowed(dream, { actor, level: 9 }), true);
  const step = { id: "pick", title: "Mirage", type: "itemChoice", count: 1, key: "gen-mirage", uuids: [dream.uuid] };
  assert.match((await validateItemChoices(actor, 8, [step], { pick: [dream.uuid] }, resolve))[0], /requirements/);
  assert.match((await validateItemChoices(actor, 9, [step], { pick: ["outside-pool"] }, resolve))[0], /permitted/);
  assert.deepEqual(await validateItemChoices(actor, 9, [step], { pick: [dream.uuid] }, resolve), []);
  assert.ok((await validateItemChoices(actor, 9, [step, { ...step, id: "other" }], { pick: [dream.uuid], other: [dream.uuid] }, resolve)).length);
});

test("later choice gains match the source counts and conditional Inception choices require the owned concept", () => {
  const counts = (name, key) => cls(name).system.advancement.filter(a => a.key === key).map(a => [a.level, a.count]);
  assert.deepEqual(counts("Genjutsu Specialist", "gen-mirage"), [[2, 2], [4, 1], [8, 1], [12, 1], [16, 1], [20, 1]]);
  assert.deepEqual(counts("Weapon Specialist", "weapon-superior"), [[9, 2], [13, 1], [18, 1]]);
  assert.deepEqual(counts("Weapon Specialist", "weapon-augmentation"), [[2, 1], [9, 1], [15, 1]]);
  const c = cls("Genjutsu Specialist");
  const concept = docs.find(d => d.name === "Temporal Stopwatch");
  const actor = makeActor({ items: [c] });
  assert.equal(stepsForLevel({ actor, cls: actor.items[0], level: 7 }).filter(s => s.key === "gen-inception-upgrade").length, 0);
  const withConcept = makeActor({ items: [c, concept] });
  assert.equal(stepsForLevel({ actor: withConcept, cls: withConcept.items[0], level: 7 }).filter(s => s.key === "gen-inception-upgrade").length, 1);
});

test("stance expertise and Signature Path choices require the corresponding owned item", () => {
  const expertise = docs.find(d => d.type === "feat" && d.system.tags?.includes("tai-expertise"));
  const requirement = expertise.flags.n5e.requiresItems[0];
  const stance = docs.find(d => d.type === "stance" && d.system.identifier === requirement);
  assert.equal(itemChoiceAllowed(expertise, { actor: { items: [] }, level: 11 }), false);
  assert.equal(itemChoiceAllowed(expertise, { actor: { items: [stance] }, level: 11 }), true);
});

test("all pre-expansion class and feature identities remain unchanged; excluded classes are absent", () => {
  const original = JSON.parse(fs.readFileSync(path.join(root, "content/classes/existing-identities.json"), "utf8"));
  for ( const old of original ) {
    const doc = docs.find(d => d._id === old.id);
    assert.ok(doc, old.name);
    assert.deepEqual([doc.type, doc.name, doc.system.identifier], [old.type, old.name, old.identifier]);
  }
  assert.equal(docs.filter(d => d.type === "class").length, 7);
});

test("all new Scout maneuver sets use the shared Superiority Dice spending boundary", () => {
  const backOff = docs.find(d => d.name === "Back Off!");
  assert.ok(backOff.system.tags.includes("scout-maneuver"));
  assert.equal(resourceCost(backOff).pool, "superiorityDice");
  for ( const [name, affinity] of [["Lightning Breaker", "lightning"], ["Stone Crusher", "earth"], ["Storm Terror", "wind"], ["Tsunami", "water"]] ) {
    const sc = docs.find(d => d.type === "subclass" && d.name === name);
    assert.ok(sc.system.advancement.some(a => a.level === 2 && a.type === "trait" && a.key === "affinity" && a.uuids.includes(affinity)));
  }
});

test("a newly imported capstone is granted and removed with its level, preserving other items", async () => {
  const previous = globalThis.fromUuid;
  const previousUtils = foundry.utils;
  foundry.utils = { ...previousUtils, setProperty: (obj, key, value) => {
    const parts = key.split(".");
    let target = obj;
    for ( const part of parts.slice(0, -1) ) target = target[part] ??= {};
    target[parts.at(-1)] = value;
  } };
  globalThis.fromUuid = async uuid => { const d = await resolve(uuid); return d ? { ...d, toObject: () => structuredClone(d) } : null; };
  const source = structuredClone(cls("Hunter-Nin"));
  const items = [];
  items.get = id => items.find(d => d.id === id);
  const c = { ...source, id: "class-owned", system: { ...source.system, levels: 19, toObject: () => structuredClone(source.system) }, getFlag: () => undefined,
    update: async changes => { for ( const [key, val] of Object.entries(changes) ) c.system[key.replace(/^system\./, "")] = val; } };
  items.push(c, { id: "personal", type: "loot", name: "Keepsake", system: {}, getFlag: () => undefined });
  const actor = { items, createEmbeddedDocuments: async (type, data) => data.map((d, i) => {
    const doc = { ...d, id: `grant-${i}`, getFlag: (scope, key) => d.flags?.[scope]?.[key] };
    items.push(doc); return doc;
  }), deleteEmbeddedDocuments: async (type, ids) => { for ( const id of ids ) items.splice(items.findIndex(d => d.id === id), 1); } };
  try {
    const advancement = source.system.advancement.find(a => a.level === 20 && a.type === "feature");
    const step = { ...advancement, id: "class:capstone", origin: "class" };
    await applyLevel(actor, c, 20, [step], {});
    assert.equal(c.system.levels, 20);
    assert.ok(items.some(d => d.name === "Assassinate" && d.flags.n5e.advancement.level === 20));
    await revertLevel(actor, c);
    assert.equal(c.system.levels, 19);
    assert.equal(items.some(d => d.name === "Assassinate"), false);
    assert.ok(items.get("personal"));
  } finally { globalThis.fromUuid = previous; foundry.utils = previousUtils; }
});
