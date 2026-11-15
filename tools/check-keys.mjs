/**
 * ROLL1c (King 2026-11-14): no key combination may decide what a roll, cast or chat button does.
 * "The options need to be in the user's face and not hidden behind a combination key."
 * Fails when module code reads altKey, ctrlKey, metaKey or shiftKey. Exempt: placing an area
 * template on the map (Foundry's own Shift/Ctrl angle snapping while dragging).
 * Run: node tools/check-keys.mjs (part of npm run check).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXEMPT = new Set(["module/workflow/areas.mjs"]);
const KEYS = /\b(altKey|ctrlKey|metaKey|shiftKey)\b/;
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".mjs") ? [path.join(dir, e.name)] : []));

const found = [];
for ( const file of [...walk(path.join(ROOT, "module")), path.join(ROOT, "n5e.mjs")] ) {
  const rel = path.relative(ROOT, file).replaceAll(path.sep, "/");
  if ( EXEMPT.has(rel) ) continue;
  fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    const code = line.replace(/\/\/.*$/, "").replace(/^\s*\*.*$/, "");
    if ( KEYS.test(code) ) found.push(`${rel}:${i + 1}: ${line.trim()}`);
  });
}
if ( found.length ) {
  console.error(`✗ key combinations decide behaviour (ROLL1c):\n${found.map(f => `  ${f}`).join("\n")}`);
  process.exit(1);
}
console.log("✓ no key combinations in rolls, casts or chat buttons");
