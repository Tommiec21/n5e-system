/**
 * Every optional or table rule the system automates, in one registry (King 2026-11-07: GMs control
 * which rules apply). Each becomes a world setting, edited in the "N5e Rules" panel (open to everyone;
 * only the GM can change it). type: boolean | number | choice. Defaults = the book's rules.
 *
 * Entry: { group, type, default, label, hint, [min, max] for numbers, [choices] for choice }.
 * Add one here and it is registered (settings.mjs), shown in the panel (applications/settings/
 * rules-config.mjs), and readable anywhere with rule("key") (rules-settings.mjs). Put the rule's
 * check where the automation happens, so turning it off skips just that automation.
 */
export const ruleGroups = {
  rolls: "Rolls and Will of Fire",
  casting: "Casting and combat",
  damage: "Damage, 0 HP and death",
  conditions: "Conditions",
  resting: "Resting",
  rations: "Rations (Resource Based Rests)",
  character: "Character options",
  map: "Map: areas, senses and movement"
};

export const rules = {
  coordinatedDamage: { group: "casting", type: "boolean", default: false, label: "Coordinated GM damage and base Deflection (pilot)",
    hint: "Active GM applies each damage-card/target once with durable receipts. Requires reaction windows. Base Deflection only; upgraded techniques and corrections use GM reconciliation." },
  reactionWindows: { group: "casting", type: "boolean", default: false, label: "Reaction decision windows (pilot)",
    hint: "Enable GM-authored player reaction prompts. Decisions do not yet apply damage or spend resources." },
  reactionTimeoutSeconds: { group: "casting", type: "number", default: 60, min: 0, label: "Reaction player timeout (seconds)",
    hint: "After this many seconds the GM resolves unanswered prompts. Set 0 to disable the timer. Existing windows keep their original deadline." },
  // Rolls
  willOfFireAward: { group: "rolls", type: "boolean", default: true, label: "Will of Fire from a natural 1 or 20",
    hint: "The first natural 1 or 20 a creature rolls in an encounter grants a Will of Fire (max 3)." },
  willOfFireVariants: { group: "rolls", type: "boolean", default: false, label: "Will of Fire variants (Kage Guide)",
    hint: "Earth, Wind, Lightning, Water and Revenge variants; carry only one at a time." },
  skillActionPenalties: { group: "rolls", type: "boolean", default: true, label: "Skill action tier penalties",
    hint: "−3 on Proficient actions without proficiency; −5 on Mastery actions without Mastery (never stacking)." },
  critRangeCap: { group: "rolls", type: "number", default: 3, min: 0, max: 10, label: "Crit range cap",
    hint: "How far crit range bonuses can lower the threshold (3 = crits on 17-20)." },

  // Casting and combat
  actionEconomy: { group: "casting", type: "boolean", default: true, label: "Track the action economy",
    hint: "Mark Action / Bonus / Reaction / Special / Object as used and warn when casting with a spent slot." },
  concentrationUpkeep: { group: "casting", type: "boolean", default: true, label: "Concentration upkeep at turn start",
    hint: "Pay half the cost paid at casting at the start of each turn; unpaid jutsu end." },
  freeOutOfCombatUpkeep: { group: "casting", type: "boolean", default: false, label: "No upkeep outside combat",
    hint: "Out of combat, charge only the initial cost of concentration jutsu." },
  chainReset: { group: "casting", type: "boolean", default: true, label: "Chain resets automatically",
    hint: "Chain drops to 0 at your turn start unless a Chain jutsu raised or maintained it." },
  comboClear: { group: "casting", type: "boolean", default: true, label: "Combo window closes at turn start",
    hint: "An armed Combo clears at the start of your next turn." },
  moldingLimit: { group: "casting", type: "boolean", default: true, label: "Warn on more than one Molding",
    hint: "More than one Molding per cast needs the Crash state." },
  ampLimit: { group: "casting", type: "choice", default: "none", label: "Amp limit",
    choices: { none: "No limit", ruleOfThree: "Rule of 3's (3 active)", singleton: "Singleton (1 per type)" },
    hint: "Optional limits on active Amps." },

  // Damage and death
  concentrationOnDamage: { group: "damage", type: "boolean", default: true, label: "Concentration check on damage",
    hint: "Con (Chakra Control) vs max(15 + concentrated ranks, half the damage); Stable jutsu are safe." },
  deathSaves: { group: "damage", type: "boolean", default: true, label: "Death saves",
    hint: "Characters at 0 HP are Dying and roll death saves. Off: they fall Unconscious with no saves." },
  instantDeath: { group: "damage", type: "boolean", default: true, label: "Instant death",
    hint: "Damage left over after 0 HP that's at least max HP kills outright." },
  npcDieAtZero: { group: "damage", type: "boolean", default: true, label: "NPCs die at 0 HP",
    hint: "NPCs marked to die at 0 HP are marked Dead (named foes can roll death saves instead)." },
  envenomedBlocksHealing: { group: "damage", type: "boolean", default: true, label: "Envenomed blocks healing",
    hint: "Envenomed creatures can't regain HP and get no benefit from rests." },
  exhaustionDeath: { group: "damage", type: "boolean", default: true, label: "Exhaustion past 10 kills",
    hint: "Gaining the 11th rank of Exhaustion kills." },

  // Conditions
  conditionTurnDamage: { group: "conditions", type: "boolean", default: true, label: "Turn-start condition damage",
    hint: "Burned (1d8 fire per rank) and Bleed (1d6 necrotic per rank) post a damage card at the start of the turn." },
  conditionDecay: { group: "conditions", type: "boolean", default: true, label: "Conditions wear off at turn end",
    hint: "Shocked, Shaken and Demoralized lose a rank; Staggered, Dazed, Berserk, Confused and Slowed end at the end of the next turn." },
  conditionDurations: { group: "conditions", type: "boolean", default: true, label: "Default 1-minute duration",
    hint: "Conditions without a listed duration end after 1 minute (10 rounds); [Persists] conditions last until removed." },
  conditionResistance: { group: "conditions", type: "boolean", default: true, label: "Condition resistance and immunity",
    hint: "Resistance = advantage on saves against it; immunity = it can't be applied." },

  // Resting
  restLimit: { group: "resting", type: "choice", default: "free", label: "Rest limits",
    choices: { free: "Free (no limits)", count: "Counts (Short Rests per Long Rest, Long Rests per Full Rest)",
      time: "Time (Long Rest once per 24 h, Full Rest once per 96 h)" },
    hint: "How often rests can be taken (ignored while Rations are on)." },
  shortRestsPerLong: { group: "resting", type: "number", default: 2, min: 0, max: 20, label: "Short Rests per Long Rest",
    hint: "With Counts limits: how many Short Rests between Long Rests (0 = unlimited)." },
  longRestsPerFull: { group: "resting", type: "number", default: 3, min: 0, max: 20, label: "Long Rests per Full Rest",
    hint: "With Counts limits: how many Long Rests between Full Rests (0 = unlimited)." },
  restNeedsHP: { group: "resting", type: "boolean", default: true, label: "Long and Full Rests need 1 HP",
    hint: "A creature at 0 HP can't benefit from a Long or Full Rest." },
  exhaustionLongRest: { group: "resting", type: "boolean", default: true, label: "Long Rest removes 2 Exhaustion",
    hint: "With food and drink." },
  stamina: { group: "resting", type: "boolean", default: false, label: "Stamina pool for limited-use feats",
    hint: "One pool (= proficiency bonus) for all limited-use feat abilities; full on a Long Rest, half on a Short Rest." },

  // Rations
  rations: { group: "rations", type: "boolean", default: false, label: "Use the Ration Pool",
    hint: "The party shares a Ration Pool; rests cost rations; unpaid rests pass time with no benefit." },
  rationMax: { group: "rations", type: "number", default: 20, min: 0, max: 200, label: "Ration Pool maximum" },
  rationShortCost: { group: "rations", type: "number", default: 1, min: 0, max: 50, label: "Short Rest cost" },
  rationLongCost: { group: "rations", type: "number", default: 10, min: 0, max: 100, label: "Long Rest cost" },
  rationFullOnMissions: { group: "rations", type: "boolean", default: false, label: "Allow Full Rests on missions" },
  rationPool: { group: "rations", type: "number", default: 20, min: 0, max: 200, label: "Rations in the pool now" },

  // Character
  multiclassing: { group: "character", type: "boolean", default: false, label: "Legacy multiclassing",
    hint: "Allow more than one class (removed from balance)." },
  hijutsuFlexibilityPick: { group: "character", type: "boolean", default: true, label: "Players pick their Hijutsu Flexibility ability",
    hint: "Default is the higher of the two abilities." },

  // Map: areas, senses and movement (0.9.0)
  areaPrompt: { group: "map", type: "boolean", default: true, label: "Offer to place the area when casting",
    hint: "Casting a jutsu with an area starts placing its shape on the map (the card keeps a Place area button either way)." },
  areaAutoTarget: { group: "map", type: "boolean", default: true, label: "Target the tokens in a placed area",
    hint: "Placing an area targets every token inside it (the caster is left out of Self areas), so save buttons roll for all of them." },
  areaCleanup: { group: "map", type: "boolean", default: true, label: "Remove areas when they end",
    hint: "Instantaneous areas go at the end of the caster's turn, timed ones when their rounds run out, concentration ones when concentration ends." },
  areaTurnStart: { group: "map", type: "boolean", default: true, label: "Lasting area reminders",
    hint: "When a creature starts its turn inside a lasting area, the GM gets a card with that jutsu's buttons." },
  syncSenses: { group: "map", type: "boolean", default: true, label: "Senses give tokens vision",
    hint: "Darkvision, Blindsight, Tremor Sense, True Sight, Chakra Sight and Chakra Sensing on the sheet become token vision and detection modes." },
  movementCosts: { group: "map", type: "boolean", default: true, label: "Climb, swim and crawl cost extra",
    hint: "+1 ft per ft without a climb or swim speed, and while crawling (KB 03, 06)." },
  rulerSpeed: { group: "map", type: "boolean", default: true, label: "Color the ruler by speed",
    hint: "Movement within your speed shows normally, up to double (Dash) in yellow, beyond in red." }
};
