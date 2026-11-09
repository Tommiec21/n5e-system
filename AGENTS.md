# N5e agent coordination

Read `docs/CODEX_CONTEXT.md`, `docs/MULTIPLAYER.md`, `docs/MAINTENANCE.md`, the changelog and the affected implementation before changing this system. The Codex context records completed imports, explicit user reversals, current batch ownership and publishing status. Older plans are not evidence that work remains undone.

Do not duplicate an active batch or replace shared planners with a parallel rules engine. Check current ownership and source before claiming work; coordinate overlapping edits with the user. Ownership applies only to the named active scope, not permanently to the repository. Preserve unrelated agents' changes and released content IDs. Never restore the removed Clan Feats.

Update context after each development batch; publish a GitHub release before starting the next batch. Local Foundry installation is not authorized by that publishing instruction. Record implemented, automated-tested, live-tested and published status separately. Ask the user about ambiguous game rulings rather than inventing mechanics. Routine code/test-case design is delegated to the implementing agent.

Run relevant focused regressions and `npm run verify` before release. Report unavailable live tests and pre-existing skips. Do not claim authentication, sandboxing, atomic transactions or exactly-once execution without evidence.
