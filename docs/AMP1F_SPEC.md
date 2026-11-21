# AMP1f function spec: jutsu Amps from the audit

Status: **spec written 2026-11-20 (King: "The next batch"). King answered Q-F1–Q-F5 the same day; batch 1 revised to match. Waiting for King's go-ahead to build batch 1.** Part of AMP1 (`docs/AMP1_SPEC.md`). Codex's Journal Desk files are not touched.

## The work

The Amp audit lists **90 jutsu candidates** after AMP1e (66 in the Jutsu pack, 24 clan Hijutsu). The scan only suggests; King decides which are Amps (King Q-A4, the Amp definition: a bonus to a statistic, ability or action lasting longer than one round).

For each jutsu King confirms, a card is built from its text and the jutsu's own activity starts it (`{amp: key}`), as the AMP1c–d cards were. Concentration Amps end with the jutsu's concentration (the card's `dependentOn`, already in AMP1a). Every jutsu King rejects gets `flags.n5e.notAmp` with his reason, so it leaves the audit for good.

## Review batches (by rank, then document order)

| Batch | Ranks | Jutsu |
| --- | --- | --- |
| 1 | E and D | 30 |
| 2 | C | 24 |
| 3 | B | 17 |
| 4 | A and S | 19 |

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

## Progress log

- 2026-11-20 King: "The next batch." Claude: AMP1f spec and review batch 1 written; 90 jutsu candidates after AMP1e.
- 2026-11-20 King: Q-F1 a card per cast rank, an options menu for picks; Q-F2 Hijutsu are not Clan; Q-F3 typeless; Q-F4 temporary-HP jutsu are Amps; Q-F5 Chakra Skin and Geo Breastplate are not Amps (Amp-less buffs). Claude: spec and batch 1 revised.
