/** Reaction decisions only: accepting a window never applies an effect or spends a resource. */
export function reactionDeadline(seconds, now = Date.now()) {
  if ( !Number.isFinite(seconds) || seconds < 0 || !Number.isSafeInteger(Math.floor(now + seconds * 1000)) ) throw new Error("Reaction timeout must be a finite nonnegative number of seconds.");
  return seconds === 0 ? null : now + seconds * 1000;
}

export function reactionPhase(window, now = Date.now()) {
  if ( window.state !== "pending" ) return window.state;
  return window.deadline !== null && now >= window.deadline ? "gm" : "pending";
}

export function decideReaction(window, decision, { gm = false, userId = "", now = Date.now() } = {}) {
  if ( !["accept", "decline"].includes(decision) ) throw new Error("Unknown reaction decision.");
  if ( !["pending", "gm"].includes(window.state) ) throw new Error("Reaction window is already resolved.");
  if ( !gm && (reactionPhase(window, now) !== "pending" || !window.owners.includes(userId)) ) throw new Error("This reaction needs GM resolution or another eligible owner.");
  return { ...window, state: decision === "accept" ? "accepted" : "declined", resolvedAt: now, resolvedBy: gm ? "gm" : userId };
}
