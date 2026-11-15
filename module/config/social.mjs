/**
 * Social encounter tables (PRESTD1 Part F, SOCIAL1). Source: the Bingo Book, "Social Encounters".
 */

/** Attitudes (rank 1–5), their starting points (PoF negative, PoA positive) and Patience in rounds. */
export const socialAttitudes = {
  hostile: { rank: 1, label: "Hostile", start: -4, patience: 2 },
  unfriendly: { rank: 2, label: "Unfriendly", start: -2, patience: 2 },
  indifferent: { rank: 3, label: "Indifferent", start: 0, patience: 3 },
  friendly: { rank: 4, label: "Friendly", start: 2, patience: 4 },
  helpful: { rank: 5, label: "Helpful", start: 4, patience: 4 }
};

export const socialTypes = {
  diplomatic: { label: "Diplomatic", favors: "Convince and Resist",
    risk: "Using Coerce as a Primary Argument carries additional cost: +1 PoF regardless of whether the check succeeds.",
    outcomes: {
      critical: "The NPC agrees unconditionally and may offer additional assistance, information, or goodwill beyond what was requested.",
      success: "The NPC agrees to the request, likely with conditions or an expectation of something in return.",
      failure: "The NPC refuses but holds no ill will. They may be approached again later with a different approach or under different circumstances.",
      criticalFailure: "The NPC refuses and the relationship is damaged. They may become an obstacle in future interactions or warn others of the party's intentions."
    } },
  intrigue: { label: "Intrigue", favors: "Misdirect and Counter-Argue",
    risk: "Hidden Pitfall, Revealing True Purpose: +1 PoF and the party's next Primary Argument is made at disadvantage.",
    outcomes: {
      critical: "The NPC reveals full information and may become a recurring contact or informant.",
      success: "The NPC reveals partial information at the GM's discretion. They may attach their own agenda to what they share.",
      failure: "The NPC reveals nothing. They remain guarded and will not engage further on this topic.",
      criticalFailure: "The NPC shuts down completely. They may warn associates and could become a long-term obstacle."
    } },
  hostile: { label: "Hostile", favors: "Pressure and Resist",
    risk: "If the party does something genuinely egregious, the GM may end the encounter at the current point total.",
    outcomes: {
      critical: "The NPC becomes cooperative. This may produce a lasting improvement in their Social Attitude for future interactions.",
      success: "The NPC agrees to neutral terms — a ceasefire, an exchange, or temporary cooperation.",
      failure: "The NPC backs down but remains resentful. They will not help but will not act against the party immediately.",
      criticalFailure: "The NPC takes active negative action — initiating combat, alerting reinforcements, or pursuing a political or social consequence appropriate to the situation."
    } }
};

export const socialMotivations = ["Wealth / Profit", "Power / Authority", "Safety / Security", "Legacy / Reputation", "Loyalty / Honor",
  "Justice / Fairness", "Peace / Stability", "Recognition / Pride", "Knowledge / Curiosity", "Freedom / Independence",
  "Family / Loved Ones", "Revenge / Grievance"];

export const socialPitfalls = ["Disrespect / Condescension", "Public Embarrassment", "Coercion / Threats", "Dishonesty",
  "Impatience / Being Rushed", "Faction Association", "Undermining Authority", "Violating Oaths or Beliefs"];

/**
 * Player actions. Primary arguments roll the skill against the NPC's Standard DC (its statistic + 10,
 * King Q-P10): `dc` names the statistic ("save.wis", "skill.ins", "skill.dec"), or "gm" (a DC the GM
 * sets), or null (contested: the GM compares).
 */
export const socialActions = {
  impression: { label: "Make an Impression or Request", kind: "primary", skill: "per", dc: "save.wis" },
  lie: { label: "Lie or Impersonate", kind: "primary", skill: "dec", dc: "skill.ins" },
  coerce: { label: "Coerce", kind: "primary", skill: "itm", dc: "save.wis" },
  other: { label: "Other skill (GM-approved)", kind: "primary", skill: null, dc: "save.wis" },
  perform: { label: "Perform", kind: "support", skill: null, dc: null },
  sense: { label: "Sense Motive", kind: "support", skill: "ins", dc: "skill.dec" },
  recall: { label: "Recall Knowledge", kind: "support", skill: "his", dc: "gm" },
  seeThrough: { label: "See Through Lies", kind: "reaction", skill: "ins", dc: null }
};

/** NPC actions and reactions (the GM rolls them secretly; a success adds PoF). */
export const socialNpcActions = {
  convince: { label: "Convince", skills: ["per", "dec"], pof: 1 },
  misdirect: { label: "Misdirect", skills: ["dec"], pof: 2 },
  pressure: { label: "Pressure", skills: ["itm"], pof: 1 },
  resist: { label: "Resist (reaction)", skills: [], pof: 1 },
  counter: { label: "Counter-Argue (reaction)", skills: ["per", "dec"], pof: 1 }
};

export const socialOutcomeLabels = { critical: "Critical Success", success: "Success", failure: "Failure", criticalFailure: "Critical Failure" };
