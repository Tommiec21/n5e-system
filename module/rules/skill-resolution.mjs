/**
 * Skill-action resolution (pure; SKILL1, KB 02 and Chapter 6).
 *
 *   Contests   Both sides roll; the higher total wins; a tie leaves the situation unchanged.
 *   Passive    10 + the check's modifiers (+5 with advantage, -5 with disadvantage). The check
 *              succeeds when it meets or beats the score.
 *   Fixed      fixed:20, fixed:8+level, fixed:12+level (the target's level).
 *   Not automated: "dc:<ability>" (the book never defines a creature's ability DC: Q-S1), jutsu DCs
 *   (need the jutsu), saves, scores and tiered GM tables.
 *
 * Results that apply a status on a success (to the target), with the "beat by 10" upgrades.
 */

/** "contest:ath|acr" -> {kind: "contest", skills: ["ath", "acr"]}; "passive:prc"; "fixed:8+level"; ... */
export function parseVs(vs = "") {
  const [kind, rest = ""] = String(vs).split(":");
  if ( kind === "contest" ) return { kind, skills: rest.split("|").filter(Boolean) };
  if ( kind === "passive" ) return { kind, skill: rest };
  if ( kind === "fixed" ) return { kind, expr: rest };
  if ( kind === "dc" ) return { kind, ability: rest };
  return { kind: kind || "none", expr: rest };
}

/** Passive score: 10 + the skill total, +5 with advantage, -5 with disadvantage. */
export function passiveScore(skillTotal, mode = "normal") {
  return 10 + (Number(skillTotal) || 0) + (mode === "advantage" ? 5 : mode === "disadvantage" ? -5 : 0);
}

/** A fixed DC for this target, or null when it can't be worked out. */
export function fixedDC(expr, target = {}) {
  if ( /^\d+$/.test(expr) ) return Number(expr);
  const m = String(expr).match(/^(\d+)\+level$/);
  if ( m && Number.isFinite(Number(target.level)) ) return Number(m[1]) + Number(target.level);
  return null;
}

/** Contest result: the initiator wins on a higher total; a tie changes nothing. */
export function contestOutcome(initiator, defender) {
  const margin = (Number(initiator) || 0) - (Number(defender) || 0);
  return { result: margin > 0 ? "success" : margin < 0 ? "failure" : "tie", margin };
}

/** Check vs a DC or passive score: meets or beats succeeds. */
export function checkOutcome(total, dc) {
  const margin = (Number(total) || 0) - (Number(dc) || 0);
  return { result: margin >= 0 ? "success" : "failure", margin };
}

/**
 * What a successful skill action does to its target (statuses applied by the target's owner).
 * mastery: the initiator's Mastery rank in the skill (Grapple: Restrained when beating by 10 with 1+).
 */
export const SKILL_RESULTS = Object.freeze({
  trip: { statuses: ["prone"] },
  grapple: { statuses: ["grappled"], upgrade: { margin: 10, mastery: 1, statuses: ["restrained"], note: "Restrained instead (beat by 10 with Mastery)" } },
  pin: { statuses: ["restrained"], note: "can't speak or make hand seals" },
  takedown: { statuses: ["prone"], note: "the grapple holds" },
  choke: { statuses: ["suffocating"], note: "can't speak; 0 HP from it means Unconscious, not Dying" },
  muffle: { statuses: [], note: "can't speak until the start of your next turn" },
  disarm: { statuses: [], note: "item lands within 5 ft (10 ft if beat by 10)" },
  blendIn: { statuses: [], note: "hidden in the crowd while seen" },
  feint: { statuses: [], note: "+1d4 to your next melee attack against it this turn" }
});

/** The statuses and notes a result gives. */
export function skillActionEffects(key, { result, margin = 0, mastery = 0 } = {}) {
  if ( result !== "success" ) return { statuses: [], notes: result === "tie" ? ["Tie: nothing changes"] : [] };
  const def = SKILL_RESULTS[key];
  if ( !def ) return { statuses: [], notes: [] };
  const up = def.upgrade;
  if ( up && margin >= up.margin && mastery >= up.mastery ) return { statuses: [...up.statuses], notes: [up.note] };
  return { statuses: [...def.statuses], notes: def.note ? [def.note] : [] };
}
