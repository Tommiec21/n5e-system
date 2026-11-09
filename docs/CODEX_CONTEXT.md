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

- **Owner:** Codex, this workspace/chat. **Status:** ACTIVE — Batch MP1, multiplayer foundations and recovery. Relevant paths: `module/socket.mjs`, proposed `module/automation/`, related tests/settings/docs. No other agent is assigned. Do not duplicate this batch without checking its latest status.
- Next: reaction workflow in dependent batches; user requests largest-cost challenges first but authorizes prerequisite work needed for functionality.
- Confirmed player reaction policy: **ask eligible players to accept/decline; GM resolves unanswered prompts**. Do not silently auto-spend or auto-accept.
- Publication policy: **GitHub release only**, batch-by-batch. Local Foundry remains unchanged by future batches unless newly authorized.
- Remaining gameplay choices must be asked before implementing their dependent behavior: initial reactive ability examples and exact timing/rules, timeout duration, hidden information, reaction priority/nesting. Foundational command contracts can proceed independently.
- Testing: automated tests and packaging are not equivalent to live GM/two-player validation. Record any missing live gate explicitly before claiming multiplayer readiness.

### 13.5 Batch release ledger

| Batch | State | Verification | GitHub release |
| --- | --- | --- | --- |
| MP1 | In development | Pending | Not published |
| Reactive foundation | Pending MP1 and required rule clarifications | Not run | Not published |

Update this table and the current owner/status after every batch. Do not state that a batch was published until the GitHub release assets and associated checks have been verified.

### Confirmed continuation decisions — November 9, 2026

This is the separate Codex context file authorized by the user after OneDrive write access failed. Maintain it after every batch. The original OneDrive context was read and backed up, not modified. Test-case selection belongs to Codex; ask the user about ambiguous game rulings. Reaction handoff defaults to 60 seconds, configurable by the GM; 0 disables the timer. Remote privileged requests require GM review until sender authentication is verified. Release target is GitHub only, not the local Foundry installation.


### MP1 completion — prepared for GitHub publication

MP1 implements durable receipts for the existing privileged effects/ration relay, not all combat mutations. Requests persist reviewing/applying/committed states; duplicate IDs replay stored results, changed payloads are rejected, uncertain executions are not retried, and old epochs cannot replay after explicit GM reconciliation/archive. GM review remains mandatory. Added inspection/archive API and documented limits; retained upstream failed-click/save-cost/parser/ration fixes. Version 0.13.0-alpha.1 packaged. Verification: 203 passed, 2 pre-existing skips, zero failures; lint and consistency checks passed. Live GM/two-player testing has not been performed. Local Foundry remains 0.12.0-alpha.2 and was not changed.

GitHub publication pending. MP1 owner remains Codex until release verification. Next batch: reactive decision windows and configurable 60-second/disabled handoff, with GM review for unauthenticated player responses. No ability effect or resource is to be inferred from a response alone. The source reconciliation preserved upstream fixes except the explicitly rejected unauthenticated automatic-request behavior.
