/**
 * Social encounters (PRESTD1 Part F; the Bingo Book). Pure: setup, the Argument Results table, the
 * type risks, and the resolution. Points: PoA positive, PoF negative; the score is PoA − PoF.
 */
import { socialAttitudes, socialActions } from "../config/social.mjs";

/** Starting points and Patience from the attitude. */
export function socialSetup(attitude) {
  const a = socialAttitudes[attitude] ?? socialAttitudes.indifferent;
  return { poa: Math.max(0, a.start), pof: Math.max(0, -a.start), patience: a.patience };
}

/** A Standard DC (King Q-P10): the statistic + 10. */
export const standardDC = total => (Number(total) || 0) + 10;

/** Argument Results: margin = total − DC. */
export function argumentResult(margin) {
  const m = Number(margin) || 0;
  if ( m >= 10 ) return { poa: 2, pof: 0, reveal: true, newPitfall: false, success: true };
  if ( m >= 5 ) return { poa: 2, pof: 0, reveal: false, newPitfall: false, success: true };
  if ( m >= 0 ) return { poa: 1, pof: 0, reveal: false, newPitfall: false, success: true };
  if ( m <= -5 ) return { poa: 0, pof: 2, reveal: false, newPitfall: true, success: false };
  return { poa: 0, pof: 1, reveal: false, newPitfall: false, success: false };
}

/**
 * A Primary Argument's points. Motivation: +2 to the check (already rolled) and +1 PoA on a success.
 * A Pitfall triggered this round: a secret −4 to the check. Coerce in a Diplomatic encounter: +1 PoF
 * whatever the result.
 */
export function primaryPoints({ margin, motivation = false, pitfall = false, action, type }) {
  const r = argumentResult((Number(margin) || 0) - (pitfall ? 4 : 0));
  let { poa, pof } = r;
  if ( motivation && r.success ) poa += 1;
  if ( action === "coerce" && type === "diplomatic" ) pof += 1;
  return { ...r, poa, pof };
}

export const socialScore = s => (Number(s.poa) || 0) - (Number(s.pof) || 0);

/** Social Encounter Resolution. */
export function socialOutcome(score) {
  if ( score >= 5 ) return "critical";
  if ( score >= 0 ) return "success";
  if ( score >= -4 ) return "failure";
  return "criticalFailure";
}

/** Which statistic sets the DC for an action, and the DC from the NPC's totals. */
export function actionDC(key, npc = {}) {
  const ref = socialActions[key]?.dc;
  if ( !ref || ref === "gm" ) return null;
  const [group, id] = ref.split(".");
  const total = group === "save" ? npc.saves?.[id]?.total : npc.skills?.[id]?.total;
  return total == null ? null : standardDC(total);
}

/** Patience: is the encounter over after this round? */
export const patienceSpent = s => (Number(s.round) || 1) > (Number(s.patience) || 0);
