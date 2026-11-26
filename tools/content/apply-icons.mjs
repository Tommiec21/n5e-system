/**
 * Write the feature icons (content/icons/icons.json; King 2026-11-25, tools/icons) onto the pack sources.
 * The table maps pack → item identifier (or _id, where classes share an identifier) → image. Each key must
 * match exactly one item in that pack. Idempotent.
 *
 *   node tools/content/apply-icons.mjs           apply
 *   node tools/content/apply-icons.mjs --check   report missing, duplicate or unapplied entries, change nothing
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const TABLE = path.join(ROOT, "content/icons/icons.json");
const check = process.argv.includes("--check");

function walk(dir, out = []) {
  for ( const f of fs.readdirSync(dir) ) {
    const p = path.join(dir, f);
    if ( fs.statSync(p).isDirectory() ) walk(p, out);
    else if ( f.endsWith(".json") && !f.startsWith("_folder") ) out.push(p);
  }
  return out;
}

const table = JSON.parse(fs.readFileSync(TABLE, "utf8"));
const problems = [];
let changed = 0;
for ( const [pack, icons] of Object.entries(table) ) {
  if ( pack.startsWith("_") ) continue;
  const byId = new Map();
  for ( const file of walk(path.join(ROOT, "packs/_source", pack)) ) {
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    for ( const id of [doc._id, doc.system?.identifier] ) {
      if ( id && id in icons ) byId.set(id, [...(byId.get(id) ?? []), { file, doc }]);
    }
  }
  for ( const [id, img] of Object.entries(icons) ) {
    const found = byId.get(id) ?? [];
    if ( found.length !== 1 ) { problems.push(`${pack}/${id}: ${found.length} items (needs exactly 1)`); continue; }
    if ( !fs.existsSync(path.join(ROOT, img.replace(/^systems\/n5e\//, ""))) ) { problems.push(`${pack}/${id}: no file ${img}`); continue; }
    const { file, doc } = found[0];
    if ( doc.img === img ) continue;
    if ( check ) { problems.push(`${pack}/${id}: icon not applied`); continue; }
    doc.img = img;
    fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
    changed++;
  }
}
for ( const p of problems ) console.log(`  ${p}`);
console.log(check ? `icons: ${problems.length} problem(s)` : `icons: ${changed} item(s) updated, ${problems.length} problem(s)`);
if ( problems.length ) process.exitCode = 1;
