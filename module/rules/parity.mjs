/**
 * dnd5e-parity chat visibility (pure; tested in Node). King 2026-11-13: player ↔ NPC interaction
 * works as in dnd5e 5.3.3 and PF2e. These mirror dnd5e's world settings:
 *   attackRollVisibility  all | hideAC | none   who sees per-target hit/miss (and AC) on attack cards
 *   challengeVisibility   all | player | none   who sees DCs and pass/fail on check and save cards
 *   concealItemDescriptions                     hide NPC item descriptions from non-owners
 */

/**
 * Per-target attack outcome rows (dnd5e's chat target list).
 * @param {{total:number, natural:number, threshold?:number}} roll
 * @param {{uuid, name, ac:number|null}[]} targets   snapshot taken when the attack was rolled
 * @param {{visibility?: string, isGM?: boolean}} [o]
 * @returns {{uuid, name, result: "hit"|"miss"|"crit"|"fumble"|null, ac: number|null}[]}
 */
export function attackTargetRows(roll, targets, { visibility = "none", isGM = false } = {}) {
  const showResult = isGM || visibility === "all" || visibility === "hideAC";
  const showAC = isGM || visibility === "all";
  return (targets ?? []).map(t => {
    let result = null;
    if ( showResult ) {
      if ( roll.natural === 1 ) result = "fumble";
      else if ( roll.natural >= (roll.threshold ?? 20) ) result = "crit";
      else if ( Number.isFinite(t.ac) ) result = roll.total >= t.ac ? "hit" : "miss";
    }
    return { uuid: t.uuid, name: t.name, result, ac: showAC && Number.isFinite(t.ac) ? t.ac : null };
  });
}

/**
 * May this user see a check or save card's DC and pass/fail?
 * dnd5e "player": players see them on rolls made for player-owned creatures, not on NPC rolls.
 * @param {string} setting       all | player | none
 * @param {{isGM: boolean}} user
 * @param {boolean} rollerHasPlayerOwner  the rolling actor is owned by a non-GM user
 */
export function challengeVisible(setting, user, rollerHasPlayerOwner) {
  if ( user?.isGM || setting === "all" ) return true;
  if ( setting === "player" ) return !!rollerHasPlayerOwner;
  return false;
}

/** Hide an NPC item's description from users who don't own its actor (dnd5e concealItemDescriptions). */
export function descriptionVisible(conceal, user, { isNPC, isOwner }) {
  if ( !conceal || user?.isGM || isOwner ) return true;
  return !isNPC;
}

/** Labels for a result row. */
export const ATTACK_RESULT_LABELS = Object.freeze({ hit: "Hit", miss: "Miss", crit: "Critical hit", fumble: "Natural 1: miss" });

/**
 * Roll-request entries this user may roll (dnd5e request-message-data: players see only their own).
 * @param {{uuid, name}[]} entries        requested actors; empty = anyone rolls for their own creature
 * @param {(uuid:string)=>boolean} owns   ownership test for the viewing user
 */
export function visibleRequestEntries(entries, owns, isGM = false) {
  if ( isGM ) return entries ?? [];
  return (entries ?? []).filter(e => owns(e.uuid));
}
