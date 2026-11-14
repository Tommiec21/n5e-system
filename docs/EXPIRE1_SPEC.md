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

## Open question (Q6)

Conditions that end "at the end of the creature's next turn" (Dazed, Staggered, Berserk, Confused, Slowed) have no time duration, so outside combat they stay until removed by hand. Should they end after one round (6 seconds) of world time out of combat?
