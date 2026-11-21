/**
 * Write the class automation tables (content/automation/<class>.json; STD6d, docs/STD6d_SPEC.md) onto
 * the feature sources. One entry per feature, keyed by identifier; every feature of a table's class
 * must have one (100% coverage). Idempotent: rerunning changes nothing.
 *
 *   node tools/content/apply-automation.mjs           apply
 *   node tools/content/apply-automation.mjs --check   report problems and unapplied entries, change nothing
 *
 * An entry may carry (each replaces what the feature had for that field; absent fields are left alone):
 *   rules        rule elements and notes                     → flags.n5e.rules
 *   castOptions  cast dialog options (rider options are kept) → flags.n5e.castOption(s)
 *   activities   buttons                                     → system.activities
 *   pools        resource pools                              → system.resourcePools
 *   effects      transfer or action effects {name, levels?, changes?, rules?, applyTo?, requiresStance?} → embedded effects
 *                marked flags.n5e.std6d (effects the feature had without that mark are kept)
 *   duration     the feature's duration (how long its summons last: {value, unit})
 *   dropEffects  names of effects the feature had without that mark to remove (an imported effect the table replaces)
 *   flags        other flags.n5e values (castAs ...)
 *   status       automated | partial | note | none: what the review decided (shown in the review table)
 * Every listed feature gets flags.n5e.reviewed (its text is no longer parsed into buttons).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { validateConditionalRules } from "../../module/rules/effect-authoring.mjs";
import { automationOf } from "../../module/rules/automation-summary.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const TABLES = path.join(ROOT, "content/automation");
const FEATURES = path.join(ROOT, "packs/_source/features");
const STATUSES = ["automated", "partial", "note", "none"];

const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? walk(path.join(dir, d.name))
  : d.name.endsWith(".json") && !d.name.startsWith("_folder") ? [path.join(dir, d.name)] : []));
const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
/** A stable 16-character id ("n5e" + 13) from a seed. */
export const stableId = seed => `n5e${[...crypto.createHash("sha256").update(seed).digest()].slice(0, 13).map(b => ALNUM[b % 62]).join("")}`;

/** Feature sources of a class: Map identifier → {file, doc}. */
function classFeatures(cls) {
  const out = new Map();
  for ( const file of walk(FEATURES) ) {
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    if ( doc.system?.requirement?.class === cls ) out.set(doc.system.identifier, { file, doc });
  }
  return out;
}

export function automationTables() {
  if ( !fs.existsSync(TABLES) ) return [];
  return fs.readdirSync(TABLES).filter(f => f.endsWith(".json")).map(f => ({ file: f, ...JSON.parse(fs.readFileSync(path.join(TABLES, f), "utf8")) }));
}

/** The feature document an entry produces. */
export function appliedDoc(doc, entry) {
  const out = structuredClone(doc);
  const n5e = out.flags.n5e ??= {};
  n5e.reviewed = true;
  if ( entry.rules ) { if ( entry.rules.length ) n5e.rules = entry.rules; else delete n5e.rules; }
  if ( entry.castOptions ) {
    const riders = [n5e.castOption, ...(n5e.castOptions ?? [])].filter(o => o?.rider);
    const all = [...entry.castOptions, ...riders];
    delete n5e.castOption; delete n5e.castOptions;
    if ( all.length === 1 ) n5e.castOption = all[0];
    else if ( all.length ) n5e.castOptions = all;
  }
  for ( const [k, v] of Object.entries(entry.flags ?? {}) ) n5e[k] = v;
  if ( entry.activities ) out.system.activities = entry.activities;
  if ( entry.pools ) out.system.resourcePools = entry.pools;
  if ( entry.duration ) out.system.duration = { ...(out.system.duration ?? {}), ...entry.duration };
  if ( entry.effects ) {
    const kept = (out.effects ?? []).filter(e => !e.flags?.n5e?.std6d && !(entry.dropEffects ?? []).includes(e.name));
    const made = entry.effects.map(e => {
      const id = stableId(`${doc._id}:std6d:${e.name}`);
      const flags = { automation: true, std6d: true };
      if ( e.levels ) flags.levels = { min: e.levels.min ?? 0, max: e.levels.max ?? 0 };
      if ( e.rules?.length ) flags.rules = e.rules;
      if ( e.applyTo ) flags.applyTo = e.applyTo;
      if ( e.requiresStance ) flags.requiresStance = e.requiresStance;
      return { _id: id, name: e.name, type: "generic", img: doc.img ?? "icons/svg/aura.svg", transfer: e.applyTo !== "action", disabled: false,
        system: { category: "feature" }, changes: (e.changes ?? []).map(c => ({ key: c.key, value: String(c.value), mode: c.mode ?? 2, priority: null })),
        duration: {}, description: "", origin: null, tint: "#ffffff", statuses: [], flags: { n5e: flags }, sort: 0,
        _key: `!items.effects!${doc._id}.${id}` };
    });
    out.effects = [...kept, ...made];
  }
  return out;
}

export function tableProblems() {
  const p = [];
  for ( const t of automationTables() ) {
    const features = classFeatures(t.class);
    for ( const id of features.keys() ) if ( !t.features?.[id] ) p.push(`${t.file}: ${id} has no entry (every feature of a reviewed class needs one)`);
    for ( const [id, e] of Object.entries(t.features ?? {}) ) {
      const where = `${t.file} ${id}`;
      if ( !features.has(id) ) p.push(`${where}: no ${t.class} feature with this identifier`);
      if ( !STATUSES.includes(e.status) ) p.push(`${where}: status is one of ${STATUSES.join(", ")}`);
      for ( const fld of ["castOptions", "activities"] ) {
        const labels = (e[fld] ?? []).map(o => o.label);
        const dup = labels.filter((l, i) => labels.indexOf(l) !== i);
        if ( dup.length ) p.push(`${where}: ${fld} repeat ${[...new Set(dup)].join(", ")}`);
      }
      const check = (rules, at) => { try { validateConditionalRules(rules ?? []); } catch (error) { p.push(`${where}${at}: ${error.message}`); } };
      check(e.rules, "");
      for ( const fx of e.effects ?? [] ) check(fx.rules, ` (${fx.name})`);
      for ( const a of [...(e.activities ?? []), ...(e.castOptions ?? [])] ) {
        if ( a.effect?.rules ) check(a.effect.rules, ` (${a.label})`);
        if ( a.effect?.aura ) {
          if ( !(Number(a.effect.aura.radius) > 0) ) p.push(`${where} (${a.label}): an aura needs a radius`);
          if ( !["hostile", "friendly", "all"].includes(a.effect.aura.who ?? "hostile") ) p.push(`${where} (${a.label}): aura who is hostile, friendly or all`);
          check(a.effect.aura.effect?.rules, ` (${a.label} aura)`);
        }
      }
      if ( e.status !== "none" && features.has(id) && automationOf(appliedDoc(features.get(id).doc, e)).status === "none" ) {
        p.push(`${where}: status ${e.status} but nothing authored`);
      }
    }
  }
  return p;
}

export function applyAutomation({ check = false } = {}) {
  const problems = tableProblems();
  const changed = [];
  for ( const t of automationTables() ) {
    const features = classFeatures(t.class);
    for ( const [id, entry] of Object.entries(t.features ?? {}) ) {
      const f = features.get(id);
      if ( !f ) continue;
      const next = appliedDoc(f.doc, entry);
      if ( JSON.stringify(next) === JSON.stringify(f.doc) ) continue;
      changed.push(path.relative(ROOT, f.file));
      if ( !check ) fs.writeFileSync(f.file, `${JSON.stringify(next, null, 2)}\n`);
    }
  }
  return { changed, problems };
}

if ( import.meta.url === `file://${process.argv[1]}` ) {
  const check = process.argv.includes("--check");
  const { changed, problems } = applyAutomation({ check });
  for ( const msg of problems ) console.error(`✗ ${msg}`);
  if ( check && changed.length ) console.error(`✗ automation tables not applied: ${changed.join(", ")} (run node tools/content/apply-automation.mjs)`);
  if ( problems.length || (check && changed.length) ) process.exit(1);
  const n = automationTables().reduce((t, x) => t + Object.keys(x.features ?? {}).length, 0);
  console.log(`✓ class automation: ${automationTables().length} classes, ${n} features${check ? "" : `, ${changed.length} files written`}`);
}
