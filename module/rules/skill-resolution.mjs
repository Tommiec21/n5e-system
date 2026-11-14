/**
 * Skill-action resolution (pure; SKILL1, KB 02 and Chapter 6).
 *
 *   Contests   Both sides roll; the higher total wins; a tie leaves the situation unchanged.
 *   Passive    10 + the check's modifiers (+5 with advantage, -5 with disadvantage). The check
 *              succeeds when it meets or beats the score.
 *   Fixed      fixed:20, fixed:8+level, fixed:12+level (the target's level).
 *   Standard DC  "dc:<ability>": the target's named statistic + 10 (Shinobi Handbook Ch6, King
 *              2026-11-14): Strength DC = the Strength check bonus + 10 (SKILL1b).
 *   Not automated: jutsu DCs (need the jutsu), saves, scores and tiered GM tables.
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

/** Standard DC (Chapter 6): the named statistic or bonus + 10. */
export const standardDC = statBonus => 10 + (Number(statBonus) || 0);

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
  shove: { statuses: [], note: "push 5 ft (10 ft if beat by 10); proficient: push Str mod x 5 ft (min 5)",
    upgrade: { margin: 10, proficient: true, statuses: ["prone"], note: "pushed (10 ft, or Str mod x 5 ft if proficient) and Prone (proficient, beat by 10)" } },
  makeImpression: { statuses: [], note: "agrees, but expects something in return (asks nothing if beat by 10)" },
  grapple: { statuses: ["grappled"], upgrade: { margin: 10, mastery: 1, statuses: ["restrained"], note: "Restrained instead (beat by 10 with Mastery)" } },
  pin: { statuses: ["restrained"], note: "can't speak or make hand seals" },
  takedown: { statuses: ["prone"], note: "the grapple holds" },
  choke: { statuses: ["suffocating"], note: "can't speak; 0 HP from it means Unconscious, not Dying" },
  muffle: { statuses: [], note: "can't speak until the start of your next turn" },
  disarm: { statuses: [], note: "item lands within 5 ft (10 ft if beat by 10)" },
  escape: { statuses: [], release: true, note: "the hold ends" },
  escapeAcrobatics: { statuses: [], release: true, note: "the hold ends" },
  blendIn: { statuses: [], note: "hidden in the crowd while seen" },
  feint: { statuses: [], note: "+1d4 to your next melee attack against it this turn" }
});

/** The statuses and notes a result gives. */
export function skillActionEffects(key, { result, margin = 0, mastery = 0, proficient = false } = {}) {
  if ( result !== "success" ) return { statuses: [], notes: result === "tie" ? ["Tie: nothing changes"] : [] };
  const def = SKILL_RESULTS[key];
  if ( !def ) return { statuses: [], notes: [] };
  const up = def.upgrade;
  if ( up && margin >= up.margin && mastery >= (up.mastery ?? 0) && (!up.proficient || proficient) ) return { statuses: [...up.statuses], notes: [up.note] };
  return { statuses: [...def.statuses], notes: def.note ? [def.note] : [] };
}

/* ---- FIN2a: sizes, holds, weapon Disarm and Trip (King 2026-11-14) ---- */

export const SIZE_ORDER = Object.freeze(["tiny", "small", "medium", "large", "huge", "gargantuan"]);
/** Actions the book gives the size rule for (Ch3: Trip). */
export const SIZE_GATED = Object.freeze(["trip"]);
/** Actions that start or tighten a hold, and those usable only on a creature you hold. */
export const HOLD_ACTIONS = Object.freeze(["grapple", "pin"]);
export const REQUIRES_HOLD = Object.freeze(["pin", "takedown", "choke", "muffle"]);
export const ESCAPE_ACTIONS = Object.freeze(["escape", "escapeAcrobatics"]);
/** Weapon properties that replace one attack with a skill action (Ch5). */
export const WEAPON_SKILL_ACTIONS = Object.freeze({ disarm: ["disarm", "grapple"], trip: ["trip", "shove"] });

/** normal | disadvantage (target 1 size larger) | impossible (2 or more larger). */
export function sizeGate(attackerSize, targetSize) {
  const a = SIZE_ORDER.indexOf(attackerSize), t = SIZE_ORDER.indexOf(targetSize);
  if ( a < 0 || t < 0 ) return "normal";
  return t - a >= 2 ? "impossible" : t - a === 1 ? "disadvantage" : "normal";
}

/**
 * May this skill action be attempted, and with what?
 * @param {string} key
 * @param {object} f
 * @param {string} f.actorSize, f.targetSize
 * @param {boolean} f.holding            the actor holds the target
 * @param {{by: string|null, restrained: boolean}} f.held   the actor's own hold (for Escape)
 * @returns {{refuse: string|null, disadvantage: string[]}}
 */
export function skillActionGate(key, { actorSize, targetSize, holding = false, held = { by: null, restrained: false } } = {}) {
  const out = { refuse: null, disadvantage: [] };
  if ( SIZE_GATED.includes(key) ) {
    const gate = sizeGate(actorSize, targetSize);
    if ( gate === "impossible" ) out.refuse = "The target is two or more sizes larger.";
    else if ( gate === "disadvantage" ) out.disadvantage.push("Target one size larger");
  }
  if ( REQUIRES_HOLD.includes(key) && !holding ) out.refuse = "You must be grappling the target.";
  if ( ESCAPE_ACTIONS.includes(key) ) {
    if ( !held.by ) out.refuse = "You aren't being held.";
    else if ( held.restrained ) out.disadvantage.push("Restrained by the hold");
  }
  return out;
}

/** A hold ends when holder and held are more than 5 ft apart (edge to edge). */
export const holdBroken = gapFeet => Number(gapFeet) > 5;
