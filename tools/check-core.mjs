/**
 * Shared-core boundary check (SHARED1). Every file under the core roots (core.json) must:
 *   - import only files inside the core roots (no Foundry, no System workflow/view code);
 *   - never touch a host global (game, CONFIG, canvas, ui, foundry, Hooks, fromUuid...), bare or
 *     through globalThis. Hosts provide those through rules/settings.mjs and rules/host.mjs.
 * Comments and string literals are ignored. Exits 1 with every problem listed.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const core = JSON.parse(fs.readFileSync(path.join(root, "core.json"), "utf8"));
const roots = core.roots.map(r => path.join(root, r));
const inCore = file => roots.some(r => file === r || file.startsWith(r + path.sep));

/** Remove comments and string/template literal contents so prose can't trip the check. */
export function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\])\/\/.*$/gm, "$1")
    .replace(/`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`/g, "``")
    .replace(/"(?:\\.|[^"\\\n])*"/g, "\"\"")
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''");
}

/** Problems in one core file. */
export function checkFile(file, src, forbidden = core.forbidden) {
  const problems = [];
  for ( const m of src.matchAll(/(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g) ) {
    const spec = m[1] ?? m[2];
    if ( !spec.startsWith(".") ) { problems.push(`imports a package or host module "${spec}"`); continue; }
    const target = path.resolve(path.dirname(file), spec);
    if ( !inCore(target) ) problems.push(`imports "${spec}" from outside the core`);
  }
  const code = codeOnly(src);
  const names = forbidden.join("|");
  const re = new RegExp(`(?:globalThis\\.(?:${names})\\b|(?<![\\w.$])(?:${names})\\s*[.(\\[])`, "g");
  for ( const m of code.matchAll(re) ) problems.push(`touches host global "${m[0].trim()}"`);
  return problems;
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith(".mjs") ? [p] : [];
  });
}

/** Core tests may import only the core and their own folder (they ship with the core bundle). */
export function checkTestFile(file, src, testsDir) {
  const problems = [];
  for ( const m of src.matchAll(/(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|import\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g) ) {
    const spec = m[1] ?? m[2] ?? m[3];
    if ( !spec.startsWith(".") ) {
      if ( !spec.startsWith("node:") ) problems.push(`imports package "${spec}"`);
      continue;
    }
    const target = path.resolve(path.dirname(file), spec);
    if ( !inCore(target) && !target.startsWith(testsDir + path.sep) ) problems.push(`imports "${spec}" from outside the core`);
  }
  return problems;
}

if ( import.meta.url === `file://${process.argv[1]}` ) {
  const files = roots.flatMap(walk);
  const testsDir = path.join(root, core.tests);
  const tests = fs.existsSync(testsDir) ? walk(testsDir) : [];
  const all = [
    ...files.flatMap(f => checkFile(f, fs.readFileSync(f, "utf8")).map(p => `${path.relative(root, f)}: ${p}`)),
    ...tests.flatMap(f => checkTestFile(f, fs.readFileSync(f, "utf8"), testsDir).map(p => `${path.relative(root, f)}: ${p}`))
  ];
  if ( all.length ) {
    console.error(`✗ shared core boundary (${all.length} problem${all.length === 1 ? "" : "s"}):\n  ${all.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`✓ shared core: ${files.length} files and ${tests.length} core test files, no host globals, no imports leaving the core`);
}
