# SHARED1 function spec: shared rules core

Status: **King answered Q-SH1–Q-SH3 on 2026-11-14; SHARED1a in progress.**

Plan row 17 and Section 2 (King, 2026-11-13): one shared rules core used by the N5e System and the N5e Module (the dnd5e 5.3.3 add-on), each with a thin adapter. Shared tests run against the core. A System release triggers a Module rebuild against the pinned dnd5e version. Rules and mechanics are shared; worlds are not.

## Where things stand

- **System.** `module/rules/` (54 files) is already nearly Foundry-free. Remaining host contact:
  - 6 imports of `rules-settings.mjs`, which reads world settings through `game.settings`;
  - 5 files that read guarded globals (`activity-parse`, `cast-discipline`, `condition-lifecycle`, `expiry`, `rest`);
  - `change-keys.mjs`, which reads `CONFIG`.
  - The rules import 18 times from `module/config/`, which is plain data.
- **Module** (`Tommiec21/n5e-module`, v0.1.0-alpha.15):
  - About 2,500 lines of its own planners (conditions, damage, saves, concentration, skills, classes), adapted by hand from System files at a pinned System commit (`docs/REUSE_MAP.md`).
  - Its `AGENTS.md` sets its own rules: Codex's work contract and three test attempts with recorded bypasses.

## Releases

| Release | Content |
| --- | --- |
| SHARED1a `0.26.0-alpha.1` (System) | Cut the last host contact out of the rules, define and check the core boundary, build and publish `n5e-core.zip` with each System release, and run the core tests on their own. |
| SHARED1b (Module, depends on Q-SH2 and Q-SH3) | The Module pulls a pinned core version and replaces its copied planners with core imports behind a dnd5e adapter; CI propagation. |

## SHARED1a functions (System repo)

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | `setRuleProvider(fn)`, `rule(key)` | `module/rules/settings.mjs` (new, core) | The core reads optional rules through a provider the adapter sets. The System adapter (`rules-settings.mjs`) registers `game.settings`; the default returns each rule's default. The 6 importers switch to it. |
| F2 | `setHost({config, now, ...})`, `host()` | `module/rules/host.mjs` (new, core) | The 5 files that read Foundry globals, and `change-keys.mjs` (`CONFIG`), read them through the host the adapter sets instead. No core file names `game`, `CONFIG`, `canvas`, `ui`, `foundry`, `Hooks` or `fromUuid`. |
| F3 | Core manifest | `core.json` | The core is `module/rules/**` plus `module/config/**` (data). Lists the public entry points. |
| F4 | `tools/check-core.mjs` | new, in `npm run check` and CI | Fails when a core file references a host global or imports from outside the core. |
| F5 | `tools/build-core.mjs` | new | Writes `dist/n5e-core/`: the core files, an `index.mjs` of the public exports, `package.json` (version = System version) and `CORE_API.md`. The Release workflow attaches `n5e-core.zip` beside `n5e.zip`. |
| F6 | Core tests | `tests/core/`, `npm run test:core` | Tests that import only the core move under `tests/core/`, run in CI on their own and ship in the bundle so the Module CI can run them too. |
| F7 | System adapter | `module/adapters/system.mjs` (new) | Registers the rule provider and host at init. No behaviour change for the System. |

## SHARED1b functions (Module repo, after Q-SH2 and Q-SH3)

| # | Function | Behaviour |
| --- | --- | --- |
| M1 | `tools/sync-core.mjs <version>` | Downloads `n5e-core.zip` for a System release into `scripts/core/` and records the version in `module.json` flags. |
| M2 | dnd5e adapter | Snapshot functions (dnd5e actor/item → core inputs) and the rule provider/host for dnd5e. |
| M3 | Replace copied planners | Conditions, damage, saves (degree), costs/upkeep, condition lifecycle and activity selection call the core instead of the Module's copies. Module tests keep passing. |
| M4 | CI propagation (Q-SH3: daily) | A scheduled daily workflow in `n5e-module` checks the latest System release; when its core version is newer, it syncs it, runs the core and Module tests against dnd5e 5.3.3, and opens a PR. |

## Not in SHARED1

- Moving files out of `module/rules` (the folder stays the boundary; imports don't change).
- New rules. Sharing world data or compendiums.

## Questions for King

- **Q-SH1. Where the core lives.**
  - (a) Inside `n5e-system`: the `module/rules` + `module/config` boundary, published as `n5e-core.zip` with every System release. Recommended: one repo, one version.
  - (b) A new `n5e-core` repository that both projects depend on.
- **Q-SH2. Who builds the Module side (SHARED1b).** The Module's `AGENTS.md` makes it Codex's repo with its own work contract. Should Codex do SHARED1b, or should I? If it's me, this session needs push access to `n5e-module`.
- **Q-SH3. Release propagation.** "A System release triggers a Module rebuild" needs a GitHub token with write access to `n5e-module`, saved as a secret in `n5e-system` (only you can create it). Alternatively the Module checks for a new core on a schedule (daily), which needs no token. Which do you want?

## King's answers (2026-11-14)

- **Q-SH1:** keep it in one repo: the core lives in `n5e-system` and ships as `n5e-core.zip` with each System release.
- **Q-SH2:** both Claude and Codex work on it. Each works until out of credits; the other picks up from the detailed progress log below. Keep each entry precise enough to resume from.
- **Q-SH3:** the Module checks once a day for a new core (scheduled workflow, no cross-repo token). M4 becomes a daily scheduled job in `n5e-module`.

## Progress log (handoff point for Claude and Codex)

Each entry: what was done, the exact files, how it was checked, and the next step.

- 2026-11-14 Claude: answers recorded; starting F1 (rule provider).
- 2026-11-14 Claude: **F1 done.**
  - New core file `module/rules/settings.mjs`: `setRuleProvider(fn)`; `rule(key)` returns the provider's value, or the `config/rules.mjs` default when the provider is missing, returns undefined, or throws.
  - `module/rules-settings.mjs` is now the System adapter: it registers `key => game.settings.get("n5e", key)` when loaded and re-exports `rule`, so its 25 non-core importers are unchanged.
  - The 6 core importers (`condition-lifecycle`, `damage`, `expiry`, `rest`, `trackers`, `turn-start`) import `./settings.mjs`.
  - New `tests/setup.mjs` loads the System adapter. `npm test` preloads it (`node --import ./tests/setup.mjs`), so tests that stub `game.settings.get` still work. CI runs `npm run verify`, which uses `npm test`.
  - Checked: lint and the full suite pass (362).
  - **Next:** F2. Route the guarded globals in `activity-parse`, `cast-discipline`, `condition-lifecycle`, `expiry`, `rest` and the `CONFIG` read in `change-keys` through a new `module/rules/host.mjs` (`setHost` / `host()`), registered by the System adapter.
- 2026-11-14 Claude: **F2 + F7 done.**
  - New core file `module/rules/host.mjs`: `setHost({config})` and `n5eConfig()`, which returns the host's live registry or the static `config/index.mjs` N5E.
  - Replaced every `globalThis.CONFIG.N5E` read in the core:
    - `activity-parse` (conditions, clan conditions, states, damage types);
    - `cast-discipline` (`defenseSkillFor` default skills);
    - `condition-lifecycle` and `expiry` (clan conditions);
    - `rest` (condition `persists`).
  - `change-keys` only mentions CONFIG in a comment, so no change.
  - New `module/adapters/system.mjs` loads `rules-settings.mjs` (the rule provider) and sets the host config to `CONFIG.N5E`. It is the first import in `n5e.mjs`, and `tests/setup.mjs` now loads it.
  - Checked: `grep globalThis.(game|CONFIG|canvas|ui|foundry|Hooks|fromUuid) module/rules` finds nothing; lint and suite pass (362).
  - **Next:** F3 + F4. Write `core.json` (core = `module/rules/**` + `module/config/**`, plus public entry points) and `tools/check-core.mjs` (no host globals, no imports leaving the core), and add it to `npm run check`.
- 2026-11-14 Claude: **F3 + F4 done.**
  - New `core.json` at the repo root: name `n5e-core`, roots `module/rules` + `module/config`, host hooks (`rules/settings.mjs`, `rules/host.mjs`), tests folder `tests/core`, forbidden host names.
  - New `tools/check-core.mjs`: `codeOnly(src)` strips comments and strings; `checkFile(file, src)` flags package or out-of-core imports (static and dynamic) and host globals, bare (`game.`, `CONFIG.`, `fromUuid(`) or through `globalThis`.
  - `npm run check` now runs it after `tools/check.mjs`, so CI enforces it.
  - Checked: 66 core files pass. Spot checks catch `game.settings`, `globalThis.CONFIG`, a `../workflow/` import, and ignore comments, strings and `obj.game`.
  - **Next:** F6. Move the tests that import only core files into `tests/core/`, and add `npm run test:core`. Then F5: `tools/build-core.mjs` → `dist/n5e-core/` and attach `n5e-core.zip` in `release.yml`.
- 2026-11-14 Claude: **F6 done.**
  - Moved 11 core-only tests to `tests/core/` (`git mv`, import paths now `../../module/...`): advantage, arithmetic, clash, concentration, damage-numbers, dice-advantage, enrichers, expiry, rules, skill-actions, stimuli.
  - New `tests/core/setup.mjs`: registers a test rule provider that reads a stubbed `game.settings`, through the core API only.
  - New `npm run test:core` (58 pass), now part of `npm run verify` (CI).
  - `tools/check-core.mjs` also checks `tests/core`: only the core, `node:` and their own folder may be imported.
  - Checked: `npm test` 362 pass; `test:core` 58 pass; check-core reports 66 core files and 12 core test files clean.
  - **Next:** F5. `tools/build-core.mjs` writes `dist/n5e-core/`:
    - `core.json`'s roots copied under `module/`;
    - `tests/core`;
    - `index.mjs` re-exporting each `module/rules/*.mjs` as a namespace, plus `config`, `setRuleProvider`, `setHost`;
    - `package.json` with the System version;
    - `CORE_API.md`;
    - `n5e-core.zip`.
    Then add the zip to the CI artifact and `release.yml` `files`.
