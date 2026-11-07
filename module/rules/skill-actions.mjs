/**
 * Skill-action attempt penalty (Core Ch6; King 2026-11-07: penalties don't stack).
 */
import { skillActionTiers } from "../config/character.mjs";

/**
 * @param {"np"|"p"|"m"|"kit"} tier
 * @param {{proficient: boolean, masteryRank: number}} actor
 * @returns {number} 0, -3, or -5
 */
export function skillActionPenalty(tier, { proficient, masteryRank }) {
  const t = skillActionTiers[tier];
  if ( !t ) return 0;
  const penalties = [];
  if ( !proficient && t.noProficiencyPenalty ) penalties.push(t.noProficiencyPenalty);
  if ( !(masteryRank > 0) && t.noMasteryPenalty ) penalties.push(t.noMasteryPenalty);
  return penalties.length ? Math.min(...penalties) : 0;
}
