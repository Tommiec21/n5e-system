/**
 * Effect field dictionary (UX1a; docs/UX1_SPEC.md): the plain-language layer over effect change keys.
 * The stored key never changes (n5e.unarmed.die); people see a name (Unarmed Damage Die), a category,
 * what it does, what to enter, an example and how it stacks. Descriptions stay at most 2 sentences.
 *
 * fieldInfo(key, N5E) returns the entry for any key changeKeyCatalog lists (rules/change-keys.mjs);
 * families of keys (every skill's mastery, every discipline's cost) share one template. A test fails
 * when a catalogue key has no entry, so new fields can't ship without a plain name.
 */

export const FIELD_CATEGORIES = ["Defense", "Attacks", "Damage", "Jutsu Cost", "Saves & DCs", "Skills & Mastery",
  "Speed & Movement", "Health & Chakra", "Ability Scores", "Other"];

const ADDS = "Adds to other bonuses of this kind.";
const LARGEST = "Only the largest one counts.";
const discName = { nin: "Ninjutsu", tai: "Taijutsu", gen: "Genjutsu", buki: "Bukijutsu", all: "All Jutsu" };
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
// A bonus that can be a number or dice (King 2026-11-16: Bless adds 1d4).
const dice = (what, extra = {}) => ({ enter: "A number (2, −1) or dice (1d4, −1d4).", example: "1d4", stacks: "Adds to other bonuses; dice are rolled with the roll.", what, ...extra });
const num = (what, example = "2", extra = {}) => ({ enter: "A number. Use a minus sign for a penalty.", example, stacks: ADDS, what, ...extra });

/** Fixed keys. */
const FIXED = {
  "n5e.dr": { name: "Damage Reduction", category: "Defense", words: "dr armor reduce", ...num("Reduces the damage you take from each hit by this much.") },
  "n5e.pierce": { name: "DR Pierce", category: "Attacks", words: "pierce penetrate armor", ...num("Your hits ignore this much of the target's Damage Reduction.") },
  "n5e.resist": { name: "Damage Resistance", category: "Defense", words: "resist resistance half", what: "You take half damage from one damage type.",
    enter: "Pick a damage type.", example: "fire", stacks: "Add one change per damage type." },
  "n5e.immune": { name: "Damage Immunity", category: "Defense", words: "immune immunity", what: "You take no damage from one damage type.",
    enter: "Pick a damage type.", example: "poison", stacks: "Add one change per damage type." },
  "n5e.vulnerable": { name: "Damage Vulnerability", category: "Defense", words: "vulnerable vulnerability double weak", what: "You take double damage from one damage type.",
    enter: "Pick a damage type.", example: "cold", stacks: "Add one change per damage type." },
  "n5e.conditionResist": { name: "Condition Resistance", category: "Defense", words: "condition resist resistance advantage save physical mental sensory elemental fatigue",
    what: "You make saving throws against this condition, or any condition in this group, with advantage.",
    enter: "Pick a condition or a condition group.", example: "group:physical", stacks: "Add one change per condition or group." },
  "n5e.conditionImmune": { name: "Condition Immunity", category: "Defense", words: "condition immune immunity physical mental sensory elemental fatigue",
    what: "This condition, or any condition in this group, can't be applied to you.",
    enter: "Pick a condition or a condition group.", example: "group:mental", stacks: "Add one change per condition or group." },
  "n5e.stateResist": { name: "State Resistance", category: "Defense", words: "state resist resistance advantage grappled restrained prone stunned",
    what: "You make saving throws against this state, including saves to end it, with advantage.",
    enter: "Pick a state, such as Grappled.", example: "grappled", stacks: "Add one change per state." },
  "n5e.stateImmune": { name: "State Immunity", category: "Defense", words: "state immune immunity grappled restrained prone stunned",
    what: "This state can't be applied to you.",
    enter: "Pick a state, such as Prone.", example: "prone", stacks: "Add one change per state." },
  "n5e.conditionVuln": { name: "Condition Vulnerability", category: "Defense", words: "condition vulnerable vulnerability disadvantage save physical mental sensory elemental fatigue",
    what: "Disadvantage on saving throws or checks against this condition, or any condition in this group.",
    enter: "Pick a condition or a condition group.", example: "group:mental", stacks: "Add one change per condition or group." },
  "n5e.stateVuln": { name: "State Vulnerability", category: "Defense", words: "state vulnerable vulnerability disadvantage grappled restrained prone stunned",
    what: "Disadvantage on saving throws or checks against this state.",
    enter: "Pick a state, such as Prone.", example: "prone", stacks: "Add one change per state." },
  "n5e.attack.all": { name: "All Attack Rolls", category: "Attacks", words: "hit to-hit attack bonus bless dice", ...dice("A bonus to every attack roll you make.") },
  "n5e.save.all": { name: "All Saving Throws", category: "Saves & DCs", words: "save saving throw bonus bless dice", ...dice("A bonus to every saving throw you make.") },
  "n5e.check.all": { name: "All Ability Checks", category: "Skills & Mastery", words: "check skill ability bonus guidance dice", ...dice("A bonus to every ability check and skill check you make.") },
  "n5e.initiative": { name: "Initiative Roll", category: "Other", words: "initiative turn order bonus dice", ...dice("A bonus to your initiative rolls.") },
  "n5e.dice.all": { name: "All Dice Rolls", category: "Other", words: "roll bonus all", ...num("A bonus to every roll you make, added once per roll.", "1") },
  "n5e.unarmed.dice": { name: "Unarmed Extra Damage", category: "Damage", words: "fist punch unarmed taijutsu extra dice", what: "Your unarmed strikes deal these extra dice of damage.",
    enter: "Dice, such as 1d8.", example: "1d8", stacks: ADDS },
  "n5e.unarmed.die": { name: "Unarmed Damage Die", category: "Damage", words: "fist punch unarmed taijutsu die size", what: "Sets your unarmed strike's damage die. It only applies if it's bigger than the die you already have.",
    enter: "A die, such as 1d10.", example: "1d10", stacks: LARGEST },
  "n5e.unarmed.step": { name: "Unarmed Damage Die Step", category: "Damage", words: "fist punch unarmed taijutsu die size step up down",
    what: "Moves your current unarmed damage die up or down: 1, 1d4, 1d6, 1d8, 1d10, 1d12. It stops at 1 and at 1d12.",
    enter: "Steps: 1 goes up one size, −1 goes down one.", example: "1", stacks: ADDS },
  "n5e.rankCost.tai": { name: "Taijutsu Cost by Rank", category: "Jutsu Cost", words: "fixed cost rank taijutsu", what: "Your Taijutsu cost a fixed amount by rank, treated as a Special cost.",
    enter: "Each rank and its cost, separated by commas.", example: "D:3,C:5,B:9,A:14,S:20", stacks: LARGEST },
  "n5e.reinforced": { name: "Reinforced", category: "Defense", words: "reinforced armor", ...num("Adds to your armor's Reinforced. Without armor, Reinforced equals your Taijutsu modifier plus this.", "1") },
  "n5e.fury.max": { name: "Max Fury", category: "Attacks", words: "fury bukijutsu", ...num("You can hold this many more Fury.", "1") },
  "n5e.saveTier.shift": { name: "Save Result Shift", category: "Saves & DCs", words: "tier degree success", what: "Moves your four-tier save results up or down a step.",
    enter: "1 to move up, −1 to move down.", example: "1", stacks: ADDS },
  "n5e.concentration.max": { name: "Max Concentration", category: "Other", words: "concentrate concentration jutsu", ...num("You can concentrate on this many more jutsu at once.", "1") },
  "n5e.mastery.initiative": { name: "Initiative Mastery", category: "Skills & Mastery", words: "initiative mastery rank", what: "Raises your mastery rank in initiative by one step.",
    enter: "Where it comes from, such as the Amp's name.", example: "White Wolf", stacks: "Each different source raises it one step." },
  "n5e.keywordAbility.medical": { name: "Medical Jutsu Ability", category: "Saves & DCs", words: "medical keyword ability", what: "Your Medical jutsu can use this ability when it's higher than their usual one.",
    enter: "Pick an ability.", example: "wis", stacks: LARGEST },
  "system.bonuses.ac": { name: "Armor Class", category: "Defense", words: "ac armor class", ...num("A bonus to your Armor Class.", "1") },
  "system.bonuses.initiative": { name: "Initiative (number only)", category: "Other", words: "initiative turn order", ...num("A bonus to your initiative rolls.", "2") },
  "system.bonuses.hpMax": { name: "Max HP", category: "Health & Chakra", words: "hit points hp health", ...num("Raises your maximum hit points.", "5") },
  "system.bonuses.cpMax": { name: "Max Chakra", category: "Health & Chakra", words: "chakra cp", ...num("Raises your maximum chakra points.", "5") },
  "system.bonuses.hpPerLevel": { name: "HP per Level", category: "Health & Chakra", words: "hit points hp level", ...num("Extra maximum hit points for each character level.", "1") },
  "system.bonuses.cpPerLevel": { name: "Chakra per Level", category: "Health & Chakra", words: "chakra cp level", ...num("Extra maximum chakra for each character level.", "1") },
  "system.bonuses.inventorySlots": { name: "Inventory Slots", category: "Other", words: "bulk carry inventory", ...num("Extra inventory slots.", "2") },
  "system.bonuses.speed": { name: "Speed", category: "Speed & Movement", words: "speed move movement walk", ...num("Adds to your walking speed, in feet.", "10") },
  "system.bonuses.save": { name: "All Saving Throws (number only)", category: "Saves & DCs", words: "save saving throw", ...num("A bonus to every saving throw you make.", "1") },
  "system.bonuses.check": { name: "All Ability Checks (number only)", category: "Skills & Mastery", words: "check skill ability", ...num("A bonus to every ability check and skill check you make.", "1") }
};

/**
 * The dictionary entry for a key, or null when it is unknown.
 * @returns {{name, category, what, enter, example, stacks, words}|null}
 */
export function fieldInfo(key, N5E = {}) {
  if ( FIXED[key] ) return FIXED[key];
  const parts = String(key).split(".");
  const last = parts.at(-1);
  const skill = N5E.skills?.[last]?.label, ability = N5E.abilities?.[last]?.label, tool = N5E.toolkits?.[last]?.label;
  let m;
  if ( (m = key.match(/^n5e\.(save|check)\.(str|dex|con|int|wis|cha)$/)) ) {
    const label = N5E.abilities?.[m[2]]?.label ?? m[2];
    return m[1] === "save"
      ? { name: `${label} Saves`, category: "Saves & DCs", words: `save saving throw ${label} dice`, ...dice(`A bonus to your ${label} saving throws.`) }
      : { name: `${label} Checks`, category: "Skills & Mastery", words: `check skill ${label} dice`, ...dice(`A bonus to ${label} checks and every ${label} skill.`) };
  }
  if ( (m = key.match(/^n5e\.critRange\.(\w+)$/)) ) {
    const what = { all: "all attacks", weapon: "weapon attacks", unarmed: "unarmed strikes" }[m[1]] ?? `${discName[m[1]] ?? m[1]} attacks`;
    return { name: `Critical Range (${cap(what)})`, category: "Attacks", words: "crit critical range", what: `Your ${what} score a critical hit on a lower roll; 1 means 19–20.`,
      enter: "A number from 1 to 3.", example: "1", stacks: `${ADDS} The total can't go past 3.` };
  }
  if ( (m = key.match(/^n5e\.cost\.(all|nin|tai|gen|buki)$/)) ) {
    return { name: `${discName[m[1]]} Cost`, category: "Jutsu Cost", words: "chakra cost price", what: `Changes the chakra cost of ${m[1] === "all" ? "every jutsu" : `your ${discName[m[1]]}`}.`,
      enter: "A number (−2), or *0.5 to halve it, or /2.", example: "-2", stacks: ADDS };
  }
  if ( (m = key.match(/^n5e\.cost\.rank\.(\w+)$/)) ) {
    return { name: `${m[1]}-Rank Jutsu Cost`, category: "Jutsu Cost", words: "chakra cost rank", what: `Changes the chakra cost of your ${m[1]}-Rank jutsu.`,
      enter: "A number (−2), or *0.5 to halve it, or /2.", example: "-2", stacks: ADDS };
  }
  if ( (m = key.match(/^n5e\.cost\.keyword\.(.+)$/)) ) {
    const label = N5E.keywords?.[m[1]]?.label ?? cap(m[1]);
    return { name: `${label} Jutsu Cost`, category: "Jutsu Cost", words: `chakra cost keyword ${label}`, what: `Changes the chakra cost of your ${label} jutsu.`,
      enter: "A number (−2), or *0.5 to halve it, or /2.", example: "-2", stacks: ADDS };
  }
  if ( (m = key.match(/^n5e\.upkeep\.(all|nin|tai|gen|buki)$/)) ) {
    return { name: `${discName[m[1]]} Upkeep`, category: "Jutsu Cost", words: "upkeep concentration cost", what: `Changes the chakra you pay each turn to keep concentrating on ${m[1] === "all" ? "jutsu" : discName[m[1]]}.`,
      enter: "A number. Use a minus sign to lower it.", example: "-1", stacks: ADDS };
  }
  if ( (m = key.match(/^n5e\.saveDC\.(all|nin|tai|gen)$/)) ) {
    return { name: `${discName[m[1]]} Save DC`, category: "Saves & DCs", words: "dc save difficulty", ...num(`Raises the save DC of ${m[1] === "all" ? "every jutsu" : `your ${discName[m[1]]}`}.`, "1") };
  }
  if ( (m = key.match(/^n5e\.attack\.(nin|tai|gen)$/)) ) {
    return { name: `${discName[m[1]]} Attack Rolls`, category: "Attacks", words: "hit to-hit attack jutsu dice", ...dice(`A bonus to your ${discName[m[1]]} attack rolls.`) };
  }
  if ( (m = key.match(/^n5e\.(attack|damage)\.(weapon|unarmed)$/)) ) {
    const what = m[2] === "weapon" ? "weapon" : "unarmed";
    return m[1] === "attack"
      ? { name: `${cap(what)} Attack Rolls`, category: "Attacks", words: `hit to-hit dice ${what} ${what === "unarmed" ? "fist punch" : "bukijutsu"}`, ...dice(`A bonus to your ${what} attack rolls.`) }
      : { name: `${cap(what)} Damage`, category: "Damage", words: `damage ${what} ${what === "unarmed" ? "fist punch" : "bukijutsu"}`, ...num(`A bonus to your ${what} damage rolls.`, "2") };
  }
  if ( (m = key.match(/^n5e\.disciplineAbility\.(nin|tai|gen)$/)) ) {
    return { name: `${discName[m[1]]} Ability`, category: "Saves & DCs", words: "ability modifier casting", what: `Your ${discName[m[1]]} use this ability for attacks and DCs.`,
      enter: "Pick an ability.", example: "wis", stacks: LARGEST };
  }
  if ( (m = key.match(/^n5e\.keywordAbility\.discipline:(nin|tai|gen)$/)) ) {
    return { name: `${discName[m[1]]} Ability (when higher)`, category: "Saves & DCs", words: "ability modifier casting higher", what: `Your ${discName[m[1]]} can use this ability when it's higher than their usual one.`,
      enter: "Pick an ability.", example: "cha", stacks: LARGEST };
  }
  if ( (m = key.match(/^n5e\.keywordAbility\.(.+)$/)) ) {
    const label = N5E.keywords?.[m[1]]?.label ?? cap(m[1]);
    return { name: `${label} Jutsu Ability`, category: "Saves & DCs", words: `keyword ability ${label}`, what: `Your ${label} jutsu can use this ability when it's higher than their usual one.`,
      enter: "Pick an ability.", example: "wis", stacks: LARGEST };
  }
  if ( key.startsWith("n5e.mastery.") ) {
    if ( key.startsWith("n5e.mastery.check.") && ability ) {
      return { name: `${ability} Check Mastery`, category: "Skills & Mastery", words: `mastery rank ability check skills ${ability}`,
        what: `Raises your mastery in ${ability} checks and every ${ability} skill by one step.`,
        enter: "Where it comes from, such as the Amp's name.", example: "White Wolf", stacks: "Each different source raises it one step, together with each skill's own sources." };
    }
    const label = key.startsWith("n5e.mastery.skill.") ? skill : key.startsWith("n5e.mastery.save.") ? `${ability} Save` : key.startsWith("n5e.mastery.tool.") ? tool
      : key.startsWith("n5e.mastery.attack.") ? `${discName[last]} Attack` : null;
    if ( !label ) return null;
    return { name: `${label} Mastery`, category: "Skills & Mastery", words: `mastery rank proficiency ${label}`, what: `Raises your mastery rank in ${label} by one step.`,
      enter: "Where it comes from, such as the Amp's name.", example: "White Wolf", stacks: "Each different source raises it one step." };
  }
  if ( (m = key.match(/^system\.bonuses\.(attack|saveDC)\.(nin|tai|gen)$/)) ) {
    return m[1] === "attack"
      ? { name: `${discName[m[2]]} Attack Rolls (core)`, category: "Attacks", words: "hit attack jutsu", ...num(`A bonus to your ${discName[m[2]]} attack rolls.`, "1") }
      : { name: `${discName[m[2]]} Save DC (core)`, category: "Saves & DCs", words: "dc save", ...num(`Raises your ${discName[m[2]]} save DC.`, "1") };
  }
  if ( (m = key.match(/^system\.abilities\.(\w+)\.value$/)) ) {
    const label = N5E.abilities?.[m[1]]?.label ?? m[1];
    return { name: `${label} Score`, category: "Ability Scores", words: `ability score ${label}`, what: `Changes your ${label} score.`,
      enter: "A number. Add raises it; Override sets it.", example: "2", stacks: "Follows the mode (Add or Override)." };
  }
  return null;
}

/** Plain labels for Foundry's change modes (core fields only; King Q-U1 hides them for N5e fields). */
export const MODE_LABELS = { 0: "Custom", 1: "Multiply", 2: "Add", 3: "Lower to (if smaller)", 4: "Raise to (if larger)", 5: "Set to" };
