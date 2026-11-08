/**
 * Chain count state machine (KB 04 "Chain (merged rule)", King rulings 2026-11-06).
 *
 *  - Count 0-3, persists across turns.
 *  - Raise: only a Chain Bukijutsu cast with your Action on your turn: +1, hold, or opt out.
 *  - Maintain: a Chain Bukijutsu cast as a Bonus Action or Reaction keeps the count.
 *  - Effects: only the Chain effect whose number exactly matches the count applies.
 *  - Reset to 0: any non-Chain jutsu; or your turn starts and you neither raised nor maintained
 *    since your last turn started. You can sit at Chain 3; opting out doesn't reset.
 *  - No repeats: the same named jutsu can't be cast twice in one chain.
 *
 * This is the full rule as a pure state machine (tests use it as the reference). The live sheet
 * applies the simpler update in rules/cast-tracking.mjs (at cast) and rules/turn-start.mjs (the
 * reset). Keep the three in step when the Chain rule changes.
 */
export const CHAIN_MAX = 3;

/** A fresh Chain state (value 0, inactive, no jutsu used yet). */
export function newChainState() {
  return { value: 0, active: false, used: [] };
}

/**
 * Resolve a jutsu cast against the chain.
 * @param {{value:number, active:boolean, used:string[]}} state
 * @param {object} cast
 * @param {boolean} cast.isChain       jutsu has the Chain keyword
 * @param {string} cast.activation     "action" | "bonus" | "reaction" | ...
 * @param {boolean} [cast.onOwnTurn=true]
 * @param {"raise"|"hold"|"optOut"} [cast.choice="raise"]  only for Action casts
 * @param {string} [cast.name]         jutsu identity for the no-repeat rule
 * @returns {{state: object, appliedRank: number|null, error?: string}}
 */
export function resolveChainCast(state, { isChain, activation, onOwnTurn = true, choice = "raise", name }) {
  const s = { ...state, used: [...(state.used ?? [])] };
  if ( !isChain ) return { state: newChainState(), appliedRank: null };
  if ( name && s.used.includes(name) && s.value > 0 ) {
    return { state, appliedRank: null, error: "repeat" };
  }
  let appliedRank;
  if ( activation === "action" && onOwnTurn ) {
    if ( choice === "raise" ) s.value = Math.min(CHAIN_MAX, s.value + 1);
    s.active = true;
    appliedRank = choice === "optOut" ? null : s.value;
  } else {
    // Bonus Action / Reaction / other: maintain at the current count.
    s.active = true;
    appliedRank = s.value || null;
  }
  if ( name ) s.used.push(name);
  return { state: s, appliedRank: appliedRank || null };
}

/** Start of the actor's turn: reset unless raised or maintained since the last turn start. */
export function chainTurnStart(state) {
  if ( !state.active ) return newChainState();
  return { ...state, active: false };
}
