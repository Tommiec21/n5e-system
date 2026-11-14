# CAST1: pre-cast checks and roll-mode controls

Status: **started on King's direction (2026-11-13). Published 0.15.0-alpha.7.** Closes R15, R16 and R17.

King's additions (2026-11-13):
- Advantage is a toggle on every character and NPC sheet. On the sheet it lasts until turned off.
- When chosen as part of using a specific ability or roll, it applies only to that roll.
- The choice appears as buttons on every roll card.

## Functions

| Function | File | Behaviour |
| --- | --- | --- |
| `jutsuComponents(item)` | `rules/cast-checks.mjs` (pure) | The jutsu's components (hs, cm, cs, m, w, nt), counted for Slowed. |
| `castBlockers(actor, item, {rank})` | same | Problems that stop the cast; see the file header. Called by `castPlan`, so the cast dialog shows them and blocks Cast. |
| `castPlan` (changed) | `workflow/cast-plan.mjs` | Adds `castBlockers`, and marks `flags.n5e.economy.attackOrJutsu`. |
| `turnStartPlan` (changed) | `rules/turn-start.mjs` | Resets `attackOrJutsu` with the rest of the action economy. |
| `shockedBlock(actor)` | `workflow/attack.mjs` | Blocks a weapon attack or strike after an attack or jutsu this turn while Shocked. A multi-attack strike is limited to one attack. Attacks and strikes mark `attackOrJutsu`. |
| `#onSetRollMode` | `applications/actor/character-sheet.mjs` (the NPC sheet inherits it) | Sets or clears `flags.n5e.rollMode`. The header shows Dis / Normal / Adv on both sheets. |
| `addSheetToggle(sources, actor)` | `dice/advantaged.mjs` | The sheet toggle counts as one source on every d20 and dice roll. |
| `rollDice(..., {base})` (changed) | same | The roll's own choice (card button or Alt/Ctrl) counts as one source. |
| `addRollModeButtons(html)`, `ROLL_BUTTONS` | `dice/roll.mjs` | Adv / Dis buttons beside each roll button. They re-click it with Alt or Ctrl, so the choice applies to that roll only. Also used on roll-request cards. |

## Limits

- **Teleport:** detected from the jutsu's description (the word "teleport"), until DATA1 adds a teleport keyword.
- **Free hands:** checked from Grappled and Restrained, not from what is held in each hand.
- **Death saves:** no Adv/Dis buttons; they rarely take advantage and their button passes no click.

## Tests

`tests/cast-checks.test.mjs` has 4 tests.
- `turn.test.mjs`: the economy reset now expects `attackOrJutsu` (attempt 1 failed on that expectation; attempt 2 passed).
- Final: 310 pass, 2 skipped. Lint and check pass.

## Tweak (King 2026-11-13), published 0.15.0-alpha.8: roll modes per group in the Effects tab

| Function | File | Behaviour |
| --- | --- | --- |
| `ROLL_GROUPS` | `dice/advantaged.mjs` | `d20`, `damage`, `healing`, `other`. |
| `rollGroup(kind)` | same | attack/save/check → d20; damage → damage; healing → healing; anything else (recovery, dice) → other. |
| `sheetRollMode(actor, group)` | same | Reads `flags.n5e.rollMode.<group>`. A legacy single string from alpha.7 covers every group. |
| `addSheetToggle(sources, actor, group)` (changed) | same | The source applies only to its group. `rollWithSpec` passes `d20`; `rollDice` passes `rollGroup(kind)`. |
| `#onSetRollMode` (changed) | `applications/actor/character-sheet.mjs` | Takes `data-group`; stores only the groups that aren't Normal, in one update. |
| Templates | `templates/actor/character/effects.hbs` (the NPC sheet shares it); headers | The "Roll modes" section moved to the top of the Effects tab; the header toggle was removed. |

Tests: one more in `tests/cast-checks.test.mjs`, which passed on the first attempt. Final: 311 pass, 2 skipped.
