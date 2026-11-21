# AMP1f function spec: jutsu Amps from the audit

Status: **spec written 2026-11-20 (King: "The next batch"). King answered Q-F1–Q-F5 the same day; batch 1 revised to match. King: "Build". Batch 1 built in 0.70.0-alpha.1. Batch 2 built in 0.71.0-alpha.1. Batch 3 (B-Rank) proposed; waiting for King's verdicts, Q-F10–Q-F12 and the go-ahead.** Part of AMP1 (`docs/AMP1_SPEC.md`). Codex's Journal Desk files are not touched.

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

All typeless (Q-F3). "Cards" counts the rank versions (Q-F1): B-Rank first, then each rank whose effects change.

| Rank | Jutsu | Proposal | Cards | Options menu |
| --- | --- | --- | --- | --- |
| B | Basilisk Art: Pythons Gaze | Amp: your melee weapon attacks and Hebi Bukijutsu can't be at disadvantage; creatures within 30 feet can't gain advantage against your Hebi Bukijutsu | 1 (A changes only the casting time) | |
| B | Conqueror’s Art: Dragon Cloak | Amp: 2d12 + 15 temporary HP, Unarmed die d10, Wyrm Surge on Ryu Hijutsu | 3 (B, A, S: +1d12 a rank) | |
| B | Full Sage: Nature Transfiguration | Amp: +2 AC, resistance to bludgeoning, piercing, slashing, Jugo Amplify costs halved | 1 | Amplified (6 Natural Energy: 1 minute, no concentration) |
| B | Kujaku Art: Star Wall | Not an Amp: a wall | — | |
| B | Lava Release: Rubber Wall Enhancement | Not an Amp: a wall | — | |
| B | Plasma Release: Light Binding Step | Amp: +30 speed, ranged attacks against you at disadvantage, the light bolt | 3 (B, A reaction no longer ends it, S speed tripled) | |
| B | Spider Art: Silk Burial | Not an Amp: cocoons a foe | — | |
| B | Bestial Art: Hunter | Amp: Str 22 or Dex 18, Unarmed 2d8 slashing, +20 speed, advantage on opportunity attacks, an extra attack | 3 (B, A hidden from Chakra Sight, S no concentration) | Strength 22 or Dexterity 18 |
| B | Blade Heart | Amp (Q-F11): a critical hit with your weapon gives 1 rank of Bleed; the Parrying stance stays a button | 1 | |
| B | Encroaching Darkness | Not an Amp: an area of darkness | — | |
| B | Fire Release: Investiture of Flame | Amp: immune to fire and wind, resistant to bludgeoning, piercing, slashing, vulnerable to cold, light, a Bonus action fire cone | 1 | |
| B | Medical Release: Investiture of Acid | Amp: immune to acid, resistant to bludgeoning, piercing, slashing, vulnerable to earth, acid ground, an Action acid cone | 1 | |
| B | Medical Release: Strength of 100 | Amp: Strength 20, double jumps, advantage on Str and Con checks and saves, Unarmed 2d8; the aftermath (Q-F12) | 1 | |
| B | Memory Domination | Not an Amp: charms and rewrites a memory | — | |
| B | Misleading Duplicate | Your call (Q-F10): invisible until you attack or cast, with a controllable double | 1 if an Amp | |
| B | Sealing Art: Gift of the Apex | Amp: one beast's traits | 1 | Bear, Bull, Cat, Eagle, Fox or Lion |
| B | Twin Rising Dragons | Not an Amp: an attack jutsu (the floating is positioning) | — | |

Batch 3 tally: 11 Amps as 17 cards (Misleading Duplicate included), 6 not Amps.

New engine piece: a vulnerability change (`n5e.vulnerable`), for the two Investitures; damage already doubles for vulnerable types.

### Questions for batch 3

- **Q-F10 Misleading Duplicate:** invisibility until you attack or cast, plus a double you control and can sense through. Is a lasting status like Invisible an Amp?
- **Q-F11 Blade Heart:** the Parrying stance (+2 AC and Dexterity saves) lasts only until the start of your next turn, so under the Amp definition it isn't an Amp. Keep it as its own button that applies a short effect, with the Amp holding the critical-hit Bleed for the jutsu's duration?
- **Q-F12 Strength of 100's aftermath:** when it ends, disadvantage on Strength checks for 1 hour or until a short rest. Apply that automatically when the Amp ends?

## Progress log

- 2026-11-20 King: "The next batch." Claude: AMP1f spec and review batch 1 written; 90 jutsu candidates after AMP1e.
- 2026-11-20 King: Q-F1 a card per cast rank, an options menu for picks; Q-F2 Hijutsu are not Clan; Q-F3 typeless; Q-F4 temporary-HP jutsu are Amps; Q-F5 Chakra Skin and Geo Breastplate are not Amps (Amp-less buffs). Claude: spec and batch 1 revised.
- 2026-11-20 King: "Build". Claude: batch 1 built (0.70.0-alpha.1): 23 jutsu as 75 cards (Gaslight's level versions included), 7 marked not Amps. Differences from the plan: Viscous Water Mass has no options menu, since its near-water pick (−2 chakra or one more creature) is made when casting, not part of the Amp; Gaslight and Environmental Affinity got menus (Action or Reaction; in or out of combat), and an option can change the card's duration. Next: batch 2 (C-Rank, 24 jutsu).
- 2026-11-20 King: "Next batch." Claude: batch 2 (C-Rank, 25 jutsu) proposed with Q-F6–Q-F9 (batch sizes corrected: C 25, A and S 18).
- 2026-11-20 King: Q-F6 an aura that applies the Amp, Q-F7 two picks, Q-F8 Heated Body an Amp-less buff, Q-F9 yes; "Build". Claude: batch 2 built (0.71.0-alpha.1): 17 jutsu as 49 cards (3 are the "in the aura" cards the auras apply), 8 marked not Amps. Reading of Q-F6: each creature in the aura (the caster too) gets the Amp card, and it counts as theirs; the aura card on the caster is outside the limits. Jolt got a menu for Overcharge (d8 or d10 temporary hit points). Next: batch 3 (B-Rank, 17 jutsu).
- 2026-11-20 King: "Next Batch." Claude: batch 3 (B-Rank, 17 jutsu) proposed with Q-F10–Q-F12.
