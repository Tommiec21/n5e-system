# ENV1 function spec: environment

Status: **ENV1a in progress (continuing the plan after POS1, 2026-11-14).** Release target `0.21.0-alpha.1`. Falling waits on King (Q-C11).

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

## Progress log

- 2026-11-14 Claude: **F1–F4 done** (written before this file):
  - `rules/environment.mjs`.
  - The Hostile Terrain behaviour, registered in `registerDataModels` with the icon `fa-volcano`; `system.json` documentTypes and `lang/en.json` updated (`npm run check` passes).
  - `workflow/environment.mjs`, called from `turnStartPipeline` after the Surprised line.
  - The `[data-n5e-terrain-save]` button is bound in `onRenderChatMessage`.
  - Suite green (346). Next: tests (`tests/environment.test.mjs`), then release ENV1a.
