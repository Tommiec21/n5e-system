/**
 * N5e custom Active Effect change keys (Phase 1 plan, section 9). Changes whose key starts with "n5e."
 * are held back from core application and parsed here into one structured object the derived-data
 * pipeline reads.
 *
 *   n5e.mastery.<target>          adds a Mastery source; value = source label (e.g. skill.ste, save.con;
 *                                 check.str: Strength checks and every Strength skill)
 *   n5e.dr                        +DR (number)
 *   n5e.pierce                    +Pierce (number)
 *   n5e.critRange.<scope>         +crit range (all|weapon|unarmed|nin|tai|gen|buki); capped at +3
 *   n5e.cost.<scope>              cost change: number (+/-), "*0.5" multiplier, "/2" divisor;
 *                                 scope all|nin|tai|gen|buki|keyword.<k>|rank.<R>
 *   n5e.saveDC.<disc|all>         +save DC
 *   n5e.attack.<disc>             +attack bonus (disc, or weapon | unarmed for weapon and unarmed attacks)
 *   n5e.damage.<weapon|unarmed>   +damage on weapon or unarmed attacks
 *   n5e.disciplineAbility.<disc>  sets the discipline's ability (value: ability key)
 *   n5e.keywordAbility.<keyword>  jutsu with this keyword may use this ability when it is higher (STD6d;
 *                                 Medical Release: medical = wis)
 *   n5e.saveTier.shift            moves four-tier results by N steps (+/-)
 *   n5e.concentration.max         +max concentration jutsu
 *   n5e.upkeep.<scope>            upkeep change (number), same scopes as cost
 *   n5e.dice.all                  bonus/penalty to all dice rolls
 *   n5e.unarmed.dice              extra dice on Unarmed damage (value: "1d8")
 *   n5e.unarmed.die               the Unarmed damage die becomes this when larger (value: "1d12", "2d12"; STD6d Battle Medic)
 *   n5e.rankCost.<scope>          a fixed cost by cast rank, treated as Special ("D:3,C:5,B:9,A:14,S:20"; STD6d Unwasted
 *                                 Movements); jutsu whose cost is already Special keep theirs
 *   n5e.fury.max                  + max Fury (Fury is a single state unless a feat lets it stack)
 *   n5e.reinforced                Titan Fist: armor Reinforced + value, or Reinforced = Taijutsu mod without armor
 *   n5e.resist / n5e.immune       adds a damage resistance or immunity (value: damage type; NPC3 Freeform Jutsu)
 *   n5e.conditionResist           condition resistance (King 2026-11-16): advantage on saves against a condition
 *                                 (value: its key) or a condition group (value: group:physical, group:mental...)
 *   n5e.attack.all                +attack bonus on every attack (NPC3)
 *
 * Adding a new key (four places, all in this file plus the reader):
 *   1. a field in emptyModifiers() with its neutral value,
 *   2. a case in parseN5eChanges() that folds the change's value into it,
 *   3. an entry in changeKeyCatalog() so the effect editor suggests it,
 *   4. read system.modifiers.<field> wherever the number is built (usually creature.mjs).
 * Unrecognized n5e.* keys are collected in `unknown` (shown in the effect editor) instead of erroring.
 */

export const CHANGE_KEY_PREFIX = "n5e.";

/**
 * The parsed-modifiers object (system.modifiers). Every field starts empty; parseN5eChanges() fills
 * them from n5e.* effect changes. A new key needs a field here first.
 */
export function emptyModifiers() {
  return {
    mastery: [], dr: 0, pierce: 0, critRange: {}, cost: [], saveDC: {}, attack: {}, damage: {}, disciplineAbility: {}, keywordAbility: {},
    saveTierShift: 0, concentrationMax: 0, upkeep: [], diceAll: 0, unarmedDice: [], unarmedDie: [], furyMax: 0, reinforced: 0, resist: [], immune: [], conditionResist: [], rankCost: [], unknown: []
  };
}

const num = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Parse a cost-like value: "-2" -> {op:"add", value:-2}; "*0.5" -> multiply; "/2" -> divide. */
export function parseCostValue(value) {
  const s = String(value ?? "").trim();
  if ( s.startsWith("*") ) return { op: "multiply", value: num(s.slice(1)) || 1 };
  if ( s.startsWith("/") ) return { op: "divide", value: num(s.slice(1)) || 1 };
  return { op: "add", value: num(s) };
}

/**
 * @param {Array<{key: string, value: any, effect?: {name?: string, id?: string}}>} changes
 */
export function parseN5eChanges(changes) {
  const out = emptyModifiers();
  for ( const change of changes ) {
    const key = String(change.key ?? "");
    if ( !key.startsWith(CHANGE_KEY_PREFIX) ) continue;
    const [, group, ...rest] = key.split(".");
    const sub = rest.join(".");
    const label = change.effect?.name ?? "Effect";
    switch ( group ) {
      case "mastery":
        if ( sub ) out.mastery.push({ target: sub, source: String(change.value || label) });
        break;
      case "dr": out.dr += num(change.value); break;
      case "resist": if ( change.value ) out.resist.push(String(change.value)); break;
      case "immune": if ( change.value ) out.immune.push(String(change.value)); break;
      case "conditionResist": if ( change.value ) out.conditionResist.push(String(change.value)); break;
      case "pierce": out.pierce += num(change.value); break;
      case "critRange": {
        const scope = sub || "all";
        out.critRange[scope] = (out.critRange[scope] ?? 0) + num(change.value);
        break;
      }
      case "cost": out.cost.push({ scope: sub || "all", ...parseCostValue(change.value), source: label }); break;
      case "upkeep": out.upkeep.push({ scope: sub || "all", ...parseCostValue(change.value), source: label }); break;
      case "saveDC": {
        const scope = sub || "all";
        out.saveDC[scope] = (out.saveDC[scope] ?? 0) + num(change.value);
        break;
      }
      case "attack": {
        const scope = sub || "all";
        out.attack[scope] = (out.attack[scope] ?? 0) + num(change.value);
        break;
      }
      case "damage": {
        const scope = sub || "weapon";
        out.damage[scope] = (out.damage[scope] ?? 0) + num(change.value);
        break;
      }
      case "disciplineAbility": if ( sub ) out.disciplineAbility[sub] = String(change.value); break;
      case "keywordAbility": if ( sub ) out.keywordAbility[sub] = [...new Set([...(out.keywordAbility[sub] ?? []), String(change.value)])]; break;
      case "saveTier": out.saveTierShift += num(change.value); break;
      case "concentration": out.concentrationMax += num(change.value); break;
      case "dice": out.diceAll += num(change.value); break;
      case "unarmed": {
        const v = String(change.value).trim();
        if ( !/^\d*d\d+$/.test(v) ) break;
        if ( sub === "die" ) out.unarmedDie.push(v);
        else out.unarmedDice.push(v);
        break;
      }
      case "fury": out.furyMax += num(change.value); break;
      case "rankCost": {
        const table = Object.fromEntries([...String(change.value).matchAll(/([EDCBAS])\s*:\s*(\d+)/gi)].map(([, r, v]) => [r.toUpperCase(), Number(v)]));
        if ( Object.keys(table).length ) out.rankCost.push({ scope: sub || "all", table, source: label });
        break;
      }
      case "reinforced": out.reinforced += num(change.value); break;
      default: out.unknown.push(key);
    }
  }
  return out;
}

/**
 * Does a cost scope apply to a jutsu?
 * @param {string} scope
 * @param {{discipline: string, keywords: Set<string>|string[], rank: string}} jutsu
 */
export function scopeApplies(scope, jutsu) {
  if ( !scope || scope === "all" ) return true;
  if ( scope.startsWith("keyword.") ) return new Set(jutsu.keywords).has(scope.slice(8));
  if ( scope.startsWith("rank.") ) return jutsu.rank === scope.slice(5);
  // Bukijutsu is a keyword on a Taijutsu jutsu (DATA1): the "buki" scope matches it.
  if ( scope === "buki" ) return jutsu.discipline === "buki" || new Set(jutsu.keywords).has("bukijutsu");
  return jutsu.discipline === scope || [...(jutsu.disciplines ?? [])].includes(scope);
}

/* -------------------------------------------- */
/*  Key catalog (effect editor suggestions)     */
/* -------------------------------------------- */

/**
 * Every change key the system understands, with a one-line description, for the effect editor's
 * key picker. Built from the registries so new skills/toolkits show up automatically.
 * @param {object} N5E   CONFIG.N5E (or the config module)
 * @returns {Array<{key: string, label: string, group: string}>}
 */
export function changeKeyCatalog(N5E) {
  const out = [];
  const add = (group, key, label) => out.push({ group, key, label });
  const discs = ["nin", "tai", "gen", "buki"];
  const discLabel = d => N5E.disciplines?.[d]?.label ?? d;
  add("Defense", "n5e.dr", "Damage Reduction: + number");
  add("Defense", "n5e.resist", "Damage resistance: value = damage type");
  add("Defense", "n5e.immune", "Damage immunity: value = damage type");
  add("Defense", "n5e.conditionResist", "Condition resistance: value = condition key or group:<tag>");
  add("Rolls", "n5e.attack.all", "Every attack: + or − number");
  add("Defense", "n5e.pierce", "DR Pierce: + number");
  for ( const s of ["all", "weapon", "unarmed", ...discs] ) add("Crits", `n5e.critRange.${s}`, `Crit range (${s}): +1 = 19-20; total capped at +3`);
  for ( const s of ["all", ...discs] ) {
    add("Jutsu cost", `n5e.cost.${s}`, `Jutsu cost (${s === "all" ? "all" : discLabel(s)}): number, "*0.5" or "/2"`);
    add("Jutsu upkeep", `n5e.upkeep.${s}`, `Concentration upkeep (${s === "all" ? "all" : discLabel(s)}): + number`);
  }
  for ( const r of Object.keys(N5E.ranks ?? {}) ) add("Jutsu cost", `n5e.cost.rank.${r}`, `Cost of ${r}-Rank jutsu`);
  for ( const [k, v] of Object.entries(N5E.keywords ?? {}) ) if ( !v.removed ) add("Jutsu cost", `n5e.cost.keyword.${k}`, `Cost of ${v.label} jutsu`);
  for ( const s of ["all", "nin", "tai", "gen"] ) add("Discipline", `n5e.saveDC.${s}`, `Save DC (${s === "all" ? "all" : discLabel(s)}): + number`);
  for ( const d of ["nin", "tai", "gen"] ) {
    add("Discipline", `n5e.attack.${d}`, `${discLabel(d)} attack: + number`);
    add("Discipline", `n5e.disciplineAbility.${d}`, `${discLabel(d)} ability: value = str|dex|con|int|wis|cha`);
  }
  add("Discipline", "n5e.keywordAbility.medical", "Jutsu with the keyword (here Medical) may use this ability when higher: value = str|dex|con|int|wis|cha");
  for ( const s of ["weapon", "unarmed"] ) {
    add("Weapons", `n5e.attack.${s}`, `${s === "weapon" ? "Weapon" : "Unarmed"} attacks: + number`);
    add("Weapons", `n5e.damage.${s}`, `${s === "weapon" ? "Weapon" : "Unarmed"} damage: + number`);
  }
  add("Rolls", "n5e.dice.all", "All dice rolls: + or − number (once per roll)");
  add("Damage", "n5e.unarmed.dice", "Unarmed damage: extra dice (value e.g. 1d8)");
  add("Damage", "n5e.unarmed.die", "Unarmed damage die becomes this when larger (value e.g. 1d12)");
  add("Casting", "n5e.rankCost.tai", "Fixed cost by cast rank, treated as Special (value \"D:3,C:5,B:9,A:14,S:20\"; scope like n5e.cost)");
  add("Defense", "n5e.reinforced", "Reinforced: + number to armor's Reinforced; without it, Reinforced = Taijutsu modifier");
  add("Bukijutsu", "n5e.fury.max", "Max Fury: + number (Fury stacks up to 1 + this)");
  add("Rolls", "n5e.saveTier.shift", "Four-tier save results: shift up (+1) or down (−1)");
  add("Concentration", "n5e.concentration.max", "Max concentration jutsu: + number");
  for ( const [k, v] of Object.entries(N5E.skills ?? {}) ) add("Mastery", `n5e.mastery.skill.${k}`, `Mastery rank: ${v.label} (value = source label)`);
  for ( const [k, v] of Object.entries(N5E.abilities ?? {}) ) add("Mastery", `n5e.mastery.save.${k}`, `Mastery rank: ${v.label} save`);
  // King 2026-11-16: one source covers the ability's checks and every skill under that ability.
  for ( const [k, v] of Object.entries(N5E.abilities ?? {}) ) add("Mastery", `n5e.mastery.check.${k}`, `Mastery rank: ${v.label} checks and every ${v.label} skill`);
  for ( const [k, v] of Object.entries(N5E.toolkits ?? {}) ) add("Mastery", `n5e.mastery.tool.${k}`, `Mastery rank: ${v.label}`);
  add("Mastery", "n5e.mastery.initiative", "Mastery rank: Initiative");
  for ( const d of ["nin", "tai", "gen"] ) add("Mastery", `n5e.mastery.attack.${d}`, `Mastery rank: ${discLabel(d)} attack`);
  // Core-applied paths (Add / Override modes).
  for ( const [k, label] of [["ac", "AC"], ["initiative", "Initiative"], ["hpMax", "Max HP"], ["cpMax", "Max CP"],
    ["hpPerLevel", "HP per level"], ["cpPerLevel", "CP per level"], ["inventorySlots", "Inventory slots"], ["speed", "Speed"],
    ["save", "All saves"], ["check", "All checks"]] ) add("Bonuses", `system.bonuses.${k}`, `${label}: + number (mode Add)`);
  for ( const d of ["nin", "tai", "gen"] ) {
    add("Bonuses", `system.bonuses.attack.${d}`, `${discLabel(d)} attack: + number (mode Add)`);
    add("Bonuses", `system.bonuses.saveDC.${d}`, `${discLabel(d)} save DC: + number (mode Add)`);
  }
  for ( const [k, v] of Object.entries(N5E.abilities ?? {}) ) add("Abilities", `system.abilities.${k}.value`, `${v.label} score (Add or Override)`);
  return out;
}
