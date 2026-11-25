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
