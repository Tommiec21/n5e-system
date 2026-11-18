# GM workspace — GM02 integration contract

2026-11-18. Owner: Codex. Baseline inspected: 97bfa93 / 0.64.0-alpha.1.
GM01 layout selection complete. GM02 integration review complete; runtime implementation starts in GM03.

## Selected approach

Build Journal Desk A as a dedicated ApplicationV2 window over native JournalEntry/Page documents. Do not replace document classes, register a default journal sheet, or wrap journal directory clicks.

Monk's Enhanced Journal 13.06 intercepts journal navigation and registers its own sheets. Keeping an explicit N5e workspace entry point avoids competing for these hooks; actual coexistence remains unverified until the user tests in Foundry.

Normal journal access remains available. B Campaign Board, D World & Story and C Writer's Journal are future views of the same records, not separate storage systems.

## Records

- Native page name and text.content own the title and rich text. Blank content is valid; no mandatory preparation workflow.
- Optional flags.n5e.preparation: version 1, kind, campaignUuid, tags and links. Each link has a document UUID and relationship label.
- Kinds: campaign, session, mission, character, faction, country, village, location, idea and note.
- Native journal ownership owns permissions. New private workspace journals explicitly default to NONE for players; never add secrets to an already shared journal.
- Character profiles do not create Actors. Actor creation is an explicit later adapter action.
- Existing pages without workspace metadata remain ordinary journals; opening them causes no writes or bulk migration.
- Existing flags.n5e.mission remains authoritative for mission budgets and rewards. Open the existing mission planner for those fields; do not overwrite its generated page body with workspace prose.
- For an existing mission, workspace prose lives in a separate linked preparation page. Existing mission UUIDs and flags remain untouched.
- Monk's typed pages open through their own sheet until a type-specific adapter is explicitly implemented. Never flatten their fields into plain text.
- Player handouts are separate selected public content, not a visibility switch on the private source.

## Editing and navigation

GM03 owns library, tabs, editor, explicit Save, dirty-state close protection, and collapsible Ideas panel. Keep search and navigation local to loaded metadata; load full content only when opening a record.

Save only fields owned by the workspace. Do not rewrite whole flags objects or ownership; reject unsupported future metadata versions rather than downgrading them.

Track draft state per page UUID. When an external update affects a dirty page, offer reload or keep draft before writing; do not claim transactional multi-GM editing.

Persist personal favorites and layout preferences on the User, separate from world content. No timed scenes, readiness score, mandatory templates or automatic gameplay mutations.

## Integration points

MissionPlanner.open(page) handles mission budgets. The adversary builder remains responsible for playable NPC construction; socialEncounter currently expects a selected token and needs an explicit-reference adapter in GM05.

No new gameplay math, actor mutations, global polling, core exports, or external AI dependency belongs in GM03. Workspace services live outside shared module/rules to avoid unnecessarily distributing presentation storage code to the dnd5e Module.

## Batch status and verification

- GM01: complete, four image concepts preserved and A selected.
- GM02: source/ownership review and integration contract complete; no runtime code changed.
- GM03: next, A baseline library and writing UI.
- GM04–GM07: starter data, suggestions/tool adapters, usability/sharing, later eras.
- GM08–GM10: optional B, D and C layouts.

Read current main and ownership again before GM03. No overlapping journal-workspace claim found in the inspected context; this is not proof of another agent's unsaved work.

No tests run for this documentation-only batch. No live Foundry session launched; no installed files or worlds changed. No release published because this batch adds an integration contract only; publish the runtime batch before beginning another implementation batch.

GM03 offline checks should cover permission defaults, existing mission preservation, unsupported metadata versions, dirty-draft retention and narrowly scoped updates. Count local and CI attempts together under the user's limits.

## GM03a — native baseline implemented, 2026-11-18

Monk's is installed as a package, not confirmed enabled in an N5e world. Its 13.06 manifest supports Foundry 13; source inspection found no explicit n5e system adapter. Journal browsing may be generic, but inventory/currency integration is not certified. Objectives styles 1.0.3 targets Foundry 11. No runtime compatibility claim is made.

Journal Desk now implements its own library, open-entry tabs, rich-text editor, search, favorites, private entry creation, save/reload, dirty-close protection and reuse of saved idea text. Open from Configure Settings > N5e Journal Desk, or game.n5e.api.journalDesk(). No Monk's dependency, hooks or sheet overrides.

GM03b remains: UUID relationship controls, campaign filtering, navigation history, persisted open tabs and optional templates. GM04 provides curated starter data; GM05 adds richer suggestion filters and mission/adversary adapters. GM06 includes visual/user acceptance polish and safe sharing. B/D/C remain GM08/09/10.

Offline evidence: four storage regression tests passed on attempt 1; focused lint passed. CI is reserved as attempt 2 for these scenarios. No live testing or local installation. UI behavior and visual fidelity await user testing; this is a functional first slice, not a claim of complete A parity.

## GM03b — implemented 2026-11-18

Adds campaign assignment and library filtering, labeled links to workspace records/Actors/Scenes, Back/Forward navigation, remembered saved tabs and optional starter headings. Missing links display a warning; removing a link never deletes its target. Advanced UUID input supports other native journals without converting them.

Campaign/link edits remain drafts until Save. Templates append headings and never replace existing text. User preferences contain tab references, not unsaved writing; closing with unsaved changes still requires confirmation. Last 30 tabs are remembered and deleted/unsupported documents are skipped. History is local to the open window. External documents open through their own sheets.

Validation: five new navigation/draft tests passed on local attempt 1; focused lint passed. UI changes after that check are included in the reserved PR CI attempt 2; main CI is reserved as attempt 3. No live testing or local installation. Visual acceptance and broader usability refinements remain GM06; curated starter lore remains GM04.

GM03a release confirmed: v0.65.0-alpha.1. GM03b prepared version: 0.65.0-alpha.2; publication pending.
