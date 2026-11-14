/**
 * Environment (pure; ENV1, KB 06).
 *
 *   Hostile terrain   Direct Exposure (combat): at the start of each turn inside it, a Con save vs the
 *                     terrain's DC; on a failure, the terrain's damage, ignoring DR. Rank sets the DC
 *                     and damage (D 18 / none, C 20 / 3d6, B 21 / 5d6, A 23 / 7d6, S 25 / 9d6); the
 *                     type sets the damage type (Extreme Heat fire, Extreme Cold cold, Toxic poison).
 *                     Chakra Resistant terrain deals no damage (its effects are noted, not automated).
 *   Suffocating       In combat a creature holds its breath for its Con modifier in turns (min 1).
 *                     When it runs out, it drops to 0 HP and is Dying.
 *   Falling           Waits on King's choice between the two Chapter 7 versions (KB conflict C11).
 */
import { hostileTerrain, terrainTypes } from "../config/character.mjs";

/** Direct Exposure for a terrain type and rank: {dc, damage, damageType, label} or null when it deals none. */
export function terrainExposure(type, rank) {
  const r = hostileTerrain[rank];
  const t = terrainTypes[type];
  if ( !r || !t ) return null;
  return { dc: r.dc, damage: t.damageType ? r.damage : null, damageType: t.damageType ?? null, label: `${t.label} (${rank}-Rank)` };
}

/** The worst exposure among several terrains a creature stands in (highest DC). */
export function worstExposure(terrains = []) {
  const list = terrains.map(t => terrainExposure(t.type, t.rank)).filter(Boolean);
  return list.sort((a, b) => b.dc - a.dc)[0] ?? null;
}

/** Breath held in combat: the Con modifier in turns, at least 1. */
export const breathTurns = conMod => Math.max(1, Number(conMod) || 0);

/**
 * One turn start while Suffocating.
 * @param {number|null} remaining  turns of breath left (null: just started)
 * @param {number} conMod
 * @returns {{remaining: number, outOfBreath: boolean}}
 */
export function suffocationStep(remaining, conMod) {
  const left = remaining == null ? breathTurns(conMod) : Number(remaining);
  if ( left <= 0 ) return { remaining: 0, outOfBreath: true };
  return { remaining: left - 1, outOfBreath: false };
}
