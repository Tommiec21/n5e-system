/**
 * Copy the built system into a local Foundry Data folder for testing (no zip needed).
 * Usage: FOUNDRY_DATA="C:/Users/<you>/AppData/Local/FoundryVTT/Data" npm run install-local
 * Or create foundry.local.json: { "dataPath": "..." } (git-ignored).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
let dataPath = process.env.FOUNDRY_DATA;
const localCfg = path.join(ROOT, "foundry.local.json");
if ( !dataPath && fs.existsSync(localCfg) ) dataPath = JSON.parse(fs.readFileSync(localCfg, "utf8")).dataPath;
if ( !dataPath ) {
  console.error("Set FOUNDRY_DATA or create foundry.local.json with { \"dataPath\": \"...\" }");
  process.exit(1);
}
execSync("node tools/pack.mjs", { cwd: ROOT, stdio: "inherit" });
const dest = path.join(dataPath, "systems", "n5e");
const INCLUDE = ["system.json", "n5e.mjs", "module", "templates", "styles", "lang", "LICENSE", "LICENSES", "README.md",
  "CHANGELOG.md"];
fs.mkdirSync(dest, { recursive: true });
for ( const entry of INCLUDE ) {
  const src = path.join(ROOT, entry);
  if ( fs.existsSync(src) ) fs.cpSync(src, path.join(dest, entry), { recursive: true });
}
const system = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
for ( const pack of system.packs ) {
  const src = path.join(ROOT, pack.path);
  const out = path.join(dest, pack.path);
  fs.rmSync(out, { recursive: true, force: true });
  if ( fs.existsSync(src) ) fs.cpSync(src, out, { recursive: true });
}
console.log(`Installed to ${dest}. Restart the world (or Foundry) to load changes.`);
