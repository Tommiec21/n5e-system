# N5e Codex Context

Updated November 9, 2026. This is the separate context file the user authorized when the original OneDrive N5e-Context.md could not be written. Read the current snapshot and coordination rules before the historical ledger. The original was preserved.

Current release: 0.13.0-alpha.14 published: all 968 Jiraiya jutsu in core, organized Discipline / Group / Rank. GitHub only; local installation unchanged.

Current stage: JUTSU1 published; 285 automated tests passed, 2 skipped. Complex clauses remain manual; no live verification. User acceptance remains.

## 13. Codex implementation ledger and agent coordination

Updated 2026-11-09. Maintainer for this section: Codex, chat workspace `C:\Users\Tommi\Documents\Codex\2026-11-08\i-currently-have-some-tasks-running`. This section records implementation evidence and the user's current instructions. It does not change King's game rules or lock draft game content.

### 13.1 Read-before-edit and duplication prevention

- Read this section, Section 12, the current repository changelog, and the affected code before proposing or repeating work. Historical next steps in Section 12 are superseded only where this ledger records newer completed work or the user gives a newer instruction.
- Reuse existing builders, stable document IDs, rule planners, mutation services and extension APIs. Do not rebuild a parallel system, import the same content a second time, change released IDs, or regenerate a legacy limited content slice over newer expansions.
- Before starting a batch, record its owner, scope, paths, status and evidence here. Check the current source and GitHub head; a claimed task is coordination information, not proof that code is implemented.
- Active ownership is limited to the named batch. Other agents should work on disjoint tasks; coordinate with the owner/user before editing the same files. If an owner is unavailable or a claim appears stale, ask the user before taking it over. This is not a permanent exclusive lock on the project.
- Never mark a plan, schema, checkbox or packaged build as a completed gameplay system. Record implemented, tested, published, locally installed and live-verified statuses separately. Include test skips and limitations.
- Update this ledger after each batch and before publication; append release results afterward. Preserve other agents' entries. Back up the context file, verify its current hash before writing, and merge concurrent changes rather than overwriting them.
- User's 2026-11-09 delivery instruction: complete development in consecutive batches; update context, publish a GitHub release, then start the next batch. **Production means GitHub release only. Do not install into local Foundry unless separately authorized.**
- Ask the user about unclear gameplay mechanics, scope, integrations, or permissions. Do not invent missing rules. Routine implementation choices may follow the approved architecture; unresolved policy decisions must remain pending rather than becoming hidden defaults.

### 13.2 Authoritative locations and evidence

- Working source: `C:\Users\Tommi\Documents\Codex\2026-11-08\i-currently-have-some-tasks-running\work\n5e-system`.
- GitHub: `https://github.com/Tommiec21/n5e-system`. Verify current head before updating; do not overwrite another agent's remote changes.
- Installed system: `C:\FoundryData\Data\systems\n5e`. Last verified local installation: **0.12.0-alpha.2**, independent of the current GitHub version.
- User source KB: `C:\Users\Tommi\OneDrive\Documents\ContextFile\N5e-Rules-KB`.
- User-facing reports/packages: workspace `outputs`. Earlier release artifacts are historical and can contain subsequently removed content; use the latest approved release and current importer behavior.
- Original `n5e-system-build` directory is not automatically the active working checkout; compare versions before using it.

### 13.3 Completed work and retained limitations

**Continuation and automation framework (0.9.3-alpha.1):** recovered published source at 0.9.2; implemented contextual predicates/numeric modifiers, source-labelled roll breakdowns, toggles, save-tier shifts and authored outcome text, temporary typed weapon coatings, GM summon/clone placement from world Actor templates and lifetime cleanup. Published GitHub release at `https://github.com/Tommiec21/n5e-system/releases/tag/v0.9.3-alpha.1`; remote tree matched tested local tree. 156 tests passed, two missing original migration fixtures skipped. Source/chat recovery could not recover Claude's unsaved edits. Summon math/command behavior is authored, not inferred; tier effects still require supported application. See `outputs/START-HERE.md` and `Automation-framework-guide.md`.

**Rules-window diagnosis, codebase audit and maintenance:** maintenance work addressed shared resource/healing/command boundaries, activity schema and turn limits, dynamic registries, GM-reviewed privileged requests, migration recovery/repair, and shared CI/release gates. Published 0.10.0-alpha.1 at `https://github.com/Tommiec21/n5e-system/releases/tag/v0.10.0-alpha.1`; 170 passed, two original fixture tests skipped. The optional `game.n5e.api.runSmokeTests()` exists; it is not proof that the user's world was tested. Local actor queues do not provide distributed transactions. See `outputs/Maintenance-update.md`, `N5e-maintenance-guide.md`, repository `docs/MAINTENANCE.md` and changelog. Earlier 0.9.3-alpha.2 corrective artifacts remain historical; consult their changelog before claiming specific fixes.

**Character sheet design audit/prototype:** reviewed N5e tabs and source, compared Ars Magica, Daggerheart, Draw Steel, D&D, Lancer, Nimble, PF2e, Sword World, plus official SW5e sources because SW5e was absent locally. Revised an initially over-spacious proposal after user feedback. Saved optional prototype `C:\Users\Tommi\.codex\visualizations\2026\11\08\01a1bc98-e46c-7ae0-a7b1-88142212b7db\n5e-shinobi-sheet.html`. It is an optional design concept, not the implemented production sheet. See `outputs/N5e-character-sheet-design-review.md`.

**Backgrounds (0.10.1-alpha.1, locally installed):** all 16 Chapter 3 backgrounds built directly into N5e, not a module. Organizational hierarchy Backgrounds → background → Features/Starting Equipment. Deterministic IDs; skill/toolkit/equipment/general-or-skill feat choices, duplicate replacements, cancellation and origin-tagged replacement. No background ASI. Equipment manifest and textual prerequisites retain manual review where noted. Builder `tools/content/build-backgrounds.mjs`; see `outputs/N5e-backgrounds-build-notes.md`.

**Classes (0.11.0-alpha.1, locally installed):** seven supported classes expanded through level 20: Genjutsu Specialist, Hunter-Nin, Medical-Nin, Ninjutsu Specialist, Scout-Nin, Taijutsu Specialist and Weapon Specialist. 42 subclasses total; 408 new feature/option records, stable existing IDs, progression links and gating. Excluded per user: Puppet Nin/Puppet Master, Cooking Nin, Science Nin, Intelligence Operative, and legacy Taijutsu section. 183 passed, two pre-existing skips. Node builder executed; modified legacy Python entry point not executed because Python was unavailable. Source `_source/classes/orochimaru-full.md`. See `outputs/N5e-class-import-completion.md`, verification and inventory; builder `tools/content/build-class-expansion.mjs`.

**Clans (0.12.0-alpha.1 then 0.12.0-alpha.2, locally installed):** six consecutive batches imported all **44 actual source-roster packages**, including Non-Clan; older KB summary's 48 does not match the roster. 266 level-feature headings, 408 Hijutsu, 371 option/reference records, 19 optional mutations, 577 distinct latent records representing 582 source rows, 26 stance records and companion rule profiles. Nation → clan → section hierarchy; Uchiha ID preserved. Added clan setup, branches, progression, own-clan Hijutsu restrictions, selected counters, uncapped ranked-condition support and replacement rollback. Complex effects, optional mutations, some choices, latent point budgets and companions remain manual/reference-based; no claim of complete automation or ready NPC companions.

**Important reversal — Clan Feats:** user explicitly removed all 147 standalone Clan Feats because their rules/tables are being revised. 0.12.0-alpha.2 removed the documents/empty folders and disabled their importer. Do not restore from historical ZIPs, source snapshots or old scripts. Existing actor-owned copies were not edited. The user did not authorize deleting other clan content or redesigning the latent tables. Builder `tools/content/build-clans.mjs`; latest clan release validation 195 passed, two skips, zero failures; files hash-verified after local installation. See `outputs/N5e-clan-import-completion.md`. Local backups are under workspace `work/backups`.

**Module compatibility research:** inspected installed Midi13.0.64, DAE13.0.29, LibWrapper1.13.5.1, MEJ13.06 and ObjectivesStyles1.0.3, N5e code and primary upstream documentation. Research only; no integration implemented. MEJ optional adapter/Ryo configuration and original V13 objective theme are lowest resistance. Objectives CSS has a likely old-shell selector mismatch pending actual DOM verification. Midi/DAE rely on D&D APIs and cannot work by renaming fields or spoofing system identity. LibWrapper is system-independent infrastructure; do not recreate without demonstrated need. Content conversion and runtime adapters are different tasks; no universal 'most D&D modules' guarantee. See `outputs/N5e-module-compatibility-findings.md`.

**Automation comparison and approved development direction:** N5e already has combat/effect primitives but lacks a full coordinated workflow. Plan saved in `outputs/N5e-automation-development-plan.md`: command authority/receipts, hit/save automation, reactive decisions, geometry, conditional controls, formulas, event expiration, expanded effect editor, macros and token appearance. Plan is not implementation. Keep manual mode, N5e canonical rules, optional integrations, versioned contracts and small tested releases. Arbitrary JavaScript macros are not a sandbox; do not claim otherwise.

### 13.4 Current batch ownership and decisions

- LIVE1 ownership is complete (0.13.0-alpha.7 published). No additional live runs. The isolated server is stopped and temporary license/session copies are removed.
- GitHub releases only; local Foundry remains untouched. Player reaction choices require GM review until authentication is verified.
- Timeout defaults to 60 seconds; editable in seconds; 0 disables. Blindsight qualifies for can-see. No GM-visibility substitute for Uncanny Dodge.
- Addition/subtraction precede multiplication/division. Identical Half/Double sources apply once; opposites cancel. DR independently protects HP/CP; creature chooses type order within each pool. Deflection is rolled DR with those same rules.
- NEW MANDATORY TESTING RULE: From the user's 2026-11-09 instruction onward, at most THREE TOTAL attempts per test/scenario, counting local, CI and harness/setup retries. After TWO failures STOP THE ENTIRE PROCESS, report why, and await the user's direction. Do not reset counts by renaming a test or harness. Prefer focused checks and avoid repeated live setup. No further local/live test runs are scheduled for this batch; CI and release each have one remaining planned verification run.

### 13.5 Batch release ledger

| Batch | Release | State |
| --- | --- | --- |
| MP1 receipt foundation | 0.13.0-alpha.1 | Published; CI/release passed |
| RX1 reaction windows | 0.13.0-alpha.2 | Published; CI/release passed |
| MATH1 numeric/damage precedence | 0.13.0-alpha.3 | Published; CI/release passed |
| RX2 coordinated Deflection/DR | 0.13.0-alpha.4 | Published; CI/release passed |
| VIS1 sight/Uncanny Dodge | 0.13.0-alpha.5 | Published; CI/release passed |
| MATH2 dice grouping | 0.13.0-alpha.6 | Published; CI/release passed |
| LIVE1 verified UI corrections | 0.13.0-alpha.7 | Published; CI/release passed |

### Confirmed continuation decisions — November 9, 2026

This is the separate Codex context file authorized by the user after OneDrive write access failed. Maintain it after every batch. The original OneDrive context was read and backed up, not modified. Test-case selection belongs to Codex; ask the user about ambiguous game rulings. Reaction handoff defaults to 60 seconds, configurable by the GM; 0 disables the timer. Remote privileged requests require GM review until sender authentication is verified. Release target is GitHub only, not the local Foundry installation.


### MP1 completion — prepared for GitHub publication

MP1 implements durable receipts for the existing privileged effects/ration relay, not all combat mutations. Requests persist reviewing/applying/committed states; duplicate IDs replay stored results, changed payloads are rejected, uncertain executions are not retried, and old epochs cannot replay after explicit GM reconciliation/archive. GM review remains mandatory. Added inspection/archive API and documented limits; retained upstream failed-click/save-cost/parser/ration fixes. Version 0.13.0-alpha.1 packaged. Verification: 203 passed, 2 pre-existing skips, zero failures; lint and consistency checks passed. Live GM/two-player testing has not been performed. Local Foundry remains 0.12.0-alpha.2 and was not changed.

GitHub publication pending. MP1 owner remains Codex until release verification. Next batch: reactive decision windows and configurable 60-second/disabled handoff, with GM review for unauthenticated player responses. No ability effect or resource is to be inferred from a response alone. The source reconciliation preserved upstream fixes except the explicitly rejected unauthenticated automatic-request behavior.

### MP1 published — 2026-11-09

MP1 is published as https://github.com/Tommiec21/n5e-system/releases/tag/v0.13.0-alpha.1, source commit f662c0df21de8ecc5e0f9caf8075adfeaa0419a5. GitHub CI and Release workflows both succeeded. MP1 ownership is complete for its documented relay-only scope. Live multiplayer validation remains outstanding. Next active batch RX1: reaction decision windows, GM handoff and configurable timer; exact damage modifier ordering/visibility rulings have been asked and are pending. Do not duplicate RX1.


### Locked user ruling — arithmetic precedence

2026-11-09: N5e arithmetic always evaluates Addition/Subtraction first, then Multiplication/Division. This supersedes conventional operator precedence for N5e expressions. The existing formula engine has not been audited or changed to implement this ruling yet. Future formulas/reaction math must respect it; do not silently rely on JavaScript/Foundry default precedence. Explicit damage-stage and rounding interactions still need checking against source/user rulings.


### RX1 completed — publication pending

Version 0.13.0-alpha.2: opt-in private reaction prompts to eligible connected owners; GM-reviewed advisory responses; persisted terminal decisions; source ability recheck; 60-second default, configurable nonnegative seconds, 0 disables; elapsed time hands unanswered prompts to GM with no auto-answer/cost. Verified 207 passed, 2 existing skips, lint/schema checks passed. No live Foundry validation. API/manual pilot only: no ability effect or resource consumption and no automatic combat suspension yet. User requires automated visibility before Uncanny Dodge eligibility. Next prerequisites: arithmetic precedence and automatic visibility, while full damage modifier choice ruling is pending.


### RX1 published and next prerequisite batch

RX1 published: https://github.com/Tommiec21/n5e-system/releases/tag/v0.13.0-alpha.2; commit 69171b19f4805854b5ef288beb92c2d772f7f7dc; n5e.zip and system.json verified present. Next active scope: MATH1, numeric expression precedence and damage multiplier ordering/cancellation, required before reactive damage. User ruling: halving and doubling cancel to normal damage; identical multiplier sources apply only once. No manual visibility override for Uncanny Dodge; wait for automated visibility.


### MATH1 completed — publication pending

Version 0.13.0-alpha.3: bounded numeric parser with addition/subtraction before multiplication/division and explicit parentheses; flat damage subtraction before multipliers; identical Half/Double sources apply once, opposite Half/Double cancel. Immunity priority preserved. 210 passed, 2 existing skips, zero failures, lint/schema checks passed. Complex dice expressions still use Foundry parsing and need a later adapter. No arbitrary JavaScript numeric evaluation. RX1 GitHub CI and Release confirmed successful. Next active implementation: coordinated GM damage with Deflection; Uncanny Dodge still waits for automated visibility.


### MATH1 published

https://github.com/Tommiec21/n5e-system/releases/tag/v0.13.0-alpha.3; commit f93f521d6c5998b322269b875da867155cc50670. GitHub CI/Release succeeded and both assets verified. Next batch RX2: opt-in coordinated GM damage/Deflection pilot; no Uncanny Dodge until automated visibility. Exact allocation of flat reduction across multiple damage types has been asked and remains pending.


### RX2 and DR rulings — completed, publication pending

Owner Codex. Version 0.13.0-alpha.4: opt-in coordinated active-GM damage-card application with durable per-card/actor identity; base Deflection private decisions and revalidation; one combined actor update for damage, Discipline and reaction allowance. Repeated cards cannot roll/pay/apply again; changed apply modes are refused under that identity. Advanced Flurry Techniques/Defensive Draw and Uncanny Dodge remain unsupported in this pilot. Multi-actor actions are individually receipted, not atomic.

LOCKED USER RULINGS: Deflection is dynamic/rolled DR and follows the same rules as static DR. DR is independently available against HP and CP damage (e.g. Fire and Chakra each receive DR). Types sharing a pool use one budget; the damaged creature chooses which type receives DR first, with leftovers applied to the next. The old 'one budget for the whole calculation' statement is superseded. Static plus rolled DR is handled together, including Pierce/exemptions, before multipliers. HP-type allocation is an explicit dialog; a GM operating it records the creature's choice rather than inventing it.

Added GM Automation Recovery settings window, receipt target/source references, explicit export/archive, and positive-reply verification against committed matching world receipts. Unknown/partial outcomes never blindly retry. Legacy snapshot Undo is disabled only for coordinated applications because it cannot safely reverse the reaction/resources; default manual workflow retains Undo. Corrections use explicit GM reconciliation. GM loss while waiting aborts the original continuation; a pending prompt is not permission to restart an uncertain damage action.

Verification: 217 tests passed, 2 original fixture skips, zero failures; lint/data/template checks and package build passed. Coverage includes mixed HP/CP DR, creature-chosen type order/resistance interactions, rolled DR/Pierce, Deflection scaling/eligibility, one application/cost/roll per card, forged success acknowledgments and archive failure handling. Live GM/two-player verification remains outstanding. No local Foundry changes.

Publication pending. Next dependencies: observer-specific automated visibility (Uncanny Dodge must wait; no GM confirmation substitute) and N5e precedence for complex Foundry dice expressions. RX2 is a bounded base-Deflection pilot, not completed universal reactive resolution.

### RX2 published and VIS1 active

RX2 published at https://github.com/Tommiec21/n5e-system/releases/tag/v0.13.0-alpha.4, commit b4d2df5892e767349138eb34b7255aa9f3a0854e. GitHub CI/Release succeeded; n5e.zip/system.json verified. Codex now owns VIS1: observer-specific visibility and Uncanny Dodge integration. User ruled Blindsight satisfies can-see within its radius. Preserve existing wall semantics; never substitute GM omniscience. Unknown visibility blocks automatic eligibility. Next unrelated agents must coordinate before editing these same workflow/canvas paths.


### VIS1 completed — publication pending

Version 0.13.0-alpha.5: observer-specific Foundry13 sight provider and Uncanny Dodge integration. User ruling: Blindsight qualifies for can-see within its radius. Provider uses that token's prepared vision source and configured range/wall/light/detection backend with token-size nine-point sampling, never global GM visibility. Chakra Sensing/Tremor Sense alone do not qualify. Missing/ambiguous source identity, unprepared vision, relational stealth, hidden scene tokens, unsupported elevation or failing providers remain unknown; a potential Dodge owner's unknown result blocks automatic application. No GM-confirmation visibility substitute.

Dodge revalidates ownership, reaction, combat turn and current observer sight on commit. Half/double factors are deduplicated globally before cancellation. If both base reactions qualify, Dodge is offered first and declining may offer Deflection; accepting one does not chain the other. Integration tests cover visible/unseen/unknown sources and resource/reaction effects.

Verification: 224 passed, 2 original fixture skips, zero failures; lint/consistency checks and package build passed. No live Foundry verification. This is a bounded standard-scene provider, not full geometry/cover/elevation or universal vision-module support. Next prerequisite MATH2: explicit N5e precedence adapter for supported complex dice expressions. Publication pending; local Foundry remains untouched.

### VIS1 published; MATH2 active

https://github.com/Tommiec21/n5e-system/releases/tag/v0.13.0-alpha.5; commit 5e75c4f16db4b5b039eac7deaf180aa5ec5ef6bd. CI/Release succeeded, both assets verified. Codex owns MATH2: local N5e roll-expression grouping for addition/subtraction-first precedence without modifying Foundry or third-party Roll classes. Complex unsupported syntax must report failure rather than silently apply conventional precedence.


### MATH2 completed — publication pending

Version 0.13.0-alpha.6: N5e-owned rolls use a local grouping factory before Foundry evaluation, enforcing addition/subtraction before multiplication/division without global patches or third-party changes. Explicit parentheses, supported functions/pools, dice modifiers and flavor are preserved; string formula references are grouped. Unsupported syntax (including exponentiation/modulo and quoted strings outside annotations) reports failure. This adapter is not a universal custom dice parser or DAE script engine.

Verification: 227 passed, 2 original migration fixture skips, zero failures; lint/schema checks and release build passed. Live Foundry dice evaluation remains unverified. A disposable multiplayer verification checklist is saved at outputs/N5e-multiplayer-live-test-checklist.md and in repository docs. Publication pending. Next scope LIVE1: live validation only, awaiting the user's permission for an isolated Foundry instance or an offered test session. Do not treat the existing approvals as permission to install into the local production Foundry system.

### LIVE1 evidence and final corrections

Fourteen live scenarios and three reload/handover/archive scenarios passed in Foundry13.351, isolated alpha6 plus candidate fixes. Final runs recorded zero page errors. GM scene rendered; two player contexts and backup-GM context used no-canvas mode for UI/permission tests. Recovery overflow was corrected; stale owner dialogs now close on resolution/handoff/deletion without sending another decision. A core wall-deletion issue in no-canvas clients was isolated; final harness moved the test wall instead. Tests do not certify all module combinations, graphics, elevation, stealth or reaction upgrades.

Final automated release evidence before the new testing cap: 227 passed, 2 original missing-fixture skips, zero failures. No additional local/live reruns after that instruction. The redundant explicit release-workflow verify step was removed because the release builder already verifies; this avoids an extra automatic repetition. The current publication will run CI verification once and release-builder verification once, with no reruns authorized after two failures.

The isolated server is stopped; its temporary license/session copies were removed. Production N5e/worlds remain unchanged. Report: outputs/N5e-multiplayer-live-verification.md. Remaining scope includes upgraded/redirecting reactions, automatic attack/save orchestration, broader geometry/cover/elevation, authenticated unattended transport and optional module integration; do not claim these are complete.

### LIVE1 publication confirmed

https://github.com/Tommiec21/n5e-system/releases/tag/v0.13.0-alpha.7; commit 54a4d9a9c4c0980bb5ede97da914d34764200a46. GitHub CI and Release both succeeded; n5e.zip/system.json verified. Since the new testing instruction, two automatic verification attempts ran and passed; zero failures, no local/live reruns. No third attempt is scheduled. Final context-only bookkeeping uses [skip ci] because no runtime code changes and further verification is unnecessary. The production Foundry installation and campaign worlds were not changed.

## RX3 / MP2 active batch — Codex, November 9
User renewed instruction: finish the work. Scope: shared registered reaction dispatch and reusable GM-coordinated command execution; route existing damage reactions through these boundaries. Preserve existing rulings, reviewed transport and fail-closed interrupted requests. No broad live cycle. Test budget reserved: one local release verification, one CI verification, one release-builder verification (maximum three); stop entire process after two failures. Newly changed behavior is not live-verified. Ownership: module/workflow/reaction-dispatch.mjs, reaction-adapters.mjs, coordinated-damage.mjs, module/automation/commands.mjs, API, focused tests and documentation.


### RX3 / MP2 delivery snapshot — November 9, 2026

Owner Codex. Paths include reaction dispatch/adapters/chain, authored recipe rules, item reaction editor, automation command/receipt recovery, GM recovery UI, API, workflows and focused tests. Implemented shared registered reaction dispatch, owned multi-offers, GM-authored damage recipes, final eligibility validation, newest-first explicit nested interruptions with bounds, shared GM command API and safe pre-application review resumption. User confirmed newest-first nested timing in this chat. Unsupported mechanics remain explicit; no imported prose is silently assigned a reaction.

Local evidence: 17 new focused checks passed (8 dispatcher/recipe/command, 1 integrated authored damage, 4 recovery/commit revalidation, 4 nested chains), zero failures. No broad/local existing-suite repetition. Existing unchanged suite already had two post-limit runs; only ONE additional CI verification is reserved, bringing it to three. New focused cases have one local attempt and one CI attempt reserved. CI will build/verify once and Release will publish the exact artifact, with no release rerun. Do not run another local full suite. If any scenario reaches two failures stop the entire process. UI/network changes in this batch are not live-verified. Latest preceding live evidence remains alpha7's 17 scenarios.

Version candidate 0.13.0-alpha.8. GitHub-only, pending CI and asset verification. Local Foundry unchanged. General attack/save/casting routing, advanced/redirecting content adapters, automatic uncertain-write replay, authenticated unattended transport and automatic undo are NOT claimed complete. Reaction recipes cover before-damage reduction/multipliers/costs; other timings require registered adapters and explicit workflow wiring. This closes the special-case-only dispatch and pre-application recovery gaps, not the entire future automation roadmap.

RX3 / MP2 publication verified: runtime commit 8d049eeb5, CI run 42685134334 succeeded, Release run 42685208216 succeeded. GitHub v0.13.0-alpha.8 is published with n5e.zip (2,336,982 bytes) and system.json (5,159 bytes). The release downloaded the exact verified CI artifact and ran no additional tests. Existing unchanged suite post-instruction attempts: 3 total, zero failures; new focused scenarios: 2 total (one local, one CI), zero failures. Do not repeat unchanged scenarios. No local installation or new live checks. Broader attack/save-specific integrations and advanced content adapters remain outside this implemented batch; do not describe the entire requested automation scope as finished. Ownership of this batch is released.

## MP3 active — Codex, November 9
User narrowed scope: finish multiplayer action coordination; reactions only successful hit/damage, other timings manual; retarget rolled damage instead of advanced redirects; defer nested chains (document only); no live verification ever again. Keep duplicate protection and unconfirmed completion warning, do not expand recovery. Scope: shared typed workflow dispatch/GM review, integrate cast/use/activity/attack/resource/healing/rest/chat operations, explicit target snapshots, retarget UI, failure isolation, source-bound chat button validation. Existing planners and actor locks remain. Tests: one new focused scenario run and one CI gate reserved for changed multiplayer behavior; never live-test. Stop entire process after two scenario failures; max three attempts.


### MP3 implemented — candidate 0.13.0-alpha.9

Native multiplayer entrypoints now submit typed requests to active-GM execution. Covers casts/features/attacks/card activities/pool costs/healing/rests/trackers/d20/death saves/condition saves/concentration/Will of Fire and rolled damage. Explicit player target snapshots, stored-card reconstruction/fingerprints, committed-result acknowledgments, concurrent click coalescing and isolated errors use existing planners/queues/receipts. Retarget UI retains rolled damage. Hit-confirmed reaction windows and damage timing only; all other timings manual. Nested automatic dispatch removed from damage and deferred, advanced automation excluded. No recovery expansion. No live verification EVER per user; user performs acceptance. Local Foundry untouched.

Focused MP3 attempt1: six of seven new scenarios passed. Stored-card activity scenario failed because the harness omitted CONFIG.ChatMessage.documentClass.getSpeaker, before card execution. Added that missing Foundry stub; do NOT rerun locally. Its next attempt is CI (attempt2); a second failure stops the entire process. One CI verification/build reserved; release consumes its exact artifact, no second gate. Do not repeat passing local cases. Publication pending.

MP3 publication verified: runtime commit 34e171711, CI run 42689068638 succeeded, Release run 42689126479 succeeded. GitHub v0.13.0-alpha.9 has n5e.zip (2,345,266 bytes) and system.json (5,159 bytes). Release reused the CI-verified artifact without another test execution. New scenarios: one local attempt (6 pass, 1 missing CONFIG fixture failure), then one CI attempt (all passed). The missing fixture was fixed without local repetition; its total failure count is one. No scenario ran more than twice in this batch. No live verification or local installation.

Native multiplayer coordination for the user's narrowed scope is implemented and published. Successful-hit confirmation and damage-roll timing only; other reaction timings manual. No advanced redirect system: recipient retargeting is provided. Nested chains are deferred and no longer called by automatic damage. Basic duplicate protection and uncertain-completion warnings remain; no recovery expansion. Direct field edits, canvas placement and arbitrary third-party/macro mutations remain ordinary Foundry editing and are not intercepted. In-game verification is deliberately left to the user, per their instruction. MP3 ownership released.

## EE1 active — Codex, November 9
Expanded effect editor first supported authoring batch. Extend native Foundry13 editor; preserve existing effect IDs and unknown legacy data, draft-only add/delete/presets/import until Save. Scope: searchable typed catalog, validation, modes/priority explanations, supported N5e flags/conditions, presets, estimated field preview, source/timing diagnostics, raw export/import and disabled duplicate. Unsupported future engines explicitly unavailable, not inert controls. Pure authoring helpers + existing editor subclass/templates/CSS/tests. No live verification ever; one focused local and one CI gate reserved, max3 attempts, stop after2 failures.


### EE1 implementation — candidate 0.13.0-alpha.10

Existing Foundry effect sheet expanded, not replaced with a parallel application engine. Added typed search/catalog/presets, draft-only changes/import, save validation, legacy retention, stale-revision guard, supported flags/conditional predicates, previews and source/timing diagnostics, portable disabled import/copy. Native Details/Duration tabs retained. New files: rules/effect-authoring.mjs, templates/effect/changes.hbs, tests/effect-authoring.test.mjs and docs/EFFECT_EDITOR.md; updated effect-config.mjs and scoped CSS.

Nine focused checks passed on first attempt; zero failures. Local lint passed. One CI verification/build reserved, then publish its exact artifact without retest. No live testing ever. User requested finish; publication pending. Capability matrix explicitly records dynamic change formulas, new event expiration, effect macros, appearance providers and automatic DAE import as unavailable future services, rather than claiming parity. This is the planned first supported editor authoring batch. No local Foundry installation.

EE1 publication verified: runtime commit 1ff40a6d4; CI run 42723262909 and Release run 42723313865 succeeded. GitHub v0.13.0-alpha.10 assets verified: n5e.zip (2,354,498 bytes), system.json (5,161 bytes). Nine focused checks passed locally and again in the sole CI gate: two attempts per changed scenario, zero failures. Release consumed the verified CI artifact without retesting. No live verification or local installation. Capability matrix: docs/EFFECT_EDITOR.md and outputs/N5e-expanded-effect-editor.md. Native editor authoring expansion completed; dynamic change formulas, effect macros, new expiration types and token providers remain separate pending services, explicitly unavailable in the UI. EE1 ownership released.

## ES1 active — Codex
Implement pending effect services: bounded dynamic numeric changes, event expiration dispatcher, opt-in GM-approved world Macro bindings, optional token appearance provider registry and built-in reversible visual filter. Expose authoring in existing editor and public API. Preserve source arithmetic, no foreign script evaluation, no global wrappers, no live tests. User requested <=10 minutes. One focused run + one CI gate reserved; max3/stop2 failures.


ES1 implemented, candidate alpha11: pending effect services now include bounded dynamic numeric changes, qualifying-event expiration, explicitly GM-approved opt-in world Macros, and reversible appearance providers/filter. Existing parser, actor effect application and editor reused. 17 focused tests passed first attempt; local lint passed. One CI/build gate reserved; release consumes verified artifact without retest. No live verification, local installation, foreign script conversion, universal stacking claim or third-party provider certification. User requested completion within ten minutes; publication in progress.

ES1 publication verified within the user time limit: started 23:58:44 UTC, release verified 00:07:28 UTC (8m44s). Runtime commit bf7db4517; CI run 42725734844 and Release run 42725777067 succeeded. GitHub v0.13.0-alpha.11 assets n5e.zip (2,361,393 bytes) and system.json (5,161 bytes) verified. Seventeen focused checks passed first local attempt; CI full gate also passed. Two attempts per changed scenario, zero failures; release reused artifact without retest. Local lint passed. No live test or local installation. Authoring now exposes service JSON and explicit approval of saved world Macro bindings. Macro approvals include referenced code and ownership. Existing numeric previews resolve available formulas and report unresolved references. Documentation: docs/EFFECT_SERVICES.md and outputs/N5e-effect-services.md. Optional external appearance provider adapters are supported through the public registry but specific third-party module adapters are not bundled/certified. No universal stacking engine or DAE script conversion claimed. ES1 ownership released.

## DT1 active — Codex
Fix damage roll/application association: visible formula/dice breakdown, authoritative stored-roll verification, per-recipient defense/resource audit and source link. Preserve math and reaction rules; no rerolls, no live verification. Include flavor-backed card action lookup required for legitimate damage buttons. One focused automated run plus one CI gate reserved; max3 attempts, stop2 failures. Other Kunai ActorDelta issues and GM approval policy are separate unresolved reports.


DT1 implementation candidate alpha12: source roll lineage, visible formulas/die results, roll-total verification, immutable application snapshot and per-recipient defense/resource breakdown. Native source visibility preserved. Fixed flavor-backed button lookup and flavor fingerprinting as the required card linkage path. Damage/critical rules unchanged. Six focused tests passed first attempt; lint passed. One full CI gate reserved, release artifact reused. No live testing/local installation. ActorDelta duplicate item bug and overbroad GM approval are separate outstanding reports. Publication pending.

DT1 publication verified: runtime commit f5c7441b4; CI run 42728446273 and Release run 42728499959 succeeded. GitHub v0.13.0-alpha.12 published with n5e.zip and system.json. Six focused checks passed locally and in CI; two attempts per changed scenario, zero failures. Release reused the verified artifact. No live verification or local installation. User clarified that the issue is missing roll/application association, not whether an independently rerolled critical equals twice a prior normal roll. Applied summaries now preserve and display source roll snapshots plus defense/pool changes without rerolling. Source flavor mismatch corrected; in-game acceptance pending.

User asked why Uncanny Dodge appears central: it was an early example given disproportionate development attention. It remains an optional registered ability, not a required damage/coordination subsystem. The new reaction label identifies the actually accepted ability only; no automatic Uncanny Dodge label on ordinary damage. Other reported ActorDelta item duplication, missing embedded Kunai item and overbroad routine GM approval remain unresolved separate tasks. DT1 ownership released.

## CHAT1 active — Codex
User rejects verbose duplicate damage presentation. Replace custom public breakdowns with native expandable dice, only the actual roll; remove repeated types/formulas/totals and applied-card audit/boilerplate. Preserve structured provenance internally and compact source access. No math changes or live testing. One focused run + one CI gate, max3/stop2 failures. Context skill references already read; preserve Foundry native visual language.


CHAT1 implemented, candidate alpha13: user explicitly rejected prose/diagnostic clutter. Native Roll.render now displays only the actual damage dice; no duplicate types/totals, normal-formula comparison, public applied calculation or coordination/undo boilerplate. Applied cards retain recipient/result plus compact native dice-icon source access. Structured verification/provenance stays internal; no arithmetic changes. Seven focused checks passed first attempt, lint passed; one CI gate reserved. No live tests/local installation. Saved legacy chat HTML is not rewritten. Publication pending.

CHAT1 publication verified: runtime commit 862af92be; CI 42729916872 and Release 42729971859 succeeded. GitHub v0.13.0-alpha.13 has n5e.zip and system.json. Seven focused checks passed locally and in CI (two attempts per changed scenario, zero failures). No release retest/live verification/local install. User's UI preference is authoritative: damage chat must use native actual dice only, with no diagnostic prose, duplicated types/totals, normal-versus-critical comparison or applied audit/coordination block. Metadata stays internal. New cards have the compact layout; stored historical chat HTML remains unchanged. CHAT1 ownership released.

## JUTSU1 active — Codex
User-authorized content work only: read Jiraiya source in KB/_source/jutsu; import all jutsu into core system, organized Discipline / Nature Release or Group / Rank; preserve keywords, damage expressions and released IDs. Reuse existing fields, activity handlers, builders and pack pipeline. Source has968 rank headers; cached parsed968 is cross-check only, primary source authoritative. Keep same-named group variants distinct. No new gameplay system, no live testing, GitHub release only. Limit conditional automation to source-certain expressions; preserve manual rulings and source text, report unsupported cases. One focused run + one CI gate reserved; max3/stop2 failures.


### JUTSU1 implemented — candidate alpha14

Authoritative full Jiraiya source imported: 968 jutsu (403 nin,167 gen,146 tai,252 buki), 118 Discipline/Group/Rank folders, 1,535 source expressions. All 12 starter IDs retained; both Brutal Block variants distinct. Checked-in source snapshot and deterministic builder supersede the old 10-entry generator. Full source text, keywords/stimuli/Unaware, metadata/riders and line/hash provenance preserved. Four source-header typos documented. Existing activity handlers reused; 192 unambiguous higher-rank activity maps connect to cast-rank selection, and unarmed placeholders use current stance types. Fixed imported Special costs charge through the existing planner; 11 unresolved/scheduled/ambiguous costs are manual/blocked from automatic free casts. 246 utility-only entries preserve source-directed mechanics, not invented effects. Complex branches, choices, riders, weapon-die-only references and summons remain manually source-directed where existing handlers cannot safely represent them. No new gameplay engine.

Ten focused tests passed first attempt; lint passed. Import generation: initial pre-header BOX parse failure corrected, next two runs passed; no further generation runs. One CI verification/build reserved and no release retest. No live verification or local installation. See docs/JUTSU_IMPORT.md and docs/generated/jutsu-import.json for coverage/limitations. Source book stat blocks/contracts not imported as jutsu. Publication pending.


### JUTSU1 publication check correction
First CI run 42734764035 failed: 277 passed, 8 failed, 2 skipped. Failures traced to flat-directory test readers (5), the outdated Flame Whip radius assumption (source is a single creature within 20 feet), expanded search results, and an advancement test choosing alphabetical jutsu instead of explicitly choosing the newly granted fire affinity. Corrected the fixtures/readers against the source without changing gameplay rules. One final CI attempt authorized within the three-attempt ceiling; if a scenario fails again, stop. No live verification.


### JUTSU1 STOP — release blocked
Core content committed to main: f4a12ac13, regression fixture corrections 03475bce7. Second CI 42735023859: 284 passed, 1 failed, 2 skipped. Remaining scenario tests/damage.test.mjs compendium jutsu: what a failed save inflicts failed twice (first flat-directory EISDIR, second Butterfly Kick parser returns Concussed + Prone versus legacy expected Concussed only). STOPPED under user policy; no third CI, no live tests, no published alpha14 artifact. Next work requires user authorization to resume and source review of Butterfly Kick conditional Prone before adjusting test/parser. Do not claim import fully verified or released. All 968 item sources and import tooling are committed; complex clauses/manual costs remain documented.


### JUTSU1 user-authorized retry
User explicitly said Retry after explanation of the stopped condition scenario. One additional CI attempt reserved; no local repeated tests or live testing. Correct the existing compendium condition check to use effectiveActivities (the runtime authored-activity selector), preserving the normal Concussed-only assertion and adding the distinct Finisher Concussed+Prone assertion. No jutsu rules/content or fallback parser changed. Historical failures remain counted; authorization applies only to this additional attempt.


### JUTSU1 published after explicit retry
User-authorized single additional attempt succeeded: CI 42735885181 (commit 7018c42e2), 285 passed, 0 failed, 2 existing skipped. Release 42735936572 succeeded using the verified artifact; v0.13.0-alpha.14 publicly published with n5e.zip (3,579,016 bytes) and system.json (5,161 bytes). https://github.com/Tommiec21/n5e-system/releases/tag/v0.13.0-alpha.14 . Corrected check uses effectiveActivities, retains normal Concussed-only and separately verifies Finisher Concussed+Prone. No imported mechanics changed in retry. Prior stop is historical/resolved by explicit user authorization, not a reset of attempt counts. No additional tests, live verification, or local installation. Complete core content import published; manual/complex source clauses remain as documented.

## REVIEW2 + shared plan — Claude, 2026-11-13
Owner Claude. Docs-only; no runtime code, content or version change, so no release. Full read-only review of GitHub head 6c17e1a (0.13.0-alpha.14). Local checks: lint passed, `tools/check.mjs` passed, suite 285 passed / 2 skipped (one run). Findings R1–R26 and the shared roadmap are in `docs/PROGRESSION_PLAN.md`, which both agents now follow. Read it before claiming a batch. Claim protocol: set the owner in its status table and push that change alone before coding. Running out of tokens: push to `wip/<batch>` and append a Handoff entry here. Added `tools/report-modules.mjs` and `docs/generated/module-index.md` (128 files, 539 exports). Extended `RULES_MAP.md` with 0.13 rows and a Known-gaps table. Updated the `DEVELOPER.md` folder map. King's 2026-11-13 rulings and data decisions (attack kinds, Unarmed Strike item, strike vectors, keyword model and list, multi-discipline casting, stance categories, feature kinds) are recorded in N5e-Context.md Section 12 and summarized in plan Section 3. Next ready batches: TURN1, DMG1, ADV1. OPS1 waits on Q1 (GM approval policy). No batch claimed.

## Decision — King, 2026-11-13 (recorded by Claude)
GM approval on everything is removed. This supersedes the "GM review mandatory for unauthenticated remote requests" rule in this ledger and in MULTIPLAYER.md. Routed requests keep running on the active GM's client for permissions, but they execute automatically with no review dialog. Receipts, replay protection and payload validation stay. This is batch OPS1 in `docs/PROGRESSION_PLAN.md`: priority one, and it starts when King approves the next development batch. Nothing is claimed yet.

## Decision — King, 2026-11-13 (recorded by Claude)
Multiplayer parity: player interactions with NPCs must do everything dnd5e and PF2e do, with no exceptions. This widens OPS1 (priority one) into a parity rebuild. The spec is `docs/PROGRESSION_PLAN.md` Section 7. Start with a source audit of dnd5e 5.3.3 and PF2e. Open question Q5: both engines let players apply damage and effects only to tokens they own, so strict parity removes the GM relay for player-to-NPC changes. Wait for King's answer before building that part.

## Decision — King, 2026-11-13 (recorded by Claude)
Q5 answered: exact dnd5e/PF2e parity. Remove the GM relay for player → NPC changes; players apply damage and effects only to what they own. The only exception is **Allied NPCs**: player-controlled NPCs that players can add to the world, such as summons from jutsu or class features. The summoner owns them; creation is routed to the GM client automatically, with no dialog, only when core permissions block the player. Spec: `docs/PROGRESSION_PLAN.md` Section 7. OPS1 is unblocked and remains priority one, pending King's approval of the next batch.

## OPS1 — Claude, 2026-11-13
Owner Claude; ownership released. King approved the spec in `docs/OPS1_SPEC.md`. **OPS1a** v0.14.0-alpha.1 (67b60df): dnd5e/PF2e multiplayer parity. Each user changes only what they own; no GM relay and no approval dialogs; socket.mjs, automation/multiplayer.mjs and the multiplayerCoordination rule are removed. Owner intents use authenticated actor flags. Allied NPCs are player-summoned and player-owned. Effect-application cards. **OPS1b** v0.14.0-alpha.2 (62dcc07): per-target attack results, attack/challenge visibility, concealed NPC descriptions, GM roll requests. CI and Release succeeded for both; GitHub releases carry n5e.zip and system.json. Tests: 285 pass, 2 skipped. Full-suite attempt history is in the spec; no stop condition was reached. **OPS1c** not reproduced: the missing-Kunai error came from the deleted relay; the duplicate-item report needs King's steps. Do not restore the GM relay or GM review. The removed relay is not the model for new work: use `canModify`/`ownedRecipients` and, for N5e-only GM-side work, owner intents. No live testing and no local install. Next ready batches: TURN1, DMG1, ADV1.

## TURN1 — Claude, 2026-11-13
Owner Claude; ownership released. King approved `docs/TURN1_SPEC.md` and ruled: an unanswered upkeep prompt ends those jutsu; NPC upkeep is automatic by default (world rule `npcUpkeep`: auto/prompt/manual). Published v0.15.0-alpha.1 (0303a11); CI 43535530033 and Release 43535579481 succeeded. Turn automation now lives in `N5eCombat`'s forward-only methods (`documents/combat.mjs`). Do not re-add `combatTurnChange`, `combatStart` or `deleteCombat` hooks for turn work; add steps to `turnStartPipeline` / `turnEndPipeline` / `combatEndPipeline`. Turn/round/encounter recovery is in `rules/recovery.mjs`. The upkeep prompt is owner-side via `flags.n5e.upkeepPending`. Tests: 289 pass, 2 skipped, on the first attempt. Next ready batches: EXPIRE1, DMG1, ADV1, CONC1.

## EXPIRE1 — Claude, 2026-11-13
Owner Claude; ownership released. Published v0.15.0-alpha.2. Timed effects expire: in combat at each turn start for every combatant (`expireInCombat`, called from `turnStartPipeline`); out of combat on `updateWorldTime`, where non-Persists conditions are included. Rules are in `rules/expiry.mjs`. Spec and results: `docs/EXPIRE1_SPEC.md`. Tests: 293 pass, 2 skipped, on the first attempt. Open question Q6 (turn-ending conditions out of combat) is with King. Next ready batches: DMG1, ADV1, CONC1.
