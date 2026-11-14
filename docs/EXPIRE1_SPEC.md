# EXPIRE1: timed effect expiry

Status: **King said "start" on 2026-11-13. Published 0.15.0-alpha.2.** Closes R8 (timed generic effects never expire) and R9 (conditions only expire in combat).

## Functions

| Function | File | Behaviour |
| --- | --- | --- |
| `durationExpired(effect)` | `rules/expiry.mjs` (pure) | Foundry's own duration check: a timed duration (`seconds` or `turns`) with `remaining <= 0`. An effect with no remaining value counts as not expired. |
| `expiredEffects(actor, {includeConditions})` | same | Expired effects on one actor. Skips caster-tied `flags.n5e.expires` effects (their own lifecycle ends them). Skips conditions unless `includeConditions`, the `conditionDurations` rule is on, and the condition doesn't Persist. |
| `expireEffects(actor, {includeConditions})` | `workflow/expiry.mjs` | Active GM only. Deletes the expired effects and returns their names. |
| `expireInCombat(combat)` | same | Every combatant, conditions excluded (they keep their turn-end processing). Called from `turnStartPipeline` right after the caster-tied expiry. |
| `expireOutOfCombat()` | same | World actors and unlinked token actors that aren't in a started combat, conditions included. |
| `postExpiryCard(results)` | same | One GM-whispered "Effects ended" card listing each actor's ended effects. |
| `registerExpiryHooks()` | same | Registers `updateWorldTime` → `expireOutOfCombat`. Called at load in `n5e.mjs`. |

## Tests

`tests/expiry.test.mjs` has 4 tests:
- the duration check;
- which effects go and which stay;
- conditions in and out of combat, including Persists and the rule switched off;
- the workflow: only the active GM acts, one card is posted, and actors in combat are left to the turn engine.

One full-suite run passed on the first attempt: 293 pass, 2 skipped. Lint and check pass.

## Q6: answered by King (2026-11-13), published 0.15.0-alpha.3

Out of combat, "end of next turn" conditions end immediately, unless they were applied manually by dragging the condition effect onto the creature.

| Function | Change |
| --- | --- |
| `Actor#addCondition(key, ranks, {manual})` | New `manual` option. A non-manual Staggered, Dazed, Berserk, Confused or Slowed on an actor not in a started combat isn't created ("ends immediately" notice; returns null). Non-manual conditions are tagged `flags.n5e.applied = "auto"`. |
| `Actor#inStartedCombat` (new getter) | Is the actor a combatant in a combat that has started? |
| Sheet add-condition picker, GM Party Overview | Pass `{manual: true}`. A dragged condition effect bypasses `addCondition`, so it is never tagged and stays. |
| `expiredEffects` | Out of combat, "end of next turn" conditions tagged `auto` count as expired. |
| `combatEndPipeline` | Calls `expireEffects(actor, {includeConditions: true})` for each combatant, so game-applied "end of next turn" conditions and timed effects end with the combat. |

Test added to `tests/expiry.test.mjs`. One full-suite run passed on the first attempt: 294 pass, 2 skipped.
