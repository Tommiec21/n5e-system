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

/** The owned item with this identifier (class features are matched by identifier, not name). */
export const featureById = (actor, identifier) => list(actor.items).find(i => i.system?.identifier === identifier) ?? null;
/** A feature's chosen value (flags.n5e.choice.value, set with the Features tab picker), or "". */
export const choiceOf = (actor, identifier) => featureById(actor, identifier)?.flags?.n5e?.choice?.value || "";

/** Switch Hitter's Primary casting discipline (nin|gen|tai|buki), or "". */
export const primaryDiscipline = actor => choiceOf(actor, "switch-hitter");

/** Jack of All's active Generalization (warfare|seize|tactics), or "". */
export const generalization = actor => choiceOf(actor, "jack-of-all");

/** Attacks per Attack action. */
export function attacksPerAction(actor) {
  const extra = !!featureById(actor, "extra-attack");
  // Only Scout-Nin's Extra Attack gives a third attack with Kunai, Shuriken or Senbon.
  const scoutExtra = list(actor.items).some(i => i.system?.identifier === "extra-attack" && i.system?.requirement?.class === "scout-nin");
  const general = !!featureById(actor, "general-technique");
  const base = extra ? 2 : 1;
  const implementsN = scoutExtra ? 3 : general ? Math.max(base, 2) : base;
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

/**
 * The discipline whose save DC a class feature's save uses: the one its text names ("vs your
 * Genjutsu save DC"), else its class's main discipline, else Taijutsu.
 */
const CLASS_DISCIPLINE = { "genjutsu-specialist": "gen", "ninjutsu-specialist": "nin", "medical-nin": "nin",
  "hunter-nin": "tai", "scout-nin": "tai", "taijutsu-specialist": "tai", "weapon-specialist": "tai" };
export function featureDiscipline(item) {
  const text = String(item.system?.description ?? "");
  const m = text.match(/\b(Ninjutsu|Genjutsu|Taijutsu|Bukijutsu)\s+save\s+DC/i);
  if ( m ) return { ninjutsu: "nin", genjutsu: "gen", taijutsu: "tai", bukijutsu: "tai" }[m[1].toLowerCase()];
  return CLASS_DISCIPLINE[item.system?.requirement?.class] ?? "tai";
}
