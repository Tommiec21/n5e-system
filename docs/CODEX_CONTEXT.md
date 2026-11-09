# N5e Codex Context

Updated November 9, 2026. This is the separate context file the user authorized when the original OneDrive N5e-Context.md could not be written. Read the current snapshot and coordination rules before the historical ledger. The original was preserved.

Current release: 0.13.0-alpha.6 published; 0.13.0-alpha.7 prepared with verified recovery-scroll and stale-prompt fixes. GitHub-only publication. Local Foundry is not updated by these batches.

Current stage: finish LIVE1 publication using existing evidence. Stop additional live tests. Testing cap: three total attempts per test/scenario; two failures stop the entire process. Count automatic CI runs too.

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

- Codex owns LIVE1 final publication (0.13.0-alpha.7). No additional live runs. The isolated server is stopped and temporary license/session copies are removed.
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
| LIVE1 verified UI corrections | 0.13.0-alpha.7 | Prepared; publication pending |

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
