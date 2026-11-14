/**
 * Multi-discipline jutsu (pure; MDISC1, King 2026-11-13, N5e-Context.md decisions 11, 14 and 15).
 *
 *   Casting      A jutsu that lists several disciplines is cast as one of them. Its attack, DC and
 *                ability requirement use that discipline. A concentration jutsu keeps the discipline
 *                it was cast as for its whole duration: flags.n5e.castDiscipline.<itemId>.
 *   Known lists  It counts as every listed discipline for known-list requirements, swaps "of the same
 *                type", prerequisites and learning limits. A Bukijutsu counts as Taijutsu and as
 *                Bukijutsu.
 *   Defenses     Identify, Read the Enemy and Clash use the cast discipline's skill. Stimuli
 *                immunity and Genjutsu psychic damage ignoring DR apply only when cast as Genjutsu.
 *                Chakra Suppression and Counter Tags catch it by any listed discipline.
 */

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const norm = d => (d === "buki" ? "tai" : d);

/** Every discipline the jutsu can be cast as (nin | tai | gen), default first. */
export function castableDisciplines(item) {
  const s = item?.system ?? {};
  const main = norm(s.discipline || "nin");
  return [...new Set([main, ...list(s.disciplines).map(norm)])].filter(Boolean);
}

/** The jutsu's default cast discipline. */
export const defaultCastDiscipline = item => castableDisciplines(item)[0];

/**
 * The discipline this jutsu is cast as right now: the one it is locked to while the actor
 * concentrates on it, else its default.
 */
export function castDisciplineOf(actor, item) {
  const locked = actor?.flags?.n5e?.castDiscipline?.[item?.id];
  const concentrating = list(actor?.system?.combat?.concentrating).includes(item?.id);
  if ( locked && concentrating && castableDisciplines(item).includes(locked) ) return locked;
  return defaultCastDiscipline(item);
}

/**
 * Check a cast-discipline choice. Returns the discipline to use, or throws a readable error.
 * While concentrating on the jutsu, only its locked discipline is allowed.
 */
export function resolveCastDiscipline(actor, item, requested = "") {
  const allowed = castableDisciplines(item);
  const locked = castDisciplineOf(actor, item);
  const concentrating = list(actor?.system?.combat?.concentrating).includes(item?.id) && !!actor?.flags?.n5e?.castDiscipline?.[item?.id];
  const want = norm(requested) || locked;
  if ( !allowed.includes(want) ) throw new Error(`${item?.name ?? "This jutsu"} can't be cast as ${want}.`);
  if ( concentrating && want !== locked ) throw new Error(`${item?.name ?? "This jutsu"} stays ${locked} while you concentrate on it.`);
  return want;
}

/** Known-list checks: true when the jutsu counts as this discipline (any listed one; buki = tai + keyword). */
export function countsAsDiscipline(item, discipline) {
  const s = item?.system ?? {};
  if ( discipline === "buki" ) return s.discipline === "buki" || list(s.keywords).some(k => String(k).split(":")[0] === "bukijutsu");
  return castableDisciplines(item).includes(norm(discipline));
}

/**
 * Known-list requirement ("a Ninjutsu or Genjutsu with the Sensory keyword on your known list"):
 * does the actor know a jutsu that counts as any of these disciplines and has the keyword?
 * @param {object} actor
 * @param {{disciplines?: string[], keyword?: string}} need
 */
export function knowsJutsuOf(actor, { disciplines = [], keyword = "" } = {}) {
  return list(actor?.items).some(i => i.type === "jutsu"
    && (!disciplines.length || disciplines.some(d => countsAsDiscipline(i, d)))
    && (!keyword || list(i.system?.keywords).some(k => String(k).split(":")[0] === keyword)));
}

/** Level-up swaps "of the same type": the new jutsu shares at least one discipline with the old one. */
export function sameTypeForSwap(oldItem, newItem) {
  const a = castableDisciplines(oldItem);
  return castableDisciplines(newItem).some(d => a.includes(d));
}

/** Learning limits: learnable when any one listed discipline is allowed (empty allowed list: no limit). */
export function disciplineAllowed(item, allowed = []) {
  if ( !allowed?.length ) return true;
  return allowed.some(d => countsAsDiscipline(item, d));
}

/** Identify, Read the Enemy and Clash: the skill for the cast discipline (skills with a matching clash key). */
export function defenseSkillFor(discipline, skills = globalThis.CONFIG?.N5E?.skills ?? {}) {
  const d = norm(discipline);
  return Object.entries(skills).find(([, s]) => s.clash === d)?.[0] ?? null;
}

/** Stimuli immunity and Genjutsu psychic damage ignoring DR: only when cast as Genjutsu. */
export const genjutsuRidersApply = castDiscipline => norm(castDiscipline) === "gen";

/** Chakra Suppression and Counter Tags: caught when any listed discipline is one they target. */
export function caughtBy(item, targets = []) {
  return targets.some(d => countsAsDiscipline(item, d));
}
