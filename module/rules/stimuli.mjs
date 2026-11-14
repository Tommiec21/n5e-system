/**
 * Genjutsu Stimuli immunity (pure; GEN1, KB 04, KB 10; King 2026-11-14).
 *
 *   A creature is immune to a Genjutsu only when it is immune to ALL of the jutsu's Stimuli:
 *     Visual    Blinded, or True Sight
 *     Auditory  Deafened
 *     Inhaled   immune to Envenomed
 *     Tactile   immune to psychic damage
 *   Only when the jutsu is cast as Genjutsu (MDISC1 decision 15). A jutsu with no Stimuli is never
 *   immune by this rule.
 */
import { stimuli as STIMULI } from "../config/jutsu.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const SOURCE_LABELS = {
  condition: s => s.charAt(0).toUpperCase() + s.slice(1),
  sense: s => ({ trueSight: "True Sight" }[s] ?? s),
  conditionImmune: s => `immune to ${s}`,
  damageImmune: s => `immune to ${s} damage`
};

/** The facts stimuli immunity reads, from an actor (statuses, senses, condition and damage immunities). */
export function creatureFacts(actor) {
  const t = actor?.system?.traits ?? {};
  return {
    statuses: actor?.statuses ?? new Set(),
    senses: t.senses ?? {},
    conditionImmune: new Set(list(t.conditionImmune)),
    damageImmune: new Set(list(t.immune))
  };
}

/** The reason a creature is immune to one Stimulus ("Blinded"), or null. */
export function immuneToStimulus(stimulus, facts = {}) {
  for ( const via of STIMULI[stimulus]?.immuneVia ?? [] ) {
    const [kind, key] = via.split(":");
    const ok = kind === "condition" ? facts.statuses?.has?.(key)
      : kind === "sense" ? (Number(facts.senses?.[key]) || 0) > 0
        : kind === "conditionImmune" ? facts.conditionImmune?.has?.(key)
          : kind === "damageImmune" ? facts.damageImmune?.has?.(key) : false;
    if ( ok ) return SOURCE_LABELS[kind]?.(key) ?? key;
  }
  return null;
}

/**
 * @param {Iterable<string>} jutsuStimuli
 * @param {object} facts   creatureFacts(...)
 * @returns {{immune: boolean, reasons: string[]}}  reasons like "Blinded (Visual)"
 */
export function genjutsuImmunity(jutsuStimuli, facts) {
  const keys = list(jutsuStimuli).filter(k => STIMULI[k]);
  if ( !keys.length ) return { immune: false, reasons: [] };
  const reasons = [];
  for ( const k of keys ) {
    const why = immuneToStimulus(k, facts);
    if ( !why ) return { immune: false, reasons: [] };
    reasons.push(`${why} (${STIMULI[k].label})`);
  }
  return { immune: true, reasons };
}
