# AMP1f function spec: jutsu Amps from the audit

Status: **spec written 2026-11-20 (King: "The next batch"). Waiting for King's answers to Q-F1–Q-F5 and his verdicts on review batch 1.** Part of AMP1 (`docs/AMP1_SPEC.md`). Codex's Journal Desk files are not touched.

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

## Questions for King

- **Q-F1 Upcasting:** many of these jutsu grow when cast at a higher rank (Crystal Armor adds Earth, Fire, Cold and Wind resistance at B-Rank; Zephyr Strike adds +1 AC at C-Rank). Does the AMP1g standard apply here, one card per cast rank ("Crystal Armor (B-Rank)"), started by the rank the jutsu is cast at? Or one card, with the upcast parts applied when cast higher?
- **Q-F2 Clan Hijutsu:** Q-A1 says anything a clan provides is a Clan Amp. The 24 Hijutsu are clan jutsu, so they'd all be Clan. Confirm?
- **Q-F3 Types for the other jutsu:** almost none name an Amp type, so by Q-A4 they'd be typeless. Should Claude instead propose a type for each from the type definitions (Battle: attacks, damage, save DCs; Reflex: Dex, AC, speed; Fortitude: Str, Con, DR, resistances; Will: Wis, Cha, chakra, healing, mental) for King to approve?
- **Q-F4 Temporary hit points:** jutsu whose lasting part is temporary HP with a rider while they last (Spark, Acid Armor, Jade Devotion, Erupting Steam Wall). Amps, or not?
- **Q-F5 Long armor jutsu:** Chakra Skin and Geo Breastplate replace your AC calculation for 8 hours. As Amps they'd hold one of the three Rule of 3's places all day. Amps (maybe outside the limits, like DYNAMIC FORM!), or not Amps?

## Batch 1 (E and D), Claude's proposals

Clan Hijutsu show "Clan" (Q-F2). Types for the rest follow Q-F3's definitions and are only proposals.

| Rank | Jutsu | Proposal | Type | What lasts |
| --- | --- | --- | --- | --- |
| E | Gaslight | Amp | Will | +2 to Charisma skill checks against one creature (concentration, 1 minute) |
| D | Basilisk Art: Adaptive Camouflage | Amp | Clan | +4 to Hide and Sneak, no tracks, Serpent Coil damage |
| D | Boil Release: Erupting Steam Wall | Amp (Q-F4) | Clan | 10 temporary HP that refill each turn, 5 acid to melee attackers |
| D | Crystal Release: Crystal Armor | Amp | Clan | Resistance to bludgeoning, piercing, slashing (more at B-Rank, Q-F1) |
| D | Hanami Style: Sapping Fist | Amp | Clan | Temporary HP from unarmed damage, necrotic unarmed damage, bonus die |
| D | Magnet Release: Dust Coat | Amp | Clan | +2 AC, +2 DR, a Barrier each turn |
| D | Misty Hallucination | Not an Amp | — | An area attack; "allies are immune" only excludes them |
| D | Beast Fist: Forceful Bull | Amp | Fortitude | Strength 18, 8 temporary HP you can refresh |
| D | Beast Fist: Graceful Cat | Amp | Reflex | Dexterity 18, +10 speed, no short fall damage |
| D | Beast Fist: Rushing Lion | Amp | Fortitude | Strength or Dexterity 18, double jump, larger Taijutsu areas |
| D | Beast Fist: Wise Turtle | Amp | Fortitude | Strength 18, double lifting, Mastery on Strength checks |
| D | Chakra Skin | Q-F5 | Reflex | AC 13 + Int + half proficiency for 8 hours |
| D | Cloak of Shadows | Amp, given to a willing creature | Reflex | +1d4 to Hide and Sneak |
| D | Earth Release: Bedrock Coffin | Not an Amp | — | Restrains a target; the HP and resistances are the coffin's |
| D | Earth Release: Geo Breastplate | Q-F5 | Fortitude | AC 13 + Int or Con + half proficiency, 2 DR, 8 hours |
| D | Earth Release: Jade Devotion | Amp (Q-F4), given to allies | Fortitude | 3d6 temporary HP; resistance to bludgeoning, piercing, slashing while they last |
| D | Earth Release: Resonating Geo Isotoma | Not an Amp | — | An aura around an Earthen Artifact, not on a creature |
| D | Enhanced Blocking | Amp | Reflex | Blocking 2 on your polearm, its bonus on Str and Dex saves |
| D | Environmental Affinity | Amp | Will | Advantage on your next initiative (1 hour), or a defense in combat |
| D | Fire Release: Fox Fire | Not an Amp | — | A light and an attack |
| D | Lightning Release: Spark | Amp (Q-F4), given to a creature | Will | Temporary HP and lightning resistance while they last |
| D | Medical Release: Acid Armor | Amp (Q-F4) | Fortitude | 10 temporary HP, 6 acid to melee attackers |
| D | Medical Release: Grim Mask | Amp | Battle | +2 necrotic damage (+4 against conditioned targets) |
| D | Psionics: Fortress | Amp | Reflex | +1 AC (+2 against Genjutsu attacks), psychic feedback |
| D | Psionics: Keen Meditation | Amp | Battle | Mastery on Genjutsu attacks, +1d12 critical damage |
| D | Sealing Art: Chakra Mark | Not an Amp | — | A mark for tracking |
| D | Semblance of Dread | Amp | Will | Creatures can't approach without a save; advantage on saves against Demoralized and Shaken |
| D | Warriors Zone | Amp | Fortitude | +4 DR, damage to creatures entering your weapon's reach |
| D | Water Release: Viscous Water Mass | Amp, given to a willing creature | Fortitude | +1 AC, +4 DR (double against fire) |
| D | Wind Release: Zephyr Strike | Amp | Reflex | No opportunity attacks, +20 speed (+1 AC at C-Rank, Q-F1) |

Batch 1 tally: 25 Amps (2 waiting on Q-F5), 5 not Amps.

## Progress log

- 2026-11-20 King: "The next batch." Claude: AMP1f spec and review batch 1 written; 90 jutsu candidates after AMP1e.
