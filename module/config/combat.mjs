/**
 * Combat and shared vocabularies: damage types, activation, ranges, durations, recovery periods,
 * sizes, senses, amps. Source: KB 03, 04, 06, 09, 12.
 */

/** KB 03: 14 damage types in three groups. */
export const damageGroups = { physical: "Physical", elemental: "Elemental", special: "Special" };
export const damageTypes = {
  bludgeoning: { label: "Bludgeoning", group: "physical" },
  piercing: { label: "Piercing", group: "physical" },
  slashing: { label: "Slashing", group: "physical" },
  acid: { label: "Acid", group: "elemental", affliction: "corroded" },
  cold: { label: "Cold", group: "elemental", affliction: "chilled" },
  earth: { label: "Earth", group: "elemental" },
  fire: { label: "Fire", group: "elemental", affliction: "burned" },
  lightning: { label: "Lightning", group: "elemental", affliction: "shocked" },
  poison: { label: "Poison", group: "elemental" },
  wind: { label: "Wind", group: "elemental" },
  chakra: { label: "Chakra", group: "special", pool: "cp" },
  force: { label: "Force", group: "special" },
  necrotic: { label: "Necrotic", group: "special" },
  /** Genjutsu psychic damage ignores DR and interception unless those come from a Genjutsu effect. */
  psychic: { label: "Psychic", group: "special", genjutsuIgnoresDR: true }
};

/**
 * KB 03 damage pipeline (Phase 4 implements it). King 2026-11-07:
 *  - Interception happens first and changes the target entirely: the interceptor's DR, resistances
 *    and effects apply, the original target's don't.
 *  - DR applies once to the whole damage of a roll (not per damage type within a hit).
 */
export const damagePipeline = ["crit", "interception", "dr", "resistance", "immunity", "tempPool", "pool"];
export const drApplication = "perDamageRoll";

/** KB 03: crit range bonus cap (17-20). */
export const critRangeCap = 3;

/**
 * Critical hits (KB 03 + King 2026-11-07): double the damage dice and the ability modifier;
 * other flat bonuses do not double.
 */
export const critRules = { doubleDice: true, doubleAbilityMod: true, doubleFlatBonuses: false };

/** Exhaustion's "-1 to all dice rolls" applies once per roll, not per die (King 2026-11-07). */
export const allDicePenaltyMode = "perRoll";

/** KB 04 + 11: activation (casting time) types. */
export const activationTypes = {
  action: "Action",
  bonus: "Bonus Action",
  reaction: "Reaction",
  fullTurn: "Full Turn Action",
  special: "Special",
  free: "Free / No Action",
  long: "Longer (minutes or more)",
  none: "None"
};
export const timeUnits = { minute: "Minutes", hour: "Hours", day: "Days", week: "Weeks", year: "Years" };

/** KB 04 + 11: range types and area shapes. */
export const rangeTypes = {
  self: "Self", touch: "Touch", feet: "Feet", miles: "Miles", weapon: "Weapon range",
  movement: "Movement speed", special: "Special", unlimited: "Unlimited"
};
export const areaShapes = {
  cone: { label: "Cone", originIncluded: false },
  cube: { label: "Cube", originIncluded: false },
  cylinder: { label: "Cylinder", originIncluded: true },
  line: { label: "Line", originIncluded: false },
  sphere: { label: "Sphere", originIncluded: true }
};

/** KB 04 + 11: duration units. "round" = until the start of the initiator's next turn. */
export const durationUnits = {
  instant: "Instantaneous", round: "Rounds", turn: "Turns", minute: "Minutes", hour: "Hours", day: "Days",
  week: "Weeks", permanent: "Until dispelled", special: "Special"
};

/**
 * KB 09 + 12: every recovery cadence found in the books. Used by Uses and ResourcePool.recovery.on.
 * Short rests also count for "rest"; long rests count as short rests (KB 06).
 */
export const recoveryPeriods = {
  recharge: "Recharge (roll at turn start)",
  turnStart: "Start of your turn",
  turn: "Per turn",
  round: "Per round",
  encounter: "Per encounter",
  initiative: "On rolling initiative",
  rest10m: "10 minutes of rest",
  sr: "Short rest",
  lr: "Long rest",
  rest: "Short or long rest",
  fr: "Full rest",
  day: "Per day",
  event: "On a trigger (see text)",
  never: "Never (consumed)"
};
/** How much a recovery restores. */
export const recoveryAmounts = {
  all: "All", half: "Half of max", setHalf: "Set to half max if lower", formula: "Formula", step: "One die step"
};

/** KB 03: sizes. */
export const sizes = {
  tiny: { label: "Tiny", space: 5, carry: 0.5 },
  small: { label: "Small", space: 5, carry: 1 },
  medium: { label: "Medium", space: 5, carry: 1 },
  large: { label: "Large", space: 10, carry: 2 },
  huge: { label: "Huge", space: 15, carry: 4 },
  gargantuan: { label: "Gargantuan", space: 20, carry: 8 }
};

/** KB 06: special senses (CTX adds Heat Sense and Water Sense). */
export const senses = {
  blindsight: "Blindsight",
  chakraSensing: "Chakra Sensing",
  chakraSight: "Chakra Sight",
  darkvision: "Darkvision",
  tremorSense: "Tremor Sense",
  trueSight: "True Sight",
  heatSense: "Heat Sense",
  waterSense: "Water Sense"
};

/** KB 03: speed types. */
export const movementTypes = { walk: "Walk", climb: "Climb", swim: "Swim", fly: "Fly", burrow: "Burrow" };

/** KB 03: Amp types; optional limits live in settings (Rule of 3's / Singleton). */
export const ampTypes = {
  battle: "Battle", reflex: "Reflex", fortitude: "Fortitude", will: "Will", clan: "Clan"
};
export const ampLimits = {
  none: "No limit (RAW)",
  ruleOf3: "Rule of 3's (max 3 Amps)",
  singleton: "Singleton (max 1 per Amp type)"
};

/** KB 03: feature type (grey cases: Active wins). */
export const featureTypes = { active: "Active", passive: "Passive" };

/** KB 03: cover. */
export const cover = { partial: { ac: 2, dexSave: 2 }, half: { ac: 4, dexSave: 4 }, total: { untargetable: true } };

/** KB 03: Recharge X-Y die by range. */
export const rechargeDice = { "3-4": "d4", "5-6": "d6", "7-8": "d8", "9-10": "d10", "11-12": "d12" };

/** Die step ladder (KB 04). */
export const dieSteps = [4, 6, 8, 10, 12];

/** NPC roles (KB 03: most adversaries die at 0 HP). */
export const npcRoles = { minion: "Minion", standard: "Standard", elite: "Elite", solo: "Solo" };
export const npcTemplates = { none: "None", summon: "Summon", clone: "Clone", companion: "Companion" };
export const summonRoles = {
  striker: "Striker", caster: "Caster", controller: "Controller", defender: "Defender", lurker: "Lurker",
  supporter: "Supporter"
};

/** Mastery targets beyond skills/toolkits that features grant (KB 01). */
export const masteryTargets = {
  initiative: "Initiative",
  concentration: "Concentration",
  clash: "Clash",
  deathSave: "Death saves",
  "attack.nin": "Ninjutsu attacks",
  "attack.tai": "Taijutsu attacks",
  "attack.gen": "Genjutsu attacks"
};

/**
 * KB 03 "Actions in combat" (Ch8): the core actions every creature has, for the Combat tab.
 * requires: "lightWeapon" = shown only with a light weapon equipped.
 */
export const coreActions = {
  attack: { label: "Attack", activation: "action",
    text: "Make one weapon or unarmed attack (Extra Attack adds more). Grapple, Shove or a Jutsu-Like Attack can replace one attack." },
  dash: { label: "Dash", activation: "action", text: "Gain extra movement equal to your current speed this turn." },
  disengage: { label: "Disengage", activation: "action", text: "Your movement doesn't provoke Opportunity Attacks for the rest of the turn." },
  dodge: { label: "Dodge", activation: "action",
    text: "Until your next turn, attacks against you have disadvantage if you can see the attacker, and you have advantage on Dex saves. Lost if you're Incapacitated or your speed drops to 0." },
  help: { label: "Help", activation: "action",
    text: "Task: an ally has advantage on its next check for it (you must be proficient). Attack: an ally has advantage on its next attack against a creature within 5 ft of you." },
  hide: { label: "Hide", activation: "action", text: "Make a Stealth check to become Hidden. Needs total cover, heavy obscurement or darkness; not while seen." },
  ready: { label: "Ready", activation: "action",
    text: "Pick a trigger and a response; use your Reaction when it happens. A readied jutsu must take 1 Action to cast: its chakra is spent now and held with concentration, and broken concentration dispels it." },
  useObject: { label: "Use an Object", activation: "action", text: "Interact with a second object this turn (the first interaction each turn is free), or use an item that takes an Action." },
  opportunityAttack: { label: "Opportunity Attack", activation: "reaction",
    text: "When a hostile you can see leaves your reach, make one melee attack against it before it leaves. One per movement; not triggered by teleport or forced movement." },
  offhand: { label: "Off-hand Attack", activation: "bonus", requires: "lightWeapon",
    text: "After taking the Attack action with a light weapon, attack with a different light weapon in your other hand. No ability modifier to damage unless it's negative." }
};

/**
 * Bukijutsu Marks (Ammunition jutsu, KB / Context 6). Marked until the end of the marker's next turn;
 * only the marker sees the mist. Keyed by the jutsu that grants them.
 */
export const marks = {
  "Rundas Ammo": { label: "Fortune", color: "orange", text: "Chosen creatures that miss it can reroll, ending the mark." },
  "Takeminakata's Ammo": { label: "War", color: "red", text: "Spending its Action provokes Opportunity Attacks from hostiles within 10 ft, who may take a full Attack action." },
  "Neith's Ammo": { label: "Ra", color: "yellow", text: "Once per turn on taking damage, detonates for 2d6 fire damage within 15 ft." },
  "Apollo's Ammo": { label: "Apollo", color: "gold", text: "−2 AC against the first attack each turn; the marker sees it while it's invisible." },
  "Artemis's Ammo": { label: "Artemis", color: "green", text: "+4 damage from the first bludgeoning, piercing or slashing damage it takes each turn." },
  "Ullr Ammo": { label: "Skadi", color: "blue", text: "Chosen creatures reroll damage against it, taking the higher." }
};

/**
 * 8-Inner Gates: Seimon (Context 8f). Each gate's bonuses add to the ones before it.
 *   changes  Active Effect changes (cumulative)    pierce  sets Pierce (highest gate wins)
 *   fatigue  Exhaustion ranks applied when the gates end
 */
const STR_DEX_SKILLS = ["acr", "ath", "mar", "slt", "ste"];
const masteryStrDex = gate => STR_DEX_SKILLS.map(s => ({ key: `n5e.mastery.skill.${s}`, value: `Gate ${gate}` }));
export const innerGates = [
  { n: 1, label: "Opening", fatigue: 0, changes: [{ key: "n5e.attack.tai", value: 1 }, { key: "system.bonuses.speed", value: 10, mode: 2 }, ...masteryStrDex(1)],
    text: "+1 Taijutsu attacks, +10 speed, Mastery on Str/Dex skill checks. Repeated Exposure: entering and ending without going past this gate is limited to 2 per Long Rest." },
  { n: 2, label: "Rest", fatigue: 1, tempHp: 10, changes: [],
    text: "10 temporary HP and spend up to 2 Hit Dice on entry; Bonus Action: spend 1 Hit Die for twice the roll as temporary HP." },
  { n: 3, label: "Life", fatigue: 1, changes: [{ key: "n5e.unarmed.dice", value: "1d8" }, { key: "n5e.saveDC.tai", value: 1 }, { key: "system.bonuses.speed", value: 10, mode: 2 }],
    text: "+1d8 Unarmed damage, +1 Taijutsu DC, +10 speed." },
  { n: 4, label: "Pain", fatigue: 1, minLevel: 8, requires: "Level 8+, Taijutsu score 18+",
    changes: [{ key: "n5e.critRange.unarmed", value: 1 }, ...masteryStrDex(4)],
    text: "+1 crit range, unarmed crits triple the die, Mastery on Str/Dex skills, once per turn +5 ft to a Taijutsu area." },
  { n: 5, label: "Limit", fatigue: 0, pierce: 8, requires: "Taijutsu score 20+, Con 16+",
    changes: [{ key: "n5e.unarmed.dice", value: "1d8" }, { key: "system.bonuses.ac", value: 1, mode: 2 }, { key: "system.bonuses.speed", value: 10, mode: 2 }],
    text: "+1d8 Unarmed damage, +1 AC, +10 speed, unarmed Pierce 8. Gate Exhaustion now recovers 1 per Short Rest, all on a Full Rest." },
  { n: 6, label: "View", fatigue: 1, minLevel: 16, requires: "Level 16+, Con 18+",
    changes: [{ key: "n5e.attack.tai", value: 1 }, ...masteryStrDex(6)],
    text: "+1 Taijutsu attacks, Mastery on Str/Dex skills, Eight Gates Special Action (cast a 1-Action Taijutsu, regained each turn)." },
  { n: 7, label: "Wonder", fatigue: 1, bruised: true, requires: "Con 20",
    changes: [{ key: "n5e.unarmed.dice", value: "1d8" }, { key: "system.bonuses.ac", value: 1, mode: 2 }, { key: "system.bonuses.speed", value: 10, mode: 2 },
      { key: "n5e.saveDC.tai", value: 1 }, { key: "n5e.critRange.unarmed", value: 1 }],
    text: "+1d8 Unarmed damage, +1 AC, +10 speed, +1 Taijutsu DC, Taijutsu attack ranges +60 ft, +1 crit range, crits triple ability modifier damage. Bruised until the Exhaustion is gone." },
  { n: 8, label: "Death", fatigue: 0, pierce: 12, death: true, requires: "GM permission",
    changes: [{ key: "n5e.attack.tai", value: 1 }, { key: "n5e.saveDC.tai", value: 1 }],
    text: "+1 Taijutsu attack and DC, melee crits on 16+, Taijutsu damage Pierce 12. When it ends you die and turn to dust." }
];
/** Gates reachable per take of the feat (Gate 8 also needs the GM's permission). */
export const gateAccess = [0, 3, 5, 7];
