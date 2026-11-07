/**
 * Extract LevelDB packs at packs/<pack> into packs/_source/<pack>/*.json, one file per document.
 * Run this after editing compendium content inside Foundry, then commit the JSON.
 * Usage: npm run unpack [-- packName]
 */
import { extractPack } from "@foundryvtt/foundryvtt-cli";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const system = JSON.parse(fs.readFileSync(path.join(ROOT, "system.json"), "utf8"));
const only = process.argv.slice(2);

/** Turn a document name into a stable, readable file name. */
const slug = name => String(name).toLowerCase().normalize("NFKD")
  .replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-");

for ( const pack of system.packs ) {
  if ( only.length && !only.includes(pack.name) ) continue;
  const src = path.join(ROOT, pack.path);
  if ( !fs.existsSync(src) ) continue;
  const dest = path.join(ROOT, "packs", "_source", pack.name);
  fs.rmSync(dest, { recursive: true, force: true });
  await extractPack(src, dest, {
    log: false,
    clean: true,
    transformName: doc => `${slug(doc.name)}-${doc._id}.json`
  });
  console.log(`unpacked ${pack.name}`);
}
