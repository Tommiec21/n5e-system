/** Rebuild organized background content from the checked-in Chapter 3 transcription. */
import fs from "node:fs";
import { migrateItemData1, migrateItemData1b } from "../../module/migration/data1.mjs";
const migrateAll = d => migrateItemData1b(migrateItemData1(d) ?? d) ?? migrateItemData1(d);
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");
const source = fs.readFileSync(path.join(root, "content/backgrounds/chapter-3.md"), "utf8");
const out = path.join(root, "packs/_source/backgrounds");
const id = key => crypto.createHash("sha256").update(`n5e.backgrounds.${key}`).digest("hex").slice(0, 16);
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const clean = s => s.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/<[^>]*>/g, "").replace(/\*+/g, "").trim();
const esc = s => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const html = s => s.split(/\r?\n\s*\r?\n/).map(clean).filter(Boolean).map(p => /^#{3,4} /.test(p)
  ? `<h3>${esc(p.replace(/^#+ /, ""))}</h3>` : `<p>${esc(p.replace(/\r?\n/g, " "))}</p>`).join("\n");
const uuid = key => `Compendium.n5e.backgrounds.Item.${id(key)}`;
const specs = {
  Advisor: [["per", "his"], ["forensics"]], Bureaucrat: [["per", "dec"], ["hackers"]],
  Chronicler: [["his", "sur"], ["hackers", "forensics"]], Entertainer: [["acr", "prf"], ["disguise"]],
  Gangster: [["ath", "itm"], ["forgery", "disguise"]], Genius: [[], [], ["nin", "mar", "ill"], 2],
  "Hard Worker": [["acr", "ath"], ["smiths"]], Hermit: [["ani", "his"], ["poison", "medicine", "trappers"]],
  "Last Clansmen": [["prc", "sur"], ["cooking"]], Leader: [["his"], ["forgery"], ["dec", "per"], 1],
  Noble: [["per", "ins"], ["security"]], Student: [["acr"], ["forensics"], ["nin", "mar", "ill"], 1],
  Traveler: [["ins", "prc"], ["poison"]], "Trouble Maker": [["dec", "slt"], ["forgery"]],
  Urchin: [["slt", "ste"], ["disguise"]], "War Child": [["sur", "ste"], ["trappers"]]
};
const allTools = ["alchemist", "cooking", "disguise", "forensics", "forgery", "hackers", "medicine", "poison", "sealing", "security", "smiths", "trappers"];
const packs = {
  Advisor: ["captain", "medic"], Bureaucrat: ["captain", "infiltrator"], Chronicler: ["explorer", "infiltrator"],
  Entertainer: ["infiltrator", "captain"], Gangster: ["infiltrator", "battler"], Genius: ["captain", "explorer"],
  "Hard Worker": ["battler", "medic"], Hermit: ["explorer", "crafter"], "Last Clansmen": ["explorer", "crafter"],
  Leader: ["captain", "explorer"], Noble: ["captain", "crafter"], Student: ["explorer", "infiltrator"],
  Traveler: ["traveler", "explorer"], "Trouble Maker": ["infiltrator", "traveler"], Urchin: ["infiltrator", "crafter"], "War Child": ["explorer", "medic"]
};
function write(dir, name, data) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), `${JSON.stringify(migrateAll(data) ?? data, null, 2)}\n`);
}
function folder(key, name, parent, dir) {
  write(dir, "_folder", { _id: id(key), _key: `!folders!${id(key)}`, name, type: "Item", folder: parent, sorting: "a", sort: 0, color: null });
}
folder("root", "Backgrounds", null, out);
const chunks = source.split(/(?=^### (?!#))/m);
let count = 0;
for ( const chunk of chunks ) {
  const name = clean(chunk.split(/\r?\n/)[0]).replace(/^### /, "");
  if ( !specs[name] ) continue;
  const key = slug(name), dir = path.join(out, key);
  const [fixed, tools, from = [], choose = 0] = specs[name];
  const parts = chunk.split(/^#### /m);
  const featureName = clean(parts[1].split(/\r?\n/)[0]).replace(/^Feature: /, "");
  const benefitName = clean(parts[2].split(/\r?\n/)[0]);
  const featureText = html(parts[1].split(/\r?\n/).slice(1).join("\n"));
  const benefitText = html(parts[2].split(/\r?\n/).slice(1).join("\n"));
  const equipment = chunk.split(/\r?\n/).map(clean).find(line => line.startsWith("Equipment:"))?.slice(10).trim() ?? "";
  if ( !equipment || !featureText || !benefitText ) throw new Error(`Incomplete source: ${name}`);
  folder(key, name, id("root"), dir);
  folder(`${key}.features`, "Features", id(key), path.join(dir, "features"));
  folder(`${key}.equipment-folder`, "Starting Equipment", id(key), path.join(dir, "equipment"));
  const sourceRef = { book: "Naruto 5e — Full Document", page: "Chapter 3", version: "4.0", custom: "Backgrounds: feat only, no ASI (2026-11-06 ruling)." };
  const make = (suffix, label, type, system, folderId) => ({ _id: id(`${key}.${suffix}`), _key: `!items!${id(`${key}.${suffix}`)}`, name: label, type,
    img: "icons/sundries/scrolls/scroll-bound-brown.webp", folder: folderId, system: { identifier: `background-${key}${suffix === "background" ? "" : `-${suffix}`}`, source: sourceRef, ...system },
    effects: [], flags: { n5e: { backgroundKey: key } }, ownership: { default: 0 } });
  for ( const [suffix, label, description] of [["feature", featureName, featureText], ["benefit", benefitName, benefitText]] ) {
    write(path.join(dir, "features"), suffix, make(suffix, label, "feat", { description, category: "backgroundFeature", featureType: "passive",
      tags: ["background-feature", key], uses: { max: "", spent: 0, per: "" } }, id(`${key}.features`)));
  }
  write(path.join(dir, "equipment"), "personal-equipment", make("equipment", `${name}: Personal Equipment`, "loot", {
    description: `<p>${esc(equipment)}</p><p>Starting equipment manifest. Resolve individual item statistics from Chapter 5; this record does not add invented Bulk, prices, or toolkit charges.</p>`, quantity: 1, bulk: 0, price: 0 }, id(`${key}.equipment-folder`)));
  const doc = make("background", name, "background", { description: html(chunk), skills: fixed, tool: tools.length === 1 ? tools[0] : "",
    equipment, feature: featureText, feat: "", featCategory: "general", advancement: [
      { id: "background-features", level: 1, type: "feature", title: "Background features", uuids: [uuid(`${key}.feature`), uuid(`${key}.benefit`)] }
    ] }, id(key));
  doc.flags.n5e.background = { version: 1, skillChoices: { count: choose, from }, toolChoices: tools.length === 1 ? [] : tools.length ? tools : allTools,
    equipmentPacks: packs[name], featureUuids: [uuid(`${key}.feature`), uuid(`${key}.benefit`)], equipmentUuid: uuid(`${key}.equipment`),
    featCategories: ["general", "skill"], recommendation: clean(chunk.match(/\*\(\*\*Recommended:.*$/m)?.[0] ?? "") };
  write(dir, "background", doc);
  count++;
}
if ( count !== 16 ) throw new Error(`Expected 16 backgrounds, found ${count}`);
console.log(`Built ${count} backgrounds with per-background feature and equipment folders.`);
