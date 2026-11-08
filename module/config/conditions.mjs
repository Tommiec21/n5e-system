/**
 * Conditions and States. Source: KB 05 (core book structure) + the three Jutsu Compendium additions
 * King ruled canon on 2026-11-06 (Staggered dispel, Slowed component limit, Invisible).
 *
 * A condition entry:
 *   tags        categories (Fatigue, Elemental, Physical, Mental, Sensory)
 *   maxRanks    null = unranked (on/off)
 *   persists    [Persists]: no default 1-minute expiry
 *   decay       {when: "turnEnd"|"longRest", amount}  automatic rank loss
 *   endsAt      "nextTurnEnd" when the condition ends at the end of the creature's next turn
 *   perRank     numeric penalties multiplied by ranks (read by rules/conditions.mjs)
 *   flat        numeric penalties applied once while present
 *   flags       rule switches the engine checks (noHealing, maxComponents...)
 *   removal     how it can be removed (data for Phase 4 automation)
 *   group       "compelled" for the three Compelled conditions
 *   icon        token status icon
 */
export const conditionTags = {
  fatigue: "Fatigue", elemental: "Elemental", physical: "Physical", mental: "Mental", sensory: "Sensory"
};

/** Default duration when neither the source nor the condition says otherwise (KB 05). */
export const defaultConditionDuration = { value: 1, unit: "minute" };

export const conditions = {
  exhaustion: {
    label: "Exhaustion", tags: ["fatigue"], maxRanks: 11, persists: true, icon: "icons/svg/degen.svg",
    perRank: { allDice: -1, ac: -1, saveDC: -1 },
    flags: { deathAbove: 10 },
    decay: { when: "longRest", amount: 2, requires: "food and drink" },
    removal: [{ text: "Removal effects remove 1 rank unless stated." }]
  },
  envenomed: {
    label: "Envenomed", tags: ["elemental"], maxRanks: 5, persists: true, icon: "icons/svg/poison.svg",
    perRank: { ac: -1 }, flags: { noHealing: true, noRestBenefits: true }, immunityFrom: ["damage:poison"]
  },
  burned: {
    label: "Burned", tags: ["elemental"], maxRanks: 5, icon: "icons/svg/fire.svg", affliction: "fire",
    turnStartDamage: { die: "1d8", type: "fire", perRank: true },
    removal: [{ action: "action", check: ["dex", "con"], dc: 15, ranks: "all" }, { text: "Full submersion ends it." }]
  },
  chilled: {
    label: "Chilled", tags: ["elemental"], maxRanks: 5, icon: "icons/svg/frozen.svg", affliction: "cold",
    moveDamage: { die: "1d10", type: "cold", perRank: true, thresholdFeet: 5, oncePerTurn: true },
    removal: [{ action: "action", check: ["dex", "con"], dc: 15, ranks: "all" }]
  },
  corroded: {
    label: "Corroded", tags: ["elemental"], maxRanks: null, icon: "icons/svg/acid.svg", affliction: "acid",
    /** DR reduction set by the inflicting jutsu's rank, not by ranks. */
    drBySourceRank: { D: -2, C: -4, B: -6, A: -8, S: -10 },
    removal: [{ action: "action", check: ["dex", "con"], dc: 15, ranks: "all" }, { text: "Submersion ends it." }]
  },
  shocked: {
    label: "Shocked", tags: ["elemental"], maxRanks: 5, icon: "icons/svg/lightning.svg", affliction: "lightning",
    flags: { maxAttackOrJutsuPerTurn: 1 }, decay: { when: "turnEnd", amount: 1 }
  },
  petrified: {
    label: "Petrified", tags: ["elemental"], maxRanks: null, persists: true, icon: "icons/svg/stoned.svg",
    flags: { incapacitated: true, cannotMove: true, cannotSpeak: true, unaware: true, attackedWithAdvantage: true,
      autoFailSaves: ["str", "dex"], resistAll: true, weightMultiplier: 10 }
  },
  bruised: {
    label: "Bruised", tags: ["physical"], maxRanks: null, icon: "icons/svg/bones.svg",
    flat: { damageTaken: 4 },
    removal: [{ action: "action", check: ["str"], dc: 15, ranks: "all" }]
  },
  staggered: {
    label: "Staggered", tags: ["physical"], maxRanks: null, endsAt: "nextTurnEnd", icon: "icons/svg/falling.svg",
    flags: { noDisengage: true, noDash: true, noDodge: true, disadvantagePhysical: true,
      dispelsKeywords: ["dojutsu", "sensory"] }
  },
  bleed: {
    label: "Bleed", tags: ["physical"], maxRanks: 5, persists: true, icon: "icons/svg/blood.svg",
    turnStartDamage: { die: "1d6", type: "necrotic", perRank: true },
    removal: [{ action: "action", check: ["med"], dc: 20, ranks: 1, perOver: { every: 2, ranks: 1 } }]
  },
  dazed: {
    label: "Dazed", tags: ["physical", "mental"], maxRanks: null, endsAt: "nextTurnEnd", icon: "icons/svg/daze.svg",
    flags: { moveOrAction: true, noBonusAction: true }
  },
  shaken: {
    label: "Shaken", tags: ["physical"], maxRanks: 5, icon: "icons/svg/downgrade.svg",
    perRank: { d20Physical: -1 }, decay: { when: "turnEnd", amount: 1 }
  },
  weakened: {
    label: "Weakened", tags: ["physical", "mental"], maxRanks: 5, persists: true, icon: "icons/svg/net.svg",
    perRank: { damageDealt: -4 }
  },
  concussed: {
    label: "Concussed", tags: ["mental", "physical"], maxRanks: 5, persists: true, icon: "icons/svg/sleep.svg",
    perRank: { saveDC: -1 },
    removal: [{ action: "action", requiresTool: "medicine", check: ["med"], dc: 20, ranks: "all" }]
  },
  demoralized: {
    label: "Demoralized", tags: ["mental"], maxRanks: 5, icon: "icons/svg/terror.svg",
    perRank: { d20Mental: -1 }, decay: { when: "turnEnd", amount: 1 }
  },
  berserk: {
    label: "Compelled: Berserk", tags: ["mental"], group: "compelled", maxRanks: null, endsAt: "nextTurnEnd",
    icon: "icons/svg/hazard.svg"
  },
  charmed: {
    label: "Compelled: Charmed", tags: ["mental"], group: "compelled", maxRanks: null, icon: "icons/svg/angel.svg",
    attitudeShiftBySourceRank: { D: 1, C: 1, B: 2, A: 2, S: 3 }, flags: { noHostileVsSource: true }
  },
  confused: {
    label: "Compelled: Confused", tags: ["mental"], group: "compelled", maxRanks: null, endsAt: "nextTurnEnd",
    icon: "icons/svg/mystery-man.svg", flags: { noComponents: ["hs"] }
  },
  slowed: {
    label: "Slowed", tags: ["mental", "physical", "elemental"], maxRanks: null, endsAt: "nextTurnEnd",
    icon: "icons/svg/cowled.svg",
    flags: { speedMultiplier: 0.5, noSpeedBonuses: true, noReactions: true, maxComponents: 2 }
  },
  sealed: {
    label: "Sealed", tags: ["mental"], maxRanks: 5, persists: true, icon: "icons/svg/padlock.svg",
    /** Adds to the BASE cost of Ninjutsu and Genjutsu (applied before reductions and the half-base floor). */
    perRank: { baseCost: { nin: 4, gen: 4 } },
    flags: { noTeleportAtRanks: 3 },
    removal: [{ action: "action", check: ["nin"], dc: 20, ranks: 1, onFail: { dcIncrease: 4 } }]
  },
  blinded: {
    label: "Blinded", tags: ["sensory", "physical"], maxRanks: null, icon: "icons/svg/blind.svg",
    flags: { noDojutsu: true, disadvantageSaves: ["dex", "int", "wis"], attackedWithAdvantage: true,
      attacksWithDisadvantage: true, ignoredBySenses: ["blindsight", "tremorSense", "chakraSensing"] }
  },
  dazzled: {
    label: "Dazzled", tags: ["sensory"], maxRanks: 5, persists: true, icon: "icons/svg/sun.svg",
    perRank: { checksAndAttacks: -2 }, flags: { noAttackAdvantage: true, rangeMultiplier: 0.5, minRange: 5 },
    removal: [{ action: "action", check: ["con"], dc: 15, ranks: "all" }]
  },
  invisible: {
    label: "Invisible", tags: ["sensory"], maxRanks: null, icon: "icons/svg/invisible.svg",
    flags: { attackedWithDisadvantage: true, attacksWithAdvantage: true, heavilyObscured: true,
      seenBy: ["trueSight", "chakraSight"] }
  },
  deafened: {
    label: "Deafened", tags: ["sensory", "physical"], maxRanks: null, icon: "icons/svg/deaf.svg",
    flat: { perception: -10 }
  }
};

/**
 * States (KB 05). Not conditions: condition removal and immunity never touch them.
 * derived: computed every prepare, never stored. relational: tracked per creature pair.
 */
export const states = {
  observed: { label: "Observed", type: "circumstantial", relational: true },
  hidden: { label: "Hidden", type: "circumstantial", relational: true, icon: "icons/svg/cowled.svg" },
  undetected: { label: "Undetected", type: "circumstantial", relational: true },
  alert: { label: "Alert", type: "circumstantial", icon: "icons/svg/eye.svg" },
  bloodied: { label: "Bloodied", type: "circumstantial", derived: true },
  drained: { label: "Drained", type: "circumstantial", derived: true },
  surprised: { label: "Surprised", type: "circumstantial", icon: "icons/svg/hazard.svg" },
  inCombat: { label: "In Combat", type: "circumstantial", derived: true },
  engaged: { label: "Engaged", type: "circumstantial", relational: true, derived: true },
  prone: { label: "Prone", type: "encounter", icon: "icons/svg/falling.svg" },
  grappled: { label: "Grappled", type: "encounter", icon: "icons/svg/net.svg" },
  restrained: { label: "Restrained", type: "encounter", icon: "icons/svg/net.svg", includes: ["grappled"] },
  suffocating: { label: "Suffocating", type: "encounter", icon: "icons/svg/silenced.svg" },
  incapacitated: { label: "Incapacitated", type: "encounter", icon: "icons/svg/paralysis.svg" },
  stunned: { label: "Stunned", type: "encounter", icon: "icons/svg/daze.svg", includes: ["incapacitated"] },
  unconscious: { label: "Unconscious", type: "encounter", icon: "icons/svg/unconscious.svg",
    includes: ["incapacitated", "prone"] },
  stabilized: { label: "Stabilized", type: "encounter", icon: "icons/svg/regen.svg", includes: ["unconscious"] },
  dying: { label: "Dying", type: "encounter", icon: "icons/svg/skull.svg", includes: ["unconscious"] },
  dead: { label: "Dead", type: "encounter", icon: "icons/svg/skull.svg" },
  /** Fury (Power Bukijutsu): red mist until the end of the turn after gaining it. */
  furious: { label: "Furious", type: "encounter", icon: "icons/svg/explosion.svg" }
};

/** Conditions removed in 4.0 (V3.1 statuses dropped by migration). */
export const retiredConditions = ["frightened", "paralyzed", "poisoned"];

/**
 * Derived (inventory) effects: computed, never a condition or state (King ruling: Encumbered).
 */
export const derivedEffects = {
  encumbered: { label: "Encumbered", speedMultiplier: 0.5, disadvantagePhysical: true }
};
