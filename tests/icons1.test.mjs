/**
 * ICONS1 (King 2026-11-25): feature icons from content/icons/icons.json are SVG tiles and are applied.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const table = JSON.parse(fs.readFileSync(path.join(ROOT, "content/icons/icons.json"), "utf8"));
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

test("ICONS1: every icon is a 512 SVG tile in assets/icons", () => {
  for ( const [pack, icons] of Object.entries(table) ) {
    if ( pack.startsWith("_") ) continue;
    for ( const img of Object.values(icons) ) {
      assert.match(img, /^systems\/n5e\/assets\/icons\/.+\.svg$/);
      const svg = fs.readFileSync(path.join(ROOT, img.replace("systems/n5e/", "")), "utf8");
      assert.match(svg, /viewBox="0 0 512 512"/, img);
    }
  }
});

test("ICONS1: the Aburame and Scout-Nin items carry their icons", () => {
  const items = pack => walk(path.join(ROOT, "packs/_source", pack)).filter(f => f.endsWith(".json") && !path.basename(f).startsWith("_folder"))
    .map(f => JSON.parse(fs.readFileSync(f, "utf8")));
  const clan = items("clans").find(d => d.system?.identifier === "aburame");
  assert.equal(clan.img, "systems/n5e/assets/icons/clans/aburame/aburame.svg");
  const feats = items("features");
  assert.equal(feats.find(d => d._id === "n5e7JLePQ8z6WsYj").img, "systems/n5e/assets/icons/classes/scout-nin/core/extra-attack.svg");
  assert.equal(feats.find(d => d.system?.identifier === "taj-kage-bunshin-cloning-scout").img,
    "systems/n5e/assets/icons/classes/scout-nin/cloning-scout/taju-kage-bunshin.svg");
  // Extra Attack of the other classes is untouched.
  assert.ok(feats.filter(d => d.system?.identifier === "extra-attack" && d._id !== "n5e7JLePQ8z6WsYj").every(d => !d.img.includes("scout-nin")));
});
