/**
 * STD0 no-hard-coding gate (King 2026-11-14/15, docs/STD_SPEC.md "Enforcement").
 *
 * Content (a feature, jutsu, clan, feat, stance or item) must never be named in engine code. This
 * finds every string literal in module/ that equals a pack document's identifier (system.identifier)
 * and fails on any that isn't in tools/hardcoding-allowlist.json. The allowlist holds the branches
 * that existed when the gate was added; each STD batch removes its entries until it is empty (STD7).
 *
 *   node tools/check-hardcoding.mjs            check (part of npm run check)
 *   node tools/check-hardcoding.mjs --write    rewrite the allowlist from the current code (only when a
 *                                              batch REMOVES branches; never to admit new ones)
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const LIST = path.join(root, "tools/hardcoding-allowlist.json");

/** Every pack identifier (content names). */
export function contentIdentifiers() {
  const ids = new Set();
  const walk = dir => {
    for ( const e of fs.readdirSync(dir, { withFileTypes: true }) ) {
      const p = path.join(dir, e.name);
      if ( e.isDirectory() ) walk(p);
      else if ( e.name.endsWith(".json") ) {
        try {
          const id = JSON.parse(fs.readFileSync(p, "utf8"))?.system?.identifier;
          if ( typeof id === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(id) ) ids.add(id);
        } catch { /* not a document */ }
      }
    }
  };
  walk(path.join(root, "packs/_source"));
  return ids;
}

/** {file: [identifier, ...]} for every identifier literal in module/. */
export function findBranches(ids = contentIdentifiers()) {
  const out = {};
  const walk = dir => {
    for ( const e of fs.readdirSync(dir, { withFileTypes: true }) ) {
      const p = path.join(dir, e.name);
      if ( e.isDirectory() ) walk(p);
      else if ( e.name.endsWith(".mjs") ) {
        const text = fs.readFileSync(p, "utf8");
        const found = new Set();
        for ( const m of text.matchAll(/["'`]([a-z0-9]+(?:-[a-z0-9]+)+)["'`]/g) ) if ( ids.has(m[1]) ) found.add(m[1]);
        if ( found.size ) out[path.relative(root, p)] = [...found].sort();
      }
    }
  };
  walk(path.join(root, "module"));
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
}

if ( import.meta.url === `file://${process.argv[1]}` ) {
  const now = findBranches();
  if ( process.argv.includes("--write") ) {
    fs.writeFileSync(LIST, `${JSON.stringify(now, null, 2)}\n`);
    console.log(`✓ hard-coding allowlist written: ${Object.values(now).flat().length} content names in ${Object.keys(now).length} files`);
  } else {
    const allowed = JSON.parse(fs.readFileSync(LIST, "utf8"));
    const added = Object.entries(now).flatMap(([f, names]) => names.filter(n => !(allowed[f] ?? []).includes(n)).map(n => `${f}: "${n}"`));
    if ( added.length ) {
      console.error(`✗ content named in engine code (STD contract: engines read data, never content names):\n  ${added.join("\n  ")}`);
      process.exit(1);
    }
    const left = Object.values(allowed).flat().length;
    console.log(`✓ no new content names in code (${left} allowlisted, to be removed by STD batches)`);
  }
}
