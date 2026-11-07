/**
 * Compile packs/_source/<pack>/*.json into LevelDB packs at packs/<pack>.
 * Usage: npm run pack            (all packs)
 *        npm run pack -- jutsu   (one pack)
 */
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "packs", "_source");
const only = process.argv.slice(2);

const packs = fs.readdirSync(SRC, { withFileTypes: true })
  .filter(d => d.isDirectory() && (!only.length || only.includes(d.name)))
  .map(d => d.name);

for ( const name of packs ) {
  const dest = path.join(ROOT, "packs", name);
  fs.rmSync(dest, { recursive: true, force: true });
  await compilePack(path.join(SRC, name), dest, { log: false, recursive: true });
  console.log(`packed ${name}`);
}
