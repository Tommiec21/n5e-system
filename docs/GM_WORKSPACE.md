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

## GM04a — 2026-11-20

Based on current main 4093844 (0.68.0-alpha.1), preserving all intervening Amp work. Adds seven reviewed Part I starter records and a create-only importer; repeat imports skip source IDs without updating GM text. Records: Land of Waves, Tazuna, Zabuza, Hiruzen, Tsunade and two original mission ideas. Canon summaries cite official episode/comic/retrospective pages in the data; milestones distinguish leadership periods. This is the first content slice, not the complete atlas.

GM04b remains: five major country/village pairs and linked figures. GM04c remains: additional minor countries/villages, selective import filters and relationship mapping. GM05 retains mission-builder integration. Concurrent import from multiple GM clients is not an atomic transaction; use one importing GM.

Two focused offline tests passed once, including preservation of an edited existing entry; lint passed. No live testing or local installation. Package includes only content/world, not unrelated source datasets. Publishing pending.

## GM04b — 2026-11-20

Owner: Codex; based on 55f5a70, preserving recent Amp work. Added 13 entries: five major countries, their five villages, Gaara, Temari and Kankuro. Library total: 20. Country/village mapping cites Narutopedia explicitly as a secondary source; Sand figures cite the official Part I episode synopsis. No later-era Kage titles assigned.

New imports resolve curated relationships using planned native document IDs, including links to previously imported entries. Existing entries and relationships are never updated. Consequently previously imported Hiruzen/Tsunade entries do not gain new links automatically; new Konoha entries link to them. Partial import failures can leave links to uncreated records; importing the remainder does not repair these automatically. Relink those entries manually; no rollback or deletion occurs.

Three focused tests and lint passed (attempt 1); reserve PR/main checks as attempts 2/3. No live testing or local installation. GM04c remains: minor-country coverage, source-reviewed additional village figures, selective import and explicit opt-in reconciliation for old links. No unsourced Part I leadership assumptions.


## GM04c — 2026-11-20

Based on 2d04d62. Adds selective import by individual entries grouped by type, plus explicit opt-in addition of missing curated links to selected existing records. Text, custom relationship labels and existing links are preserved; broken links are not deleted. Cancel/empty selection creates nothing.

Seven additions (27 total): Amegakure, Kusagakure, Takigakure, Land of Sound/Rice Fields, Otogakure, Orochimaru and Kabuto. Unnamed countries stay unnamed; Sound territory naming is marked as Part I anime material. Sources are stored per record, including secondary-source labels. Unknown leadership remains unspecified.

Scoped CSS correction sets readable paper-surface headings, inputs and buttons based on the user's screenshot. Full Design A refinement remains GM06. Five focused tests and lint passed on attempt 1; PR/main reserved as 2/3. No live tests or local installation.

GM04 initial starter-library slice complete, not an exhaustive Naruto encyclopedia. Additional figure/region coverage is GM04d (Data Conversion System), including source-reviewed Mist/Cloud/Stone figures and remaining minor territories. GM05 remains the next gameplay batch: usable mission ideas and existing tool integration. GM04b published v0.68.1-alpha.2.

## GM05 — 2026-11-20

Based on 7f344c0. Six original offline mission prompts with theme/region/suggested-rank filters, objective, obstacle, approaches, adversary concept, twist and consequences. Insert appends to the current unsaved draft; Save as idea explicitly creates a private editable idea. Rank labels are suggestions, not encounter-balance certification. Source: module/applications/gm/workspace-ideas.mjs.

GM tools open existing systems: a linked native mission budget opens directly; otherwise a new unsaved planner receives the draft title only. Save the budget in its own window and link it through the newly included Mission budget records. No duplicated budget/reward math. Adversary Builder opens a fresh draft; Social Encounter uses the selected NPC token and its existing setup dialog. Neither an idea preview nor insertion creates actors or starts combat.

Three focused suggestion/filter/escaping checks and lint passed on attempt 1. PR/main reserved as 2/3; integration is source-inspected, not live verified. No local installation. The six prompts are the initial library; expanded recipes and direct selection of linked NPCs for social setup are GM05b (Gameplay System). GM06 remains the next main batch for Design A polish; GM04d broader atlas coverage and optional B/D/C layouts remain.

## GM06 — Codex, 2026-11-24 — Front End User System

Based on bd126d30; scope limited to Journal Desk UI/navigation and documentation. Design A paper/forest palette, compact selected library rows, tab accents, collapsible library, smaller-window Ideas tray, sticky save actions and keyboard search. Character profile headings append appearance, affiliation, motivation, connections and GM secrets without replacing text or creating Actors.

Player access requires a clean saved draft and explicit whole-page warning before opening native page ownership controls; linked records retain their own permissions. No auto-sharing or secret redaction is claimed. The GM reviews text before granting access; players use native journals, not the GM-only desk. Existing private creation defaults and unrelated sheets remain unchanged.

Validation budget: one local focused pass, PR CI second, main release CI third; stop after two failures. No live verification or local installation. Visual acceptance remains with the user. GM05 published v0.93.1-alpha.1; GM06 targets v0.93.2-alpha.1.

Remaining additional batches: GM04d broader Part I atlas; GM05b expanded recipes/linked-NPC social setup; GM07 later eras; GM08 Campaign Board; GM09 World & Story; GM10 Writer journal. GM06b covers any user-reported visual refinements after in-game review.
Local attempt 1: three focused access/template checks passed; focused lint passed. PR and main checks remain reserved as attempts 2 and 3.

GM06 reconciliation: Claude published 03a4719b (Earth/Wind jutsu and summons) while this batch was prepared. Merged it unchanged; release target superseded by 0.94.1-alpha.1. No Journal Desk overlap.

## GM06 corrective visual batch — Codex, 2026-11-25

Approved image A is the visual target; the previous GM06 basic styling pass did not meet it. Based on 589179f3 (0.106.1-alpha.1), preserving Claude leveling/jutsu work. Scope: Journal Desk only. Grouped library references with favorites, compact title/campaign controls, header search/save, document tabs, structured relationship rows, collapsed secondary tools, parchment/branch/mountain/brush SVG assets and scoped native ProseMirror toolbar styling. No data migrations, inferred eras/ranks, automatic sharing or gameplay changes. Favorites are references, not duplicated records.

Static preview uses the shipped Handlebars template/CSS with sample records and a stand-in editor toolbar; it does not verify live Foundry editor behavior. Compared wide preview against approved A; user acceptance remains required. First headless launch did not create a capture; second permitted launch succeeded. No live Foundry instance or local installation. Local focused checks are attempt 1, PR CI reserved as 2, main release CI as 3; no full local repeat. Release target 0.106.2-alpha.1.

Saved preview: N5e System/Reports/GM Workspace Layouts/GM06-correction-preview.html and GM06-correction-wide.png in Codex reports. Further acceptance corrections remain GM06b; GM04d, GM05b and GM07–GM10 remain separate batches.
Local verification: four focused tests and lint passed once. Static wide preview inspected; no claim of live Foundry parity.
