/**
 * V3.1 (n5e 0.6.x, dnd5e-derived data) -> N5e 4.0 data mapping. Pure functions on raw source objects,
 * so they run inside Document.migrateData (every load) and in Node tests.
 *
 * Mapping table: Phase 1 plan, "Migration framework and V3.1 mapping". Best effort (King, 2026-11-07):
 * anything that can't be mapped with confidence is kept in flags.n5e.legacy and flagged for review.
 */

// Item types that exist in 4.0, and V3.1 types that don't (they are converted: spell -> jutsu,
// equipment -> armor/weapon/loot, tool -> toolkit, backpack -> container).
const NEW_ITEM_TYPES = new Set(["jutsu", "weapon", "armor", "consumable", "toolkit", "container", "loot", "class",
  "subclass", "clan", "background", "feat", "stance"]);
const OLD_ONLY_ITEM_TYPES = new Set(["spell", "equipment", "tool", "backpack"]);

// 4.0 keys the mapping accepts; anything outside these lists goes to flags.n5e.legacy for review.
const RANKS = ["E", "D", "C", "B", "A", "S"];
const SKILL_KEYS = ["acr", "ani", "ath", "cha", "dec", "his", "ill", "ins", "itm", "inv", "mar", "med", "nat", "nin",
  "prc", "prf", "per", "slt", "ste", "sur"];
const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
const DAMAGE_TYPES = new Set(["bludgeoning", "piercing", "slashing", "acid", "cold", "earth", "fire", "lightning",
  "poison", "wind", "chakra", "force", "necrotic", "psychic"]);
// Conditions removed in 4.0 (dropped from tokens), V3.1 size codes, and name fragments used to guess
// which 4.0 toolkit / container an old item was ([fragment, 4.0 key], first match wins).
const RETIRED_STATUSES = new Set(["frightened", "paralyzed", "poisoned"]);
const SIZE_MAP = { tiny: "tiny", sm: "small", med: "medium", lg: "large", huge: "huge", grg: "gargantuan" };
const TOOLKIT_NAMES = [
  ["alchemist", "alchemist"], ["cook", "cooking"], ["disguise", "disguise"], ["forensic", "forensics"],
  ["forgery", "forgery"], ["hack", "hackers"], ["medic", "medicine"], ["poison", "poison"], ["seal", "sealing"],
  ["fuin", "sealing"], ["security", "security"], ["lockpick", "security"], ["thieves", "security"],
  ["smith", "smiths"], ["trap", "trappers"]
];
const CONTAINER_NAMES = [["backpack", "backpack"], ["waist", "waistBag"], ["belt", "beltPouch"], ["leg", "legPouch"],
  ["scroll", "toolScroll"]];

/** Old documents keep data under `data` (pre-v10) or `system` (v10+). */
function oldSystem(source) {
  return source.system && Object.keys(source.system).length ? source.system : (source.data ?? {});
}
const text = v => (typeof v === "string" ? v : (v?.value ?? ""));
const numOr = (v, d) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : d);

/** Keep an unmapped V3.1 value under flags.n5e.legacy.<key> for the GM to review. */
function setFlag(source, key, value) {
  source.flags ??= {};
  source.flags.n5e ??= {};
  source.flags.n5e[key] = value;
}

/* -------------------------------------------- */
/*  Detection                                   */
/* -------------------------------------------- */

/** Does this raw item source still have the V3.1 (dnd5e-derived) shape? */
export function isV31Item(source) {
  if ( !source || typeof source !== "object" ) return false;
  if ( source.flags?.n5e?.migratedFrom ) return false;
  if ( OLD_ONLY_ITEM_TYPES.has(source.type) ) return true;
  if ( !NEW_ITEM_TYPES.has(source.type) ) return false;
  const sys = oldSystem(source);
  // dnd5e-era fields that no 4.0 model has.
  return ["actionType", "consume", "weight", "hitDice", "damage"].some(k => k in sys && !(k === "damage" && sys.damage?.die));
}

/** Does this raw actor source still have the V3.1 shape (dnd5e attributes/abilities layout)? */
export function isV31Actor(source) {
  if ( !source || typeof source !== "object" ) return false;
  if ( source.flags?.n5e?.migratedFrom ) return false;
  if ( source.type === "vehicle" ) return true;
  const sys = oldSystem(source);
  return !!(sys.attributes?.ch || sys.attributes?.hp || sys.attributes?.movement);
}

/* -------------------------------------------- */
/*  Items                                       */
/* -------------------------------------------- */

/** Rank from compendium source (pack name), "above X-Rank" upcast text, or old level. */
export function guessRank(source, sys) {
  const ref = source.flags?.core?.sourceId ?? source._stats?.compendiumSource ?? "";
  const pack = /-([edcbas])-rank/i.exec(ref);
  if ( pack ) return { rank: pack[1].toUpperCase(), from: "pack" };
  const desc = text(sys.description);
  const above = /above\s+([EDCBAS])-Rank/i.exec(desc);
  if ( above ) return { rank: above[1].toUpperCase(), from: "upcast text" };
  const head = /\b([EDCBAS])-Rank\b/.exec(desc);
  if ( head ) return { rank: head[1], from: "description" };
  const lvl = numOr(sys.level, null);
  if ( lvl != null && RANKS[lvl] ) return { rank: RANKS[lvl], from: "level", review: true };
  return { rank: "D", from: "default", review: true };
}

/** Jutsu discipline from V3.1 data: the compendium it came from, else words in its name and text (default Ninjutsu). */
function guessDiscipline(source, sys) {
  const ref = String(source.flags?.core?.sourceId ?? source._stats?.compendiumSource ?? "");
  if ( /non-elemental|ninjutsu/i.test(ref) ) return "nin";
  if ( /genjutsu|mirage/i.test(ref) ) return "gen";
  const name = source.name ?? "";
  const desc = `${name} ${text(sys.description)}`.toLowerCase();
  if ( /genjutsu/.test(desc) ) return "gen";
  if ( /bukijutsu|weapon attack/.test(desc) ) return "buki";
  if ( /taijutsu/.test(desc) ) return "tai";
  return "nin";
}

const ACTIVATION = { action: "action", bonus: "bonus", reaction: "reaction", minute: "long", hour: "long",
  day: "long", legendary: "special", special: "special", none: "none", "": "action" };
const DURATION = { inst: "instant", minute: "minute", hour: "hour", round: "round", turn: "turn", day: "day",
  spec: "special", perm: "permanent", "": "instant" };
const RANGE = { ft: "feet", self: "self", touch: "touch", mi: "miles", spec: "special", any: "unlimited", "": "special" };
const AREA = { radius: "sphere", sphere: "sphere", cone: "cone", cube: "cube", line: "line", cylinder: "cylinder",
  square: "cube", wall: "line" };

/** V3.1 activation {type, cost, condition} -> 4.0 activation {type, value, trigger}. */
function migrateActivation(sys) {
  const a = sys.activation ?? {};
  const type = ACTIVATION[a.type] ?? "action";
  const out = { type, value: numOr(a.cost, 1) || 1, unit: type === "long" ? a.type : "", trigger: { event: "", text: "" } };
  if ( type === "reaction" && a.condition ) out.trigger = { event: "custom", text: a.condition };
  return out;
}

/** V3.1 range + target -> 4.0 rangeArea (range type/value, area shape/size). */
function migrateTarget(sys) {
  const r = sys.range ?? {};
  const t = sys.target ?? {};
  const shape = AREA[t.type] ?? "";
  return {
    range: { type: RANGE[r.units] ?? "special", value: numOr(r.value, null), long: numOr(r.long, null), text: "" },
    area: { shape, size: shape ? numOr(t.value, null) : null, width: numOr(t.width, null), height: null }
  };
}

/** V3.1 damage.parts [[formula, type], ...] -> 4.0 [{formula, type}], unknown types dropped. */
function migrateDamageParts(sys) {
  return (sys.damage?.parts ?? [])
    .filter(p => Array.isArray(p) && p[0])
    .map(([formula, type]) => ({ formula: String(formula), type: DAMAGE_TYPES.has(type) ? type : "" }));
}

/** Build 4.0 activities from V3.1 actionType (mwak/rsak/save/heal...) and damage parts. */
function activitiesFrom(sys) {
  const parts = migrateDamageParts(sys);
  const base = { id: "migrated0", label: "", text: "", riders: [] };
  const damage = { parts, pierce: 0, ignoreDR: false };
  switch ( sys.actionType ) {
    case "msak": case "mwak": case "rsak": case "rwak":
      return [{ ...base, type: "attack",
        attack: { discipline: "", range: sys.actionType.startsWith("m") ? "melee" : "ranged", count: 1,
          singleRoll: false, bonus: "" }, damage }];
    case "save":
      return [{ ...base, type: "save",
        save: { abilities: sys.save?.ability ? [sys.save.ability] : [], dc: { source: "discipline", formula: "" },
          onSuccess: "half", fourTier: false, tiers: { critSuccess: "", success: "", failure: "", critFailure: "" } },
        damage }];
    case "heal":
      return [{ ...base, type: "heal", heal: { formula: parts[0]?.formula ?? "", pool: "hp" } }];
    default:
      return parts.length ? [{ ...base, type: "damage", damage }] : [];
  }
}

/** Pull the "At Higher Ranks:" sentence(s) out of the description (it may start mid-paragraph). */
function splitUpcast(descHtml) {
  const m = /(?:<(?:strong|em|b|i)>\s*)?At Higher Ranks:?\s*(?:<\/(?:strong|em|b|i)>)?([\s\S]*?)(?=<\/p>|$)/i.exec(descHtml);
  if ( !m ) return { description: descHtml, upcast: "" };
  const description = descHtml.replace(m[0], "").replace(/<p>\s*<\/p>/g, "");
  return { description, upcast: `<p>${m[1].replace(/<\/?(strong|em|b|i)>/g, "").trim()}</p>` };
}

/** V3.1 "spell" items -> jutsu: rank from level, cost, keywords, components, activities. */
function migrateJutsu(source, sys, log) {
  const { rank, from, review } = guessRank(source, sys);
  const desc = text(sys.description);
  const { description, upcast } = splitUpcast(desc);
  const c = sys.components ?? {};
  const keywords = new Set();
  const discipline = guessDiscipline(source, sys);
  keywords.add({ nin: "ninjutsu", tai: "taijutsu", gen: "genjutsu", buki: "bukijutsu" }[discipline]);
  if ( c.medical ) keywords.add("medical");
  if ( c.fuinjutsu ) keywords.add("fuinjutsu");
  if ( c.sensory ) keywords.add("sensory");
  if ( c.clash ) keywords.add("clash");
  const consume = sys.consume ?? {};
  const costValue = /attributes\.(ch|cp)\.value/.test(consume.target ?? "") ? numOr(consume.amount, 0) : null;
  const preset = /increase the (?:chakra )?cost(?: of (?:this|the) jutsu)? by \+?3\b/i.test(upcast) ? "standard3" : (upcast ? "custom" : "none");
  if ( review ) log.push(`${source.name}: rank ${rank} guessed from ${from}`);
  if ( costValue == null ) log.push(`${source.name}: no chakra cost found`);
  return {
    type: "jutsu",
    review: review || costValue == null || discipline !== "nin",
    system: {
      identifier: "",
      description,
      source: { book: "V3.1", page: "", version: "3.1", custom: text(sys.source) },
      activation: migrateActivation(sys),
      target: migrateTarget(sys),
      duration: { value: numOr(sys.duration?.value, null), unit: DURATION[sys.duration?.units] ?? "special",
        concentration: !!c.concentration, text: "" },
      uses: { max: "", spent: 0, per: "", staminaEligible: false },
      activities: activitiesFrom(sys),
      featureType: "active",
      rank,
      discipline,
      section: discipline === "nin" ? "nonElemental" : "",
      keywords: [...keywords],
      stimuli: [],
      unaware: false,
      ability: "",
      cost: { mode: costValue == null ? "chakra" : "chakra", value: costValue ?? 0, text: "" },
      components: {
        hs: !!c.handseals, cm: !!c.molding, cs: !!c.chakraseals, m: !!c.mobility,
        weapon: { required: !!c.weapon, groups: [], any: !!c.weapon, range: "", count: 1, dualWield: false, text: "" },
        tool: { required: !!c.ninjatool, item: "", charges: 0, text: "" }
      },
      upcast: { preset, costPerRank: null, perRank: [], thresholds: { B: "", A: "", S: "" }, text: upcast }
    }
  };
}

const WEAPON_PROPS = { fin: "finesse", thr: "thrown", lgt: "light", hvy: "heavy", rch: "reach", two: "twoHanded",
  ver: "versatile", amm: "ammunition", ret: "returning", spc: "special", lod: null, rel: null, fir: null, sil: null };

/** Shared physical fields: quantity, weight -> Bulk, price, equipped. */
function migratePhysical(sys) {
  const price = typeof sys.price === "object" ? sys.price?.value : sys.price;
  return {
    identifier: "",
    description: text(sys.description),
    source: { book: "V3.1", page: "", version: "3.1", custom: text(sys.source) },
    quantity: Math.max(0, Math.floor(numOr(sys.quantity, 1))),
    bulk: numOr(sys.weight, 1),
    price: Math.max(0, Math.floor(numOr(price, 0))),
    rank: "",
    equipped: !!sys.equipped,
    location: "carried"
  };
}

/** Weapons: category, damage die and types, properties, range, ammo. */
function migrateWeapon(source, sys, log) {
  const parts = migrateDamageParts(sys);
  const props = {};
  for ( const [k, v] of Object.entries(sys.properties ?? {}) ) {
    if ( !v ) continue;
    const key = WEAPON_PROPS[k];
    if ( key ) props[key] = 1;
    else if ( key === undefined ) log.push(`${source.name}: unknown weapon property "${k}"`);
  }
  const wt = String(sys.weaponType ?? "");
  const ranged = /R$/.test(wt) || numOr(sys.range?.long, 0) > 0 && !/M$/.test(wt);
  return {
    type: "weapon",
    system: {
      ...migratePhysical(sys),
      activation: migrateActivation(sys),
      target: migrateTarget(sys),
      duration: { value: null, unit: "instant", concentration: false, text: "" },
      uses: { max: "", spent: 0, per: "", staminaEligible: false },
      activities: [],
      featureType: "active",
      category: wt.startsWith("martial") ? "martial" : (wt.startsWith("exotic") ? "exotic" : "simple"),
      weaponType: ranged ? "ranged" : "melee",
      groups: [],
      damage: { die: parts[0]?.formula?.replace(/\s*\+\s*@mod/i, "") ?? "1d4",
        types: parts[0]?.type ? [parts[0].type] : [], versatile: String(sys.damage?.versatile ?? "") },
      properties: props,
      range: { normal: numOr(sys.range?.value, null), long: numOr(sys.range?.long, null) },
      proficient: sys.proficient !== false && sys.proficient !== 0,
      seals: [],
      extraSealSlots: 0
    }
  };
}

/** V3.1 "equipment" -> armor (AC bonus = full AC − 10, Dex cap, Str requirement) or loot. */
function migrateEquipment(source, sys) {
  const armorType = sys.armor?.type;
  if ( ["light", "medium", "heavy"].includes(armorType) ) {
    let value = numOr(sys.armor?.value, 0);
    if ( value >= 10 ) value -= 10;                // dnd5e stored full AC; 4.0 stores the bonus
    return {
      type: "armor",
      review: true,
      system: {
        ...migratePhysical(sys),
        category: armorType,
        armor: { value: Math.max(0, value), dexCap: numOr(sys.armor?.dex, null) },
        properties: {},
        strRequirement: numOr(sys.strength, null),
        proficient: sys.proficient !== false,
        seals: [],
        extraSealSlots: 0
      }
    };
  }
  return { type: "loot", system: migratePhysical(sys) };
}

const CONSUMABLE_TYPES = { potion: "pill", poison: "poison", food: "meal", scroll: "scroll", ammo: "ammo",
  trinket: "gear", wand: "gear", rod: "gear" };

/** Consumables: subtype, uses, destroy on empty. */
function migrateConsumable(source, sys) {
  return {
    type: "consumable",
    system: {
      ...migratePhysical(sys),
      activation: migrateActivation(sys),
      target: migrateTarget(sys),
      duration: { value: numOr(sys.duration?.value, null), unit: DURATION[sys.duration?.units] ?? "instant",
        concentration: false, text: "" },
      uses: { max: String(sys.uses?.max ?? ""), spent: Math.max(0, numOr(sys.uses?.max, 0) - numOr(sys.uses?.value, 0)),
        per: "", staminaEligible: false },
      activities: activitiesFrom(sys),
      featureType: "active",
      subtype: CONSUMABLE_TYPES[sys.consumableType] ?? "gear",
      perRank: [],
      limit: { max: 0, per: "" },
      destroyOnEmpty: true
    }
  };
}

/** First table entry whose pattern appears in the name (lower case). */
function matchName(name, table) {
  const n = String(name ?? "").toLowerCase();
  return table.find(([needle]) => n.includes(needle))?.[1] ?? "";
}

/** V3.1 "tool" -> toolkit (kit key matched from the name). */
function migrateTool(source, sys, log) {
  const kit = matchName(source.name, TOOLKIT_NAMES);
  if ( !kit ) log.push(`${source.name}: no matching 4.0 toolkit`);
  return {
    type: "toolkit",
    review: !kit,
    system: {
      ...migratePhysical(sys),
      bulk: 2,
      kit,
      charges: { label: "Charges", value: 0, max: "", die: "", steps: [], step: 0, recovery: [],
        castsJutsu: false, countsAsChakraSpend: false, sort: 0 },
      functions: []
    }
  };
}

/** V3.1 "backpack" -> container (storage type from the name). */
function migrateBackpack(source, sys) {
  return {
    type: "container",
    system: { ...migratePhysical(sys), bulk: 0, containerType: matchName(source.name, CONTAINER_NAMES) || "backpack",
      slots: null, sealsBulk: null }
  };
}

/** Classes: levels and hit/chakra dice; flagged for review (4.0 class data comes from the new compendium). */
function migrateClass(source, sys) {
  return {
    type: "class",
    review: true,
    system: {
      identifier: "",
      description: text(sys.description),
      source: { book: "V3.1", page: "", version: "3.1", custom: "" },
      levels: Math.max(1, Math.min(20, numOr(sys.levels, 1))),
      hitDie: String(sys.hitDice ?? "d8"),
      chakraDie: String(sys.chakraDice ?? sys.chakraDie ?? "d8")
    }
  };
}

/** Feats and features: category from the compendium they came from, uses, activation; flagged for review. */
function migrateFeat(source, sys) {
  const ref = String(source.flags?.core?.sourceId ?? source._stats?.compendiumSource ?? "");
  let category = "general";
  if ( /class-features/.test(ref) ) category = "classFeature";
  else if ( /monsterfeatures/.test(ref) ) category = "npcFeature";
  else if ( /mirages/.test(ref) ) category = "classFeature";
  return {
    type: "feat",
    review: true,
    system: {
      identifier: "",
      description: text(sys.description),
      source: { book: "V3.1", page: "", version: "3.1", custom: text(sys.source) },
      activation: migrateActivation(sys),
      target: migrateTarget(sys),
      duration: { value: numOr(sys.duration?.value, null), unit: DURATION[sys.duration?.units] ?? "instant",
        concentration: false, text: "" },
      uses: { max: String(sys.uses?.max ?? ""), spent: Math.max(0, numOr(sys.uses?.max, 0) - numOr(sys.uses?.value, 0)),
        per: sys.uses?.per ?? "", staminaEligible: false },
      activities: activitiesFrom(sys),
      featureType: sys.activation?.type ? "active" : "passive",
      category,
      prerequisites: sys.requirements ? [String(sys.requirements)] : []
    }
  };
}

/**
 * Migrate one V3.1 item source in place.
 * @returns {{changed: boolean, log: string[]}}
 */
export function migrateV31Item(source) {
  const log = [];
  if ( !isV31Item(source) ) return { changed: false, log };
  const sys = oldSystem(source);
  const legacyType = source.type;
  let result;
  switch ( source.type ) {
    case "spell": result = migrateJutsu(source, sys, log); break;
    case "weapon": result = migrateWeapon(source, sys, log); break;
    case "equipment": result = migrateEquipment(source, sys, log); break;
    case "consumable": result = migrateConsumable(source, sys, log); break;
    case "tool": result = migrateTool(source, sys, log); break;
    case "backpack": result = migrateBackpack(source, sys); break;
    case "class": result = migrateClass(source, sys); break;
    case "feat": result = migrateFeat(source, sys); break;
    case "loot": result = { type: "loot", system: migratePhysical(sys) }; break;
    default: return { changed: false, log };
  }
  source.type = result.type;
  source.system = result.system;
  delete source.data;
  setFlag(source, "migratedFrom", "3.1");
  setFlag(source, "legacyType", legacyType);
  if ( result.review ) setFlag(source, "review", true);
  return { changed: true, log };
}

/* -------------------------------------------- */
/*  Actors                                      */
/* -------------------------------------------- */

/** Filter V3.1 values to the keys 4.0 knows (unknown keys are dropped). */
function setOf(values, allowed) {
  return [...new Set((values ?? []).filter(v => !allowed || allowed.has(v)))];
}

/**
 * Migrate one V3.1 actor source in place, including embedded items and effects.
 * @param {object} source
 * @param {object} [options]
 * @param {Set<string>} [options.conditionKeys]  4.0 condition keys (for condition immunities)
 */
export function migrateV31Actor(source, { conditionKeys } = {}) {
  const log = [];
  if ( !isV31Actor(source) ) return { changed: false, log };
  const sys = oldSystem(source);
  const attr = sys.attributes ?? {};
  if ( source.type === "vehicle" ) {
    log.push(`${source.name}: vehicle actors are not in 4.0; converted to NPC`);
    source.type = "npc";
  }
  const isNPC = source.type === "npc";
  const abilities = {};
  const saves = {};
  for ( const k of ABILITIES ) {
    abilities[k] = { value: Math.max(0, Math.min(30, Math.floor(numOr(sys.abilities?.[k]?.value, 10)))) };
    saves[k] = { proficient: numOr(sys.abilities?.[k]?.proficient, 0) >= 1 };
  }
  const skills = {};
  const masterySources = [];
  for ( const k of SKILL_KEYS ) {
    const old = sys.skills?.[k] ?? {};
    const v = numOr(old.value, 0);
    skills[k] = { proficient: v >= 1, ability: old.ability && ABILITIES.includes(old.ability) ? old.ability : undefined, bonus: "" };
    if ( !skills[k].ability ) delete skills[k].ability;
    if ( v >= 2 ) masterySources.push({ target: `skill.${k}`, source: "Migrated (V3.1 expertise)" });
  }
  if ( sys.skills?.cra && numOr(sys.skills.cra.value, 0) > 0 ) log.push(`${source.name}: Crafting proficiency dropped (removed in 4.0)`);
  const ch = attr.ch ?? attr.cp ?? {};
  const mv = attr.movement ?? {};
  const sn = attr.senses ?? {};
  const traits = sys.traits ?? {};
  const wof = numOr(attr["will-of-fire"]?.value ?? attr["will-of-fire"], 1);
  const ac = attr.ac ?? {};
  const acCalc = { flat: "flat", natural: "flat", custom: "formula" }[ac.calc] ?? "default";

  const system = {
    abilities, saves, skills,
    mastery: { sources: masterySources },
    hp: { value: Math.max(0, Math.floor(numOr(attr.hp?.value, 10))), temp: Math.max(0, Math.floor(numOr(attr.hp?.temp, 0))) },
    cp: { value: Math.max(0, Math.floor(numOr(ch.value, 10))), temp: Math.max(0, Math.floor(numOr(ch.temp, 0))) },
    deathSaves: { success: numOr(attr.death?.success, 0), failure: numOr(attr.death?.failure, 0) },
    attributes: { ac: { calc: acCalc, flat: Math.floor(numOr(ac.flat, 10)), formula: String(ac.formula ?? "") },
      init: { bonus: String(attr.init?.bonus ?? "") } },
    traits: {
      size: SIZE_MAP[traits.size] ?? "medium",
      resist: setOf(traits.dr?.value, DAMAGE_TYPES),
      vuln: setOf(traits.dv?.value, DAMAGE_TYPES),
      immune: setOf(traits.di?.value, DAMAGE_TYPES),
      conditionImmune: setOf(traits.ci?.value, conditionKeys),
      senses: { darkvision: numOr(sn.darkvision, 0), blindsight: numOr(sn.blindsight, 0),
        tremorSense: numOr(sn.tremorsense, 0), trueSight: numOr(sn.truesight, 0), chakraSight: numOr(sn.chakrasight, 0) },
      speed: { walk: numOr(mv.walk, 30), climb: numOr(mv.climb, 0), swim: numOr(mv.swim, 0), fly: numOr(mv.fly, 0),
        burrow: numOr(mv.burrow, 0), hover: !!mv.hover },
      languages: setOf(traits.languages?.value)
    },
    willOfFire: { value: Math.max(0, Math.min(3, wof)) },
    details: { biography: text(sys.details?.biography) }
  };
  const retiredCi = (traits.ci?.value ?? []).filter(c => RETIRED_STATUSES.has(c));
  if ( retiredCi.length ) log.push(`${source.name}: condition immunities removed (${retiredCi.join(", ")})`);
  if ( isNPC ) {
    Object.assign(system.details, {
      level: Math.max(0, Math.floor(numOr(sys.details?.level?.value ?? sys.details?.level ?? sys.details?.cr, 1)))
    });
    system.hpMax = numOr(attr.hp?.max, null);
    system.cpMax = numOr(ch.max, null);
  } else {
    Object.assign(system.details, { xp: Math.max(0, Math.floor(numOr(sys.details?.xp?.value, 0))) });
    system.currency = { ryo: Math.max(0, Math.floor(numOr(sys.currency?.ryo, 0))) };
  }
  if ( sys.details?.clan ) setFlag(source, "legacyClan", String(sys.details.clan));

  source.system = system;
  delete source.data;

  // Embedded items.
  for ( const item of source.items ?? [] ) {
    const r = migrateV31Item(item);
    log.push(...r.log);
  }
  // Embedded effects: drop retired conditions.
  if ( Array.isArray(source.effects) ) {
    source.effects = source.effects.filter(e => {
      const ids = [...(e.statuses ?? []), e.flags?.core?.statusId].filter(Boolean);
      const retired = ids.find(id => RETIRED_STATUSES.has(id));
      if ( retired ) log.push(`${source.name}: removed retired condition "${retired}"`);
      return !retired;
    });
  }
  setFlag(source, "migratedFrom", "3.1");
  return { changed: true, log };
}
