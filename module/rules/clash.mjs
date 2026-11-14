/**
 * Jutsu Clash (pure; CLASH1, Jiraiya's Jutsu Compendium "Clashing Jutsu"; King 2026-11-14).
 *
 *   Skill        Both sides roll the triggering jutsu's discipline skill (Ninjutsu: Ninshou;
 *                Taijutsu: Martial Arts; Genjutsu: Illusions), by the discipline it was cast as.
 *   Rank         +1 Mastery rank to your check for each rank your jutsu is higher than the other.
 *   Best of 3    When both jutsu are B-Rank or higher, three contests; two wins take the clash.
 *   Elements     The superior Release rolls at advantage (Fire > Wind > Lightning > Earth > Water > Fire).
 *   Result       Win: the loser's jutsu is dispelled and it gains 1 Concussed and is Dazed.
 *                Draw: both jutsu are dispelled; no one suffers any effects.
 */
import { defenseSkillFor } from "./cast-discipline.mjs";
import { progression } from "../config/core.mjs";
import { natureReleases } from "../config/jutsu.mjs";
import { rankValue } from "./progression.mjs";

/** The clash skill: the triggering jutsu's cast discipline's skill (ninshou / martial arts / illusions). */
export const clashSkill = (triggerDiscipline, skills) => defenseSkillFor(triggerDiscipline, skills);

/**
 * Mastery gained from the rank difference: {ranks, bonus} on top of the skill's own Mastery rank.
 * @param {string} myRank      the rank my jutsu was cast at
 * @param {string} otherRank
 * @param {number} baseMastery my Mastery rank in the clash skill
 */
export function rankMastery(myRank, otherRank, baseMastery = 0) {
  const diff = Math.max(0, rankValue(myRank) - rankValue(otherRank));
  if ( !diff ) return { ranks: 0, bonus: 0 };
  const m = progression.mastery;
  const base = Math.min(m.maxRank, Number(baseMastery) || 0);
  const total = Math.min(m.maxRank, base + diff);
  return { ranks: total - base, bonus: (m.bonusByRank[total] ?? 0) - (m.bonusByRank[base] ?? 0) };
}

/** The Nature Release a jutsu carries (by its Release keyword), or null. */
export function releaseOf(keywords = []) {
  const keys = new Set([...keywords].map(k => String(k).split(":")[0]));
  return Object.entries(natureReleases).find(([, r]) => keys.has(r.keyword))?.[0] ?? null;
}

/** Advantage from the element cycle: "mine" (I roll at advantage), "theirs" or null. */
export function elementalAdvantage(myRelease, otherRelease) {
  if ( !myRelease || !otherRelease || myRelease === otherRelease ) return null;
  if ( natureReleases[myRelease]?.beats === otherRelease ) return "mine";
  if ( natureReleases[otherRelease]?.beats === myRelease ) return "theirs";
  return null;
}

/** Contests: 3 when both jutsu are B-Rank or higher, else 1. */
export const contestCount = (rankA, rankB) => (rankValue(rankA) >= rankValue("B") && rankValue(rankB) >= rankValue("B") ? 3 : 1);

/**
 * The clash result once both sides have rolled every contest.
 * @param {number[]} a   side A's totals, in order
 * @param {number[]} b   side B's totals
 * @param {number} contests
 * @param {{autoA?: boolean, autoB?: boolean}} [auto]  features that win automatically
 * @returns {{winner: "a"|"b"|"draw"|null, wins: {a: number, b: number}}}  null while rolls are missing
 */
export function clashResult(a = [], b = [], contests = 1, { autoA = false, autoB = false } = {}) {
  if ( autoA && autoB ) return { winner: "draw", wins: { a: 0, b: 0 } };
  if ( autoA ) return { winner: "a", wins: { a: contests, b: 0 } };
  if ( autoB ) return { winner: "b", wins: { a: 0, b: contests } };
  if ( a.length < contests || b.length < contests ) return { winner: null, wins: { a: 0, b: 0 } };
  const wins = { a: 0, b: 0 };
  for ( let i = 0; i < contests; i++ ) {
    if ( a[i] > b[i] ) wins.a++;
    else if ( b[i] > a[i] ) wins.b++;
  }
  const need = contests === 3 ? 2 : 1;
  const winner = wins.a >= need && wins.a > wins.b ? "a" : wins.b >= need && wins.b > wins.a ? "b" : "draw";
  return { winner, wins };
}
