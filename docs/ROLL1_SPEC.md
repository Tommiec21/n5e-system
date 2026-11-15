# ROLL1 function spec: a roll dialog for every roll

Status: **Approved by King 2026-11-14. Published `0.31.0-alpha.1`.**

King (2026-11-14): every roll opens a dialog where players see the current roll math and can edit it by adding modifiers, as dnd5e and PF2e do (his original direction). Shift-click must never be the way in: "the options need to be in the user's face and not hidden behind a combination key." ROLL1 comes before NPC1c.

## What happens today (0.30.0-alpha.2)

- **d20 rolls** (`dice/roll.mjs rollWithSpec`, which every d20 goes through): a plain click rolls at once. Shift-click opens a dialog with one "Situational bonus" box and Advantage/Normal/Disadvantage. Alt-click rolls with advantage, Ctrl-click with disadvantage. The math is shown afterwards on the chat card.
- **Damage, healing and other dice** (`dice/advantaged.mjs rollDice`): no dialog. The card's Adv and Dis buttons fake an Alt/Ctrl click.
- **Initiative in combat** (`rollInitiative`): no dialog; Alt/Ctrl only.
- **Other hidden keys:** Alt-click on a jutsu casts at base rank without the cast dialog; Shift-click on a condition link removes instead of adds.

## ROLL1a: the d20 roll dialog

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| A1 | Modifier list | `dice/roll-dialog.mjs` (new), `templates/apps/roll-dialog.hbs` | Every d20 roll opens a dialog listing each part of the bonus from its breakdown, in order: label, value, and a tick (on by default). The total updates as parts are ticked or unticked. |
| A2 | Add a modifier | same | A row to add a modifier: label (optional) and value, a number or dice ("2", "1d4", "-1"). Any number of rows. |
| A3 | Situational modifiers | same | Modifiers the system knows about but can't apply by itself are listed unticked, with where they come from: an NPC's situational skill bonuses (NPC1c C3), and any future source. Ticking one adds it. |
| A4 | Advantage | same | Three buttons: Advantage, Normal, Disadvantage. The one the system worked out is preselected, and the sources it counted are listed ("Advantage: Target Prone. Disadvantage: Restrained"), so the roller sees why. |
| A5 | The DC and what's at stake | same | When the roll has a DC or a target, the dialog says so ("vs DC 15", "vs Kisame's AC" when players may see it under the visibility rule). Automatic failures (Minions, Stunned) are stated. |
| A6 | Roll | same | A Roll button, focused so Enter rolls. Closing the dialog cancels the roll. |
| A7 | The card records it | `dice/roll.mjs` | The chat card's breakdown shows unticked parts struck through and added ones labelled "Added". |
| A8 | One path | `dice/roll.mjs`, `dice/d20.mjs` | `rollWithSpec` always opens the dialog unless the caller passes `dialog: false` (system rolls with no choice to make: Will of Fire rerolls, Q-R4). `clickMode` and the Alt, Ctrl and Shift handling are removed from rolls. |
| A9 | Initiative | `dice/roll.mjs rollInitiative` | Initiative in combat opens the same dialog, then passes the chosen formula to the combat tracker. Adaptive Initiative's skill choice moves into this dialog as a select. |

## ROLL1b: damage, healing and dice

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| B1 | Damage dialog | `dice/roll-dialog.mjs`, `dice/advantaged.mjs` | Every damage, healing and pool-dice roll opens a dialog: the formula split into its parts with labels (weapon die, ability, jutsu dice, riders), each with a tick; added modifiers (dice or numbers, with a damage type for damage); Advantage/Normal/Disadvantage for dice that use it (King 2026-11-13); and Critical, preset from the attack. |
| B2 | Cards | `dice/roll.mjs addRollModeButtons` | The card's separate Adv and Dis buttons are removed; the damage button opens the dialog, where the choice is made. |

## ROLL1c: no hidden keys anywhere

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| C1 | Casting | `applications/actor/character-sheet.mjs`, `workflow/cast.mjs` | Alt-click no longer skips the cast dialog. The cast dialog always opens. |
| C2 | Condition links | `applications/enrichers.mjs` | Shift-click no longer removes; the link opens a small choice: Add, Remove. |
| C3 | Audit | `tools/check.mjs` | A check fails the build if `altKey`, `ctrlKey`, `metaKey` or `shiftKey` decide behaviour in a roll, cast or chat handler. Area rotation on the map (Shift/Ctrl to snap the angle while placing a template) is exempt, as Foundry's own placement works that way. |

## Tests

`tests/roll-dialog.test.mjs`: the dialog lists every breakdown part; unticking a part and adding "1d4" give the right formula and total; preselected mode and listed sources match the advantage engine; a cancelled dialog makes no roll and no message; the card shows struck and added parts; damage parts, added typed damage and Critical. Updates to existing roll tests that relied on Alt, Ctrl or Shift. The audit in C3.

## Questions for King

- **Q-R1: a fast path.** Should there be any way to roll without the dialog? Proposed: a per-user setting, "Roll without the dialog", off by default and visible in the settings menu (as dnd5e and PF2e both have). No key combination.
- **Q-R2: the GM rolling for many creatures.** When the GM rolls saves for several NPCs from one card (six Minions in an area), one dialog for the whole group (proposed: the parts every creature shares, plus added modifiers applied to all), or one dialog per creature?
- **Q-R3: what can be unticked.** Any part of the bonus, including ability and proficiency, as PF2e allows (proposed); or only bonuses from effects and situational sources?
- **Q-R4: rolls with no choice.** Will of Fire rerolls repeat the original roll's math with no dialog (proposed). Concentration checks and death saves open the dialog like any other roll?
- **Q-R5: what other users see.** The chat card shows what was unticked or added to everyone who can see the roll (proposed), or to the GM only?
- **Q-R6: releases.** ROLL1a, ROLL1b and ROLL1c as one release, or a then b then c?

## King's answers (2026-11-14)

- **Q-R1:** agreed. A per-user setting "Roll without the dialog", off by default, visible in the settings menu. No key combination.
- **Q-R2:** one dialog for the group.
- **Q-R3:** any part can be unticked, including ability and proficiency.
- **Q-R4:** yes. Will of Fire rerolls repeat the original math with no dialog; concentration checks and death saves open the dialog like any other roll.
- **Q-R5:** variable. Standard is everyone who can see the roll; an optional world setting limits the edits shown to the GM (added as A10).
- **Q-R6:** one release.

**Added from Q-R5:**

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| A10 | Who sees edits | `config/rules.mjs`, `dice/roll.mjs` | World setting "Roll edits shown to": Everyone (default) or GM only. With GM only, players see the roll's total and result; the struck and added parts are in a GM-only section of the card. |

## Progress log

- 2026-11-14 Claude: **built (King: "Approved").**
  - A1–A8, A10: `rules/roll-math.mjs` (pure: `d20Parts`, `situationalParts`, `composeD20`, `groupParts`, `diceParts`, `composeDice`, `readChoice`, `parseAdded`); `dice/roll-dialog.mjs` (`d20Dialog`, `diceDialog`, the HTML builders, `wantsDialog`, the `dialogs` indirection); `rollWithSpec` options `dialog`, `prepared`, `situational`; `groupRollChoice`; settings `rollWithoutDialog` (client) and rule `rollEditsVisibility`; GM-only edits are removed from the card for players at render.
  - The dialog HTML is built in `dice/roll-dialog.mjs`, not a `.hbs` file as the table says, so it can be tested without Foundry.
  - A9: initiative through `initiativeFormulas` and `N5eCombat.rollInitiative` (tracker, sheet, Roll All). **Difference:** Adaptive Initiative keeps its own skill choice first (a visible choice, not a key); it is not a select inside the roll dialog.
  - B1–B2: `promptDice`, `rollFormula`, `diceSources` in `dice/advantaged.mjs`; damage, healing and feature dice; rest Hit and Chakra Dice; death saves (natural read from the die, added modifiers count toward 10). Rolls after a cost are `cancellable: false`: pool dice, rider dice, cast pool dice and extra rolls, Deflection and authored reaction reductions, temporary HP from effects.
  - **Left without a dialog** (no roller, the system rolls for a condition or the world): condition damage at turn start, Chilled movement damage, recharge, ammunition die, hazard damage after a failed save, falling damage. Flag for King.
  - Q-R2 on cards: a "save for all" button (`data-n5e-card-saveall`) when two or more targets still have to save; it uses the group dialog.
  - C1–C3: cast and condition links; `tools/check-keys.mjs` in `npm run check`.
- 2026-11-14 Claude: tests attempt 1 passed: `npm test` 448 pass, 2 skipped; core 98/98; lint and check clean. Files: `tests/core/roll-math.test.mjs`, `tests/roll-dialog.test.mjs`; `tests/dice.test.mjs` lost its click-key assertions.
- 2026-11-14 Claude: **published `0.31.0-alpha.1`.** Not checked in a running Foundry world.
- 2026-11-14 Claude: King answered Q-R1–Q-R6; A10 added from Q-R5.
- 2026-11-14 Claude: spec written. Current roll paths read in `dice/roll.mjs`, `dice/d20.mjs`, `dice/advantaged.mjs`, `workflow/cast.mjs`, `applications/enrichers.mjs`. Nothing built.
