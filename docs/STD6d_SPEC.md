# STD6d function spec: classes as data

Status: **King 2026-11-15: "push Feats to the end and start work on using the new Active Effects system to actually automate class features … continue. Stop after the first two classes are complete." Medical-Nin built (0.48.0-alpha.1) and Ninjutsu Specialist built (0.49.0-alpha.1); King 2026-11-15 "Lets move on to STD6d": Taijutsu Specialist built (0.55.0-alpha.1); King 2026-11-21 "Then let's work on next Batch": Weapon Specialist built (0.74.0-alpha.1). Next: Scout-Nin, Hunter-Nin, Genjutsu Specialist.**

Plan: `docs/STD_SPEC.md` (STD6d, the class pass; this is FEATAUTO1 under the contract, `docs/FEATAUTO1_SPEC.md`). Order changed by King: feats (STD6c) move to the end, after the jutsu pass.

## How a class is done

- **One table per class:** `content/automation/<class>.json`, one entry per feature (keyed by identifier): `status`, `rules` (elements and notes), `castOptions`, `activities`, `pools`, `effects` (transfer or action effects), `flags`.
- **Applied by** `node tools/content/apply-automation.mjs`; `npm run check` fails when a feature of the class has no entry, an entry is invalid, or the table isn't applied.
- **Every listed feature is marked `flags.n5e.reviewed`:** its text is display only (no buttons guessed from it).
- **Review table:** `node tools/report-class-automation.mjs` writes `docs/classes/<class>-automation.md`: each feature in level order, core first, then each subclass, with its status, what is automated and what stays at the table.
- **Statuses:** automated (all mechanics are data), partly automated (some), notes only (table calls, written on the Notes tab), no mechanics (a choice made at level-up).
- **Source of truth:** the tables. `tools/content/automation.py` and `build-class-expansion.mjs` must not be rerun over reviewed classes.
- No rule changes. Where the text is unclear, the feature keeps a note and the question is listed below.

## Engine additions (generic; no class or feature named)

| # | Addition | Behaviour |
| --- | --- | --- |
| D1 | Jutsu roll facts | Rolls from a cast card carry `jutsu`, `jutsu:keyword:<k>`, `jutsu:rank:<R>`, `jutsu:discipline:<d>` (`rules/jutsu-facts.mjs`), for element predicates. |
| D2 | Elements on healing | Healing buttons apply the caster's and the card's elements: modifier, maximizeDice, minimumDie, rerollBelow (selector `healing`). |
| D3 | Rank-valued action effects | `"@rankValue"` (also `+N`, `*N`) in an action effect's element value becomes the cast rank's number when copied onto the card. |
| D4 | Cast option additions | `castAs` ("bonus" or "reaction": a 1-Action cast becomes that), `actionEffect` (the one action effect of the feature this option brings), `appliesTo.namePrefix`, `appliesTo.maxRank` (a rank or `lvl(level:rank,...)`). Quickened and Reactive Ninjutsu now use `flags.n5e.castAs`; their identifiers are out of `cast-plan.mjs` (allowlist 19 → 17). |
| D5 | Change keys | `n5e.keywordAbility.<keyword>` (jutsu with the keyword may use the ability when higher: Medical Release), `n5e.unarmed.die` (the Unarmed die becomes this when larger: Battle Medic). |
| D6 | Effect activities | Carry any rule element (the schema no longer drops fields), and resolve `@scale.<class>.<column>` in change values. |
| D7 | Automation tab | Lists cast options; action effects' elements are labelled as action effects. |
| D8 | Text fallback | Off for reviewed features. |
| D9 | Clash facts | Clash checks carry `clash`, the side's own jutsu facts and `clash:against:keyword:<k>` for the other jutsu (the Breaker features). |
| D10 | Concentration facts | Concentration checks carry `concentration` and `concentration:discipline:<d>`. Flow's advantage moved from a state check in `apply-damage.mjs` to an element on its effect. |
| D11 | Zero cost | Cast option `costDelta: "zero"`: cast at 0 cost (not a cost reduction, so Crash allows it). |
| D12 | `maximizeAfter` element | After the damage roll, up to N of the first part's dice count as their maximum (the lowest, as the roller would pick): Potent Ninjutsu. |
| D13 | Level-scaled element values | `"lvl(6:2,10:4,18:6)"` as an element's value is read at its owner's level. |
| D14 | Automation tab | Shows a Molding's casting-time change (`flags.n5e.castAs`). |
| D15 | Pool die by level | A pool's `die` may be `lvl(1:6,7:8,13:10,19:12)`: read at the owner's level (Martial Dice). |
| D16 | Pool die in formulas | Roll data `@pools.<id>.{value,max,faces}`: `(@amount)d@pools.martialDice.faces` rolls the dice spent at their current size. |
| D17 | Best-of-abilities values | A rule element's value `mod(int,wis,cha)` is the highest of those modifiers (Agile's initiative bonus). |
| D18 | Fixed cost by rank | Change key `n5e.rankCost.<scope>` ("D:3,C:5,B:9,A:14,S:20"): the jutsu costs that for its cast rank, as a Special cost (no reductions); a jutsu already Special keeps its own (Unwasted Movements). |
| D19 | Unarmed fact | The Unarmed Strike item's damage rolls carry `weapon:unarmed` (Sustained Pressure's predicate). Table effects may require a stance (`requiresStance`). |
| D20 | Class option facts | A class's level-up options are roll facts: `option:<key>:<value>` (Weapon Focus: `option:weaponFocus:blade`; "Thrown/Ammunition" is `thrown-ammunition`). With a weapon's `weapon:group:<g>`, an element can name "your Weapon Focus". |
| D21 | Pool cost formulas | An activity cost's `formula` replaces its amount: by level (`lvl(1:1,11:2,20:3)`) or rolled (`1d12`, posted to chat): the Obsidian Ward regains Flurry Dice. |
| D22 | Replaced imported effects | A table entry's `dropEffects` removes the feature's imported effects of those names (Critical Focus's blanket +1 on all Bukijutsu). |

## Medical-Nin (0.48.0-alpha.1)

Review table: `docs/classes/medical-nin-automation.md` (51 features: 5 automated, 22 partly automated, 23 notes only, 1 no mechanics).

Highlights:
- **Medical Release:** Medical jutsu use Wisdom for attack and save DC when higher.
- **Medical Domain:** Preserve Life and Take Life are cast options that spend a Domain Charge; Preserve Life maximizes healing dice equal to the cast rank.
- **Hematoxic Touch:** +rank damage and 1s and 2s rerolled on the Medical jutsu's damage.
- **Battle Medic:** d12 Unarmed die and +1 critical range (+2 at 10th) on the state; Strength of 100 and Strength of 1000 enter it with 2d12, Mastery on Strength saves and (1000) DR.
- **Chakra Enhanced Combat, Entropic Combatant:** two attacks per Attack action.
- **Reapers Techniques:** Grim jutsu cast as a Bonus Action up to D (C at 10th, B at 18th).
- **Pools:** Healing Surges 3→5 at 10th, Blight 3→5 at 10th, Byakugou Seals 4→6→8.
- **New buttons:** Battle Surge, Healing Burst, Vitality Guard, Overflow, Mending Spark, Vital Transference, Condition Break, Septic Detonation, Malignant Barrier, Rotting Pulse, Plague Doctor, Life Pulse, Hemorrhage Vitality, Curse of the Reaper, Gravetouched, Jashin's Harvest, Transmuted.
- **Toxic Tongue:** immunity to Corroded.

## Ninjutsu Specialist (0.49.0-alpha.1)

Review table: `docs/classes/ninjutsu-specialist-automation.md` (84 features: 19 automated, 24 partly automated, 39 notes only, 2 no mechanics).

Highlights:
- **Flow:** a Focus at the start of your turn and advantage on Ninjutsu concentration checks are on its effect.
- **Ninjutsu Master:** Crash (Perfected) and Flow (Perfected) buttons for 4 Focus.
- **Scholar:** Ninshou Mastery at 2nd, 7th and 13th level.
- **Chakra Compression:** 0-cost D-Rank (C-Rank at 17th) casting for 1 Focus from 11th level.
- **Counter Seal:** +2 to the save as a reaction.
- **Potent Ninjutsu:** counts the three lowest dice as their maximum.
- **Breakers:** Tidebreaker, Breeze, Current, Blaze and Terra Breaker give advantage on Clash checks against the right Release.
- **Battle-state variants (each enters Crash as usual):** Overheat and Burnout (+2/+4/+6 Fire Release damage), Herald and Typhoon (fly 40 ft, attackers' bonus and critical range), Maelstrom and Abyss.
- **New pools:** Tension (Seismic Tether: Gain Tension, Stone Bind, Grit) and Pressure (Tempest Pressure: Build Pressure, Gale Burst, Sharpening, Dragwind).
- **Cast dialog Moldings:** Crimson Kindling, Gigawatt Pulse, Tectonic Mantle, Pressure Stagnation, the 18th-level Moldings and the Summoner's techniques. Rule Breaker casts the Summoning Technique as a Bonus Action.
- **Shift Tides** stances as effects.

## Taijutsu Specialist (0.55.0-alpha.1)

Review table: `docs/classes/taijutsu-specialist-automation.md` (84 features: 7 automated, 52 partly automated, 23 notes only, 2 no mechanics).

Highlights:
- **Martial Dice:** the die follows Martial Strength (d6, d8 at 7th, d10 at 13th, d12 at 19th); every Martial Die button rolls at the current size; Martial Technique buttons that spend "up to N" ask how many.
- **Martial Technique (in a Taijutsu stance):** Martial Strength's Unarmed die and Unwasted Movements' fixed Special costs.
- **Chakra Valves:** Sustained Pressure (a Martial Die on every unarmed damage roll this turn) and Valve Break (rank Martial Dice).
- **Agile, Iron Body, Iron Will, Mastery of Self, Enhanced Movement:** initiative, saving throw Mastery, condition immunities, speed.
- **Paths of Perfection:** Elite (+1 to hit) and Devastating (+1 crit range) as action effects; Protective, Furious, Brutal and The New Era as before.
- **Moment of Stillness:** the three breakers (2 Martial Dice) with their markers; Balance Broken's Strength-save disadvantage.
- **Disturbance:** Momentum (4, 6 from 10th) and its spends. **Nin-Tai:** Elemental Cloak and the Unchecked Power techniques. **Passionate:** DYNAMIC FORM!, Tempo (3, 5 from 10th) and its spends, Training Weights. **Stancer:** Style Shift, Dodge Cancel. **Talented Genius:** Flawless, Perfection (4, 6 from 10th) and its spends, Shattered, Flawless Power, Genius Technique.
- **Stance Expertise options:** their benefits are on the stance items; the class options are notes.

- **Text issues** (for the errata list): Extra Attack contains the Balance Broken definition; Iron Body ends with the class design note; Genius Talent has a broken sentence ("You can only use each Flawless"); Bone Broken and Flow Broken are not defined anywhere in the class text.

## Weapon Specialist (0.74.0-alpha.1)

Review table: `docs/classes/weapon-specialist-automation.md` (101 features: 2 automated, 85 partly automated, 9 notes only, 5 no mechanics).

Highlights:
- **Discipline:** the pool (2 at 1st, by the class table; back on any rest). Deflection, Chakra Strike, Chained Momentum (gain Chain, or shift it for 2) and a Regain Discipline (Chain) button. Saves use your Taijutsu DC; the Flurry Die is a d12.
- **Every Kata** has a button that spends its Discipline (once per turn where the text says so), with the save, dice or effect it calls for: Battle Boast, Disorienting Strike, Muted Strike, Horrid Aggression, Executioner (with the Cripple save), Overwhelming Malice's stance with Retributive Strike and Pensive Shot, Sensory Augmentation (blindsight or tremorsense), Strider, Elite Focus (and its upkeep), and the rest.
- **Efficient Bukijutsu:** a cast dialog option, 1 Discipline for −1 cost a rank. **Chaining Adept:** Chain 2's reduction as a cast option, Chain 3's temporary HP as a button.
- **Critical Focus:** +1 critical range (+2 at 11th, +3 at 18th) only with your Weapon Focus group, weapon and Taijutsu attacks (D20). The imported +1 on every Bukijutsu is removed (D22).
- **Doctrines:**
  - Seeker: Vector Seal (two from 10th), Triangulation's +1 on ranged Bukijutsu attacks, Course Correction, Crossfire Aim, Dread Ambusher, Sharpshooting Savant, Seeker of the End.
  - Reaver: Quarry (two from 17th) with +1/+2/+3 [Weapon Damage] against it, Reaver Echoes (the condition card), Kenjutsu, Severance, Delayed Displacement, Reaver's Judgement.
  - Obsidian Guard: the Obsidian Ward pool (11 + level, + proficiency from 10th) and Ward Restoration rolling Flurry Dice into it (D21), Aura of Protection (+1/+2 AC and saves to allies), Provoke (more creatures by level), Obsidian Bulwark, Guardian Force.
  - Fang Breaker: Battle Trance (the AMP1d cards), Savage Assault with Shaken (Okuri-Inu Fang) and Hobbled, Savage Exploits (1 less from 17th), Titanic Wrath.
  - Battle Dancer: Waltz and Samba (the AMP1d cards), Move in Tandem, Cascade Step, Defensive Dance, Flourish!, Twin Step, Spectacular Form, Dance of the Dawn.
  - Primal Weapon: Primal Strikes, Chained Cascade (3 Discipline), Primal Weapon Mastery, Reflective Sunder, Break and Reinforce the Seal.
- **At the table:** the Obsidian Ward taking damage first; Deflection's reduction; Temporary Discipline (Aggressive Reprisal); Dauntless's −1 Kata cost; the Superior Discipline upgrades (notes on each).

- **Text issues** (for the errata list): Superior Discipline contains the class design note; Chained Cascade contains its Battle Amp box; Burst Echo deals damage with no save stated.

## Questions for King (answer when convenient; nothing waits on them)

- **Q-D1 Toxic Tongue:** "immunity to the Poisoned and Corroded conditions": N5e has no Poisoned condition. Is it Envenomed? (Only Corroded is automated.)
- **Q-D2 Take Life:** "5 + your Medical-Nin level": the button uses the character level (the same unless multiclassed). OK?
- **Q-D3 Battle Medic:** its box sits in Chakra Enhanced Combat (6th level), but its D-Rank line ("C-Rank at 6th") reads as from 2nd level. I put the d12 die and critical range on Battle Medic from 2nd level. Correct?
- **Q-D4 Preserve Life:** maximizes dice equal to the rank the jutsu is cast at (an upcast counts). Correct?
- **Q-D5 Potent Ninjutsu:** "after damage is rolled, select up to 3 damage dice, treat each as its maximum": the card counts the three lowest dice as their maximum (what a player would pick). OK?
- **Q-D6 Battle-state variants** (Overheat, Burnout, Herald, Typhoon, Maelstrom, Abyss, Crash and Flow Perfected): each is a button that enters Crash (or Flow) with its extras and cost, used instead of the plain Enter Crash. Burnout and Typhoon also need the base variant's cost (1 Pyroclasm, 1 Pressure), noted on the button. OK?
- **Q-D8 Bone Broken and Flow Broken:** Balance Broken is defined (inside Extra Attack), but Bone Broken and Flow Broken aren't defined in the class text. What do they do? (They are markers on the creature for now.)
- **Q-D9 Martial Die size:** the die follows Martial Strength by level (d6/d8/d10/d12) even when a stance's Expertise sets your Unarmed die to d6 or you're outside a stance. Correct?
- **Q-D10 Unwasted Movements:** a Taijutsu cast at a higher rank costs that rank's value (a D-Rank cast at C costs 5), and a Taijutsu whose cost is None also gets the fixed cost. Correct?
- **Q-D11 Martial Strength and Unwasted Movements** also apply "while wielding a weapon you are proficient in". Only the stance case is automated; is the weapon case meant for Bukijutsu users (and should it be automated too)?
- **Q-D12 Saving throw Mastery:** Iron Body (2 ranks of Con at 13th) plus Mastery of Self (1 more) is 3 ranks of Con at 20th, and Iron Will plus Mastery of Self is 3 ranks of Wis. Is that intended?
- **Q-D13 Quivering Strike:** the damage card is posted with each end-of-turn save; on a success it isn't applied. OK?
- **Q-D7 Breakers:** advantage on Clash checks only when the jutsu you clash with is a Ninjutsu of the Release against the other's Release. Correct?
- **Q-D14 Weapon Focus "Thrown/Ammunition":** the cards count weapons of the Thrown and the Ammunition groups. Does a weapon with only the Thrown property (outside those groups) count too?
- **Q-D15 Critical Focus:** "+1 rank of the Critical property" is read as +1 critical range (+2 at 11th, +3 at 18th), capped at +3 with everything else. Correct?
- **Q-D16 Blitz:** Chakra Strike without the Discipline cost adds half the Flurry Dice: the button rounds up (1 at 9th, 2 at 11th and 15th, 3 at 20th). Round up or down?
- **Q-D17 Burst Echo:** no saving throw is stated; the button applies the 2d12 to each creature within 5 feet of the point. Is a save missing?
- **Q-D18 Dauntless and Titanic Wrath:** the −1 Discipline cost (all Katas at 20th; Savage Exploits at 17th) is built into the Savage Exploits buttons only; Katas at 20th are paid 1 less at the table. Should the Kata buttons cost 1 less from 20th too?
- **Text issues** (for the errata list): Counter Seal contains the Flow (Perfected) box; Perfected Surge contains the Crash (Perfected) box; Tag-Team contains the Crash and Flow Duality boxes; the Summoner subclass is marked non-final in its design note.
- **Earlier text issues** (for the errata list): Hematoxic Touch contains Toxic Chakra's Blighted definition; Chimeric Mutation contains the 10th-level Transfiguration lead-in; Transmogrified Biology ends with the Ninjutsu Specialist class table; Chakra Enhanced Combat holds the Battle Medic box.

## Progress log

- 2026-11-15 Claude: spec written with King's direction; engine D1–D8 and Medical-Nin built, published 0.48.0-alpha.1 (with Great Weapon Stance's tripled modifier, King). Tests: `tests/core/class-automation.test.mjs`, `tests/std6d.test.mjs`.
- 2026-11-15 Claude: engine D9–D14 and Ninjutsu Specialist built, published 0.49.0-alpha.1. The rider applier now compares flags regardless of key order (both tables write Gale Fracture's flags). Stopped after two classes (King). Suites: 568 (566 pass, 2 skipped) and 175 pass.
- 2026-11-15 King: Q-D3 2nd level was correct. ENG1 (`docs/ENG1_SPEC.md`) comes next: the missing capabilities, then these classes are redone.
- 2026-11-15 King: Q-D1 Envenomed (Toxic Tongue now gives immunity to Envenomed and Corroded; ships with the next release); Q-D2 character level is right (no multiclassing in N5e); Q-D4–Q-D7 correct; Q-D3 asked for an explanation.
- 2026-11-15 King: "Lets move on to STD6d". Claude: engine D15–D19 and Taijutsu Specialist built, published 0.55.0-alpha.1. Suites 589 and 180 pass.
- 2026-11-15 King: Q-D8 Bone Broken and Flow Broken are class conditions, to be built with the class and clan conditions system (`docs/CCOND1_SPEC.md`); Q-D9 yes; Q-D10 upcasting yes, a None-cost Taijutsu keeps None (fixed in code, ships with the next release); Q-D11 no (stance only); Q-D12 yes (3 ranks intended); Q-D13 yes.
- 2026-11-21 King: "Then let's work on next Batch." Claude: engine D20–D22 and Weapon Specialist built (101 features), published 0.74.0-alpha.1. Q-D14–Q-D18 asked; nothing waits on them.
