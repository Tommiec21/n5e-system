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

const NO_REACTION = ["incapacitated", "stunned", "unconscious", "petrified", "dead", "dying"];
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
  // FIN4c: `sees` is the watcher's own sight of the mover (token vision): false skips it; null (couldn't
  // be checked) still reminds, marked "sight not checked" by the caller (King Q-F17).
  return (watchers ?? []).filter(w => w.from <= w.reach && w.to > w.reach && !w.reactionUsed && w.sees !== false
    && !NO_REACTION.some(s => has(w.statuses, s)) && !BLIND.some(s => has(w.statuses, s)));
}

/**
 * FIN4c: the two nearest grid cells of two tokens, for reach measured edge to edge.
 * @param {{x: number, y: number, w: number, h: number}} a  column, row, width and height in cells
 * @param {{x: number, y: number, w: number, h: number}} b
 * @returns {[{x: number, y: number}, {x: number, y: number}]}
 */
export function nearestCells(a, b) {
  const axis = (a0, aw, b0, bw) => {
    const a1 = a0 + Math.max(1, aw) - 1, b1 = b0 + Math.max(1, bw) - 1;
    if ( a1 < b0 ) return [a1, b0];
    if ( b1 < a0 ) return [a0, b1];
    const m = Math.max(a0, b0);
    return [m, m];
  };
  const [ax, bx] = axis(a.x, a.w, b.x, b.w);
  const [ay, by] = axis(a.y, a.h, b.y, b.h);
  return [{ x: ax, y: ay }, { x: bx, y: by }];
}

/** FIN4c, gridless scenes: centre distance less each token's half-size (never below 0). */
export const edgeGap = (centreDistance, aSize, bSize) => Math.max(0, centreDistance - (aSize + bSize) / 2);

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

/** Surprised blocks Reactions until the end of the creature's first turn (flags.n5e.surpriseDone). */
export const surpriseBlocksReaction = (statuses, surpriseDone = false) => has(statuses, "surprised") && !surpriseDone;

/** Dodge works only while the creature isn't incapacitated and has speed (not Grappled or Restrained). */
export function dodgeActive(statuses) {
  if ( !has(statuses, "dodging") ) return false;
  return !["incapacitated", "stunned", "unconscious", "petrified", "grappled", "restrained"].some(s => has(statuses, s));
}
