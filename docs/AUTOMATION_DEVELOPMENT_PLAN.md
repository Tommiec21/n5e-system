# N5e automation development plan

Prepared November 9, 2026 against N5e 0.12.0-alpha.2. This is a proposed implementation plan, not an implementation or a claim of runtime compatibility. No installed system, modules, worlds, or actors were changed.

## Direction and boundaries

Extend N5e's existing rules, effect documents, activities, damage application, and settings. Add reusable services around them instead of introducing a second combat engine. Build N5e equivalents of the requested Midi/DAE capabilities; do not promise compatibility with their flags, macros, or internal APIs. Retain LibWrapper as an optional integration tool where needed, rather than recreating it.

The expanded editor targets the authoring scope of DAE: searchable typed fields, modes, priorities, formulas, conditions, stacking, transfer/suppression, durations, event expiration, scripts, and integration controls. It does not imply immediate support for every D&D-specific key, external module integration, or DAE script. Publish a supported-capability matrix.

## Least to most expensive

Relative estimates cover design, implementation, migration, tests, and live verification. Points express comparative scope, not hours or delivery promises. Shared foundations are accounted for separately below; later feature estimates assume those foundations exist. Ranges reflect unresolved mechanics and integration scope.

| Rank | Requested capability | Relative points | Why |
| --- | --- | ---: | --- |
| 1 | Automatic hit resolution | 3–5 | Existing rolls and defenses; needs per-target results and clear outcome rules. |
| 2 | Event-based expiration | 5–8 | Extends existing turn cleanup once a shared event contract exists. |
| 3 | Automatic save-to-damage option | 5–8 | Reuses save and damage rules; must retain individual outcomes and apply once. |
| 4 | Wider conditional bonuses and options window | 8–13 | Existing predicates/toggles; broader facts, source explanations, permissions and UI. |
| 5 | Dynamic formulas engine | 8–13 | Shared expression parsing, validation, evaluation timing and dependency handling. |
| 6 | Token appearance integrations | 8–13 | Native lighting/vision/appearance provider first; restore and overlapping effects add complexity. |
| 7 | Effect editor expansion | 13–21 | Broad accessible authoring UI, validation, previews, presets and migrations across several engines. |
| 8 | Effect macros | 13–21 | Script lifecycle, authority, error containment, recursion limits and diagnostics. |
| 9 | Range, walls and cover | 13–21 | Geometry, grid modes, token footprints, elevation and ambiguous cover rulings. |
| 10 | Multiplayer coordination | 21–34 | GM authority, concurrent commands, acknowledgments, replay protection, recovery and partial failure. |
| 11 | Reactive ability resolution | 21–34 | Pausable workflows, private information, eligible responders, nested reactions and changed targets. |

Tied bands are approximate; adjacent rankings may change after prototypes. Arbitrary third-party token providers or DAE-wide ecosystem parity could exceed these bands. No total calendar estimate is credible before the foundational prototypes.

## Shared foundations and proposed boundaries

Use the current separation between pure `module/rules/`, mutating `module/workflow/`, and UI `module/applications/`. New directories below are proposals.

- `module/automation/contracts.mjs`: versioned command, event, workflow, target-result and receipt structures; runtime validation.
- `module/automation/policy.mjs`: one resolver for world settings, permitted actor/item overrides, and manual/assisted/automatic modes.
- `module/automation/events.mjs`: stable lifecycle events, correlation IDs and documented ordering. Announcing an event must not itself apply damage.
- `module/automation/coordinator.mjs`: authority routing and durable command/receipt state; reuse and extend the existing socket boundary and local command queues.
- `module/automation/workflow.mjs`: explicit state transitions, pending choices, cancellation, reaction pauses and recoverable failures.
- `module/rules/resolution/`: pure hit, save and per-target outcome planners calling existing rules.
- `module/rules/formulas/` and `module/rules/elements.mjs`: formula services and extended predicates; no dependency on sheet classes.
- `module/effects/lifecycle.mjs`: subscriptions, expiration, applied-effect identity and cleanup.
- `module/integrations/token-appearance/`: optional provider interface; core functionality works without external modules.
- `module/applications/automation/` and existing effect editor: settings, previews, review cards and diagnostics.

A shared transaction context carries workflow ID, source actor/item, authority epoch, target token UUIDs, underlying actor UUIDs, scene/combat reference, policy snapshot, and source revision. A target record carries attack/save results, defenses, modifiers, reactions, damage plan and application receipt. Preserve distinct token identities while preventing unintended repeated writes to the same linked actor. Define explicitly when multiple tokens of one actor represent separate legal hits.

States: draft → validated → targets confirmed → roll resolution → reaction window(s) → application review → committed → complete. Cancellation, expired input and recoverable failure are explicit states. Reaction timings can add windows at defined points rather than assuming all reactions happen after rolling.

Contracts and observability are a separate initial foundation budget of approximately 8–13 points. Avoid adding feature bands as if this shared work were repeated for every feature.

## Implementation order and release gates

### Stage 0 — Baseline and contracts

Record the current verification baseline; preserve existing behavior and representative actors/items. Write workflow contracts, a capability registry, policy defaults, source-labelled diagnostics and a small test-world fixture set. Audit exported APIs before changing call sites.

Controls live in one Automation Options window: Combat, Reactions, Targeting, Bonuses, Effects, Formulas, Macros, Appearance and Diagnostics. World settings are GM-controlled; player overrides can only reduce automation or choose options explicitly allowed by the GM. Item overrides inherit by default and cannot bypass ownership, rule constraints or disabled capabilities.

Gate: all existing checks pass, automation off reproduces current behavior, optional integrations absent cause no errors.

### Stage 1 — Multiplayer authority first

Extend the existing `module/socket.mjs` request boundary. It already supports selected GM-reviewed requests; do not replace it with a generic client-supplied document mutation endpoint. The receiving authority re-resolves actor/item/target references and recomputes valid operations from current data.

Use the active GM as the initial authority for coordinated combat mutations. With no GM available, retain manual owner actions but disable coordinated automatic commits. The current system socket does not authenticate arbitrary sender claims: keep receiver-side GM approval for remote privileged commands, or introduce a separately verified identity transport before allowing unattended requests. Never authorize from a claimed user ID alone. Cosmetic wrappers and LibWrapper do not solve transport authority.

Add command IDs, bounded replay protection, explicit acknowledgments, deterministic actor ordering, expected revisions and durable receipts. Pilot validation, timeout, reconnect, duplicate clicks, two GMs, GM handover and GM loss. Do not automatically retry a mutation whose completion is unknown; reconcile its receipt first. Foundry document updates are not database transactions across actors: record partial success and offer explicit recovery rather than claiming atomic rollback.

Gate: duplicate requests cannot spend resources twice; a stale or unauthorized request cannot commit. A crash or GM handover leaves a visible, recoverable state. Distributed exactly-once execution is not assumed.

### Stage 2 — Hit and save resolution

Automatic hits: evaluate a single stored attack roll against each target's current applicable defense, critical/fumble rules and reviewed overrides. Preserve per-target modifiers. State whether defenses are snapshotted at the roll or recomputed after an intervening reaction. Use one documented policy so rerendering chat never rerolls or changes an outcome.

Automatic save-to-damage: collect and store defender saves, normalize ordinary and four-tier outcomes, and generate target-specific damage plans. Preserve N5e's existing rounding and defense order. Explicitly author unsupported save outcomes; do not guess from prose. By default share the source damage roll where rules call for it, while allowing authored exceptions. Costs are paid once per action, not once per target. Unresolved saves remain pending, with a configurable GM decision on timeout.

Controls: hit Off / Display outcome / Review; save-to-damage Off / GM review / Automatic commit. Automatic commit is only available when coordination requirements are met. Keep current apply buttons available for manual workflows but prevent them from duplicating an already committed automated application.

Gate: mixed hit/miss/critical targets, mixed saves, immunity, resistance, DR, temporary pools, chakra damage, concentration and cancellation match existing N5e rules. Undo detects intervening state changes; it must not silently restore an old snapshot over later damage.

### Stage 3 — Event lifecycle and expiration

Emit events for attack attempted/resolved, hit/miss, save resolved, damage applied, item used, condition changed, concentration ended and turn boundaries. Specify source/target perspective, success/cancellation semantics and event ordering. Store a correlation key so the same operation does not expire an effect twice.

Expiration rules support source or target turns, next qualifying event, event counts, matching activity/keyword, optional condition, and delete versus disable. Define whether the triggering action receives the expiring bonus before it is consumed. Keep time-based cleanup and reconcile missed events after reconnect when a recorded receipt permits it. Do not replay arbitrary macros during reconciliation.

Gate: cancelled actions do not consume a next-hit benefit; unrelated actors' events do not expire it; multiple targets and duplicate event delivery behave deterministically.

### Stage 4 — Formula and conditional-bonus services

Implement the formula evaluator before allowing formula-driven bonuses throughout the UI. Use a parsed, restricted expression language; do not use `eval` or unrestricted JavaScript for formulas. Support reviewed actor/item/target references, arithmetic, bounded functions, and Foundry roll expressions at explicit roll-time boundaries. Deterministic derived statistics must not roll dice during data preparation or rerenders.

Validate unknown variables, cycles, invalid types, division by zero and non-finite results. Limit expression size and dependency depth. Distinguish authoring preview, actor preparation, action resolution, and commit-time evaluation; cache only within a valid context. Do not mutate actor state while computing a formula.

Broaden predicates to reviewed facts such as actor/target states, source item, weapon properties, discipline, rank, resource thresholds, distance and outcome. Geometry predicates report unavailable until the geometry provider exists. Missing target facts do not silently match.

The bonus options window shows source, affected roll/stat, predicate, formula/value, active/inactive reason, duration and toggle permissions. Provide per-action choices without permanently editing source effects. Preserve N5e stacking rules and show exactly why a bonus was included or excluded. New stacking rules require an explicit rules decision rather than importing D&D conventions.

Gate: identical contexts produce identical deterministic results; dice resolve once at the intended boundary; bonuses are counted once; two targets can receive different valid modifiers; disabled rules preserve existing behavior.

### Stage 5 — Range, walls and cover

Build a geometry-provider interface returning distance, visibility/blocking, cover candidate, confidence and explanation. Start with reviewed planar distance and walls on a gridded scene. Expand to gridless/hex scenes, large footprints and elevation as separately tested capabilities. Unsupported geometry requires manual review rather than silently declaring a clear shot.

Separate measurement from rules. Define origin/target sampling, diagonals, units, reach, thrown/long range, self-origin areas and terrain/wall treatment. Decide whether range is evaluated at declaration or after movement/reactions. Cover geometry proposes a category; N5e rules determine its actual modifier. Do not invent D&D cover bonuses for N5e. Allow GM overrides with a visible reason and an exact set of affected rolls.

Controls independently set range, wall blocking and cover to Off / Warn / Enforce. Optional third-party geometry providers are version/capability-checked and isolated. Do not maintain separate conflicting cover modifiers in the provider and N5e rule engine.

Gate: corners, doors, rotated templates, token sizes, boundary cases, scene units and unavailable providers have explicit expected results and GM override behavior.

### Stage 6 — Token appearance

Deliver a core provider first for supported token tint, opacity, scale, light and vision settings; add third-party integrations individually later. Declare token-local versus actor-wide application and preview affected tokens.

Store effect ownership and the previous appearance as a layered override ledger. Define precedence across overlapping effects. Removal restores the next valid layer or the underlying value; it must not overwrite a GM's later edit. Handle deleted source items, removed tokens, reconnect and scene changes. Limit privileged vision changes to GM-authorized operations.

Gate: overlapping effects, manual token edits, linked/unlinked tokens and disabled/missing external modules restore correctly. Do not claim universal integration with all visual modules.

### Stage 7 — Expanded effect editor

Deliver incrementally: first searchable typed fields and explanations; then formulas, conditional rules, stacking/transfer, timing/event rules, macro bindings and appearance providers as their services become available. A disabled feature remains visible as unavailable with an explanation, not an inert checkbox claiming support.

Include a raw-data view for advanced authors, presets, source preview, validation errors, affected-stat before/after preview, timing trace, and safe duplicate/export/import. Existing effects open without rewriting their data. Save only valid changes; preserve unknown legacy fields until they can be reviewed. Do not promise automatic DAE import in this stage.

Gate: round-trip editing preserves existing effects; cancellation makes no writes; invalid formulas and unsupported fields are explained; keyboard navigation and long forms work in Foundry. Maintain an explicit DAE-capability comparison checklist.

### Stage 8 — Effect macros

Add opt-in bindings for apply, remove, enable/disable, qualifying event and supported turn ticks. Separate read-only notifications from macros requesting game mutations. Default arbitrary scripts off; only the GM can approve/create executable bindings. Resolve context through a documented API, not arbitrary client payloads. Existing foreign Midi/DAE script flags stay inert.

Offer structured automation actions first. Arbitrary JavaScript is a separate advanced mode: it runs with Foundry client privileges and is not a security sandbox. Worker isolation, if explored later, cannot transparently expose live Foundry documents. Cooperative timeouts do not stop synchronous infinite loops; therefore do not claim they make arbitrary scripts safe. Add async budgets where enforceable, recursion/event-depth guards, failure logs, and an emergency disable switch. Prevent a macro error from silently duplicating committed damage. Script-authored document changes cannot be assumed fully undoable.

Gate: ownership violations, nested events, cancellation, exceptions, repeated delivery and disabled macros behave predictably; trusted scripts run only at their documented execution location.

### Stage 9 — Reactive abilities

Use the established workflow, authority, events, predicates and geometry. Start with one reviewed defensive reaction and one interceptor/redirector. Author eligibility, timing, costs, target changes, modifiers, priority and once-per-turn limits as data where practical.

Pause at defined windows such as before attack, after a hit is determined, before a save, or before damage commit. Request decisions only from eligible responders; reserve resources without spending them until acceptance is validated. Support accept/decline/timeout, multiple eligible actors, lost connections and changed eligibility. Re-evaluate affected outcomes after a reaction without rerolling unrelated work. Bound reaction nesting and detect loops. No automatic reaction selection by default.

Controls: Disabled / Ask eligible owner / GM-managed, with optional reviewed auto-use policies later. Timeout defaults to decline or GM decision, never silently spending a player's resource. Hide unrevealed defenses and secret rolls from other clients. Manual late reactions require an explicit adjustment flow rather than replaying a committed action.

Gate: simultaneous responders, stale resources, redirection, extra damage prevention, concentration, nested reactions and authority handover cannot duplicate costs or mutate unauthorized targets.

## Compatibility and regression strategy

1. Keep canonical N5e data and calculation order. Add versioned schemas and migrations; retain legacy activity/effect readers during transition. Do not overwrite imported content or reintroduce retired Clan Feats.
2. Route legacy buttons and new automated actions through the same planners and validated mutation commands. Shared rules must never be duplicated between chat cards and automatic workflows.
3. Use supported Foundry extension points. Do not change system identity, fabricate D&D globals, monkey-patch dependency internals, or require Midi/DAE. Use optional LibWrapper only where a justified integration needs wrapping.
4. Publish a version/capability matrix for optional modules. Missing or unsupported providers disable only their integration, not the character sheet or combat engine. Initially certify a small chosen set; never promise every module combination.
5. Begin every release with lint, unit/integration checks and existing regressions. Add focused tests for new rules and failure paths. Test off/assisted/automatic modes, class/background/clan progression, manual casting, ranked conditions, rest, inventory and existing effect behavior.
6. Live gates use a disposable Foundry 13 world with an active GM, two player clients, linked/unlinked tokens, multiple targets, synthetic actors, module-disabled baseline, and selected module combinations. Capture reproducible fixtures, errors and permission behavior.
7. Release one bounded capability at a time behind opt-in settings, with migration notes, backups and an identifiable rollback package. Backups are required before data migrations; rolling back code alone does not reverse a schema migration.

No process can guarantee that nothing will break. Small releases, shared rules, explicit contracts, disabled-by-default automation and regression evidence make changes reviewable and limit the effect of failures.

## Completion standard and immediate next step

Each stage ends with implemented contracts, documented behavior, passing relevant checks, live test evidence, updated capability matrix, and a packaged release. Unsupported behavior is reported clearly; a settings checkbox alone is not completion.

Confirmed proposed path: baseline/contracts → multiplayer authority → hits/saves → event lifecycle → formulas/conditional controls → geometry → appearance → editor completion → macros → reactions. Editor foundations can appear earlier, but advanced tabs follow their working engines. This order differs deliberately from cost ranking to avoid building automation on unreliable coordination.

Next implementation increment is Stage 0 followed by the narrow Stage 1 pilot: coordinate a single validated activity command and resource spend, prove duplicate/reconnect behavior, then connect automatic hit resolution. No production implementation is included in this planning task.

## Inspected implementation anchors

- `module/workflow/commands.mjs`: local queues; explicitly not cross-client transactions.
- `module/socket.mjs`: existing validated, GM-reviewed privileged requests and replay cache.
- `module/workflow/activity-execution.mjs`: activity boundary, cancellation/refund and lifecycle hooks.
- `module/workflow/attack.mjs`, `activity-buttons.mjs`, `apply-damage.mjs`: rolls, saves and current assisted application.
- `module/rules/elements.mjs`, `change-keys.mjs`: predicates, toggles and current effect modifier catalog.
- `module/documents/actor.mjs`, `active-effect.mjs`: preparation order, effect suppression and condition behavior.
- `module/workflow/areas.mjs`, `trackers.mjs`: area lifetime and existing source-turn cleanup.
- `module/applications/effect/effect-config.mjs`: existing core editor extension.
- `module/rules-settings.mjs`: centralized optional-rule access and defaults.
