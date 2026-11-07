/**
 * Static consistency checks that don't need Foundry:
 *  - every documentType in system.json has a data model and vice versa
 *  - every template path referenced in code exists
 *  - every pack source folder matches a pack in system.json, and every doc has _id/_key/type
 *  - TYPES labels exist in lang/en.json
 */
import "../tests/helpers/foundry-stub.mjs";
import fs from "node:fs";
import path from "node:path";
import { actorModels, itemModels, effectModels } from "../module/data/_index.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const system = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
const lang = JSON.parse(fs.readFileSync(path.join(ROOT, "lang/en.json"), "utf8"));
const errors = [];

const pairs = [["Actor", actorModels], ["Item", itemModels], ["ActiveEffect", effectModels]];
for ( const [doc, models] of pairs ) {
  const declared = Object.keys(system.documentTypes[doc] ?? {});
  for ( const t of declared ) {
    if ( !models[t] ) errors.push(`${doc}.${t} declared in system.json but has no data model`);
    if ( !lang.TYPES?.[doc]?.[t] ) errors.push(`${doc}.${t} has no TYPES label in lang/en.json`);
    try { models[t]?.defineSchema(); } catch (e) { errors.push(`${doc}.${t} defineSchema failed: ${e.message}`); }
  }
  for ( const t of Object.keys(models) ) if ( !declared.includes(t) ) errors.push(`${doc}.${t} model not in system.json`);
}

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
for ( const file of [...walk(path.join(ROOT, "module")), path.join(ROOT, "n5e.mjs"), ...walk(path.join(ROOT, "templates"))] ) {
  const text = fs.readFileSync(file, "utf8");
  for ( const m of text.matchAll(/systems\/n5e\/(templates\/[\w/.-]+\.hbs)/g) ) {
    if ( !fs.existsSync(path.join(ROOT, m[1])) ) errors.push(`${path.relative(ROOT, file)}: missing ${m[1]}`);
  }
}

const packNames = new Set(system.packs.map(p => p.name));
const srcRoot = path.join(ROOT, "packs", "_source");
for ( const dir of fs.existsSync(srcRoot) ? fs.readdirSync(srcRoot) : [] ) {
  if ( !packNames.has(dir) ) errors.push(`packs/_source/${dir} is not a pack in system.json`);
  for ( const file of walk(path.join(srcRoot, dir)) ) {
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    for ( const k of ["_id", "_key", "name", "type"] ) if ( !doc[k] ) errors.push(`${path.relative(ROOT, file)}: no ${k}`);
    if ( doc.type && !itemModels[doc.type] ) errors.push(`${path.relative(ROOT, file)}: unknown type ${doc.type}`);
  }
}

if ( errors.length ) {
  console.error(errors.map(e => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log("✓ system.json, data models, templates, packs and language file are consistent");
