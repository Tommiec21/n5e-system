# CONC1: concentration

Status: **started on King's "Next batch." (2026-11-13). Published 0.15.0-alpha.9.** Closes R18.

## Functions

| Function | File | Behaviour |
| --- | --- | --- |
| `concentrationBreaker(actor)` | `rules/concentration.mjs` (pure) | The reason a creature can't concentrate: statuses incapacitated, stunned, unconscious, dying or dead, or condition flag `incapacitated` (Petrified). Otherwise null. |
| `lostReadied(actor)`, `readiedIds(actor)` | same | Readied jutsu whose concentration ended; all readied ids. |
| `upkeepOptions` (changed) | `rules/upkeep.mjs` | Leaves readied jutsu out of upkeep. |
| `breakConcentration(actor, reason)` | `workflow/concentration.mjs` | Drops every concentration jutsu and posts a card. |
| `dropLostReadied(actor)` | same | Clears readied jutsu whose concentration ended and posts a card. |
| `checkConcentration(actor)` | same | Active GM; runs both checks. Hooked to `updateActor`, `createActiveEffect` and `updateActiveEffect`. |
| `expireReadied(actor)` | same | Called from `turnStartPipeline`: unreleased readied jutsu are lost at the start of the creature's turn. |
| `releaseReadied(actor, itemId)` | same | Owner only. Needs the Reaction unspent and the concentration intact. Clears the readied entry, keeps concentration only if the jutsu itself is a concentration jutsu, and posts the cast card. |
| `postReadyCard`, `onRenderReadyCard` | same | The Readied card and its Release button. |
| `castPlan` (changed) | `workflow/cast-plan.mjs` | `sel.ready = {trigger}`. A cast time other than 1 Action is a problem. The jutsu is held as concentration, and `flags.n5e.readied.<itemId> = {trigger, rank, cost, readiedAt}` is written. |
| Cast dialog / `executeCast` (changed) | `workflow/cast.mjs` | Ready checkbox and trigger field. A readied cast posts the Readied card instead of the cast card. |
| `applyActivityEffect`, `requestEffects` (changed) | `workflow/trackers.mjs` | Effects of a concentration jutsu carry `flags.n5e.dependentOn`, so the active GM deletes them when the concentration ends. |

## Limits

- A released jutsu's cast card shows the stored rank and cost. One-off feature extras chosen at Ready time (extra damage or healing rows) are not re-shown on release.
- Ready is only offered from the cast dialog, not for Alt-click quick casts.

## Tests

`tests/concentration.test.mjs` has 3 tests, which passed on the first attempt. Final: 314 pass, 2 skipped. Lint and check pass.
