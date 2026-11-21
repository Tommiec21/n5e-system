## 0.80.0-alpha.1 — Clans as data: E2 Land of Wind (Fūshin, Hanami, Jiton, Konjiki, Shakuton)

King 2026-11-21: "Next batch."

- **115 clan items reviewed:** see `docs/clans/`.
  - **Fūshin:** High Pressure (each lasts 1 minute) with Swirl and every Wind Whisper; Wind Scythe's Jet Needle and Cleave.
  - **Hanami:** Boons/Banes with a button each; the Medical Fist stance; Monstrous Burst and Healers Touch as cast options on every Hanami Hijutsu.
  - **Jiton:** Magnetic Charges with every Magnetic Tag; the Dust Veil particles' saves and conditions (Volatile, Heavy, Brined, Unstable); Magnetic Surge.
  - **Konjiki:** Liquid Metal Ingots with every Alomancy; Alomancy Infusions as cast options.
  - **Shakuton:** Scorch Charges (each lasts 1 minute) with every Desiccated Heat ability; each Hijutsu's Scorch effect as a cast option that spends its charges.
- Every Hijutsu has its buttons, tiers and upcast dice.

## 0.79.2-alpha.1 — Primes and Pressure last 1 minute

King 2026-11-21 (Q-E6): "1 minute cleanse unless spent."

- **Primes (Bakuton) and Pressure (Futton):** each one lasts 1 minute from when you gain it, unless you spend it first. Spending uses the oldest. They no longer empty at the start and end of combat.
- **Pools can now have a lifetime** (`lifetime`, in seconds): the GM's client drops expired units as world time passes (combat rounds and time passing).

## 0.79.1-alpha.1 — Bakuton: two Hijutsu of their own; Ballistic Knuckle

King 2026-11-21: "Q5. Make them as its own item. Q7. Drop it automatically."

- **New Hijutsu (Bakuton, B-Rank):** Explosion Release: Clay Centipede (summons two Clay Centipedes) and Explosion Release: Chain Reaction Blitz (attack each chosen creature, blast save, upcast dice), split out of Absolute Death Bombing's text and added to the clan's Hijutsu list.
- **Ballistic Knuckle:** its [Unarmed Damage] no longer adds your ability modifier (new stance field `unarmedNoMod`).

## 0.79.0-alpha.1 — Clans as data: E1 Land of Earth (Bakuton, Futton, Shí Hóu, Yoton)

King 2026-11-21: "Q1. Same time. Q2. Yes. Q3. No. Clan Feats and Latents should not be done at all. There is a major overhaul coming for them. Q4. Sure. Begin."

- **117 clan items reviewed** (features, options, stances and Hijutsu): see `docs/clans/`.
  - **Bakuton:** Primes with Prime and Detonate buttons, the ten Payloads, Clay Bombings on the Artistic Cataclysm stance, Ballistic Knuckle's 2d8 force, every Hijutsu.
  - **Futton:** Pressure with Boil Knuckle, Jet Dash and Vent Strike; Solid Fog; the Alchemical Fog and Steam Engine options; every Hijutsu.
  - **Shí Hóu:** Inner Chi on every transformation, Golden Strands, Primal Vanity and Nirvana.
  - **Yoton:** Molten Terrain, Onyx, Volcanic, the Foundations, World Forge, every Hijutsu.
- **Hijutsu upcasts:** each higher rank's buttons carry the extra dice.
- **New summons** (Class & Clan Summons › Bakuton): Clay Spider, Clay Bird, Clay Centipede and Clay Dragon, with hit points by the rank you cast at.
- **"Your highest jutsu save DC"** and attack bonus work on clan buttons.

## 0.78.0-alpha.1 — Genjutsu Specialist automation (the last class)

King 2026-11-21: "Next batch."

- **Genjutsu Specialist** (107 features): see `docs/classes/genjutsu-specialist-automation.md`.
  - Actualization Dice with their cast dialog options and skill button; Genjutsu use Charisma when it's higher.
  - Mirages that change a jutsu are cast dialog options on that jutsu (Piece of Mind: Mind Sliver as a Bonus Action; Misty Thoughts: Cajolery of Glamour at no cost on a non-hostile creature). Black Fangs: +1 critical range on Shadow Bite.
  - Rending Thoughts by level; the Inceptions' buttons and 11th-level reactions; Rewind, Fast Forward, Words of Affirmation and Words of Detriment.
- **New summons** (Class & Clan Summons, Genjutsu Specialist folder): the Duplicity (Beguiler) and the Phantasm (Illusionist), with summon buttons.
- **New condition:** Mentally Compromised (Corrupt Thoughts).
- Engine: rolls know which jutsu they're from (`jutsu:id:<identifier>`); a discipline can use another ability when it's higher (`n5e.keywordAbility.discipline:gen`).
- King's answers (Q-D26 to Q-D29):
  - **Genjutsu ability pick:** Features tab, class header: Auto (higher), Wisdom or Charisma.
  - **Duplicity:** a perfect visual illusion of you: the token takes your name, image and size, and your speed and fly speed.
  - **Illusory items** (new armor category, worn over armor; Equipment compendium › Class Items): Armor of Psychosis (Genjutsu modifier in place of Dex in your AC) and Reality Shift: Genjutsu Save DC as AC (while the Amp is active, when higher).
  - **Mind Over Matter:** stays a manual tick.

## 0.77.1-alpha.1 — Lethal Attack as a damage toggle

King 2026-11-21 (Q-D25): "Lethal attack should be a damage toggle in the Attack/Damage window when clicking an attack or Jutsu. Players can determine how it toggles on their own."

- **Lethal Attack:** two unticked rows in the damage window of every attack and jutsu: the full dice, and half (rounded up) for an attack of the Attack action or a weapon attack. Tick one when it applies; it takes the roll's damage type.
- The separate Lethal Attack buttons are gone. Combat Exploits keep their buttons (Lethal Attack with their dice forgone).
- Damage rule elements can be optional (`optional: true`): an unticked row in the damage window.

## 0.77.0-alpha.1 — Hunter-Nin automation and the Class & Clan Limits menu

King 2026-11-21: "QD24. 1+Prof, use per LR. For now make this use limit variable in a new class & clan setting menu."

- **Hunter-Nin** (86 features): see `docs/classes/hunter-nin-automation.md`.
  - Lethal Attack full and half buttons; every Combat Exploit rolls Lethal Attack with its forgone dice and the save or effect it calls for.
  - Skilled Exploits: 1 + proficiency bonus uses per Long Rest; every Skilled Exploit's button spends one.
  - Lethal Precision: Taijutsu or Bukijutsu with Dexterity, by the level-up choice.
  - Creed pools and buttons (Carnage, Posture, Black Medicine Array, Dread Arsenal, Void Anchors, Prosthetic Tools); Uncanny Dodge keeps its automatic halving reaction.
- **New menu: N5e Class & Clan Limits** (Configure Settings).
  - Lists every class, subclass and clan limit that comes back: resource pools and Amp card uses.
  - Classes first (each class's features, then its subclasses), then clans.
  - Pools: as written, 10 minutes of rest, Short Rest, half on a Short Rest and all on a Long Rest, Long Rest, Full Rest, each day, Initiative, each round, start of your turn, never.
  - Amp uses: as written, 10 minutes of rest, Short Rest, Long Rest, Full Rest, each day.
  - The GM saves; changes reach every character straight away. "All as written" clears them.
- Effects can now turn on only with a class level-up option chosen.

## 0.76.0-alpha.1 — Class & Clan Summons: the Bunshin and the Void Soul

King 2026-11-21: "Make the Bunshin and Void Soul NPCs following their statistics. And place them in their appropriate Subclass folders."

- **New compendium, Class & Clan Summons** (Actors), in folders by class and subclass like the features compendium.
- **Bunshin** (Scout-Nin › Cloning Scout), from its stat block:
  - 1 HP, 30 ft. speed; its AC is your Ninjutsu save DC; no ability modifiers, saves +0.
  - Its traits: Limited Casting I, Placement, Basic Tools, Gang Up, Hiding In Plain Sight.
  - Bunshin Strike (1d6) and Bunshins Cast (2d6 to 6d6 by rank).
  - When it's summoned, it takes your level, AC, attack bonuses, save DCs, skills and senses.
- **Void Soul** (Scout-Nin › Void Heart Scout), from its stat block:
  - Medium Construct, AC 8 + Dex + Con + Prof, immune to Charmed, darkvision 30 ft.
  - Its traits: Inexhaustible and Shared Being, and an Unarmed Strike (1d6 + Str).
  - When it's summoned, it takes your level, hit point maximum, speed and save proficiencies. Set its ability scores to your chosen +4, +3, +2, +2, +1, +0 and give it its jutsu.
- **Summon buttons:**
  - Tajū Kage Bunshin and Superior Clones place a Bunshin.
  - Void Heart Mask places the Void Soul, which lasts until dismissed or a day passes.
  - A compendium summon is copied into the world the first time and reused after that.
- **For any summon:** an NPC can name numbers it takes from its summoner; they're filled in when it's placed.

## 0.75.0-alpha.1 — STD6d: Scout-Nin automated

King 2026-11-21: "Next batch." The fifth class in the class pass. Review table: `docs/classes/scout-nin-automation.md` (187 features: 1 automated, 148 partly automated, 36 notes only, 2 no mechanics).

- **Every maneuver spends its Superiority Dice from a button.** When the maneuver uses the number, the die is rolled. The button also brings the save, effect or healing the maneuver calls for.
- **Jack of All:** Warfare, Seize and Tactics are switchable states. Warfare's bonus damage now follows the text: 1d8, 2d8 at 5th, 3d8 at 11th, 4d8 at 15th, 5d8 at 20th.
- **Switch Hitter:** Follow Up and Set-Up mark creatures. Follow Up's +1 to hit (+2 at 11th, +3 at 19th) is automatic for jutsu attacks that aren't your Primary casting discipline.
- **Superior Assault:** +1 critical range (+2 at 10th) with attacks of your Primary casting discipline.
- **New resources:** Chakra Barrier (its hit points, twice your level, with Chakra Control Mastery by level), Ghostfire (3, then 5 at 10th) and Tactical Insight (4), each with the buttons that spend them.
- **Subclass cores:** Squad-Mates and Command, Combat Rival, Flash, Elemental Flux, Chakra Sphere and Repelling Burst, Phantom's Flame, Elemental Aura for allies, Superego Manifestation's aura, Heavy Guard and Transverse Defense.
- **Still at the table:** Bunshin and the Void Soul (make them as actors), the Chakra Barrier taking damage, the one-maneuver-per-turn limit, Signature Jutsu modifications and the Shinobi Paths.
- **New for every class:** an effect placed by a button can use the caster's proficiency bonus or ability modifier, fixed when it's placed, auras included.

## 0.74.0-alpha.1 — STD6d: Weapon Specialist automated

King 2026-11-21: "Then let's work on next Batch." The fourth class in the class pass. Review table: `docs/classes/weapon-specialist-automation.md` (101 features: 2 automated, 85 partly automated, 9 notes only, 5 no mechanics).

- **Discipline:** Deflection, Chakra Strike, Chained Momentum (gain Chain for 1, or shift it for 2), and a button to regain Discipline from a Chain Bukijutsu.
- **Every Kata spends its Discipline from its button**, with the save, dice or effect it calls for, once per turn where the text says so. Elite Focus has its upkeep button; Overwhelming Malice its stance, Retributive Strike and Pensive Shot.
- **Efficient Bukijutsu** is a cast dialog option (1 Discipline: −1 cost a rank). **Chaining Adept:** Chain 2's cost reduction in the cast dialog, Chain 3's temporary hit points as a button.
- **Critical Focus** now works only with your Weapon Focus group (+1 critical range, +2 at 11th, +3 at 18th), weapon and Taijutsu attacks alike. It used to add +1 to every Bukijutsu.
- **Doctrines:** Vector Seal and Quarry marks (two at higher levels), Quarry's bonus [Weapon Damage], Reaver Echoes, the Obsidian Ward pool and its restoration rolls, Aura of Protection for allies, Provoke by level, Savage Assault's Shaken and Hobbled, and buttons for every Flurry Technique of the six Doctrines.
- **New for every class:** a class's level-up choices (such as the Weapon Focus group) can be named by effects; a resource cost can grow with level or be rolled.

## 0.73.0-alpha.1 — AMP1f batch 4: jutsu Amps (A and S-Rank)

King 2026-11-21: Q-F15 Aura of Power's −2 goes on hostile creatures through the aura; Q-F16 Freight Train leaves a condition when it ends; Q-F17 Strength of 1000 ends with Strength of 100 and leaves a shock until a full rest; Q-F18 the maintained Lotus cannon is an Amp; Q-F19 Water Heavens Convergence isn't; Q-F20 The Zone pauses when you end it early. This finishes the AMP1f review.

- **14 A and S-Rank jutsu now start Amp cards (16 cards):** Freight Train, Lotus Nonself Connected Cannons ("Maintain the cannon"), Demon Hunter, Overcomer, Unlimited Pleasure, Diamond Bone Hardening (A, S), Aura of Power (plus "in the aura"), Neverending Breath, Magnum Knuckle, Supreme Violence, Tiger Lily, The Zone, Body of Dawn, Strength of 1000.
- **Three new conditions** (Conditions compendium, Jutsu folder), applied when the Amp ends:
  - **Freight Train: Overheated:** Incapacitated until the end of your next turn.
  - **Strength of 1000: Shock:** no Strength of 1000, or Medical jutsu that need concentration, until a full rest (a reminder; casting isn't blocked).
  - **The Zone: Spent:** no The Zone until a full rest.
- **Amps that end with another** (new): Strength of 1000 frees Strength of 100 from concentration and ends when it ends; both leave their own condition.
- **A pause button on an Amp** (new): The Zone's **End early (pause)** ends it without The Zone: Spent, so you can reactivate it.
- **Auras with a second group** (new): Aura of Power gives allies its Amp (+2 to saves against Ninjutsu) and hostile creatures a −2 to those saves.
- **Saves know what they're against** (new): a save rolled from a jutsu's card carries that jutsu's facts, so effects can name "saves against Ninjutsu".
- **Conditions:** can carry extra statuses (Overheated is Incapacitated) and can end only on a full rest.
- Effect values can use your discipline modifier when placed (Supreme Violence: half your Taijutsu modifier to AC).
- **4 jutsu marked not Amps:** Chains of Fantasia, Moon-Fang Piercer, Heal, Water Heavens Convergence.

## 0.72.0-alpha.1 — AMP1f batch 3: jutsu Amps (B-Rank)

King 2026-11-20: Q-F10 Twin Rising Dragons isn't an Amp; Q-F11 a Parrying stance button on Blade Heart's Amp; Q-F12 Misleading Duplicate's invisibility is an Amp; Q-F13 Strength of 100 leaves a condition of its own when it ends.

- **11 B-Rank jutsu now start Amp cards (16 cards):** Light Binding Step (B, S), Nature Transfiguration, Pythons Gaze, Dragon Cloak (B, A, S), Blade Heart, Misleading Duplicate, Investiture of Flame, Investiture of Acid, Strength of 100, Bestial Art: Hunter (B, A, S), Gift of the Apex.
- **Options menus:** Nature Transfiguration (Amplified: no concentration), Bestial Art: Hunter (Strength 22 or Dexterity 18), Gift of the Apex (the beast).
- **Buttons on an active Amp** (new): shown on the Amp's row in the Amps panel. Blade Heart: **Parrying stance**, +2 AC and Dexterity saves until the start of your next turn, as often as you need while the jutsu lasts.
- **Amps that carry a status** (new): Misleading Duplicate makes you **Invisible** while it lasts.
- **A condition when an Amp ends** (new): Strength of 100 leaves **Strength of 100: Overexerted** (disadvantage on Strength checks for 1 hour or until you rest). It's in the Conditions compendium, Jutsu folder.
- **Conditions can end on a rest** (new "Ends" option on condition cards: after the duration or any rest, whichever comes first).
- **Damage vulnerability** in effects (new change `n5e.vulnerable`): the Investitures' cold and earth vulnerability.
- **6 jutsu marked not Amps:** Rubber Wall Enhancement, Silk Burial, Star Wall, Twin Rising Dragons, Encroaching Darkness, Memory Domination.

### Fixed
- The AMP1g level-versions builder deleted the jutsu rank cards when run after the jutsu builder. It now removes only its own versions.

## 0.71.0-alpha.1 — AMP1f batch 2: jutsu Amps (C-Rank)

King 2026-11-20: Q-F6 an aura applies the Amp to each creature in it, Q-F7 two picks, Q-F8 Heated Body is an Amp-less buff, Q-F9 a Change button for picks that can change.

- **17 C-Rank jutsu now start Amp cards (49 cards)**, a card per cast rank where the effects change.
- **Auras that apply the Amp.** Lightning King's Mantle and Medical Aura start an aura on the caster. You and the creatures in it each get the Amp card (it counts toward their Rule of 3's); it leaves when they step out or the jutsu ends. The aura card itself doesn't count.
- **Options menus:** Adaptive Biology (a damage type or condition; two picks at A-Rank), Score's tempo, Guardian Knight's armor, Jolt (Overcharged: d10s).
- **Change button** on an active Amp whose pick can change: Breath of Sound: Score's tempo at the start of each turn.
- **8 jutsu marked not Amps:** Adamantine Barrier, Dust Mesh, Senta Piercing, Heated Body (an Amp-less buff), Outflank, Shadow Clone Technique, Heavenly Mirror of Pain, Vacuum Field.

## 0.70.0-alpha.1 — AMP1f batch 1: jutsu Amps (E and D ranks)

King 2026-11-20: Q-F1 a card per cast rank and an options menu for picks, Q-F2 Hijutsu aren't Clan Amps, Q-F3 typeless for now, Q-F4 temporary-HP jutsu are Amps, Q-F5 Chakra Skin and Geo Breastplate are Amp-less buffs.

- **23 E and D-Rank jutsu now start Amp cards (75 cards).** Casting the jutsu and clicking its button starts the card for the rank you cast at, for example Medical Release: Acid Armor (C-Rank).
  - A rank gets its own card only when its effects change; a cast in between uses the card below it (Crystal Armor at C uses the D card).
  - Gaslight grows by character level, so it has level versions (5th, 11th, 17th).
  - Every jutsu Amp is typeless for now (Hijutsu included) and still counts toward Rule of 3's.
- **Options menu when an Amp starts.** Beast Fist: Rushing Lion asks Strength or Dexterity; Gaslight asks Action or Reaction (its duration changes); Environmental Affinity asks in or out of combat. Given to several creatures, the caster picks once.
- **Jutsu Amps aren't on the Amps panel's start list**: they start only by casting the jutsu, and show on the panel while active.
- **7 jutsu marked not Amps** and gone from the audit: Misty Hallucination, Chakra Skin, Bedrock Coffin, Geo Breastplate, Resonating Geo Isotoma, Fox Fire, Chakra Mark.
- Parts that need the table (retaliation damage, barriers, triggers, the resistance that lasts only while temporary HP last) are notes on each card.

## 0.69.0-alpha.1 — AMP1e: self-buff states, stances, Coordinated

King 2026-11-20: Q-E1 stances stay stances, Q-E2 Feral and Well Rested stay Clan Amps, Q-E3 DYNAMIC FORM! and Flawless become cards that don't count toward Rule of 3's, Q-E4 Coordinated is a condition, Q-E5 a feature's level is the character level of whoever has it.

- **DYNAMIC FORM! and Flawless are Amp cards** with no type, marked "Doesn't count toward Rule of 3's". Their feature buttons start them.
  - DYNAMIC FORM! ends when you cast a Finisher or combat ends. Tempo and its bonuses stay on the Tempo pool.
  - Flawless starts by itself when you roll initiative and ends with combat. Perfection and the Flawless buttons stay on Genius Talent.
- **New card option "Outside the Amp limits"** (Advanced): such an Amp never triggers Rule of 3's, never takes one of the three places and is never offered in the keep dialog.
- **New ending "Casting a Finisher"** on Amp cards.
- **Stances in the Amp audit** have their own "Stance" label and filter, and no longer appear as candidates.
- **Combat Coordinated and Diplomatic Coordinated are condition cards** (Nara). Team Coordination has a button for each; target your allies.
  - Mastery ranks follow the Nara's character level: 1, 2 at 7th, 3 at 15th.
  - Diplomatic Coordinated: each ally picks Deception, Persuasion or Intimidation from a chat card.
  - The initiative swap, Coordinated Support and Coordinated Experience are notes on the card (done at the table).
  - The Combat Coordinated Amp cards are removed, and the Nara box no longer shows in the Amp audit.
- Condition cards can now ask the bearer to choose, and `lvl()` in their changes uses the applier's level. A Mastery value "Source ×2" gives two ranks.

## 0.68.1-alpha.3 — GM04c selective starter import

Choose individual starter entries; optionally add missing source links without replacing GM writing. Seven new entries bring the library to 27. Corrects Journal Desk heading/button contrast. Full design polish remains GM06; no live verification.

## 0.68.1-alpha.2 — GM04b major-country atlas

Adds five country/village pairs and three Part I Sand figures (20 starter entries total). Newly imported entries receive curated links; existing GM entries remain untouched. Additional figures and minor-country coverage remain GM04c.

## 0.68.1-alpha.1 — GM04a starter library

Seven source-labeled Part I entries, imported privately from Journal Desk. Repeat imports preserve existing GM edits. Full atlas coverage remains GM04b/c; no live verification.

## 0.68.0-alpha.1 — AMP1g: a separate card for each version of an Amp

King 2026-11-20: "Anytime an Amp would upgrade/grow in power, there should be a separate version." Q-G1: the level is character level. Q-G2: versions are named "[Name] (level)".

- **32 Amps that grow by level now have one card per version: 68 version cards.** For example, Chakra Surge: Flow (+1 Ninjutsu save DC), Flow (11th) (+2), Flow (19th) (+3).
  - Each card shows only its own numbers and text; no "this increases at 11th" lines.
  - Lines that start at a level (Dragons Rage's Awakened, Synthetic Chakra Mode's Bio-Pets) appear only on the version that has them.
  - Scaling Mastery is now automatic: Miraigan (Insight) and Combat Coordinated (initiative) get 2 ranks at 7th and 3 at 15th.
- **Only your version shows.** The Amps panel offers the highest version your character level reaches, and the feature's button starts that version.
- **One pool of uses and one reuse wait** per Amp, shared by all its versions.
- **Card sheet:** Advanced has "Version of" and "From level" for your own versions.
- Builders: `tools/content/build-amp-versions.py` (run after build-amp-cards.py and build-clan-amp-cards.py).

## 0.67.0-alpha.2 — Amp cards appear at the right level

### Fixed
- **Class Amp cards appeared at any level** (King's playtest: a Ninjutsu Specialist was offered Crash and Flow (Perfected)). They belonged to the whole class or subclass. Each now belongs to the feature that grants it (Perfected: Ninjutsu Master; Overheat: Over the Limit...), so the Amps panel offers a card only once the character has that feature.
- **Battle Medic** belongs to Chakra Enhanced Combat (Combat Medic), where its box is.

## 0.67.0-alpha.1 — AMP1d: class Amp cards

- **5 class Amp cards**, each with a button on its feature:
  - **Flash** (Pathfinder Scout, Burst of Speed): +10 speed, Mastery on Dexterity checks, +1 Dexterity saves and AC (+2 at 9th). Bonus action, 1 minute.
  - **Elemental Flux** (Elemental Scout): until the end of your next turn; the Flux types by release and discipline are on the card, played at the table.
  - **Chained Cascade** (Primal Weapon): Mastery on Ninjutsu attacks and +1 Ninjutsu save DC, until the end of your next turn.
  - **Crash Duality** and **Flow Duality** (Summoner, Summoning Duality): buttons on Summoning Duality. Crash Duality adds +1d10 Ninjutsu damage when you cast (2d10 at 11th, 3d10 at 19th) with no cost reduction. Flow Duality gives +1 Ninjutsu save DC (+2 at 15th), a Focus each turn and concentration advantage. Each replaces Crash or Flow (one surge at a time); give your Bonded creature the opposite card.

### Fixed
- **Flow gave 2 Focus at the start of your turn** instead of 1 (its state and a rule on the card both added one). The card's duplicate rule is removed, for Flow and Flow (Perfected).

## 0.66.0-alpha.2 — AMP1d fixes: Blazing and Caloric Ignition

- **Blazing (Sarutobi):** it starts from Will of Fire Incarnate (15th level): a Bonus action for 1 minute, once per long rest. The card now belongs to that feature and counts the use.
- **Caloric Ignition (Akimichi):** lasts 1 minute, then 10 minutes to recover before reuse (it was set to last until ended).

## 0.66.0-alpha.1 — AMP1d: clan Amp cards

- **34 clan Amp cards** in the Amps compendium (Clans folder), one per named Amp box in the clan features. King Q-A1: they're Clan Amps; the box's own type (Battle Amp, Will Amp...) is shown as the named type.
  - Each card carries its box text word for word, a short summary, and how it starts: action, duration, uses per rest and the wait before reuse.
  - **Owner:** the feature that grants it (White Wolf, Sharingan, Kujaku Peacock Plume...), so it appears in the Amps panel for creatures that have that feature. Blazing, Signal Boosted, Battle Lust, Combat Coordinated and Scorching Heat belong to their clan.
  - **Automated** where the text gives a flat bonus: AC, speed, resistances, condition immunities, Mastery, level-scaled damage and attack bonuses, and temp HP at the start of your turn. The rest are notes on the card, played at the table.
  - **Sharingan and Miraigan** ask to start when you roll initiative.
- **New duration "until you end it"** for Amps with no time limit (Crimson Pact, Caloric Ignition, Ultra Focus). Before, an Amp with no duration ran out after a minute.

### Fixed
- **Level-scaled values in effects** (`lvl(3:1,11:2)`) were dropped as invalid formulas, so Chakra Surge: Flow's save DC bonus did nothing. They now resolve by the actor's level.

## 0.65.0-alpha.2 — Journal Desk navigation (GM03b)

- Campaign assignment/filtering and labeled links to existing records.
- Back/Forward navigation, remembered saved tabs, and optional appended starter headings.
- Unsaved writing remains in drafts; preferences store only references.
- Offline checks only; no live Foundry verification.

## 0.65.0-alpha.1 — Native Journal Desk (GM03a)

- GM writing workspace with library, tabs, rich text, search, favorites and saved ideas.
- Create private campaign, mission, session, character and world notes without Monk's.
- Protect dirty drafts and reject stale saves; existing mission and third-party pages stay with their own editors.
- Configure Settings > N5e Journal Desk. No live Foundry verification; remaining layout features are tracked in docs/GM_WORKSPACE.md.

## 0.64.0-alpha.1 — CHATUI1: chat font sizes and fonts

King's answers: the GM sets everyone's default and each user can use their own (Q-F1), a heading font and a body font (Q-F2), all N5e chat messages (Q-F3).

- **N5e Chat Card Appearance** (Configure Settings):
  - **Sizes:** one value per field: body text, speaker, card title, type line, action buttons, small buttons, tags, result headings, result totals, formulas and save lines, section headings, targets, Apply panel, notes and rules text.
  - **Everything:** one scale (50–200%) over all sizes.
  - **Fonts:** headings and body, from the fonts Foundry has loaded (Core settings → Additional Fonts adds your own).
  - **Live preview** and **Defaults**.
- **GM:** edits the world default ("Save for everyone") or their own copy.
- **Players:** edit their own copy; it's used when "Use my own settings" is on.

## 0.63.0-alpha.2 — CARD2 cleanup: a tighter combat card

### Changed
- **Combat card cleanup (King 2026-11-16):**
  - The attack roll shows once: the roll's own dice line is hidden on the card; the Attack tile stays.
  - Will of Fire buttons are hidden on combat cards for now.
  - "Successful hit: reactions" is removed from the attacker's card.
  - Action buttons sit in two columns with smaller text. The save button reads "DC 12 DEX Save".
  - Critical, Clash, Read the Enemy and Identify are small buttons on one row.
  - Saves share a compact box: one line per creature (name, ✓ or ✗, total), 3 per box; more creatures open another box.
  - No per-target "Roll Dex save" buttons. The card's Save button rolls for every card target you may roll that hasn't saved yet.

### Fixed
- A nameless "save Failure" row on cards. Creature ids contain dots, and Foundry split them into nested keys when the card saved its results. Keys are now stored safely, and cards saved the old way read back correctly.

## 0.63.0-alpha.1 — CARD2: combat cards like the SW5e card

King's answers: rolls inside the card (Q-C1), multipliers −1, 0, ¼, ½, 1, 2 (Q-C2), all cards at once (Q-C3), saves as their own tiles (Q-C4).

- **One card per action** (jutsu, weapon attack or strike, feature use), laid out top to bottom:
  - **Who and what:** the caster's portrait and name, then the jutsu, weapon or feature.
  - **Big action buttons:** Damage, the save, Place area and so on, full width. Critical and other extras sit beside them.
  - **Tags:** action, duration, concentration and keywords.
  - **Result tiles side by side:**
    - Attack: the formula, then the total with a ✓ or ✗ when there's one target;
    - each Damage roll: the formula, then the total with its type;
    - each creature's save: total with ✓ saved or ✗ failed.
    
    The › arrow on a tile shows the dice.
  - **Targets:** each creature with its AC or save, and its own buttons (roll the save, apply conditions and effects, Will of Fire, concentration, Undo).
  - **Apply:**
    - **Targeted / Selected** switch;
    - each creature with the damage it would take after its own resistance and DR;
    - multiplier buttons **−1** (heal), **0**, **¼**, **½**, **1**, **2**, starting on its share (½ after a successful half-damage save, 0 when immune);
    - one **APPLY** for every row.
- **Rolls live inside the card:** once a roll is recorded on its card, its own chat message is no longer shown. That covers attack, damage, saves, and damage and effect summaries. Results that can't be recorded yet (a player's roll with no GM connected) still show until they are.
- **New apply modes:** ¼ and 0 (the damage summary says "Quarter damage applied" or "No damage applied").
- The GM's Action card setting still switches back to the old cards.
- Not checked in a running Foundry world.

## 0.62.0-alpha.4 — Save jutsu record their damage on the card

- **Fix (King):** a jutsu whose damage sits on its save (Fireball: half on a success) now has a Damage section on its action card. Its damage roll is recorded in the card instead of staying a separate card. Before, only attack and damage activities gave a card a Damage section.
- Not checked in a running Foundry world.

## 0.62.0-alpha.3 — Action card: the right reason when a result stays separate

- **Why Crash's damage was a separate card (King):** the action card records one damage roll per effect. Crash's bonus had its own damage button, so its roll was a second one for the same effect; the card couldn't take it, and it stayed a separate card. Since 0.62.0-alpha.2, Crash's dice are part of the jutsu's own damage roll, so the card records it and the damage message folds into one line on the card.
- **Fix:** with a GM connected, that note no longer says "until a GM connects". It now explains that the result couldn't be added (for example a second damage roll for the same effect).
- Not checked in a running Foundry world.

## 0.62.0-alpha.2 — Crash's damage joins the jutsu's damage roll

- **Fix (King):** Crash's bonus dice (+1d10 to +5d10, halved for areas) are now added to the jutsu's own damage roll, in the jutsu's damage type. Before, they got a separate damage button. Example: a 4d6 + 4 Fire Ninjutsu in Crash rolls 4d6 + 4 + 1d10 Fire.
- The same goes for other added damage from cast options. A separate button remains only when the jutsu has no damage roll of its own.
- Not checked in a running Foundry world.

## 0.62.0-alpha.1 — AMP1c: Amp cards for every Amp button

- **20 Amp cards** in the Amps compendium (folder Classes), one for every class feature whose button started an Amp. Each card carries the book box as its description, a one-line summary, and its mechanics:
  - **Ninjutsu Specialist:** Crash, Flow, Crash and Flow (Perfected).
  - **Blaze Walker, Storm Terror and Tsunami:** Overheat, Burnout, Herald, Typhoon, Maelstrom, Abyss.
  - **Medical-Nin:** Battle Medic, Strength of 100 and 1000 (Combat Medic); Ascension (Adept Medic); Transfigured (Transmuter, can be given to an ally).
  - **Weapon Specialist:** Waltz and Samba (Battle Dancer); Battle Trance (Fang Breaker).
  - **Taijutsu Specialist:** Elemental Cloak (Nin-Tai).
  - **Genjutsu Specialist:** Reality Shift (Layered Reality).
- **The feature buttons now start the card**, keeping their action and resource cost. The cards show on the Amps panel of characters with the class or subclass. They can be dragged onto creatures, and hovering an active one lists what it does.
- **New automation from the books:**
  - Crash (and every Crash variant) now blocks cost reduction on your casts. Before, nothing applied it.
  - Battle Trance: advantage on checks and saves with your Taijutsu ability, and from 6th level +2 (+4 at 14th) Polearm and Flail damage.
  - Mechanics the buttons already had (Flow's DC and Focus, Battle Medic's d12, critical range and healing, the Crash variants' damage and riders) moved onto the cards unchanged.
  - What depends on a choice made at the table (Battle Trance's resistances, Elemental Cloak's release, Transfigured's designation, the dance partner) is listed as notes on the card.
- **Cooldowns:** the "10 minutes before you can enter again" Amps start their cooldown when they end, and starting one early asks first. Swapping between Crash and Flow doesn't start one.
- **For authors:** rule conditions can now test the ability a check or save uses (`ability:str`), and whether it's a discipline's ability (`ability:tai`, `ability:nin`, `ability:gen`).
- Not checked in a running Foundry world.

## 0.61.0-alpha.2 — The Amps view lists everything at once

- **Fix (King):** the Automation Audit's **Amps** view now scans the world and every N5e compendium at once, so the list fills whichever Source was picked before. The Source picker hides while it's open.
- Each row names where the item lives (Jutsu, Class Features, Clans, Stances, World) and its rank.
- The Amps compendium itself is still empty; AMP1c starts filling it.
- Not checked in a running Foundry world.

## 0.61.0-alpha.1 — AMP1b: the Amp audit

- **Amps view in the Automation Audit** (GM: `game.n5e.api.automationAudit()`, then the **Amps** filter). For the chosen source (world items or any N5e compendium) it lists:
  - **Amp card:** a card with a type. Its type can be changed right in the row.
  - **Amp: no type:** your queue to type (King Q-A4). Pick the type in the row.
  - **Starts an Amp:** features whose button already starts one (17 today).
  - **Candidate:** the scan thinks it's an Amp. Press **Not an Amp** to dismiss it; **Restore** brings it back.
  - **Not an Amp:** what you dismissed (kept for the world).
- **Needs review** (the default) shows only Amps with no type and candidates. Rows are ordered by rank, then name. Each row says why it was picked.
- **The scan** (King's definition: a lasting bonus to a statistic, ability or action; one-off bonuses aren't Amps) picks:
  - text that names an Amp type ("Battle Amp");
  - every stance (stances are Amps with no type);
  - a lasting duration (minutes, hours, concentration, several rounds) together with a bonus for you or allies: a +N, advantage, resistance or immunity, temporary HP, speed, or a cheaper cost.
  
  Upcasting lines and effects on enemies don't count.
- **First pass:** 240 candidates: 66 jutsu, 28 class features, 122 clan features and 24 stances. Plus the 17 that already start an Amp.
- **The generated report** (`docs/generated/std-audit.md`) has a new **Amps** section: counts per compendium and every candidate, so progress shows between releases.
- Changing a card's type in a compendium needs the Amps compendium unlocked; the row says so.
- Not checked in a running Foundry world.

## 0.60.0-alpha.11 — Dice bonuses on rolls (Bless)

- **Dice bonuses (King):** effects can add dice to rolls, so a Bless Amp works: **+1d4** to attack rolls and saving throws, rolled together with the d20. Bane-style penalties work too (**−1d4**).
- **Fields that take a number or dice:**
  - **All Attack Rolls**, plus Weapon, Unarmed, Ninjutsu, Taijutsu and Genjutsu Attack Rolls;
  - new: **All Saving Throws**, **Strength Saves** … **Charisma Saves**;
  - new: **All Ability Checks**, **Strength Checks** … **Charisma Checks** (an ability's checks and every skill that uses it);
  - new: **Initiative Roll**.
- **Roll rules:** a "Bonus or penalty" rule can be dice too, for situational dice. Dice on a damage or healing rule are added to that roll.
- The old Foundry fields that only take a number are now labelled "(number only)". Typing dice into one says which field to use instead.
- **Initiative** now counts effect bonuses and roll rules.
- The roll card's breakdown shows each die bonus by name, e.g. "Bless (1d4)". The roll dialog lists it with a tick box, like other modifiers.
- Not checked in a running Foundry world.

## 0.60.0-alpha.10 — Jutsu rows show their names again

- **Fix:** the Jutsu tab's rows lost their names and range in 0.60.0-alpha.8. A general row style squeezed the row into a 200px column. Rows now span the full width: name, range, cost, hit or DC, and Use on one line, with the keyword chips underneath. The pill view is unaffected.
- Not checked in a running Foundry world.

## 0.60.0-alpha.9 — Active Amps show their name and what they change

- **Names (King):** an active Amp shows its card's current name (Caloric Ignition), not the name the card had when the Amp started. This applies on the Combat tab's Amps panel and the Effects tab.
- **Renaming a card keeps its key**, so Amps already running stay linked to it. New cards get an identifier from their name when made.
- **Hover an active Amp** for its type and time left, the card's summary, and every change and roll rule it applies in plain words. For example: "+2 Damage Reduction", "+10 Speed", "Advantage on your Constitution saves."
- Every other effect on the Effects tab lists what it changes on hover too.
- Not checked in a running Foundry world.

## 0.60.0-alpha.8 — Sheet polish: Amp card layout, Amps panel, jutsu views, roll dialog

- **Amp card sheet:**
  - The fields sit in an even grid of up to 3 columns, labels on top and each definition under its own field. Checkboxes are a box with its label.
  - Starting it reads: Takes / On rolling initiative / Can be given to others, then Uses / Uses come back on / Wait after it ends.
- **Amps panel:** each active Amp is one clean row: the type as a coloured badge ("No type" dashed), the name, the time left, then the switch and End. Nothing overlaps.
- **Basic Combat:** the **Attack** pill is gone. The Strikes row (Unarmed Strike and each equipped weapon) makes attacks.
- **Jutsu tab, two views** (toggle next to Browse, remembered for you):
  - **Rows:** name, range, cost, hit or DC and Use on one line; the keyword chips go on their own line underneath, so nothing stacks over the other columns.
  - **Pills:** compact pills like the adversary sheet, with the name, cost and hit or DC. Hover for range, keywords, components and concentration; click to use.
- **Roll dialog:** the extra modifier boxes are labelled and wide enough to read:
  - What it's from (optional, a name for the chat card);
  - How much (+2, −1 or 1d4);
  - For damage, the type.
- Not checked in a running Foundry world.

## 0.60.0-alpha.7 — Level up fixed; editing ability scores fixed; Condition Immunity and State Resistance / Immunity

- **Fix: Level up opens again.**
  - The level-up window's template had a block closed in the wrong place, which broke the dialog.
  - The ASI card is also back in order: +1 to an ability, then the feat, then the Mastery rank, each only when that level grants it.
  - Every template is now compile-checked by the tests, so this can't ship again.
- **Fix: changing a character's ability scores (or anything else) in Edit mode no longer fails** with "must be an integer". HP, CP, XP and Ryo appear twice in Edit mode, on the sheet and in the field editor. The sheet now keeps the value you changed.
- **New effect fields (King):**
  - **Condition Immunity:** a condition or a whole group can't be applied.
  - **State Resistance:** advantage on saves against a state, including saves to end it.
  - **State Immunity:** the state can't be applied, including from the token HUD.
  - The states offered: Prone, Grappled, Restrained, Incapacitated, Stunned, Unconscious, Suffocating, Surprised, Drained, Hidden and Undetected.
  - NPCs get State resistances and State immunities, and their condition immunities can name a group.
  - The GM rule "Condition resistance and immunity" still turns these on or off.
- Not checked in a running Foundry world.

## 0.60.0-alpha.6 — Unarmed Damage Die Step

- **New effect field (King): Unarmed Damage Die Step** (`n5e.unarmed.step`), under Damage. It reads your current unarmed die and moves it up or down: 1 → 1d4 → 1d6 → 1d8 → 1d10 → 1d12, and back down. It stops at 1 and at 1d12.
- **What to enter:** 1 goes up one size, −1 down one, 2 up two. Steps from several effects add together.
- It applies after **Unarmed Damage Die** (the "becomes this when larger" field). A stance's d6 with a +1 step is a d8; an effect setting d8 with a −1 step is a d6.
- Not checked in a running Foundry world.

## 0.60.0-alpha.5 — Effect editor: change cards in rows

- **Layout (King):** the effect editor's change cards fill a row left to right, at most 3 per row. Narrower windows wrap to 2 or 1 per row. Cards in a row share the same height, so the rows look even.
- Not checked in a running Foundry world.

## 0.60.0-alpha.4 — Condition Resistance in effects

- **New effect field (King): Condition Resistance** (`n5e.conditionResist`), under Defense. Pick one condition (Bruised) or a whole group (All Physical / Mental / Sensory / Elemental / Fatigue conditions).
- A creature that resists a condition makes saving throws against it with advantage. This covers:
  - the save when a jutsu or feature would inflict it;
  - the end-of-turn save to end it.
  
  It also works for class and clan condition cards, by their own group tags.
- NPC condition resistances can name a group too.
- The existing GM rule "Condition resistance and immunity" still turns this on or off.
- Not checked in a running Foundry world.

## 0.60.0-alpha.3 — Ability Check Mastery

- **New effect fields (King):** **Strength / Dexterity / Constitution / Intelligence / Wisdom / Charisma Check Mastery** (`n5e.mastery.check.<ability>`), under Skills & Mastery in the field picker.
- One source raises the ability's own checks and every skill that uses that ability by one step. Example: Strength Check Mastery from White Wolf raises Strength checks and Athletics.
- It counts together with a skill's own sources. Each distinct source still counts once, so White Wolf giving both Strength Check Mastery and Athletics Mastery is one step, not two. The usual level cap applies.
- Ability checks now show Mastery in their breakdown.
- Toolkits aren't tied to an ability, so they aren't affected.
- Not checked in a running Foundry world.

## 0.60.0-alpha.2 — Effect editor: the Changes tab stays on its own tab

- **Fix:** the effect editor's Changes content showed under the Details and Duration tabs too. It now shows only on the Changes tab.
- Not checked in a running Foundry world.

## 0.60.0-alpha.1 — UX1: a readable Amp card and effect editor

- **Plain names for every effect field.** All 140 fields have:
  - a name, such as **Unarmed Damage Die** (the stored key `n5e.unarmed.die` doesn't change);
  - a category (Defense, Attacks, Damage, Jutsu Cost, Saves & DCs, Skills & Mastery, Speed & Movement, Health & Chakra, Ability Scores, Other);
  - what it does, in at most 2 sentences;
  - what to enter;
  - how it stacks.
- **The field picker:**
  - The search also finds synonyms ("punch" finds the unarmed fields).
  - The list is grouped by category and shows plain names.
  - **About this field** explains the selected field before you add it.
- **Changes are stacked cards, so nothing overlaps.** Each card shows:
  - the field's name;
  - a value box shaped to the field: a dropdown for an ability or a damage type, a box for numbers or dice;
  - the problem in plain words, if there is one;
  - "What this does" (collapsed);
  - "Advanced" (collapsed): the stored key for everyone (King Q-U2), plus mode and priority for Foundry's own fields only. N5e fields always add (King Q-U1), and a stray mode on one is corrected to Add.
- **Roll rules builder** (it was "Conditional roll modifiers"):
  - Each rule is a row of plain dropdowns: **Kind**, **Applies to** (with tick boxes for which saves, skills or damage types), **Only when**, and the value the kind needs.
  - **Limits and timing** are collapsed underneath.
  - Each rule reads as a sentence: "Advantage on your attack rolls while you're in the iron-fist stance."
  - Rules the builder can't show stay as they are, as a "custom rule" with its sentence, and can be edited as JSON under Advanced.
  - Every rule in the compendiums passes through the builder unchanged.
- **The rest of the editor** is short and collapsible:
  - When this effect works
  - Preview
  - Copy and share
  - Automation (GM)
- **The Amp card sheet** is in plain sections:
  - What it is
  - Starting it
  - How long it lasts
  - What ends it early
  - **What it does**: the buff written out ("+2 Damage Reduction", "Advantage on your Constitution saves."), with an Edit button.
  - Advanced (collapsed)
  
  Every field has a one-line definition. The type, owner, initiative and duration dropdowns explain the option you pick.
- **Fix:** an Amp card's own effects are now applied when the Amp starts, together with its Changes list. Before, they were ignored.
- Not checked in a running Foundry world.

## 0.59.0-alpha.1 — AMP1a: Amp cards, the engine

- **Amp cards** are a new item type and a new **Amps** compendium (folders: Classes, Clans, Self-buffs and jutsu). A card holds an Amp once:
  - its type, or **no type** (King Q-A4);
  - who it belongs to;
  - how long it lasts (a duration, a turn ending, the end of combat or a rest);
  - its uses per rest and cooldown;
  - what it changes and what ends it.
  
  The compendium is empty for now; AMP1c onward fills it. A world Amp item works the same.
- **Clan Amps (King Q-A1):** an Amp a clan provides is always a Clan Amp for the limits. The type its box names is kept on the card.
- **The Amps panel** on the Combat tab:
  - **Active Amps** show their type ("No type" in italics), time left, the on/off switch and an **End** button.
  - **Amp cards you can start** show your class, subclass, clan and feat Amps, with use pips and any cooldown.
  - **Activate** starts an Amp on you, or gives it to the creatures you target. Pressing it again ends the Amp.
- **Anyone can apply an Amp (King Q-A2):** drag a card onto a token or a sheet, use Activate, or use an effect button that names the card. A confirmation warns when:
  - the creature doesn't have the Amp's source;
  - a self-only Amp is being given to another creature;
  - no uses are left;
  - it's cooling down.
  
  On a creature you don't own, the GM's client applies it.
- **Amp limits (King Q-A3):**
  - Under Singleton, the creature picks which Amp of a type applies. An Amp with no type doesn't clash.
  - Under Rule of 3's, the creature picks which three stay on.
  - The creature's owner is asked, or the GM when no owner is online.
- **Endings (King Q-A5):** Amps whose text ends them on Staggered, Blinded, Unconscious, 0 chakra or leaving a stance end automatically or with a reminder at the table. The new GM setting **"Amps that end on a condition"** decides which. Amps that last until the end of combat or a rest always end then.
- **On initiative:** cards set to start on initiative start automatically or ask.
- **Uses and cooldowns:** uses come back on rests by the card's "per". A cooldown starts when the Amp ends.
- **For authors:** an effect activity can name a card (`{amp: key}`). Amp effects carry the card key (`system.key`). The API adds `game.n5e.api.applyAmp(actor, key)` and `endAmp(actor, idOrKey)`.
- Not checked in a running Foundry world.

## 0.58.0-alpha.1 — CCOND1b: the remaining 15 class condition cards

- **New cards** (text from the books' boxes): **Blighted**, **Curse of the Reaper**, **Life Pulse**, **Hemorrhage Vitality** and **Transfiguration** (Medical-Nin); **Suppressed** (Hunter-Nin, Necrotic Hand); **Disoriented (Clones Everywhere)**, **Ghostburn** and **Momentary Flaw** (Scout-Nin); **Hobbled**, **Shaken (Okuri-Inu Fang)**, **Provoked** and **Reaver Echo** (Weapon Specialist); **Psychosis** and **Identity Crisis** (Genjutsu Specialist). All 19 class conditions in the books are now cards.
- **Buttons now apply the cards:** Curse of the Reaper, Transfigure an enemy (on a failed save), Life Pulse and Hemorrhage Vitality (Supreme Medic cast options), Provoke and Okuri-Inu Fang. An effect button can now apply a condition card.
- **What's automated:** Life Pulse heals 4d6 HP and 2d6 CP at the start of each turn; Hemorrhage Vitality deals 6d6 necrotic and 6d6 chakra at the start of each turn with an end-of-turn Constitution save against the Medical-Nin's Ninjutsu DC; Psychosis disadvantage on attacks, Insight and Perception; Disoriented disadvantage on Perception; Suppressed, Disoriented, Hobbled, Shaken and Psychosis end at the end of the creature's next turn; Reaver Echo stacks. The rest of each card is for the table.
- Two cards are renamed so names stay unique: the Scout's Disoriented (the Kashu clan has one too) and Okuri-Inu Fang's Shaken (different from the core Shaken).
- Not checked in a running Foundry world.

## 0.57.0-alpha.3 — CCOND1c batch C: the last 11 clan condition cards

- **New cards:** **Manic**, **Feral Mania** and **Primal Focus** (Jūgo), **Firewalled** and **Data Leak** (Genwa), **Claws of Night** (Vesper), **Asaemon Discipline / Severed** (Yamada), **Volatile**, **Heavy**, **Brined** and **Unstable** (Jiton). All 33 clan conditions in the clans are now cards.
- **What's automated:** the Jūgo frenzies +1 critical range and +10 ft speed (Primal Focus also advantage on Wisdom saves); Data Leak +8 jutsu cost; Heavy can't Dash or Disengage; Unstable ends at the end of its next turn; "Try to end" on Firewalled (DC 15 Con), Severed (DC 15 Medicine) and Volatile (an Action). The rest is on each card for the table.
- **For authors:** condition cards can carry Active Effect changes (`system.changes`), applied with the condition.
- Not checked in a running Foundry world.

## 0.57.0-alpha.2 — CCOND1c batch B: 11 more clan condition cards

- **New cards:** **Deteriorate** and **Scald** (Futton), **Molten** (Yōton), **Convergence** (Keton), **Refraction Point** (Ranton), **Stupor** and **Doused** (Jinzo), **Disoriented** (Kashu), **Crystallization** (Shōton), **Immolation** (Shakuton), **Frostbite** (Yuki).
- **What's automated:** Deteriorate +1 critical range against it per rank; Scald −2 damage dealt per rank; Stupor −2 to Strength and Dexterity checks and saves; Disoriented −1 to attack rolls per rank; Crystallization +4 base jutsu cost per rank; Immolation 1d12 fire per rank at the start of its turns; Frostbite 1d10 cold per rank posted at the end of its turns (skip it if it moved half its speed); Molten ends at the end of its next turn. "Try to end" checks on every card that has one. The elemental reactions (Molten, Convergence, Doused, Refraction Point) are on the cards for the table.
- **Immunity:** a condition is now blocked when the creature has the immunity it names ("creatures immune to fire damage are immune to this", "immune to Dazzled"); Molten needs both fire and earth immunity. This also applies to core conditions that name one.
- Not checked in a running Foundry world.

## 0.57.0-alpha.1 — CCOND1c batch A: the first 11 clan condition cards

- **Clan conditions are now condition cards** in the Class & Clan Conditions compendium (folder Clans), so they load in every world (before, only clans imported into the world registered theirs): **Off-Guard** (Uchiha), **Network Distortion** (Hyūga), **Shadow Bound** (Nara), **Drained** (Senju), **Infested** (Aburame), **5-Pronged Seal** and **River Dam Seal** (Uzumaki), **Mental Overwrite** (Yamanaka), **Yin-Seal** (Kuru), **Virulent** (Hebi), **Star Sickness** (Hoshi).
- **What's automated:** Off-Guard −2 AC; Network Distortion +4 jutsu cost and −2 Chakra Control per rank, losing a rank each turn; Drained 1d8 chakra damage per rank at the start of its turns; Infested +4 jutsu cost per rank, −2 Strength and Dexterity saves, and an end-of-turn Constitution save against the Aburame's highest jutsu DC; 5-Pronged Seal +10 jutsu cost, −8 damage, 1 hour, DC 20 Ninshou to remove (+5 per failure); River Dam Seal +20 jutsu cost; Mental Overwrite loses a rank each turn; Star Sickness −2 damage per rank, disadvantage on Strength and Dexterity checks and saves, −2 ranks per long rest, ends on a full rest. "Try to end" checks: Drained and Virulent (DC 15 Con), Yin-Seal (DC 20 Ninshou). The rest of each card's rules are on the card for the table.
- **Engine:** a condition card's roll rules now ride on the condition itself (so Balance, Bone and Flow Broken's disadvantage and Shattered's critical range apply when they're inflicted from 0.57 on); rule values can scale per rank (`ranks(-2)`); cards can set a duration and a removal DC that grows on each failure; long-rest decay and full-rest removal work for class and clan conditions.
- Not checked in a running Foundry world.

## 0.56.0-alpha.2 — Flow Broken lowers initiative (King)

- **Flow Broken's −4 initiative now changes the creature's initiative** each time it's applied in combat. As the book's box says, the creature moves in the turn order at the start of the next round: its initiative drops then, the order is re-sorted, and whoever is now first takes the round's first turn. The change lasts for the rest of the combat (it isn't restored when Flow Broken ends).
- **For authors:** condition cards have an **Initiative change** field (`system.initiativeShift`).
- Not checked in a running Foundry world (the turn-order change at the round's start needs a look in a live combat).

## 0.56.0-alpha.1 — CCOND1a: class and clan condition cards

- **Condition cards:** a new item type for conditions that belong to a class or a clan, kept in the new **Class & Clan Conditions** compendium. A card has the same rules as a core condition (tags, ranks, how it ends, "Try to end", penalties and roll effects), so on a creature it works like Burned or Dazed: token icon, sheet rail, expiry.
- **Applying one:** drag the card onto a token or onto a creature's sheet, or target creatures and press **Apply** on the card in your Features tab (a new Conditions section lists the cards your class, subclass and clan give you). Save buttons that inflict a card apply it on a failure, as with core conditions. Macros: `game.n5e.api.applyConditionCard(actor, key)`.
- **Who:** any player or the GM can apply a card (King); you get a warning when the applying creature has no matching class or clan. On a creature you don't own, the GM's client applies it for you, with no approval step. Applying it again replaces it and the new duration wins.
- **It ends** when the creature that applied it dies or leaves the combat.
- **World setting (privacy):** "Players see class and clan condition rules": off shows players only a card's name on creatures they don't own.
- **First cards (Taijutsu Specialist):** Balance Broken, Bone Broken, Flow Broken (from the book's boxes) and Shattered. Balance, Bone and Flow Breaker and Shatterpoint now apply them. Bone Broken sets DR to 0; each Broken gives disadvantage on its save; Shattered widens the critical range against it and adds +2 damage taken.
- **Fix:** a Taijutsu whose cost is None keeps it under Unwasted Movements (King Q-D10).
- Not checked in a running Foundry world.

## 0.55.0-alpha.1 — STD6d: Taijutsu Specialist automated

- **Martial Dice grow with you:** d6, d8 at 7th, d10 at 13th, d12 at 19th level (the Martial Strength die). Every Martial Die button now rolls the right size.
- **Martial Strength** (the Unarmed die d8 / d10 / d12) and **Unwasted Movements** (Taijutsu cost D 3, C 5, B 9, A 14, S 20 as a Special cost) apply while you're in a Taijutsu stance.
- **Sustained Pressure** adds a Martial Die to every unarmed attack's damage for the rest of the turn; **Valve Break** adds rank Martial Dice of the right size.
- **Agile** adds your best of Intelligence, Wisdom or Charisma to initiative. **Iron Body, Iron Will and Mastery of Self** give their saving throw Mastery; Mastery of Self gives immunity to Envenomed, Exhaustion and Dazed. **Enhanced Movement** now reaches +20, +25 and +30 speed.
- **Paths:** Elite Taijutsu's +1 to hit and Devastating Taijutsu's +1 critical range now apply to the roll.
- **Balance Broken** gives disadvantage on Strength saves. **Shattered** (Focused Genius) widens the critical range against the creature and adds +2 / +4 / +6 to damage it takes.
- **New buttons:** Persistence, Step of Silence / the Stars / the Wind, Shatter and Unstable Drive, Surging and Disturbing Momentum, the Unmatched Reflexes techniques, Close the Distance, Elemental Rush, Elemental Core, Flashguard Counter, Elemental Recharge, DYNAMIC FORM! and Tempo spending, Chakra Enhanced Blows, Tempo Boost, Encourage / Flatter / Callout, Training Weights, Sheer Will, Style Shift, Dodge Cancel, Redirected Aggression, Shatterpoint, Flawless and every Perfection ability, Flawless Power, Genius Technique.
- **Cast dialog:** Disturbing Technique, Elemental Crush, Ninjutsu Combo, Passionate Flame, Stancer Technique.
- Review table: `docs/classes/taijutsu-specialist-automation.md` (84 features: 7 automated, 52 partly automated, 23 notes only, 2 no mechanics). Questions for King are in `docs/STD6d_SPEC.md` (Q-D8 to Q-D13).
- **For authors:** a pool die can scale with level (`lvl(1:6,7:8,...)`); formulas can read a pool's die size (`@pools.<id>.faces`); a rule element's value can be the highest of some ability modifiers (`mod(int,wis,cha)`); change key `n5e.rankCost.<scope>` sets a fixed Special cost per cast rank; unarmed strikes carry the roll fact `weapon:unarmed`.
- Not checked in a running Foundry world.

## 0.54.0-alpha.1 — SHEETS1: five optional character sheet designs (King: "Spend time building them all")

- **Pick a look per character:** open a character's Sheet menu (the sheet's title bar) and choose a sheet. The default N5e sheet stays the default; the five new ones are the same sheet with a different design, so every button, roll and field still works the same.
  - **N5e Character: Classic:** after the dnd5e sheet layout. Maroon header with a level medallion and XP bar, hexagonal ability tabs, a dark character card (portrait, AC shield, Initiative / Speed / Proficiency lozenges, HP and CP bars with a TMP slot), notched Skills and Saving Throws frames, vertical icon tabs on the right.
  - **N5e Character: Glass:** frosted panels on a dark ground with an orange glow.
  - **N5e Character: Ink & Paper:** the first draft, kept: ink header, hexagon level badge, hanging ability tabs, pill tabs.
  - **N5e Character: Shinobi Scroll:** a Pf2e-style layout. A hanging scroll on the left (Vitality, Defense, Initiative, Saves, resources, conditions), a crimson header with a forehead-protector level plate, a navy tab strip with gold rules.
  - **N5e Character: One UI:** after Samsung's One UI. A large viewing area at the top, rounded cards, a bottom tab bar; dark when Foundry's application theme is dark.
- The other tabs (Combat, Jutsu, Inventory, Features, Effects, Biography) keep their layout and take each design's colours.
- **Widened Ninjutsu:** a cube now grows 10 ft (5 ft on each side; King Q-E1).
- Not checked in a running Foundry world (checked with static renders in a browser).

## 0.53.0-alpha.1 — ENG1d: auras and zones; ENG1e: the two classes redone

- **Auras move with tokens:** an aura effect gives its effect to the right creatures within its radius, and takes it back when they leave or the aura ends. The GM's client keeps them in step as tokens move and turns change.
  - **Bastion:** you and allies within 20 ft are immune to Bruised, Dazed and Chilled.
  - **Storm Zone (Storm Terror):** ranged attacks by the chosen creature's allies within 60 ft are at disadvantage.
  - **Black Lotus Bloom and Pressure Stagnation** mark the hostile creatures inside their zones.
- **Battle Medic** (and Strength of 100 and 1000) heals the Channeled Healing bonus at the start of your turn when you're at half HP or less.
- **Review tables updated:** Medical-Nin is now 5 automated, 27 partly automated, 18 notes only; Ninjutsu Specialist is 21, 28 and 33.
- **For authors:** effect `aura` {radius, who, includeSelf, effect}; roll facts `attack:ranged` and `self:bloodied`.
- Not checked in a running Foundry world.

## 0.52.0-alpha.1 — ENG1c: reactions that protect others

- **Vitality Guard:** when an ally within 30 ft is about to take damage in combat, a Medical-Nin in Ascension is offered the reaction. It halves that damage for 1 Healing Surge and uses the Medical-Nin's reaction.
- For authors: damage reaction recipes can protect others within a range (and optionally the owner too), and can require a state. Both are in the reaction editor.
- Not checked in a running Foundry world. The ally offer uses token distance on the current scene.

## 0.51.0-alpha.1 — ENG1b: Moldings that change the jutsu

- **Widened Ninjutsu** makes the placed area larger: sphere or cube +5 ft, cone or line +10 ft, cylinder +10 ft.
- **Dragwind** grows the area by +5 ft (+10 at 10th, +15 at 18th).
- **Subtle Ninjutsu** lets you cast without hand seals, so conditions that stop hand seals don't block that cast.
- For authors: action-effect elements `areaSize` and `ignoreComponent`.
- Not checked in a running Foundry world.

## 0.50.0-alpha.1 — ENG1a: effects that act each turn, target-aware formulas, marks (King: "Do that immediately")

- **Effects can heal, deal damage or force a save each turn.** Damage goes on a card for the GM to apply, like condition damage. A successful save ends the effect.
  - Life Pulse heals 4d6 HP and 2d6 CP at the start of each turn.
  - Hemorrhage Vitality deals 6d6 necrotic and 6d6 chakra at the start of each turn, with a Con save at the end to end it.
  - Mending Spark heals the Channeled Healing bonus each turn.
  - Overheat and Burnout burn you at the end of your turns; that damage ignores DR and resistance.
- **Effects keep the caster's numbers** (Channeled Healing, save DC, level) after they're placed on another creature.
- **Damage formulas can read the target.** Septic Detonation is now a damage button: 1d12 per rank of Envenomed on the target.
- **Marks:** Curse of the Reaper (one creature, two from 18th level) and Vital Thread (one) end the oldest mark automatically.
- **Toxic Tongue** gives immunity to Envenomed (King) as well as Corroded.
- **For authors:** trigger elements `heal`, `damage` and `resave`; `@target.ranks.<condition>` and `@target.state.<state>` in damage formulas; `@scale`, `@dc` and `@level` in an effect activity's elements; effect activity `limit`.
- Not checked in a running Foundry world.

## 0.49.0-alpha.1 — STD6d: Ninjutsu Specialist as data

- **All 84 Ninjutsu Specialist features and options are reviewed.** The review table is `docs/classes/ninjutsu-specialist-automation.md`.
- **Flow** gives a Focus at the start of your turn and advantage on Ninjutsu concentration checks. Both are now data on its effect instead of a coded check.
- **Ninjutsu Master:** Enter Crash (Perfected) and Enter Flow (Perfected) for 4 Focus.
- **Chakra Compression:** from 11th level, 1 Focus casts a D-Rank Ninjutsu (C-Rank from 17th) at 0 cost.
- **Scholar** gives its Ninshou Mastery ranks at 2nd, 7th and 13th level. **Counter Seal** gives +2 to a save.
- **Potent Ninjutsu:** the three lowest damage dice count as their maximum.
- **Clash advantage:** Tidebreaker, Breeze Breaker, Current Breaker, Blaze Breaker and Terra Breaker apply automatically.
- **Battle-state variants:** Overheat and Burnout (Fire Release damage bonus), Herald and Typhoon (fly speed; attackers get a bonus), Maelstrom and Abyss.
- **New pools:** Tension (Gain Tension, Stone Bind, Grit) and Pressure (Build Pressure, Gale Burst, Sharpening, Dragwind).
- **Molding options in the cast dialog:** Crimson Kindling, Gigawatt Pulse, Tectonic Mantle, Pressure Stagnation, Blaze Walker, Lightning Breaker, Stone Crusher, Storm Terror, Tsunami, Combination Technique and Synchronization Technique. Rule Breaker casts the Summoning Technique as a Bonus Action. **Shift Tides** stances are effects.
- **For authors:** clash and concentration checks know their jutsu; cast options can cast at 0 cost; element values can scale by level (`lvl(...)`); new `maximizeAfter` element.
- Not checked in a running Foundry world.

## 0.48.0-alpha.1 — STD6d: Medical-Nin as data (King 2026-11-15: "start work on using the new Active Effects system to actually automate class features")

- **Every Medical-Nin feature is reviewed:** what can be automated is data, the rest is on its Notes tab, and no buttons are guessed from its text any more. The review table is `docs/classes/medical-nin-automation.md`.
- **Medical Release:** Medical jutsu use Wisdom for their attack and save DC when it's higher.
- **Medical Domain:** Preserve Life and Take Life are options in the cast dialog that spend a Domain Charge. Preserve Life maximizes healing dice equal to the cast rank.
- **Hematoxic Touch** also rerolls 1s and 2s on the Medical jutsu's damage.
- **Battle Medic:** the d12 Unarmed die and +1 critical range (+2 at 10th level). Strength of 100 and Strength of 1000 enter it with 2d12, Mastery on Strength saves and (1000) DR.
- **Two attacks** per Attack action from Chakra Enhanced Combat and Entropic Combatant.
- **Reapers Techniques:** Grim jutsu can be cast as a Bonus Action (D-Rank, C from 10th, B from 18th).
- **Pools grow with level:** Healing Surges (5 at 10th), Blight (5 at 10th), Byakugou Seals (6 at 10th, 8 at 18th).
- **New buttons:** Battle Surge, Healing Burst, Vitality Guard, Overflow, Mending Spark, Vital Transference, Condition Break, Septic Detonation, Malignant Barrier, Rotting Pulse, Plague Doctor, Life Pulse, Hemorrhage Vitality, Curse of the Reaper, Gravetouched, Jashin's Harvest, Transmuted. Toxic Tongue gives immunity to Corroded.
- **Great Weapon Stance:** a critical hit with a Berserker weapon triples the ability modifier (King: the stance text was meant to say triple).
- **For authors:** healing rolls take rule elements; rolls from a cast card know the jutsu's keywords, rank and discipline; cast options can change the casting time, name the one action effect they bring, and be limited by a name prefix or a level-scaled rank; new change keys `n5e.keywordAbility.<keyword>` and `n5e.unarmed.die`. Quickened and Reactive Ninjutsu are data now.
- Not checked in a running Foundry world.

## 0.47.0-alpha.1 — STD6b: stances as data (King 2026-11-15: "QS1. Correct. QS2. Every one. QS3. Notes for now. Try to automate later. Approved.")

- **Stance weapons:** each weapon stance lists the weapons that qualify for it (Ronin = Blade group, Reaper = Flail, Lance = Polearm, Raid = Power, Berserker = Heavy, Stalwart = Blocking, Bullseye = Ammunition or Thrown, Dancer = Light or Multiattack, Assassin = Iron Claw, Deadly or Hidden).
- **Automated:**
  - Blade: advantage on Opportunity Attacks with a Ronin weapon; a critical hit with one gives the target 1 Bleeding (one more from 10th level).
  - Great Weapon: with a Berserker weapon, every weapon damage die showing 1 or 2 is rerolled once, keeping the new result.
  - Guardian: while Dodging, advantage on Strength and Dexterity saves.
  - Power: a critical hit with a Raid weapon gives the target 1 Bruised.
- **Notes:** everything else every stance does is on its Notes tab; the 5th- and 10th-level parts appear only from that level.
- Effect authors get a `rerollBelow` element, a `criticalHit` trigger, and the roll facts `weapon:stance`, `weapon:group:<g>`, `weapon:property:<p>` and `attack:opportunity`.
- Not checked in a running Foundry world.

## 0.46.0-alpha.2 — Shinobi implements (King Q-I1)

- Scout-Nin's third attack counts only the Kunai, Shuriken and Senbon themselves; Fuma-Shuriken, Monster Shuriken, Ballistic Kunai Gun and Ballistic Shuriken Rifle no longer count.

## 0.46.0-alpha.1 — STD6a: items (King 2026-11-15: "Build out the next 3 batches")

- The equipment compendium's weapons, consumables, armor and containers already carry their mechanics as data; two things were still found by name and now aren't:
  - **Basic Shinobi implements** for Scout-Nin's third attack are marked on the weapon (a flag), not matched by name. The seven weapons the old name match caught are marked, so nothing changes yet (question for King: which should count).
  - **Binding Fury Stance's** Fury note on the Combat tab is read from its trigger, not its name.
- Not checked in a running Foundry world.

## 0.45.0-alpha.1 — STD5: in-game review (King 2026-11-15: "Build out the next 3 batches")

- **Automation tab** on every item sheet: each thing the item does as data (activities, effects, rule elements, action effects, triggers, its damage reaction, riders) in plain words, e.g. "Disadvantage on one target's first save (on the action it is chosen for)", and a status: Automated, Partly automated, Notes only, Nothing authored.
- **Notes tab** on every item sheet: what stays at the table and why (note elements), kept apart from the item's text.
- **Effect editor:** the rule-element help lists every key and field with examples, and an "Apply to the action" box makes an action effect.
- **GM Automation Audit** (checklist button in the token controls, or `game.n5e.api.automationAudit()`): the world's items or any N5e compendium, by status, with the items whose text names a mechanic nothing authored covers. Click a row to open it.
- Not checked in a running Foundry world.

## 0.44.0-alpha.1 — STD4: trigger elements (King 2026-11-15: "Build out the next 3 batches")

No rule changes: five coded features are now data.
- **Triggers:** a rule element can fire on an event instead of changing a roll: initiative, turn start, turn end, a hit or a miss, a failed or succeeded save, weapon damage dealt, damage taken, dropping to 0 HP. It can change a resource (Fury included), whisper a reminder, or apply a condition to the creature or its target, at most once per turn when it says so.
- **Uncanny Dodge** and **Deflection** are reaction recipes on their features. Deflection's dice come from a new Deflection Dice column on the Weapon Specialist table (1, then 2 at 11th level, 3 at 20th) and it is offered only against damage DR applies to.
- **Extra Attack** and **General Technique** give their attacks per Attack action as data (Scout-Nin's third attack with Kunai, Shuriken or Senbon included).
- **Adaptive Initiative** lists the skills that may replace Initiative as data.
- **Binding Fury Stance** gains Fury on weapon damage through a trigger.
- Not checked in a running Foundry world.

## 0.43.0-alpha.1 — STD3: conditions and states as data (King 2026-11-15: "Approved")

No rule changes: what each condition and state does to rolls, damage and casting moved from code onto its own entry (`config/conditions.mjs`), so new conditions need no code.
- **Rolls:** advantage, disadvantage and automatic failures from Blinded, Restrained, Prone, Invisible, Petrified, Stunned, Unconscious, Dodging, Staggered, Dazzled (can't gain advantage), Helped (ends after the roll) and Encumbered are rule elements on their entries; "against" elements act on attacks aimed at the creature. Predicates can now read the roll's ability, melee or ranged, and the senses of either creature (Blindsight, True Sight...).
- **Damage:** Petrified's resistance to all damage is an element on Petrified.
- **Casting:** Incapacitated, Stunned, Unconscious and Petrified block casting; Grappled and Restrained block Hand Seals, Chakra Seals and Mobility; Confused blocks Hand Seals; Slowed allows at most 2 components. All read from each entry's `cast` limits.
- **Crash:** "no cost reduction" is a rule element on the Crash state's effect (Chakra Surge).
- Not checked in a running Foundry world.

## 0.42.0-alpha.1 — Standardization STD0–STD2 (King 2026-11-15: "Approved. You can work on STD 0 - 2 all together.")

- **STD0, the gate:** `npm run check` now fails when engine code names a piece of content (a feature, jutsu, clan, feat or item identifier). The 25 names still in code are listed in `tools/hardcoding-allowlist.json`; each later STD batch removes its own. `tools/report-std-audit.mjs` writes `docs/generated/std-audit.md`: those names, other content-driven code, and how much of each pack carries its mechanics as data.
- **STD1, rule elements v2:** an element can now act on **my** rolls (self), on **rolls others make against my action** (imposed: read from the action card), or on **rolls others make that target me** (against). New fields: scope (always, action, turn, round), uses, targets (all, one, chosen) and a trigger event (kept for STD4). New keys: automatic failure or success, reroll (keep lower, higher or the new roll), critical range, maximized dice, minimum die, extra damage, damage handling (ignore resistance, immunity as resistance, a DR multiplier), added condition ranks, inflict, effect, resource and note. Every key and field is validated, and unknown ones are refused.
- **STD2, action effects:** an Active Effect on a feature marked "apply to the action" never acts from the actor. When the feature is chosen for a cast (a Molding, a Maneuver or a cast option), its elements are copied onto the cast card, which lists them in plain words, and they act on the rolls made from that card. Uses are counted on the card; "one target" means the first target to roll uses it up.
- **Precise, Heightened and Piercing Ninjutsu are now data,** with no code naming them: Precise gives advantage on the cast's attack rolls; Heightened gives one target disadvantage on its first save; Piercing makes the cast's damage ignore resistance, treat immunity as resistance and halve DR. A creature resisting the condition still gets advantage, which cancels Heightened's disadvantage.
- Not checked in a running Foundry world.

## 0.41.0-alpha.1 — Gradual ability increases (PRESTD1 A14; King 2026-11-15)

- **New optional rule** in N5e Rules (off by default): **Gradual ability increases.** The level-up step's +1 to an ability comes at levels 2, 6, 10, 14 and 18; the feat and its Mastery rank stay at 4, 8, 12, 16 and 19 (King Q-P12, Q-P14). Off, all three come together at 4, 8, 12, 16 and 19 as before. The level-up dialog shows only the parts due at that level, and undoing a level removes what that level gave.
- Not checked in a running Foundry world.

## 0.40.0-alpha.3 — NPC sheet tab fix (King 2026-11-15)

- **Fixed:** on the NPC sheet the Stat Block tab stayed visible under every other tab (Build, Inventory, Effects, Notes), so the two overlapped. Its layout rule overrode Foundry's rule that hides inactive tabs; it now applies only to the active tab, and a sheet-wide rule keeps every inactive N5e tab hidden.

## 0.40.0-alpha.2 — Window header icons (King 2026-11-15)

- **Fixed:** the menu, minimize and close buttons at the top right of every N5e window showed empty boxes. Our sheet button style (font and cream background) was also applied to Foundry's own header controls, which draw their icons with Font Awesome; it now applies only to buttons inside the window content, so Foundry's icons show again.

## 0.40.0-alpha.1 — The new NPC sheet (NPCUI1; King 2026-11-15)

The NPC sheet is no longer the character sheet with a stat block on top: every number shows once.
- **Header:** portrait, name, "Level · Rank · Class Role", the blurb line (template, size, clan), Short Rest, Long Rest and edit mode; Hit Point and Chakra trackers (current, max, temp, bar, Bloodied/Drained) and the conditions (add, ranks, remove). No Hit or Chakra Dice.
- **Tabs:** Stat Block, Build (GM only), Inventory, Effects, Notes. Hazards and vehicles keep their tab after Stat Block.
- **Stat Block tab:** a panel with AC, DR, Initiative (rolls), Speed, Proficiency and Passive Perception on the left, a divider, and the six abilities on the right, each in its own box with a labelled MOD and SAVE (dark save = proficient); every value rolls through the roll dialog. Then skills, disciplines (attack rolls), defenses, senses and languages; Strikes with an Attack button and "+ Freeform Strike"; Jutsu; Features and Reactions with Use.
- **Jutsu pills:** grouped by discipline (Ninjutsu, Taijutsu with the Bukijutsu jutsu, Genjutsu; an empty discipline isn't shown), then by rank from E/D up to S. Each pill shows the jutsu's action symbol, name and cost on a light gradient through its keyword colors in order (Ninjutsu blue, Taijutsu green, Genjutsu purple, Bukijutsu smoke gray, Earth brown, Wind silver, Fire ruby red, Water turquoise, Lightning gold). Hover shows the full jutsu; click casts; right-click opens the usual menu. "Hide color key" and each discipline's Hide/Show are remembered per user.
- **Build tab (GM):** identity (name, blurb, type, template) moved here from the old header's edit mode, plus the player-style numbers for player-style NPCs, Leave loot, and everything it had before.
- **Players** who don't own an NPC see its name, a condition word (Unhurt, Hurt, Bloodied, Down), what the party has learned and the public notes; no numbers.
- **Removed:** the simple NPC sheet, and the character-only parts on NPCs (Mastery/ASI banner, Will of Fire, Pinned bar, Hit and Chakra Dice).
- Not checked in a running Foundry world.

## 0.39.0-alpha.2 — Compendium sidebar fix (King 2026-11-15)

- **Fixed:** the "N5e Browser" button in the Compendium sidebar stretched to the sidebar's full height and sat behind the pack folders as a large orange block. It now sits in the header's button row (created when Foundry leaves it out), one line high, as it does in the Items sidebar.

## 0.39.0-alpha.1 — Social encounters (PRESTD1 Part F; King 2026-11-15)

- **Start (GM):** select the NPC's token and press the speech-bubbles button in the token controls (or `game.n5e.api.socialEncounter()`). Pick the type (Diplomatic, Intrigue, Hostile), the attitude (Hostile to Helpful: it sets the starting points and the Patience of 2, 3 or 4 rounds), the 2–3 Motivations and 1–2 Pitfalls (the book's lists, or typed), and the Recall Knowledge DC.
- **The tracker** (everyone sees it): the round of Patience, Points of Agreement and Frustration, the score, what has been revealed, and the players' buttons: Make an Impression or Request (Persuasion), Lie or Impersonate (Deception), Coerce (Intimidation), Other skill, Perform, Sense Motive, Recall Knowledge and See Through Lies, with a "Uses a Motivation" tick (+2 to the check; +1 PoA on a success). Each roll opens the roll dialog; the GM's client works out the result against the NPC's Standard DC (King Q-P10: Wisdom save + 10, Insight + 10, Deception + 10), so players don't see the DC, and applies the Argument Results table. Perform gives the next argument +2; Pressure and Revealing True Purpose give disadvantage to the next argument.
- **The GM card** (GM only): the hidden Motivations and Pitfalls with Reveal buttons; Pitfall triggered (+1 PoF and a secret −4 on that round's checks); deception exposed (+2 PoF); Revealing True Purpose (Intrigue); Pressure on the targeted player; the NPC's actions and reactions (roll its check, then add the PoF); ±1 PoA/PoF; Next round; End now. Coerce in a Diplomatic encounter adds +1 PoF on its own.
- **Resolution:** when Patience runs out or the GM ends it, the score gives Critical Success (5+), Success (0 to 4), Failure (−1 to −4) or Critical Failure (−5 or less), and the tracker shows the type's outcome text.
- Not checked in a running Foundry world.

## 0.38.0-alpha.1 — Mission planner (PRESTD1 Part E; King 2026-11-15)

- **Mission planner (GM):** the scroll button in the token controls (or `game.n5e.api.missionPlanner()`). Pick the rank and tier and tick the active players: the planner shows XP per player and the budget (Mission Rewards and Tier Modifications from the Bingo Book, percentages rounded down), the ryo range, the downtime (fixed, or roll its dice), the average adversary level change and the failure payout. Buy encounter elements (social, environmental, combat and combat modifiers, priced × the rank multiplier); each line's cost can be typed over. Spent and left are shown as you go.
- **Saved as a journal page** in the "N5e Missions" journal, with a summary you can show players. The button asks which saved mission to open, or starts a new one.
- **Complete or Fail** (King Q-P9: the book's rule, verbatim): the award quotes the rule as printed ("Players receive XP equal to the total value of all encounters purchased, split evenly among active players."; on a failure also the failure rule), shows each active player's figure (a failure takes the tier's payout: Trivial 75%, Moderate 50%, Extreme 25%), lets the GM change any number, and one **Award** button adds the XP, ryo and downtime to each character and posts the result.
- Not checked in a running Foundry world.

## 0.37.0-alpha.2 — Hazards and vehicles (PRESTD1 D-ii; King 2026-11-15)

- **New actor type: Hazard** (King Q-P8). A hazard is built like an NPC (it rolls, saves and takes damage like one; its attacks and saves can be features and jutsu with activities), with a **Hazard** tab: simple or complex, the Stealth DC to notice it, the check and DC that disables it (any skill, toolkit or ability), hardness (added to its DR), a reset note, its trigger and what it does (shortcuts such as [[/save dex dc=15]] and [[/damage 2d6 fire]] work there). **Notice**, **Disable** and **Trigger** post cards with the check, save and damage buttons for the players to click.
- **New actor type: Vehicle** (King Q-P8), also built like an NPC, with a **Vehicle** tab: hardness, the piloting check and DC, collision damage with its save and DC, crew and passenger seats. Drop an actor on the sheet to add it as crew or a passenger; the leave button takes it off. **Piloting check** and **Collision** post cards with their buttons.
- Hazards and vehicles count as NPCs for privacy, the defeated marker and dying at 0 HP.
- Not checked in a running Foundry world.

## 0.37.0-alpha.1 — Wands, flanking and crafting (PRESTD1 D-i; King 2026-11-15)

- **Wands (GM makes them):** right-click a Ninjutsu or Genjutsu, "Make a wand". The wand holds the jutsu at its rank. "Use wand" (right-click) casts it once a day with the holder's own attack and DC and no chakra, within the holder's own limits. A second use that day overcharges it: the jutsu is cast, then a d20 flat check (DC 10) or the wand breaks. Overcharging it again, or using a broken wand, destroys it and casts nothing (you're asked first). A Long or Full Rest recharges wands; broken ones stay broken.
- **Flanking (optional rule, off by default):** in the N5e Rules panel choose −2 AC against the flankers (PF2e) or advantage on their melee attacks (5e). A melee attack against one target is flanking when an ally (same disposition, not incapacitated) is on the opposite side, both within melee reach; the bonus shows in the roll's breakdown.
- **Crafting:** a "Craft" button on the Inventory tab. Pick an item from the Equipment compendium, its rank (when the item has none) and a toolkit; the toolkit check goes against the rank's DC. Success pays price × materials and makes the item after the rank's days; a critical (DC + 10) halves the days; a failure spends nothing; a critical failure (DC − 10) loses half the materials. DCs (D 12, C 15, B 18, A 21, S 24), days (1, 2, 4, 7, 14) and materials (half the price) are in the new Crafting group of the N5e Rules panel (King Q-P7).
- Not checked in a running Foundry world.

## 0.36.0-alpha.1 — Loot piles, merchants and the party stash (PRESTD1 Part C; King 2026-11-15)

- **New actor type: Loot**, with three kinds (set by the GM on its sheet): a **loot pile**, a **merchant** and the **party stash**. Each holds items and ryo.
- **Piles and the stash:** players open the sheet and press Take (or drag an item to their own sheet); the GM's client moves it. Drop your own item on a pile or the stash to leave it. Give a stash Owner permission for all players; piles start at Observer.
- **Merchants:** Buy pays the item's price times the merchant's buy rate (1) from your ryo; drop one of your items on the merchant to sell it for its price times the sell rate (0.5). The GM can change both rates per merchant (King Q-P5). The merchant's ryo goes up and down with each deal.
- **Leave loot (GM):** "Leave loot" in an NPC sheet's header moves its physical items into a new loot pile placed beside its token. Players never take from an NPC's own sheet (King Q-F2): dragging an item out of a sheet you don't own is now refused instead of copying it.
- Purchases and sales from players go through the GM's client and are announced in chat.
- Not checked in a running Foundry world.

## 0.35.0-alpha.1 — Jutsu scrolls (PRESTD1 Part B; King 2026-11-15)

- **Make a scroll (GM):** right-click a Ninjutsu or Genjutsu on a sheet, "Make a scroll": pick the rank and whether it starts identified. The scroll is a consumable that holds the jutsu (`game.n5e.api.makeScroll(jutsu, {rank, identified, actor})` too). No Taijutsu or Bukijutsu scrolls.
- **Cast from scroll:** right-click the scroll. Anyone can try, with no chakra (King Q-P3): a Ninshou (Ninjutsu) or Illusions (Genjutsu) check against the rank's identify DC (D 12, C 15, B 18, A 21, S 24; Q-P11), within the skill's tier (non-proficient D-Rank or lower, proficient B or lower, Mastery any). On a success the jutsu is cast through the normal cast dialog and card, using the scroll's own attack and save DC for its rank (D +6 / DC 14 … S +14 / DC 22), with no ability requirement or rank cap; the scroll is used up. On a failure nothing happens and the scroll is kept.
- **Identify scroll:** an unidentified scroll shows "Unidentified scroll (C-Rank)". Only the matching skill can identify it (Q-P4), against the identify DC; success shows its jutsu.
- Not checked in a running Foundry world.

## 0.34.0-alpha.3 — Optional rules, part 3 (PRESTD1 A-iii/iv; King 2026-11-15)

More world rules in the N5e Rules panel, which now also has text fields. Defaults keep play as it was.
- **Free feat track:** list the levels (for example "2, 6, 10, 14, 18") and the feat group; the character's main tab shows how many free feats have been earned.
- **Proficiency bonus:** by level (the book), a fixed number, or a slower curve (+2 at 1, +3 at 5, +4 at 11, +5 at 17). Everything built on proficiency follows. Bingo Book adversaries keep their own tables.
- **Critical hit and fumble tables:** name a roll table for each; a natural 20 or 1 on an attack adds a button that draws from it.
- **Homebrew elements:** comma-separated keywords, weapon groups, damage types and languages join the lists (reload after changing).
- **World clock:** a World Clock button on the token controls shows the world's day and time; the GM can move it on by a round, a minute, 10 minutes, an hour, 8 hours or a day (which runs breath, effect expiry and the like).
- Gradual ability increases are not built yet: it waits on a question about how many ability points an ASI gives.
- Not checked in a running Foundry world.

## 0.34.0-alpha.2 — Optional rules, part 2 (PRESTD1 A-ii; King 2026-11-15)

Five more world rules, all off by default.
- **Shared party vision:** players see through every player character's token that has vision (reload the scene after changing it).
- **Players can open the party overview:** the Party Overview button is shown to players: the player characters only, without the GM's Damage, Heal and condition controls.
- **Scale tokens by creature size:** a token's width and height follow the creature's size (Tiny ½, Small and Medium 1, Large 2, Huge 3, Gargantuan 4) when placed and when the size changes. A token flagged `flags.n5e.manualSize` keeps its size.
- **Mark defeated creatures:** a dead creature, or an NPC at 0 HP, is marked defeated in the combat tracker (and unmarked if it comes back).
- **Apply Encumbered automatically:** over Inventory Slots or under a Heavyweight armour's Strength, the Encumbered state is put on and taken off for you (speed halving already applied either way).
- Not checked in a running Foundry world.

## 0.34.0-alpha.1 — Optional rules, part 1 (PRESTD1 A-i; King 2026-11-15)

Eight new world rules in the N5e Rules panel (two new groups: "Optional rules (PF2e variants)" and "What players see"). Their defaults keep play as it was.
- **Critical damage:** double the dice and ability modifier (the book), double the total, or roll the dice and add their maximum.
- **Apply resistances automatically:** off, Apply ignores resistance, immunity and vulnerability, and the damage steps name the ones it skipped.
- **Remove expired effects automatically:** off, effects that run out stay on the creature, marked expired, and the GM's "Effects ended" card lists them once.
- **Players see NPC roll breakdowns:** off, players see an NPC's total and result but not its parts.
- **Hide damage NPCs take** and **Hide NPC condition messages:** for NPCs no player owns, the damage-applied card, condition damage, condition endings and removal results are whispered to the GM.
- **Hide NPC names:** when an NPC token's name isn't shown to everyone, players see "Unknown creature" in chat and the combat tracker.
- **Secret checks:** the roll dialog gets a "Secret (GM only)" box, ticked to start for Stealth, Insight and identify checks; a secret roll goes to the GM only.
- Not checked in a running Foundry world.

## 0.33.0-alpha.7 — Ryo, the size rule and weapon Disarm/Trip damage (FIN5; King 2026-11-15)

- **Give ryo:** "Give ryo" next to Ryo on the Inventory tab. Pick another player character or Allied NPC and an amount up to what you have; the ryo moves (through the GM's client when you don't own the receiver) and chat says "A gave 50 ryo to B" (King Q-F3).
- **Size rule:** Grapple, Shove, Pin and Disarm now follow the same rule as Trip: disadvantage against a target one size larger, impossible against two or more sizes larger (King Q-F4).
- **Weapon Disarm and Trip:** a success deals the weapon's full damage (its die, extra dice, ability modifier and flat bonuses), with Damage and Critical buttons, instead of the die alone (King Q-F5).
- ROLL2 closed with no change: the rolls the system makes on its own (condition damage at turn start, Chilled, recharge, the ammunition die, hazard and falling damage) keep rolling without a dialog (King).
- Not checked in a running Foundry world.

## 0.33.0-alpha.6 — Opportunity Attacks: sight and reach (FIN4c; King 2026-11-15)

- **"Can see you" from token vision:** a creature gets the Opportunity Attack reminder only if it can see the mover with its own token vision (sight and detection modes, walls, darkness, Hidden and Undetected), the same check Uncanny Dodge uses. When that can't be checked (no vision set up on the token, different elevations, a hidden token), the reminder is still sent, marked "Sight not checked" (King Q-F17). Blinded still blocks it.
- **Reach edge to edge:** reach is measured from the nearest square of the watcher to the nearest square of the mover, with the scene's diagonal rule, so Large and bigger creatures reach as far as their size gives them. Gridless scenes subtract half of each token's size from the centre distance; hex grids still measure centre to centre.
- FIN4 is complete.
- Not checked in a running Foundry world.

## 0.33.0-alpha.5 — Indirect Exposure as a GM option (FIN4b; King 2026-11-15)

- **Indirect Exposure (GM):** "N5e Indirect Exposure" on the token controls (and `game.n5e.api.indirectExposure()`) opens a dialog listing the selected tokens, or every creature in a Hostile Terrain region on the scene. You tick who checks, set the Survival DC (the highest terrain DC is filled in: D 18, C 20, B 21, A 23, S 25) and type what a failure does. Creatures with the terrain's Release (Fire for Extreme Heat, Water for Extreme Cold, Medical for Toxic) are marked "may be immune" and start unticked. Chakra Resistant has no check.
- The card lists each creature with "Roll Survival DC X" for its owner; you apply any consequence yourself. Nothing runs on its own (King Q-F14).
- Not checked in a running Foundry world.

## 0.33.0-alpha.4 — Choke and breath (FIN4a; King 2026-11-15)

- **Choke:** Suffocating applied from a Choke outcome remembers it. Out of breath, a choked creature drops to 0 HP and is Unconscious, not Dying. The choke's Suffocating ends at once when the hold ends (let go, escaped, or more than 5 ft apart).
- **Breath outside combat:** a creature that starts Suffocating outside combat holds its breath for its Con modifier in minutes (at least 30 seconds) of world time; when it runs out, it drops to 0 HP and is Dying (Unconscious from a choke). The count starts fresh when combat starts or ends.
- **Set breath (GM):** when a creature starts holding its breath, the GM gets a whispered card with "Set breath" to set the turns (in combat) or seconds (outside it) left, to account for time already spent.
- Not checked in a running Foundry world.

## 0.33.0-alpha.3 — Several damage rolls on one card, and the Clash (FIN3b; King 2026-11-15)

- **Several damage rolls on one card:** a jutsu with more than one damage (Cherry Blossom Impact's strike and its Finisher) keeps every roll on the action card. Each creature's row shows each effect's share ("Strike: Full damage · Finisher: Half damage", from that effect's own save) with its own Apply and Half buttons; the row's Undo removes all of them. The Damage section is done once every effect's damage is rolled. Concentration checks and reactions show per application.
- **Clash at the rank it was cast at:** a jutsu its caster is concentrating on clashes at the rank it was cast at; the chooser shows it ("Fireball (B, cast at S)").
- **GM auto-win:** before a result, the GM sees "<name> wins automatically" for each side. Pressing it decides the clash; the card says the GM decided it.
- **Dispelling ends the jutsu:** the loser's button dispels its jutsu (its concentration ends and every effect the jutsu put out ends at once) and applies Concussed 1 and Dazed. On a Draw, "Dispel both" (each owner for their side, or the GM) does the same for both jutsu without the conditions. A player's dispel reaches the GM to end effects on creatures the player doesn't own.
- Cards posted before this version read their single damage roll and applications as before.
- Not checked in a running Foundry world.

## 0.33.0-alpha.2 — Card and resolution limits (FIN3a; King 2026-11-14)

- **One save per effect:** a jutsu with several saves (Cherry Blossom Impact's strike and its Finisher, Abyssal Aura...) now keeps every save on the action card. Each creature's row lists its saves ("Con Failure, Dex Success"), has a Roll button for each save it still owes, and applies only the conditions of the save it failed. "Roll … for all" appears per save. Will of Fire rerolls the save you pick.
- **Half damage follows its own save:** each save halves only its own effect's damage, for the creature that rolled it; damage with no save of its own follows the jutsu's one save. The damage card's per-target rows follow the same rule.
- **Offered effects are recorded:** when the caster's player applies an effect to a creature they don't own, the card shows "<effect> offered to <owner>". When the owner applies it from the offer card, it appears in the card's Effects section and the card's Undo removes it.
- **Reaction windows on the card:** a reaction window the GM opens for a player's creature (Deflection, Uncanny Dodge...) shows on that creature's row: pending with the time left, waiting for the GM, taken, declined or withdrawn.
- **Immune creatures:** a creature immune to a Genjutsu's stimuli shows "Immune (reason)" on its row. Apply stays, and its damage is reduced to 0 (the summary says why). A condition or effect from that jutsu ends on it at once.
- A card posted before this version reads its single save as the first effect's.
- Not checked in a running Foundry world.

## 0.33.0-alpha.1 — Freeform Strikes and Freeform Jutsu (NPC3; King 2026-11-14)

- **Freeform Strike window:** the Bingo Book's five decisions in one pop-up: range (melee with the reach you set, or ranged 60 ft); what it counts as (Weapon/Freeform, Ninjutsu, Taijutsu or Genjutsu), which picks the attack line; an optional rider from the Effects table with its save and recovery; damage type; and one attack with the damage of all, or one attack per Multiattack. The table's damage, the attack count and the rider DC (Minion lowest, Standard middle, Elite and Solo highest jutsu save DC) update as you choose. A Strike is set when built; reopen it to rebuild.
- **Freeform Jutsu window:** Offensive, Defensive or Support, then the book's steps: rank (with the class and level suggestion), discipline and keywords, range, single target or area and shape, attack or save, up to two extra effects (one for Defensive and Support) with their recovery, and the Defensive or Support focus. The effective level with every Damage Penalty, the damage or focus value, and the chakra cost (D 5, C 9, B 14, A 20, S 30; Minions 0; editable) update live.
- **What they become:** a Strike is a feature on the Combat tab with an attack and damage, and a rider save that applies its condition on a failure. A Freeform Jutsu is a real jutsu that casts through the normal cast dialog and action card:
  - conditions apply on a failed save, and a "save at the end of its turn" recovery repeats the save;
  - AC, DR, speed, attack, save, check and DC penalties and disadvantage are Active Effects, lasting 1–2 rounds when recovery is "wait";
  - forced movement, dispel, action denial and your own effects are notes on the card;
  - Defensive AC, DR, resistance and immunity last until the start of the adversary's next turn, and temporary Hit Points until used up (dice-valued DR applies its average, noted);
  - Support bonuses are under concentration (except Hit Point Burst); Regen is a heal button with a note.
- **Where they open:** "Add Freeform Strike" and "Add Freeform Jutsu" in the Adversary Builder's step 7 (listed there with Edit and Remove, saved with the adversary); "New Freeform Jutsu" on an NPC's Jutsu tab and "New Freeform Strike" on its Combat tab; "Edit in Freeform window" on a Freeform item's right-click menu.
- **Level changes:** Freeform Jutsu are rebuilt when the adversary's level, class or role changes. A jutsu whose damage you edited by hand is kept and marked. Strikes stay as built.
- A Striker reads the Freeform tables 1 level higher. The builder counts Freeform Jutsu against the jutsu limit and Freeform items against the suggested Freeform slots.
- New effect keys: `n5e.resist` and `n5e.immune` (value: a damage type) and `n5e.attack.all`. Item effect activities can carry rule elements (disadvantage and the like).
- Freeform Abilities move to NPC4 with Tenacity.
- Not checked in a running Foundry world.

## 0.32.0-alpha.2 — Iconic traits (King 2026-11-14: "Follow the book")

- An Iconic adversary's suggested trait count is 2 higher, as in the book's Sasuke example. The book gives Epic no extra traits. The level bands stay as the book's table states (+3 at levels 12–17), where the example says +4 at level 13.

## 0.32.0-alpha.1 — The Adversary Builder (NPC2; King 2026-11-14)

- **A step-by-step window** following the Bingo Book's "Build Your Adversary", with a step list (open any step at any time), Next and Back, and a live stat block beside every step. Nothing is saved until Create or Update; closing with changes asks first.
  1. **Concept:** name, portrait, and the one or two sentences (GM only), with the book's examples. The concept also fills the blurb players see, unless you write a separate blurb.
  2. **Class:** Minion, Standard, Elite or Solo, with the book's description and HP rule.
  3. **Level:** 1–30, with the party level you type and the book's guidance (more than 3 levels away is flagged). Previews proficiency, the baseline stat line and the suggested counts. Editing an existing adversary offers "Update modifiers to the new baseline".
  4. **Role and Role Traits:** the five roles with their bonuses, Iconic and Epic, and typed traits (name, rank, text) until the book's trait lists arrive.
  5. **Rank:** the six ranks with HP/CP per level, the jutsu ranks each casts, and the optional Rank bonus.
  6. **Clan and Affiliation:** both optional, with suggestions from the book's clan and species list and the Clans compendium.
  7. **Attacks and jutsu:** named jutsu from the compendium filtered to the adversary's rank (a switch shows every rank), counted against the book's limit; weapons from the Equipment compendium. Freeform waits for NPC3.
  7.5. **Generic jutsu and General traits:** jutsu of any rank and typed traits.
  8. **Calculate and finalize:** the six modifiers with the baseline line and budget ("Use baseline"), fully proficient saves, armor, HP from the formula or a Lazy GM column, players for a Solo, HP and CP overrides.
- **Notes, not walls:** steps with something to look at carry a "!" (Elite below level 3, over the jutsu limit, jutsu outside the suggested ranks, modifiers over budget). Nothing blocks Create.
- **Where it opens:** "Create adversary" on the Actors sidebar (GM); "Open builder" on an adversary's Build tab; and Foundry's Create Actor asks whether to open it for a new NPC.
- **Concept** shows to the GM at the top of the Build tab and on the Notes tab.
- An E-Rank adversary's suggested jutsu ranks are E and D.
- Not checked in a running Foundry world.

## 0.31.0-alpha.2 — NPC sheet gaps and what the players can learn (NPC1c; King 2026-11-14)

- **Build tab, for both builds:**
  - **Defenses:** damage resistances, immunities and vulnerabilities, condition immunities and resistances, picked from the system's lists and shown as chips.
  - **Senses and languages:** every sense with its range, and languages (from the list or typed).
  - **Size and speeds:** size and every speed (walk, climb, swim, fly, burrow, hover).
  - **Switches:** "Dies at 0 Hit Points" and Allied.
  - **Situational skill bonuses:** a skill, a bonus and when it applies ("+2 Stealth in forests"). They appear unticked in that skill's roll dialog and in the stat block's Skills line.
  - **What the players can learn:** drag features, traits, jutsu and items from the NPC's own sheet into the list, or add a statistic or a note. Each entry can be reordered, given a note for the players, marked known or not known, or removed.
- **Stat block:** resistance, immunity and vulnerability lines, condition lines, special senses and languages, shown only when filled.
- **Rest buttons** (Short and Long) on every NPC header.
- **Read the Enemy reveals what can be learned.** A success against an NPC with learnable entries puts a "Choose what it can reveal" button on the result card for the GM. The GM ticks what is available, the reader's owner picks one, and a card shows it to the whole party. The NPC records it; the limited view lists everything the party has learned.
- **Simple sheet:** attack lines as a stat block prints them ("Melee weapon attack: +6, reach 10 ft, one target. Hit: 1d6 + 3 piercing damage."), the Multiattack count, conditions, temporary HP and CP, and uses left beside traits and jutsu.
- **Journal stat block:** an NPC embedded in a journal page shows its stat block, traits, jutsu and attacks. Private notes never appear.
- **Reset NPCs:** a GM button on the Actors sidebar. Pick the selected tokens or a folder, untick anything that shouldn't change, confirm.
- **Fix:** the NPC sheet's raw field editor (Notes tab, edit mode) no longer repeats fields the header and Build tab edit.
- Not checked in a running Foundry world.

## 0.31.0-alpha.1 — The roll dialog (ROLL1; King 2026-11-14)

**Every roll now shows its math first.** No key combination changes a roll any more.

- **d20 rolls** (ability, save, skill, skill action, attack, initiative, concentration, death save):
  - each part of the bonus with a tick, and a running total; any part can be unticked, including ability and proficiency;
  - "Add a modifier" rows: a number or dice ("2", "-1", "1d4") with an optional label;
  - situational modifiers listed unticked (for NPC situational skill bonuses, coming with NPC1c);
  - Advantage, Normal, Disadvantage, with the mode the system worked out preselected and the reasons listed;
  - the DC or target, and any automatic failure; a Roll button (Enter). Closing the dialog rolls nothing.
- **Damage, healing and other dice:** each part with its type, effect modifiers, added damage with a type, Critical (preset from the attack), and the mode ("As worked out" keeps each part's own).
- **Groups roll through one dialog:** saves rolled for several creatures at once, roll requests answered for several tokens, and initiative for several combatants. Action cards get a "save for all" button when two or more targets still have to save.
- **Initiative from the combat tracker** opens the dialog too.
- **Will of Fire rerolls** repeat the edited math with no dialog.
- **Rolls after a cost is paid** (pool dice, rider dice, recovery dice, Deflection, temporary HP from an effect): closing the dialog rolls as shown, so a spent cost always gets its roll.
- **The chat card** lists unticked parts struck through and added ones marked "(added)".
- **New settings:**
  - "Roll without the dialog" (per user, off by default) for anyone who wants instant rolls.
  - "Roll edits shown to" (world, rule settings): Everyone (default) or GM only.
- **Removed hidden keys:** Shift-click (dialog), Alt-click (advantage), Ctrl-click (disadvantage), Alt-click to cast without the cast dialog, Shift-click to remove a condition from a link (the link now asks Add or Remove). The small Adv and Dis buttons on cards are gone; the choice is in the dialog. `npm run check` now fails if code reads a held key (area placement on the map is exempt).
- **No dialog, by design:** rolls the system makes with no roller (turn-start condition damage, Chilled, recharge, ammunition die, hazard and falling damage).
- Not checked in a running Foundry world.

## 0.30.0-alpha.2 — Adversary sheets (NPC1b; King 2026-11-14)

- **New NPCs are adversaries.** A new NPC uses the Bingo Book build. NPCs saved before this release stay player-style until switched on the Build tab; summons, clones and companions are player-style.
- **Build tab** on the NPC sheet:
  - Build (Adversary or Player-style), level, class, role, rank, clan or species, affiliation, armor type, HP source (formula or Lazy GM), Iconic, Epic, the optional Rank bonus, and party size for a Solo.
  - The six ability modifiers with the baseline line for the level and class, a "Use baseline" button, and "Assigned X of Y" against the budget. Going over or under is shown, never blocked.
  - Saves with a tick for each fully proficient one, against the baseline count for the level.
  - Every number (proficiency, AC, DR, HP, CP, initiative, speed, passive Perception, saves, attack bonuses and save DCs for each discipline and the Weapon/Freeform line, skills) with its breakdown on hover and an override box. A blank box means the computed number; an overridden one shows its baseline.
  - Suggested traits, jutsu known, Freeform slots and Multiattack for the class and level.
- **Stat-block header** in the book's layout: identity line, level and proficiency, AC and DR, HP and CP, speed and initiative, the six abilities with Mod and Save, trained skills, passive Perception. Numbers roll on click.
- **Casting lines** above the Jutsu tab ("Ninjutsu. +3 to hit, save DC 11") and the Weapon/Freeform line above the Combat tab.
- **Notes tab** in place of Biography: public notes, private notes (GMs only), biography.
- **Simple sheet** ("N5e NPC Sheet (simple stat block)" in the sheet menu): the whole stat block on one page with traits, jutsu by discipline and rank, and attacks. The tabbed sheet stays the default.
- **Limited permission** shows only the name, portrait, blurb and public notes.
- Not checked in a running Foundry world: these sheets are covered by template and view-model tests only.

## 0.30.0-alpha.1 — Adversary math (NPC1a; King 2026-11-14)

The engine for Bingo Book adversaries. **Nothing changes on the sheet yet**: the Build tab and stat-block sheet that use it come with NPC1b, and every existing NPC stays player-style.

- **Adversary build** (`system.details.build: "adversary"`): the profile (level, class, role, rank, Iconic/Epic, armor type, assigned ability modifiers, party size) gives every number.
  - Proficiency and the baseline modifier lines from the Base Adversary Statistics by Level table, levels 1–30. Adversaries hold modifiers, not scores.
  - Hit and Chakra Points from the book's formula (Elite ×1.25, Solo ×(1.5 + 0.5 per player), Iconic ×1.5, Epic ×2, both ×2.5, rounded down) or the Lazy GM tables.
  - AC and DR from the table by level and armor type; equipped armor doesn't change them.
  - Saves: 2 fully proficient at levels 1–7, 3 at 8–16, 4 at 17+, the rest half; the highest modifiers unless the GM picks.
  - Attack bonuses and save DCs per discipline, plus a Weapon/Freeform line with any ability.
  - Role, class and classification modifiers on AC, DR, saves, initiative, DCs, attacks, skills and speed.
  - Minions: HP 10 + level, no Chakra pool, AC −2, initiative −2, saving throws fail automatically.
  - Optional Rank bonus (ability points equal to Rank), off to start.
- **Overrides:** any computed number can be replaced by a stated one; effects and conditions still apply on top, and the baseline is kept for the sheet.
- **New rule setting:** "Party size for Solo adversaries" (count the players' characters, or typed on each adversary).
- **NPC header:** the Minion/Standard/Elite/Solo field is now Class (`details.class`); `details.role` holds Striker, Defender, Lurker, Controller or Supporter. Migration 8 saves the change for existing NPCs.

## 0.29.0-alpha.3 — Reading and countering jutsu (FIN2b; King 2026-11-14)

- **Read the Enemy** and **Identify** buttons on every jutsu's cast card. Select your token (not the caster) and click.
  - The roll uses the skill for the discipline the jutsu was cast as. Read the Enemy rolls against the caster's save DC and uses the creature's Reaction in combat; Identify rolls against the jutsu's save DC + 5.
  - The result is whispered to the creature's owners and the GM. A successful Read names the jutsu, its rank and targets, then offers one benefit for one creature (select its token; otherwise the reader): +1 to saves and AC, or the discipline's option (Genjutsu: Blinded; Taijutsu: interpose; Ninjutsu: move 10 ft). A successful Identify shows the jutsu's text.
- **Suppress Chakra** now gives a "Chakra Suppressed" effect holding the Suppression Score for 10 minutes. A reattempt in a row is reduced by 2 each time. It ends when the creature casts with chakra, pays upkeep, or spends a chakra-like resource.
- **Counter Tag** (D–A) and **Chakra Suppression Tag** (C–A) are in the Equipment compendium, under Sealing Tools.
  - Counter Tag: target a creature and use Affix. A jutsu of the tag's rank or lower aimed at that creature alone shows **Counter Tag absorbs this** on its card row; using it burns the tag out and the card shows no effect for that creature.
  - Chakra Suppression Tag: roll its Charisma save (DC 15/17/19), then apply the suppression. The cast dialog refuses Ninjutsu and Genjutsu below the tag's rank and says why.
- **Limits.** The +1 from Read the Enemy lasts 1 round and applies to every save and attack in that time, not only the jutsu that was read. Range to the ally is not checked. The tag's attack roll, and removing a tag as an action, are done by hand. Identify works from cast cards only. Other ninja tools are not in the compendium yet.

## 0.29.0-alpha.2 — Grapples, trips and disarms (FIN2a; King 2026-11-14)

- **Holds.** Applying Grappled or Restrained from Grapple or Pin now records who is holding.
  - **Pin, Takedown, Choke and Muffle** are refused unless you are holding the target.
  - **Escape** (Athletics) and **Escape (Acrobatics)** are new skill actions for a held creature. They target the holder automatically, contest the holder's Athletics, and roll at disadvantage when the hold also restrains. On success the card offers **End the hold**.
  - A hold ends, with a chat line, when holder and held are more than 5 ft apart after either moves.
- **Size.** Trip is refused against a target two or more sizes larger, and rolls at disadvantage against one a size larger.
- **Weapon Disarm and Trip.** A weapon with the Disarm property offers Disarm and Grapple on the Combat tab; one with Trip offers Trip and Shove. On a success the card has a button for the weapon's damage die.
- **Readings to confirm (Q-F4–Q-F7).** Built on the book's literal text: the size rule is on Trip only; the weapon die is rolled alone, with no ability modifier; the escaping creature picks Athletics or Acrobatics against the holder's Athletics.
- Not tracked: these weapon actions are not counted against the attacks of the Attack action (nothing in the system counts attacks yet).

## 0.29.0-alpha.1 — Item transfer and item integrity (FIN1; King 2026-11-14)

- **Giving items.** Drop a physical item from a creature you own onto another creature's token or sheet to give it, not copy it. A stack asks "how many?" once. The item arrives unequipped and merges into a matching stack. A chat line records who gave what.
  - You can give to player characters and Allied NPCs; the GM can give to anything.
  - If you don't own the receiver, the GM's client finishes the move with no dialog, and puts the item back if anything fails. With no GM connected, nothing moves.
  - Classes, features, jutsu and the Unarmed Strike can't be given.
  - Not in this release (waiting on King): loot piles and merchants, taking from creatures you don't own, and giving ryo.
- **Duplicate and missing items.** The reported bugs couldn't be reproduced, so each path that could cause them is closed:
  - Clan and background grants, level-ups and the compendium browser's Add no longer give a second copy of a feature, feat, jutsu or stance the creature already has.
  - Unlinked tokens placed before 0.16.0 get their Unarmed Strike (world migration 7).
  - New GM tool **N5e Item Integrity** (token controls): lists duplicate and missing items on every creature and token, with Remove duplicate and Restore buttons. It changes nothing on its own.
  - The build now fails if any compendium link in the packs points at an item that doesn't exist (all 3,065 links are valid).

## 0.28.0-alpha.1 — Feature riders on the action card (CARD1d-a; King 2026-11-14)

- **Riders.** Class, clan and feat effects that ride on an attack or jutsu now plug into its action card:
  - **Cast riders** ("as part of casting, you can spend…") are chosen and paid in the cast dialog, beside the other feature options.
  - **Trigger riders** ("when you hit / when a creature fails / when you deal damage…") appear on the card as **Use <rider>** for the caster's player once a target qualifies, and are paid then.
  - Each qualifying target's row gets the rider's buttons for that creature's owner (the GM for NPCs).
  - A rider can be cancelled, with its cost refunded, until something from it is applied.
- **One save per event (King's ruling).** A rider never adds a second save. Its effects apply when the target fails the action's save. If the action forces no save, the player picks one rider's save as the event save, and each target rolls it once.
- **Stacking.**
  - Rank increases from several riders add together, then the condition's cap applies. The action's own "Apply <condition>" button shows the added ranks.
  - "Your choice" conditions are chosen once for every affected creature.
  - Specialized maneuvers are offered on any row, with a "not your Combat Rival" warning.
- **Starter riders:**
  - Scout-Nin: Amplified Force, Elemental Malady, Authoritative Strike, Arresting Strike, Menacing Assault.
  - Ninjutsu Specialist: Gale Fracture, Stormcircuit (Static marks: two, three at 10th, four at 18th; the oldest ends).
- **For authors:** riders are data. Add an entry to `content/riders/<class>.json`, run `npm run riders`, then `npm run check` (`docs/RIDERS.md`). `node tools/report-riders.mjs` lists every feature whose text reads like a rider: 282 across the seven classes, 7 authored.
- Each condition and effect applied from the card now shows its Apply button only once per creature.

## 0.27.0-alpha.3 — Single action card, part 3 (CARD1c; King 2026-11-14)

- **Reactions on the card.**
  - Each target's row shows the reaction it took against the damage, such as "Deflection (−7)".
  - Jutsu cards get a "Successful hit: reactions" button once the attack is rolled. Weapon-attack cards already have one.
- **Will of Fire on the card.** "Reroll" and "keep higher" buttons appear for the attack (the caster's owner) and for each save (that creature's owner). The new roll replaces the old one on the card, and hit/miss, save results and damage shares update.
- **Concentration on the card.**
  - The card shows whether the caster is still concentrating on the jutsu; the Concentration chip turns done when it ends.
  - A creature that took damage while concentrating gets its "Concentration check DC X" button on its row.
- Undo for damage plus conditions and effects shipped in 0.27.0-alpha.2. CARD1 (parts 1–3) is complete.

## 0.27.0-alpha.2 — Single action card, part 2 (CARD1b; King 2026-11-14)

- **Areas.** Placing a jutsu's area from its card adds the tokens it covers to the card's targets. The Area chip turns done.
- **Saves from the card.** Each target's row has "Roll X save" for that creature's owner (the GM for NPCs). It is the card's own save, so Genjutsu Stimuli immunity, condition resistance and Heightened work as before. Heightened's disadvantage applies only to the first save made against the cast. Save results show as the "DCs and pass/fail shown to players" setting allows.
- **Conditions and effects per target.**
  - A failed save offers "Apply <condition>" on that creature's row; a resave is remembered as on the save card.
  - Effects the jutsu puts on its targets get a per-target "Apply" for the caster's owner. Effects with a cost, a use limit or an action keep only their original button.
  - Each application posts a small linked note that the card records and collapses.
- **Undo** on a row now restores the damage and removes the conditions and effects applied to that creature from the card. It works for the user who applied them, or the GM.
- Reactions, Will of Fire and concentration on the card come in CARD1c.

## 0.27.0-alpha.1 — Single action card, part 1 (CARD1a; King 2026-11-14)

- **One card per action.** A jutsu cast, a feature use, or a weapon attack or strike posts a card that collects the rolls made from its buttons.
  - Section chips show what's waiting, ready or done.
  - Each target gets a row with its AC, hit/miss and save result (as the visibility settings allow), its suggested share of the damage, and **Apply / Half / Undo**.
- **Linked rolls collapse.** Attack, save and damage rolls and damage summaries still post as their own messages, so rolling, Dice So Nice, roll modes and Will of Fire work as before. Once recorded in the card, each one collapses to a "Shown on the … card" line with Show/Hide.
- **Other users' results** (a target owner's save, an application by another user) are recorded in the card by the active GM through a checked owner request, with no dialog. With no GM connected they stay separate cards, which the action card still shows; the GM records them on connect.
- **New world rule "Single action card"** (on by default). Off: cards look and work as before.
- **Fixes:**
  - "View damage roll" on ordinary damage-applied cards now opens the roll.
  - Undo marks its summary as undone, so the action card can't undo it twice.
- Saves rolled from the card by each target's owner, areas, and conditions and effects come in CARD1b. Reactions, Will of Fire and concentration come in CARD1c.

## 0.26.0-alpha.1 — Shared rules core (SHARED1a; King 2026-11-14)

- **The rules are now a shared core** (`module/rules` + `module/config`, see `core.json`) that never touches Foundry directly. Hosts plug in through two hooks: `setRuleProvider` (optional rules) and `setHost` (the live registry). The System registers both in `module/adapters/system.mjs`. Nothing changes in play.
- **Every release ships `n5e-core.zip`** beside `n5e.zip`: the core, its tests, an `index.mjs` of every rules file, `CORE_API.md` and a `package.json` with the System version. The N5e Module will check for a new core once a day.
- **Guard rails.**
  - `npm run check` fails if a core file touches a Foundry global or imports from outside the core.
  - The core tests (`tests/core`) run on their own (`npm run test:core`), in CI and inside the bundle.

## 0.25.0-alpha.1 — Jutsu Clash (CLASH1; King approved 2026-11-14)

- **Clash button** on cast cards of Clash-keyword jutsu. The defender's owner clicks it with their creature selected and picks one of its Clash jutsu (concentrated ones first).
- **Clash card.**
  - Both sides roll the triggering jutsu's discipline skill: Ninjutsu → Ninshou, Taijutsu → Martial Arts, Genjutsu → Illusions.
  - +1 Mastery rank (up to rank 3) for each rank higher.
  - The superior Release (Fire > Wind > Lightning > Earth > Water > Fire) rolls at advantage.
  - Best of 3 when both jutsu are B-Rank or higher.
  - Each owner rolls only their own side, and the card updates as rolls come in.
- **Result.**
  - Win: the winner's jutsu applies, and the loser's is dispelled with an **Apply Concussed 1 + Dazed** button for the loser.
  - Draw (a tie, or both sides auto-winning): both jutsu are dispelled and no one suffers any effects.
  - The card reminds that saves wait until the clash is resolved.

## 0.24.0-alpha.1 — Genjutsu Stimuli and Unaware (GEN1; King approved 2026-11-14)

- **Stimuli immunity.** A creature is immune to a Genjutsu when it is immune to every one of the jutsu's Stimuli:
  - Visual: Blinded or True Sight;
  - Auditory: Deafened;
  - Inhaled: immune to Envenomed;
  - Tactile: immune to psychic damage.
- On a card cast as Genjutsu:
  - the save button skips immune creatures and posts why ("Blinded (Visual)");
  - the attack button names immune targets, and refuses when every target is immune.
- A multi-discipline jutsu cast as something else has no Stimuli immunity.
- **Unaware.** Genjutsu flagged Unaware say on the cast card that targets don't know they're in it until they succeed on Identify Genjutsu.

## 0.23.0-alpha.1 — Standard DCs and falling (SKILL1b, ENV1b; King approved 2026-11-14)

- **Standard DCs (Chapter 6):** the target's named statistic + 10.
  - Shove (vs the target's Strength DC) and Make an Impression/Request (vs the Wisdom DC) now resolve against one target.
  - A Shove that beats the DC by 10 by an Athletics-proficient user also offers Prone.
- **Falling (Option A).** GM macro: `game.n5e.api.fall(actor, feet)`.
  - A fall within the creature's Strength score in feet deals nothing.
  - Otherwise 1d6 bludgeoning per 10 ft (max 100d6), ignoring DR, posted as a damage card for that creature with an Apply Prone button.

## 0.22.0-alpha.1 — Skill actions against a target (SKILL1)

- With one target, skill actions now resolve themselves:
  - against a **passive score** (Lie, Create Diversion...): compared at once;
  - against a **fixed DC** (Calm Animal, Tame Animal...): the target's level sets it;
  - **contests** (Trip, Grapple, Disarm, Pin, Takedown, Muffle, Choke, Feint, Blend In...): the target's owner gets a private card to roll their side. The higher total wins, and a tie changes nothing.
- The outcome card shows the result and margin. When a success applies a status, there's a button for the target's owner or the GM: Trip and Takedown → Prone; Grapple → Grappled, or Restrained when beating by 10 with Athletics Mastery; Pin → Restrained; Choke → Suffocating.
- Shove ("the target's Strength DC") and other ability-DC actions stay manual until King defines an ability DC (Q-S1).

## 0.21.0-alpha.1 — Hostile terrain and suffocation (ENV1a)

- **Hostile Terrain region behaviour.**
  - Draw a Region and add **Hostile Terrain** with its type (Extreme Heat, Extreme Cold, Toxic Environment, Chakra Resistant) and rank (D–S).
  - A creature that starts its turn inside it gets a Direct Exposure card. Its owner rolls the Con save (DC 18–25 by rank); a failure rolls the terrain's damage (3d6–9d6 fire, cold or poison) onto a damage card for that creature, ignoring DR.
  - D-Rank terrain deals no direct damage. Chakra Resistant adds its rules as a turn-card note. Overlapping terrains use the highest DC.
- **Suffocating** in combat: the creature holds its breath for its Con modifier in turns (min 1), counted on its turn card. When it runs out, it drops to 0 HP and is Dying.
- Falling damage waits on King's choice between the two Chapter 7 rules.

## 0.20.0-alpha.1 — Positioning (POS1)

- **Cover.**
  - New token statuses: Partial Cover (+2), Half Cover (+4) and Total Cover. The GM sets them, and only the highest applies.
  - Partial and Half add to AC and Dex saves (shown in the breakdowns).
  - Attacks against a creature in Total cover are refused.
- **Opportunity Attacks.**
  - In combat, when a creature leaves a hostile's reach, that hostile's owner (and the GM) gets a private card with an **Opportunity Attack** button. The button uses the hostile's longest-reach melee weapon, or an unarmed strike.
  - The attack uses the Reaction. Nothing is rolled automatically.
  - No reminder for: teleports, forced movement, a Disengaged mover, a creature that already used its Reaction, or one that is incapacitated or Blinded.
- **Disengage and Dodge** now take effect when used from the Actions list: Disengage stops Opportunity Attacks for the rest of the turn; Dodge turns on Dodging.
- **Engaged.** A melee attack against a single creature engages both, until a full round passes without one.
- **Surprised.** On its round-1 turn a Surprised creature's Action and Bonus Action are spent (the turn card says so). It can't take Reactions until that turn ends, and Surprised ends at the start of round 2.
- **Dodge** is lost at speed 0 (Grappled, Restrained) as well as while incapacitated.

## 0.19.0-alpha.1 — Per-target resolution (RES1)

- **Damage cards resolve each target.** A damage card rolled from an attack or a jutsu card gets a "Per target" box with one row per creature:
  - from the attack (one roll compared to each AC): Hit or Critical hit takes full damage, Miss or natural 1 takes none;
  - from that card's saves: Failure takes full damage, Success takes half (when the save says half on success) or none, four-tier Critical Success takes none;
  - a creature that was hit and also saved takes the save's share.
- Each row has its own **Apply** / **Apply half** button. It goes through the normal damage path (reactions, Undo), so one damage roll covers every target.
- Rows appear as the saves come in. Each player sees rows only for their own creatures; the GM sees all.
- Attack and save rolls made from a card's buttons now record that card, and saves record whether success halves the damage.

## 0.18.0-alpha.1 — Multi-discipline casting (MDISC1, King 2026-11-13)

- **Cast as.**
  - A jutsu that lists several disciplines (for example Ninjutsu + Genjutsu) has a "Cast as" choice in the cast dialog.
  - The attack bonus, save DC and ability requirement (B 16 / A 18 / S 20) use the chosen discipline's ability.
  - Moldings only apply when cast as Ninjutsu. The Inner Gates block applies when cast as Ninjutsu or Genjutsu. Sealed's cost increase and feature cast options follow the chosen discipline.
- **Locked while concentrating.** A concentration jutsu keeps the discipline it was cast as for its whole duration. Recasting can't change it, and Flow's Ninjutsu advantage and the Inner Gates read it.
- **Cast card.** It names the cast discipline. Its psychic damage ignores DR only when cast as Genjutsu.
- **Known lists.** A multi-discipline jutsu counts as each of its disciplines for known-list checks, swaps, prerequisites and learning limits. These are shared helpers for the features that check them.

## 0.17.0-alpha.2 — Light, weapon choice for strikes, Evocation (ATK1b, King 2026-11-13)

- **Light extra attack (Chapter 5).**
  - With two Light weapons equipped, each gets a "(Light extra attack)" entry: one extra off-hand attack once per turn, after you take the Attack action, adding the ability modifier.
  - In combat it checks that the Attack action was taken and the extra attack is unused. Outside combat nothing is tracked.
  - The Chapter 8 Bonus Action "Off-hand Attack" is removed.
- **Strikes choose their weapon.**
  - Stance and feature strikes no longer use the first equipped weapon. A strike may name what it needs (`weapon: {keywords, groups, properties}`).
  - One match is used. Several open a chooser. With none, the strike says what to equip and refunds its cost.
  - Strikes that name no need offer every equipped weapon. Stance data is unchanged (King's own update).
- **Evocation (Combat Scrolls).**
  - The item sheet has an "Evocation: sealed echo" section: Ninjutsu, Genjutsu or Weapon (Taijutsu), plus the damage type.
  - Attacks use that discipline's attack bonus and the echo's type, with no ability modifier. The die grows to 2d/3d/4d at levels 5/11/17.
  - The card notes the 1-attack-per-Attack-action limit.
  - An empty scroll asks you to seal an echo first.
- The weapon item sheet can now edit weapon groups.

## 0.17.0-alpha.1 — Weapon attacks (ATK1a, King 2026-11-13)

- **Bonuses.** Weapon and unarmed attacks now include flat bonuses (`system.bonuses.attack.weapon` / `.unarmed`, `system.bonuses.damage.weapon` / `.unarmed`), the new effect keys `n5e.attack.weapon|unarmed` and `n5e.damage.weapon|unarmed`, and Mastery on `attack.weapon` / `attack.unarmed`. They all show in the attack's breakdown.
- **Unarmed Strike** uses Dex instead of Str when your Taijutsu use Dex and Dex is higher. It counts as Finesse for features.
- **Weapon properties in attacks.**
  - Critical X adds crit range (still capped at +3). Deadly X adds X weapon dice to the Critical damage button.
  - Heavy: disadvantage below Str 16, and half the Str modifier is added to damage on top of the normal modifier.
  - Volatile X: no ability modifier on damage. A natural roll at or below X backfires: no damage, and the weapon is jammed until **Unjam** (an Action) on the Combat tab.
  - Versatile weapons get a "(two hands)" entry with the larger die.
  - Multiattack weapons get a "(bonus action)" entry: one attack that spends the Bonus Action, with no ability modifier on damage.
- **Range and throwing.**
  - Melee weapons that can be thrown get a "(thrown)" entry. Targeting a creature beyond your reach throws automatically.
  - Beyond normal range: disadvantage. Beyond long range: the attack is refused.
  - A ranged or thrown attack with a hostile within 5 ft (one that can see you and isn't incapacitated) has disadvantage.
  - Finesse or Thrown weapons use the better of Str and Dex.
  - The Ammunition Die is rolled only on thrown and ranged attacks, never on a melee swing.
  - Thrown weapons without the Ammunition property now carry a d4 Ammunition Die. A Returning weapon thrown within 60 ft is caught, so its die isn't rolled.
- **Migration.** World migration 6 gives existing thrown weapons their d4 die.

## 0.16.0-alpha.3 — All weapons and the Unarmed Strike item (DATA2, King 2026-11-13)

- **Weapons compendium.** All 55 weapons from the Chapter 5 tables are in the Equipment compendium, in Simple, Martial and Exotic folders: cost, damage die and type, properties with ranks, thrown and ranged ranges, Versatile dice, groups, Bulk and their base keyword.
  - Weapons with two damage types list both; the Combat Scrolls take the sealed echo's type.
  - Battle Wire and Hiya Taihou carry their Special rules text; the Combat Scrolls carry the Evocation note.
  - Weapons with the Ammunition property use the Ammunition Die.
- **Unarmed Strike item.** Every new character and NPC gets an Unarmed Strike weapon item (0 Bulk, always proficient). It can't be deleted, unequipped or added twice. Attacking with it is the same as the Unarmed Strike action: 1 + Str bludgeoning, or your stance's [Unarmed Damage]. Equipped-weapon features and weapon strikes ignore it.
- **Migration.** World migration 5 adds the Unarmed Strike to existing characters and NPCs when the GM loads the world.
- Clan stance categories are left for King's own update.

## 0.16.0-alpha.2 — Weapon proficiency (DATA1b, King 2026-11-13)

- **Base weapon keywords.** Every weapon carries its own base keyword (`kunai`, `battleWire`, `fumaShuriken`...).
- **Proficiency by category + group.** Classes and feats grant `category:group` pairs (`simple:blade`, `martial:power`) or a base weapon. Whole-category grants ("Simple") are written out as every group of that category.
- A weapon with several groups needs only one matching pair. A weapon with no groups is matched by category alone.
- Everyone is proficient with Kunai, Shuriken, Senbon and the Unarmed Strike. NPCs are always proficient.
- Attack proficiency is now worked out from the actor's grants (`system.grants.weaponProf`). A weapon stored as not proficient stays that way as a manual override.
- "One exotic weapon"-style choices stay as text for now.
- **Migration.** World migration 4 adds the base keywords and expands class grants when the GM loads the world; the compendiums were updated the same way (8 files).

## 0.16.0-alpha.1 — Data model update (DATA1a, King 2026-11-13)

- **Jutsu disciplines.**
  - A jutsu can list several disciplines (`system.disciplines`).
  - Bukijutsu jutsu are now Taijutsu jutsu with the Bukijutsu keyword; sheets, cards, level-up and the Compendium Browser still show a Bukijutsu group.
  - Hijutsu keep every discipline they list.
  - Four Ninjutsu that also list Bukijutsu stay in the Ninjutsu group.
- **Keywords.**
  - One naming style (camelCase, like `fireRelease`): `main-branch` becomes `mainBranch`.
  - Nine wrongly joined keywords are split, and stimulus forms are plain stimuli (`genjutsu-visual` becomes Visual).
  - Combination is removed.
  - Keywords with a value are stored as `key:value` (for example `deadly:1`).
- **Feature kinds.**
  - Class Feature, Class Feature Option, Clan Feature, Clan Feature Option, Feat, plus reserved NPC kinds.
  - Background features are Clan Features.
  - All feats are one Feats group; their old categories (General, Skill, Ninjutsu…) are keywords that keep them apart in level-up, background feat picks, the Features tab and the browser.
- **Migration.** World migration 3 updates world items, character items and unlinked tokens when the GM loads the world. The compendiums were updated the same way (2,682 files), and the content import scripts now produce the new shape.

## 0.15.0-alpha.9 — Concentration (CONC1)

- An incapacitated creature loses all concentration at once (Incapacitated, Stunned, Unconscious, Dying, Dead, Petrified). A card lists what ended. The jutsu's areas, summons and dependent effects end with it.
- Effects from a concentration jutsu now end when that concentration ends, including effects placed directly on owned creatures (activity effects, Amps, Branded), not only those applied from Apply cards.
- **Ready a jutsu (KB 03).**
  - The cast dialog offers "Ready it" for 1-Action jutsu, with an optional trigger. The chakra is paid and held with concentration, and a Readied card is posted.
  - **Release (Reaction)** on that card spends the Reaction and posts the normal cast card.
  - If the concentration breaks, or the jutsu isn't released before the creature's next turn starts, it is lost and the chakra stays spent.
  - A readied jutsu has no upkeep.

## 0.15.0-alpha.8 — Roll modes per group in the Effects tab (King 2026-11-13)

- The sheet's Advantage toggle moved from the header to a "Roll modes" section at the top of each character and NPC sheet's Effects tab.
- It has four groups, each set separately to Dis / Normal / Adv until switched back:
  - D20 rolls (attacks, saves, checks);
  - Damage;
  - Healing;
  - Other dice (pool and feature dice, Short Rest dice).
- A value set on 0.15.0-alpha.7 still applies to all four groups until changed.

## 0.15.0-alpha.7 — Pre-cast checks and roll-mode controls (CAST1)

- **Casting is blocked, with the reason, when:**
  - the caster is Incapacitated;
  - Hand Seals, Chakra Seals or Mobility are needed while Grappled or Restrained;
  - Hand Seals are needed while Confused;
  - the caster is Slowed and the jutsu has more than 2 components;
  - the caster is Shocked and has already attacked or cast this turn;
  - the caster is Sealed 3+ and the jutsu teleports;
  - the caster is Blinded and the jutsu is Dojutsu;
  - the ability score requirement isn't met;
  - the jutsu (or the upcast rank) is above the highest rank for the caster's level.
- **Shocked:** limits weapon attacks and strikes too: one attack or one jutsu per turn.
- **Roll-mode toggle (King 2026-11-13):** every character and NPC sheet has Dis / Normal / Adv in its header. It applies to every roll until switched back to Normal.
- **Adv / Dis buttons on cards:** every roll button on a chat card (attack, damage, save, healing, checks, strikes, resaves, concentration checks, roll requests) has small Adv / Dis buttons beside it, for that roll only. Alt/Ctrl-click now also works on damage, healing and other dice rolls.

## 0.15.0-alpha.6 — Advantage on any dice roll (ADV2, King 2026-11-13)

- Advantage and disadvantage now apply to any dice roll, not only d20s: damage, healing, Short Rest Hit/Chakra Dice, and other activity dice (pool and feature dice).
- With advantage the whole roll is made twice and the higher total is kept; disadvantage keeps the lower; both cancel. The card shows both totals.
- Only the dice a source names get it. New rule-element keys `advantage` and `disadvantage` use the existing selectors:
  - `damage`: every damage part;
  - `damage:fire`: only fire damage dice;
  - `healing`, `recovery`, `dice`;
  - and any d20 selector, such as `attack`, `save` or `skill:ste`.
- Predicates work as for modifiers. The effect editor accepts these rules.
- `game.n5e.api.rollDice(actor, formula, {kind, type, key, damageType})` rolls any other dice through the same sources.

## 0.15.0-alpha.5 — Advantage engine and automatic save failures (ADV1)

- Rolls now count advantage and disadvantage sources from conditions and states, dnd5e-style. Any advantage and any disadvantage cancel; the click (Alt/Ctrl) or a forced mode counts as one source. The sources are listed on the card.
- **Attacks by the creature:**
  - Blinded: disadvantage, unless it has Blindsight, Tremor Sense or Chakra Sensing.
  - Restrained or Prone: disadvantage.
  - Invisible: advantage, unless the target has True Sight or Chakra Sight.
  - Staggered: disadvantage on Str/Dex/Con attacks, saves and checks.
  - Dazzled: can't gain advantage.
- **Attacks against the creature:**
  - Petrified, Blinded, Stunned, Unconscious or Restrained: advantage.
  - Prone: melee advantage, ranged disadvantage.
  - Invisible: disadvantage, unless the attacker has True Sight or Chakra Sight.
  - Dodging: disadvantage.
- **Saves:**
  - Petrified and Stunned automatically fail Str/Dex saves; Unconscious fails all saves.
  - Blinded: disadvantage on Dex/Int/Wis saves.
  - Dodging: advantage on Dex saves.
- **New states:** Dodging ends at the start of the creature's next turn. Helped gives advantage on the next attack or check, then ends.
- Weapon attacks know whether they are ranged.

## 0.15.0-alpha.4 — Damage numbers (DMG1)

- **Bruised:** the creature takes +4 damage from every source, added to the first HP damage type before DR (King 2026-11-13).
- **Weakened:** −4 damage dealt per rank.
- **Exhaustion:** −1 per rank, once per roll, on damage rolls, healing rolls and Short Rest Hit/Chakra Dice (King A7: all dice).
- Weakened and Exhaustion on damage are taken off the roll's total, first damage type first, never below 0. They are stored on the damage card and taken off when the damage is applied.
- **Petrified:** resistance to all damage. Immunity still wins, and Half does not stack with it.
- Each change appears in the applied-damage record.

## 0.15.0-alpha.3 — "End of next turn" conditions out of combat (King 2026-11-13)

- Out of combat, Staggered, Dazed, Compelled: Berserk, Compelled: Confused and Slowed end immediately when a game effect applies them (failed saves, jutsu text links, trackers).
- Conditions you apply deliberately stay: added from the sheet, the GM Party Overview, or by dragging the condition effect onto the creature.
- When combat ends, these game-applied conditions end, along with timed effects that have run out.

## 0.15.0-alpha.2 — Timed effects expire (EXPIRE1)

- Effects with a duration (generic effects, Amps, Marks, activity effects) are removed when their duration runs out.
  - In combat: checked for every combatant at each turn start.
  - Out of combat: checked whenever world time advances (rests, travel, the GM's clock).
- Conditions that don't Persist now expire out of combat after their duration (the 1-minute default). In combat they keep their turn-end processing.
- Never removed automatically: effects with no duration, [Persists] conditions, and effects tied to their source's turns.
- What ended is listed on one GM-whispered card.

## 0.15.0-alpha.1 — Turn engine (TURN1)

- Turn start, turn end, round start and combat start/end now come from a new N5e Combat class, using Foundry's forward-only turn methods (as dnd5e does). Rewinding a turn or round no longer re-runs upkeep, condition damage, decay, recharge or effect events. The duplicate turn hooks are gone.
- Uses and resource pools marked per turn, per round or per encounter now recover: turn at the creature's turn start, round at each round start, encounter at combat start and end. What recovered is listed on the turn card.
- **Concentration upkeep prompt (King 2026-11-13).**
  - At the start of each turn, the owner ticks which concentration jutsu to maintain. A running CP total stops them choosing more than they can pay.
  - If chakra covers none, all end automatically.
  - An unanswered prompt ends those jutsu at the end of the turn.
  - Jutsu that are dropped lose their areas, summons and dependent effects.
- New world rule "NPC concentration upkeep": Automatic (default; maintain while chakra allows), Ask the GM each turn, or Manual tracking. Allied NPCs are asked like players.

## 0.14.0-alpha.2 — dnd5e-parity chat visibility and roll requests (OPS1b)

- Attack cards list every target with Hit / Miss / Critical hit / Natural 1. The new rule "Attack results shown to players" (all / hit-miss only / GM only; default GM only) matches dnd5e's Attack Roll Visibility. The GM always sees results and AC.
- New rule "DCs and pass/fail shown to players" (everyone / player-owned rolls only / GM only; default player-owned), matching dnd5e's Challenge Visibility.
- New rule "Conceal NPC item descriptions", matching dnd5e's setting of the same name.
- GM roll requests: a request icon next to [[/save]] and [[/check]] links posts a request card for the selected tokens, or for anyone. Each player sees and rolls only for creatures they own.
- Effect-application cards (from OPS1a) are wired to chat: the owner of each recipient presses Apply.
- Not included: a Bloodied visibility setting. N5e has no on-token Bloodied marker yet, so the setting would control nothing.

## 0.14.0-alpha.1 — Multiplayer parity with dnd5e/PF2e and Allied NPCs (OPS1a)

- No GM approval dialogs anywhere, and no GM relay for player → NPC changes (King 2026-11-13). Each user changes only what they own, as in dnd5e and PF2e; the GM applies results to NPCs.
- Casts, attacks, rolls, rests, feature uses, resources, healing, Will of Fire, death saves and tracker buttons run on the clicking user's client.
- Apply buttons act on owned recipients and name the rest ("The GM applies this to: …").
- Effects on creatures you don't own go on an Apply card for their owner. Effects tied to concentration end with it.
- "Successful hit" reactions run for owned recipients without a confirmation dialog. A player's choice on a GM's reaction window applies automatically.
- **Allied NPCs.** Summons, clones and companions are placed for the summoning player, who owns and controls them. They join combat beside the caster. New world rule "Players may summon Allied NPCs" (default on).
- **Owner intents.** Allied NPC placement, party rations and reaction choices finish on the GM's client from an authenticated flag on the player's own actor, with no socket and no dialog.
- **Removed:** `module/socket.mjs`, `automation/multiplayer.mjs`, the `multiplayerCoordination` rule and the manifest socket.

## 0.13.0-alpha.14 — Complete Jiraiya jutsu content import (JUTSU1)

- Import all 968 source-book jutsu into the core Jutsu compendium: 403 Ninjutsu, 167 Genjutsu, 146 Taijutsu and 252 Bukijutsu.
- Organize 118 folders as Discipline / Nature Release or Group / Rank; preserve the existing 12 jutsu IDs and distinguish both Brutal Block variants.
- Preserve original rules, keywords/stimuli, costs/components, riders and 1,535 source expressions with line/hash provenance. Record four metadata-label repairs without changing source text.
- Author existing-schema activities conservatively: never combine alternative/periodic damage with base damage. 192 source-clear higher-rank damage maps are consumed by the existing cast-card activity selector; current unarmed damage types follow the active stance.
- Charge imported fixed Special chakra costs through existing cost rules. Eleven unresolved/scheduled/ambiguous costs are explicitly manual rather than silently free; complex choices/riders remain source-directed.
- Add a reproducible checked-in source snapshot, importer, coverage report and ten focused checks. No new gameplay framework, live verification or local installation.

## 0.13.0-alpha.13 — Compact Foundry damage cards (CHAT1)

- Use Foundry's standard expandable dice renderer for the actual damage roll only.
- Remove custom roll prose, repeated damage types/totals, normal-versus-critical comparisons, applied calculation blocks and coordination/undo boilerplate from new chat cards.
- Applied cards retain the recipient/result and a compact dice icon for the source roll. Verification and calculation records remain internal; arithmetic is unchanged.
- Seven focused checks passed; no live verification or local installation.

## 0.13.0-alpha.12 — Damage roll/application trace (DT1)

- Show original formulas, kept/discarded die results and normal/critical formula basis directly on new damage cards.
- Associate application with the saved source roll, verify typed amounts/totals against stored rolls, and retain a structured per-recipient audit.
- Show rolled amount, DR/multiplier steps, final damage, temporary-pool consumption and HP/CP before/after. View source roll without rerolling; preserve source whisper/blind visibility on summaries.
- Resolve legitimate card actions stored in message flavor as well as content, while fingerprinting both and still rejecting changed action data.
- Six focused automated checks passed; no damage-rule change, live testing or local installation. Separate ActorDelta duplicate-item and GM-approval policy reports are not claimed fixed.

## 0.13.0-alpha.11 — Effect services (ES1)

- Dynamic numeric changes use the existing bounded N5e arithmetic parser and a fixed base/source snapshot. Invalid or missing references skip only that change with actor diagnostics.
- Event-count expiration handles turn start/end, combat end, damage taken, confirmed hits and rests with persisted counters and duplicate event suppression.
- Opt-in world Macro bindings require active-GM approval keyed to the effect, bindings, Macro code and ownership. Foreign scripts remain inert; Macro code is trusted, not sandboxed.
- Add optional appearance provider registration and a reversible built-in filter (grayscale, sepia, brightness), with independent cleanup and error isolation.
- Integrate authoring and approvals into the expanded editor and APIs. Portable copies exclude executable bindings. No live verification or local installation.

## 0.13.0-alpha.10 — Expanded effect authoring (EE1)

- Expand the existing Foundry effect editor with a searchable typed field browser, explanations, presets, validation and draft-only add/remove/import actions. Save is the commit boundary; stale document saves are refused.
- Expose existing N5e level/stance suppression, activity exclusivity, state, conditional roll predicates and source-turn expiration controls alongside native transfer/duration settings.
- Add bounded field estimates, N5e contribution previews, source/timing diagnostics and a raw draft view. Preserve unknown existing flags and unchanged legacy rows.
- Export portable N5e effect data; import/copy disabled effects without IDs or foreign executable flags. Explicitly identify future engines as unavailable.
- Nine focused automated checks passed; no live verification. GitHub publication only.

## 0.13.0-alpha.9 — Native multiplayer coordination (MP3)

- Route native casts, feature use, attacks, activities, resource payments, healing, rests, trackers, saves and damage through active-GM execution, preserving the existing planners and local actor locks.
- Carry player selection/target snapshots; reconstruct actions from original stored cards and reject cards changed while awaiting approval. Remote requests retain mandatory GM review.
- Return verified durable results, coalesce simultaneous clicks, retain duplicate detection and isolate failed requests with an unconfirmed-result warning. No automatic retry or expanded recovery.
- Add Retarget to rolled damage; retain the original roll and use the recipient's defenses. Permit successful-hit confirmation windows and rolled-damage reactions only. Other timings are manual.
- Defer nested chains and advanced redirects by user instruction. No live verification; user performs in-game acceptance. No local Foundry installation changes.

## 0.13.0-alpha.8 — Extensible reactions and reviewed recovery (RX3 / MP2)

- Replace hardcoded reaction branching with an owned-item adapter registry, multiple offers, deterministic priorities and one-use preparation.
- Add a GM item-sheet damage-reaction editor: rolled DR, multipliers, resource costs, reaction spending and automated source sight. Keep existing DR/HP/CP arithmetic.
- Resolve explicitly authored nested interruptions newest first, with depth/work bounds and no mutation lock held while choosing child reactions.
- Revalidate eligibility, costs, authority and turn immediately before commit, including after DR allocation dialogs.
- Share durable GM command coordination through the public API; allow explicit recovery of interrupted review, never replay applying/uncertain mutations.
- Publish the exact CI-verified artifact without a redundant release test run. No local Foundry installation changes or new live verification.

## 0.13.0-alpha.7 — Live-verified reaction fixes (LIVE1)

- Close stale owner prompts on resolution, handoff or deletion without sending an extra decision.
- Make long automation recovery histories scrollable.
- Record 17 isolated live scenarios, their coverage and limits. No production Foundry installation changes.

## 0.13.0-alpha.6 — N5e dice-expression precedence (MATH2)

- Route N5e-owned dice through a local grouping adapter so addition/subtraction precede multiplication/division; keep Foundry dice evaluation and third-party Roll behavior intact.
- Preserve explicit grouping, supported pool/function syntax and flavor; report unsupported syntax rather than falling back to conventional precedence.
- No global Roll patch or new dependency.

## 0.13.0-alpha.5 — Observer visibility and Uncanny Dodge (VIS1)

- Use observer-specific Foundry13 detection with token-size sampling; Blindsight qualifies per user ruling, while unsupported/ambiguous sight remains unresolved.
- Integrate visibility-checked Uncanny Dodge with the optional coordinated damage pilot, reaction revalidation and non-stacking/cancelling multiplier rules.
- No GM visibility substitute, full cover engine, elevated-scene certification or live multiplayer certification is claimed.

## 0.13.0-alpha.4 — Coordinated damage and base Deflection (RX2)

- Optional GM damage-card workflow with durable per-card/actor identity, private reaction decisions, eligibility rechecks and combined damage/resource/reaction updates.
- Apply user rulings: DR independently protects HP/CP; the creature chooses type allocation within a pool; Deflection is rolled DR with the same rules.
- Legacy manual workflow stays default; coordinated corrections use explicit reconciliation rather than unsafe snapshot undo. Advanced Deflection and Uncanny Dodge remain outside this pilot.

## 0.13.0-alpha.3 — N5e numeric precedence and damage modifiers (MATH1)

- Numeric formula parser evaluates addition/subtraction before multiplication/division, with explicit grouping and no JavaScript evaluation.
- Flat damage subtraction precedes multipliers; equal half/double sources apply once and opposite sources cancel.
- Scope: numeric preparation and damage planning; complex Foundry dice syntax still requires a later adapter. No automated ability use yet.

## 0.13.0-alpha.2 — Reaction decision-window pilot (RX1)

- Optional private owner accept/decline prompts, active-GM review and final resolution, persisted deadlines, and a GM-editable 60-second timeout (0 disables it).
- Decisions never auto-spend or apply effects; no unattended use of unauthenticated player replies. Uncanny Dodge remains pending automated visibility.
- Records the user's N5e arithmetic precedence ruling; arithmetic implementation is a separate prerequisite batch, not silently changed here.

## 0.13.0-alpha.1 — Multiplayer receipt foundation (MP1)

- Keep GM review mandatory for unauthenticated remote effect/ration requests, superseding the 0.10.1 automatic-request option by explicit user direction.
- Persist request intent/results, reject changed-content replay, serialize remote requests and stop uncertain applications from retrying after reconnect.
- Add GM-only receipt inspection and explicit archive/epoch rotation. Retain upstream button, save-cost, parser, free-cost and ration fixes.
- Scope: existing remote effect/ration relay, not yet coordinated combat or reactive prompts. Live multi-client validation remains outstanding.

# 0.12.0-alpha.2

- Remove all 147 imported Clan Feats and their empty folders; exclude them from future content builds while the rules are being revised. Preserve clan features, Hijutsu and other clan content.

# Changelog

## 0.10.1-alpha.1 — Review fixes

### Fixed
- **Failed button clicks:** a click that stops with a warning (no targets, not the owner, coated weapon you don't own...) now refunds its pool cost and no longer uses up once-per-turn or the action.
- **Player effects on enemies:** Marks, Branded, Amps and jutsu effects on creatures a player doesn't own apply right away again; the GM's client still checks every request. A declined or timed-out request shows a notice and the other targets still get the effect.
- **Costed saves:** saves with a cost and no damage (Okuri-Inu Fang) get a **Use** button that pays it. The defenders' save button stays free, and a once-per-turn feature's allowance is no longer blocked by its own save clicks.
- **Text parser:** damage types in jutsu text are matched with correctly escaped names.
- **Free pool costs:** a 0-cost pool feature (Weapon Katas) no longer posts a "Spent 0" roll.
- **Rest with rations:** a declined or timed-out ration request stops the rest with a notice instead of an error.

### Added
- **N5e Rules → Casting and combat:** "GM approves player requests" (off by default). On: the GM confirms each player request in a dialog, as in 0.10.0.

## 0.10.0-alpha.1 — Shared execution and maintenance safeguards

### Correctness
- Preserve resource-gain, amount-choice and repeat-save activity fields through item loading.
- Apply once-per-turn activity limits, including alternative buttons on one feature; record declared action costs.
- Route activity and damage-card healing through one service, including Envenomed and revival cleanup.
- Validate resource amounts and serialize local commands; refund a cancelled activity's pool payment.
- Keep recognized alternative save outcomes separate, avoid immunity/removal infliction, and recognize runtime registry additions.
- Show explicit instructions for manual activity kinds instead of silently omitting them.

### Maintenance
- Separate activity execution, resource arithmetic/payment, actor sequencing and healing into focused modules.
- Reject undeclared activity fields during verification; registration keys/labels are validated.
- Add versioned repair for dropped booleans on linked world items without replacing IDs or other edits.
- Record migration failures and retain their prior version; validate replacements and attempt restoration on failure.
- Gate both CI and publishing on the same verification command, also required by manual release builds.
- Add focused regression coverage and an opt-in live Foundry smoke check (`game.n5e.api.runSmokeTests()`).

### GM behavior
- Remove unrestricted remote deletion and validate effect/ration requests. Remote privileged requests
  now require GM review because system sockets do not authenticate senders. Owned changes remain direct.
- Ration-dependent player rests wait for approval before granting benefits.

### Boundaries
- Local command queues prevent overlapping clicks on one client, not simultaneous control from several clients.
- Text parsing remains a fallback; unusual conditional prose needs authored activities.
- Live Foundry and multiplayer smoke checks are separate from automated Node verification. See `docs/MAINTENANCE.md`.

## 0.9.3-alpha.2 — Rules settings window fix

- Fixed **Open N5e Rules** failing to open: its template had multiple top-level elements, which Foundry's ApplicationV2 renderer rejects. A single wrapper now contains the header, rules and footer.
- Preserved scrolling for the grouped rules and the player's read-only view.
- Added regression coverage using the actual panel context and template for both GM and player views.

## 0.9.3-alpha.1 — Automation framework

### Added
- Data-driven contextual modifiers and save-tier shifts on owned items and Active Effects, with nested predicates, source labels and optional Features-tab toggles.
- Expandable d20 roll breakdowns. Target-specific predicates use a single target, never a guessed target for a group.
- Authored four-tier save text selects one outcome; Will of Fire rerolls recalculate the outcome. Existing save-tier Active Effects now participate in d20 saves.
- Temporary weapon damage coatings, with typed damage, expiry and optional use counts. Weapon attacks and strikes apply coatings without editing base weapon data; uses are spent on the damage roll.
- GM summon/clone placement from authored world Actor templates, using unlinked tokens. Concentration and elapsed world time clean up flagged tokens across scenes without altering the template actor.
- Public automation API, `n5e.summoned` extension hook, and `docs/AUTOMATION_FRAMEWORK.md` with examples, stored fields, boundaries and a live-world checklist.

### Scope
- This completes the reusable framework batch after 0.9.2. Features still need authored rule data; it does not infer every mechanic from prose.
- Save outcomes display their selected text; conditional effects still require application. Summon templates retain their authored stats and ownership. Coatings currently add damage, not arbitrary on-hit conditions or weapon properties.
- Verified outside Foundry; live v13 world testing remains required. No additional classes, levels or clans are imported.

## 0.9.2-alpha.1 — Compendium Browser

### Added
- **N5e Compendium Browser:** every Item compendium plus world items in one window.
  - Open it with the **N5e Browser** button in the Compendium and Items sidebars, the **Browse** button on the character sheet's Jutsu tab, or `game.n5e.browser()`.
  - **Jutsu tab:** rank, discipline, section, keywords (all must match), activation, chakra cost range, concentration, has an area, source.
  - **Features & Feats tab:** category, class, option group, level up to, source.
  - **Stances tab:** category, source.
  - **Equipment tab:** type, category, weapon group, price up to, source.
  - **Classes & Origins tab:** classes, subclasses, clans, backgrounds.
  - Every tab: name search (optionally the rules text) and sorting (rank, name, cost, level, price).
  - Filter lists show how many items have each value.
  - Drag a row onto a sheet; click a name to open it; **+** adds it to your selected token or character.

## 0.9.1-alpha.1 — Shortcuts in text

### Added
- **Roll shortcuts** for journals, item descriptions and chat (full list in `docs/TEXT_SHORTCUTS.md`):
  - `[[/save dex dc=15]]`; `dc=nin|tai|gen` uses the item owner's save DC; `inflict=staggered,bleed:2` adds Apply buttons on a failure.
  - `[[/check prc dc=12]]`, `[[/check tool=medicine]]`, `[[/check str]]`.
  - `[[/damage 2d6 fire, 1d6 cold]]`: a damage card with Apply buttons.
  - `[[/heal 2d8 + 3]]`; add `temp` or `cp`.
  - Saves and checks roll for your selected tokens (else your character), the same way cast-card buttons do.
- **Condition and State links:** `@Condition[bleed 2]`, `@State[prone]`.
  - Hover shows the rules (KB 05).
  - Click applies to the selected tokens; Shift+click removes.
- **Custom labels:** `{label}` after any shortcut.
- Jutsu descriptions on cast cards resolve shortcuts with the caster's numbers.

## 0.9.0-alpha.1 — Jutsu on the map

### Added
- **Area shapes from jutsu:**
  - Cast cards for jutsu with an area get a **Place area** button (e.g. "20-ft radius", "15-ft cone").
  - With the new rule on (default), placement starts right after casting.
  - The area comes from the jutsu's area fields, else its range text ("Self (15-foot cone)"), else its description.
  - Upcast rules that grow the area add to the size for each rank cast above base.
  - Shapes: cone (53°), line (with its width), cube, sphere/radius, cylinder.
  - Self areas sit on the caster; cones and lines turn toward the cursor. Other areas follow the cursor, snapped to the grid.
  - Shift or Ctrl + mouse wheel rotates. Left click places; right click or Escape cancels.
- **Targeting from the area:** placing an area targets every token inside it (any square it occupies). The caster is left out of Self areas.
- **Lasting areas:**
  - Instantaneous areas leave the map at the end of the caster's turn.
  - Timed areas (1 minute = 10 rounds) leave when their round comes.
  - Concentration areas leave when concentration ends.
  - A creature starting its turn inside a lasting area gives the GM a card with that jutsu's buttons.
- **Senses on tokens:**
  - Darkvision sets the token's sight range and darkvision mode.
  - Blindsight, Tremor Sense, True Sight and Chakra Sight become detection modes.
  - New **Chakra Sensing** detection mode: notices creatures with chakra, through walls.
  - Changing a sense on the sheet updates every token. Set a token's `flags.n5e.manualVision` to keep its own settings.
- **Movement:**
  - Climbing or swimming without that speed, and crawling, cost +1 ft per ft (Foundry's difficult terrain still applies on top).
  - The token ruler turns yellow past your speed (Dash) and red past double.
- **N5e Rules panel:** new "Map: areas, senses and movement" section with a toggle for each of the above.

## 0.8.1-alpha.1 — Class feature automation

### Added
- **Genjutsu Specialist:**
  - Reality Shift (Alteration of Reality) as a 1-minute Will Amp state that spends an Actualization Die.
  - Rending Thoughts: Wisdom save on the Genjutsu DC, with damage buttons for success, failure and critical failure.
  - Mental Refocus and Phantasm buttons for Actualization Dice.
  - Mind Over Matter as a Genjutsu cast option (+Genjutsu modifier psychic damage).
  - Phantom Vapors: Alchemist's tools, a Vapor Charges pool, throw and recharge buttons.
  - Inceptions: Hallucinatory Instrument, Illusory Weapon attacks (melee and ranged), Reality Marble, Temporal Stopwatch.
  - Mirages: Beguiling Influence and Illusionary Vigor Mastery, Demon Sight darkvision, Cloak of Chains, Decelerate,
    Book of Stolen Secrets, Psyche Drinker, Relentless Pain, Muddled Movements.
- **Hunter-Nin:**
  - Creed proficiencies granted (Warden, Brutal, Medical, Stalkers, Void, Wolf), plus Brutal speed and Stalkers Blindsight.
  - Pools with gain and spend buttons: Carnage, Black Medicine Array, Dread Arsenal, Prosthetic uses, Posture.
  - Void Anchor marks; Cunning Action Stealth check.
  - Every Skilled Exploit gets a check button for its skill.
- **Medical-Nin:**
  - Channeled Healing adds its healing to Medical jutsu automatically (once per turn).
  - Rejuvenating Rest roll; Talented Support and Hematoxic Touch cast options.
  - Blight and Healing Surge counters; Ascension state; Transfigured Technique.
  - Byakugou Seals pool and Battle Medic state; Chakra Scalpel attack; Mystical Palm.
- **Taijutsu Specialist:**
  - Sustained Pressure damage and Valve Break cast option.
  - Path cast options in a Taijutsu stance (Tyrant, Genius, Savage, Predator, Hero, Technician); Genius +1 Taijutsu DC.
  - Martial Techniques: saves, rolls and Martial Die cast options (Arresting, Forceful, Drowsy, Martial Guard,
    Parry The Shot, Delayed Fall, Precise, Raw, Technical, Shockwave, Quivering, Regenerative Surge,
    Hurricane Strikes, Step of Savagery).
  - Moment of Stillness breakers (Bone, Balance, Flow) with saves and Broken effects.
  - Momentum, Tempo and Perfection counters; Elemental Cloak state.
- **Weapon Specialist:**
  - Critical Focus (+1 Bukijutsu crit range); Eye for Skill check.
  - Augmentations: Restorative healing, Mobile speed roll, Sensory Blindsight, Enduring/Psyche/Tactical spends.
  - Katas: saves (Battle Boast, Disorienting Strike, Horrid Aggression, Muted Strike), rolls, effects,
    Hidden Hand Mastery, Efficient Bukijutsu cast option, Discipline gain buttons.
  - Doctrines: Battle Trance, Waltz and Samba (one at a time), Vector Seal, Quarry, Obsidian Ward pool, Provoke, Okuri-Inu Fang.

## 0.8.0-alpha.1 — Five more classes, levels 1-5

### Added
- **Genjutsu Specialist, Hunter-Nin, Medical-Nin, Taijutsu Specialist and Weapon Specialist**,
  levels 1-5. Each comes from the book with:
  - Its table, proficiencies, every core feature from 1st to 5th level, and its stance pick.
  - Every subclass, with its features up to 5th level.
  - Every option list, with options that need a level above 5th left out.
  - The level-up dialog handles them all.
  - **Genjutsu Specialist:**
    - 5 Genjutsu Pledges, 4 Genjutsu Inceptions, and 46 Malleable Mirages (2 at 2nd, 1 more at 4th).
    - Actualization Dice (1 + proficiency, d6). With Mental Refocus, a Short Rest gives 2 back.
    - Illusions Mastery.
  - **Hunter-Nin:**
    - 6 Hunter Creeds, and 27 Hunters Exploits (Skilled and Combat).
    - Lethal Precision (Taijutsu or Bukijutsu), plus Silent Killing granted.
    - Lethal Attack dice from the table.
    - Skilled Exploit uses (proficiency per Long Rest).
    - A free-choice Mastery at 5th.
  - **Medical-Nin:**
    - 5 Tenets of Medicine.
    - Medical Domain with Domain Charges (4; all back on a Short Rest).
    - Medicine Mastery.
  - **Taijutsu Specialist:**
    - 5 Taijutsu Styles, 17 Martial Techniques, 6 Paths of Perfection, and the 3 Moment of Stillness
      techniques.
    - Martial Dice, which refill at the start of every turn.
    - Replaces the Phase 1 sample class, keeping its id.
  - **Weapon Specialist:**
    - 6 Combat Doctrines, 30 Katas in their four groups, and 6 Augmentations.
    - Weapon Focus group.
    - Discipline (d12 Flurry Die; all back on a Short Rest).
- **Automation for the new classes:**
  - **Genjutsu Specialist:**
    - Actualization cast options: +rank d6 damage, or −1 to the targets' save per die.
    - Actualization skill-check die.
    - Chakra Disruption: a cost increase on the targets.
  - **Hunter-Nin:**
    - Lethal Attack damage buttons (full, or half for the Attack action).
    - Swift Response Initiative Mastery.
    - Primary Target marker.
  - **Medical-Nin:** Preserve Life, Sustain Life and Take Life buttons that spend a Domain Charge.
  - **Taijutsu Specialist:**
    - Martial Technique AC.
    - Enhanced Movement speed: +10, then +15 from 5th.
  - **Weapon Specialist:** Deflection, Chakra Strike and Chained Momentum buttons that spend
    Discipline.
  - **Option costs:** Martial Techniques spend Martial Dice, Katas spend Discipline (only the ones
    whose text spends it), and Skilled Exploits spend a use.
- **Level-up:** free-choice Mastery steps.
- **Framework additions:**
  - Pools that refill each turn.
  - Pool maxes that scale by level.
  - Rest recovery by formula, which can require a feature.
  - Effects that apply only at some levels.
  - `@rankValue` in cast-option formulas.
- **Folders:** class option lists are filed by their book groups (Skilled / Combat Exploits, Kata
  groups).

### Fixed
- Only Scout-Nin's Extra Attack gives a third attack with Kunai, Shuriken or Senbon.

### Not included
- Intelligence Operative, Puppet Master and Science-Nin stay out until they're remixed.

## 0.7.1-alpha.1 — Automation pass for the content in the system

### Fixed
- **Unarmed damage:** only Taijutsu stances (and stances that say so) set the Unarmed die to d6.
  Bukijutsu and Chakra stances no longer do. Serpent Fist deals piercing, Silent Killing slashing
  (d8 with Iron Claws), and Iron Fist rolls a d8 with Combat Bracers when Strength is your Taijutsu
  ability. Inner Gate dice now also apply to Unarmed Strikes.
- **Stance effects** apply only while that stance is active.
- **Focus** only recovers to half on a Short Rest with Tenketsu Refinement (5th level).
- **Chakra Surge** now includes the Flow box, which the book layout had placed in Chakra Compression.

### Added
- **Stance strikes and abilities.** The active stance shows its strikes on the Combat tab; they post
  as a card with buttons. 5th- and 10th-level options appear at those levels. The strikes: Bleeding
  Edge, Reaping Swing (with its DR penalty), Savage Attack (+1 die, 10th-level Prone save), Guardian
  Strike, Bone Breaking Strike (Str save, Bruised, AC penalty), Roaring Strike, Opposite End, Sweeping
  Attack, Raiding Strike (Pierce 4), Bunny Roundhouse, Serpent Grasp, Serpents Rattle, Pinpoint Shot
  (max die), Assassination Strike (max die), Flutter Attack (two attacks, Dazed save) and Wolf Fang
  Fist (die +1 step, 2 attacks, 3 at 10th).
  - **Passive effects:** Rabbit Fist +10 speed; Titan Fist Reinforced (= Taijutsu modifier, or
    armor's +2) and Titan Guard (+2 AC and DR until your next turn).
  - **Other stance abilities:** Great Weapon rerolls 1s and 2s on Heavy weapons' damage die;
    Drunken Fist's damage reduction roll.
- **Class features:**
  - **Chakra Compression:** a cast-dialog option that cuts cost by the rank, once per turn, on
    1-Action Ninjutsu.
  - **Chakra Surge:**
    - Enter Crash or Flow, a Will Amp for 1 minute. Entering one ends the other.
    - Crash adds its +d10s to Ninjutsu damage (half for areas), lifts the one-Molding limit, and
      blocks cost reduction.
    - Flow gives +Ninjutsu DC, +1 Focus at the start of each turn, and advantage on Ninjutsu
      Concentration checks.
  - **Quickened / Reactive Ninjutsu** change which action the cast uses.
  - **Pyroclasm:**
    - Gained once per turn when casting a Fire Release jutsu (max 3).
    - **Detonate:** choose how many to spend; Dex save, 2d6 fire and Burned per Pyroclasm.
    - **Hellrend:** cast option; targets' DR −2 per Pyroclasm until the end of your next turn.
    - **Devastation:** cast option; rolls the d6.
  - **Brutish Momentum:**
    - **Combat Rival** marker, which ends when combat ends.
    - **Relentless Durability:** spend a Superiority Die for temporary HP (×2 at 10th, ×3 at 17th).
  - **Superiority Dice** are rolled whenever they're spent. The Assault Maneuvers have buttons for
    their saves and effects (Arresting Strike, Menacing Assault, Rending Critical, Limit Breaker,
    Knock Back, Whirlwind Strike, Staggering Will, Relentless Retaliation, Superior Momentum).
  - **Jack of All:** pick the active Generalization on the Features tab.
    - **Warfare:** bonus d8s on casts (cast option) or attacks (button), 1 Superiority Die, once per
      turn.
    - **Seize** and **Tactics** have buttons.
  - **Switch Hitter:** pick your Primary discipline on the Features tab. Superior Assault's +1 crit
    range follows it. Follow Up and Set-Up place their markers and penalties.
  - **Extra Attack / General Technique:** attacks per Attack action are shown on the Unarmed Strike.
  - **Meditation:** a group CP roll.
  - **Path of the Swift:** +10 speed.
  - **Tenacious Ninjutsu:** a clash roll.
  - **Scholar:** Ninshou Mastery at 7th and 13th.
- **Feats:**
  - **Illusionist Research:** +1 Int or Wis, and Illusions proficiency (Mastery if already
    proficient).
  - **Master of Disguise:** Disguise Kit proficiency (or Mastery).
  - **Light Step Mastery:** +1 AC reaction.
- **Jutsu:**
  - **Forceful Bull:** Strength becomes 18 and 8 temporary HP, with a refresh button.
  - **Fox Fire:** a Glowing marker on the target.
  - **Glamor Tongue:** a marker on the target.
- **New building blocks** for future content:
  - Strike activities (Unarmed or weapon, die steps, extra dice, Pierce, maximized die, several
    attacks).
  - Effect activities (self or targets, ending at the start or end of your turn or the end of your
    next turn; temporary HP, Amps, exclusive states).
  - Roll activities, and pool costs (fixed, rolled, or "any number").
  - Level-scaled formulas: `lvl(1:1d8,5:2d8)`.
  - Feature choices, and cast options from features.
  - Feat proficiency grants.
  - The `n5e.reinforced` effect key.
- Content automation lives in `tools/content/automation.py`, so it survives re-importing the books.

## 0.7.0-alpha.1 — Phase 6: trackers and GM tools

### Added
- **Stamina** (optional rule, N5e Rules → Resting): a Stamina pool equal to your proficiency bonus
  appears on the rail. Feat abilities with Short Rest, Long Rest or rest-based uses spend Stamina
  instead of their own uses. Full on a Long Rest, half back on a Short Rest.
- **Chilled:** when a Chilled creature moves more than 5 ft in a turn, a damage card posts (1d10 cold
  per rank, ignores DR, once per turn). Forced movement is skipped; Apply hits that creature.
- **Fury tracker** (Combat tab): gain and spend buttons, and a Furious token status. Fury lasts until
  the end of the turn after you gain it. While in **Binding Fury Stance**, you gain Fury the first
  time each turn you roll weapon or Bukijutsu damage. The new effect key `n5e.fury.max` lets a
  feat stack Fury (Power Weapon Adept: +2).
- **Marks:** while you concentrate on a Mark jutsu (Rundas, Takeminakata's, Neith's, Apollo's,
  Artemis's, Ullr Ammo), the Combat tab has **Mark targets**. It marks the targeted creatures and
  steps your equipped weapon's Ammunition Die down 1. Marks show on the token and end at the end of
  your next turn.
- **Branded:** jutsu that Brand get a **Brand targets** button on the cast card. It places
  "Branded (Jutsu Name)" on the targeted creatures.
- **Amps:** jutsu that grant an Amp get an **Apply Amp** button on the cast card (targets, or
  yourself). The Combat tab lists your Amps with time left. With the optional Amp limit, a new Amp
  switches off older ones (Singleton: same type; Rule of 3's: oldest), and you pick which applies.
- **8-Inner Gates tracker** (with the 8-Inner Gates: Seimon feat):
  - **Open Gate N** in order (Action, Bonus Action or Reaction), up to the gates your takes of the
    feat allow. Gate 8 asks for the GM's permission.
  - Each gate's bonuses add up (Taijutsu attack and DC, speed, AC, Unarmed dice, crit range, Mastery,
    Pierce), and Gate 2 grants 10 temporary HP.
  - While a gate is open you can't cast Ninjutsu or Genjutsu, and their concentrations end.
  - **Close the gates** applies the Exhaustion, Bruised after Gate 7, and death after Gate 8. The
    gates then can't reopen for 10 minutes.
  - New effect key `n5e.unarmed.dice` (extra Unarmed damage dice).
- **End-of-turn resaves:** when a jutsu says the target can repeat the save at the end of each of its
  turns, the condition it applies remembers the save. At the end of each later turn, a **Resave**
  button appears, and a success ends the condition.
- **GM Party Overview** (Token controls → users icon, GM only): every player character and
  combatant with HP, CP, conditions, states, concentration, Fury, open Gate and Amps. Quick
  Damage / Heal (with type, through the full damage pipeline, undoable) and Add Condition per row.

## 0.6.0-alpha.1 — Phase 5: rests, condition lifecycle, optional rules

### Added
- **N5e Rules panel** (Game Settings → Configure Settings → N5e Rules): every automated rule can be
  switched on or off, grouped by Rolls, Casting, Damage, Conditions, Resting, Rations and Character.
  - Open to all players; only the GM can save changes.
  - **Book defaults** resets everything.
- **Rests** from the character header (Short / Long / Full):
  - **Short Rest:** spend up to half your Hit Dice and, separately, up to half your Chakra Dice,
    rolled together (+ Con per die). Death saves reset.
  - **Long Rest:** half max HP and CP back, half of spent Hit and Chakra Dice back, temporary HP and
    CP end, −2 Exhaustion with food and drink. Counts as a Short Rest for recoveries.
  - **Full Rest:** everything back; [Persists] conditions end.
  - Resource pools and limited uses recover on the matching rest; a summary card is posted.
  - Long and Full Rests need at least 1 HP; Envenomed creatures get no benefit.
- **Rest limits** (GM setting, free by default):
  - **Count:** Short Rests per Long Rest and Long Rests per Full Rest (0 = unlimited).
  - **Time:** one Long Rest per 24 hours, one Full Rest per 96 hours.
- **Ration Pool** (optional): pool size and current rations, Short and Long Rest costs, and whether
  Full Rests are allowed on missions are all editable. A rest without enough rations passes time with
  no benefit. Players' rests spend rations through the GM.
- **Condition lifecycle:**
  - **Turn start:** Burned (1d8 fire per rank) and Bleed (1d6 necrotic per rank) post a damage card;
    Apply hits that creature and ignores DR.
  - **Turn end:** Shocked, Shaken and Demoralized lose a rank; Staggered, Dazed, Berserk, Confused and
    Slowed end. A condition gained during the same turn waits for the next one.
  - **Default 1-minute duration** for conditions that don't persist or end on their own.
  - **Try to end** (hand icon on the rail): pick the check, roll vs the DC, spend the Action. Bleed
    removes an extra rank per 2 over the DC; a failed check against Sealed raises its DC by 4.
  - **Condition resistance:** advantage on saves against conditions you resist. Immunity blocks them.

## 0.5.0-alpha.1 — Phase 4: damage and conditions

### Added
- **Damage cards** roll each damage part separately (so each type keeps its amount) and carry
  **Apply / Half / ×2 / Heal** buttons that apply to the selected tokens.
  - **Interception:** select the interceptor and apply to them; the interceptor replaces the target,
    so their defenses are the ones that count (King's ruling).
  - **DR:** applied **once** to the whole damage calculation, before resistance, reduced by the
    attacker's Pierce.
  - **Psychic:** Genjutsu psychic damage ignores DR.
  - **Resistance and vulnerability:** resistance halves (round down) and vulnerability doubles; both
    on one type cancel. Immunity zeroes it.
  - **Chakra damage** goes to temporary CP, then CP; everything else to temporary HP, then HP.
- **Apply summary card** per application:
  - What each target took and the reductions applied.
  - **Undo** (restores HP, CP, temporary pools and death saves).
  - A **Concentration check** button for any target concentrating on a non-Stable jutsu:
    Con (Chakra Control) vs max(15 + ranks of everything concentrated on, half the damage). A
    failure ends those jutsu.
- **0 HP:**
  - Characters fall **Dying** (unconscious).
  - Damage beyond 0 that's at least max HP is instant death.
  - Damage while at 0 adds a death save failure (2 on a crit), and NPCs that die at 0 are marked
    **Dead**.
  - Healing at 0 ends Dying and resets successes.
  - **Envenomed** creatures can't regain HP.
- **Death saves:**
  - Shown on the rail at 0 HP (success and failure pips, Roll button) and offered on the start-of-turn
    card.
  - d20, no bonuses: 10+ succeeds; a natural 1 counts as two failures; a natural 20 brings you back to
    1 HP and removes two failures.
  - Three successes = Stabilized; three failures = Dead.
- **Conditions from failed saves:** the save button lists what the jutsu inflicts (read from its text,
  e.g. Butterfly Kick: Concussed 1; Flame Whip: Prone, Burned; Snake Constricting Grip: Restrained).
  A failed save shows **Apply** buttons for each, used by the creature's owner, because some only
  apply under conditions the text describes.

## 0.4.0-alpha.3 — Phase 3, release 3: turn flow and the NPC sheet

### Added
- **Start of each combatant's turn** (run once by the active GM):
  - **Concentration upkeep:** half the cost paid at casting (Efficient pays nothing), paid jutsu by
    jutsu; one that can't be paid ends.
  - **Chain** resets to 0 unless a Chain jutsu raised or maintained it since the last turn.
  - **An armed Combo** clears.
  - **Action economy** resets.
  - **Recharge abilities** roll their die (Recharge 5-6 = d6, 7-8 = d8, and so on) and come back
    on a hit.
  - One short chat card summarises it, with an **End** button for each jutsu still concentrated on.
- **Action economy tracker** at the top of the Combat tab: Action, Bonus, Reaction, Special,
  Object.
  - Casting, attacking and using features mark their slot automatically.
  - Click any slot to mark or restore it.
  - The cast dialog warns when the slot is already used.
- **NPC sheet:** every tab, roll, cast, attack and the Combat tab from the character sheet, with a
  stat-block header.
  - Play mode shows a summary (Level · Rank · Role · Type · Template).
  - Edit mode sets level, rank, role, creature type, template, stat-block HP/CP max (blank = from
    level) and the Hit/Chakra Die.
  - The Class/Clan/Background strip is hidden for NPCs.
- Limited uses can recover on **Recharge** (new "Recharge" range field, e.g. 5-6).
- The Phase 1 raw-data sheet stays available (not default) under Sheet configuration.

## 0.4.0-alpha.2 — Phase 3, release 2: attacks, damage, casting

### Added
- **Casting a jutsu**: Use (Jutsu or Combat tab) opens the cast dialog. Alt+click casts at base rank
  when nothing needs choosing.
  - Pick the cast rank (upcasting), and a multiplier or divisor when several apply (caster's
    choice).
  - Tick Moldings (spend Focus; Ninjutsu only, more than one warns about Crash) and Assault Maneuvers
    (spend Superiority Dice; one per turn warns).
  - Pick which concentration to end when at the limit.
  - The preview shows cost, CP left, extra resources and upkeep, and Cast stays off while anything
    blocks the cast (not enough chakra or Focus, missing affinity, concentration full).
  - Casting spends CP and resources, starts concentration with the cost paid recorded (upkeep = half),
    and updates Chain and Combo/Finisher, all in one update.
- **Cast card**: what was spent, the rules text (collapsed), and buttons for the jutsu's parts.
  - **Attack** (rolls the jutsu's attack with the crit range).
  - **Damage** and **Critical** (dice and ability modifier doubled, nothing else).
  - **Save** (each controlled token rolls vs the DC; Genjutsu report four-tier results).
  - **Temporary HP / Healing** (applies to controlled tokens or the caster; temp HP keeps the higher).
- Jutsu with no authored activities have their parts read from their text: "Make a melee ninjutsu
  attack", "Dexterity saving throw", "2d10+2 Fire damage", "[Unarmed damage] + 2d6", "half as much
  damage on a success", "gain 12 Temporary Hit points". All 12 compendium jutsu work this way.
- **Weapon and unarmed attacks** (Combat tab strikes, inventory Use):
  - Melee uses Str, ranged uses Dex, finesse/thrown the better of the two; plus proficiency and
    condition penalties.
  - Damage and Critical buttons are on the card.
  - Weapons with an Ammunition Die roll it after each attack; a 1-2 steps it down, and 0 removes
    the item.
- **Features spend their cost when used**: Moldings take Focus, Assault Maneuvers take Superiority
  Dice (the number in their text, e.g. Relentless Retaliation 2), and limited-use features take a
  use. A feature you can't pay for is refused with the reason. Feature cards show what was spent and
  their rollable parts.

### Changed
- Applying damage to tokens (DR, resistance, interception, concentration check on damage) is Phase 4;
  damage is rolled on the card for now.

## 0.4.0-alpha.1 — Phase 3, release 1: rolls

### Added
- **Everything rolls from the character sheet**:
  - ability checks (click the modifier in the ability strip), saves, skills, toolkits;
  - initiative (rail);
  - discipline attacks (Main tab);
  - the concentration check (Combat tab);
  - every skill action on the Combat tab, which rolls with its −3/−5 tier penalty and shows the
    roll and outcome from Ch6.
- **Roll modifiers:** click rolls; **Shift+click** opens a dialog (advantage/disadvantage plus a
  situational bonus); **Alt** = advantage; **Ctrl** = disadvantage.
- **Chat cards:**
  - Hover the bonus to see its breakdown.
  - Natural 20 and natural 1 are flagged, and attacks use the actor's crit range (+3 cap).
  - Condition penalties apply once per roll.
- **Will of Fire:**
  - Cards show buttons to spend one for a reroll or for advantage after the fact (a second d20,
    keep the higher).
  - The first natural 1 or 20 in an encounter grants one (max 3) with a chat note.
- **Adaptive Initiative** (Scout-Nin): rolling initiative offers Athletics, Ninshou, Illusions or
  Insight instead. In a combat, the roll sets the combatant's initiative.
- **Effect editor:** the Active Effect Key field suggests every N5e key (DR, Pierce, crit range,
  jutsu cost and upkeep by discipline/rank/keyword, save DC, attack, discipline ability, all dice,
  save-tier shift, concentration max, Mastery for every skill/save/toolkit) and the system bonus
  paths. Hover a key to see what it does; known keys turn green.
- Actors now compute ability check totals (`system.abilities.<key>.check`).

## 0.3.0-alpha.3 — Item sheets

### Added
- One N5e item sheet for all 13 item types, replacing the placeholder:
  - **Header:** image, name, and a one-line summary (e.g. "D-Rank Ninjutsu · Fire Release",
    "Simple melee weapon", "Medium jutsu tier").
  - **Sidebar of key facts (PF2e-style):**
    - Jutsu: cost, time, range, area, duration, attack and save DC when owned.
    - Weapons: damage, range, Ammunition Die.
    - Armor: AC, Dex cap, Str requirement.
    - Features: kind, uses, prerequisites, ASI.
    - Also keyword, component and property chips, and the source book.
  - **Description:** rich-text editor, plus the extra text fields an item needs: Chain 1-3 on Chain
    jutsu, Finisher on Finisher jutsu, Overcharge / At higher ranks when present, and stance upgrades.
  - **Details:** typed fields per item type, with click-to-toggle chips for keywords, stimuli,
    damage types, saves, skills and ability options. Weapon and armor properties toggle on and off
    and take a rank where the property is ranked.
  - **Progression** (classes) / **Advancement** (subclasses, clans): a level table showing what each
    level grants, the options, what was chosen, and the class table columns.
  - **Effects:** add, edit, enable/disable or delete the item's Active Effects.

## 0.3.0-alpha.2 — Sheet cleanup from King's review

### Changed
- Combat tab
  - Chain appears once a Chain jutsu is used. An Action Chain jutsu raises it by 1, a Bonus Action or
    Reaction one maintains it, and any non-Chain jutsu resets it.
  - Combo/Finisher appears once a Combo is used, listing the Finishers it arms. A Finisher or any
    other jutsu clears it.
  - Concentration appears once you know a concentration jutsu; Stance once you know a stance.
  - Skill Actions moved to the bottom, and disciplines you know no jutsu in are hidden.
- Jutsu tab: each jutsu is one compact line with the name, keyword chips, components as one short chip
  (HS·CM·CS), upcast marker, range, cost, hit/DC, and a small Use button.
- Rail
  - AC, SPD, Init, Prof and DR sit in one row of small tiles; hover any of them for the full name and
    the math.
  - Hit Dice and Chakra Dice share one row (HD 5/5 d8 · CD 5/5 d10).
  - The rail never scrolls sideways.
  - Recovery notes are terse ("10min/Rest", "SR/LR").
- Inventory: the ammo ladder is now one "Ammunition Die" control. Left click steps it down, right
  click steps it up, and reaching 0 removes the item.
- Features tab
  - Class / Clan / Background cards are a compact strip.
  - The Hijutsu ability picker sits in the Clan section.
  - Class features are grouped as core features, subclass features, then one group per option type
    (Shinobi's Path, Generalization, Assault Maneuvers, Moldings).
  - Feats are grouped by category, and Stances come last.
- Every compendium is organized into folders:
  - Classes: one folder per class.
  - Features: Class > Core / Subclass > options; option types get their own folders.
  - Fighting Stances: by type.
  - Feats: by category.
  - Jutsu: discipline > section > rank.
  - Equipment: by type.

## 0.3.0-alpha.1 — Level-up automation and the first class content

### Added
- **Level Up** (header button) and **character creation** (drop a class on a character): a dialog lists
  everything the new level grants, with a card for every choice, and Apply stays off until each one is
  made. Hover any card for its full text.
  - Hit and Chakra Points by rule (10 + die max + Con at 1st, die max + Con after; never rolled).
  - 1st level: the class's skill and toolkit picks.
  - Features granted automatically; option picks (Shinobi's Path, stances, Generalization, Moldings,
    Assault Maneuvers); Switch Hitter's primary discipline.
  - Subclass at the class's subclass level, then that subclass's own steps on the same page.
  - ASI levels: +1 ability, a feat (level requirement checked, prerequisites shown), and a Mastery rank
    in a proficient skill or toolkit.
  - Jutsu Known increases: learn from the jutsu compendium up to the class's highest rank, hiding jutsu
    whose Release you don't have (affinities gained this level count).
  - Granted affinities and Mastery (Blaze Walker's Fire Release, Scholar's Ninshou).
- **Remove level** (edit mode, arrow-down button): removes exactly what the highest level added,
  including its ASI and feat. Replacing a class removes everything the old one granted.
- Resource pools defined on items appear on the rail automatically and track their own value: Focus,
  Superiority Dice (from the class table), Pyroclasm (starts empty), a clan's Ocular Charges.
- Content, imported verbatim from the books by `tools/content/build_content.py`:
  - Scout-Nin (levels 1-5 and all 20 table rows) with Assault Scout, the 6 Shinobi's Paths,
    3 Generalizations and 10 Assault Maneuvers.
  - Ninjutsu Specialist (1-5, full table) with Blaze Walker, the 15 Moldings, and Chakra Surge's Crash
    and Flow.
  - All 24 Ch13 Fighting Stances (new Fighting Stances compendium).
  - 4 random feats a 4th-level character can take: Storing Seal Soul, Light Step Mastery, Master of
    Disguise, Illusionist Research (new Feats compendium).
  - 10 jutsu: Fire Release: Flame Whip, Fire Release: Fox Fire, Chakra Shield, Ink Clone,
    Beast Fist: Forceful Bull, Butterfly Kick, Snake Constricting Grip, Lotus: Anxious Petals,
    Glamor Tongue, Transform.

### Changed
- Class columns are available to formulas as `@scale.<classCamelCase>.<column>`
  (e.g. `@scale.scoutNin.superiorityDice`).

## 0.2.0-alpha.3 — Combat tab

### Added
- Combat tab (replaces the empty Actions tab), holding everything a character does in a fight:
  - Trackers: Chain (boxes, plus which known jutsu have an effect at the current exact rank);
    Concentration (slots, each jutsu's upkeep at half the cost paid, Efficient waived, total upkeep
    at turn start with a not-enough-chakra warning, damage-check DC = 15 + ranks); Stance (active
    stance, Leave, switch to another); Combo / Finisher (Combo and Finisher jutsu, "Combo landed"
    toggle that marks Finishers as armed).
  - Pill buttons in five groups: Basic Combat (core actions, unarmed and weapon strikes, active
    features, usable items, and every in-combat skill action with its −3/−5 tier penalty), then
    Ninjutsu, Genjutsu, Taijutsu and Bukijutsu, each split into Actions / Bonus Actions /
    Reactions / Free & Special and sorted by rank.
  - Hover any pill for its full text: jutsu description with Chain, Finisher and Overcharge text,
    keywords, cost, hit and DC; skill actions show the roll and the outcome from the Ch6 table.
  - Click a pill to post it to chat; concentration jutsu get a toggle to start or end concentrating.

### Changed
- Chain, concentration and stance moved off the left rail into the Combat tab.

## 0.2.0-alpha.2 — Character sheet layout pass (SW5e-inspired)

### Changed
- Left rail is now the quick-reference column: portrait with level badge, Armor Class, Initiative,
  Speed, Proficiency, Damage Reduction, Hit Points, Chakra Points, Hit Dice and Chakra Dice bars,
  then Resources, Combat (Chain, concentration, stance) and Conditions.
- Resources: Will of Fire, class/clan resource pools and every feature with limited uses sit in one
  list, each a click-to-set bar with its recovery note ("1 + prof · back on a short or long rest").
- Header: compact ability strip (abbreviation, modifier, score; editable in edit mode) and identity
  bubbles for Class, Clan and Background that open the item.
- Main tab: Saving Throws panel and a compact Disciplines panel replace the large ability cards.
- Features tab no longer repeats resources.

### Fixed
- Feature uses written as formulas ("1 + @prof") now resolve against the owning actor.

## 0.2.0-alpha.1 — Phase 2: character sheet frame

### Added
- New character sheet (dnd5e v5 structure, PF2e touches): header with XP and Will of Fire, left rail
  (HP/CP meters with temp, AC, DR, initiative, speed, hit/chakra dice, Chain, concentration, stance,
  conditions with rank pips and an Add picker), and tabs Main, Actions (alpha.2), Jutsu, Inventory,
  Features, Effects, Biography.
- Play mode by default; the pencil switches to edit mode (scores, proficiencies, name, XP, details,
  all stored fields under Biography).
- Statistic breakdowns: hover AC, DR, initiative, HP/CP max, saves, skills, passives, discipline
  attack and DC, inventory slots to see every part, including condition penalties.
- Action glyphs (Action, Bonus Action, Reaction, Full Turn, Free) and rule chips for keywords,
  components, and weapon/armor properties.
- Jutsu tab: search, discipline filter, grouping by discipline then rank, live cost and hit/DC,
  expandable rows with Chain/Finisher/Overcharge/upcast text and a cast-rank picker.
- Inventory tab: slot meter, Equipped / Weapons & Armor / Storage / Toolkits / Consumables / Loot,
  equip toggles, clickable ammo die ladder and toolkit charges, Ryo.
- Features tab: class, clan (Hijutsu ability picker), background cards, stances with Enter/Leave,
  resource pools, features and feats.
- Pinned strip on Main (drag an item onto it, or use its pin), item context menu (Edit, Post to chat,
  Equip, Pin, Duplicate, Delete), Use posts an item card to chat (no rolls until Phase 3).
- Drag-and-drop rules: replacing a class, clan, or background asks first; duplicate jutsu are refused.
- Data: every derived number records its parts (`system.breakdowns`).
- Tests: view models for every tab, breakdown totals, and Handlebars rendering of every template.

## 0.1.0-alpha.2

### Fixed
- Releases are published as the latest release (not a GitHub pre-release), so Foundry's update link
  `releases/latest/download/system.json` resolves.

### Added
- Gear added to a character equips itself (weapons; armor if none is equipped; containers if none of
  that type is equipped). Equip toggle on the placeholder sheet's item list.

## 0.1.0-alpha.1 — Phase 1: data layer

### Added
- New standalone v13 system (id `n5e`) replacing the V3.1 (0.6.x) code base.
- Data models for 2 actor types, 13 item types, 6 effect types (TypeDataModel).
- `CONFIG.N5E` registries from the rules knowledge base: abilities, skills (Crafting removed),
  toolkits, progression, ranks, disciplines, DC tables, damage types, conditions (23 core + clan-scoped),
  states, keywords, stimuli, components, nature releases, areas, upcast presets, weapon/armor
  properties, stances, amps, terrain, rests, feat categories, skill actions, optional rules.
- Derived-data pipeline in a fixed 10-step order (see `module/data/actor/creature.mjs`).
- Rules functions with tests: proficiency, Mastery caps, HP/CP (10 + die max + Con, then die max +
  Con per level), AC formulas, chakra cost order and half-base floor, condition rank penalties,
  four-tier degree of success, Chain state machine, concentration DC and upkeep.
- Migration framework (world setting + numbered migrations) and the V3.1 → 4.0 mapping; old data is
  converted in memory on load and saved after a GM confirms.
- Placeholder sheets (ApplicationV2) showing every derived number and stored field.
- Tooling: pack/unpack (fvtt-cli, one JSON per document), lint, tests, consistency check, release
  zip, local install, GitHub Actions release workflow for manifest auto-updates.

### Rulings applied (King, 2026-11-07)
- Condition penalties (Shaken, Demoralized, Dazzled, Exhaustion) are folded into displayed totals.
- Skill actions: Proficient action without proficiency −3; Mastery action without Mastery −5;
  penalties don't stack (`rules/skill-actions.mjs`).
- Sealed modifies the base cost (raises the half-base floor) and applies to Cost None jutsu.
- Several cost multipliers: the caster chooses one (the preview shows the best and flags the choice).
- Concentration upkeep is half the cost actually paid when casting.
- Four-tier saves: a total exactly equal to the DC is a Success.
- Crits double damage dice and the ability modifier only; other flat bonuses don't double.
- Exhaustion's −1 to all dice rolls applies once per roll.
- Heavy armor ignores Dex entirely.
- Wearing Heavyweight (X) armor without the Strength score makes you Encumbered.
- Migrating unlinked tokens and world compendiums: deferred as a nice-to-have.
- E-Rank counts as rank 0; half-base cost floor rounds down.
- Hijutsu Flexibility uses the higher ability by default; players may pick one on the clan item
  (world setting "Hijutsu Flexibility: player's pick").
- Multiplication/division effects never stack (speed: Encumbered + Slowed = half, not a quarter).
- The ASI Mastery rank goes to a skill or toolkit only.
- Jutsu Scrolls exist for Ninjutsu and Genjutsu only.
- Adding ranks to a condition resets its duration.
- Damage: interception first (the interceptor's defenses apply instead of the target's), then DR
  once per damage roll, then resistance and immunity.
- Stabilize is an Action; hostile-terrain indirect exposure is a Survival check (incl. Extreme Cold).
- Concentration: base 2, features raise it, no hard cap.
- "Sealing Kit" is the toolkit name; starting wealth is 500 Ryo or 5d6 × 30 (Ch5).
# Background content update

- Added all 16 Chapter 3 backgrounds in a dedicated compendium, organized by background with nested feature and starting-equipment folders.
- Added background setup choices, linked feature/feat grants, equipment manifests and a separate background-feature group.
- Preserved full conditional feature text and flagged the undefined Traveler's Pack rather than inventing rules.

# Class content expansion through level 20

- Completed core and subclass feature imports for the seven supported classes, with 42 subclasses and full late-level option lists.
- Preserved existing IDs and automation; added structured choice eligibility and apply-time guards.
- Organized new content by class/subclass and added source-derived regression coverage.
- Existing actor copies are not overwritten; contextual rules and new feature automation still require review.

# Clan content import in six batches

- Added all 44 source clan packages, organized by nation and clan inside the built-in Clans compendium.
- Imported source level features, Hijutsu, clan feats, optional mutations, stance records, companion rules and latent bloodline tables.
- Added clan setup and level-up integration, branch and clan access checks, replacement rollback and source-derived regression coverage.
- Preserved existing identities and actor data. Contextual effects, mutation dependencies, latent budgets and companion construction still need manual review.

