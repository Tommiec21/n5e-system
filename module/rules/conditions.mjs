/**
 * Condition rank penalties -> one aggregate object the derived-data pipeline applies (step 7).
 * Source: KB 05. Per-rank numbers live in config/conditions.mjs.
 */
import { conditions as coreConditions } from "../config/conditions.mjs";

/** Empty aggregate. */
export function emptyPenalties() {
  return {
    allDice: 0, ac: 0, saveDC: 0, d20Physical: 0, d20Mental: 0, checksAndAttacks: 0,
    damageTaken: 0, damageDealt: 0, perception: 0, dr: 0,
    baseCost: { nin: 0, gen: 0, tai: 0, buki: 0 },
    flags: {},
    /** Per-key contributions for breakdown tooltips: {ac: [{label: "Exhaustion 3", value: -3}], ...}. */
    sources: {}
  };
}

/** Clamp ranks to the condition's max (unranked conditions count as 1). */
export function clampRanks(def, ranks) {
  if ( !def ) return 0;
  if ( def.maxRanks == null ) return ranks > 0 ? 1 : 0;
  return Math.max(0, Math.min(def.maxRanks, Math.floor(ranks)));
}

/**
 * @param {Array<{key: string, ranks: number, sourceRank?: string}>} active
 * @param {object} [registry]  condition registry (core + clan conditions)
 */
export function aggregatePenalties(active, registry = coreConditions) {
  const out = emptyPenalties();
  for ( const { key, ranks, sourceRank } of active ) {
    const def = registry[key];
    if ( !def ) continue;
    const r = clampRanks(def, ranks);
    if ( !r ) continue;
    const label = def.maxRanks == null ? def.label : `${def.label} ${r}`;
    const note = (k, value) => { if ( value ) (out.sources[k] ??= []).push({ label, value }); };
    for ( const [k, v] of Object.entries(def.perRank ?? {}) ) {
      if ( typeof v === "object" ) {
        for ( const [d, n] of Object.entries(v) ) {
          out[k][d] = (out[k][d] ?? 0) + n * r;
          note(`${k}.${d}`, n * r);
        }
      } else {
        out[k] = (out[k] ?? 0) + v * r;
        note(k, v * r);
      }
    }
    for ( const [k, v] of Object.entries(def.flat ?? {}) ) {
      out[k] = (out[k] ?? 0) + v;
      note(k, v);
    }
    if ( def.drBySourceRank && sourceRank ) {
      const v = def.drBySourceRank[sourceRank] ?? 0;
      out.dr += v;
      note("dr", v);
    }
    for ( const [k, v] of Object.entries(def.flags ?? {}) ) out.flags[k] = v;
    out.flags[`has.${key}`] = r;
  }
  return out;
}
