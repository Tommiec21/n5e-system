/**
 * Apply the pure item migrations (module/migration/data1.mjs, atk1.mjs) to every compendium source in
 * packs/_source, so compendiums match migrated worlds. Idempotent. Usage: node tools/migrate-packs.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { migrateItemData1, migrateItemData1b } from "../module/migration/data1.mjs";
import { migrateThrownAmmo } from "../module/migration/atk1.mjs";

/** Every pure item migration in order; null when nothing changed. */
const migrateAll = d => {
  let cur = d;
  for ( const fn of [migrateItemData1, migrateItemData1b, migrateThrownAmmo] ) cur = fn(cur) ?? cur;
  return cur === d ? null : cur;
};

const root = new URL("../packs/_source", import.meta.url).pathname;
const files = [];
const walk = dir => { for ( const f of readdirSync(dir) ) { const p = join(dir, f); if ( statSync(p).isDirectory() ) walk(p); else if ( f.endsWith(".json") ) files.push(p); } };
walk(root);

const migrateDoc = doc => {
  let changed = false;
  if ( doc.system ) {
    const next = migrateAll(doc);
    if ( next ) { Object.assign(doc, next); changed = true; }
  }
  for ( const item of doc.items ?? [] ) {
    const next = migrateAll(item);
    if ( next ) { Object.assign(item, next); changed = true; }
  }
  return changed;
};

let count = 0;
for ( const file of files ) {
  const text = readFileSync(file, "utf8");
  const doc = JSON.parse(text);
  if ( !migrateDoc(doc) ) continue;
  const indent = text.match(/^\{\n(\s+)/)?.[1]?.length ?? 2;
  writeFileSync(file, JSON.stringify(doc, null, indent) + (text.endsWith("\n") ? "\n" : ""));
  count++;
}
console.log(`migrate-packs: ${count} of ${files.length} files updated`);
