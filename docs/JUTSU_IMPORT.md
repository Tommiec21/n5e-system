# Core Jutsu import — alpha14

## Source and coverage

Authoritative source: N5e-Rules-KB/_source/jutsu/jiraiya-full.md (Jiraiya’s Jutsu Compendium, 4.0 Final Update). The importer reads the full file and its 968 jutsu Rank headers, including entries with plain titles and pre-header boxed rules. The older _data/jutsu-parsed.json was used only as a cross-check; it is not the authority. Source SHA-256: cfaafcecf75888ff2fb38733e88972211ad5f5220c36e2d096f6b57ac48203ca.

| Discipline | Imported |
| --- | ---: |
| Ninjutsu | 403 |
| Genjutsu | 167 |
| Taijutsu | 146 |
| Bukijutsu | 252 |
| Total | 968 |

Core pack: n5e.jutsu, type Item. No module. Folder and source-file hierarchy: Discipline → Nature Release/Group → Rank, with 118 folders. Taijutsu uses General as its group. Both C-rank Brutal Block entries remain distinct in Shinobi Basics and Power. All 12 pre-existing jutsu item IDs are retained, so compendium UUIDs remain stable. Clan packs and the removed Clan Feats were not rebuilt or restored. Summon stat blocks/contracts are not additional jutsu Items and are outside this content import.

## Imported data and execution

Each item contains the full source description plus original metadata/text, source line and hash, keywords, stimuli/Unaware flag, activation, range/area, duration/concentration, chakra cost, weapon/tool components, Chain/Finisher/Overcharge/upcast text and the source-expression catalog (1,535 entries, including flat typed damage). Header repairs are recorded in docs/generated/jutsu-import.json: Sunbeam's second Keywords label is its Description label; Binding Shot lacks a Keywords colon; Tendon Shot lacks Casting Time and Range colons. No source rules were invented to fill these typographical repairs.

Existing activity handlers are reused for attacks, saves, damage, rolls, healing and effects. Alternative, conditional, ongoing and repeated damage is not folded into a cumulative base damage roll. Source-context auxiliary rolls retain their instructions. A single attack button is not a promise to automatically resolve every target, hit-dependent sequence, rider or summoned creature described in the book. Select the appropriate Chain/Finisher/Overcharge activity manually when qualified. Source text remains authoritative for those conditions.

192 source-clear per-rank damage increases have rank-specific activity data. The existing effectiveActivities/cast-card path selects that data using the actual cast rank. Ambiguous choices, multiple damage components and rider scaling stay manual; they are not silently guessed. Costs per rank are copied from the source. Unarmed placeholders use the existing unarmed calculation and active stance's damage type. Weapon-die-only expressions do not assume a full weapon attack plus ability modifier.

Printed fixed Special costs now deduct their known chakra amount for these imported items and retain the existing no-reduction Special-cost rules. Unknown, scheduled and ambiguous cost instructions are blocked from automatic casting rather than charged as zero. They remain imported/readable for manual resolution:

- Binding Fury: Juggernaut — Special
- Breath of Wind: Gusts — 12 Chakra, Chain
- Mental Clone — 19 Chakra a Week for 52 weeks consistently.
- Earth Release: Moon fall — Special
- Fire Release: Phoenix Blessing — Special
- Medical Release: Chakra Transfer — Special
- Medical Release: Transfer of Life — Special
- Summoning Technique — Special (See Summoning Section for Cost)
- Water Release: Heavenly Mirror of Hope — Special
- Dempsey Roll — Special
- Straight Impact — Special

246 utility-only entries preserve their complete non-rolled rules rather than fabricate attacks/effects. Other items can include source-directed portions alongside automated activities. This import is complete content coverage, not an assertion that every sentence of all 968 jutsu is fully automated. No new reaction, summon, movement or conditional-resolution engine was introduced.

## Rebuild and maintenance

- Rebuild this book only: node tools/content/build-jutsu.mjs
- Update from the original file: node tools/content/build-jutsu.mjs --source <path-to-jiraiya-full.md>
- Reproducible input: tools/content/sources/jiraiya-jutsu.json. Source text/provenance is checked in, so CI does not depend on OneDrive or local credentials.
- Coverage/exception report: docs/generated/jutsu-import.json.
- Never run the old build_content.py starter JUTSU_PICKS routine over this pack. It is superseded. Do not regenerate classes, clans or backgrounds to update jutsu.
- Compendium updates do not silently overwrite owned world items. Previously imported campaign copies require the user's normal update/re-import process.

## Verification

Ten focused checks passed on their first test run: whole-book uniqueness/coverage; folder depth/references; all keywords/stimuli; expression identity and existing activity/formula contracts; duplicate-name separation/stable starter IDs; non-cumulative conditional damage; cast-rank selection; fixed/manual Special costs; boxed/plain-title/header parsing; retained starter authoring. Lint passed. Initial import-generation failure identified a pre-header box, which was fixed; two subsequent generation runs succeeded. No further generation retries. Publication checks and explicit retry results are recorded below; release reuses the successful CI artifact without retesting. No live verification or local Foundry installation, by user instruction.


### JUTSU1 publication check correction
First CI run 42734764035 failed: 277 passed, 8 failed, 2 skipped. Failures traced to flat-directory test readers (5), the outdated Flame Whip radius assumption (source is a single creature within 20 feet), expanded search results, and an advancement test choosing alphabetical jutsu instead of explicitly choosing the newly granted fire affinity. Corrected the fixtures/readers against the source without changing gameplay rules. One final CI attempt authorized within the three-attempt ceiling; if a scenario fails again, stop. No live verification.


### JUTSU1 published after explicit retry
User-authorized single additional attempt succeeded: CI 42735885181 (commit 7018c42e2), 285 passed, 0 failed, 2 existing skipped. Release 42735936572 succeeded using the verified artifact; v0.13.0-alpha.14 publicly published with n5e.zip (3,579,016 bytes) and system.json (5,161 bytes). https://github.com/Tommiec21/n5e-system/releases/tag/v0.13.0-alpha.14 . Corrected check uses effectiveActivities, retains normal Concussed-only and separately verifies Finisher Concussed+Prone. No imported mechanics changed in retry. Prior stop is historical/resolved by explicit user authorization, not a reset of attempt counts. No additional tests, live verification, or local installation. Complete core content import published; manual/complex source clauses remain as documented.
