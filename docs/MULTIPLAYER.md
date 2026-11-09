# Multiplayer batches

## MP1: existing privileged relay receipts

This batch hardens the existing remote effects/ration relay. It does not coordinate all combat actions, authenticate system-socket senders, implement reactive abilities, or provide cross-document atomic transactions. Local owned-actor actions retain their current behavior. No new dependency is required.

Remote effects/ration requests always require the active GM's review, by the user's instruction. Before applying, the active GM persists a reviewing receipt, then an applying intent. Completion persists a committed receipt. Duplicates with the same ID/content return the stored result; changed content under that ID is rejected. Concurrent requests queue on the GM. A reload/handover with an unfinished intent blocks replay until a GM examines the outcome. Never assume a timeout means nothing happened. Do not resubmit uncertain actions under a new ID.

Receipts contain request type, ID, content fingerprint, state and timestamps; they do not persist full actor payloads. The hidden world setting is `requestReceipts`. Request epochs ensure archived packets cannot execute again. History stops accepting remote requests at 200 records instead of silently discarding replay protection.

GM inspection: `game.n5e.api.requestHistory()`. After checking every uncertain target and reconciling any partial changes, use `await game.n5e.api.archiveRequestHistory({reconciled: true})`. The confirmation triggers a JSON download and advances the epoch. Keep the downloaded archive. The browser starting a download is not proof the file has been saved; save it before relying on the archive. Old pending packets are refused after rotation. Local/manual play remains available while a GM reconciles history.

Reconciliation currently uses this explicit API, not a polished recovery window. Receipt replay protection applies to the same request identity within the world/epoch; it cannot identify two independently authored requests that mean the same action. A newly elected GM cannot atomically cancel an already in-flight Foundry document write from the former GM. Write-ahead intents expose that uncertainty rather than claiming exactly-once execution.

Socket replies do not authenticate a sender. They acknowledge the existing flow and never authorize a privileged receiver operation. Future combat/reaction code must verify durable authoritative results and preserve GM review rather than trusting a claimed user ID or bare reply. Sender authentication, automatic player-to-GM commits, a coordinated resource-spend pilot and reactive prompts remain later batches.

## Verification

Automated coverage: simultaneous duplicate submissions, stored replies across coordinator instances, mismatched request content, declined requests, authority loss during review, partial mutations, failure to persist completion, invalid JSON, unavailable storage, full history and obsolete epochs. Existing activity/resource regression tests remain enabled. Live GM/two-player testing is not yet performed; do not describe this alpha as certified multiplayer-ready.

Use a disposable Foundry13 world to test GM review, double delivery, effect creation, ration spending, browser reload while reviewing/applying, active GM changes, lost acknowledgment, receipt inspection and epoch rotation. Check character/clan/background progression and manual casting remain unchanged. Never test interrupted writes against campaign actors.

## Confirmed reactive policy for the next batches

Ask eligible players to accept or decline; the GM resolves unanswered prompts. Default handoff after 60 seconds, configurable in seconds, with 0 disabling the timer. Test-case selection is delegated to Codex; ambiguous game rulings still require the user's answer. No automatic reaction expenditure or acceptance.

## RX1: private reaction decision windows

Enable **N5e Rules → Casting and combat → Reaction decision windows (pilot)**. It defaults off. **Reaction player timeout (seconds)** defaults to 60; 0 disables the timer, and any finite nonnegative supported seconds value can be set. The GM can resolve a window early; an elapsed timer hands it to the GM without selecting an answer or spending a resource. Existing windows preserve their original deadline when settings change.

The active GM opens a window with `await game.n5e.api.openReactionWindow(actor, ownedItem, {trigger: "Describe the opportunity"})`. Only connected owners and GMs receive the private card. Eligible owners receive an accept/decline dialog; closing it leaves the window unanswered. Player socket responses are advisory and require the active GM to confirm the choice with the player. They do not prove sender identity. GM controls remain on the card. No effect, damage, reaction allowance or pool is spent in this batch. Accept means accepted for later validated resolution, not mechanically applied.

The active GM resumes persisted deadlines on startup and user updates. A decision cannot be overwritten after resolution. Deleted abilities are rejected on final decision. Prompt text must not include hidden rolls or private defenses; the caller supplies only public opportunity text. Feature-specific visibility, cost/eligibility, damage math and suspended combat continuation are later batches. Uncanny Dodge cannot be enabled until automated visibility is available, by user direction.

Automated tests cover configurable/disabled timing, GM-only handoff, immutable/terminal state, eligible owners, private recipients, mandatory response review and no resource mutation. Actual multi-client dialogs, GM handover and browser timer behavior still require live test-world validation.

## MATH1: prerequisite arithmetic rules

User rulings November9: addition/subtraction precedes multiplication/division; halving and doubling cancel to normal damage; identical multiplier sources do not stack. Numeric derived formulas now use a bounded parser with this precedence and explicit parentheses. Examples: `10 - 2 * 3 = 24`; `10 - (2 * 3) = 4`. Missing references retain the existing fallback-to-zero contract; invalid numeric formulas return their fallback. No JavaScript evaluation is used by the numeric evaluator.

The damage planner now performs flat DR subtraction before half/double modifiers and combines those modifiers with resistance/vulnerability without repeated halving/doubling. Immunity retains priority; Piercing immunity-as-resistance is not ignored. Existing DR-once and source exemptions are preserved. This is a rules correction, not a toggle: existing formulas containing mixed ungrouped operators may change their derived totals under the user's ruling. Audit custom formulas and add explicit grouping if intended.

Scope warning: Foundry dice-roll expressions still use their existing parsing. Converting every complex dice syntax to N5e precedence requires a separate roll-expression adapter; this batch changes numeric derived formulas and damage-stage math only. Do not claim global dice precedence is complete. Deflection and Uncanny Dodge are not automatically resolved by this batch. Live test-world validation remains outstanding.

## RX2: coordinated GM damage and base Deflection

Opt in to **Coordinated GM damage and base Deflection (pilot)** and **Reaction decision windows**. The active GM applies damage from the existing damage-card buttons to controlled tokens. Each source-card/actor identity can commit once; repeating the card replays its receipt. A different half/full/double choice under the same identity is refused rather than applying twice. A shared linked actor is deduplicated. Multi-target commands record each actor separately; partial completion is possible and must be reconciled.

Base Weapon Specialist Deflection is offered in active combat when the owned Discipline feature, sufficient pool and unused reaction are present. Unconscious/incapacitated/stunned/dead creatures and DR-exempt damage do not get an offer. The owner chooses; the GM reviews unauthenticated responses. Declining still allows the GM's damage application. Acceptance rechecks the combat turn, ability, resource and reaction allowance, rolls 1/2/3 d12 at class levels 1/11/20, and combines resource spending, reaction usage and HP/CP changes in one actor update. Authority/revision changes stop automatic continuation. Interrupted or uncertain requests require receipt reconciliation; they are not blindly retried.

User rulings: Deflection is rolled DR and follows DR rules, including Pierce and exemptions. Static plus rolled DR protects HP and CP independently. Multiple types sharing HP consume one budget in the damaged creature's chosen order. The application dialog records that order; when the GM operates it, ask the creature's player for the choice and enter it. Cancelling/invalid allocation leaves that target unapplied. The pure planner exposes `requiresDROrder` when a preview still needs a choice; external callers must not treat that preview as a committed result. Source order is only a provisional preview.

The coordinated pilot disables the legacy snapshot Undo button because restoring stale HP alone would not safely reverse a reaction, roll and resource cost. Corrections require explicit GM reconciliation. This does not remove Undo from the default manual workflow. A duplicate receipt is not an invitation to reapply damage after undo; use a new reviewed action for intentional repeats.

Limits: base Deflection only. Advanced Flurry Techniques/Defensive Draw redirect or reaction-free variants need their own adapters; they are not inferred. Uncanny Dodge remains excluded until observer-specific automated visibility is implemented, as instructed. No automatic hit/save workflow, reactive redirection, unattended player commits, authenticated transport or atomic multi-actor transaction is claimed. Complex dice precedence adapter and live multi-client verification remain outstanding. No local Foundry installation was changed.

The GM recovery window is available in Configure Settings → N5e Automation Recovery → Review automation requests. It lists receipts, links recorded actors and provides explicit export/archive. New receipts retain actor/source UUIDs, not full effect payloads. Positive socket acknowledgments are now checked against a matching committed world receipt; a bare forged success reply does not authorize the caller to continue. Declines remain conservative failures.

