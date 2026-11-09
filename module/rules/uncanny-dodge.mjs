/** Uncanny Dodge has no inferred visibility fallback or extra resource cost. */
export function uncannyDodgeOffer(actor, { combat = false, instances = [], visibility } = {}) {
  if ( !combat || !instances.some(i => i.amount > 0) || actor.flags?.n5e?.economy?.reaction ) return null;
  if ( ["dead", "unconscious", "incapacitated", "stunned"].some(s => actor.statuses?.has(s)) ) return null;
  const item = actor.items.find(i => i.system?.identifier === "uncanny-dodge");
  if ( !item ) return null;
  if ( visibility?.visible == null ) throw new Error("Uncanny Dodge visibility is unresolved: " + (visibility?.reason ?? "no observer result"));
  return visibility.visible ? { item, multiplier: 0.5 } : null;
}
