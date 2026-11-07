/**
 * Compile and render every character-sheet template with Handlebars against real view models,
 * so a broken template or a missing helper fails here instead of in Foundry.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { makeActor, load, baseAbilities, taiSpec } from "./helpers/actor.mjs";
import {
  headerVM, railVM, mainVM, jutsuVM, inventoryVM, featuresVM, effectsVM, biographyVM
} from "../module/view-models/character.mjs";
import { itemCardData } from "../module/chat/card.mjs";
import { registerHelpers } from "../module/applications/helpers.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const hbs = Handlebars.create();
registerHelpers(hbs);
for ( const p of ["parts/chips", "parts/item-controls", "parts/field-rows"] ) {
  hbs.registerPartial(`systems/n5e/templates/${p}.hbs`, fs.readFileSync(path.join(ROOT, "templates", `${p}.hbs`), "utf8"));
}
const render = (name, ctx) => hbs.compile(fs.readFileSync(path.join(ROOT, "templates", name), "utf8"), { strict: false })(ctx);

const actor = (() => {
  const kunai = load("equipment", "Kunai");
  kunai.system.equipped = true;
  const kit = { _id: "kit00000000000001", name: "Trapper's Kit", type: "toolkit", system: { kit: "trappers", rank: "D", charges: { value: 3 } } };
  return makeActor({ name: "Taijutsu Test", system: baseAbilities, acCalc: "martialTechnique",
    items: [taiSpec(7), load("features", "MartialTech"), load("clans", "Uchiha"), load("jutsu", "DynamicEntry"),
      load("jutsu", "LeafHurrican"), load("equipment", "ShinobiJacket"), kunai, load("equipment", "Backpk"), kit],
    conditions: [{ key: "burned", ranks: 2 }, { key: "dazed", ranks: 1 }] });
})();

const base = edit => ({ editMode: edit, editable: true, tab: { cssClass: "active" }, tabs: { main: { id: "main", group: "primary", label: "Main", cssClass: "active" } } });

for ( const edit of [false, true] ) {
  test(`character templates render (${edit ? "edit" : "play"} mode)`, () => {
    const de = actor.items.find(i => i.name === "Dynamic Entry").id;
    const parts = {
      header: headerVM(actor), rail: railVM(actor), main: mainVM(actor),
      jutsu: jutsuVM(actor, { expanded: new Set([de]), castRank: {} }), inventory: inventoryVM(actor),
      features: featuresVM(actor), effects: effectsVM(actor), biography: { ...biographyVM(actor), biographyHTML: "<p>Bio</p>" }
    };
    for ( const [name, vm] of Object.entries(parts) ) {
      const html = render(`actor/character/${name}.hbs`, { ...base(edit), vm, conditionChoices: [{ key: "burned", label: "Burned" }], rows: [] });
      assert.ok(html.length > 50, name);
      assert.ok(!/\{\{/.test(html), `${name}: unrendered mustache`);
    }
    const jutsu = render("actor/character/jutsu.hbs", { ...base(edit), vm: parts.jutsu });
    assert.match(jutsu, /Dynamic Entry/);
    assert.match(jutsu, /data-action="castRank"/, "expanded row offers cast ranks");
    assert.match(jutsu, /<svg class="n5e-glyph"/, "action glyph rendered unescaped");
    const main = render("actor/character/main.hbs", { ...base(edit), vm: parts.main });
    assert.match(main, /data-tooltip-html="&lt;div class&#x3D;&quot;n5e-breakdown/, "breakdown tooltip is attribute-escaped HTML");
    assert.equal((main.match(/class="skill /g) ?? []).length, 20);
    assert.equal((main.match(/class="save-row/g) ?? []).length, 6);
    const header = render("actor/character/header.hbs", { ...base(edit), vm: parts.header });
    assert.equal((header.match(/class="ab-tile"/g) ?? []).length, 6);
    assert.match(header, /class="bubble n5e-row class"/);
    if ( edit ) assert.match(header, /name="system\.abilities\.str\.value"/);
    else assert.doesNotMatch(header, /name="system\.abilities\.str\.value"/);
    const rail = render("actor/character/rail.hbs", { ...base(edit), vm: parts.rail, conditionChoices: [] });
    assert.match(rail, /Burned/);
    assert.match(rail, /Will of Fire/);
    assert.match(rail, /data-action="setWillOfFire"/);
    assert.match(rail, /class="portrait"/);
    const inv = render("actor/character/inventory.hbs", { ...base(edit), vm: parts.inventory });
    assert.match(inv, /data-action="setAmmo"/);
    assert.match(inv, /data-action="setCharge"/);
    render("actor/character/tabs.hbs", base(edit));
    render("actor/character/actions.hbs", base(edit));
  });
}

test("chat card renders a jutsu with stats and riders", () => {
  const lh = actor.items.find(i => i.name === "Leaf Hurricane");
  const data = itemCardData(lh);
  assert.deepEqual(data.stats.map(s => s.label), ["Cost", "Save DC", "Time"]);
  assert.ok(data.blocks.some(b => b.label === "Finisher"));
  const html = render("chat/item-card.hbs", data);
  assert.match(html, /Leaf Hurricane/);
  assert.match(html, /DC/);
});
