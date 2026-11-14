/**
 * Write the CARD1d rider tables (content/riders/*.json) onto feature sources (packs/_source/features).
 * Idempotent: rerunning changes nothing. Riders live in their own tables so content rebuilds can't
 * erase them; run this after any rebuild, then `npm run pack`.
 *
 *   node tools/content/apply-riders.mjs           apply
 *   node tools/content/apply-riders.mjs --check   report problems and unapplied tables, change nothing
 *
 * Table format and the rider vocabulary: docs/RIDERS.md.
 */
import fs from "node:fs";
import path from "node:path";
import { validateRider } from "../../module/rules/riders.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const TABLES = path.join(ROOT, "content/riders");
const FEATURES = path.join(ROOT, "packs/_source/features");

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(path.join(dir, d.name))
  : d.name.endsWith(".json") && !d.name.startsWith("_folder") ? [path.join(dir, d.name)] : []));

/** Feature source files by identifier. */
export function featureFiles() {
  const out = new Map();
  for ( const f of walk(FEATURES) ) {
    const id = JSON.parse(fs.readFileSync(f, "utf8")).system?.identifier;
    if ( id ) out.set(id, [...(out.get(id) ?? []), f]);
  }
  return out;
}

/** All table entries: [{table, identifier, castRiders, riders}]. */
export function riderTables() {
  if ( !fs.existsSync(TABLES) ) return [];
  return fs.readdirSync(TABLES).filter(f => f.endsWith(".json")).flatMap(f => {
    const t = JSON.parse(fs.readFileSync(path.join(TABLES, f), "utf8"));
    return Object.entries(t.features ?? {}).map(([identifier, v]) => ({ table: f, identifier, castRiders: v.castRiders ?? [], riders: v.riders ?? [] }));
  });
}

/** Problems in the tables (validation, unknown identifiers). */
export function tableProblems(files = featureFiles()) {
  const p = [];
  for ( const e of riderTables() ) {
    const where = `${e.table} ${e.identifier}`;
    if ( !files.has(e.identifier) ) p.push(`${where}: no feature with this identifier`);
    for ( const c of e.castRiders ) {
      if ( !c.label || !c.rider ) p.push(`${where}: a cast rider needs label and rider`);
      for ( const msg of validateRider({ ...c.rider, cost: c.cost ?? c.rider?.cost }, "cast") ) p.push(`${where} (cast): ${msg}`);
    }
    for ( const r of e.riders ) for ( const msg of validateRider(r, "trigger") ) p.push(`${where}: ${msg}`);
  }
  return p;
}

/** The feature flags a table entry produces, merged with the feature's existing flags. */
export function mergedFlags(n5e = {}, entry) {
  const keep = [n5e.castOption, ...(n5e.castOptions ?? [])].filter(o => o && !o.rider);
  const castOptions = [...keep, ...entry.castRiders];
  const out = { ...n5e };
  delete out.castOption;
  if ( castOptions.length === 1 ) out.castOption = castOptions[0];
  else if ( castOptions.length ) out.castOptions = castOptions;
  else delete out.castOptions;
  if ( entry.riders.length ) out.riders = entry.riders; else delete out.riders;
  return out;
}

/** Apply (or, with check, only compare). Returns {changed: [files], problems}. */
export function applyRiders({ check = false } = {}) {
  const files = featureFiles();
  const problems = tableProblems(files);
  const changed = [];
  for ( const e of riderTables() ) {
    for ( const f of files.get(e.identifier) ?? [] ) {
      const doc = JSON.parse(fs.readFileSync(f, "utf8"));
      const before = JSON.stringify(doc.flags?.n5e ?? {});
      const n5e = mergedFlags(doc.flags?.n5e ?? {}, e);
      if ( JSON.stringify(n5e) === before ) continue;
      changed.push(path.relative(ROOT, f));
      if ( !check ) {
        doc.flags = { ...(doc.flags ?? {}), n5e };
        fs.writeFileSync(f, `${JSON.stringify(doc, null, 2)}\n`);
      }
    }
  }
  return { changed, problems };
}

if ( import.meta.url === `file://${process.argv[1]}` ) {
  const check = process.argv.includes("--check");
  const { changed, problems } = applyRiders({ check });
  for ( const p of problems ) console.error(`✗ ${p}`);
  if ( check ) {
    for ( const f of changed ) console.error(`✗ rider table not applied: ${f} (run npm run riders)`);
    if ( problems.length || changed.length ) process.exit(1);
    console.log(`✓ riders: ${riderTables().length} features, tables applied and valid`);
  } else {
    console.log(`riders: ${changed.length} feature file(s) updated${problems.length ? `, ${problems.length} problem(s)` : ""}`);
    if ( problems.length ) process.exit(1);
  }
}
