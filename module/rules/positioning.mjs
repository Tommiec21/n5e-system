/**
 * Positioning (pure; POS1, KB 03 and 05).
 *
 *   Cover            Partial +2 AC and Dex saves; Half +4; Total: can't be targeted directly. Only the
 *                    highest applies. The GM sets it with token statuses (dnd5e cover statuses).
 *   Opportunity      A hostile that leaves your reach provokes one melee attack (your Reaction), before
 *     Attack         it leaves. One per movement. Not from teleport or forced movement, and not while
 *                    the mover is Disengaged. You must see it and be able to react.
 *   Engaged          After either creature makes a melee attack against the other; ends after a full
 *                    round without one.
 *   Surprised        No move, Action or Bonus Action on its first turn; no Reaction until that turn
 *                    ends; ends at the end of round 1.
 *   Dodge            Lost while incapacitated or at speed 0 (Grappled, Restrained).
 */

export const COVER = Object.freeze({
  coverPartial: { label: "Partial cover", bonus: 2 },
  coverHalf: { label: "Half cover", bonus: 4 },
  coverTotal: { label: "Total cover", bonus: 0, untargetable: true }
});

const has = (statuses, s) => !!statuses?.has?.(s);

/** The cover that applies (the highest of the statuses), or null. */
export function coverFrom(statuses) {
  if ( has(statuses, "coverTotal") ) return { key: "coverTotal", ...COVER.coverTotal };
  if ( has(statuses, "coverHalf") ) return { key: "coverHalf", ...COVER.coverHalf };
  if ( has(statuses, "coverPartial") ) return { key: "coverPartial", ...COVER.coverPartial };
  return null;
}

/** Bonus to AC and Dex saves from cover (0 with none or Total). */
export const coverBonus = statuses => coverFrom(statuses)?.bonus ?? 0;

/** True when the creature can't be targeted directly (Total cover). */
export const untargetable = statuses => !!coverFrom(statuses)?.untargetable;

const NO_REACTION = ["incapacitated", "stunned", "unconscious", "petrified", "dead", "dying", "surprised"];
const BLIND = ["blinded"];

/** Movement that never provokes (teleport and forced movement). */
export function provokingMove({ action = "", forced = false } = {}) {
  if ( forced ) return false;
  return !["blink", "displace", "teleport"].includes(action);
}

/**
 * Opportunity Attack reminders for one move (pure).
 * @param {{from: number, to: number}[]} watchers  for each hostile: distance from the mover's start
 *   and end positions, its reach, and its facts
 *   [{id, name, from, to, reach, statuses: Set, reactionUsed: boolean}]
 * @param {{disengaged?: boolean, action?: string, forced?: boolean}} move
 * @returns {object[]} the watchers that may make an Opportunity Attack
 */
export function opportunityReminders(watchers, move = {}) {
  if ( move.disengaged || !provokingMove(move) ) return [];
  return (watchers ?? []).filter(w => w.from <= w.reach && w.to > w.reach && !w.reactionUsed
    && !NO_REACTION.some(s => has(w.statuses, s)) && !BLIND.some(s => has(w.statuses, s)));
}

/** Engaged: the last melee attack between the two was this round or the previous one. */
export function isEngaged(lastRound, round) {
  if ( !Number.isFinite(lastRound) || !Number.isFinite(round) ) return false;
  return round - lastRound <= 1;
}

/** Surprised turn: in round 1 a Surprised creature's move, Action and Bonus Action are spent. */
export function surprisedEconomy(statuses, round) {
  if ( round !== 1 || !has(statuses, "surprised") ) return null;
  return { action: true, bonus: true, move: true, reaction: true };
}

/** Dodge works only while the creature isn't incapacitated and has speed (not Grappled or Restrained). */
export function dodgeActive(statuses) {
  if ( !has(statuses, "dodging") ) return false;
  return !["incapacitated", "stunned", "unconscious", "petrified", "grappled", "restrained"].some(s => has(statuses, s));
}
