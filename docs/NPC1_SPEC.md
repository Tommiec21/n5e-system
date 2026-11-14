# NPC1 function spec: adversary model, the book's math, and sheets

Status: **revised draft for King's approval (2026-11-14, second version). Nothing is built. Open: Q-N15–Q-N17.**

Plan: `docs/NPC1_PLAN.md`. Source: the Bingo Book, "The Adversary Profile" through "Final Calculation(s)" and the Cultist examples.

**Why this was rewritten (King, 2026-11-14).** The first draft offered "stored" numbers (typed in) or "calculated" numbers (the player's formulas). Neither is the book. Adversaries have their own math: a stat line by level and class, and formulas and tables for every other number. Each stat line is the assumed baseline for that class and level, and the GM adjusts up or down to fit the table. Rank bonuses are suggested, not guaranteed.

## The model

1. **The profile is the input:** Level, Class, Role, Rank, Iconic/Epic, armor type, the assigned ability modifiers, party size (Solos).
2. **The book's math computes every number** from the profile.
3. **The GM adjusts.** Any computed number can be overridden; the sheet marks it and shows the baseline beside it.
4. **Friendly NPCs** can be built this way or as a player-style creature (the book's Allies section; King Q-N2). Summons, clones and companions keep the player-style build they use today.

## NPC1a: data and math

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| A1 | Profile fields | `data/actor/npc.mjs`, `config/adversary.mjs` | `details.build`: `adversary` or `character` (player-style, today's behaviour). `details.class` (Minion, Standard, Elite, Solo; today's `details.role` is renamed), `details.role` (Striker, Defender, Lurker, Controller, Supporter, none), `details.rank` (E–S), `details.clan`, `details.affiliation`, `details.iconic`, `details.epic`, `details.armor` (light, medium, heavy), `details.partySize`. Level 1–30; Elite from 3, Solo from 5 (a warning, not a block). |
| A2 | Tables as data | `config/adversary.mjs` | Base Adversary Statistics by Level (proficiency; the Minion/Standard and Elite/Solo modifier lines); AC by Level and armor type; HP/CP per level by Rank; the Role, Class, Iconic and Epic modifiers; the Lazy GM HP/CP tables. |
| A3 | Ability modifiers | `rules/adversary.mjs` | Adversaries hold **modifiers only** (King Q-N7). `statLine(level, class)` gives the baseline six values and their sum. The GM assigns them to abilities and may change any of them. The sheet shows the assigned total against the budget: the line's sum, plus the Rank bonus when used (A5), plus Iconic +2 or Epic +4. Over or under budget is shown, never blocked. |
| A4 | Proficiency | same | From the table by level. |
| A5 | Rank bonus | same | Suggested ability points equal to Rank: E 0, D 1, C 2, B 3, A 4, S 5 (King). A switch on the NPC, on by default (Q-N17); it only raises the budget in A3. |
| A6 | Hit and Chakra Points | same | 10 + (Level × Con) + (Level × per-level value for Rank), same value for both. Elite ×1.25; Solo ×(1.5 + 0.5 per player); Iconic ×1.5, Epic ×2, both ×2.5. Rounding per Q-N16. Alternative source per NPC: the Lazy GM table (Low, Medium, High). Minion: HP 10 + Level, no Chakra pool. |
| A7 | Party size | `rules-settings.mjs` | World setting (King Q-N3): automatic (player characters in the active party) or manual (the NPC's `details.partySize`). |
| A8 | Armor Class and DR | `rules/adversary.mjs` | AC from the table by level and armor type; DR +3 Medium, +6 Heavy. Defender +1 AC and +2 DR; Elite +1 AC; Solo +2; Iconic +1; Epic +2; Minion −2. Equipped armor items do not change it (King Q-N8). |
| A9 | Saves | same | Every save has proficiency, half or full (King Q-N15). Fully proficient saves: 2 at levels 1–7, 3 at 8–16, 4 at 17+; the rest are half (rounded down). Defaults to the highest assigned modifiers; the GM picks which saves are full on the Build tab, and the count is shown against the suggested number, never blocked. Save = modifier + proficiency (or half). Elite +1, Solo +2, Supporter +1. A Minion's save reports an automatic failure (King Q-N9). |
| A10 | Attack bonuses and save DCs | same | Proficiency + ability, and 8 + proficiency + ability: Intelligence for Ninjutsu, Wisdom for Genjutsu, Strength for Taijutsu; a Weapon/Freeform line with an ability the GM picks (any, including Constitution). Controller +1 save DCs; Iconic or Epic +1 to both. |
| A11 | Initiative, speed, skills | same | Initiative: the player formula plus Striker +2, Elite +2, Solo +3, Iconic +1, Epic +2, Minion −2. Speed 30, Lurker +20. Skills: ability modifier alone unless the GM adds the skill, then modifier + proficiency (King Q-N11). Lurker +2 Stealth, Controller +2 Chakra Control, Supporter +2 Perception. |
| A12 | Overrides | `data/actor/npc.mjs` | `system.overrides.<statistic>`: a number replaces the computed one for that statistic only (AC, DR, HP, CP, proficiency, each save, each attack and DC, initiative, speed, each skill, passive Perception). Clearing it returns to the baseline. |
| A13 | Same engines | `data/actor/creature.mjs` | The result lands on the paths rolls already read (`system.ac.value`, `system.saves.*.total`, `system.disciplines.*.attack/dc`…). Active Effects, rule elements and conditions apply on top (King Q-N8). Each breakdown lists its parts: table value, role, class, classification, override. |
| A14 | Suggested counts | `rules/adversary.mjs` | Shown on the sheet, not enforced: traits (Solo 3, Elite 2, Standard 1, Minion 0; +1 at levels 1–5, +2 at 6–11, +3 at 12–17, +4 at 18+), jutsu known (4, 6, 8, 10 by level band), Freeform slots by class and level, multiattack count. |
| A15 | Notes | `data/actor/npc.mjs` | `details.publicNotes`, `details.privateNotes` (GM only, King Q-N12), `details.blurb`. |
| A16 | Migration | `migration/runner.mjs` | Migration 8: `details.role` (minion…solo) moves to `details.class`; existing NPCs become `build: character`, so nothing changes for them. New NPCs start as `adversary`; summons, clones and companions as `character`. |

## NPC1b: sheets

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| B1 | Stat-block header | `templates/actor/npc/header.hbs` | The book's layout: name and blurb; class, size, Rank, Role, clan, affiliation; Level and Proficiency; AC and DR; HP and CP; Speed and Initiative; six abilities each with Mod and Save; Skills; Senses and passive Perception. Numbers roll on click. |
| B2 | Build tab | `templates/actor/npc/build.hbs` | The profile choices; the modifier line with its budget; armor type; HP source (formula or Lazy GM); every computed statistic with its baseline, an override box and a reset. |
| B3 | Casting lines | Jutsu and Combat tabs | "Ninjutsu. +4 to hit, save DC 12" above each discipline's jutsu; the Weapon/Freeform line above attacks. |
| B4 | Simple sheet | `applications/actor/npc-simple-sheet.mjs` | The whole stat block on one page in the book's order. The tabbed sheet is the default (King Q-N13). |
| B5 | Notes tab, limited view | `npc-sheet.mjs` | Public and private notes, biography. Limited permission sees name, portrait, blurb, public notes. |

**Releases:** NPC1a, then NPC1b (King Q-N14: whatever fits the system; the sheets read the new model).

**Moves out of NPC2:** the tables and the math, which are now here. NPC2 becomes the step-by-step builder window (the book's steps 1–8).

## Tests

- `tests/core/adversary.test.mjs`: every table row spot-checked; the book's worked numbers (level 5 C-Rank Standard, Con +2 = 60; Elite 75; Solo with 4 players 210; Iconic 315, Epic 420, both 525); the Avenger (AC 15, DR 6, HP 40, Taijutsu +8, DC 16) and Bishop (AC 17, DR 3) profiles; budgets; role and class modifiers; Minion rules.
- `tests/npc-model.test.mjs`: overrides, effects on top, migration 8, party size setting.
- `tests/view-models.test.mjs`: header, Build tab and simple sheet context.

## King's answers

- **Q-N7:** modifiers only. **Q-N8:** effects, rule elements and conditions change the numbers; equipped armor does not. **Q-N9:** Minion rules where they fit (A6, A8, A9, A11). **Q-N11:** ability modifier alone; the GM can add skills. **Q-N12:** private notes GM only. **Q-N13:** tabbed sheet is the default. **Q-N14:** NPC1a then NPC1b.
- **Q-N10** is withdrawn: there is one adversary method, not two modes.
- **Q-N15:** every creature's saves are half or fully proficient. Adversaries have 2 full saves at levels 1–7, 3 at 8–16, 4 at 17+. Players have 3 full and 3 half.
- **Rank bonus:** suggested, equal to Rank (D 1, C 2, B 3, A 4, S 5). **Stat lines:** the assumed baseline; the GM adjusts up or down.

## Questions for King

- **Q-N16: rounding.** Elite ×1.25 and the other multipliers can give fractions. Round down, as elsewhere in the system?
- **Q-N17: Rank bonus default.** On for new adversaries, with the switch to turn it off?

## Progress log

- 2026-11-14 Claude: first draft (stored or calculated modes). King answered Q-N7–Q-N14.
- 2026-11-14 Claude: King pointed out the first draft's modes don't match the book. Bingo Book re-read ("The Adversary Profile" to "Final Calculation(s)", Cultist examples). Spec rewritten on the book's model: profile in, book math out, GM overrides. King: Rank bonus equals Rank and is suggested; stat lines are the baseline. Noted: the Avenger and Bishop (level 5) show three full saves against the rule's two, which the GM's freedom to adjust covers. Noted: the Sasuke example's level 13 line (+6, +4, +2, +1, +1, +0) differs from the table's Elite line at 13; the table is used. Nothing built.
