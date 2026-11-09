# N5e clan import — six consecutive batches

November 9, 2026 · Build 0.12.0-alpha.2

## Completed scope

Imported all **44 clan packages in the supplied source roster**, including Non-Clan. The older KB summary says 48, but the source nation list and complete clan headings contain 44. No four extra clans were invented. Jinzo is the package also called Synthetic Human in the source.

- 266 source level-feature headings, all linked at their stated levels.
- 408 Hijutsu, with full rules and structured headers.
- 371 separately organized option/reference records.
- 19 optional mutation replacements.
- 0 clan feats (excluded at the user’s request pending revised rules).
- 577 distinct latent-bloodline records representing 582 source table rows; identical repeats are consolidated and conflicting rows remain separate variants.
- 26 clan stance records and separately accessible companion rules profiles.

## Batch record

| Batch | Clans | Features | Hijutsu | Mutations | Clan feats |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Aburame, Akimichi, Hatake, Hyūga, Iburi, Inuzuka, Kurama, Namikaze | 49 | 66 | 0 | 0 |
| 2 | Nara, Sarutobi, Senju, Uchiha, Uzumaki, Yamanaka, Fūshin, Hanami | 45 | 73 | 15 | 0 |
| 3 | Jiton, Konjiki, Shakuton, Genwa, Hoshigaki, Hozuki, Kaguya, Vesper | 46 | 60 | 0 | 0 |
| 4 | Yamada, Yuki, Bakuton, Futton, Shí Hóu, Yoton, Chinoike, Keton | 49 | 81 | 0 | 0 |
| 5 | Ranton, Jūgo, Kashu, Shoton, Jinzo, Tsuchigumo, Non-Clan, Hoshi | 54 | 88 | 4 | 0 |
| 6 | Shikigami, Hebi, Kuru, Ryu | 23 | 40 | 0 | 0 |

## Organization

Built into the existing **Clans** compendium in the N5e system. No separate module. The hierarchy is **Nation → Clan → section**. Sections include Features, Options, Stances, rank-labeled Hijutsu, Mutations, Companion Rules and Non-Clan's Latent Bloodlines. The hierarchy stays within three folder levels. New source records are organized under `packs/_source/clans/organized/`.

Uchiha retains its original document ID. Existing class and background content is preserved. The source text and batch manifests are kept under `content/clans/` for reproducible review.

## Setup and progression

Drop a clan onto a character to configure its ability choices, skill proficiencies, affinity choices, branch and structured starting options. Non-Clan supports its alternative +1/+1/+1 increases, three skills, Self-Taught mastery and free-feat progression. The ability-increase checkbox lets a player avoid applying bonuses already included in their scores. Updating a legacy clan without a recorded ability receipt leaves that checkbox off by default.

Clan features join class level-up at their character-level thresholds. Hyuga branch-specific grants are filtered. Already applied clan levels are recorded to prevent duplicate grants; level removal removes the corresponding tracked grants. Hijutsu are available through the existing learning/advancement lists with clan restrictions. Explicit structured menus have choice steps; other option catalogs remain rule references, not silently selected benefits.

Replacement resolves dependencies before deleting the old origin. Cancellation makes no writes. A regression test simulates deletion failure and verifies restoration of the old clan and ability scores. Manually added items without origin tags are not retroactively deleted.

## Source discrepancies preserved

- **Konjiki — retired-skill:** Crafting, Ninshou . Crafting is retired in the engine; retain source text and offer a replacement proficiency.
- **Non-Clan — latent-source-variant:** Clan Feats (Latent Hoshigaki). Different source rows retained as separate variants; GM review required.
- **Non-Clan — latent-source-variant:** Latent Raw Chakra Form II (Latent Jugo). Different source rows retained as separate variants; GM review required.
- **Shikigami — retired-skill:** Crafting, Sleight of Hand . Crafting is retired in the engine; retain source text and offer a replacement proficiency.

Crafting is retired in the engine, so Konjiki and Shikigami retain the original text and get a replacement skill choice. The original source has differing rows under the same latent-table name; those are preserved for GM review rather than arbitrarily choosing a cost or effect.

## Automation boundaries

This is a content and progression import, not complete automation of every clan rule. Full descriptions are retained. Many contextual bonuses, techniques, transformations, resource conversions/spending, senses, special attacks, bespoke menu conditions and mutations still need manual adjudication or a dedicated automation pass. Companion entries are rules profiles, not automatically constructed or linked NPC actors. Latent Bloodline Point budgets and mutation replacement dependencies are not automatically applied.

Core resource counters are defined where the source was explicit; resources used to augment a technique are not automatically treated as replacement chakra. Clan condition definitions retain full rules text. Most new condition penalties remain descriptive rather than invented numeric automation. Ranked conditions with no source-defined ceiling use `maxRanks: 0` and display an infinity ceiling; null still means unranked. Existing Off-Guard metadata is retained.

Updating the compendium does not overwrite owned clan copies or silently edit actors. Legacy clan items can be deliberately reconfigured by dropping the new package and reviewing the setup; untracked manual grants still need reconciliation. Back up an actor before changing its origin.

## Validation

Each batch passed consistency checks before the next batch. Source-derived tests verify every level-feature body and every Hijutsu description, stable Uchiha identity, all references, folder depth, optional mutations, latent table coverage, setup choices, Non-Clan variants, branch grants, clan-only learning/casting, resource unlocks, uncapped ranks, cancellation and replacement rollback. Existing class/background regression tests remain enabled. Full test and release results are recorded separately. Interactive Foundry smoke testing remains outstanding.

Rebuild one batch with `node tools/content/build-clans.mjs <N5e-Rules-KB> <batch>` (1–6). The base content build also invokes all six batches after the class expansion. The Node batch builder was executed; the modified legacy Python entry point was not executed in this environment.
