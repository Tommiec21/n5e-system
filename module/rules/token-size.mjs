/**
 * PRESTD1 A11 (optional rule scaleTokens): token size in grid units by creature size (PF2e's token
 * autoscale, on N5e's sizes). Pure.
 */
export const TOKEN_SIZES = Object.freeze({ tiny: 0.5, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 });

/** Width and height for a size, or null for an unknown size. */
export function tokenSizeFor(size) {
  const n = TOKEN_SIZES[size];
  return n == null ? null : { width: n, height: n };
}

/** Should this creature be marked defeated (PRESTD1 A12)? Dead, or an NPC at 0 HP. */
export function isDefeated({ type, hp, statuses } = {}) {
  const has = s => (statuses instanceof Set ? statuses.has(s) : (statuses ?? []).includes(s));
  if ( has("dead") ) return true;
  return ["npc", "hazard", "vehicle"].includes(type) && Number(hp) <= 0;
}

/** PRESTD1 A13: the Encumbered state should be on exactly when the inventory says so. */
export const encumbranceChange = (encumbered, hasStatus) => (encumbered && !hasStatus ? "add" : !encumbered && hasStatus ? "remove" : null);
