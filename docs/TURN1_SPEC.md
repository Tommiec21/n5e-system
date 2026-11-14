# TURN1 function spec: turn engine (forward-only events, per-period recovery, upkeep prompt)

Status: **approved by King 2026-11-13 (Q1: unanswered upkeep ends; Q2: NPC upkeep automatic by default, world rule allows Prompt or Manual). Published 0.15.0-alpha.1.**

Closes plan findings:
- R4: turn start reruns on rewind, and two separate hooks run it.
- R5: no turn, round or encounter use recovery.
- R6: upkeep pays itself without asking.
- R7: needs no change. Resetting the reaction at the start of your own turn is RAW and stays as it is.

Release: `0.15.0-alpha.1`, one release.

Pattern copied from dnd5e 5.3.3 `Combat5e`. Foundry v13 calls `Combat#_onStartTurn`, `_onEndTurn`, `_onStartRound` and `_onEndRound` only when combat moves forward, and only on the active GM's client. dnd5e hangs its turn automation and `_recoverUses` periods on these. N5e moves its turn automation there too, so rewinding a turn or round re-runs nothing.

## Turn events: new `module/documents/combat.mjs`

| Function | Behaviour |
| --- | --- |
| `class N5eCombat extends Combat` | Registered as `CONFIG.Combat.documentClass` in `n5e.mjs`. |
| `_onStartTurn(combatant)` | `super`, then `turnStartPipeline(this, combatant)`. |
| `_onEndTurn(combatant)` | `super`, then `turnEndPipeline(this, combatant)`. |
| `_onStartRound()` | `super`, then `recoverCombatUses` with period `round` for every combatant. |
| `startCombat()` | `super`, then `recoverCombatUses` with period `encounter` for every combatant (dnd5e does the same). |
| `_onDelete(options, userId)` | `super`. On the active GM: remove Combat Rival markers, recover `encounter` uses, and emit the `combatEnd` effect event. These moved here from the two hooks. |

**Removed:** the `combatTurnChange` and `combatStart` hooks in `workflow/turn.mjs` and `automation/effect-services.mjs`, and the `deleteCombat` hook in both. `registerTurnHooks` keeps only `moveToken` (Chilled) and `createActiveEffect` (Amp limits).

## Pipelines: `module/workflow/turn.mjs` (rewritten around the existing steps, same order)

| Function | Behaviour |
| --- | --- |
| `turnStartPipeline(combat, combatant)` | Active GM only. In order: caster-tied expiry; areas at turn start; condition damage; `turnStartPlan` (economy reset, Chain reset, Combo clear, Flow Focus); `recoverCombatUses` with period `turn`; Recharge rolls; `beginUpkeep`; death-save prompt; `turnStart` effect event; the turn card. |
| `turnEndPipeline(combat, combatant)` | Active GM only. Condition turn-end processing, tracker turn end, areas at turn end, `turnEnd` effect event, then `finishUpkeep` (see Q1). |
| `onRenderTurnCard(message, html)` (changed) | Also draws the upkeep form through `renderUpkeep`. |

## Per-period recovery

| Function | File | Behaviour |
| --- | --- | --- |
| `COMBAT_PERIODS` | `rules/recovery.mjs` (pure) | `turn` (start of your own turn), `round` (start of each round), `encounter` (combat start and end). These match the values the `uses.per` schema already documents. |
| `combatRecoveryPlan(actor, periods)` | same | Returns `{update, itemUpdates, recovered[]}`. Item uses whose `per` is in `periods` reset `spent` to 0. Resource pools with a `recovery.on` in `periods` refill to `maxValue`. Feature requirements on recovery use the existing `recoveryAllowed`. |
| `recoverCombatUses(actor, periods)` | `workflow/recovery.mjs` | Active GM only. Applies the plan and returns the names recovered, which go on the turn card. |
| `turnStartPlan` (changed) | `rules/turn-start.mjs` | The per-turn pool refill and the automatic upkeep payment move out, to `combatRecoveryPlan` and the upkeep functions. |

## Concentration upkeep prompt (King's ruling, 2026-11-13)

Every turn, the owner is asked whether to keep each concentration jutsu:
- If chakra covers some of them but not all, the owner chooses which to keep.
- If chakra covers none of them, all of them end automatically.
- Answering never touches the GM's card, so it follows dnd5e ownership rules. The owner's client updates only the owner's own actor, and the card reads the pending state from that actor.

| Function | File | Behaviour |
| --- | --- | --- |
| `upkeepOptions(actor)` | `rules/upkeep.mjs` (pure) | `{jutsu: [{id, name, cost}], cp, noneAffordable}`. The cost is half the cost paid at casting, or 0 for Efficient, as now. `noneAffordable` means the cheapest upkeep with a cost above 0 is more than current CP and nothing is free. |
| `validateUpkeepChoice(options, keepIds)` | same | Kept ids must be pending jutsu, and their total cost must not exceed CP. Throws a readable error otherwise. |
| `beginUpkeep(actor, combat)` | `workflow/upkeep.mjs` | GM, at turn start. If nothing is concentrated, it does nothing. If `noneAffordable`, it ends all of them and notes it on the card. Otherwise it writes `flags.n5e.upkeepPending = {combatId, round, turn, ids}` and puts an Upkeep section on the turn card. |
| `resolveUpkeep(actor, keepIds)` | same | Owner's client. Validates the choice, pays CP, sets `system.combat.concentrating`, clears `concentrationPaid` for the dropped jutsu, and clears `upkeepPending`. Areas, summons and dependent effects of dropped jutsu end through the existing hooks. |
| `renderUpkeep(message, html)` | same | Shown to owners only, while `upkeepPending` matches this turn. One checkbox per jutsu, a live CP total, and Confirm. Choices that cost more than current CP are disabled as you tick. |
| `finishUpkeep(actor)` | same | GM, at turn end, for an unanswered prompt. The default depends on Q1. |
| `autoUpkeep` | `config/rules.mjs` | Optional world rule (Q2): maintain NPC concentration automatically while chakra allows, so the GM isn't asked for every NPC. |

## Tests (`tests/turn-engine.test.mjs`)

- Forward-only: driving the `N5eCombat` methods forward runs each pipeline once; going backward through `_onUpdate` paths runs nothing.
- `combatRecoveryPlan` for turn, round and encounter, covering both item uses and pools, and a recovery that has a feature requirement.
- `upkeepOptions` and `validateUpkeepChoice`: all affordable, some affordable (choose), none affordable (all end), Efficient (0 cost), and over-budget choices rejected.
- The pending flag cycle: begin, resolve by the owner, and the turn-end default.
- Existing turn tests are rewritten from the old hooks to the pipelines.

## Docs updated at the end

The `turn.mjs` header, `RULES_MAP.md` rows plus removing R4–R6 from Known gaps, `DATA_REFERENCE.md` (`flags.n5e.upkeepPending`), the module index, the plan status table, the Codex ledger, and N5e-Context.md.

## Questions for King

- Q1. **Answered:** an unanswered upkeep prompt ends those jutsu at the end of the turn.
- Q2. **Answered:** NPC upkeep is automatic by default. The world rule `npcUpkeep` offers Automatic, Ask the GM each turn, or Manual tracking.

## Final results

_(filled in after release)_
