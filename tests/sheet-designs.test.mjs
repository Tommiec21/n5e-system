/**
 * SHEETS1: the optional character sheet designs keep every button, roll and field of the default sheet.
 * Each design replaces the chrome (header, tabs, rail, main) and reuses the rest, so this renders the
 * default chrome and each design's chrome against the same actor, in play and edit mode, and compares
 * what a player can click or type into. A field rendered twice would submit as an array, so every
 * field name must appear once. The templates are also checked as text (partials expanded), so blocks
 * the test actor does not show (death saves, pins) are compared too.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { makeActor, load, baseAbilities, taiSpec } from "./helpers/actor.mjs";
import { headerVM, railVM, mainVM } from "../module/view-models/character.mjs";
import { registerHelpers } from "../module/applications/helpers.mjs";
import { SHEET_DESIGNS, DESIGN_PARTS, DESIGN_TEMPLATE_PATHS } from "../module/applications/actor/sheet-designs.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const file = p => path.join(ROOT, p.replace(/^systems\/n5e\//, ""));
const hbs = Handlebars.create();
registerHelpers(hbs);
for ( const p of DESIGN_TEMPLATE_PATHS ) hbs.registerPartial(p, fs.readFileSync(file(p), "utf8"));
const base = name => `templates/actor/character/${name}.hbs`;
const design = (id, name) => `templates/actor/designs/${id}/${name}.hbs`;
const render = (p, ctx) => hbs.compile(fs.readFileSync(path.join(ROOT, p), "utf8"))(ctx);

const actor = makeActor({ name: "Design Test", system: baseAbilities,
  items: [taiSpec(7), load("features", "MartialTech"), load("clans", "Uchiha"), load("jutsu", "DynamicEntry")],
  conditions: [{ key: "burned", ranks: 2 }, { key: "dazed", ranks: 1 }] });

const tabs = Object.fromEntries(["main", "combat", "jutsu"].map(id => [id, { id, group: "primary", label: id, icon: "fa-solid fa-x", cssClass: id === "main" ? "active" : "" }]));
const context = edit => {
  const vms = { header: headerVM(actor), rail: railVM(actor), main: mainVM(actor) };
  return { editMode: edit, editable: true, tabs, tab: tabs.main, conditionChoices: [{ key: "burned", label: "Burned" }], vms };
};

/** What a player can use: actions (with their roll type and key), and field names with their counts. */
function controls(html) {
  const actions = new Set();
  for ( const m of html.matchAll(/<[^>]*data-action="([^"]+)"[^>]*>/g) ) {
    const roll = m[0].match(/data-roll="([^"]+)"/)?.[1];
    const key = m[0].match(/data-key="([^"]+)"/)?.[1];
    const rest = m[0].match(/data-rest="([^"]+)"/)?.[1];
    actions.add([m[1], roll, key, rest].filter(Boolean).join(":"));
  }
  const names = {};
  for ( const m of html.matchAll(/\sname="([^"]+)"/g) ) names[m[1]] = (names[m[1]] ?? 0) + 1;
  for ( const m of html.matchAll(/data-add-condition/g) ) names[m[0]] = (names[m[0]] ?? 0) + 1;
  return { actions, names };
}

function renderChrome(id, edit) {
  const ctx = context(edit);
  return DESIGN_PARTS.map(part => {
    const vm = ctx.vms[part];
    const d = { header: ctx.vms.header, rail: ctx.vms.rail, main: ctx.vms.main };
    return render(id ? design(id, part) : base(part), { ...ctx, vm, d });
  }).join("\n");
}

for ( const edit of [false, true] ) {
  const expected = controls(renderChrome(null, edit));
  for ( const id of Object.keys(SHEET_DESIGNS) ) {
    test(`${id} design keeps every control of the default sheet (${edit ? "edit" : "play"} mode)`, () => {
      const html = renderChrome(id, edit);
      assert.ok(!/\{\{/.test(html), "no unrendered mustache");
      const got = controls(html);
      assert.deepEqual([...expected.actions].filter(a => !got.actions.has(a)), [], "missing buttons or rolls");
      assert.deepEqual([...got.actions].filter(a => !expected.actions.has(a)), [], "buttons the default sheet does not have");
      assert.deepEqual(got.names, expected.names, "the same fields, each once");
      assert.equal((html.match(/data-tab="main"/g) ?? []).length, 2, "the main tab body and its tab link");
      assert.match(html, /class="tab n5e-tab main d-main active"/);
    });
  }
}

/** The template text with its design partials inlined. */
function expand(p) {
  return fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\{\{>\s*"([^"]+)"[^}]*\}\}/g, (_, q) => expand(file(q).slice(ROOT.length + 1)));
}
const literal = text => new Set([...text.matchAll(/data-action="([^"{]+|\{\{\.\.\/action\}\})"/g)].map(m => m[1])
  .concat([...text.matchAll(/data-roll="([^"]+)"/g)].map(m => `roll:${m[1]}`), text.includes("data-pin-zone") ? ["pin-zone"] : []));

test("every design template exists and the designs keep the default sheet's buttons as written", () => {
  const want = literal(DESIGN_PARTS.map(p => expand(base(p))).join("\n"));
  for ( const id of Object.keys(SHEET_DESIGNS) ) {
    for ( const part of DESIGN_PARTS ) assert.ok(fs.existsSync(path.join(ROOT, design(id, part))), `${id}/${part}`);
    const got = literal(DESIGN_PARTS.map(p => expand(design(id, p))).join("\n"));
    assert.deepEqual([...want].filter(a => !got.has(a)), [], id);
    assert.deepEqual([...got].filter(a => !want.has(a)), [], id);
  }
});

test("each design is registered, labelled and styled", () => {
  const system = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
  assert.ok(system.styles.includes("styles/designs.css"));
  const css = fs.readFileSync(path.join(ROOT, "styles/designs.css"), "utf8");
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, "lang/en.json"), "utf8"));
  const entry = fs.readFileSync(path.join(ROOT, "n5e.mjs"), "utf8");
  assert.match(entry, /designSheet\(/);
  for ( const [id, d] of Object.entries(SHEET_DESIGNS) ) {
    assert.ok(css.includes(`.n5e-design-${id}`), `${id} has styles`);
    assert.ok(d.label.split(".").reduce((o, k) => o?.[k], en), `${id} label`);
  }
});

test("each design registers under its own stable sheet id", () => {
  const code = fs.readFileSync(path.join(ROOT, "module/applications/actor/character-designs.mjs"), "utf8");
  // Foundry stores the choice as "n5e.<class name>"; the name comes from the design id and must stay fixed.
  assert.match(code, /const name = `CharacterSheet\$\{id\[0\]\.toUpperCase\(\)\}\$\{id\.slice\(1\)\}`;/);
  assert.match(code, /return \{ \[name\]: class extends CharacterSheet/);
});
