/**
 * Character options, rests, terrain, optional rules, skill actions.
 * Source: KB 02, 06, 07, 09, 12.
 */

/** KB 09: stance categories. One stance at a time across all categories; switching costs a Bonus Action. */
export const stanceCategories = {
  taijutsu: "Taijutsu", bukijutsu: "Bukijutsu", chakra: "Chakra", clan: "Clan"
};
export const stanceRules = { maxActive: 1, switchAction: "bonus", upgradeLevels: [5, 10], taijutsuUnarmedDie: "d6" };

/** KB 09: feat categories. */
export const featCategories = {
  general: "General", skill: "Skill", chakra: "Chakra", ninjutsu: "Ninjutsu", genjutsu: "Genjutsu",
  taijutsu: "Taijutsu", critical: "Critical", clan: "Clan", class: "Class", archetype: "Archetype",
  rare: "Rare", classFeature: "Class Feature", clanFeature: "Clan Feature", npcFeature: "NPC Feature"
};

/** KB 12: class jutsu tiers (High/Medium/Low = 0/1/2-3 extra resources). */
export const jutsuTiers = { high: "High", medium: "Medium", low: "Low" };

/** KB 09: 16 backgrounds (data in compendium later; keys here for migration and filters). */
export const backgrounds = [
  "advisor", "bureaucrat", "chronicler", "entertainer", "gangster", "genius", "hardWorker", "hermit",
  "lastClansmen", "leader", "noble", "student", "traveler", "troubleMaker", "urchin", "warChild"
];

/** KB 09: Will of Fire. */
export const willOfFire = { max: 3, sessionStart: 1 };

/** KB 09: languages. */
export const languages = {
  common: "Common", fire: "Fire dialect", earth: "Earth dialect", water: "Water dialect",
  cloud: "Cloud dialect", sand: "Sand dialect"
};

/** KB 06: rests. Short = half of each dice pool separately (King ruling). */
export const rests = {
  short: { label: "Short Rest", hours: 1, spendDiceFraction: 0.5, recovers: ["sr", "rest"] },
  long: { label: "Long Rest", hours: 8, hpFraction: 0.5, cpFraction: 0.5, diceFraction: 0.5,
    exhaustionRemoved: 2, countsAsShort: true, recovers: ["sr", "lr", "rest", "day"], oncePer: 24 },
  full: { label: "Full Rest", hours: 24, hpFraction: 1, cpFraction: 1, diceFraction: 1,
    healsPersisting: true, countsAsLong: true, recovers: ["sr", "lr", "rest", "fr", "day"], oncePer: 96 }
};
/** KB 06 optional: party ration pool. */
export const rations = { max: 20, short: 1, long: 10 };

/** KB 06: hostile terrain. */
export const hostileTerrain = {
  D: { dc: 18, damage: null }, C: { dc: 20, damage: "3d6" }, B: { dc: 21, damage: "5d6" },
  A: { dc: 23, damage: "7d6" }, S: { dc: 25, damage: "9d6" }
};
export const terrainTypes = {
  extremeHeat: { label: "Extreme Heat", damageType: "fire", immuneIndirect: "fire", indirectCheck: "sur" },
  extremeCold: { label: "Extreme Cold", damageType: "cold", immuneIndirect: "water", indirectCheck: "sur" },
  toxic: { label: "Toxic Environment", damageType: "poison", immuneIndirect: "medical", indirectCheck: "sur" },
  chakraResistant: { label: "Chakra Resistant", damageType: null }
};

/**
 * Skill-action tiers (Core Ch6 "Skill Based Actions"). Anyone may attempt any tier:
 *   Proficient action without proficiency: -3. Mastery action without a Mastery rank: -5.
 * Penalties don't stack (King 2026-11-07): a Mastery action with neither takes -5, not -8.
 */
export const skillActionTiers = {
  np: { label: "Non-Proficient", penalty: 0 },
  p: { label: "Proficient", noProficiencyPenalty: -3 },
  m: { label: "Mastery", noProficiencyPenalty: -3, noMasteryPenalty: -5 },
  kit: { label: "Toolkit", requires: "skill+kit", charges: 1 }
};

/**
 * KB 02: skill-based actions, as data. Each becomes a clickable action in Phase 2/3.
 * vs: "dc" (GM/listed DC), "passive:<skill>", "contest:<skill|skill>", "save:<ability>", "fixed:<n>".
 */
export const skillActions = {
  maintainBalance: { skill: "acr", tier: "np", label: "Maintain Balance", activation: "move", vs: "dc" },
  catFall: { skill: "acr", tier: "p", label: "Cat Fall", activation: "reaction", vs: "dc" },
  squeezeThrough: { skill: "acr", tier: "p", label: "Squeeze Through", activation: "action", vs: "dc" },
  trapNavigation: { skill: "acr", tier: "kit", kit: "trappers", label: "Trap Navigation", activation: "bonus" },
  readIntent: { skill: "ani", tier: "np", label: "Read Intent", activation: "bonus", vs: "dc" },
  calmAnimal: { skill: "ani", tier: "np", label: "Calm Animal", activation: "reaction", vs: "fixed:8+level" },
  tameAnimal: { skill: "ani", tier: "p", label: "Tame Animal", activation: "action", vs: "fixed:12+level" },
  trainAnimal: { skill: "ani", tier: "m", label: "Train Animal", activation: "downtime", vs: "dc" },
  veterinaryTreatment: { skill: "ani", tier: "kit", kit: "medicine", label: "Veterinary Treatment", activation: "action" },
  trip: { skill: "ath", tier: "np", label: "Trip", activation: "action", vs: "contest:acr" },
  grapple: { skill: "ath", tier: "np", label: "Grapple", activation: "action", vs: "contest:ath|acr" },
  shove: { skill: "ath", tier: "np", label: "Shove", activation: "action", vs: "dc:str" },
  disarm: { skill: "ath", tier: "p", label: "Disarm", activation: "action", vs: "contest:ath|slt" },
  pin: { skill: "ath", tier: "p", label: "Pin", activation: "action", vs: "contest:ath" },
  takedown: { skill: "ath", tier: "p", label: "Takedown", activation: "action", vs: "contest:ath" },
  muffle: { skill: "ath", tier: "p", label: "Muffle", activation: "action", vs: "contest:ath" },
  choke: { skill: "ath", tier: "p", label: "Choke", activation: "action", vs: "contest:ath" },
  structuralExploit: { skill: "ath", tier: "kit", kit: "smiths", label: "Structural Exploit", activation: "bonus" },
  maintainFocus: { skill: "cha", tier: "p", label: "Maintain Focus", activation: "action", vs: "ownSaveDC" },
  suppressChakra: { skill: "cha", tier: "p", label: "Suppress Chakra", activation: "long", vs: "score" },
  drawReserves: { skill: "cha", tier: "m", label: "Draw Reserves", activation: "long", vs: "fixed:20" },
  createDiversion: { skill: "dec", tier: "np", label: "Create Diversion", activation: "action", vs: "passive:prc" },
  lie: { skill: "dec", tier: "np", label: "Lie", activation: "action", vs: "passive:ins" },
  fastTalk: { skill: "dec", tier: "p", label: "Fast Talk", activation: "action", vs: "passive:ins" },
  impersonate: { skill: "dec", tier: "p", label: "Impersonate", activation: "none", vs: "score" },
  feint: { skill: "dec", tier: "m", label: "Feint", activation: "bonus", vs: "contest:ins" },
  recallKnowledge: { skill: "his", tier: "np", label: "Recall Knowledge", activation: "action", vs: "dc" },
  castGenjutsuScroll: { skill: "ill", tier: "np", label: "Cast Genjutsu Scroll", activation: "none" },
  readEnemyGen: { skill: "ill", tier: "p", label: "Read The Enemy (Genjutsu)", activation: "reaction", vs: "jutsuDC:gen" },
  identifyGenjutsu: { skill: "ill", tier: "p", label: "Identify Genjutsu", activation: "action", vs: "jutsuDC+5" },
  seeThroughLies: { skill: "ins", tier: "np", label: "See Through Lies", activation: "reaction", vs: "contest:dec" },
  senseMotive: { skill: "ins", tier: "p", label: "Sense Motive", activation: "action", vs: "contest:dec" },
  readTheRoom: { skill: "ins", tier: "p", label: "Read the Room", activation: "action", vs: "dc" },
  coerce: { skill: "itm", tier: "np", label: "Coerce", activation: "long", vs: "save:wis" },
  demoralize: { skill: "itm", tier: "p", label: "Demoralize", activation: "action", vs: "save:wis" },
  showOfForce: { skill: "itm", tier: "m", label: "Show of Force", activation: "action", vs: "save:wis" },
  study: { skill: "inv", tier: "np", label: "Study", activation: "long", vs: "dc" },
  research: { skill: "inv", tier: "p", label: "Research", activation: "long", vs: "dc" },
  readEnemyTai: { skill: "mar", tier: "p", label: "Read The Enemy (Taijutsu/Bukijutsu)", activation: "reaction", vs: "jutsuDC:tai" },
  identifyTaijutsu: { skill: "mar", tier: "p", label: "Identify Taijutsu/Bukijutsu", activation: "action", vs: "jutsuDC+5" },
  administerAid: { skill: "med", tier: "np", label: "Administer Aid", activation: "action", vs: "fixed:15+rank" },
  stabilize: { skill: "med", tier: "p", label: "Stabilize", activation: "action", vs: "fixed:20" }, // Action (King 2026-11-07)
  treatWounds: { skill: "med", tier: "p", label: "Treat Wounds", activation: "long", vs: "tiered" },
  quickAssessment: { skill: "med", tier: "p", label: "Quick Assessment", activation: "bonus", vs: "dc" },
  identifyFloraFauna: { skill: "nat", tier: "np", label: "Identify Flora/Fauna", activation: "action", vs: "dc" },
  findResources: { skill: "nat", tier: "p", label: "Find Resources", activation: "long", vs: "dc" },
  forecast: { skill: "nat", tier: "p", label: "Forecast", activation: "long", vs: "dc" },
  ecologicalInsights: { skill: "nat", tier: "m", label: "Ecological Insights", activation: "long", vs: "dc" },
  extractVenom: { skill: "nat", tier: "kit", kit: "poison", label: "Extract Venom", activation: "action", vs: "dc" },
  castNinjutsuScroll: { skill: "nin", tier: "np", label: "Cast Ninjutsu Scroll", activation: "none" },
  readEnemyNin: { skill: "nin", tier: "p", label: "Read The Enemy (Ninjutsu)", activation: "reaction", vs: "jutsuDC:nin" },
  identifyNinjutsu: { skill: "nin", tier: "p", label: "Identify Ninjutsu", activation: "action", vs: "jutsuDC+5" },
  chakraConduction: { skill: "nin", tier: "kit", kit: "sealing", label: "Chakra Conduction", activation: "none", vs: "dc" },
  search: { skill: "prc", tier: "np", label: "Search", activation: "action", vs: "contest:ste" },
  dangerSense: { skill: "prc", tier: "m", label: "Danger Sense", activation: "reaction", vs: "contest:initiative" },
  perform: { skill: "prf", tier: "np", label: "Perform", activation: "action" },
  gatherInformation: { skill: "per", tier: "np", label: "Gather Information", activation: "long", vs: "dc" },
  makeImpression: { skill: "per", tier: "np", label: "Make an Impression/Request", activation: "long", vs: "dc:wis" },
  haggle: { skill: "per", tier: "p", label: "Haggle", activation: "none", vs: "passive:ins" },
  upsell: { skill: "per", tier: "m", label: "Upsell", activation: "none", vs: "dc" },
  palmObject: { skill: "slt", tier: "np", label: "Palm an Object", activation: "none", vs: "passive:prc" },
  steal: { skill: "slt", tier: "np", label: "Steal", activation: "none", vs: "passive:prc" },
  plantObject: { skill: "slt", tier: "p", label: "Plant Object", activation: "action", vs: "passive:prc" },
  practicedHands: { skill: "slt", tier: "m", label: "Practiced Hands", activation: "none" },
  hide: { skill: "ste", tier: "np", label: "Hide", activation: "none", vs: "passive:prc" },
  sneak: { skill: "ste", tier: "np", label: "Sneak", activation: "move", vs: "passive:prc" },
  blendIn: { skill: "ste", tier: "p", label: "Blend In", activation: "none", vs: "contest:prc" },
  senseDirection: { skill: "sur", tier: "np", label: "Sense Direction", activation: "none", vs: "dc" },
  coverTracks: { skill: "sur", tier: "p", label: "Cover Tracks", activation: "none" },
  track: { skill: "sur", tier: "p", label: "Track", activation: "none", vs: "dc" },
  fieldDressing: { skill: "sur", tier: "kit", kit: null, label: "Field Dressing", activation: "none", vs: "dc" }
};
