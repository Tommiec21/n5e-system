# ADV1: advantage engine and automatic save failures

Status: **started on King's "Next batch." (2026-11-13). Published 0.15.0-alpha.5.** Closes R13, R14 and the auto-fail part of R10.

## Functions

| Function | File | Behaviour |
| --- | --- | --- |
| `advantageSources({roller, target, kind, ability, ranged})` | `rules/advantage.mjs` (pure) | Lists advantage and disadvantage sources, `autoFail` and the states to consume, using the rules in the file header (KB 03/05). |
| `resolveMode(sources, base)` | same | dnd5e counting: any advantage and any disadvantage cancel; the click or forced mode counts as one source. |
| `sourcesNote(sources)` | same | The line shown on the card. |
| `rollWithSpec` (changed) | `dice/roll.mjs` | Builds facts for the roller and its single target, resolves the mode and notes the sources. An auto-fail caps a save at Failure. A roll that used Help removes Helped. The roll dialog's explicit choice still wins. |
| `rollFacts`, `rollAbility` (new, private) | same | Conditions flags, statuses and senses; the ability a roll uses. |
| States `dodging`, `helped` | `config/conditions.mjs`, `config/condition-text.mjs` | Token statuses with rules text. |
| `turnStartPipeline` (changed) | `workflow/turn.mjs` | Removes Dodging at the start of the creature's turn. |
| `weaponAttackSpec` (changed) | `workflow/attack.mjs` | Adds `ranged` for the Prone rule. |

## Limits

- **Multiple targets:** the target side only applies with exactly one target, because one d20 roll can't carry per-target modes (dnd5e has the same limit). Per-target resolution is RES1.
- **Dodge:** "if you can see the attacker" is not checked; only incapacitation removes Dodge. Squeezing has no state yet.
- **Prone:** treated as melee advantage and ranged disadvantage without measuring the 5 ft.
- **Unconscious:** hits within 5 ft being critical is not automated.
- **Jutsu attacks:** they don't yet say whether they are ranged, so a Prone target gives advantage. This is fixed with ATK1/CARD1.

## Tests

`tests/advantage.test.mjs` has 4 tests: counting, attacks, saves, and Help.
- `enrichers.test.mjs` caught the new states missing rules text (attempt 1); texts were added and attempt 2 passed.
- Final: 302 pass, 2 skipped. Lint and check pass.
