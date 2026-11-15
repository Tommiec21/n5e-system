/**
 * Mission budgets and payouts (PRESTD1 Part E; King Q-P9: the Bingo Book's Mission XP rules,
 * verbatim, no per-player XP logic of our own). Percentages always round down.
 */
import { missionRewards, missionTiers, missionRankMultiplier, missionEncounters } from "../config/missions.mjs";

const RANKS = Object.keys(missionRewards);
const pct = (value, percent) => Math.floor(value * (100 + percent) / 100);
const share = (value, percent) => Math.floor(value * percent / 100);

/** The mission's numbers for a rank, a tier and the number of active players. */
export function missionNumbers(rank, tier, players) {
  const r = missionRewards[RANKS.includes(rank) ? rank : "D"];
  const t = missionTiers[tier] ?? missionTiers.moderate;
  const n = Math.max(0, Math.floor(Number(players) || 0));
  const xpPerPlayer = pct(r.xp, t.xp);
  return { xpPerPlayer, budget: xpPerPlayer * n, players: n, ryo: r.ryo.map(v => pct(v, t.ryo)),
    downtime: r.downtime, downtimeDice: r.downtimeDice, multiplier: missionRankMultiplier[rank] ?? 1,
    adversaryLevel: t.adversaryLevel, failure: t.failure };
}

/** One encounter element's cost at this rank. */
export function encounterCost(key, rank) {
  const e = missionEncounters[key];
  if ( !e ) return 0;
  return e.perRank === false ? e.cost : e.cost * (missionRankMultiplier[rank] ?? 1);
}

/** Total of the purchased lines ({key, count, cost}); a line's own cost wins over the table. */
export function spentOf(lines, rank) {
  return (lines ?? []).reduce((sum, l) => sum + Math.max(0, Number(l.count) || 0) * (l.cost != null && l.cost !== "" ? Number(l.cost) || 0 : encounterCost(l.key, rank)), 0);
}

/**
 * What each active player receives. Success: XP = total purchased split evenly; ryo as set; downtime
 * as the rank gives. Failure: the tier's failure payout of each (Trivial 75%, Moderate 50%, Extreme 25%).
 */
export function missionPayout({ spent, players, ryo, downtime, success, tier }) {
  const n = Math.max(1, Math.floor(Number(players) || 0));
  const xp = Math.floor((Number(spent) || 0) / n);
  const base = { xp, ryo: Math.max(0, Math.floor(Number(ryo) || 0)), downtime: Math.max(0, Math.floor(Number(downtime) || 0)) };
  if ( success ) return { ...base, percent: 100 };
  const percent = (missionTiers[tier] ?? missionTiers.moderate).failure;
  return { xp: share(base.xp, percent), ryo: share(base.ryo, percent), downtime: share(base.downtime, percent), percent };
}
