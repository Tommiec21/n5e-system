# POS1 function spec: positioning

Status: **published `0.20.0-alpha.1` (continuing the plan after RES1, 2026-11-14).**

Plan row 12: opportunity attacks and reach, Engaged, Surprise, Dodge, cover (+2/+4).

Rules (KB 03 and 05):
- **Cover** (highest applies): Partial +2 AC and Dex saves; Half +4; Total = can't be targeted directly (areas may still reach). The GM decides cover.
- **Opportunity Attack:** a reaction when a seen hostile leaves your reach: one melee attack before it leaves; one per movement; not triggered by teleport or forced movement. **Disengage:** your movement doesn't provoke for the rest of the turn.
- **Engaged** (relational, derived): after either creature makes a melee attack against the other; ends after a full round without one.
- **Surprised:** no move, Action or Bonus Action on its first turn; no Reaction until the end of that turn; ends at the end of round 1.
- **Dodge:** attacks against you have disadvantage if you see the attacker; advantage on Dex saves; lost while incapacitated or at speed 0.

dnd5e and PF2e parity: cover is a status the GM puts on a token (dnd5e 4.x cover statuses); opportunity attacks are not rolled automatically; the system reminds the creature's owner.

## Functions

After each function, add a line to the progress log and push.

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | Cover statuses `coverPartial`, `coverHalf`, `coverTotal` | `config/conditions.mjs`, `data/actor/creature.mjs` | Token statuses the GM toggles. The highest one applies: +2 or +4 to AC and to Dex saves (`coverBonus(statuses)`, pure, `rules/positioning.mjs`). |
| F2 | Total cover blocks targeting | `workflow/attack.mjs`, `dice/roll.mjs` | A single attack target with Total cover: the attack is refused with a warning. Target rows show "Total cover". |
| F3 | `leavesReach(...)`, `opportunityReminders(...)` | `rules/positioning.mjs` (pure) | For a move from A to B: hostile creatures whose reach covers A but not B, who aren't incapacitated, haven't used their Reaction, and can see the mover. Teleport and forced moves (movement action `blink`, `displace`, or flagged forced) and a Disengaged mover provoke nothing. |
| F4 | Opportunity Attack reminder | `workflow/positioning.mjs` (new) | Active GM, `moveToken` hook: for each provoked creature, a chat card whispered to its owners (and the GM): "Y leaves X's reach: Opportunity Attack (Reaction)". The card's button makes the reach weapon attack (or unarmed) against the mover and marks the Reaction used. |
| F5 | Disengage | `workflow/economy` (core action) | Using the Disengage core action sets `flags.n5e.economy.disengaged` (reset at turn start). |
| F6 | Engaged | `rules/positioning.mjs`, `workflow/attack.mjs` | A melee attack against a single target records the round on both actors (`flags.n5e.engaged.<otherUuid> = round`). `isEngaged(actor, other, round)` is true while the last melee attack between them was this round or last round. |
| F7 | Surprised | `rules/turn-start.mjs`, `workflow/turn.mjs`, reactions | At a Surprised creature's first turn in round 1, its move, Action and Bonus Action are marked used. It can't take Reactions until that turn ends. Surprised is removed from every combatant at the start of round 2. |
| F8 | Dodge lost at speed 0 | `rules/advantage.mjs` | Dodging gives nothing while Grappled or Restrained (speed 0), as well as while incapacitated. |

## Tests

`tests/positioning.test.mjs`: cover bonus (highest only), AC and Dex save; Total cover refusal; reach leaving (in to out, staying in, teleport, forced, Disengaged, used Reaction, incapacitated, blinded); Engaged window; Surprised turn economy; Dodge at speed 0.

## Progress log

- 2026-11-14 Claude: spec written; starting F1.
- 2026-11-14 Claude: **F1 done.**
  - New `rules/positioning.mjs` (pure): `COVER`, `coverFrom`, `coverBonus`, `untargetable`, plus the helpers for F3, F6, F7 and F8 (`provokingMove`, `opportunityReminders`, `isEngaged`, `surprisedEconomy`, `dodgeActive`).
  - States `coverPartial`, `coverHalf`, `coverTotal` are on the token HUD, with rules text.
  - `creature.mjs` adds the highest cover to `system.ac` (a breakdown part) and to the Dex save, and records `system.cover`.
  - The suite is green after adding the rules text that the enrichers test requires. Next: F2 (Total cover refuses attacks).
- 2026-11-14 Claude: **F2 done.** `rollWithSpec` refuses any attack roll whose single target or user targets include a creature with Total cover: it warns and returns null before rolling. That covers weapon attacks, jutsu attack buttons and strikes. Suite green. Next: F3/F4 (Opportunity Attack reminder) and F5 (Disengage flag).
- 2026-11-14 Claude: **F3–F6 done.**
  - New `workflow/positioning.mjs`:
    - `meleeReach(actor)`: the longest reach and the weapon that has it, else unarmed 5 ft.
    - `onMoveForOpportunity` (active GM, `moveToken`, in combat): measures each hostile combatant's distance to the mover's start and end. `opportunityReminders` skips Disengaged movers, teleport and forced moves, used Reactions, incapacitated, Surprised and Blinded watchers. Provoked creatures' owners and the GM get a whispered card.
    - `onOpportunityClick`: the owner makes the attack with `mode: "opportunity"`. That spends the Reaction and skips the range check, since the attack happens before the target leaves.
    - `onCoreAction`: the Disengage card spends the Action and sets `flags.n5e.economy.disengaged`, reset at turn start. The Dodge card spends the Action and turns on Dodging.
    - `recordEngagement` / `engagedWith`: a melee attack against a single target writes `flags.n5e.engaged.<otherId> = round` on both creatures the user owns.
  - `registerPositioningHooks()` is called from `n5e.mjs`. The `[data-n5e-oa]` button is bound in `onRenderChatMessage`.
  - Suite green. Next: F7 (Surprised) and F8 (Dodge at speed 0).
- 2026-11-14 Claude: **F7 done.** Surprised:
  - `surprisedTurnStart` (from `turnStartPipeline`) spends the Action and Bonus Action in round 1 and adds a turn-card warning.
  - `surprisedTurnEnd` (from `turnEndPipeline`) sets `flags.n5e.surpriseDone`, so Reactions are allowed again.
  - `endSurprise` (`N5eCombat._onStartRound`, round 2+) removes Surprised and the flag from every combatant.
  - `chooseReaction` returns nothing while Surprised and not done. Opportunity Attack watchers count that as a used Reaction (`surpriseBlocksReaction`).
  - Movement isn't tracked as economy, so "no move" is the turn-card warning only.
  - Suite green. Next: F8 (Dodge at speed 0), then tests.
- 2026-11-14 Claude: **F8 done.** `rules/advantage.mjs`: Dodging gives nothing while Grappled or Restrained, as well as while incapacitated (`dodgeLost`). Applies to both attack disadvantage and the Dex-save advantage. Suite green. Next: tests (`tests/positioning.test.mjs`), then release 0.20.0-alpha.1.
- 2026-11-14 Claude: **Correction:** the F8 code change above failed to apply in commit a96cc9f (a wrong assertion count), though the log said done. It was applied in the next commit; `dodgeLost` is now in `rules/advantage.mjs`.
- 2026-11-14 Claude: **Tests done.** New `tests/positioning.test.mjs` (4 tests) passed on the first attempt: 346 pass, 2 skipped. Lint and check pass.

## Final results

Published `v0.20.0-alpha.1`. F1–F8 were built; the progress log lists each one, including the F8 correction.
- **Differs from the spec.**
  - Disengage and Dodge became core-action effects (Dodge was a card only before).
  - Movement isn't tracked as economy, so Surprised's "no move" is a turn-card warning.
  - Total cover is checked in `rollWithSpec` for every attack roll, not only weapon attacks.
- **Limits.**
  - Opportunity Attack reach is measured centre to centre, and only between combatants.
  - "Can see you" is approximated as not Blinded.
  - Engaged is recorded only on creatures the attacking user owns (the GM owns both sides for NPCs).
