/**
 * Build the weapon compendium entries (DATA2) from the checked-in Chapter 5 weapon tables
 * (tools/content/sources/weapons.md). One item per table row, in Simple / Martial / Exotic folders
 * under Weapons. The Kunai keeps its existing id. Run: node tools/content/build-weapons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { migrateItemData1, migrateItemData1b } from "../../module/migration/data1.mjs";
import { baseWeaponKey } from "../../module/rules/proficiency.mjs";
import { weaponProperties } from "../../module/config/equipment.mjs";

const migrateAll = d => migrateItemData1b(migrateItemData1(d) ?? d) ?? migrateItemData1(d);
const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "packs/_source/equipment");
const SOURCE = path.join(root, "tools/content/sources/weapons.md");
const WEAPONS_FOLDER = "n5e1zs1cXqe50cki";
const KEEP_IDS = { kunai: "n5eKunaiWeapon01" };
const id = key => crypto.createHash("sha256").update(`n5e.weapons.${key}`).digest("hex").slice(0, 16);
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = s => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const title = s => s.charAt(0).toUpperCase() + s.slice(1);

/** Rules text for the two Special weapons (Chapter 5, "Special (Battle Wire)" and "Special (Hiya Taihou)"). */
const SPECIAL = {
  battleWire: [
    "The Battle Wire can be used in conjunction with Kunai & Shuriken. When you have the Battle Wire and either a Kunai or Shuriken equipped, you can spend your Action to set one of the following Battle Wire Traps; Battle Wire Traps are inherently hidden when set, can only be discovered with a successful Search vs a DC 15 or your Taijutsu Save DC (Whichever is higher). Once a trap has been triggered, it is no longer active.",
    "Trip Trap. Select a point you can see within 30 feet of you where you throw a kunai or shuriken. If a creature spends 5 or more feet of movement while within 10 feet of the chosen point, the trap is sprung and they fall Prone. While the trap is set, if you move further than 30 feet away from the chosen point, the trap is dispelled.",
    "Explosive Wire Trap. Select a point you can see within 30 feet of you where you throw a kunai or shuriken but secretly covered in explosive tags. Choose 1 Explosive Ninja Tool between the following; Chili Pepper Bomb, Paper Bombs, Explosive Tag Ball, Fire Bomb, Flash Tag, Ice Bomb, Poison Tag, Shock Bomb or Smoke Bomb, that you have and attach it to the thrown weapon. If a creature spends 5 or more feet of movement while within 10 feet of the chosen point, the trap is sprung as the explosive tool detonates causing its listed effects."
  ],
  hiyaTaihou: [
    "When you declare an attack with the Hiya Taihou, roll a d20. If the result equals or is less than the weapon's Volatile rank, the weapon backfires before the attack resolves and follows the normal Volatile rules. If the result exceeds the Volatile rank, the attack proceeds.",
    "The Hiya Taihou cannot target a specific creature. Instead, select a point you can see within range. All creatures within a 5-foot radius centered on that point must make a Dexterity saving throw vs a DC of 8 + your Proficiency Bonus + your Dexterity Modifier. On a failure, creatures take the weapon's damage. On a success, they take damage as if the dice rolled the minimum possible value."
  ],
  combatScroll: ["Evocation: when you first gain this weapon, select one Ninjutsu, Genjutsu, or Weapon you have access to that deals damage and seal its echo into the scroll. The weapon's damage type becomes that of the sealed echo."]
};
SPECIAL.giantCombatScroll = SPECIAL.combatScroll;

/** Core Foundry icons, by base weapon key, else by first group. */
const ICONS = {
  kunai: "icons/weapons/thrown/dagger-ringed-steel.webp", senbon: "icons/weapons/daggers/dagger-straight-thin-black.webp",
  shuriken: "icons/weapons/thrown/shuriken-triple-purple.webp", fumaShuriken: "icons/weapons/thrown/shuriken-triple-purple.webp",
  monsterShuriken: "icons/weapons/thrown/shuriken-triple-purple.webp", bola: "icons/weapons/thrown/bolas-stone.webp",
  shortBow: "icons/weapons/bows/shortbow-leather.webp", longbow: "icons/weapons/bows/longbow-recurve-brown.webp",
  sling: "icons/weapons/ammunition/shot-round-lead.webp", katana: "icons/weapons/swords/sword-katana.webp",
  tachi: "icons/weapons/swords/sword-katana.webp", odachi: "icons/weapons/swords/greatsword-sheathed.webp",
  chokuto: "icons/weapons/swords/sword-guard-steel-green.webp", broadsword: "icons/weapons/swords/scimitar-broad.webp",
  tanto: "icons/weapons/daggers/dagger-straight-blue.webp", hiddenBlade: "icons/weapons/daggers/dagger-crooked-black.webp",
  handAxe: "icons/weapons/axes/shortaxe-engraved-green.webp", greatAxe: "icons/weapons/axes/axe-battle-black.webp",
  handScythe: "icons/weapons/sickles/sickle-hooked-silver.webp", kusarigama: "icons/weapons/sickles/sickle-hooked-silver.webp",
  quarterstaff: "icons/weapons/staves/staff-simple.webp", tonfa: "icons/weapons/staves/staff-simple-wrapped.webp",
  spear: "icons/weapons/polearms/spear-simple-engraved.webp", yari: "icons/weapons/polearms/spear-flared-steel.webp",
  hookedLance: "icons/weapons/polearms/spear-hooked-broad.webp", naginata: "icons/weapons/polearms/glaive-simple.webp",
  sasumata: "icons/weapons/polearms/trident-curved-steel.webp", chainedSpear: "icons/weapons/polearms/spear-hooked-spike.webp",
  whip: "icons/weapons/misc/whip-red-yellow.webp", urumi: "icons/weapons/misc/whip-red-yellow.webp",
  chigiriki: "icons/weapons/maces/flail-ball-grey.webp", weightedChain: "icons/weapons/maces/flail-studded-grey.webp",
  nunchaku: "icons/weapons/maces/flail-studded-grey.webp", sansetsukon: "icons/weapons/maces/flail-studded-grey.webp",
  otsuchiHammer: "icons/weapons/hammers/hammer-war-rounding.webp", tetsubo: "icons/weapons/maces/mace-round-spiked-black.webp",
  combatBracers: "icons/weapons/fist/fist-knuckles-brass.webp", ironClaw: "icons/weapons/fist/fist-knuckles-brass.webp",
  knuckleBlades: "icons/weapons/fist/fist-knuckles-brass.webp", ballisticKunaiGun: "icons/weapons/guns/gun-pistol-flintlock-metal.webp",
  ballisticShurikenRifle: "icons/weapons/guns/rifle-brown.webp", hiyaTaihou: "icons/weapons/guns/gun-blunderbuss-bronze.webp",
  combatScroll: "icons/sundries/scrolls/scroll-bound-brown.webp", giantCombatScroll: "icons/sundries/scrolls/scroll-bound-brown.webp"
};
const GROUP_ICONS = {
  blade: "icons/weapons/swords/sword-guard-steel-green.webp", flail: "icons/weapons/maces/flail-ball-grey.webp",
  polearm: "icons/weapons/polearms/spear-flared-steel.webp", power: "icons/weapons/hammers/hammer-war-rounding.webp",
  thrown: "icons/weapons/thrown/dagger-ringed-steel.webp", ammunition: "icons/weapons/ammunition/arrows-broadhead-white.webp"
};

/** "Thrown (30/60)", "Deadly 1", "Versatile (1d8)", "Special*" -> {key, rank, range, versatile}. */
export function parseProperty(text) {
  const t = text.trim().replace(/\*$/, "");
  let m = t.match(/^(thrown|range)\s*\((\d+)\s*\/\s*(\d+)\)$/i);
  if ( m ) return { key: m[1].toLowerCase(), rank: 1, range: { normal: Number(m[2]), long: Number(m[3]) } };
  m = t.match(/^versatile\s*\(([^)]+)\)$/i);
  if ( m ) return { key: "versatile", rank: 1, versatile: m[1].trim() };
  m = t.match(/^([a-z-]+)\s+(\d+)$/i);
  const word = (m ? m[1] : t).toLowerCase().replace(/-([a-z])/g, (x, c) => c.toUpperCase());
  const key = word === "two" ? "twoHanded" : word;
  if ( !(key in weaponProperties) ) throw new Error(`Unknown weapon property "${text}"`);
  return { key, rank: m ? Number(m[2]) : 1 };
}

/** Parse the Chapter 5 tables into plain rows. */
export function parseWeaponTables(markdown) {
  const rows = [];
  let category = null, weaponType = null;
  for ( const line of markdown.split(/\r?\n/) ) {
    const head = line.match(/^(Simple|Martial|Exotic) (Melee|Ranged) Weapons/);
    if ( head ) { category = head[1].toLowerCase(); weaponType = head[2].toLowerCase(); continue; }
    if ( !line.startsWith("|") || /^\| Weapons \|/.test(line) ) continue;
    const cells = line.split("|").slice(1, -1).map(c => c.trim());
    if ( cells.length !== 7 || !category ) continue;
    const [name, cost, die, type, props, groups, bulk] = cells;
    // "Thrown, (60/120)" is a table typo for "Thrown (60/120)".
    const propList = props.replace(/(Thrown|Range),\s*\(/gi, "$1 (").split(/,\s*/).filter(Boolean);
    rows.push({
      name, category, weaponType, price: Number(cost.replace(/[^\d]/g, "")), die,
      types: /variable/i.test(type) ? [] : type.split("/").map(s => s.trim().toLowerCase()),
      properties: propList.map(parseProperty),
      groups: groups.split("/").map(s => s.trim().toLowerCase()), bulk: Number(bulk)
    });
  }
  return rows;
}

const AMMO = { usesDie: true, label: "Ammunition Die", value: 0, max: "", die: "", steps: [8, 6, 4, 1, 0], step: 0,
  recovery: [], castsJutsu: false, countsAsChakraSpend: false, sort: 0 };

/** One weapon row -> item source. */
export function weaponItem(row, folderId) {
  const key = baseWeaponKey(row.name);
  const _id = KEEP_IDS[key] ?? id(key);
  const properties = {};
  let range = { normal: null, long: null }, versatile = "";
  for ( const p of row.properties ) {
    properties[p.key] = p.rank;
    if ( p.range ) range = p.range;
    if ( p.versatile ) versatile = p.versatile;
  }
  const reach = properties.reach ?? 0;
  const propText = row.properties.map(p => {
    const label = weaponProperties[p.key].label;
    if ( p.range ) return `${label} (${p.range.normal}/${p.range.long})`;
    if ( p.versatile ) return `${label} (${p.versatile})`;
    return weaponProperties[p.key].ranked ? `${label} ${p.rank}` : label;
  }).join(", ");
  const typeText = row.types.length ? row.types.map(title).join("/") : "variable (the sealed echo's type)";
  const description = [`<p>${title(row.category)} ${row.weaponType} weapon. ${row.die} ${typeText}. ${esc(propText)}. Group: ${row.groups.map(title).join("/")}.</p>`,
    ...(SPECIAL[key] ?? []).map(p => `<p>${esc(p)}</p>`)].join("\n");
  return {
    _id, name: row.name, type: "weapon", img: ICONS[key] ?? GROUP_ICONS[row.groups[0]] ?? "icons/weapons/swords/sword-guard.webp",
    system: {
      identifier: key, description, source: { book: "Naruto 5e Core", page: "", version: "4.0", custom: "" },
      quantity: 1, bulk: row.bulk, price: row.price, rank: "", equipped: false, location: "carried",
      activation: { type: "action", value: 1, unit: "", trigger: { event: "", text: "" } },
      target: {
        // Melee weapons (thrown ones too) target at reach; ranged weapons at their range.
        range: row.weaponType === "ranged"
          ? { type: "feet", value: range.normal, long: range.long, text: "" }
          : { type: "feet", value: 5 + reach * 5, long: null, text: "" },
        area: { shape: "", size: null, width: null, height: null }
      },
      duration: { value: null, unit: "instant", concentration: false, text: "" },
      uses: { max: "", spent: 0, per: "", staminaEligible: false },
      activities: [], featureType: "active",
      category: row.category, weaponType: row.weaponType, groups: row.groups,
      damage: { die: row.die, types: row.types, versatile },
      properties, range,
      ammo: { ...AMMO, usesDie: "ammunition" in properties },
      proficient: true, seals: [], extraSealSlots: 0, keywords: [key]
    },
    _key: `!items!${_id}`, flags: {}, folder: folderId, sort: 0, ownership: { default: 0 }, effects: [],
    _stats: { coreVersion: "13.351", systemId: "n5e", systemVersion: "0.16.0-alpha.3" }
  };
}

function write(name, data) {
  fs.writeFileSync(path.join(out, `${name}.json`), `${JSON.stringify(migrateAll(data) ?? data, null, 2)}\n`);
}

if ( import.meta.url === `file://${process.argv[1]}` ) {
  const rows = parseWeaponTables(fs.readFileSync(SOURCE, "utf8"));
  // Remove previously generated weapon files (the Kunai is regenerated with its kept id).
  for ( const file of fs.readdirSync(out) ) {
    const data = JSON.parse(fs.readFileSync(path.join(out, file), "utf8"));
    if ( data.type === "weapon" || data.flags?.n5e?.weaponFolder ) fs.rmSync(path.join(out, file));
  }
  for ( const cat of ["simple", "martial", "exotic"] ) {
    const fid = id(`folder.${cat}`);
    write(`_folder-${cat}-weapons-${fid}`, { _id: fid, _key: `!folders!${fid}`, name: `${title(cat)} Weapons`, type: "Item",
      folder: WEAPONS_FOLDER, sorting: "a", sort: 0, color: null, description: "", flags: { n5e: { generated: true, weaponFolder: true } } });
  }
  for ( const row of rows ) {
    const item = weaponItem(row, id(`folder.${row.category}`));
    write(`${slug(row.name)}-${item._id}`, item);
  }
  console.log(`Wrote ${rows.length} weapons.`);
}
