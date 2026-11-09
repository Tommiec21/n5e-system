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
