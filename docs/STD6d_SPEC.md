# STD6d function spec: classes as data

Status: **King 2026-11-15: "push Feats to the end and start work on using the new Active Effects system to actually automate class features … continue. Stop after the first two classes are complete." Medical-Nin built (0.48.0-alpha.1) and Ninjutsu Specialist built (0.49.0-alpha.1): the first two classes are complete; stopped as King asked.**

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

## Questions for King (answer when convenient; nothing waits on them)

- **Q-D1 Toxic Tongue:** "immunity to the Poisoned and Corroded conditions": N5e has no Poisoned condition. Is it Envenomed? (Only Corroded is automated.)
- **Q-D2 Take Life:** "5 + your Medical-Nin level": the button uses the character level (the same unless multiclassed). OK?
- **Q-D3 Battle Medic:** its box sits in Chakra Enhanced Combat (6th level), but its D-Rank line ("C-Rank at 6th") reads as from 2nd level. I put the d12 die and critical range on Battle Medic from 2nd level. Correct?
- **Q-D4 Preserve Life:** maximizes dice equal to the rank the jutsu is cast at (an upcast counts). Correct?
- **Q-D5 Potent Ninjutsu:** "after damage is rolled, select up to 3 damage dice, treat each as its maximum": the card counts the three lowest dice as their maximum (what a player would pick). OK?
- **Q-D6 Battle-state variants** (Overheat, Burnout, Herald, Typhoon, Maelstrom, Abyss, Crash and Flow Perfected): each is a button that enters Crash (or Flow) with its extras and cost, used instead of the plain Enter Crash. Burnout and Typhoon also need the base variant's cost (1 Pyroclasm, 1 Pressure), noted on the button. OK?
- **Q-D7 Breakers:** advantage on Clash checks only when the jutsu you clash with is a Ninjutsu of the Release against the other's Release. Correct?
- **Text issues** (for the errata list): Counter Seal contains the Flow (Perfected) box; Perfected Surge contains the Crash (Perfected) box; Tag-Team contains the Crash and Flow Duality boxes; the Summoner subclass is marked non-final in its design note.
- **Earlier text issues** (for the errata list): Hematoxic Touch contains Toxic Chakra's Blighted definition; Chimeric Mutation contains the 10th-level Transfiguration lead-in; Transmogrified Biology ends with the Ninjutsu Specialist class table; Chakra Enhanced Combat holds the Battle Medic box.

## Progress log

- 2026-11-15 Claude: spec written with King's direction; engine D1–D8 and Medical-Nin built, published 0.48.0-alpha.1 (with Great Weapon Stance's tripled modifier, King). Tests: `tests/core/class-automation.test.mjs`, `tests/std6d.test.mjs`.
- 2026-11-15 Claude: engine D9–D14 and Ninjutsu Specialist built, published 0.49.0-alpha.1. The rider applier now compares flags regardless of key order (both tables write Gale Fracture's flags). Stopped after two classes (King). Suites: 568 (566 pass, 2 skipped) and 175 pass.
- 2026-11-15 King: Q-D1 Envenomed (Toxic Tongue now gives immunity to Envenomed and Corroded; ships with the next release); Q-D2 character level is right (no multiclassing in N5e); Q-D4–Q-D7 correct; Q-D3 asked for an explanation.
