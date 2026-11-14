/**
 * Adversary math (pure; the Bingo Book's "Final Calculation(s)"; NPC1).
 *
 * The profile (level, class, role, rank, Iconic/Epic, armor type, assigned modifiers, party size) gives
 * every number. Each function returns labelled parts so the sheet can show where a number came from.
 * The GM may override any result (data/actor/npc.mjs); stat lines and the Rank bonus are a baseline
 * and a suggestion, never a limit.
 */
import {
  proficiencyByLevel, statLines, rankTable, armorTable, classModifiers, roleModifiers, classifications,
  fullSavesByLevel, lazyPerLevel, lazySoloPlayers, suggested, adversaryArmor
} from "../config/adversary.mjs";

export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const clampLevel = level => Math.min(30, Math.max(1, Math.floor(Number(level) || 1)));
const band = (rows, level) => rows.reduce((value, [from, v]) => (level >= from ? v : value), null);
const part = (label, value) => ({ label, value });
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const cls = key => classModifiers[key] ?? {};
const role = key => roleModifiers[key] ?? {};
/** Class, Role, Iconic and Epic parts for one kind of modifier ("ac", "save", "initiative", "dc", "attack", "dr"). */
function profileParts(kind, p = {}) {
  return [[cap(p.class ?? ""), cls(p.class)[kind]], [cap(p.role ?? ""), role(p.role)[kind]],
    ["Iconic", p.iconic ? classifications.iconic[kind] : 0], ["Epic", p.epic ? classifications.epic[kind] : 0]]
    .filter(([, v]) => v).map(([label, value]) => part(label, value));
}

/** Proficiency bonus by level (3 at level 1 to 12 at level 30). */
export const adversaryProf = level => proficiencyByLevel[clampLevel(level) - 1];

/** The baseline modifier line for a level and class: {line, sum, missing}. Elites and Solos have none at levels 1-2. */
export function statLine(level, klass = "standard") {
  const high = klass === "elite" || klass === "solo";
  const own = (high ? statLines.elite : statLines.standard)[clampLevel(level) - 1];
  const line = own ?? statLines.standard[clampLevel(level) - 1];
  return { line: [...line], sum: line.reduce((a, b) => a + b, 0), missing: !own };
}

/** Suggested ability points from Rank: E 0, D 1, C 2, B 3, A 4, S 5 (King 2026-11-14). */
export const rankPoints = rank => rankTable[rank]?.points ?? 0;

/** The ability point budget and what was assigned: {budget, assigned, difference, parts}. */
export function abilityBudget(p = {}) {
  const parts = [part(`Level ${clampLevel(p.level)} ${cap(p.class ?? "standard")} line`, statLine(p.level, p.class).sum)];
  if ( p.rankBonus && rankPoints(p.rank) ) parts.push(part(`${p.rank}-Rank`, rankPoints(p.rank)));
  if ( p.iconic ) parts.push(part("Iconic", classifications.iconic.points));
  if ( p.epic ) parts.push(part("Epic", classifications.epic.points));
  const budget = parts.reduce((a, x) => a + x.value, 0);
  const assigned = ABILITY_KEYS.reduce((a, k) => a + (Number(p.mods?.[k]) || 0), 0);
  return { budget, assigned, difference: assigned - budget, parts };
}

/** How many saves are fully proficient at this level: 2 (1-7), 3 (8-16), 4 (17+). */
export const fullSaveCount = level => band(fullSavesByLevel, clampLevel(level));

/** The saves that are fully proficient: the GM's picks, else the highest modifiers (ties in ability order). */
export function fullSaves(p = {}) {
  const picked = [...(p.fullSaves ?? [])].filter(k => ABILITY_KEYS.includes(k));
  if ( picked.length ) return picked;
  return [...ABILITY_KEYS].sort((a, b) => (Number(p.mods?.[b]) || 0) - (Number(p.mods?.[a]) || 0) || ABILITY_KEYS.indexOf(a) - ABILITY_KEYS.indexOf(b))
    .slice(0, fullSaveCount(p.level));
}

/** The Solo multiplier for a party: 1.5 + 0.5 per player. */
export const soloMultiplier = players => classModifiers.solo.hp + classModifiers.solo.perPlayer * Math.max(0, Number(players) || 0);

/**
 * Hit Points and Chakra Points (the same value): {hp, cp, parts}.
 * Formula: 10 + (Level x Con) + (Level x per-level for Rank); Elite x1.25; Solo x(1.5 + 0.5 per player);
 * Iconic x1.5, Epic x2, both x2.5; fractions round down (King Q-N16).
 * Lazy GM: level x 7/9/11, the class multiplier with a Solo at 4 players, rounded up as printed.
 * Minion: HP 10 + Level and no Chakra pool.
 */
export function adversaryPools(p = {}) {
  const level = clampLevel(p.level);
  if ( cls(p.class).noChakra ) return { hp: 10 + level, cp: 0, parts: [part("Base", 10), part("Level", level)] };
  const parts = [];
  let value;
  const lazy = lazyPerLevel[p.hpSource];
  const classMult = p.class === "solo" ? soloMultiplier(lazy ? lazySoloPlayers : p.players) : (cls(p.class).hp ?? 1);
  if ( lazy ) {
    value = Math.ceil(level * lazy * classMult);
    parts.push(part(`Lazy GM (${lazy} per level${classMult !== 1 ? `, ${cap(p.class)} ×${classMult}` : ""})`, value));
  } else {
    const per = rankTable[p.rank]?.perLevel ?? rankTable.D.perLevel;
    const con = Number(p.mods?.con) || 0;
    const base = 10 + level * con + level * per;
    parts.push(part("Base", 10), part(`Level × Con (${level} × ${con})`, level * con), part(`Level × ${p.rank ?? "D"}-Rank (${level} × ${per})`, level * per));
    value = base * classMult;
    if ( classMult !== 1 ) parts.push(part(`${cap(p.class)} ×${classMult}`, Math.floor(value) - base));
  }
  const mark = p.iconic && p.epic ? classifications.bothHp : p.iconic ? classifications.iconic.hp : p.epic ? classifications.epic.hp : 1;
  if ( mark !== 1 ) {
    const before = Math.floor(value);
    value *= mark;
    parts.push(part(`${p.iconic && p.epic ? "Iconic and Epic" : p.iconic ? "Iconic" : "Epic"} ×${mark}`, Math.floor(value) - before));
  }
  const total = Math.max(0, Math.floor(value));
  return { hp: total, cp: total, parts };
}

/** Armor Class from the table by level and armor type, then Class, Role and classification: parts. */
export function adversaryAC(p = {}) {
  const armor = armorTable[p.armor] ? p.armor : "light";
  const table = armorTable[armor].ac + Math.floor((clampLevel(p.level) - 1) / 2);
  return [{ label: `${adversaryArmor[armor]} armor, level ${clampLevel(p.level)}`, value: table, base: true }, ...profileParts("ac", p)];
}

/** Damage Reduction: +3 Medium, +6 Heavy, Defender +2: parts. */
export function adversaryDR(p = {}) {
  const armor = armorTable[p.armor] ? p.armor : "light";
  return [{ label: `${adversaryArmor[armor]} armor`, value: armorTable[armor].dr, base: true }, ...profileParts("dr", p)];
}

/** Extra parts for a statistic: "save", "initiative", "attack", "dc", "skill.<key>". */
export function adversaryParts(kind, p = {}) {
  if ( kind.startsWith("skill.") ) {
    const bonus = role(p.role).skills?.[kind.slice(6)];
    return bonus ? [part(cap(p.role), bonus)] : [];
  }
  return profileParts(kind, p);
}

/** Speed bonus from the Role (Lurker +20). */
export const adversarySpeedBonus = p => role(p?.role).speed ?? 0;

/** Does this class automatically fail saving throws (Minions)? */
export const autoFailsSaves = klass => !!cls(klass).autoFailSaves;

/** Suggested counts for the sheet: traits, jutsu known, Freeform slots, attacks per Multiattack. */
export function suggestedCounts(p = {}) {
  const level = clampLevel(p.level);
  const klass = classModifiers[p.class] ? p.class : "standard";
  return {
    traits: suggested.traitsByClass[klass] + band(suggested.traitsByLevel, level),
    jutsu: band(suggested.jutsuByLevel, level),
    freeformSlots: band(suggested.freeformSlots[klass], level) ?? 0,
    multiattack: band(suggested.multiattack[klass], level),
    fullSaves: fullSaveCount(level)
  };
}

/** Things worth a note on the sheet (never blocking). */
export function adversaryWarnings(p = {}) {
  const out = [];
  const min = cls(p.class).minLevel;
  if ( min && clampLevel(p.level) < min ) out.push(`${cap(p.class)} adversaries shouldn't be used below level ${min}.`);
  const b = abilityBudget(p);
  if ( b.difference ) out.push(`Ability modifiers total ${b.assigned}; the baseline is ${b.budget}.`);
  const picked = [...(p.fullSaves ?? [])].length;
  if ( picked && picked !== fullSaveCount(p.level) ) out.push(`${picked} fully proficient saves; the baseline at this level is ${fullSaveCount(p.level)}.`);
  return out;
}
