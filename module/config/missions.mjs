/**
 * Mission tables (PRESTD1 Part E, MISSION1). Source: the Bingo Book, "Creating Missions"
 * (Mission Rewards, Mission Tier Modifications, Rank Multipliers, encounter costs, Combat Modifiers).
 */

/** Mission Rewards: XP per player, ryo per player (range, the GM picks), downtime (fixed or dice). */
export const missionRewards = {
  D: { xp: 100, ryo: [250, 500], downtime: 4, downtimeDice: "2d4" },
  C: { xp: 250, ryo: [500, 750], downtime: 6, downtimeDice: "2d6" },
  B: { xp: 350, ryo: [750, 1500], downtime: 8, downtimeDice: "2d8" },
  A: { xp: 600, ryo: [1500, 2500], downtime: 10, downtimeDice: "2d10" },
  S: { xp: 1250, ryo: [2500, 5000], downtime: 12, downtimeDice: "2d12" }
};

/** Mission Tier Modifications (percentages round down). */
export const missionTiers = {
  trivial: { label: "Trivial", xp: -25, ryo: -25, adversaryLevel: -2, failure: 75 },
  moderate: { label: "Moderate", xp: 0, ryo: 0, adversaryLevel: 0, failure: 50 },
  extreme: { label: "Extreme", xp: 25, ryo: 25, adversaryLevel: 2, failure: 25 }
};

/** Rank Multipliers. */
export const missionRankMultiplier = { D: 1, C: 2, B: 3, A: 4, S: 5 };

/**
 * Encounter elements, bought from the mission's XP budget. `cost` is multiplied by the rank unless
 * `perRank` is false. Minions: "Minions (5xp) ... purchased in groups of 5" (the text names no
 * rank multiplier; the book's example charges ×rank: the GM can edit any line's cost).
 */
export const missionEncounters = {
  diplomatic: { group: "Social", label: "Diplomatic", cost: 5 },
  intrigue: { group: "Social", label: "Intrigue", cost: 10 },
  hostile: { group: "Social", label: "Hostile", cost: 15 },
  traps: { group: "Environmental", label: "Traps", cost: 10 },
  puzzles: { group: "Environmental", label: "Puzzles", cost: 10 },
  chase: { group: "Environmental", label: "Chase", cost: 15 },
  stealth: { group: "Environmental", label: "Stealth", cost: 15 },
  minions: { group: "Combat", label: "Minions (group of 5)", cost: 5, perRank: false },
  standard: { group: "Combat", label: "Standard", cost: 10 },
  elite: { group: "Combat", label: "Elite", cost: 25 },
  solo: { group: "Combat", label: "Solo", cost: 50 },
  ambush: { group: "Combat modifier", label: "Ambush", cost: 10 },
  objective: { group: "Combat modifier", label: "Objective", cost: 15 },
  escort: { group: "Combat modifier", label: "Escort/Defend", cost: 20 }
};

/** The rules the completion card quotes as printed (King Q-P9: verbatim). */
export const missionRuleText = {
  xp: "Players receive XP equal to the total value of all encounters purchased, split evenly among active players.",
  failure: "Failing a mission, results in a player getting only half of the original payout, downtime and XP. This is further modified based on mission tier.",
  ryo: "Ryo is paid to each active player individually, with the exact amount falling within the listed range at the GM's discretion based on client wealth and mission complexity."
};
