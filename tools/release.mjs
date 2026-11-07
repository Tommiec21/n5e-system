/**
 * Build a release: compile packs, stamp the manifest, and zip the system into dist/.
 *
 * Usage:
 *   npm run release                      -> zip using the version in system.json
 *   npm run release -- 0.1.0-alpha.2     -> bump system.json + package.json first
 *   GITHUB_REPOSITORY=owner/repo npm run release   (CI sets this) -> fills manifest/download URLs
 *
 * Output: dist/system.json and dist/n5e.zip (the two assets Foundry needs for auto-update).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import archiver from "archiver";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");
const read = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), "utf8"));
const write = (f, d) => fs.writeFileSync(path.join(ROOT, f), `${JSON.stringify(d, null, 2)}\n`);

const system = read("system.json");
const pkg = read("package.json");
const newVersion = process.argv[2];
if ( newVersion ) {
  system.version = pkg.version = newVersion;
  write("system.json", system);
  write("package.json", pkg);
  console.log(`version -> ${newVersion}`);
}

execSync("node tools/pack.mjs", { cwd: ROOT, stdio: "inherit" });

// Manifest for distribution: repository placeholders replaced, download pinned to this version.
const repo = process.env.GITHUB_REPOSITORY;
const manifest = structuredClone(system);
const stamp = s => repo ? s.replaceAll("__GITHUB_REPOSITORY__", repo) : s;
for ( const key of ["url", "manifest", "download", "changelog"] ) manifest[key] = stamp(manifest[key]);
manifest.download = manifest.download.replace(/\/download\/v[^/]+\//, `/download/v${system.version}/`);
if ( !repo ) console.warn("GITHUB_REPOSITORY not set: manifest URLs keep their placeholders (fine for local installs).");

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, "system.json"), `${JSON.stringify(manifest, null, 2)}\n`);

// Everything Foundry needs at runtime; sources, tests and tooling stay out of the zip.
const INCLUDE = ["n5e.mjs", "module", "templates", "styles", "lang", "assets", "LICENSE", "LICENSES", "README.md", "CHANGELOG.md"];
const output = fs.createWriteStream(path.join(DIST, "n5e.zip"));
const zip = archiver("zip", { zlib: { level: 9 } });
zip.pipe(output);
zip.append(JSON.stringify(manifest, null, 2), { name: "system.json" });
for ( const entry of INCLUDE ) {
  const full = path.join(ROOT, entry);
  if ( !fs.existsSync(full) ) continue;
  if ( fs.statSync(full).isDirectory() ) zip.directory(full, entry);
  else zip.file(full, { name: entry });
}
// Compiled LevelDB packs (not the JSON sources).
for ( const pack of system.packs ) {
  const full = path.join(ROOT, pack.path);
  if ( fs.existsSync(full) ) zip.directory(full, pack.path);
}
await zip.finalize();
await new Promise(r => output.on("close", r));
console.log(`dist/n5e.zip (${(zip.pointer() / 1024).toFixed(0)} KB) and dist/system.json ready for v${system.version}`);
