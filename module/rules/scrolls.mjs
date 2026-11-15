/**
 * PRESTD1 Part B: jutsu scrolls (King 2026-11-15, Q-P3, Q-P4, Q-P11). Pure.
 *
 *   Ninjutsu and Genjutsu only (no Taijutsu or Bukijutsu scrolls).
 *   Casting: no chakra; anyone may try, with a Ninshou (Ninjutsu) or Illusions (Genjutsu) check against
 *   the rank's identify DC; the skill's tier limits the rank (non-proficient D-Rank or lower,
 *   proficient B-Rank or lower, Mastery any). The jutsu resolves with the scroll's own numbers.
 *   Identify: only the matching skill, against the identify DC.
 */
import { dcTables, rankOrder } from "../config/core.mjs";

const jutsuScroll = dcTables.jutsuScroll;
const jutsuScrollSkills = dcTables.jutsuScrollSkills;

const TIER_MAX = { np: "D", proficient: "B", mastery: "S" };

/** The discipline a jutsu goes onto a scroll as, or null (not Ninjutsu or Genjutsu). */
export function scrollDiscipline(jutsu) {
  const list = [jutsu?.discipline, ...(jutsu?.disciplines ?? [])].filter(Boolean);
  return list.find(d => d === "nin") ?? list.find(d => d === "gen") ?? null;
}

/** The skill that casts and identifies a scroll of this discipline. */
export const scrollSkill = discipline => jutsuScrollSkills[discipline] ?? null;

/** The scroll's own numbers by rank: identify DC (also the casting DC, Q-P11), save DC, attack. */
export function scrollNumbers(rank) {
  const n = jutsuScroll[rank] ?? jutsuScroll.D;
  return { identify: n.identify, castDC: n.identify, dc: n.save, attack: n.attack };
}

/** The skill tier a creature has: np, proficient or mastery. */
export const skillTier = ({ proficient = false, mastery = 0 } = {}) => (mastery > 0 ? "mastery" : proficient ? "proficient" : "np");

/** May this tier cast a scroll of this rank? */
export function tierAllows(tier, rank) {
  const max = TIER_MAX[tier] ?? "D";
  return rankOrder.indexOf(rank) <= rankOrder.indexOf(max);
}

/** The highest rank a tier may cast (for messages). */
export const tierMaxRank = tier => TIER_MAX[tier] ?? "D";

/** The name a scroll shows: its jutsu once identified, else "Unidentified scroll (C-Rank)". */
export const scrollName = ({ identified, jutsuName, rank }) => (identified ? `Scroll: ${jutsuName}` : `Unidentified scroll (${rank}-Rank)`);
