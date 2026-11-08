/**
 * Feature-driven rules (pure). Features carry their data; these read it.
 *   - Feature choices: flags.n5e.choice {label, options: {value: label}, value} (e.g. Switch Hitter's
 *     Primary casting discipline, Jack of All's Generalization).
 *   - Attacks per Attack action: Extra Attack (2; 3 with Kunai, Shuriken or Senbon), General Technique
 *     (2 with basic Shinobi implements).
 *   - Superior Assault: +1 crit range with the Primary casting discipline.
 */
const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const SHINOBI_IMPLEMENTS = /kunai|shuriken|senbon/i;

export const featureById = (actor, identifier) => list(actor.items).find(i => i.system?.identifier === identifier) ?? null;
export const choiceOf = (actor, identifier) => featureById(actor, identifier)?.flags?.n5e?.choice?.value || "";

/** Switch Hitter's Primary casting discipline (nin|gen|tai|buki), or "". */
export const primaryDiscipline = actor => choiceOf(actor, "switch-hitter");

/** Jack of All's active Generalization (warfare|seize|tactics), or "". */
export const generalization = actor => choiceOf(actor, "jack-of-all");

/** Attacks per Attack action. */
export function attacksPerAction(actor) {
  const extra = !!featureById(actor, "extra-attack");
  const general = !!featureById(actor, "general-technique");
  const base = extra ? 2 : 1;
  const implementsN = extra ? 3 : general ? 2 : 1;
  const weapons = list(actor.items).filter(i => i.type === "weapon" && i.system.equipped);
  const usingImplements = weapons.some(w => SHINOBI_IMPLEMENTS.test(w.name));
  const text = [extra ? "Extra Attack: two attacks per Attack action" : "",
    implementsN > base ? `${implementsN} with Kunai, Shuriken or Senbon${general && !extra ? " (then no Bonus Action attack with them this turn)" : ""}` : ""]
    .filter(Boolean).join("; ");
  return { base, implements: implementsN, usingImplements, text: text ? `${text}.` : "" };
}

/** Crit range added by features (merged into system.critRange). */
export function featureCritRange(actor) {
  const out = {};
  const primary = primaryDiscipline(actor);
  if ( featureById(actor, "superior-assault") && primary ) out[primary] = (out[primary] ?? 0) + 1;
  return out;
}

/** A pool recovery rule may need a feature ("requires": identifier), e.g. Focus on a Short Rest needs Tenketsu Refinement. */
export function recoveryAllowed(actor, recovery) {
  return !recovery?.requires || !!featureById(actor, recovery.requires);
}
