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
 * roll / text: what you roll and what happens (KB 02 table), shown on hover. nonCombat: hidden from the Combat tab.
 * vs: "dc" (GM/listed DC), "passive:<skill>", "contest:<skill|skill>", "save:<ability>", "fixed:<n>".
 */
export const skillActions = {
  maintainBalance: { skill: "acr", tier: "np", label: "Maintain Balance", activation: "move", vs: "dc", roll: "GM DC (or jutsu save DC)", text: "success: move normally to end of turn; fail: Prone" },
  catFall: { skill: "acr", tier: "p", label: "Cat Fall", activation: "reaction", vs: "dc", roll: "Easy/Med/Hard/VHard by 10-30/30-50/50-70/70+ ft fallen", text: "halve fall damage (Reaction to falling more than 10 ft)" },
  squeezeThrough: { skill: "acr", tier: "p", label: "Squeeze Through", activation: "action", vs: "dc", roll: "GM DC", text: "move through 1-size-smaller space at half speed; fail by 5 = stuck" },
  trapNavigation: { skill: "acr", tier: "kit", kit: "trappers", label: "Trap Navigation", activation: "bonus", roll: "1 Charge", text: "movement can't trigger traps this turn" },
  readIntent: { skill: "ani", tier: "np", label: "Read Intent", activation: "bonus", vs: "dc", roll: "GM DC, 60 ft", text: "learn a beast's disposition" },
  calmAnimal: { skill: "ani", tier: "np", label: "Calm Animal", activation: "reaction", vs: "fixed:8+level", roll: "DC 8 + beast level, before initiative", text: "beast becomes non-hostile and withdraws" },
  tameAnimal: { skill: "ani", tier: "p", label: "Tame Animal", activation: "action", vs: "fixed:12+level", roll: "DC 12 + beast level, 5 ft (hostile or under 25% HP)", text: "Tamed (command it with a Bonus Action; one at a time)" },
  trainAnimal: { skill: "ani", tier: "m", label: "Train Animal", activation: "downtime", vs: "dc", roll: "Hard DC by level, 1 week downtime", text: "learns one D-Rank Taijutsu/Bukijutsu" },
  veterinaryTreatment: { skill: "ani", tier: "kit", kit: "medicine", label: "Veterinary Treatment", activation: "action", roll: "1 Charge", text: "heal Wis mod + prof" },
  trip: { skill: "ath", tier: "np", label: "Trip", activation: "action", vs: "contest:acr", roll: "contested Athletics vs Acrobatics", text: "Prone; disadvantage if 1 size larger; can't if 2+ larger" },
  grapple: { skill: "ath", tier: "np", label: "Grapple", activation: "action", vs: "contest:ath|acr", roll: "contested Athletics vs Athletics/Acrobatics", text: "Grappled; escape = Action, same contest; ends if moved more than 5 ft; dragging = difficult terrain. With 1+ Mastery and beat by 10: Restrained (escape at disadvantage)" },
  shove: { skill: "ath", tier: "np", label: "Shove", activation: "action", vs: "dc:str", roll: "Athletics vs target's Strength DC (advantage if you grapple/restrain it)", text: "push 5 ft (10 ft if beat by 10). Proficient: push Str mod × 5 ft (min 5); beat by 10 also Prone" },
  disarm: { skill: "ath", tier: "p", label: "Disarm", activation: "action", vs: "contest:ath|slt", roll: "contested Athletics vs Athletics/Sleight of Hand", text: "item lands within 5 ft (10 ft if beat by 10)" },
  pin: { skill: "ath", tier: "p", label: "Pin", activation: "action", vs: "contest:ath", roll: "contested Athletics, while grappling", text: "Restrained, can't speak, can't make hand seals; escape at disadvantage" },
  takedown: { skill: "ath", tier: "p", label: "Takedown", activation: "action", vs: "contest:ath", roll: "contested Athletics, while grappling", text: "Prone, grapple holds" },
  muffle: { skill: "ath", tier: "p", label: "Muffle", activation: "action", vs: "contest:ath", roll: "contested Athletics, while grappling", text: "can't speak until the start of your next turn" },
  choke: { skill: "ath", tier: "p", label: "Choke", activation: "action", vs: "contest:ath", roll: "contested Athletics, target Restrained; maintain with an Action each turn", text: "can't speak, Suffocating; 0 HP from it means Unconscious, not Dying" },
  structuralExploit: { skill: "ath", tier: "kit", kit: "smiths", label: "Structural Exploit", activation: "bonus", roll: "1 Charge, while grappling", text: "target's AC −2 against attacks until the grapple ends" },
  maintainFocus: { skill: "cha", tier: "p", label: "Maintain Focus", activation: "action", vs: "ownSaveDC", roll: "vs your own jutsu save DC", text: "auto-succeed concentration checks until the start of your next turn" },
  suppressChakra: { skill: "cha", tier: "p", label: "Suppress Chakra", activation: "long", vs: "score", roll: "1 minute; result = Suppression Score", text: "hidden from Chakra Sight (passive Perception below the score); 10 min; ends when you spend CP" },
  drawReserves: { skill: "cha", tier: "m", label: "Draw Reserves", activation: "long", vs: "fixed:20", roll: "DC 20, 10 minutes", text: "spend 1 Chakra Die, regain roll + Con; +1 die per 5 over" },
  createDiversion: { skill: "dec", tier: "np", label: "Create Diversion", activation: "action", vs: "passive:prc", roll: "vs passive Perception of all", text: "allies within 30 ft get +1d4 on their next Stealth this round" },
  lie: { skill: "dec", tier: "np", label: "Lie", activation: "action", vs: "passive:ins", roll: "vs passive Insight", text: "targets believe you" },
  fastTalk: { skill: "dec", tier: "p", label: "Fast Talk", activation: "action", vs: "passive:ins", roll: "vs passive Insight, non-combat", text: "target has disadvantage on its next Insight/Cha social check", nonCombat: true },
  impersonate: { skill: "dec", tier: "p", label: "Impersonate", activation: "none", vs: "score", roll: "result = DC to see through", text: "familiar creatures get advantage" },
  feint: { skill: "dec", tier: "m", label: "Feint", activation: "bonus", vs: "contest:ins", roll: "contested Deception vs Insight, while engaged", text: "+1d4 to your next melee attack vs it this turn; repeats at disadvantage until a round without feinting" },
  recallKnowledge: { skill: "his", tier: "np", label: "Recall Knowledge", activation: "action", vs: "dc", roll: "GM DC (Action or Reaction)", text: "accurate information" },
  castGenjutsuScroll: { skill: "ill", tier: "np", label: "Cast Genjutsu Scroll", activation: "none", roll: "—", text: "D-Rank or lower; Proficient: B or lower; Mastery: any rank" },
  readEnemyGen: { skill: "ill", tier: "p", label: "Read The Enemy (Genjutsu)", activation: "reaction", vs: "jutsuDC:gen", roll: "Wis or Int (Illusions) vs caster's Genjutsu save DC, on seeing a Genjutsu's hand seals", text: "learn name/rank/targets; you or an ally within 30 ft: close eyes (Blinded) or +1 to saves and AC vs it" },
  identifyGenjutsu: { skill: "ill", tier: "p", label: "Identify Genjutsu", activation: "action", vs: "jutsuDC+5", roll: "Wis (Illusions) vs save DC + 5", text: "name, rank, effects, special end condition" },
  seeThroughLies: { skill: "ins", tier: "np", label: "See Through Lies", activation: "reaction", vs: "contest:dec", roll: "GM secret roll; contested vs Deception if lying", text: "sense deception; no retry on a fail" },
  senseMotive: { skill: "ins", tier: "p", label: "Sense Motive", activation: "action", vs: "contest:dec", roll: "secret; vs Deception", text: "intention: Antagonistic/Hostile/Neutral/Supportive/Allied" },
  readTheRoom: { skill: "ins", tier: "p", label: "Read the Room", activation: "action", vs: "dc", roll: "GM DC", text: "group mood" },
  coerce: { skill: "itm", tier: "np", label: "Coerce", activation: "long", vs: "save:wis", roll: "Intimidation vs Wis save, 1 min, non-combat", text: "target complies (may retaliate; beat by 10: no short-term retaliation)", nonCombat: true },
  demoralize: { skill: "itm", tier: "p", label: "Demoralize", activation: "action", vs: "save:wis", roll: "Cha (Intimidation) vs Wis save, 30 ft", text: "1 rank Demoralized or Shaken (your choice); 1+ Mastery and beat by 10: 2 ranks; 2 attempts per creature per hour" },
  showOfForce: { skill: "itm", tier: "m", label: "Show of Force", activation: "action", vs: "save:wis", roll: "Wis save vs your Intimidation result, 20 ft", text: "fail: 1 rank Demoralized" },
  study: { skill: "inv", tier: "np", label: "Study", activation: "long", vs: "dc", roll: "GM DC, 1 minute", text: "one fact; fail by 5: misleading information" },
  research: { skill: "inv", tier: "p", label: "Research", activation: "long", vs: "dc", roll: "GM DC, 10 min–4 hr", text: "important lore" },
  readEnemyTai: { skill: "mar", tier: "p", label: "Read The Enemy (Taijutsu/Bukijutsu)", activation: "reaction", vs: "jutsuDC:tai", roll: "Athletics or Int (Martial Arts) vs caster's Taijutsu save DC, on seeing complex movements", text: "learn name/rank/targets; you or an ally: interpose the attack for an ally within 20 ft, or +1 to saves and AC vs it" },
  identifyTaijutsu: { skill: "mar", tier: "p", label: "Identify Taijutsu/Bukijutsu", activation: "action", vs: "jutsuDC+5", roll: "Str or Int (Martial Arts) vs save DC + 5", text: "name, rank, effects" },
  administerAid: { skill: "med", tier: "np", label: "Administer Aid", activation: "action", vs: "fixed:15+rank", roll: "DC 15 + 1 per rank of the condition", text: "remove 1 rank of Bleeding/Bruised/Concussed (+1 per 5 over); twice per creature per short rest" },
  stabilize: { skill: "med", tier: "p", label: "Stabilize", activation: "action", vs: "fixed:20", roll: "DC 20; +4 per failed death save (+2 if proficient, +0 with Mastery)", text: "stable at 0 HP" }, // Action (King 2026-11-07)
  treatWounds: { skill: "med", tier: "p", label: "Treat Wounds", activation: "long", vs: "tiered", roll: "tiered DC, 10 minutes", text: "heal by tier; once per short rest per creature" },
  quickAssessment: { skill: "med", tier: "p", label: "Quick Assessment", activation: "bonus", vs: "dc", roll: "GM DC", text: "learn exact HP and conditions" },
  identifyFloraFauna: { skill: "nat", tier: "np", label: "Identify Flora/Fauna", activation: "action", vs: "dc", roll: "GM DC", text: "identify it and its hazards" },
  findResources: { skill: "nat", tier: "p", label: "Find Resources", activation: "long", vs: "dc", roll: "GM DC, 1 hour", text: "1 toolkit Charge; once per long rest per kit" },
  forecast: { skill: "nat", tier: "p", label: "Forecast", activation: "long", vs: "dc", roll: "GM DC, 10 minutes", text: "one upcoming natural event" },
  ecologicalInsights: { skill: "nat", tier: "m", label: "Ecological Insights", activation: "long", vs: "dc", roll: "Hard DC, 8 hours", text: "advantage on Nature/Survival in the region" },
  extractVenom: { skill: "nat", tier: "kit", kit: "poison", label: "Extract Venom", activation: "action", vs: "dc", roll: "GM DC, 1 Charge, within 10 min of a kill", text: "1 dose of poison", nonCombat: true },
  castNinjutsuScroll: { skill: "nin", tier: "np", label: "Cast Ninjutsu Scroll", activation: "none", roll: "—", text: "D-Rank or lower; Proficient: B or lower; Mastery: any rank" },
  readEnemyNin: { skill: "nin", tier: "p", label: "Read The Enemy (Ninjutsu)", activation: "reaction", vs: "jutsuDC:nin", roll: "Int (Ninshou) vs caster's Ninjutsu save DC, on seeing a Ninjutsu's hand seals", text: "learn name/rank/targets; you or an ally: move up to 10 ft, or +1 to saves and AC vs it" },
  identifyNinjutsu: { skill: "nin", tier: "p", label: "Identify Ninjutsu", activation: "action", vs: "jutsuDC+5", roll: "Int (Ninshou) vs save DC + 5", text: "name, rank, effects" },
  chakraConduction: { skill: "nin", tier: "kit", kit: "sealing", label: "Chakra Conduction", activation: "none", vs: "dc", roll: "Medium DC, when crafting, 1 Charge", text: "crafted tool's save DC +1 on its next use" },
  search: { skill: "prc", tier: "np", label: "Search", activation: "action", vs: "contest:ste", roll: "vs Stealth result / Notice DC", text: "find a hidden creature or trap" },
  dangerSense: { skill: "prc", tier: "m", label: "Danger Sense", activation: "reaction", vs: "contest:initiative", roll: "contested Perception vs hostiles' highest initiative, Reaction to surprise", text: "not surprised" },
  perform: { skill: "prf", tier: "np", label: "Perform", activation: "action", roll: "—", text: "GM circumstance bonuses; audience tiers NP/P/M" },
  gatherInformation: { skill: "per", tier: "np", label: "Gather Information", activation: "long", vs: "dc", roll: "GM DC, 1–3 hours", text: "one fact" },
  makeImpression: { skill: "per", tier: "np", label: "Make an Impression/Request", activation: "long", vs: "dc:wis", roll: "vs target's Wisdom DC, 1 minute", text: "agrees (wants something; beat by 10 = free)" },
  haggle: { skill: "per", tier: "p", label: "Haggle", activation: "none", vs: "passive:ins", roll: "vs seller's passive Insight", text: "lower the price (fail by 5 raises it)" },
  upsell: { skill: "per", tier: "m", label: "Upsell", activation: "none", vs: "dc", roll: "GM DC", text: "sell at +25%" },
  palmObject: { skill: "slt", tier: "np", label: "Palm an Object", activation: "none", vs: "passive:prc", roll: "vs passive Perception / contested if watched", text: "hide the object" },
  steal: { skill: "slt", tier: "np", label: "Steal", activation: "none", vs: "passive:prc", roll: "vs passive Perception (−5 if in clothing)", text: "take a small object; auto-fail in combat or vs someone on guard" },
  plantObject: { skill: "slt", tier: "p", label: "Plant Object", activation: "action", vs: "passive:prc", roll: "vs passive Perception / contested", text: "plant it unnoticed" },
  practicedHands: { skill: "slt", tier: "m", label: "Practiced Hands", activation: "none", roll: "—", text: "Steal in combat or vs someone on guard at −5" },
  hide: { skill: "ste", tier: "np", label: "Hide", activation: "none", vs: "passive:prc", roll: "vs passive Perception of unaware creatures", text: "Hidden/Undetected; needs total cover, heavy obscurement, or darkness; not while seen" },
  sneak: { skill: "ste", tier: "np", label: "Sneak", activation: "move", vs: "passive:prc", roll: "vs passive Perception within 30 ft, moving while Hidden", text: "half speed; fail: they become aware and can Search" },
  blendIn: { skill: "ste", tier: "p", label: "Blend In", activation: "none", vs: "contest:prc", roll: "contested Stealth vs Perception", text: "hide in a crowd while seen" },
  senseDirection: { skill: "sur", tier: "np", label: "Sense Direction", activation: "none", vs: "dc", roll: "GM DC, once per 8 hours", text: "orientation" },
  coverTracks: { skill: "sur", tier: "p", label: "Cover Tracks", activation: "none", roll: "travel at half speed", text: "trackers must beat 10 + your Survival bonus" },
  track: { skill: "sur", tier: "p", label: "Track", activation: "none", vs: "dc", roll: "GM DC, half travel speed", text: "follow tracks 1 hour per check" },
  fieldDressing: { skill: "sur", tier: "kit", kit: null, label: "Field Dressing", activation: "none", vs: "dc", roll: "Medium DC, after a hunt", text: "advantage on the next Diplomatic Dining check" }
};
