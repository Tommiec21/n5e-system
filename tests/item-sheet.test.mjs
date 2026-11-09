/**
 * Item sheet: the view model for all 13 item types and every template part.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { makeActor, load, baseAbilities, taiSpec } from "./helpers/actor.mjs";
import { itemVM, advancementVM } from "../module/view-models/item.mjs";
import { registerHelpers } from "../module/applications/helpers.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const SRC = path.join(ROOT, "packs", "_source");
const byName = name => {
  for ( const pack of fs.readdirSync(SRC) ) {
    for ( const f of fs.readdirSync(path.join(SRC, pack), { recursive: true }).filter(f => f.endsWith(".json")) ) {
      const d = JSON.parse(fs.readFileSync(path.join(SRC, pack, f), "utf8"));
      if ( d.name === name && !d._key.startsWith("!folders!") ) return d;
    }
  }
  throw new Error(name);
};
const mini = (type, name, system = {}) => ({ _id: `${type}0000000000000`.slice(0, 16), name, type, system });

const items = [
  byName("Scout-Nin"), byName("Assault Scout"), load("clans", "Uchiha"), mini("background", "Student", { skills: ["his", "inv"] }),
  byName("Superior Momentum"), byName("Iron Fist Stance"), byName("Fire Release: Flame Whip"), byName("Lotus: Anxious Petals"),
  load("equipment", "Kunai"), load("equipment", "ShinobiJacket"), load("equipment", "Backpk"),
  mini("consumable", "Chakra Pill", { subtype: "pill", quantity: 2 }), mini("toolkit", "Poison Kit", { kit: "poison" }),
  mini("loot", "Gold Ring", { price: 50 })
];
const actor = makeActor({ name: "Tester", system: structuredClone(baseAbilities), items: [taiSpec(1), ...items.slice(1)] });
const doc = name => actor.items.find(i => i.name === name);

test("item VM: every type has a summary and typed details", () => {
  const types = new Set();
  for ( const src of items ) {
    const item = doc(src.name) ?? makeActor({ items: [src] }).items.find(i => i.name === src.name);
    const vm = itemVM(item, { source: item.system });
    types.add(item.type);
    assert.ok(vm.subtitle, `${item.type}: subtitle`);
    assert.ok(vm.details.length > 0, `${item.type}: details`);
    for ( const s of vm.details ) for ( const f of s.fields ) assert.ok(f.path?.startsWith("system."), `${item.type}: ${f.label} path`);
    assert.equal(vm.htmlFields[0].path, "system.description");
  }
  assert.equal(types.size, 13, [...types].join(","));
});

test("item VM: jutsu facts, keyword chips, extra rich text", () => {
  const vm = itemVM(doc("Fire Release: Flame Whip"));
  assert.match(vm.subtitle, /D-Rank Ninjutsu · Fire/);
  assert.ok(vm.facts.some(f => f.label === "Cost" && /CP/.test(f.value)));
  assert.ok(vm.chips.some(c => /Fire/.test(c.label)));
  assert.ok(!vm.htmlFields.find(f => f.label === "Chain 1").relevant, "no Chain keyword: Chain blocks hidden when empty");
  const kw = vm.details.find(s => s.label === "Keywords").fields[0];
  assert.ok(kw.options.find(o => o.value === "fireRelease").selected);
  const gen = itemVM(doc("Lotus: Anxious Petals"));
  assert.ok(gen.details.some(s => s.label === "Genjutsu"), "stimuli for Genjutsu");
});

test("item VM: weapon properties and class progression", () => {
  const w = itemVM(doc("Kunai"));
  const props = w.details.find(s => s.label === "Properties").fields[0];
  assert.ok(props.options.find(o => o.value === "thrown").selected);
  const cls = makeActor({ items: [byName("Scout-Nin")] }).items[0];
  const adv = advancementVM(cls, u => u.split(".").at(-1));
  const l1 = adv.levels.find(l => l.level === 1);
  assert.equal(l1.columns[0].value, 6, "Jutsu Known at 1st");
  assert.ok(adv.levels.find(l => l.level === 3).entries.some(e => e.title === "Subclass"));
  assert.ok(adv.levels.find(l => l.level === 4).entries.some(e => e.kind === "ASI"));
});

test("item sheet templates render for every type", () => {
  const hbs = Handlebars.create();
  registerHelpers(hbs);
  const part = n => hbs.compile(fs.readFileSync(path.join(ROOT, "templates/item", `${n}.hbs`), "utf8"));
  const parts = Object.fromEntries(["header", "tabs", "sidebar", "description", "details", "advancement", "effects"].map(n => [n, part(n)]));
  for ( const src of items ) {
    const item = doc(src.name) ?? makeActor({ items: [src] }).items.find(i => i.name === src.name);
    const vm = itemVM(item, { source: item.system });
    const ctx = { vm, editable: true, typeLabel: item.type, tabs: [{ id: "description", label: "Description", active: true }],
      tab: { cssClass: "active" }, blocks: vm.htmlFields.map(f => ({ ...f, enriched: f.html })) };
    const html = Object.values(parts).map(p => p(ctx)).join("");
    assert.match(html, /name="name"/);
    assert.match(html, /<prose-mirror name="system.description"/);
    if ( vm.details.some(s => s.fields.some(f => f.kind === "tags")) ) assert.match(html, /data-action="toggleTag"/);
    if ( item.type === "class" ) assert.match(html, /adv-table/);
  }
});
