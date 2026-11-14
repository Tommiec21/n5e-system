/**
 * Concentration (pure; CONC1).
 *   - Incapacitated creatures can't maintain concentration (KB 05): Incapacitated, Stunned,
 *     Unconscious, Dying, Petrified (flags.incapacitated) end every concentration jutsu.
 *   - Readied jutsu (KB 03) are held through concentration: losing that concentration loses the
 *     readied jutsu and its chakra; an unreleased readied jutsu is lost at the start of the
 *     creature's next turn.
 */
const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const BREAKING = ["incapacitated", "stunned", "unconscious", "dying", "dead"];

/** Why this creature can't keep concentrating right now, or null. */
export function concentrationBreaker(actor) {
  const statuses = actor?.statuses ?? new Set();
  for ( const s of BREAKING ) if ( statuses.has?.(s) ) return s[0].toUpperCase() + s.slice(1);
  if ( actor?.system?.conditionPenalties?.flags?.incapacitated ) return "Incapacitated";
  return null;
}

/** Readied jutsu ids whose concentration has ended. */
export function lostReadied(actor) {
  const concentrating = new Set(list(actor?.system?.combat?.concentrating));
  return Object.keys(actor?.flags?.n5e?.readied ?? {}).filter(id => !concentrating.has(id));
}

/** Readied jutsu ids (excluded from upkeep: they are released or lost before the next upkeep). */
export function readiedIds(actor) {
  return Object.keys(actor?.flags?.n5e?.readied ?? {});
}
