/**
 * CARDS1 (King 2026-11-25): class cards fixed from the book's boxes.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const docs = pack => walk(path.join(ROOT, "packs/_source", pack)).filter(f => f.endsWith(".json") && !path.basename(f).startsWith("_folder")).map(f => JSON.parse(fs.readFileSync(f, "utf8")));
const by = (pack, id) => docs(pack).find(d => d.system?.identifier === id);

test("CARDS1: Transfiguration has the Chimeric Mutation and Transmogrified Biology penalty options", () => {
  const t = by("conditions", "transfiguration").system.description;
  for ( const w of ["Aberration.", "Demonic.", "Monstrosity.", "Sage Beast."] ) assert.ok(t.includes(w), w);
});

test("CARDS1: Tidal Draw is a condition card, inflicted from Surging Maelstrom", () => {
  const c = by("conditions", "tidal-draw");
  assert.deepEqual(c.system.tags, ["elemental"]);
  assert.match(c.system.description, /Chakra Molding/);
  const f = by("features", "surging-maelstrom-tsunami");
  assert.ok(f.system.activities.some(a => a.effect?.condition === "tidal-draw"));
});

test("CARDS1: Chakra Barrier is an Amp card in three versions, started from its feature", () => {
  const amps = docs("amps").filter(a => a.system.identifier.startsWith("chakra-barrier"));
  assert.deepEqual(amps.map(a => a.name).sort(), ["Chakra Barrier", "Chakra Barrier (17th)", "Chakra Barrier (9th)"]);
  assert.equal(amps.find(a => a.name === "Chakra Barrier (17th)").system.changes.length, 3);
  const f = by("features", "chakra-barrier-barrier-scout");
  assert.ok(f.system.activities.some(a => a.effect?.amp === "chakra-barrier"));
  assert.ok(!(f.effects ?? []).some(e => e.name === "Chakra Barrier: Mastery"));
});

test("CARDS1: Primal Chain's box is on Primal Strikes", () => {
  assert.match(by("features", "primal-strikes").system.description, /<h4>Primal Chain<\/h4>/);
});
