/**
 * Freeform Strikes and Freeform Jutsu (pure; the Bingo Book, "Adversary Combat"; NPC3).
 *
 *   Strikes   strikeDamage, combineAttacks, buildStrike (choices -> item data)
 *   Jutsu     freeformRanks, effectiveLevel, jutsuDamage, defensiveValue, supportValue, buildJutsu
 *   Shared    riderDC, freeformCostFor, effectActivity, recalculate (level changes)
 *
 * Choices are kept on the item at flags.n5e.freeform so the windows, the Adversary Builder and
 * recalculation all read and write the same thing. A Strike is set when built (King Q-N35): only its
 * window rebuilds it. A Freeform Jutsu follows the adversary's level unless its damage was edited by hand.
 */
import {
  strikeTable, strikeColumn, jutsuDamageTable, jutsuDamageAverage, jutsuTableFor, damagePenalties, effectTierPenalty, strikeRiderPenalty,
  freeformEffects, freeformShapes, freeformRanges, freeformRankLevels, freeformCost, freeformDR, stepValues, recoveryMethods
} from "../config/freeform.mjs";
import { roleModifiers } from "../config/adversary.mjs";

const RANKS = ["D", "C", "B", "A", "S"];
const clamp = l => Math.min(30, Math.max(1, Math.floor(Number(l) || 1)));
const rankIdx = r => RANKS.indexOf(r);
const capitalize = s => (s ? s[0].toUpperCase() + s.slice(1) : "");

/** A value the book gives at D, B and S; C and A use the rank below (King Q-N40). */
export function stepValue(table, rank) {
  const order = ["D", "C", "B", "A", "S"];
  for ( let i = order.indexOf(rank); i >= 0; i-- ) if ( table[order[i]] != null ) return table[order[i]];
  return table.D ?? 0;
}

/* -------------------------------------------- */
/*  Strikes                                     */
/* -------------------------------------------- */

/**
 * Freeform Strike damage: the class's column at the adversary's level, read 2 levels lower for a
 * Tier 1 rider and 3 lower for Tier 2. Below the first printed row (High starts at 3), the first row.
 * @returns {{formula: string, attacks: number, level: number, column: string}}
 */
export function strikeDamage(level, klass = "standard", riderTier = 0) {
  const column = strikeColumn[klass] ?? "medium";
  let at = clamp(clamp(level) + (strikeRiderPenalty[riderTier] ?? 0));
  const rows = strikeTable[column];
  while ( !rows[at - 1] && at < 30 ) at++;
  const [formula, attacks] = rows[at - 1];
  return { formula, attacks, level: at, column };
}

/** The single-attack option: every attack's damage in one roll ("1d8+3" x2 -> "2d8+6"). */
export function combineAttacks(formula, attacks) {
  if ( attacks <= 1 ) return formula;
  const m = String(formula).replace(/\s+/g, "").match(/^(\d+)d(\d+)(?:([+-])(\d+))?$/);
  if ( !m ) return Array.from({ length: attacks }, () => `(${formula})`).join(" + ");
  const dice = Number(m[1]) * attacks;
  const flat = (m[4] ? Number(m[4]) : 0) * attacks * (m[3] === "-" ? -1 : 1);
  return `${dice}d${m[2]}${flat ? `${flat > 0 ? "+" : ""}${flat}` : ""}`;
}

/** The rider's save DC: Minion lowest, Standard middle, Elite and Solo highest jutsu save DC. */
export function riderDC(klass, dcs = []) {
  const sorted = [...dcs].map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if ( !sorted.length ) return 10;
  if ( klass === "minion" ) return sorted[0];
  if ( klass === "standard" ) return sorted[Math.floor((sorted.length - 1) / 2)];
  return sorted.at(-1);
}

/* -------------------------------------------- */
/*  Jutsu                                       */
/* -------------------------------------------- */

/** The Freeform Jutsu ranks a class may cast at a level (suggestions). */
export function freeformRanks(klass = "standard", level = 1) {
  return (freeformRankLevels[klass] ?? freeformRankLevels.standard).filter(([, from]) => clamp(level) >= from).map(([r]) => r);
}

/** Chakra cost by rank (King Q-N33); a Minion's Freeform Jutsu cost nothing. */
export const freeformCostFor = (rank, klass) => (klass === "minion" ? 0 : freeformCost[rank] ?? 0);

/**
 * The level the damage is read at: the adversary's level plus the Damage Penalty table.
 * @param {{area?, effects?: number[], noDamageOnSave?, lowestAttack?, preestablished?: 0|1|2, damageBonus?}} o
 * @returns {{level: number, parts: Array<{label, value}>}}
 */
export function effectiveLevel(level, o = {}) {
  const parts = [];
  if ( o.area ) parts.push({ label: damagePenalties.area.label, value: damagePenalties.area.value });
  for ( const tier of o.effects ?? [] ) parts.push({ label: `Tier ${tier} effect`, value: effectTierPenalty[tier] ?? 0 });
  if ( o.noDamageOnSave ) parts.push({ label: damagePenalties.noDamageOnSave.label, value: damagePenalties.noDamageOnSave.value });
  if ( o.lowestAttack ) parts.push({ label: damagePenalties.lowestAttack.label, value: damagePenalties.lowestAttack.value });
  if ( o.preestablished ) parts.push({ label: damagePenalties[`preestablished${o.preestablished}`].label, value: damagePenalties[`preestablished${o.preestablished}`].value });
  if ( o.damageBonus ) parts.push({ label: o.damageLabel ?? "Striker", value: o.damageBonus });
  return { level: clamp(clamp(level) + parts.reduce((a, p) => a + p.value, 0)), parts };
}

/** Split a damage pool across attacks as evenly as possible ("8d6+12" over 2 -> "4d6+6"). */
export function splitDamage(formula, attacks) {
  if ( attacks <= 1 ) return formula;
  const m = String(formula).replace(/\s+/g, "").match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if ( !m ) return formula;
  const dice = Math.max(1, Math.round(Number(m[1]) / attacks));
  const flat = Math.round((Number(m[3]) || 0) / attacks);
  return `${dice}d${m[2]}${flat ? `+${flat}` : ""}`;
}

/** Freeform Jutsu damage for a rank, read at the effective level from the class's table. */
export function jutsuDamage(level, klass, rank, o = {}, attacks = 1) {
  const eff = effectiveLevel(level, o);
  const table = jutsuTableFor[klass] ?? "standard";
  const formula = jutsuDamageTable[table][rank]?.[eff.level - 1] ?? "1d4";
  const average = jutsuDamageAverage[table][rank]?.[eff.level - 1] ?? 0;
  return { formula, average, perAttack: splitDamage(formula, attacks), attacks, ...eff, table };
}

/** A Defensive Jutsu's value (A6). */
export function defensiveValue(focus, { rank = "D", klass = "standard", level = 1 } = {}) {
  switch ( focus ) {
    case "ac": return { value: stepValue(stepValues.defensiveAC, rank) };
    case "dr": return { value: freeformDR[klass]?.[rank] ?? null };
    case "tempHp": {
      if ( !["elite", "solo"].includes(klass) ) return { value: null, note: "Only Elite and Solo adversaries gain temporary Hit Points this way." };
      const at = Math.ceil(clamp(level) / 4);
      return { value: jutsuDamageTable.standard[rank]?.[at - 1] ?? null, level: at };
    }
    case "immunity": return rankIdx(rank) >= rankIdx("A") ? { value: 1 } : { value: null, note: "Immunity needs an A-Rank jutsu or higher." };
    case "resistance": return { value: 1 };
    default: return { value: null };
  }
}

/** A Support Jutsu's value (A7). */
export function supportValue(focus, { rank = "D", klass = "standard", level = 1 } = {}) {
  const i = Math.max(0, rankIdx(rank));
  switch ( focus ) {
    case "attack": return { value: stepValue(stepValues.supportAttack, rank) };
    case "save": return { value: stepValue(stepValues.supportSave, rank) };
    case "check": return { value: stepValue(stepValues.supportCheckMastery, rank) };
    case "ac": return { value: 1 + i };
    case "damage": return i < 1 ? { value: null, note: "Damage bonus starts at C-Rank." } : { value: i >= 3 ? 2 : 1 };
    case "speed": return { value: 10 * (1 + i) };
    case "burst": {
      const at = Math.ceil(clamp(level) / 2);
      return { value: jutsuDamageTable[jutsuTableFor[klass] ?? "standard"][rank]?.[at - 1] ?? null, level: at };
    }
    case "regen": {
      const at = Math.ceil(clamp(level) / 4);
      const column = { minion: "low", standard: "low", elite: "medium", solo: "high" }[klass] ?? "low";
      let row = at;
      while ( !strikeTable[column][row - 1] && row < 30 ) row++;
      return { value: strikeTable[column][row - 1][0], level: row };
    }
    case "resistance": return { value: stepValue(stepValues.supportResistances, rank) };
    default: return { value: null };
  }
}

/* -------------------------------------------- */
/*  Building items                              */
/* -------------------------------------------- */

/**
 * One effect from the Effects & Conditions table as activity data: a condition (on a failed save),
 * an Active Effect (changes or a rule element), or a note for the GM (King Q-N36). With its recovery
 * (King Q-N37): a save at the end of the target's turn re-saves; rounds become the effect's duration.
 * @param {{key, value?, text?, recovery?: "action"|"save"|"rounds", rounds?: number}} e
 * @returns {{inflict?, effect?, note?: string, resave?: boolean}}
 */
export function effectActivity(e = {}) {
  const def = freeformEffects[e.key];
  if ( !def ) return {};
  const recovery = recoveryMethods[e.recovery] ? e.recovery : "save";
  const rounds = Math.max(1, Math.min(2, Number(e.rounds) || 1));
  const ends = recovery === "action" ? "ends when the target takes an action to end it"
    : recovery === "rounds" ? `ends after ${rounds} round${rounds > 1 ? "s" : ""}` : "the target repeats the save at the end of each of its turns";
  if ( def.kind === "condition" ) return { inflict: { key: e.key, kind: "condition", ranks: Math.max(1, Number(e.ranks) || 1), label: def.label },
    resave: recovery === "save", note: `${def.label}: ${ends}.` };
  if ( def.kind === "effect" || def.kind === "rule" ) {
    const value = e.value != null && e.value !== "" ? Number(e.value) : def.value;
    return { effect: { name: def.label, target: "targets", seconds: recovery === "rounds" ? rounds * 6 : 60,
      changes: def.kind === "effect" ? [{ key: def.key, value: String(value), mode: 2 }] : [],
      rules: def.kind === "rule" ? [{ key: "disadvantage", selector: def.selector, label: def.label }] : [] },
    note: `${def.label}${def.kind === "effect" ? ` (${value > 0 ? "+" : ""}${value})` : ""}: ${ends}.` };
  }
  return { note: `${e.key === "custom" ? (e.text || "Custom effect") : def.label}: ${ends}.` };
}

const paragraph = lines => lines.filter(Boolean).map(l => `<p>${l}</p>`).join("");

/**
 * A Freeform Strike's item data from its choices (King Q-N35: set when built).
 * @param {object} c  {name, range: melee|ranged, reach, countsAs: freeform|nin|tai|gen, damageType,
 *   rider: {key, value, text, save, recovery, rounds}|null, single: boolean}
 * @param {{level, klass, dcs: number[]}} adv
 */
export function buildStrike(c, adv) {
  const riderTier = c.rider?.key ? freeformEffects[c.rider.key]?.tier ?? 1 : 0;
  const dmg = strikeDamage(clamp(adv.level) + (adv.damageLevel ?? 0), adv.klass, riderTier);
  const multi = dmg.attacks;
  const formula = c.single ? combineAttacks(dmg.formula, multi) : dmg.formula;
  const ranged = c.range === "ranged";
  const reach = ranged ? 60 : Math.max(5, Number(c.reach) || 5);
  const dc = riderDC(adv.klass, adv.dcs);
  const rider = c.rider?.key ? effectActivity(c.rider) : null;
  const activities = [{ id: "strike", type: "attack", label: c.name || "Strike",
    attack: { discipline: c.countsAs || "freeform", range: ranged ? "ranged" : "melee", count: 1 },
    damage: { parts: [{ formula, type: c.damageType || "bludgeoning" }] } }];
  if ( rider ) {
    activities.push({ id: "rider", type: "save", label: `${c.name || "Strike"}: ${freeformEffects[c.rider.key].label}`,
      save: { abilities: [c.rider.save || "con"], dc: { source: "fixed", formula: String(dc) }, onSuccess: "none", resave: !!rider.resave },
      inflicts: rider.inflict ? [rider.inflict] : [] });
    if ( rider.effect ) activities.push({ id: "riderEffect", type: "effect", label: rider.effect.name, effect: rider.effect });
  }
  const line = { freeform: "Weapon", nin: "Ninjutsu", tai: "Taijutsu", gen: "Genjutsu" }[c.countsAs || "freeform"];
  const description = paragraph([
    `<em>${ranged ? "Ranged" : "Melee"} Freeform Strike (${line} attack), ${ranged ? "range 60 ft" : `reach ${reach} ft`}, one target.</em> Hit: ${formula} ${c.damageType || "bludgeoning"} damage.`,
    c.single ? `One attack dealing the damage of ${multi}.` : multi > 1 ? `Multiattack: ${multi} attacks with the Attack action.` : "",
    rider ? `On a hit, the target makes a DC ${dc} ${capitalize(c.rider.save || "con")} saving throw. ${rider.note}` : ""
  ]);
  return { name: c.name || "Freeform Strike", type: "feat", img: "icons/skills/melee/strike-sword-steel-yellow.webp",
    system: { category: "npcStrikes", description, activation: { type: "action", value: 1 },
      target: { range: { type: "feet", value: reach }, area: {} }, activities },
    flags: { n5e: { freeform: { kind: "strike", choices: structuredClone(c), built: { level: adv.level, klass: adv.klass, damageLevel: adv.damageLevel ?? 0, formula, dc }, handEdited: false } } } };
}

/**
 * A Freeform Jutsu's item data from its choices.
 * @param {object} c  {name, type: offensive|defensive|support, rank, discipline, keywords[], range, target: single|area,
 *   shape, resolve: attack|save, saveAbility, noDamageOnSave, lowestAttack, preestablished, attacks, damageType,
 *   effects: [{key, value, text, recovery, rounds}], focus, focusTypes[], focusKey, activation, cost}
 * @param {{level, klass}} adv
 */
export function buildJutsu(c, adv) {
  const type = c.type || "offensive";
  const rank = RANKS.includes(c.rank) ? c.rank : "D";
  const effects = (c.effects ?? []).filter(e => freeformEffects[e.key]).slice(0, type === "offensive" ? 2 : 1);
  const built = effects.map(effectActivity);
  const area = c.target === "area" && freeformShapes[c.shape] ? freeformShapes[c.shape] : null;
  const range = freeformRanges[c.range] ?? freeformRanges.close;
  const cost = c.cost != null && c.cost !== "" ? Number(c.cost) : freeformCostFor(rank, adv.klass);
  const activities = [];
  const notes = built.map(b => b.note);
  let damage = null;
  let concentration = false;
  if ( type === "offensive" ) {
    damage = jutsuDamage(adv.level, adv.klass, rank, { area: !!area, effects: effects.map(e => freeformEffects[e.key].tier),
      noDamageOnSave: c.resolve === "save" && !!c.noDamageOnSave, lowestAttack: c.resolve === "attack" && !!c.lowestAttack,
      preestablished: Number(c.preestablished) || 0, damageBonus: adv.damageLevel ?? 0 }, Math.max(1, Number(c.attacks) || 1));
    const parts = [{ formula: damage.perAttack, type: c.damageType || "fire" }];
    const inflicts = built.filter(b => b.inflict).map(b => b.inflict);
    if ( c.resolve === "attack" ) {
      activities.push({ id: "attack", type: "attack", label: c.name, attack: { range: range.value > 5 ? "ranged" : "melee", count: Math.max(1, Number(c.attacks) || 1) },
        damage: { parts } });
      if ( inflicts.length ) activities.push({ id: "effects", type: "save", label: `${c.name}: effects`,
        save: { abilities: [c.saveAbility || "con"], dc: { source: "discipline" }, onSuccess: "none", resave: built.some(b => b.resave) }, inflicts });
    } else {
      activities.push({ id: "save", type: "save", label: c.name, save: { abilities: [c.saveAbility || "dex"], dc: { source: "discipline" },
        onSuccess: c.noDamageOnSave ? "none" : "half", resave: built.some(b => b.resave) }, damage: { parts }, inflicts });
    }
    for ( const [i, b] of built.entries() ) if ( b.effect ) activities.push({ id: `effect${i}`, type: "effect", label: b.effect.name, effect: b.effect });
    if ( c.preestablished ) notes.push("Only targets a creature already under the effect this jutsu builds on.");
  } else if ( type === "defensive" ) {
    const v = defensiveValue(c.focus, { rank, klass: adv.klass, level: adv.level });
    if ( v.note ) notes.push(v.note);
    const ends = ["elite", "solo"].includes(adv.klass) ? "until the start of its next turn (its next Elite Action, once Elite Actions exist)" : "until the start of its next turn";
    const self = { name: c.name, target: c.range === "self" ? "self" : "targets", expires: "turnStart", changes: [] };
    if ( c.focus === "ac" ) self.changes.push({ key: "system.bonuses.ac", value: String(v.value ?? 0), mode: 2 });
    if ( c.focus === "dr" ) {
      const avg = averageOf(v.value);
      self.changes.push({ key: "n5e.dr", value: String(avg), mode: 2 });
      if ( /d/.test(String(v.value)) ) notes.push(`Damage Reduction ${v.value} (its average, ${avg}, is applied).`);
    }
    if ( c.focus === "resistance" || c.focus === "immunity" ) for ( const t of (c.focusTypes ?? []).slice(0, 1) ) {
      self.changes.push({ key: c.focus === "immunity" ? "n5e.immune" : "n5e.resist", value: t, mode: 2 });
    }
    if ( c.focus === "tempHp" ) { delete self.expires; self.tempHp = v.value ?? ""; }
    activities.push({ id: "defend", type: "effect", label: c.name, activation: c.activation || "reaction", effect: self });
    for ( const [i, b] of built.entries() ) if ( b.effect ) activities.push({ id: `effect${i}`, type: "effect", label: b.effect.name, effect: b.effect });
    notes.unshift(`${({ ac: `+${v.value} AC`, dr: `Damage Reduction ${v.value}`, resistance: "Resistance", immunity: "Immunity", tempHp: `${v.value} temporary Hit Points` })[c.focus] ?? ""} ${c.focus === "tempHp" ? "until used up" : ends}.`);
  } else {
    const v = supportValue(c.focus, { rank, klass: adv.klass, level: adv.level });
    if ( v.note ) notes.push(v.note);
    concentration = c.focus !== "burst";
    const eff = { name: c.name, target: c.range === "self" ? "self" : "targets", seconds: 60, changes: [] };
    switch ( c.focus ) {
      case "attack": eff.changes.push({ key: `n5e.attack.${c.focusKey || "all"}`, value: String(v.value), mode: 2 }); break;
      case "save": eff.changes.push({ key: "system.bonuses.save", value: String(v.value), mode: 2 }); break;
      case "check": for ( let n = 0; n < (v.value ?? 0); n++ ) eff.changes.push({ key: `n5e.mastery.skill.${c.focusKey || "ath"}`, value: `${c.name} ${n + 1}`, mode: 2 }); break;
      case "ac": eff.changes.push({ key: "system.bonuses.ac", value: String(v.value), mode: 2 }); break;
      case "speed": eff.changes.push({ key: "system.bonuses.speed", value: String(v.value), mode: 2 }); break;
      case "resistance": for ( const t of (c.focusTypes ?? []).slice(0, v.value ?? 1) ) eff.changes.push({ key: "n5e.resist", value: t, mode: 2 }); break;
      default: break;
    }
    if ( c.focus === "burst" ) activities.push({ id: "burst", type: "heal", label: c.name, activation: c.activation || "bonus", heal: { formula: v.value ?? "0", pool: "hp" } });
    else if ( c.focus === "regen" ) {
      activities.push({ id: "regen", type: "heal", label: `${c.name} (start of each turn)`, heal: { formula: v.value ?? "0", pool: "hp" } });
      notes.push(`The target regains ${v.value} Hit Points at the start of each of its turns while this lasts (press the heal button then).`);
    } else if ( c.focus === "damage" ) notes.push(`The target reads Freeform damage tables ${v.value} level${v.value > 1 ? "s" : ""} higher while this lasts.`);
    else activities.push({ id: "support", type: "effect", label: c.name, activation: c.activation || "bonus", effect: eff });
    for ( const [i, b] of built.entries() ) if ( b.effect ) activities.push({ id: `effect${i}`, type: "effect", label: b.effect.name, effect: b.effect });
  }
  const where = area ? area.label : c.target === "single" || !c.target ? "one target" : "";
  const description = paragraph([
    `<em>${rank}-Rank ${capitalize(type)} Freeform Jutsu. ${range.label}${where ? `, ${where}` : ""}.</em>`,
    damage ? `${c.resolve === "attack" ? `${damage.attacks > 1 ? `${damage.attacks} attacks` : "Attack"}: ${damage.perAttack}` : `${capitalize(c.saveAbility || "dex")} save: ${damage.formula}`} ${c.damageType || "fire"} damage${c.resolve === "save" ? (c.noDamageOnSave ? ", none on a success" : ", half on a success") : ""}.` : "",
    ...notes
  ]);
  return { name: c.name || "Freeform Jutsu", type: "jutsu", img: "icons/magic/fire/projectile-fireball-orange.webp",
    system: { rank, discipline: c.discipline || "nin", disciplines: [c.discipline || "nin"], keywords: [...(c.keywords ?? [])],
      cost: { mode: "chakra", value: cost }, description,
      activation: { type: c.activation || (type === "defensive" ? "reaction" : type === "support" ? "bonus" : "action"), value: 1 },
      target: { range: { type: "feet", value: range.value }, area: area ? { shape: area.shape, size: area.size, width: area.width ?? null, height: area.height ?? null } : {} },
      duration: { value: concentration ? 1 : null, unit: concentration ? "minute" : "instant", concentration },
      activities },
    flags: { n5e: { freeform: { kind: "jutsu", choices: structuredClone(c), built: { level: adv.level, klass: adv.klass, damageLevel: adv.damageLevel ?? 0, formula: damage?.perAttack ?? null }, handEdited: false } } } };
}

/** The average of a dice formula ("1d4+2" -> 4), rounded down; a number stays itself. */
export function averageOf(formula) {
  const s = String(formula ?? "0").replace(/\s+/g, "");
  if ( /^-?\d+$/.test(s) ) return Number(s);
  let total = 0;
  for ( const term of s.replace(/-/g, "+-").split("+").filter(Boolean) ) {
    const m = term.match(/^(-?)(\d*)d(\d+)$/);
    if ( m ) total += (m[1] ? -1 : 1) * (Number(m[2] || 1) * (Number(m[3]) + 1)) / 2;
    else total += Number(term) || 0;
  }
  return Math.floor(total);
}

/**
 * After the adversary's level or class changes: the new item data for a Freeform Jutsu, or null when
 * it shouldn't change (a Strike, set when built; or damage edited by hand since it was built).
 * @returns {{data: object|null, handEdited: boolean}}
 */
export function recalculate(item, adv) {
  const ff = item.flags?.n5e?.freeform;
  if ( ff?.kind !== "jutsu" ) return { data: null, handEdited: false };
  const current = item.system?.activities?.find(a => a.damage?.parts?.length)?.damage.parts[0]?.formula ?? null;
  if ( ff.built?.formula && current && current !== ff.built.formula ) return { data: null, handEdited: true };
  if ( ff.built?.level === adv.level && ff.built?.klass === adv.klass && (ff.built?.damageLevel ?? 0) === (adv.damageLevel ?? 0) ) return { data: null, handEdited: false };
  const next = buildJutsu(ff.choices, adv);
  // Keep what the GM may have changed that the choices don't hold.
  delete next.name;
  delete next.img;
  return { data: next, handEdited: false };
}

/** What the builders read from an NPC: name, level, class, the Striker's damage level, and its jutsu save DCs (for Strike riders). */
export function adversaryOf(actor) {
  const sys = actor?.system ?? {};
  return { name: actor?.name ?? "", level: clamp(sys.details?.level ?? 1), klass: sys.details?.class ?? "standard",
    damageLevel: roleModifiers[sys.details?.role]?.damageLevel ?? 0,
    dcs: ["nin", "gen", "tai"].map(k => sys.disciplines?.[k]?.dc).filter(v => Number.isFinite(Number(v))).map(Number) };
}
