/**
 * Rules text for each condition and State (KB 05 tables), shown in condition links and tooltips
 * (module/applications/enrichers.mjs). Generated from the KB by hand-run script; edit freely.
 *   text  what it does (per rank where ranked)
 *   ends  how it decays or ends ("" when the table gives nothing)
 */
export const conditionText = {
  "exhaustion": {
    "text": "−1 to all dice rolls, −1 AC, −1 all save DCs per rank; dies above 10",
    "ends": "Long rest −2 (with food and drink); removal effects remove 1 rank unless stated"
  },
  "envenomed": {
    "text": "−1 AC per rank; can't regain HP; no rest benefits",
    "ends": "Poison-immune creatures immune"
  },
  "burned": {
    "text": "1d8 fire per rank at start of each turn",
    "ends": "Action + DC 15 Dex or Con check ends; full submersion ends"
  },
  "chilled": {
    "text": "once per turn, willingly moving >5 ft → 1d10 cold per rank",
    "ends": "Action + DC 15 Dex/Con check ends"
  },
  "corroded": {
    "text": "DR reduced by inflicting jutsu rank: D −2, C −4, B −6, A −8, S −10",
    "ends": "Action + DC 15 check; submersion ends"
  },
  "shocked": {
    "text": "max one attack or one jutsu per turn",
    "ends": "loses 1 rank at end of each of its turns"
  },
  "petrified": {
    "text": "Incapacitated, can't move/speak, unaware; attacks vs it adv; auto-fail Str/Dex saves; resistance to all damage; immune poison/disease (suspended); weight ×10",
    "ends": "dispel"
  },
  "bruised": {
    "text": "takes +4 damage from all sources",
    "ends": "Action + DC 15 Str check ends"
  },
  "staggered": {
    "text": "no Disengage/Dash/Dodge; disadvantage on Str/Dex/Con attacks, saves, checks; any [Dojutsu] or Sensory-keyword jutsu on it is dispelled",
    "ends": "ends at end of its next turn"
  },
  "bleed": {
    "text": "1d6 necrotic per rank at start of its turn (creatures or objects)",
    "ends": "Action + DC 20 Medicine removes 1 rank, +1 per 2 over"
  },
  "dazed": {
    "text": "move OR action, not both; no bonus action",
    "ends": "end of its next turn"
  },
  "shaken": {
    "text": "−1 per rank to d20 rolls using Str/Dex/Con",
    "ends": "loses 1 rank at end of each of its turns"
  },
  "weakened": {
    "text": "damage it deals −4 per rank",
    "ends": "dispel"
  },
  "concussed": {
    "text": "−1 to all its save DCs per rank",
    "ends": "Action + Medicine kit + DC 20 Medicine ends (all ranks)"
  },
  "demoralized": {
    "text": "−1 per rank to d20 rolls using Int/Wis/Cha",
    "ends": "loses 1 rank at end of each of its turns"
  },
  "berserk": {
    "text": "nearest creature (not compeller) is priority target; random tie",
    "ends": "end of its next turn"
  },
  "charmed": {
    "text": "attitude toward compeller +1 (D/C), +2 (B/A), +3 (S); no hostile actions vs compeller",
    "ends": "ends if compeller or allies harm it"
  },
  "confused": {
    "text": "can't cast HS jutsu",
    "ends": "end of its next turn"
  },
  "slowed": {
    "text": "half speed, no speed bonuses, no reactions; can't cast jutsu with more than 2 components",
    "ends": "end of its next turn unless stated"
  },
  "sealed": {
    "text": "+4 base chakra cost of Ninjutsu & Genjutsu per rank; 3+ ranks: can't teleport",
    "ends": "Action + DC 20 Ninshou removes 1 rank; failure raises DC by 4"
  },
  "blinded": {
    "text": "can't target/select others without Blindsight/Tremor Sense/Chakra Sensing; no [Dojutsu] features; auto-fail sight checks; dis on Dex/Int/Wis saves; attacks vs it adv, its attacks dis (unless those senses)",
    "ends": "voluntary: close eyes (free action) until start of next turn"
  },
  "dazzled": {
    "text": "−2 per rank to checks and attacks; can't gain advantage on attacks; attack/jutsu ranges halved (min 5 ft)",
    "ends": "Action + DC 15 Con check removes all ranks"
  },
  "invisible": {
    "text": "impossible to see without a special sense; counts as heavily obscured for hiding; location betrayed by noise or tracks; attacks vs it have disadvantage and its attacks have advantage unless the other creature perceives it with a special sense (Chakra Sight sees jutsu invisibility; True Sight sees all)",
    "ends": "per source (e.g. Invisibility Genjutsu)"
  },
  "deafened": {
    "text": "auto-fail hearing checks; −10 Perception; hidden creatures needn't reroll Stealth vs it",
    "ends": "voluntary: cover ears (BA, both hands) until start of next turn"
  },
  "observed": {
    "text": "Created/ended by Hide, Sneak, Search (Ch6)",
    "ends": ""
  },
  "hidden": {
    "text": "Created/ended by Hide, Sneak, Search (Ch6)",
    "ends": ""
  },
  "undetected": {
    "text": "Created/ended by Hide, Sneak, Search (Ch6)",
    "ends": ""
  },
  "alert": {
    "text": "from detecting hostiles, warnings, Search, or entering combat; can't be Surprised by known creatures; doesn't reveal hidden ones",
    "ends": ""
  },
  "bloodied": {
    "text": "current HP ≤ half max",
    "ends": ""
  },
  "drained": {
    "text": "current CP ≤ half max",
    "ends": ""
  },
  "surprised": {
    "text": "no move, Action or BA on first turn; no Reaction until end of that turn; ends at end of round 1",
    "ends": ""
  },
  "inCombat": {
    "text": "while part of an initiative encounter",
    "ends": ""
  },
  "engaged": {
    "text": "after either makes a melee attack vs the other; ends after a full round without one",
    "ends": ""
  },
  "prone": {
    "text": "crawl only (+1 ft per ft); its attacks dis; ranged attacks vs it dis; melee within 5 ft adv; stand = half speed",
    "ends": ""
  },
  "grappled": {
    "text": "speed 0, no speed bonuses; can't use hands (no HS, items, hand weapon attacks); can't grapple; ends if grappler releases, is Incapacitated/Grappled, uses a hand, or target moved out of reach. Grappler uses both hands (no HS etc.), drags target (difficult terrain)",
    "ends": ""
  },
  "restrained": {
    "text": "Grappled + attacks vs it adv, its attacks dis, no HS or actions needing body movement; ends with Grappled",
    "ends": ""
  },
  "suffocating": {
    "text": "hold breath Con mod minutes (min 30 s); in combat Con mod turns (min 1); then drops to 0 HP and Dying",
    "ends": ""
  },
  "incapacitated": {
    "text": "no actions or reactions; can't maintain concentration or Mold Chakra",
    "ends": ""
  },
  "stunned": {
    "text": "Incapacitated, can't move, faltering speech; auto-fail Str/Dex saves; attacks vs it adv",
    "ends": ""
  },
  "unconscious": {
    "text": "Incapacitated, can't move/speak, unaware; drops items, Prone; auto-fails all saves; attacks vs it adv; hits within 5 ft are crits",
    "ends": ""
  },
  "stabilized": {
    "text": "Unconscious at 0 HP, no death saves; ends on healing; damage → Dying",
    "ends": ""
  },
  "dying": {
    "text": "at 0 HP, Unconscious, death saves",
    "ends": ""
  },
  "dead": { "text": "dead", "ends": "" },
  "dodging": { "text": "Dodge action: attacks against you have disadvantage if you can see the attacker, and you have advantage on Dex saves; lost while incapacitated or at speed 0", "ends": "start of your next turn" },
  "helped": { "text": "Help action: advantage on your next ability check or attack roll", "ends": "after that roll" },
  "furious": { "text": "Fury: gained the first time each turn you deal Weapon damage (Binding Fury Stance); kept until the end of the turn after gaining it; spent by Bukijutsu that call for it", "ends": "end of the turn after it was gained" }
};
