# SHARED1 function spec: shared rules core

Status: **spec for King's approval (2026-11-14). Nothing built.**

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
| M4 | CI propagation | A System release sends `repository_dispatch` to `n5e-module`; the Module workflow syncs that core version, runs the core and Module tests against dnd5e 5.3.3, and opens a PR. |

## Not in SHARED1

- Moving files out of `module/rules` (the folder stays the boundary; imports don't change).
- New rules. Sharing world data or compendiums.

## Questions for King

- **Q-SH1. Where the core lives.**
  - (a) Inside `n5e-system`: the `module/rules` + `module/config` boundary, published as `n5e-core.zip` with every System release. Recommended: one repo, one version.
  - (b) A new `n5e-core` repository that both projects depend on.
- **Q-SH2. Who builds the Module side (SHARED1b).** The Module's `AGENTS.md` makes it Codex's repo with its own work contract. Should Codex do SHARED1b, or should I? If it's me, this session needs push access to `n5e-module`.
- **Q-SH3. Release propagation.** "A System release triggers a Module rebuild" needs a GitHub token with write access to `n5e-module`, saved as a secret in `n5e-system` (only you can create it). Alternatively the Module checks for a new core on a schedule (daily), which needs no token. Which do you want?
