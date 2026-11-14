# NPC1 function spec: adversary data model and sheets

Status: **draft for King's approval (2026-11-14). Nothing is built. Questions Q-N7–Q-N14 below.**

Plan: `docs/NPC1_PLAN.md` (King's answers Q-N1–Q-N6). First of NPC1–NPC3, which come before standardization.

Sources: the Bingo Book's stat-block layout (the worked Cultist examples) and steps 1–8 of its builder; PF2e 8.7.0 `actor/npc`; N5e `data/actor/npc.mjs` (a stopgap by its own header).

## What NPC1 does and doesn't do

- **Does:** gives an NPC the adversary profile, stored statistics the GM types in or edits, the stat-block sheet, a simple sheet, and notes.
- **Doesn't:** the book's tables and the step-by-step builder (NPC2); Freeform Strikes, Jutsu and Abilities (NPC3); Tenacity, Elite Actions, Minion groups (NPC4); phases (NPC5); traits as content (NPC6).

## NPC1a: data model and calculation

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| A1 | Profile fields | `data/actor/npc.mjs`, `config/combat.mjs` | `details.class` (Minion, Standard, Elite, Solo; today's `details.role` is renamed to this), `details.role` (Striker, Defender, Lurker, Controller, Supporter, or none), `details.rank` (E–S, exists), `details.clan` (clan or species, free text until NPC6), `details.affiliation`, `details.iconic`, `details.epic`. Level 0–30 (exists). |
| A2 | Statistics mode | same | `details.statMode`: `stored` or `calculated` (Q-N2). Calculated is today's behaviour, unchanged. Summons, clones and companions stay calculated unless the GM switches them. |
| A3 | Stored statistics | same | `system.stored`: proficiency bonus; six ability **modifiers**; six saves; AC; DR; HP max; CP max; speed; initiative; skills (only the ones listed); passive Perception; per discipline (Ninjutsu, Taijutsu, Genjutsu) and a Weapon/Freeform line: attack bonus and save DC. An empty field falls back to the calculated value. |
| A4 | Stored values feed the same engines | `data/actor/creature.mjs`, `data/actor/npc.mjs` | In stored mode each statistic's breakdown starts from "Stat block" with the stored number, then adds Active Effects, rule elements and condition penalties as for characters. Class, armor items and ability-derived parts are not added again. Rolls, the action card, riders and damage read the same paths as today (`system.ac.value`, `system.saves.*.total`, `system.disciplines.*.attack/dc`…). |
| A5 | Ability scores from modifiers | same | In stored mode the score shown is 10 + 2 × modifier, so anything that reads a score still works. |
| A6 | Copy from calculated | `applications/actor/npc-sheet.mjs` | A "Fill from calculated values" button writes the current calculated numbers into the stored fields, as a starting point. NPC2 replaces it with "Calculate from the tables". |
| A7 | Migration | `migration/runner.mjs` | World migration 8: `details.role` (minion…solo) moves to `details.class`; existing NPCs become `calculated` so nothing changes for them. |
| A8 | Notes | `data/actor/npc.mjs` | `details.publicNotes`, `details.privateNotes` (GM only on the sheets), `details.blurb` (one line under the name). `details.biography` stays. |

## NPC1b: sheets

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| B1 | Stat-block header | `templates/actor/npc/header.hbs`, `npc-sheet.mjs` | The book's layout: name and blurb; class, size, Rank, Role, clan/species, affiliation; Level and Proficiency; AC and DR; HP and CP; Speed and Initiative; the six abilities each with Mod and Save; Skills; Senses and passive Perception; resistances and condition vulnerabilities. Every number is clickable to roll, and editable in edit mode. |
| B2 | Statistics tab | `templates/actor/npc/statistics.hbs` | In stored mode: the stored fields in one form, each showing its final value after effects, with the breakdown on hover. The mode switch and the A6 button are here. |
| B3 | Casting lines | Jutsu and Combat tabs | Each discipline's attack bonus and save DC shown at the head of its jutsu list, as in the stat block ("Ninjutsu. +4 to hit, save DC 12"), and the Weapon/Freeform line above attacks. |
| B4 | Simple sheet | `applications/actor/npc-simple-sheet.mjs`, `templates/actor/npc/simple.hbs` | One page, the whole stat block top to bottom in the book's order: header (B1), traits (features), jutsu by discipline and rank with cost, attacks. Read-first: names roll or post their card; HP, CP and conditions are editable. Chosen per NPC through Foundry's sheet picker; the full sheet stays the default. |
| B5 | Notes tab | `templates/actor/npc/notes.hbs` | Public notes, private notes (shown only to GMs), biography. |
| B6 | Limited view | `npc-sheet.mjs` | A user with Limited permission sees name, portrait, blurb and public notes only. |

## Tests

`tests/core/npc-stored.test.mjs` (stored value as the base, effects and condition penalties on top, empty field falls back), `tests/npc-model.test.mjs` (profile fields, mode switch, score from modifier, fill from calculated, migration 8), `tests/view-models.test.mjs` additions (stat-block header and simple sheet context).

## Questions for King

- **Q-N7: abilities.** The book's stat blocks give a modifier and a save for each ability, no score. Store modifiers only, and show the score as 10 + 2 × modifier where something needs one?
- **Q-N8: what still changes a stored number.** Proposed: Active Effects, rule elements and conditions do (a Weakened adversary still takes the penalty); equipped armor and weapons items do not change AC or DR, because the stored AC already includes them. Agreed?
- **Q-N9: Minions.** The book says a Minion has no Chakra pool and automatically fails saving throws. Build both into NPC1 (a Minion's save buttons report an automatic failure; its CP is 0), or leave them for NPC2 with the rest of the class rules?
- **Q-N10: default mode.** New NPCs start as `stored` (adversary) and the GM switches to `calculated` when wanted? Summons, clones and companions keep starting as `calculated`.
- **Q-N11: skills.** A stat block lists only a few skills. For a skill not listed, roll the ability modifier alone, or the ability modifier plus proficiency?
- **Q-N12: private notes.** GM only, even for a player who owns the NPC (an Allied NPC, a companion)?
- **Q-N13: simple sheet.** Is a one-page read-first stat block what you want from it, or should it be the default sheet with the tabbed one as the alternative?
- **Q-N14: releases.** NPC1a (model and calculation) as one release, then NPC1b (sheets)?

## Progress log

- 2026-11-14 Claude: spec written from `docs/NPC1_PLAN.md`, the Bingo Book's stat blocks and the current NPC model. Nothing built.
