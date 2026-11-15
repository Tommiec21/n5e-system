/**
 * Advantage / disadvantage sources (pure; ADV1). dnd5e AdvantageModeField pattern: every source is
 * counted; any advantage and any disadvantage cancel; never more than one extra d20 (KB 01).
 * Which conditions and states give which sources is data (STD3): config/conditions.mjs `rules`,
 * read by rules/condition-elements.mjs.
 */

import { conditionRoll } from "./condition-elements.mjs";

/**
 * Advantage, disadvantage and automatic failure from conditions and states (STD3: read from each
 * entry's rule elements in config/conditions.mjs; nothing named here).
 * @returns {{advantage: string[], disadvantage: string[], autoFail: string|null, consume: string[]}}
 */
export function advantageSources({ roller, target = null, kind, ability = null, ranged = false }) {
  return conditionRoll({ roller, target, kind, ability, ranged });
}

/**
 * Final mode from counted sources plus the click/forced mode (which counts as one source).
 * @param {{advantage: string[], disadvantage: string[]}} sources
 * @param {"normal"|"advantage"|"disadvantage"} [base]
 */
export function resolveMode(sources, base = "normal") {
  const a = sources.advantage.length + (base === "advantage" ? 1 : 0);
  const d = sources.disadvantage.length + (base === "disadvantage" ? 1 : 0);
  if ( a && d ) return "normal";
  if ( a ) return "advantage";
  if ( d ) return "disadvantage";
  return "normal";
}

/** Short note for the card: "Advantage: Target Prone · Disadvantage: Staggered (cancel)". */
export function sourcesNote(sources) {
  const parts = [];
  if ( sources.advantage.length ) parts.push(`Advantage: ${sources.advantage.join(", ")}`);
  if ( sources.disadvantage.length ) parts.push(`Disadvantage: ${sources.disadvantage.join(", ")}`);
  if ( sources.advantage.length && sources.disadvantage.length ) parts.push("they cancel");
  return parts.join(" · ");
}
