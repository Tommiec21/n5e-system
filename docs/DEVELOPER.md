# Developer guide

## Layout

```
n5e.mjs                  entry point (init/ready hooks)
module/config/           CONFIG.N5E registries (plain data, no Foundry imports)
module/rules/            pure rules functions (tested in Node)
module/data/fields/      shared schema fields (ResourcePool, Activation, Range/Area, ...)
module/data/actor|item|effect/   TypeDataModels
module/documents/        Actor / Item / ActiveEffect document classes
module/applications/     sheets (placeholders in Phase 1)
module/migration/        v31.mjs (pure mapping), runner.mjs (world migrations)
templates/ styles/ lang/
packs/_source/<pack>/    compendium sources, one JSON per document (the source of truth)
tools/                   pack, unpack, release, check, install-local
tests/                   node:test suites; helpers/foundry-stub.mjs fakes Foundry's data fields
```

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm install` | install tooling (once) |
| `npm test` | rules, pipeline, migration and entry-point tests |
| `npm run lint` | ESLint |
| `npm run check` | system.json ↔ data models ↔ templates ↔ packs ↔ lang consistency |
| `npm run pack` | compile `packs/_source` JSON into LevelDB packs |
| `npm run unpack` | extract LevelDB packs back to JSON after editing in Foundry |
| `npm run install-local` | copy the system into your Foundry Data folder for testing |
| `npm run release -- 0.1.0-alpha.2` | bump version, pack, zip to `dist/` |

Set your Foundry Data path once in `foundry.local.json` (git-ignored):

```json
{ "dataPath": "C:/Users/Tommi/AppData/Local/FoundryVTT/Data" }
```

Migration tests can run against the old V3.1 packs: set `N5E_V31_PACKS` to a folder of `.db` files
or copy them into `tests/fixtures/v31/` (git-ignored).

## Releasing (auto-updates)

1. `npm run release -- <version>` locally (or just edit the version in `system.json` and `package.json`).
2. Update `CHANGELOG.md`, commit, then `git tag v<version>` and `git push --follow-tags`.
3. GitHub Actions tests, builds, and publishes `system.json` + `n5e.zip` to a release.
   The manifest URL `.../releases/latest/download/system.json` now points at it, so Foundry offers
   the update.

## Rules changes

1. Change the registry entry in `module/config/` (most rules are data) or the function in `module/rules/`.
2. Add or adjust a test in `tests/`.
3. Record the ruling in the context file's Section 11 changelog and in `CHANGELOG.md`.

## Adding a migration

Append `{ id, label, run }` to `MIGRATIONS` in `module/migration/runner.mjs`. Never renumber. Each
migration must be idempotent. If the change is a data-shape change, also handle it in the model's
`static migrateData` so un-migrated documents still load.

## Custom Active Effect keys

Any change key starting `n5e.` is held back from Foundry's normal application and parsed by
`module/rules/change-keys.mjs` (documented there). Use core keys (`system.bonuses.ac`,
`system.attributes.ac.calc`, `system.disciplines.tai.ability`...) for stored fields.
