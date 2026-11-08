/** Temporary weapon riders. Never edit the weapon's base damage or properties. */
export function activeCoatings(weapon, now = 0) {
  const coatings = weapon?.flags?.n5e?.coatings;
  return (Array.isArray(coatings) ? coatings : []).filter(c => c && c.uses !== 0
    && (c.expires == null || c.expires > now));
}

/** Validate authored coating data before saving; formulas are evaluated by Foundry Roll only. */
export function coatingData(data, now = 0) {
  if ( !data?.id || !/^[a-zA-Z0-9_-]+$/.test(data.id) ) throw new Error("A coating needs a stable id (letters, numbers, _ or -).");
  if ( !Array.isArray(data.parts) || !data.parts.length || data.parts.some(p => !p.formula || typeof p.formula !== "string" || typeof p.type !== "string") ) {
    throw new Error("A coating needs damage parts with a formula and damage type.");
  }
  const duration = Number(data.duration ?? 60);
  const uses = data.uses == null ? null : Number(data.uses);
  if ( !Number.isFinite(duration) || duration <= 0 || (uses != null && (!Number.isInteger(uses) || uses < 1)) ) {
    throw new Error("Coating duration must be positive; uses must be a positive integer or null.");
  }
  return { id: data.id, label: String(data.label || data.id), expires: now + duration, uses,
    parts: data.parts.map(p => ({ formula: p.formula, type: p.type })) };
}

/** Consume one damage roll, not one die or typed damage part. Unlimited uses remain null. */
export function spendCoatings(coatings) {
  return coatings.map(c => ({ ...c, uses: c.uses == null ? null : Math.max(0, c.uses - 1) }));
}
