/**
 * Reading and countering jutsu (pure; FIN2b, Shinobi Handbook Ch3 and Ch5; KB 02 and 08).
 *
 *   Read the Enemy   Reaction on seeing a jutsu cast: the cast discipline's skill vs the caster's
 *                    save DC for that discipline. Success: name, rank and targets, then one benefit
 *                    for the reader or an ally: +1 to saves and AC against it, or the discipline's
 *                    option (Genjutsu: close your eyes; Taijutsu: interpose; Ninjutsu: move 10 ft).
 *   Identify         Action: the same skill vs the jutsu's save DC + 5. Success: name, rank, effects.
 *   Suppress Chakra  The Chakra Control result is the Suppression Score, 10 minutes; each
 *                    consecutive reattempt is reduced by 2 more; ends on spending chakra.
 *   Tags             Effects whose flags.n5e.state is "counterTag:<rank>" or "suppressionTag:<rank>".
 *                    Counter Tag: absorbs the next jutsu of its rank or lower that targets only the
 *                    tagged creature (not an area or several targets), then burns out.
 *                    Chakra Suppression Tag: no Ninjutsu or Genjutsu below the tag's rank.
 */
import { rankOrder } from "../config/core.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const norm = d => (d === "buki" ? "tai" : d);
const rankIndex = r => rankOrder.indexOf(String(r ?? "").toUpperCase());

export const READ_ACTIONS = Object.freeze({ nin: "readEnemyNin", tai: "readEnemyTai", gen: "readEnemyGen" });
export const IDENTIFY_ACTIONS = Object.freeze({ nin: "identifyNinjutsu", tai: "identifyTaijutsu", gen: "identifyGenjutsu" });

/** The skill action for reading or identifying a jutsu cast as this discipline. */
export const defenseAction = (kind, discipline) => (kind === "identify" ? IDENTIFY_ACTIONS : READ_ACTIONS)[norm(discipline)] ?? null;

/** Identify: the jutsu's save DC + 5. */
export const identifyDC = dc => (Number(dc) || 0) + 5;

/** Changes of the "+1 to saves and AC" benefit. */
export const READ_BONUS_CHANGES = Object.freeze([{ key: "system.bonuses.ac", mode: 2, value: "1" }, { key: "system.bonuses.save", mode: 2, value: "1" }]);

/** The two benefits a successful Read the Enemy offers, by cast discipline. */
export function readEnemyChoices(discipline) {
  const option = {
    gen: { key: "option", label: "Close your eyes", status: "blinded", note: "closes its eyes (Blinded until it chooses to open them)" },
    tai: { key: "option", label: "Interpose", note: "may interpose itself: the attack targets it instead of an ally within 20 ft" },
    nin: { key: "option", label: "Move up to 10 ft", note: "may move up to 10 ft" }
  }[norm(discipline)];
  return [{ key: "bonus", label: "+1 to saves and AC against it", changes: READ_BONUS_CHANGES, note: "gains +1 to saves and AC against it" }, ...(option ? [option] : [])];
}

/** Suppress Chakra: the score after the penalty for consecutive reattempts (2 each). */
export const suppressionScore = (total, reattempts = 0) => (Number(total) || 0) - 2 * Math.max(0, Number(reattempts) || 0);

/** Tags of one kind on a creature: [{effect, rank}] from flags.n5e.state "<kind>:<rank>". */
export function tagsOn(actor, kind) {
  return list(actor?.effects).filter(e => !e.disabled && String(e.flags?.n5e?.state ?? "").startsWith(`${kind}:`))
    .map(effect => ({ effect, rank: String(effect.flags.n5e.state).split(":")[1] })).filter(t => rankIndex(t.rank) >= 0);
}

/** Chakra Suppression Tag: is a Ninjutsu or Genjutsu cast at this rank blocked? */
export function suppressionBlocks({ tagRank, castRank, ninOrGen = true } = {}) {
  return !!ninOrGen && rankIndex(tagRank) >= 0 && rankIndex(castRank) >= 0 && rankIndex(castRank) < rankIndex(tagRank);
}

/** Counter Tag: does it absorb this cast? Only a jutsu aimed at the tagged creature alone. */
export function counterTagAbsorbs({ tagRank, castRank, targetCount = 1, area = false } = {}) {
  return !area && targetCount === 1 && rankIndex(tagRank) >= 0 && rankIndex(castRank) >= 0 && rankIndex(castRank) <= rankIndex(tagRank);
}
