# ENV1 function spec: environment

Status: **ENV1a published `0.21.0-alpha.1`. ENV1b (falling) approved by King 2026-11-14 ("Begin work I approve these"), release target `0.23.0-alpha.1` with SKILL1b.**

Plan row 14: hostile terrain as Region behaviours, falling, suffocation.

Rules (KB 06):
- **Hostile terrain, Direct Exposure (combat):** at the start of each turn, a Con save vs the terrain DC; a failure deals terrain damage, ignoring DR.
  - Ranks: D 18 (Indirect only), C 20 / 3d6, B 21 / 5d6, A 23 / 7d6, S 25 / 9d6.
  - Types: Extreme Heat (fire), Extreme Cold (cold), Toxic Environment (poison), Chakra Resistant (no damage: no Wall/Water Walk; area concentration upkeep doubled; Sensory and Dojutsu can't see past its surface).
- **Indirect Exposure** (exploration, hourly Survival checks) stays a table procedure.
- **Suffocating:** hold your breath for your Con modifier in minutes (min 30 s); in combat, your Con modifier in turns (min 1). Then drop to 0 HP and Dying.
- **Falling:** two versions in Chapter 7 (KB conflict C11). See Q-C11.

## Functions

After each function, add a line to the progress log and push.

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | `terrainExposure`, `worstExposure`, `breathTurns`, `suffocationStep` | `rules/environment.mjs` (new, pure) | Exposure numbers by type and rank (the highest DC when several overlap); breath countdown. |
| F2 | Hostile Terrain region behaviour | `data/region/hostile-terrain.mjs`, `data/_index.mjs`, `system.json` (`documentTypes.RegionBehavior.hostileTerrain`), `lang/en.json` | `{terrain, rank}` set by the GM on a Region. |
| F3 | `terrainsAt(tokenDoc)`, `environmentTurnStart`, `onTerrainSaveClick` | `workflow/environment.mjs` (new) | Turn start (active GM): a Direct Exposure card with a Con save button for the owner; a failure rolls the damage onto a damage card for that creature, ignoring DR. Chakra Resistant adds a turn-card note. |
| F4 | `breathTurnStart` | `workflow/environment.mjs` | Suffocating in combat counts down `flags.n5e.breath`. Out of breath: 0 HP and Dying. The counter is cleared when Suffocating ends. |
| F5 | Falling (ENV1b) | `rules/environment.mjs`, `workflow/environment.mjs` | Waits on Q-C11. |

## Questions for King

- **Q-C11. Falling.** Chapter 7 has two versions:
  - (a) Movement section: damage only if you fall farther than your Str score in feet (or your max high-jump height), 1d6 bludgeoning per 10 ft, max 100d6, land Prone.
  - (b) Environment section: 1d6 per 10 ft from any height, max 50d6, Prone, and you fall 500 ft per round.
  Which one applies, or a mix (for example (a)'s threshold with (b)'s cap and fall speed)? Both agree DR doesn't reduce it.

**Q-C11 answered (King 2026-11-14): Option A.** Threshold = Str score (or max high-jump height), 1d6 per 10 ft, max 100d6, Prone; DR doesn't reduce it.

## Progress log

- 2026-11-14 Claude: **F1–F4 done** (written before this file):
  - `rules/environment.mjs`.
  - The Hostile Terrain behaviour, registered in `registerDataModels` with the icon `fa-volcano`; `system.json` documentTypes and `lang/en.json` updated (`npm run check` passes).
  - `workflow/environment.mjs`, called from `turnStartPipeline` after the Surprised line.
  - The `[data-n5e-terrain-save]` button is bound in `onRenderChatMessage`.
  - Suite green (346). Next: tests (`tests/environment.test.mjs`), then release ENV1a.
- 2026-11-14 Claude: **Tests done.**
  - New `tests/environment.test.mjs` (4 tests).
  - Attempt 1: the new test file imported the data models before the Foundry stand-in in `tests/helpers/actor.mjs` loaded. Fixed by importing the helper first.
  - Attempt 2 passed: 350 pass, 2 skipped. Lint and check pass.

## Final results

### ENV1a: published `v0.21.0-alpha.1`
- F1–F4 were built as specified. F5 (falling) waits on Q-C11.
- **Differs from the spec:** the exposure check runs from the GM's turn pipeline, not from Region events, so it is forward-only and runs once per turn like every other turn-start step.
- **Limits.**
  - Indirect Exposure (hourly Survival checks) and Chakra Resistant's effects are table procedures.
  - Out-of-combat breath (minutes) isn't counted.
  - A choke (Suffocating with 0 HP meaning Unconscious, not Dying) still needs the GM to set Unconscious by hand.

## ENV1b: falling (Option A)

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F5 | `fallDamage(feet, strScore)` | `rules/environment.mjs` | Null within the Str score; otherwise 1d6 per 10 ft fallen, max 100d6, Prone. |
| F6 | `fall(actor, feet)` | `workflow/environment.mjs`, `api.mjs` (`game.n5e.api.fall`) | GM macro: a damage card for that creature (bludgeoning, ignores DR) with an Apply Prone button, or a "no damage" note. |

### Progress log
- 2026-11-14 Claude: **F5–F6 done.** The Prone button reuses `data-n5e-skill-apply`, so the target's owner or the GM applies it. Suite green. Next: tests for SKILL1b and ENV1b, then release 0.23.0-alpha.1.
- 2026-11-14 Claude: **Tests done.** One more test in `tests/environment.test.mjs`; first attempt passed (355 pass, 2 skipped). **Published `v0.23.0-alpha.1`** with SKILL1b.
