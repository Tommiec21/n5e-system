# OPS1 function spec: multiplayer parity and Allied NPCs

Status: **approved by King 2026-11-13; in progress (Claude).**

Decisions this spec implements (King, 2026-11-13; `PROGRESSION_PLAN.md` Sections 3 and 7):
- Copy dnd5e 5.3.3 and PF2e exactly for player ↔ NPC interaction.
- No GM approval dialogs, and no GM relay for player → NPC changes.
- One exception: Allied NPCs, which players summon, own and control.

Final results are recorded at the end of this file, in `docs/MULTIPLAYER.md`, in the plan's status table and in the ledger.

## Releases

OPS1 ships as three releases, so either agent can stop cleanly between them.

| Release | Content |
| --- | --- |
| OPS1a `0.14.0-alpha.1` | Authority model, relay and dialog removal, owner-intent channel, Allied NPCs, rations, reaction decisions |
| OPS1b `0.14.0-alpha.2` | Parity UI: per-target attack results, visibility settings, effect-application cards, GM roll requests |
| OPS1c `0.14.0-alpha.3` | ActorDelta duplicate-item and missing-Kunai bugs (reproduce first, then fix) |

Step zero of OPS1a is a parity audit. It produces `docs/MULTIPLAYER_PARITY.md`, a table with one row per dnd5e/PF2e behaviour: engine, source file, the N5e equivalent, and the test that covers it. dnd5e is read from the extracted source on King's PC. PF2e 7.12.2 is fetched from its GitHub release. Any behaviour the audit finds that this spec misses is added to the audit table and built in the same release.

## How authority works after OPS1

- **dnd5e parity.** Every action runs on the clicking user's own client. A user changes only documents they own. The GM owns all NPCs, so the GM's client applies everything that happens to an NPC. There are no approval dialogs.
- **Lifecycle cleanup.** Cleanup the system does by itself keeps running on the active GM's client from document hooks. dnd5e works the same way: the active GM deletes concentration-dependent effects. This covers turn-start damage on NPCs, expiring effects, summon lifetimes and dependents.
- **Owner intents.** Three N5e actions need the GM's client to finish:
  - creating or dismissing Allied NPCs;
  - spending party rations, because the pool is a world setting;
  - a player's reaction decision on a GM-authored reaction window.

  These go through owner intents, not the socket. The player writes a request into a flag on an actor they own. The active GM's `updateActor` hook receives the server-verified id of the user who made the change, checks that user is an owner, runs the request and writes the result back. There is no dialog. Foundry authenticates the request, unlike the socket used today.

## OPS1a functions

### New: `module/automation/authority.mjs` (pure; tested in Node)

| Function | Signature | Behaviour |
| --- | --- | --- |
| `canModify` | `(user, doc) → boolean` | True if `user.isGM` or `doc.testUserPermission(user, "OWNER")`. Every apply/remove control uses this one test. |
| `ownedRecipients` | `(actors, user) → {owned: Actor[], skipped: Actor[]}` | Splits recipients by `canModify` and removes duplicates by uuid. Like dnd5e `damage-application.mjs`, which lists only owned actors. |
| `skippedNotice` | `(skipped) → string \| null` | "The GM applies this to: A, B." Null when nothing is skipped. |
| `isAllied` | `(actor) → boolean` | NPC with `system.allied === true`. |
| `alliedOwnerId` | `(actor) → string \| null` | The user id stored in `flags.n5e.allied.ownerId`. |

### New: `module/automation/owner-intents.mjs`

| Function | Signature | Behaviour |
| --- | --- | --- |
| `INTENT_TYPES` | `const` | `summonAllied`, `dismissAllied`, `spendRations`, `reactionDecision`. Any other type is refused. |
| `submitIntent` | `async (actor, type, data, {timeout = 30000}) → result` | Requires `canModify(game.user, actor)`. If the user is the active GM, runs the handler directly. Otherwise writes `flags.n5e.intents.<id> = {type, data, at}` to the actor and waits for `flags.n5e.intentResults.<id>`. Resolves with the result or rejects with its error. On timeout: "A GM must be connected for this." |
| `validateIntent` | `(type, data) → data` (pure) | Checks shape and bounds for each type: uuids are strings, counts are 1–20, and so on. Throws on bad input. |
| `processIntent` | `async (actor, id, intent, userId)` (active GM only) | Runs only if `actor.testUserPermission(game.users.get(userId), "OWNER")`, where `userId` is the hook's server-verified user. Runs the handler, writes `{ok, result \| error}` to `intentResults.<id>` and unsets `intents.<id>`. Each id is processed once; a repeat is ignored. |
| `pruneIntentResults` | `async (actor)` | The requester removes its own results once read, keeping actor flags small. |
| `registerOwnerIntents` | `()` | `Hooks.on("updateActor", (actor, change, options, userId))`. On the active GM it processes new `intents` keys. On ready it also processes any intents still pending from before a reload. |

### New: `module/workflow/allied.mjs` (replaces the GM-only `summonTokens` / `dismissSummons` path)

| Function | Signature | Behaviour |
| --- | --- | --- |
| `canSummonAllied` | `(user) → boolean` | GM, or the world setting `alliedSummoning` is on (the equivalent of dnd5e `allowSummoning`). |
| `summonAllied` | `async (caster, item, {uuid, count, x, y, seconds, concentration, initiative})` | Entry point from the card button. Requires ownership of `caster`. The GM calls `placeAllied` directly; a player sends `submitIntent(caster, "summonAllied", …)`. |
| `placeAllied` | `async ({casterUuid, itemId, templateUuid, count, positions, seconds, concentration, ownerId, initiative})` (GM side) | Creates unlinked tokens from the world Actor template. Each token gets `delta.ownership[ownerId] = OWNER`, `delta.system.allied = true`, friendly disposition, and `flags.n5e.summon` plus `flags.n5e.allied = {ownerId, casterUuid, itemId}`. If the caster is in combat, it adds combatants using the item's initiative option (match the caster's initiative, or roll), as dnd5e summons do. Fires the `n5e.summoned` hook. Returns token uuids. |
| `dismissAllied` | `async (caster, itemId)` | The GM dismisses directly; a caster owner sends `submitIntent(caster, "dismissAllied", …)`. Removes only tokens flagged with this caster and item. |
| `cleanupSummons` (changed) | existing | Same rules: concentration end, duration end and dismissal remove the tokens. It now also removes their combatants. |

**Data:** `system.allied` (boolean, default false) on the NPC model in `data/actor/npc.mjs`. No migration is needed. **Setting:** `alliedSummoning` (world, default true), shown in the N5e Rules panel under Multiplayer.

### Changed: rations and reactions

| Function | File | Change |
| --- | --- | --- |
| `spendRations` | `workflow/rest.mjs` | The GM writes the setting directly. A player sends `submitIntent(restingActor, "spendRations", {amount})`. The bounds and the "not enough rations" check run in the handler. Replaces `asGM("spendRations")`. |
| `sendDecision` | `workflow/reactions.mjs` | A player submits `submitIntent(reactingActor, "reactionDecision", {messageId, decision})`. The handler checks the window is still pending and calls `resolveReactionWindow`. The GM "Review reaction choice" dialog is removed. |
| `receive` / socket listener | `workflow/reactions.mjs` | Removed. |

### Changed: every call site that routed through the GM

Each `if (shouldCoordinate(...)) return submitWorkflow(...)` branch is deleted, so the action runs on the clicking client. Actions on your own actor need nothing more. Actions on other actors filter recipients through `ownedRecipients` and post the skipped notice.

| Call site | After OPS1 |
| --- | --- |
| `workflow/cast.mjs` (cast) | Runs locally |
| `workflow/attack.mjs` (attack) | Runs locally |
| `dice/roll.mjs` (roll) | Runs locally |
| `dice/roll.mjs` (Will of Fire) | Runs locally |
| `workflow/use-feature.mjs` | Runs locally |
| `workflow/resources.mjs` | Runs locally |
| `workflow/health.mjs` | Runs locally |
| `workflow/rest.mjs` (rest) | Runs locally |
| `workflow/turn.mjs` (end concentration) | Runs locally |
| `workflow/apply-damage.mjs` (death save) | Runs locally |
| `applications/actor/character-sheet.mjs` (fury, gates, mark, end condition) | Runs locally |
| `workflow/apply-damage.mjs onApplyClick` | Damage, heal, inflict, undo, concentration check: owned recipients only. Coordinated damage runs on whoever applies it (GM for NPCs, owner for PCs). |
| `workflow/apply-damage.mjs` "Successful hit" button | Runs `chooseReaction(actor, "successfulHit")` for owned controlled or targeted recipients. The "Confirm successful hit" dialog is removed: the click is the confirmation. |
| `workflow/activity-buttons.mjs` | Runs locally. Effects on targets go to owned recipients; others get an effect-application card (OPS1b; until then, the skipped notice). |
| `workflow/trackers.mjs` (tracker, resave) | Runs locally. Marks and Branded on targets apply to owned recipients; others get an effect-application card (OPS1b). |

### Removed

| What | Where |
| --- | --- |
| `asGM`, `prepare`, `registerSocket`, socket channel `system.n5e`, `validateEffectRequest` | `module/socket.mjs` (file deleted; `"socket": true` removed from `system.json`) |
| `shouldCoordinate`, `submitWorkflow`, `prepareWorkflow`, `targetSnapshot`, `storedButton`, `buttonIndex`, `sourceStamp`, `clickData` | `module/automation/multiplayer.mjs` (file deleted; any still-needed helper moves next to its caller) |
| `requestEffects` / `asGM("createEffects")` | `module/workflow/trackers.mjs` |
| Request review, resume and reconcile screens | `applications/gm/automation-recovery.mjs`. The receipt archive view stays. |
| `multiplayerCoordination` rule | `config/rules.mjs`. `coordinatedDamage` and `reactionWindows` stay; they now run on the applying client. |
| `resumeReview` parameter and review wording | `automation/commands.mjs coordinateCommand`, `workflow/coordinated-damage.mjs`. Receipts stay for duplicate-click protection only. |

### OPS1a tests (new, Node)

| File | Covers |
| --- | --- |
| `tests/authority.test.mjs` | `canModify`, `ownedRecipients`, `skippedNotice`, `isAllied` |
| `tests/owner-intents.test.mjs` | Validation, non-owner refusal, once-only processing, results and timeout, unknown types refused |
| `tests/allied.test.mjs` | Placement data (ownership, delta, flags, disposition), combatant creation, dismissal scoped to caster and item, refusal when `alliedSummoning` is off |
| `tests/parity-routing.test.mjs` | No module imports the removed socket or multiplayer APIs, and no `DialogV2.confirm` remains in request paths |
| Existing multiplayer and reaction tests | Rewritten to the owner model. Tests for relay-only behaviour are deleted with the code they covered. |

## OPS1b functions (parity UI)

| Function | File | Behaviour |
| --- | --- | --- |
| `attackTargetRows` | `rules/attack-targets.mjs` (pure) | `(roll, targets, {visibility, user}) → [{uuid, name, result: "hit"\|"miss"\|"crit"\|"fumble"\|null, ac: number\|null}]` computed from AC, natural 20 and natural 1. Matches dnd5e's chat target list. |
| `renderAttackTargets` | `dice/roll.mjs` render hook | Draws the rows on attack cards. Snapshots targets when the roll is made, and dnd5e-style "select targets" works on the card. |
| `attackVisibility` / `challengeVisibility` / `bloodiedVisibility` | `rules/visibility.mjs` (pure) | `(setting, user, actor) → boolean`, following dnd5e's choices: attack all / hide AC / none; challenge all / player / none; bloodied all / player / none. |
| Settings `attackRollVisibility`, `challengeVisibility`, `bloodiedVisibility`, `concealItemDescriptions` | `config/rules.mjs` | Same defaults as dnd5e: none / player / player / false. PF2e metagame settings are mapped onto these during the audit. |
| `concealedDescription` | `view-models/item.mjs` | Hides NPC item descriptions from non-owners when concealment is on, as in dnd5e. |
| `effectApplicationCard` | `workflow/effect-application.mjs` | `(source, effects, {concentration}) → ChatMessage`. Posts the effects with an Apply control for owned controlled or targeted tokens (dnd5e `effect-application.mjs`). |
| `applyEffectFromCard` | same | `(message, effectIndex, actor)`. Owner or GM only. Tags effects `flags.n5e.dependentOn` with the caster's concentration, so they end with it (the active GM deletes dependents, as dnd5e does). |
| `postRollRequest` | `workflow/roll-request.mjs` | GM only. `({type, key, dc, actors})` posts a request card; each player sees and rolls only their own entries (dnd5e `request-message-data.mjs`). |
| GM request link | `applications/enrichers.mjs` | Adds a request icon to `[[/save]]` and `[[/check]]` for GMs, as dnd5e's `createRequestLink` does. |

Tests: `tests/attack-targets.test.mjs`, `tests/visibility.test.mjs`, `tests/effect-application.test.mjs`, `tests/roll-request.test.mjs`.

## OPS1c (bugs)

| Step | Detail |
| --- | --- |
| Reproduce | `tests/token-actor-items.test.mjs`: an unlinked token actor (ActorDelta) using a Kunai attack, thrown ammunition and an item card. It asserts no duplicate embedded items and that the Kunai resolves. |
| Locate | Suspect paths: removed relay uuid resolution for synthetic actors, `workflow/ammo.mjs` quantity updates, and item lookup by id on `token.actor`. |
| Fix | Fixed where found. The functions changed are recorded here when done. If removing the relay in OPS1a already fixes either bug, the test stays as a regression guard. |

## Docs updated at the end of each release

`docs/MULTIPLAYER.md` (rewritten to the owner model), `docs/MULTIPLAYER_PARITY.md`, `docs/RULES_MAP.md`, `docs/DATA_REFERENCE.md` (`system.allied`, `flags.n5e.allied`, `flags.n5e.intents`/`intentResults`, `flags.n5e.dependentOn`), `docs/generated/module-index.md`, `PROGRESSION_PLAN.md` status table, the `CODEX_CONTEXT.md` ledger, and N5e-Context.md Section 12.

## Final results

_(filled in after each release)_
