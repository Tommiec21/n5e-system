# AMP1f function spec: jutsu Amps from the audit

Status: **spec written 2026-11-20 (King: "The next batch"). King answered Q-F1–Q-F5 the same day; batch 1 revised to match. King: "Build". Batch 1 built in 0.70.0-alpha.1. Batch 2 built in 0.71.0-alpha.1. Batch 3 built in 0.72.0-alpha.1. Batch 4 (A and S) proposed, awaiting King's answers.** Part of AMP1 (`docs/AMP1_SPEC.md`). Codex's Journal Desk files are not touched.

## The work

The Amp audit lists **90 jutsu candidates** after AMP1e (66 in the Jutsu pack, 24 clan Hijutsu). The scan only suggests; King decides which are Amps (King Q-A4, the Amp definition: a bonus to a statistic, ability or action lasting longer than one round).

For each jutsu King confirms, a card is built from its text and the jutsu's own activity starts it (`{amp: key}`), as the AMP1c–d cards were. Concentration Amps end with the jutsu's concentration (the card's `dependentOn`, already in AMP1a). Every jutsu King rejects gets `flags.n5e.notAmp` with his reason, so it leaves the audit for good.

## Review batches (by rank, then document order)

| Batch | Ranks | Jutsu |
| --- | --- | --- |
| 1 | E and D | 30 |
| 2 | C | 25 |
| 3 | B | 17 |
| 4 | A and S | 18 |

Each batch: Claude proposes a verdict and a type for every jutsu; King approves or changes them; Claude builds that batch's cards and marks the rest; the next batch starts on King's go-ahead.

## King's answers (2026-11-20)

- **Q-F1 Upcasting:** every upcast that changes an Amp's effects gets its **own card per cast rank**, carrying all the effects valid at that rank. When the jutsu has effects the caster must pick, an **options menu** opens listing them.
- **Q-F2 Hijutsu:** **not** Clan Amps. They are jutsu like the rest (Will, Fortitude or Reflex later, when King types them).
- **Q-F3 Types:** every jutsu Amp is **typeless** for now; King will give jutsu their Amp types later.
- **Q-F4 Temporary hit points** with a rider while they last: **Amps**.
- **Q-F5 Chakra Skin, Geo Breastplate** (8-hour AC calculations): **not Amps**; they are Amp-less buffs and stat overrides.

## What gets built

### 1. Jutsu-owned Amp cards
- Owner kind **jutsu** (`owner: {kind: "jutsu", id: <jutsu identifier>}`): only casting the jutsu starts the card; the Amps panel lists it while active. Never Clan, Hijutsu included (Q-F2). Type empty (Q-F3).
- The jutsu's activity names the card (`{amp: key}`), and concentration on the jutsu ends it (`dependentOn`, AMP1a).

### 2. A card per cast rank (Q-F1)
- Card field `rank` (E–S) beside AMP1g's `series`: "Acid Armor (C-Rank)", "Acid Armor (B-Rank)"… A rank gets its own card only when its effects differ from the rank below; a cast at a rank in between uses the highest version at or below it (like AMP1g by level).
- The cast passes its rank to the activity, which starts that rank's card. Uses and cooldowns stay shared by the series.

### 3. Options menu when starting a card (Q-F1)
- Card field `choose` `{prompt, options: [{label, changes, rules}]}`. Starting the card opens a menu listing the options, in plain view (no key shortcuts), and the picked option's changes and rules join the Amp.
- Batch 1 uses: Beast Fist: Rushing Lion (Strength or Dexterity), Water Release: Viscous Water Mass (near water: −2 chakra or one more creature).

### 4. Rejected jutsu
- `flags.n5e.notAmp` with King's reason, so they leave the audit. Chakra Skin and Geo Breastplate: "An Amp-less buff / stat override (King Q-F5)".

## Batch 1 (E and D), revised after King's answers

All typeless. "Cards" counts the rank versions (Q-F1): D-Rank first, then each rank whose effects change.

| Rank | Jutsu | Verdict | Cards | Options menu |
| --- | --- | --- | --- | --- |
| E | Gaslight | Amp | 1 | |
| D | Basilisk Art: Adaptive Camouflage | Amp | 1 | |
| D | Boil Release: Erupting Steam Wall | Amp | 5 (temporary HP and acid each rank; shockwave from B) | |
| D | Crystal Release: Crystal Armor | Amp | 3 (D, B elements, S immunity) | |
| D | Hanami Style: Sapping Fist | Amp | 3 (D, B healing, S twice per turn) | |
| D | Magnet Release: Dust Coat | Amp | 5 (barrier C, AC/DR B, 1 hour A, AC/DR S) | |
| D | Misty Hallucination | Not an Amp | — | |
| D | Beast Fist: Forceful Bull | Amp | 1 | |
| D | Beast Fist: Graceful Cat | Amp | 1 | |
| D | Beast Fist: Rushing Lion | Amp | 1 | Strength or Dexterity |
| D | Beast Fist: Wise Turtle | Amp | 1 | |
| D | Chakra Skin | Not an Amp (Q-F5) | — | |
| D | Cloak of Shadows | Amp, given to a willing creature | 3 (D, B 10 minutes, A 1 hour) | |
| D | Earth Release: Bedrock Coffin | Not an Amp | — | |
| D | Earth Release: Geo Breastplate | Not an Amp (Q-F5) | — | |
| D | Earth Release: Jade Devotion | Amp, given to allies | 5 (+1d6 temporary HP each rank) | |
| D | Earth Release: Resonating Geo Isotoma | Not an Amp | — | |
| D | Enhanced Blocking | Amp | 2 (D, B Blocking +1) | |
| D | Environmental Affinity | Amp | 2 (D, B no concentration) | |
| D | Fire Release: Fox Fire | Not an Amp | — | |
| D | Lightning Release: Spark | Amp, given to a creature | 5 (+1d6 temporary HP each rank) | |
| D | Medical Release: Acid Armor | Amp | 5 (temporary HP, acid, Acid Tail each rank) | |
| D | Medical Release: Grim Mask | Amp | 1 | |
| D | Psionics: Fortress | Amp | 3 (D, B 5 psychic DR, S 10) | |
| D | Psionics: Keen Meditation | Amp | 4 (D, C, B, A) | |
| D | Sealing Art: Chakra Mark | Not an Amp | — | |
| D | Semblance of Dread | Amp | 5 (+5 feet radius each rank) | |
| D | Warriors Zone | Amp | 5 (+1d6 each rank; DR at B and S) | |
| D | Water Release: Viscous Water Mass | Amp, given to a willing creature | 5 (C, B, A, S each change) | Near water: −2 chakra or +1 creature |
| D | Wind Release: Zephyr Strike | Amp | 5 (C AC, B Friction Break, A Dex saves, S no concentration) | |

Batch 1 tally: 23 Amps as about 72 cards, 7 not Amps.

## Batch 2 (C-Rank), Claude's proposals

All typeless (Q-F3). "Cards" counts the rank versions (Q-F1): C-Rank first, then each rank whose effects change.

| Rank | Jutsu | Proposal | Cards | Options menu |
| --- | --- | --- | --- | --- |
| C | Adamantine Barrier | Not an Amp: a barrier zone (its 5-Pronged Seal box is a condition) | — | |
| C | Conqueror’s Art: Wyrmcaller’s Pulse | Amp, given to allies (Wyrmlings: +1 AC, 14 temporary HP, +4 a rank); the Prey save stays on the jutsu | 4 (C, B, A, S) | |
| C | Crystal Release: Crystal Wheel | Amp: +30 speed, ignore terrain, earth damage to opportunity attackers | 4 (+1d6 a rank; B area-save advantage; S +60 speed and 4d6 proximity) | |
| C | Hanami Style: Defensive Cloak | Amp: melee attackers take necrotic, you gain temporary HP | 4 (+1d6 a rank; A full temporary HP) | |
| C | Magnet Release: Dust Mesh | Not an Amp: terrain in an area | — | |
| C | Synthetic Art: Adaptive Biology | Amp: resistance to a damage type or condition you suffered this initiative | 2 (C, A two picks: Q-F7) | Which damage type or condition |
| C | Test Cutting: Senta Piercing | Not an Amp: an instant attack; its temporary HP and chakra have no lasting rider | — | |
| C | Uzumaki Art: Red Hot-Blooded Vitality | Amp: Mastery on Str, Dex and Con checks, advantage on Concentration checks | 1 | |
| C | Breath of Sound: Score | Amp: a tempo each turn (Moderato, Allegretto, Vivacissimo, Andante) | 1 | Tempo (Q-F9) |
| C | Earth Release: Sand Armor | Amp: temporary HP that resist piercing, slashing, bludgeoning and cold; lightning ends it; 1 hour | 4 (+8 a rank) | |
| C | Fire Release: Flame Armor | Amp: temporary HP, fire resistance while they last, immune to Burned, fire to melee attackers; 1 hour | 4 (+4 a rank) | |
| C | Fire Release: Heated Body | Not an Amp (Q-F8): cold-weather immunity, like Q-F5's Amp-less buffs | — | |
| C | Guardian Knight | Amp: benefits by armor worn | 1 | Light, Medium or Heavy |
| C | Lightning Release: Jolt | Amp, given to a creature: temporary HP with +10 speed and +2 Dex saves while they last | 4 (+1d8 and +5 speed a rank) | |
| C | Lightning Release: Lightning Chakra Armor | Amp: +1 AC, +20 speed, Mastery on Dex saves, Dash as a Bonus action | 4 (B +1d10 lightning, A DR, S +2 AC and 2d10) | |
| C | Lightning Release: Lightning King’s Mantle | Amp with an aura (Q-F6): allies' [Weapon Damage] +1d6 lightning | 4 (radius +10 a rank; B pierce 4 DR, Shocked on crits) | |
| C | Medical Release: Medical Aura | Amp with an aura (Q-F6): necrotic resistance, Bleeding immunity, 1 HP at 0 | 1 | |
| C | Outflank | Not an Amp: it marks a foe | — | |
| C | Royal Flush | Amp: +2 Royal Shield charges, +1 to Taijutsu AC bonuses, +1 die on Taijutsu temporary HP | 2 (C, S Royal Guard half cost) | |
| C | Shadow Clone Technique | Not an Amp: summons clones | — | |
| C | Sparking Flail | Amp: fully obscured from the chosen foe, Chain 1 crit range, Chain 2 invisibility on a crit | 1 | |
| C | Water Release: Blessing of Poseidon | Amp: swim 60, water breathing, tremorsense 60, Atlantean Trident | 2 (C, A trident +1d8 and crit range) | |
| C | Water Release: Heavenly Mirror of Pain | Not an Amp: binds a foe's reflection | — | |
| C | Wind Release: Vacuum Field | Not an Amp: a hazard zone | — | |
| C | Wind Release: Wind Rider | Amp: 30 ft flying speed, no fall damage or Prone | 3 (C, B no descent, A dash +60 fly) | |

Batch 2 tally: 17 Amps as 46 cards, 8 not Amps.

### Questions for batch 2

- **Q-F6 Auras** (Lightning King's Mantle, Medical Aura): the caster has the Amp, and the aura gives its effect to allies inside it. Should the aura count as an Amp on each ally (taking one of their Rule of 3's places), or only on the caster? Claude's suggestion: only on the caster.
- **Q-F7 Adaptive Biology at A-Rank** picks two damage types or conditions. Let the options menu allow two picks?
- **Q-F8 Heated Body** (immunity to cold weather for 1 hour): an Amp-less buff like Chakra Skin (Q-F5)?
- **Q-F9 Score's tempo** can change at the start of each of your turns: a "Change tempo" button on the Amp that reopens the menu?

## Batch 3 (B-Rank), Claude's proposals

All typeless (Q-F3). "Cards" counts the rank versions (Q-F1): B-Rank first, then each rank whose effects change. Upcasts that only raise the cost, or change only the casting time, get no card of their own.

| Rank | Jutsu | Proposal | Cards | Options menu |
| --- | --- | --- | --- | --- |
| B | Lava Release: Rubber Wall Enhancement | Not an Amp: a wall | — | |
| B | Plasma Release: Light Binding Step | Amp: +30 speed, ranged attacks against you at disadvantage; the Starlight bolt (an Action) stays on the jutsu | 2 (B; S speed tripled) | |
| B | Full Sage: Nature Transfiguration | Amp: +2 AC, resistance to bludgeoning, piercing and slashing; Nature Endurance and Feral Endurance riders as notes | 1 | Amplified (6 Natural Energy: no concentration, 1 minute) |
| B | Spider Art: Silk Burial | Not an Amp: cocoons foes | — | |
| B | Basilisk Art: Pythons Gaze | Amp: your melee weapon attacks and Hebi Bukijutsu can't be at disadvantage; creatures in range can't gain advantage against your Hebi Bukijutsu | 1 (A only changes the casting time) | |
| B | Kujaku Art: Star Wall | Not an Amp: a wall | — | |
| B | Conqueror’s Art: Dragon Cloak | Amp (Q-F4): 2d12 + 15 temporary HP, [Unarmed Damage] die d10, Ryu Hijutsu gain Wyrm Surge, 2d12 back in Dragon Rage | 3 (B; A and S +1d12 a rank) | |
| B | Blade Heart | Amp: a weapon or Taijutsu crit adds 1 rank of Bleed; the Parrying stance on demand (Q-F11) | 1 | |
| B | Twin Rising Dragons | Not an Amp (Q-F10): it grants an attack action; floating is positioning | — | |
| B | Encroaching Darkness | Not an Amp: a darkness zone (the chosen creatures' immunity is part of the zone) | — | |
| B | Memory Domination | Not an Amp: charms a foe | — | |
| B | Misleading Duplicate | Amp (Q-F12): invisible until you attack or cast a jutsu; the double stays on the jutsu | 1 | |
| B | Fire Release: Investiture of Flame | Amp: immune to fire and wind, resistance to bludgeoning, piercing and slashing, vulnerable to cold; the bonus-action fire cone as a note | 1 | |
| B | Medical Release: Investiture of Acid | Amp: immune to acid, resistance to bludgeoning, piercing and slashing, vulnerable to earth, ignore difficult terrain on solid ground; the acid ground and the acid cone as notes | 1 | |
| B | Medical Release: Strength of 100 | Amp: Strength 20, jumps doubled, advantage on Strength and Constitution checks and saves, [Unarmed Damage] die 2d8; the aftermath (Q-F13) | 1 | |
| B | Bestial Art: Hunter | Amp: Strength 22 or Dexterity 18, 2d8 slashing unarmed with that ability, +20 speed, opportunity attacks at advantage, an extra attack | 3 (B; A hidden from Chakra Sight and chakra sensing; S 1 minute without concentration) | Strength 22 or Dexterity 18 |
| B | Sealing Art: Gift of the Apex | Amp: one beast's save advantage and its ability | 1 | Bear, Bull, Cat, Eagle, Fox or Lion |

Batch 3 tally: 11 Amps as 16 cards, 6 not Amps.

### King's answers for batch 3 (2026-11-20)

- **Q-F10:** not an Amp. **Q-F11:** yes, a Parrying stance button on the Amp. **Q-F12:** yes. **Q-F13:** yes: a unique condition, Strength of 100: Overexerted. **Q-F14:** King asked for the jutsu's full text, then (2026-11-21): the A-Rank upcast line about "the special reaction" is a mistake; treat it as not there. The cards already leave it out; logged as a text issue.

### Questions for batch 3 (as asked)

- **Q-F10 Twin Rising Dragons** (float 30 feet, an Action for up to 3 ranged Taijutsu attacks, for 1 minute): Claude proposes not an Amp, since it grants attacks rather than boosting a statistic. Agree, or an Amp?
- **Q-F11 Blade Heart's Parrying stance** (+2 AC and Dexterity saves until the start of your next turn, entered as a Bonus action or a reaction to taking damage, as often as you like while the jutsu lasts): a "Parrying stance" button on the Amp that applies a short effect, or a note played at the table?
- **Q-F12 Misleading Duplicate:** is turning invisible an Amp (it ends when you attack or cast)? Claude's suggestion: yes.
- **Q-F13 Strength of 100's aftermath** (disadvantage on Strength checks for an hour or until a short rest, after the jutsu ends): apply it automatically when the Amp ends, as a penalty effect (not an Amp), or a note?
- **Q-F14 Light Binding Step's A-Rank line** mentions "the special reaction granted by this jutsu", but the jutsu grants no reaction. Claude reads it as leftover text: it goes to the text-issues list, and the cards ignore it. Agree?

## Batch 4 (A and S-Rank), Claude's proposals

All typeless (Q-F3). "Cards" counts the rank versions (Q-F1).

| Rank | Jutsu | Proposal | Cards | Options menu |
| --- | --- | --- | --- | --- |
| A | Boil Release: Freight Train | Amp: +30 speed; immune to Prone, Slowed, Shaken and Grappled; can't be moved against your will; difficult terrain doesn't affect you; Impact Engine (once per turn: Strength save or Prone, Bruised and Scald) as a note; Overheat when it ends (Q-F16) | 1 | |
| A | Lotus Nonself Connected Cannons | Amp for the maintained cannon (Q-F18): speed 0, +10 DR, can't be moved, knocked Prone or Stunned; the beam and refiring stay on the jutsu | 1 (upcasts only change the beam) | |
| A | Demonic Instrument: Chains of Fantasia | Not an Amp: a genjutsu on foes, and a summon | — | |
| A | Demon Hunter | Amp: against your Demon, +20 speed (in initiative) and polearm damage ignores resistance and treats immunity as resistance; Bukijutsu with that polearm +1 save DC and +5 feet range; Chain 2 and 3 as notes | 1 | |
| A | Moon-Fang Piercer | Not an Amp: an attack (Chain 3's +6 DR until your next turn stays a rider on the jutsu) | — | |
| A | Overcomer | Amp: +1d4 to Strength saves; at half HP or less, 10 temporary HP each turn and you can't be moved against your will | 1 | |
| A | Unlimited Pleasure | Amp on up to 3 willing creatures (4 at S): temporary HP they gain also heal them by that much | 1 | |
| A | Earth Release: Diamond Bone Hardening | Amp: 14 DR while not wearing armor; S: 16 DR and 2d6 + 4 temporary HP each turn | 2 (A; S) | |
| A | Medical Release: Aura of Power | Amp with an aura (Q-F6): allies chosen at casting +2 to saves against Ninjutsu; hostile creatures in it −2 (Q-F15) | 2 (the aura; in the aura) | |
| A | Wind Release: Neverending Breath | Amp: no need to breathe for 10 hours, can't be suffocated or drowned, immune to Inhaled jutsu, +4 Constitution saves | 1 | |
| A | Magnum Knuckle | Amp: advantage on opportunity attacks; twice per turn +1 unarmed die and a Constitution save or −15 speed (notes) | 1 | |
| A | Supreme Violence | Amp: + half your Taijutsu modifier to AC; Violent Reprisal (a reaction) as a note; no Ninjutsu or Genjutsu concentration | 1 | |
| A | Tiger Lily | Amp: 60 feet of blindsight | 1 | |
| S | The Zone | Amp: Weapon and Taijutsu attacks can't be reacted to and pierce resistance; speed doubled, +2 AC; advantage on Weapon and Taijutsu attacks; +1 Taijutsu save DC; can't lose concentration on it (Q-F20) | 1 | |
| S | Fire Release: Body of Dawn | Amp: immune to wind, fire, bludgeoning, piercing and slashing; vulnerable to cold; fire heals you by half (note); the blinding flash stays on the jutsu | 1 | |
| S | Medical Release: Heal | Not an Amp: instant healing | — | |
| S | Medical Release: Strength of 1000 | Amp: [Unarmed Damage] 3d8, regain 2d4 + 8 HP each turn, Distortion Impact and Critical Break as notes; lasts as long as Strength of 100 (Q-F17) | 1 | |
| S | Water Release: Water Heavens Convergence | Not an Amp (Q-F19): it grants actions and a reaction | — | |

Batch 4 tally: 14 Amps as 16 cards, 4 not Amps.

### Questions for batch 4

- **Q-F15 Aura of Power's −2:** the hostile creatures in the aura get a penalty effect (−2 to saves against Ninjutsu, not an Amp), placed by the aura like the allies' card. Agree?
- **Q-F16 Freight Train's Overheat** (Incapacitated until the end of your next turn, when it ends): like Strength of 100 (Q-F13), a unique condition "Freight Train: Overheated" applied when the Amp ends?
- **Q-F17 Strength of 1000:**
  - It lasts as long as Strength of 100, which keeps going without concentration. Claude's suggestion: Strength of 1000 ends when Strength of 100 ends (both leave their own condition then).
  - When it ends: you can't cast it, or Medical jutsu that need concentration, until a Full Rest. A unique condition "Strength of 1000: Shock" until a full rest?
  - The text says "jutsu with both the Medical keyword that requires concentration": "both" looks like a leftover word. Logged as a text issue unless you say otherwise.
- **Q-F18 Lotus Nonself Connected Cannons:** is the maintained cannon (speed 0, +10 DR, can't be moved, Prone or Stunned) an Amp, started from a "Maintain the cannon" button after the first beam?
- **Q-F19 Water Heavens Convergence** (Water Drill and Watery Chains as Actions, Water Armor as a reaction): not an Amp, as with Twin Rising Dragons (Q-F10)?
- **Q-F20 The Zone's reuse:** "You can end this jutsu early as a bonus action, and you may reactivate it as a bonus action, spending half of the initial cost. Once this jutsu ends you cannot use this jutsu again until you finish a full rest." Claude's reading: ending it with the bonus action pauses it (reactivate for half the cost); any other end (duration, concentration) uses it up until a full rest. Right?

## Progress log

- 2026-11-20 King: "The next batch." Claude: AMP1f spec and review batch 1 written; 90 jutsu candidates after AMP1e.
- 2026-11-20 King: Q-F1 a card per cast rank, an options menu for picks; Q-F2 Hijutsu are not Clan; Q-F3 typeless; Q-F4 temporary-HP jutsu are Amps; Q-F5 Chakra Skin and Geo Breastplate are not Amps (Amp-less buffs). Claude: spec and batch 1 revised.
- 2026-11-20 King: "Build". Claude: batch 1 built (0.70.0-alpha.1): 23 jutsu as 75 cards (Gaslight's level versions included), 7 marked not Amps. Differences from the plan: Viscous Water Mass has no options menu, since its near-water pick (−2 chakra or one more creature) is made when casting, not part of the Amp; Gaslight and Environmental Affinity got menus (Action or Reaction; in or out of combat), and an option can change the card's duration. Next: batch 2 (C-Rank, 24 jutsu).
- 2026-11-20 King: "Next batch." Claude: batch 2 (C-Rank, 25 jutsu) proposed with Q-F6–Q-F9 (batch sizes corrected: C 25, A and S 18).
- 2026-11-20 King: Q-F6 an aura that applies the Amp, Q-F7 two picks, Q-F8 Heated Body an Amp-less buff, Q-F9 yes; "Build". Claude: batch 2 built (0.71.0-alpha.1): 17 jutsu as 49 cards (3 are the "in the aura" cards the auras apply), 8 marked not Amps. Reading of Q-F6: each creature in the aura (the caster too) gets the Amp card, and it counts as theirs; the aura card on the caster is outside the limits. Jolt got a menu for Overcharge (d8 or d10 temporary hit points). Next: batch 3 (B-Rank, 17 jutsu).
- 2026-11-20 King: "Next batch." Claude: batch 3 (B-Rank, 17 jutsu) proposed with Q-F10–Q-F14: 11 Amps as 16 cards, 6 not Amps.
- 2026-11-20 King: Q-F10 not an Amp, Q-F11 yes (button), Q-F12 yes, Q-F13 a unique condition, Q-F14 show the full jutsu text. Claude: batch 3 built (0.72.0-alpha.1): 11 jutsu as 16 cards, 6 not Amps; Amp buttons, Amp statuses, a condition when an Amp ends (Strength of 100: Overexerted), conditions ending on a rest, n5e.vulnerable. Light Binding Step's A-Rank line: full text shown to King, awaiting his call.
- 2026-11-21 King: Q-F14, Light Binding Step's A-Rank reaction line is a mistake and isn't there. Claude: no card change needed; logged in the text-issues list.
- 2026-11-21 King: "Next batch." Claude: batch 4 (A and S, 18 jutsu) proposed with Q-F15–Q-F20: 14 Amps as 16 cards, 4 not Amps.
