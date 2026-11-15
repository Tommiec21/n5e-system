# FIN4 function spec: rules corrections

Status: **spec written 2026-11-15 (King: "Next batch"). King answered Q-F14–Q-F18 (2026-11-15). Split into FIN4a, FIN4b and FIN4c. FIN4a approved 2026-11-15 ("Approved") and published `0.33.0-alpha.4`; FIN4b and FIN4c each need a go-ahead.**

Plan: `docs/DEV_PLAN.md` row 4. It closes the limits ENV1 and POS1 recorded when they shipped.

**Dropped (King 2026-11-15):** "Pierce limited to unarmed and Taijutsu damage" had no source. Pierce is a universal counter to DR and stays as it works today.

## What is open today

| # | Limit | From | What happens now |
| --- | --- | --- | --- |
| L1 | A choke still drops the target to 0 HP and Dying when its breath runs out | ENV1 | The Choke skill action (Athletics, on a creature you hold) applies Suffocating, and its card says "0 HP from it means Unconscious, not Dying". The breath countdown doesn't know the Suffocating came from a choke, so out of breath it sets Dying, and the GM swaps it by hand. |
| L2 | Breath outside combat isn't counted | ENV1 | Holding breath is Con modifier minutes (at least 30 seconds) outside combat, Con modifier turns in combat (at least 1). Only the combat count runs. |
| L3 | Indirect Exposure is a table procedure | ENV1 | Hostile Terrain regions only run Direct Exposure (the Con save at turn start in combat). The exploration Survival checks, and the Release immunities to them (Extreme Heat: Fire Release; Extreme Cold: Water Release; Toxic: Medical Release), are not run. |
| L4 | "Can see you" for Opportunity Attacks is "not Blinded" | POS1 | A creature that can't see the mover for any other reason (darkness, walls, Hidden) still gets the reminder. |
| L5 | Reach is measured centre to centre | POS1 | Large and bigger creatures (and their targets) get reach measured from their middles, so a Large creature's 5-ft reach is too short by half its size. |

## Functions

After each function, add a line to the progress log and push.

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | Choke: Unconscious, not Dying | `workflow/skill-actions.mjs` (`onSkillApplyClick`), `workflow/environment.mjs` (`breathTurnStart`) | Suffocating applied from a Choke outcome is marked `flags.n5e.choke` (with the holder). Out of breath, a choked creature drops to 0 HP and is **Unconscious** (not Dying), and the turn card says so. Q-F15: the choke's Suffocating ends at once when the hold ends (let go, escaped, or the hold effect is removed). |
| F2 | Breath outside combat | `rules/environment.mjs` (`breathSeconds`, `breathLeft`), `workflow/environment.mjs` | Outside combat, Suffocating records the world time it started; breath lasts Con modifier minutes (at least 30 s). When world time passes it, the active GM drops the creature to 0 HP and Dying (Unconscious for a choke). Q-F16: when combat starts or ends mid-breath, the count starts fresh (Con modifier turns in combat, Con modifier minutes out of it). The breath left shows on the turn card and the Suffocating effect, and the GM can set it to any value ("Set breath" button, GM only) to account for time already spent. |
| F3 | Indirect Exposure checks (an option) | `rules/environment.mjs` (`indirectExposure`), `workflow/environment.mjs`, API `game.n5e.api.indirectExposure()` and a GM button | Q-F14: the GM decides; nothing runs on its own. When the GM chooses, "Indirect Exposure" opens a GM dialog listing the creatures in Hostile Terrain regions (or the selected tokens), with the terrain's DC pre-filled (D 18, C 20, B 21, A 23, S 25) and editable, and a note box for the consequence. Each listed creature gets a Survival check card for its owner; creatures with the terrain's Release are marked "may be immune" for the GM to keep or remove. The GM applies any consequence by hand. |
| F4 | "Can see you" from token vision | `workflow/positioning.mjs` (`onMoveForOpportunity`), `canvas/visibility.mjs` (`observerVisibility`) | Each watcher's sight of the mover is checked with the same observer-specific test Uncanny Dodge uses (the watcher's own vision and detection modes, line of sight, Hidden/Undetected). Can't see: no reminder. Q-F17: when the check can't decide (no vision on the token, different elevation), the reminder is sent with "sight not checked". Blinded still blocks. |
| F5 | Reach edge to edge | `rules/positioning.mjs` (`nearestCells`), `workflow/positioning.mjs` | Reach is measured from the nearest square of the watcher to the nearest square of the mover, before and after the move, with Foundry's grid measurement (so the scene's diagonal rule applies). Gridless scenes: centre distance less each token's half-size. |

## Releases (Q-F18: several small ones)

- **FIN4a**: F1 (choke), F2 (breath outside combat).
- **FIN4b**: F3 (Indirect Exposure, GM option).
- **FIN4c**: F4 (sight), F5 (reach edge to edge).

## Tests

- `tests/core/environment.test.mjs`: breath seconds (Con mod minutes, at least 30 s); breath left from a start time; the choke's out-of-breath result (Unconscious); Indirect Exposure DC and the Release immunity per terrain.
- `tests/positioning.test.mjs`: nearest cells for 1×1 and 2×2 tokens (adjacent, diagonal, 10 ft apart); a Large watcher's 5-ft reach covers an adjacent Medium mover; "can't see" (false) gives no reminder; unknown follows Q-F17.

## Questions for King

- **Q-F14: Indirect Exposure.** The rules say "Survival check at intervals or consequences". What is the interval (every hour of travel, as ENV1 assumed?), the DC (the terrain's DC: D 18, C 20, B 21, A 23, S 25?), and the consequence of a failure (a rank of Exhaustion, the terrain's damage, something per terrain type)? Does a Release affinity alone make a creature immune, or must it have Release jutsu or a feature?
- **Q-F15: Ending a choke.** When the holder lets go or the hold is escaped, does the choke's Suffocating end at once (proposed), or does the creature need to catch its breath?
- **Q-F16: Breath across combat.** If a creature is already holding its breath when combat starts: keep its remaining time (1 round = 6 seconds, so 2 minutes left = 20 turns), or start the combat count fresh (Con modifier turns)? And the other way when combat ends?
- **Q-F17: Unknown sight.** When the system can't check a watcher's sight (the token has no vision set up, or the two are at different elevations), send the Opportunity Attack reminder anyway with "sight not checked" (proposed), or send nothing?
- **Q-F18: Releases.** One release, or F1–F3 (environment) then F4–F5 (positioning)?

## King's answers (2026-11-15)

- **Q-F14:** the GM decides; no need to automate. Offer it as an option; the GM has the final say.
- **Q-F15:** yes, the choke's Suffocating ends when the hold ends.
- **Q-F16:** start the count fresh; the GM can adjust it to account for time spent.
- **Q-F17:** yes, send the reminder with "sight not checked".
- **Q-F18:** several smaller releases.

## Progress log

- 2026-11-15 Claude: spec written from the ENV1 and POS1 limits; the Pierce item dropped (King: Pierce is a universal counter to DR). Awaiting answers and approval.
- 2026-11-15 Claude: answers recorded; F2 gains the GM's Set breath; F3 is a GM option with an editable DC and no automatic consequence; split into FIN4a, FIN4b, FIN4c.
- 2026-11-15 Claude: **FIN4a built and published 0.33.0-alpha.4.**
  - F1: the Choke outcome's Apply carries `data-choke` (the choker); the Suffocating effect gets `flags.n5e.choke {holder}`; out of breath uses `outOfBreathStatus` (Unconscious for a choke); deleting the holder's last hold effect deletes the choke's Suffocating (active GM).
  - F2: `rules/environment.mjs breathSeconds`, `breathState`; `flags.n5e.breath` is turns (combat) or `{until}` (world time); `workflow/environment.mjs startBreathTime`, `breathClock` (updateWorldTime), `setBreath` (GM dialog), `registerEnvironmentHooks` (createActiveEffect starts the count and posts the GM card; deleteCombat restarts it fresh; deleteActiveEffect clears it).
  - Tests: `tests/environment.test.mjs` +2. Suites: 499 and 119 pass.
