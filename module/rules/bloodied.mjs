/**
 * LEFT1 P4 (King Q-L5, 2026-11-25): the Bloodied token marker. Pure.
 * Bloodied = at half hit points or less (the derived state, data/actor/creature.mjs).
 */

/** Is this actor bloodied? (hp.max > 0 and hp.value <= hp.max / 2, still above 0). */
export function isBloodied(hp) {
  return !!hp && hp.max > 0 && hp.value > 0 && hp.value <= hp.max / 2;
}

/**
 * Does this viewer see the marker? Setting `bloodiedVisibility`: all (every creature), player (player
 * characters only, as dnd5e), none (off). The GM sees it on every creature unless it is off.
 * @param {"all"|"player"|"none"} setting
 * @param {{isGM?: boolean, playerOwned?: boolean}} o
 */
export function showBloodied(setting, { isGM = false, playerOwned = false } = {}) {
  if ( setting === "none" ) return false;
  if ( isGM || setting === "all" ) return true;
  return playerOwned;
}
