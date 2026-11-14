/**
 * Weapon properties in attacks (pure; ATK1, Chapter 5 "Weapon Properties" and Chapter 8 "Making an
 * Attack"). Inputs are plain data so the rules are tested in Node.
 *
 *   Critical X   +X crit range for attacks with the weapon (the total stays capped at +3).
 *   Deadly X     a crit adds X more of the weapon's own damage dice.
 *   Heavy        Str below 16: disadvantage. Adds half the Str modifier (rounded down) to weapon
 *                damage, on top of the normal ability modifier (King 2026-11-13).
 *   Volatile X   no ability modifier on damage; a natural d20 at or below X backfires and jams.
 *   Multiattack  a bonus-action attack with no ability modifier on damage.
 *   Reach X      +5 ft reach per rank.
 *   Thrown/Range normal/long range: beyond normal = disadvantage, beyond long = can't attack. A
 *                ranged or thrown attack within 5 ft of a hostile that can see you and isn't
 *                incapacitated has disadvantage.
 *   Returning    thrown within 60 ft, it's called back and caught: its Ammunition Die isn't rolled.
 *   Ammunition   the Ammunition Die is rolled on ranged and thrown attacks only, never on a melee
 *                swing ("This only counts for ranged attacks").
 */

const props = weapon => weapon?.system?.properties ?? weapon?.properties ?? {};
const sys = weapon => weapon?.system ?? weapon ?? {};

/** Critical X: crit range bonus from the weapon. */
export const weaponCritBonus = weapon => Number(props(weapon).critical) || 0;

/** Deadly X: the extra dice a crit adds ("1d8" Deadly 1 -> "1d8"; "2d6" Deadly 2 -> "2d6"), or "". */
export function deadlyDice(weapon, die = sys(weapon).damage?.die) {
  const ranks = Number(props(weapon).deadly) || 0;
  const m = String(die ?? "").match(/^(\d*)d(\d+)/);
  if ( !ranks || !m ) return "";
  return `${ranks}d${m[2]}`;
}

/** Heavy: the disadvantage source when Str is below the requirement (16), else null. */
export function heavyPenalty(strScore, weapon) {
  if ( !("heavy" in props(weapon)) ) return null;
  return (Number(strScore) || 0) < 16 ? "Heavy (Str below 16)" : null;
}

/** Heavy: half the Str modifier, rounded down, added to weapon damage. */
export const heavyDamage = (strMod, weapon) => ("heavy" in props(weapon) ? Math.floor((Number(strMod) || 0) / 2) : 0);

/** Volatile X rank (0 when the weapon isn't Volatile). */
export const volatileRank = weapon => Number(props(weapon).volatile) || 0;

/** A natural d20 at or below the Volatile rank backfires. */
export const backfires = (weapon, natural) => volatileRank(weapon) > 0 && Number(natural) <= volatileRank(weapon);

/** Melee reach in feet: 5 + 5 per Reach rank. */
export const reachOf = weapon => 5 + 5 * (Number(props(weapon).reach) || 0);

/**
 * How this attack is made: "ranged" (a ranged weapon), "thrown" (a melee weapon with Thrown, asked
 * for or used beyond its reach) or "melee".
 * @param {object} weapon
 * @param {{requested?: string, distance?: number|null}} [o]
 */
export function attackMode(weapon, { requested = "", distance = null } = {}) {
  const s = sys(weapon);
  if ( s.weaponType === "ranged" ) return "ranged";
  const thrown = "thrown" in props(weapon);
  if ( thrown && requested === "thrown" ) return "thrown";
  if ( thrown && distance != null && distance > reachOf(weapon) ) return "thrown";
  return "melee";
}

/** The range used by the attack: {normal, long} in feet (long is null for melee). */
export function attackRange(weapon, mode) {
  if ( mode === "melee" ) return { normal: reachOf(weapon), long: null };
  const r = sys(weapon).range ?? {};
  return { normal: Number(r.normal) || 5, long: Number(r.long) || Number(r.normal) || 5 };
}

/**
 * Range rules for one attack (Chapter 8).
 * @param {string} mode                 melee | thrown | ranged
 * @param {{normal: number, long: number|null}} range
 * @param {number|null} distance        to the single target, in feet (null: unknown, no check)
 * @param {number} closeHostiles        hostiles within 5 ft that can see the attacker and aren't incapacitated
 * @returns {{disadvantage: string[], refuse: string|null}}
 */
export function rangeSources(mode, range, distance, closeHostiles = 0) {
  const out = { disadvantage: [], refuse: null };
  if ( mode === "melee" ) return out;
  if ( distance != null ) {
    if ( range.long != null && distance > range.long ) out.refuse = `The target is beyond long range (${range.long} ft).`;
    else if ( distance > range.normal ) out.disadvantage.push("Long range");
  }
  if ( closeHostiles > 0 ) out.disadvantage.push("Ranged attack in melee");
  return out;
}

/** Whether this attack rolls the weapon's Ammunition Die. */
export function rollsAmmo(weapon, mode, distance = null) {
  if ( !sys(weapon).ammo?.usesDie || mode === "melee" ) return false;
  const thrown = mode === "thrown" || (mode === "ranged" && "thrown" in props(weapon));
  if ( thrown && "returning" in props(weapon) && (distance == null || distance <= 60) ) return false;
  return true;
}

/**
 * The d4 Ammunition Die a Thrown weapon without the Ammunition property carries (Chapter 5, Thrown).
 * Returns the ammo fields to set, or null when the weapon already has its die.
 */
export function thrownAmmo(weapon) {
  const p = props(weapon);
  const ammo = sys(weapon).ammo ?? {};
  if ( !("thrown" in p) || "ammunition" in p || ammo.usesDie ) return null;
  return { usesDie: true, steps: [4, 1, 0], step: 0 };
}
