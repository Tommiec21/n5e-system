# STD6d function spec: classes as data

Status: **King 2026-11-15: "push Feats to the end and start work on using the new Active Effects system to actually automate class features … continue. Stop after the first two classes are complete." Medical-Nin built (0.48.0-alpha.1) and Ninjutsu Specialist built (0.49.0-alpha.1); King 2026-11-15 "Lets move on to STD6d": Taijutsu Specialist built (0.55.0-alpha.1); King 2026-11-21 "Then let's work on next Batch": Weapon Specialist built (0.74.0-alpha.1); King "Next batch": Scout-Nin built (0.75.0-alpha.1); Hunter-Nin built with the Class & Clan Limits menu (0.77.0-alpha.1); Genjutsu Specialist built (0.78.0-alpha.1). Every class has its table; next: STD6e (clans).**

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
| D23 | Caster values on placement | A placed effect's values (and an aura child's rules) can use the caster's `@prof` and `@abilities.<a>.mod`, fixed when placed (Squad-Mates up to your proficiency bonus; Elemental Aura's half Constitution modifier). The rule validator accepts those placement-time forms. |
| D24 | Summoner links | An Allied NPC template lists the numbers it takes from its summoner (`flags.n5e.fromSummoner`: system path → formula over the summoner, rules/summoner-links.mjs); placing it writes them into the token's actor delta, with `details.summoner`. A compendium template is imported once and reused. Table entries can set a feature's `duration` (how long its summons last). |
| D25 | Option-gated effects | `flags.n5e.requiresOption: "<key>:<value>"` turns an effect on only while that class level-up option is chosen (Lethal Precision: `lethalPrecision:tai` or `:buki`; rules/features.mjs `optionChosen`). |
| D26 | Class & Clan Limits | The world setting `limitRecovery` changes when a pool or Amp's uses come back, from the Class & Clan Limits menu (rules/recovery-overrides.mjs). |
| D27 | Optional damage | A damage rule element with `optional: true` is an unticked row in the damage window, added only when ticked (King Q-D25: Lethal Attack). |
| D28 | Jutsu identity fact | Rolls from a cast card also carry `jutsu:id:<identifier>`, so an element can name one jutsu (Black Fangs: +1 critical range on Shadow Bite). |
| D29 | Discipline ability when higher | `n5e.keywordAbility.discipline:<d>`: every jutsu cast as that discipline may use the ability when it's higher (Actualization: Genjutsu with Charisma). |

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

## Scout-Nin (0.75.0-alpha.1)

Review table: `docs/classes/scout-nin-automation.md` (187 features: 1 automated, 148 partly automated, 36 notes only, 2 no mechanics).

Highlights:
- **Superiority Dice** (the class pool, d8): every maneuver has a button that spends its dice, rolling the die when the maneuver uses the number, with the save, effect or healing it calls for.
- **Jack of All:** Warfare, Seize and Tactics as switchable states; Warfare's bonus damage now grows at 5th and 15th as the text says (1d8 to 5d8).
- **Switch Hitter:** Follow Up and Set-Up mark creatures; Follow Up's +1/+2/+3 to hit is automatic for jutsu attacks that aren't your Primary casting discipline (the level-up choice, D20).
- **Superior Assault / Remarkable Aggression:** +1 critical range (+2 at 10th) with attacks of your Primary casting discipline.
- **New pools:** Chakra Barrier (twice your level, its hit points, with its Chakra Control Mastery by level), Ghostfire (3, 5 at 10th), Tactical Insight (4), each with the buttons that spend them.
- **Subclass cores:** Squad-Mates (up to your proficiency bonus) and Command; Combat Rival and the Relentless abilities; Flash and Elemental Flux (the AMP1d cards); Projected Barrier's Chakra Sphere and Repelling Burst; Phantom's Flame (Phantasm's Grip, Ghost Walk, Gravesight); Elemental Aura (+ half your Constitution modifier to allies' saves against nature release jutsu, D23); Superego Manifestation's aura; Heavy Guard; Transverse Defense.
- **At the table:** Bunshin and the Void Soul (stat blocks to make as actors), the Chakra Barrier intercepting damage, the one-maneuver-per-turn limit, Signature Jutsu modifications, Shinobi Paths and most commands to allies.

- **Text issues** (for the errata list): Jack of All repeats Warfare's text; Superior Riposte stops mid-sentence ("If the target"); Clones Support and Primal Storm contain design notes; Specialized Clones' Fire Release has "saving tactical, Phantom or hrow"; Speedy Recovery ends with "..".

## Hunter-Nin (0.77.0-alpha.1)

Review table: `docs/classes/hunter-nin-automation.md` (86 features: 2 automated, 66 partly automated, 17 notes only, 1 no mechanics).

Highlights:
- **Lethal Attack** (King Q-D25): unticked full and half rows in the damage window of every attack and jutsu; tick one when it applies. Every Combat Exploit rolls Lethal Attack with its dice already forgone, with the save or effect it calls for.
- **Skilled Exploits** (King Q-D24): 1 + proficiency bonus uses per Long Rest (the Skilled Exploits pool on Hunters Exploits); every Skilled Exploit's check button spends one.
- **Lethal Precision:** Taijutsu or Bukijutsu with Dexterity, by the level-up choice (D25).
- **Creeds:** Carnage, Posture, the Black Medicine Array, the Dread Arsenal, Void Anchors and Prosthetic Tools from their pools and buttons; Uncanny Dodge keeps its automatic halving reaction.
- **At the table:** the conditions that let each Creed use Lethal Attack, Stalked's −2 to Perception and Insight, Defensive Tactics and the subclasses' passives.

## Genjutsu Specialist (0.78.0-alpha.1)

Review table: `docs/classes/genjutsu-specialist-automation.md` (107 features: 4 automated, 80 partly automated, 23 notes only).

Highlights:
- **Actualization:** the Actualization Dice pool with its cast dialog options (+rank d6 damage; −1 to saves per die) and skill-check button. Genjutsu use Charisma when it's higher (D29).
- **Mirages:** each Mirage that changes a jutsu is a cast dialog option on that jutsu only (Piece of Mind casts Mind Sliver as a Bonus Action; Misty Thoughts casts Cajolery of Glamour at no cost on a non-hostile creature; the rest put their change on the cast card). Black Fangs' +1 critical range on Shadow Bite is automatic (D28).
- **Rending Thoughts:** save with its success, failure and critical-failure damage by level, and the attack-penalty die.
- **Inceptions:** Hallucinatory Instrument, Illusory Weapon, Reality Marble (−2 concentration cost at 7th) and Temporal Stopwatch buttons, with their 11th-level reactions; the 7th-level choices (Rewind, Fast Forward, Words of Affirmation, Words of Detriment) have buttons.
- **Summons** (Class & Clan Summons): the **Duplicity** (Beguiler; AC your Genjutsu save DC, 1 HP, your speed) and the **Phantasm** (Illusionist; its stat block: AC 20, 10 HP, Ghastly Strike, Maddening Echo; your Genjutsu attack bonus, save DC and senses). Summon buttons on Beguiling Duplicity, Phantasm and Phantasmic Double.
- **Mentally Compromised:** a new condition card (Conditions compendium, Genjutsu Specialist folder), applied by Collapsing your World and Corrupt Influence.
- **AC** (King Q-D28): the Illusory items Armor of Psychosis and Reality Shift: Genjutsu Save DC as AC.
- **At the table:** area and target changes, identification blocking, the degree-of-success features (Master of Illusion, The Prestige) and the Pledges' passives.

## Class & Clan Limits (0.77.0-alpha.1)

King 2026-11-21: "make this use limit variable in a new class & clan setting menu… list all classes and subclasses, and Clans under their own sections; each feature that has a limit that recharges on a rest should be changeable."

- **Menu:** Configure Settings › N5e Class & Clan Limits. Classes first (each class's own features, then its subclasses), then clans; everyone can view, the GM saves.
- **Limits listed:** every resource pool on a class, subclass, feature or clan, and every class- or clan-owned Amp card with uses.
- **Choices for pools:** as written, 10 minutes of rest, Short Rest, half on a Short Rest and all on a Long Rest, Long Rest, Full Rest, each day, Initiative (combat start and end), each round, start of your turn, never.
- **Choices for Amp uses:** as written, 10 minutes of rest, Short Rest, Long Rest, Full Rest, each day.
- A choice replaces the limit's recovery for every character in the world straight away; "All as written" clears them.

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
- **Q-D19 Chakra Barrier:** it says "Unique Amp", but it behaves like a hit point pool. It's built as the Chakra Barrier pool plus its Mastery effect, not an Amp card. Should it be an Amp card too (counting toward Rule of 3's)?
- **Q-D20 Tactical Insight and Ghostfire:** Ghostfire lasts 1 minute; Tactical Insight gives no ending. Should Tactical Insight empty when combat ends?
- **Q-D21 Clones Everywhere:** the save is against your Stealth DC. Buttons can't use a skill DC yet, so it uses your Ninjutsu DC. Add a Stealth DC source, or keep it at the table?
- **Q-D22 One maneuver per turn:** the limit isn't enforced (The Elite and Exceeding Expectations raise it). Enforce it on the maneuver buttons?
- **Q-D23 Warfare's dice:** the text gives 1d8, 2d8 at 5th, 3d8 at 11th, 4d8 at 15th, 5d8 at 20th; the old button stopped at 3d8. The button now follows the text. Correct?
- **Q-D24 Skilled Exploits:** answered (King 2026-11-21): 1 + proficiency bonus per Long Rest, changeable in the Class & Clan Limits menu.
- **Q-D25 Lethal Attack:** answered (King 2026-11-21): a damage toggle in the damage window of every attack and jutsu; players decide when to tick it, no further automation. Built in 0.77.1-alpha.1.
- **Q-D26 Actualization's Charisma:** answered (King 2026-11-21): the higher by default, plus a manual pick on the sheet (Features tab, class header: "Genjutsu ability", Auto (higher), Wis or Cha; kept on the class item as `flags.n5e.abilityChoice.gen`).
- **Q-D27 Duplicity:** answered (King 2026-11-21, "Read the class again"): it's "a perfect visual illusion of yourself", so the summoned token takes your token's name, image and size (`flags.n5e.summonerLook`), and your speed and fly speed ("it cannot fly unless you have a fly speed").
- **Q-D28 Armor of Psychosis and Reality Shift's AC:** answered (King 2026-11-21): equippable items. New armor category Illusory (worn over armor): Armor of Psychosis (Genjutsu modifier in place of Dex) and Reality Shift: Genjutsu Save DC as AC (only while the Amp is active, when higher), Equipment compendium › Class Items.
- **Q-D29 Mind Over Matter:** answered (King 2026-11-21): a manual tick (as built).
- **Genjutsu Specialist text issues** (for the errata list): Venom Strike Adept (2nd) holds Venom Strike Expert's Psychosis box; Mind Leech holds the Mentally Compromised box; Who are you Fighting? holds Betray Yourself's Identity Crisis box; Phantasmic Influence holds the Phantasm stat block; "Rend Thoughts" for Rending Thoughts (Denial is a River, Vindictive Thoughts); "Inhale" for Inhaled (Venom Strike Expert); "you your" (Mind Over Matter); "They 5d6" (Nightmare Rain); Fighting Mirage's prerequisite "Illusionary Weapon" (Illusory Weapon); One with Shadows' prerequisite "Reality Marble Genjutsu pledge" (Reality Marble is an Inception).
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
- 2026-11-21 King: "Next batch." Claude: engine D23 and Scout-Nin built (187 features), published 0.75.0-alpha.1. Q-D19–Q-D23 asked; nothing waits on them.
- 2026-11-21 King: "Make the Bunshin and Void Soul NPCs following their statistics. And place them in their appropriate Subclass folders." Claude: Class & Clan Summons (Bunshin, Void Soul) and summoner links (D24), published 0.76.0-alpha.1.
- 2026-11-21 King: "Next batch." and "QD24. 1+Prof, use per LR. For now make this use limit variable in a new class & class setting menu..." Claude: Hunter-Nin built (86 features), D25 option-gated effects, D26 Class & Clan Limits menu, published 0.77.0-alpha.1. Q-D25 asked; nothing waits on it.
- 2026-11-21 King: "Qd25. Lethal attack should be a damage toggle in the Attack/Damage window..." Claude: optional damage elements; Lethal Attack as full and half rows, published 0.77.1-alpha.1.
- 2026-11-21 King: "Next batch." Claude: Genjutsu Specialist built (107 features), D27–D29, Duplicity and Phantasm summons, Mentally Compromised; published 0.78.0-alpha.1. King answered Q-D26–Q-D29 the same day (manual Genjutsu ability pick, the Duplicity looks like you, Illusory AC items, Mind Over Matter a manual tick).
