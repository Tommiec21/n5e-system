/**
 * PRESTD1 Part D (King Q-PF4: "emulating PF2e for now"): wands, flanking and crafting. Pure.
 */

/* ---- Wands ---- */

/**
 * What using a wand does, from its state today ({used, overcharged, broken}):
 *   cast        the first use today
 *   overcharge  a second use: cast, then a flat check (DC 10) or it breaks
 *   destroy     overcharged once already today, or broken (the spec: "a broken wand that is
 *               overcharged is destroyed"): it is destroyed and nothing is cast
 */
export function wandAction({ used = false, overcharged = false, broken = false } = {}) {
  if ( broken ) return "destroy";
  if ( !used ) return "cast";
  if ( !overcharged ) return "overcharge";
  return "destroy";
}

/** The overcharge flat check: DC 10 on a d20. */
export const overchargeHolds = natural => Number(natural) >= 10;

/* ---- Flanking ---- */

/** Does the segment a-b pass through the rectangle (x, y, w, h)? (Liang-Barsky clipping.) */
export function segmentHitsRect(a, b, r) {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  const edges = [[-dx, a.x - r.x], [dx, r.x + r.w - a.x], [-dy, a.y - r.y], [dy, r.y + r.h - a.y]];
  for ( const [p, q] of edges ) {
    if ( p === 0 ) { if ( q < 0 ) return false; continue; }
    const t = q / p;
    if ( p < 0 ) { if ( t > t1 ) return false; if ( t > t0 ) t0 = t; }
    else { if ( t < t0 ) return false; if ( t < t1 ) t1 = t; }
  }
  return t0 < t1;   // touching a single corner is not passing through
}

/**
 * Is the target flanked by the attacker and this ally? Both within their melee reach of it, and the
 * line between their centres passes through it (PF2e).
 * @param {{centre, inReach}} attacker
 * @param {{centre, inReach}} ally
 * @param {{x, y, w, h}} targetRect
 */
export const flanks = (attacker, ally, targetRect) => !!attacker.inReach && !!ally.inReach && segmentHitsRect(attacker.centre, ally.centre, targetRect);

/** The flanking effect by the GM's setting (King Q-P6): off, -2 AC (PF2e) or advantage (5e). */
export function flankingEffect(mode) {
  if ( mode === "ac" ) return { bonus: 2, label: "Flanking (target −2 AC)" };
  if ( mode === "advantage" ) return { advantage: "Flanking" };
  return null;
}

/* ---- Crafting ---- */

export const CRAFT_RANKS = ["D", "C", "B", "A", "S"];
const RANKS = CRAFT_RANKS;

/** The crafting numbers for an item's rank (King Q-P7: editable in the settings). */
export function craftNumbers(rank, settings = {}) {
  const r = RANKS.includes(rank) ? rank : "D";
  return { dc: Number(settings[`dc${r}`]), days: Number(settings[`days${r}`]), materials: Number(settings.materials ?? 0.5) };
}

/**
 * A crafting check's outcome (PF2e): critical success (beat the DC by 10) halves the days; success
 * makes it; failure makes no progress; critical failure (miss by 10) loses half the materials.
 */
export function craftOutcome(total, dc, { price = 0, materials = 0.5, days = 1 } = {}) {
  const cost = Math.floor((Number(price) || 0) * materials);
  if ( total >= dc + 10 ) return { degree: "critical", cost, days: Math.max(1, Math.ceil(days / 2)), made: true };
  if ( total >= dc ) return { degree: "success", cost, days, made: true };
  if ( total <= dc - 10 ) return { degree: "criticalFailure", cost: Math.floor(cost / 2), days: 0, made: false };
  return { degree: "failure", cost: 0, days: 0, made: false };
}
