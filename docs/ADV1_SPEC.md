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

## ADV2: advantage on any dice roll (King 2026-11-13), published 0.15.0-alpha.6

King's rulings:
- Advantage can apply to any dice roll.
- With advantage, the whole roll is rerolled and the higher total kept; disadvantage keeps the lower.
- Only the dice a source names get it.

| Function | File | Behaviour |
| --- | --- | --- |
| `contextualAdvantage(actor, spec, target)` | `rules/elements.mjs` (pure) | Rule-element sources `{key: "advantage" or "disadvantage", selector, predicate, label}`. Selectors match like modifiers, plus `<kind>:<damageType>` for named damage dice. |
| `keptIndex(totals, mode)` | same | Which of two totals to keep. |
| `rollAdvantaged(formula, data, mode)` | `dice/advantaged.mjs` | Rolls once, or twice keeping one. |
| `rollDice(actor, formula, spec)` | same | Any non-d20 roll with the actor's sources; exported on the API. |
| `advantageNote(result, label)` | same | The card line, e.g. "Advantage (source): kept 8, not 3". |
| Damage activity (changed) | `workflow/activity-buttons.mjs` | Each damage part is rolled with its own named-dice sources. The kept roll is the saved roll, so verification is unchanged. |
| Heal, generic dice, rest dice (changed) | `workflow/activity-buttons.mjs`, `workflow/rest.mjs` | Selectors `healing`, `dice`, and `recovery` (key `hitDice`/`chakraDice`). |
| `rollWithSpec` (changed) | `dice/roll.mjs` | Rule-element advantage on d20 rolls joins the condition sources. Dazzled still blocks advantage on attacks. |
| Validators (changed) | `rules/effect-authoring.mjs`, `workflow/automation.mjs` | Accept `advantage`/`disadvantage` without a value. |

**Not covered.** No dice are rolled automatically for Burned/Bleed damage (applied by the GM), Deflection, Recharge or the Ammunition Die from a creature's own sources. They can adopt `rollDice` when a source names them. A click (Alt/Ctrl) still affects d20 rolls only, since advantage on other dice must be named by a source.

**Tests.** `tests/dice-advantage.test.mjs` has 4 tests, which passed on the first attempt. Final: 306 pass, 2 skipped. The first push of this batch carried the code without the version bump, so no release was made from it; the follow-up commit bumped the version.
