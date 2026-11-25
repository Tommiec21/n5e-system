/**
 * LVL1 L6 (King 2026-11-24): when a character can level up, and what a level spends.
 *
 * Rules (config/rules.mjs, GM): `leveling` xp (default) | milestone | both, and `levelUpGate` (on by
 * default: Level Up needs the required XP, or a level the GM granted; off: players level freely).
 * XP needed is the book's per-level table (CONFIG.N5E.progression.xpToLevel; XP resets on each level and
 * the leftover carries, KB 01). A GM-granted level is `flags.n5e.levelsGranted` on the character
 * (Party Overview: Grant level). GMs can always level a character.
 */
export const LEVELING_MODES = ["xp", "milestone", "both"];

/**
 * @param {object} o
 * @param {number} o.level      current character level
 * @param {number} o.xp         current XP
 * @param {number|null} o.need  XP needed for the next level
 * @param {number} o.granted    GM-granted levels waiting
 * @param {string} [o.mode]     leveling mode
 * @param {boolean} [o.gate]    Level Up needs XP or a granted level
 * @param {boolean} [o.isGM]
 * @returns {{allowed: boolean, ready: boolean, via: "xp"|"grant"|"free"|"gm"|"", reason: string}}
 *   ready: the character has what this mode asks (XP or a granted level), so the button lights up.
 */
export function levelUpState({ level = 0, xp = 0, need = null, granted = 0, mode = "xp", gate = true, isGM = false }) {
  if ( level >= 20 ) return { allowed: false, ready: false, via: "", reason: "Already level 20." };
  const hasXp = mode !== "milestone" && need != null && xp >= need;
  const hasGrant = mode !== "xp" && granted > 0;
  const via = hasGrant ? "grant" : hasXp ? "xp" : "";
  if ( via ) return { allowed: true, ready: true, via, reason: via === "grant" ? `The GM granted ${granted} level${granted > 1 ? "s" : ""}.` : `${xp} / ${need} XP.` };
  const why = mode === "milestone" ? "Waiting for the GM to grant a level."
    : mode === "both" ? `Needs ${need ?? "?"} XP (has ${xp}) or a level from the GM.` : `Needs ${need ?? "?"} XP (has ${xp}).`;
  if ( !gate ) return { allowed: true, ready: false, via: "free", reason: `${why} The GM lets characters level freely.` };
  if ( isGM ) return { allowed: true, ready: false, via: "gm", reason: `${why} As GM you can level anyway.` };
  return { allowed: false, ready: false, via: "", reason: why };
}

/** The update a level spends: XP (leftover carries) or one granted level; nothing when leveled freely. */
export function levelUpCost(state, { xp = 0, need = 0, granted = 0 } = {}) {
  if ( state.via === "xp" ) return { "system.details.xp": Math.max(0, xp - (need ?? 0)) };
  if ( state.via === "grant" ) return { "flags.n5e.levelsGranted": Math.max(0, granted - 1) };
  return {};
}

/** The level-up state for an actor, reading the rules (Foundry side). */
export function actorLevelState(actor, { rule, isGM = false } = {}) {
  const sys = actor.system ?? {};
  return levelUpState({ level: sys.level ?? 0, xp: sys.details?.xp ?? 0, need: sys.details?.xpNext ?? null,
    granted: actor.flags?.n5e?.levelsGranted ?? 0, mode: rule?.("leveling") ?? "xp", gate: rule?.("levelUpGate") ?? true, isGM });
}
