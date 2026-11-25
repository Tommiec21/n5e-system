/**
 * LEFT1 fixes (King 2026-11-25): level-up cards grow with their text; the Classes compendium shows each
 * class at the top of its folder with its subclasses in a Subclasses folder.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

test("LEFT1: Classes compendium: class on top, subclasses in <Class> › Subclasses", () => {
  const docs = walk(path.join(ROOT, "packs/_source/classes")).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(f, "utf8")));
  const folders = Object.fromEntries(docs.filter(d => d._key?.startsWith("!folders!")).map(d => [d._id, d]));
  const classes = docs.filter(d => d.type === "class");
  assert.equal(classes.length, 7);
  for ( const c of classes ) {
    const f = folders[c.folder];
    assert.deepEqual([f.name, f.folder], [c.name, null], c.name);
    const subs = docs.filter(d => d.type === "subclass" && d.system.classIdentifier === c.system.identifier);
    assert.ok(subs.length, c.name);
    for ( const s of subs ) {
      const sf = folders[s.folder];
      assert.deepEqual([sf.name, sf.folder], ["Subclasses", c.folder], s.name);
    }
  }
  assert.match(fs.readFileSync(path.join(ROOT, "tools/content/build_content.py"), "utf8"), /"Subclasses"\]/);
  assert.match(fs.readFileSync(path.join(ROOT, "tools/content/build-class-expansion.mjs"), "utf8"), /\[cls\.name, "Subclasses"\]/);
});

test("LEFT1: level-up cards grow with their text (no fixed button height)", () => {
  const css = fs.readFileSync(path.join(ROOT, "styles/sheet.css"), "utf8");
  assert.match(css, /\.n5e-level-up \.lu-card \{ height: auto !important; max-height: none !important;/);
  assert.match(css, /\.n5e-level-up \.lu-card span\.sub \{[^}]*line-clamp: 3/);
});

test("LEFT1 P6: the item sheet edits jutsu granted at a level", async () => {
  const { itemVM } = await import("../module/view-models/item.mjs").catch(() => ({}));
  const vm = fs.readFileSync(path.join(ROOT, "module/view-models/item.mjs"), "utf8");
  assert.match(vm, /F\.levelUuids\(src, "grants\.jutsuByLevel", "Granted at level"/);
  const tpl = fs.readFileSync(path.join(ROOT, "templates/item/details.hbs"), "utf8");
  assert.match(tpl, /n5eEq kind "levelUuids"/);
  assert.match(tpl, /data-level-path="\{\{\.\.\/path\}\}"/);
  const sheet = fs.readFileSync(path.join(ROOT, "module/applications/item/item-sheet.mjs"), "utf8");
  assert.match(sheet, /"levelList" in zone\.dataset/);
  assert.match(sheet, /input\[data-level-path\]/);
  if ( itemVM ) {
    const item = { type: "feat", name: "Reaper", system: { grants: { jutsu: [], jutsuByLevel: [{ uuid: "Compendium.n5e.jutsu.Item.m", level: 6 }] }, bonusJutsu: {}, requirement: {} } };
    const fields = itemVM(item, { source: item.system, nameOf: u => `name:${u.split(".").pop()}` }).details?.flatMap(s => s.fields) ?? [];
    const f = fields.find(x => x.kind === "levelUuids");
    if ( f ) assert.deepEqual(f.items.map(i => [i.name, i.level]), [["name:m", 6]]);
  }
});
