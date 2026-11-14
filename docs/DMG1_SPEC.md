# DMG1: damage numbers

Status: **started on King's "Begin the next Batch" (2026-11-13). Published 0.15.0-alpha.4.** Closes R10, except auto-fail saves, which move to ADV1, and R11.

King's rulings (2026-11-13):
- Bruised's +4 is added before DR.
- Weakened is taken off the roll's total, first type first.

## Functions

| Function | File | Behaviour |
| --- | --- | --- |
| `dealtDamagePenalty(attacker)` | `rules/damage.mjs` (pure) | Weakened (−4 per rank, from `conditionPenalties.damageDealt`) plus Exhaustion (−1 per rank, once per roll). |
| `reduceInstances(instances, amount)` | same | Takes an amount off typed parts, first type first, never below 0. Returns `{instances, removed}`. |
| `exhaustedRollTotal(total, actor)` | same | Exhaustion on healing and recovery rolls, never below 0. |
| `damagePlan(..., {dealtPenalty})` (changed) | same | Order: 1) the source's penalty; 2) Bruised `damageTaken` added to the first HP type; 3) DR; 4) resistance, including Petrified `flags.resistAll`; 5) pools. Each change adds a step to the record. |
| Damage activity (changed) | `workflow/activity-buttons.mjs` | Stores `dealtPenalty` on the damage card. The saved rolls stay as rolled, so roll verification is unchanged. |
| `applyToSelected` (changed) | `workflow/apply-damage.mjs` | Passes the card's `dealtPenalty` to `damagePlan`. |
| Heal activity, Short Rest dice (changed) | `workflow/activity-buttons.mjs`, `workflow/rest.mjs` | Exhaustion applied once per roll. |

## Not in this batch

- Auto-fail saves (Petrified, Stunned, Unconscious) belong to ADV1.
- Falling and environment damage skipping DR already works through `ignoreDR`. Falling itself is ENV1.
- Weapon attack cards from `attack.mjs` that roll damage through the same damage activity are covered. There is no separate damage path to change.

## Tests

`tests/damage-numbers.test.mjs` has 4 tests:
- Bruised: placement and edge cases;
- Petrified: immunity, and Half not stacking;
- Weakened and Exhaustion: order, floor at 0, and the steps they add to the record;
- Exhaustion on healing rolls.

One full-suite run passed on the first attempt: 298 pass, 2 skipped. Lint and check pass.
