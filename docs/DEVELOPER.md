# Developer guide

How the N5e system is put together, and how to change it safely. Every source file also starts
with a header comment explaining what it does and how to extend it; this guide ties them together.

- [1. The big picture](#1-the-big-picture)
- [2. Folder map](#2-folder-map)
- [3. Everyday commands](#3-everyday-commands)
- [4. How data flows](#4-how-data-flows)
- [5. Recipes: making common changes](#5-recipes-making-common-changes)
- [6. Automating content](#6-automating-content)
- [7. Testing](#7-testing)
- [8. Releasing](#8-releasing)
- [9. Conventions and gotchas](#9-conventions-and-gotchas)

---

## 1. The big picture

The system separates **rules** from **Foundry**:

- **Rules are data where possible.** Conditions, keywords, skills, skill actions, optional rules,
  Marks, the Inner Gates, damage types: plain objects in `module/config/`. Changing a number or
  adding an entry is a data edit, not a code change.
- **Rules logic is pure functions** in `module/rules/`: given an actor (or numbers), return a
  result or an update. No Foundry calls, so they run and are tested in Node (`npm test`).
- **Foundry glue** lives in `module/workflow/` (dialogs, rolls, chat cards, turn hooks),
  `module/applications/` (sheets and windows) and `module/documents/` (document classes).
- **Sheets print view models.** `module/view-models/` turns an actor into plain data; templates only
  print it. Decisions never live in templates.
- **Content is JSON** in `packs/_source/`. Book text is imported by a script; automation (buttons,
  effects) is added on top by a second script, so re-importing never loses it.
- **Every automated rule can be switched off** in the N5e Rules panel (`module/config/rules.mjs`).

The rules themselves (and King's rulings) live in the context file and the N5e Rules KB; `docs/RULES_MAP.md`
maps each rule to the code that implements it.

## 2. Folder map

```
n5e.mjs                     entry point: what is registered at init / ready (read this first)
system.json                 manifest: document types, packs, styles, version
module/
  config/                   CONFIG.N5E registries (plain data, no Foundry imports)
    core.mjs                abilities, skills, toolkits, progression, ranks, disciplines, DC tables
    conditions.mjs          conditions and States (entry fields documented at the top)
    jutsu.mjs               keywords, stimuli, components, sections, upcast presets
    combat.mjs              damage types, activations, Amps, Marks, 8-Inner Gates
    equipment.mjs           weapon/armor properties, containers, Ammunition Die
    character.mjs           stance/feat categories, skill actions, rests
    rules.mjs               every optional rule (becomes a world setting + the N5e Rules panel)
  rules/                    pure rules functions (tested in Node)
  data/                     data models: stored schema + derived data
    actor/creature.mjs      THE derived-data pipeline (abilities → pools → skills → DR/AC → states)
    fields/shared.mjs       shared field builders, incl. the activity schema
  documents/                Actor / Item / ActiveEffect classes (condition helpers, effect rules)
  dice/                     d20 rules (d20.mjs) and rolling + chat buttons (roll.mjs)
  workflow/                 Foundry-side actions: cast, attack, damage, rests, turns, trackers
  view-models/              actor/item → sheet data (pure)
  applications/             sheets, level-up dialog, N5e Rules panel, GM Party Overview
  advancement/              level-up steps (pure) and applying/reverting a level
  chat/card.mjs             item chat cards
  migration/                V3.1 → 4.0 mapping and the world migration runner
  api.mjs, settings.mjs, socket.mjs, rules-settings.mjs
templates/                  Handlebars templates (each starts with a comment naming its data)
styles/sheet.css            all sheet styles, scoped under .n5e-v2
lang/en.json                labels
packs/_source/<pack>/       compendium sources, one JSON per document (the source of truth)
tools/                      pack, unpack, release, check, install-local, comments-only
tools/content/              build_content.py (books → JSON), automation.py (automation data)
tests/                      node:test suites; helpers/ fakes Foundry's data layer
docs/                       this guide, RULES_MAP.md
```

## 3. Everyday commands

| Command | What it does |
| --- | --- |
| `npm install` | install tooling (once) |
| `npm test` | every test suite (rules, pipeline, view models, templates, workflows' pure parts) |
| `npm run lint` | ESLint |
| `npm run check` | system.json ↔ data models ↔ templates ↔ packs ↔ lang consistency |
| `node tools/comments-only.mjs` | proves an edit changed only comments (for documentation passes) |
| `npm run pack` | compile `packs/_source` JSON into LevelDB packs |
| `npm run unpack` | extract LevelDB packs back to JSON after editing content inside Foundry |
| `npm run install-local` | copy the system into your Foundry Data folder for testing |
| `python3 tools/content/build_content.py <N5e-Rules-KB>` | re-import the books' content |
| `python3 tools/content/automation.py` | re-apply automation data to the pack sources |
| `npm run release -- <version>` | bump version, pack, zip to `dist/` |

Set your Foundry Data path once in `foundry.local.json` (git-ignored):

```json
{ "dataPath": "C:/FoundryData/Data" }
```

Before every commit: `npm test && npm run lint && npm run check`.

## 4. How data flows

### Preparing an actor (every time anything changes)

1. `CreatureData.prepareBaseData` — level, proficiency.
2. `N5eActor.applyActiveEffects` — core effect changes applied; `n5e.*` changes collected.
3. `CreatureData.prepareDerivedData` — the pipeline: item grants → ability mods → pools (HP/CP,
   dice, resources, Stamina) → Mastery → saves/checks/skills → initiative → disciplines → crit range,
   DR, AC → inventory, speed, states → each item's own derived numbers (jutsu cost/DC/attack).

Every derived number is built with a `Breakdown`, stored under `system.breakdowns[key]`, which the
sheet shows on hover. **Derived numbers are never saved**; only the schema fields are.

### Casting a jutsu

`useItem` (sheet) → `castJutsu` (workflow/cast.mjs) opens the dialog → `castPlan` (workflow/cast-plan.mjs,
pure) works out cost, pools, concentration, Chain/Combo, cast options, problems → on Cast, one actor
update applies the plan → `postCastCard` posts the card with activity buttons
(workflow/activity-buttons.mjs).

### Chat card buttons

Cards are HTML stored in chat messages. Buttons carry their data in `data-n5e-*` attributes;
`onRenderChatMessage` (dice/roll.mjs) wires them on every render and dispatches to the right workflow.
Damage buttons post a damage card; its Apply buttons run the damage pipeline (rules/damage.mjs) on the
selected tokens and post a summary with Undo.

### A combat turn

On the active GM's client (workflow/turn.mjs): end of the previous turn (condition decay, Fury/Mark
expiry, effects ending at turn end, resave prompts) → start of the new turn (effects ending at turn
start, Burned/Bleed damage card, upkeep, Chain/Combo reset, action economy, recharge, Flow Focus) →
summary card.

### Players changing things they don't own

`asGM(type, payload)` (module/socket.mjs) runs a handler on the active GM's client: placing Marks,
Brands and Amps on enemies, spending the world Ration Pool.

## 5. Recipes: making common changes

Each recipe ends with: run `npm test`, `npm run lint`, `npm run check`.

### Change a rule's number (proficiency band, Mastery cap, crit cap, rank levels...)
Edit the table in `module/config/` (most in `core.mjs`). The rules functions read the tables.

### Add an optional rule toggle
1. Add an entry to `rules` in `module/config/rules.mjs`: `{ group, type, default, label, hint }`.
2. Where the automation happens, check it: `if ( rule("myRule") ) ...` (import from `rules-settings.mjs`).
It appears in the N5e Rules panel automatically.

### Add a condition
Add an entry to `module/config/conditions.mjs` (fields documented at the top of the file): label,
tags, maxRanks, penalties (`perRank` / `flat` / `flags`), duration behavior (`persists`, `decay`,
`endsAt`), `removal`, `turnStartDamage`. It shows on the token HUD and the rail, jutsu text naming it
gets Apply buttons, and its lifecycle follows its fields. Add a test to `tests/conditions.test.mjs`.

### Add a jutsu keyword
Add it to `keywords` in `module/config/jutsu.mjs`. Release keywords need `affinity` set.

### Add a new kind of effect key
See the header of `module/rules/change-keys.mjs`: field in `emptyModifiers`, a case in
`parseN5eChanges`, a catalog entry (so the effect editor suggests it), then read
`system.modifiers.<field>` where the number is built (usually `data/actor/creature.mjs`).

### Show a new derived number on the sheet
1. Compute it in `data/actor/creature.mjs` (after what it depends on), ideally with a Breakdown.
2. Expose it in the tab's view model (`view-models/character.mjs` or `combat.mjs`).
3. Print it in the template. Add a view-model test.

### Add a button to the character sheet
1. In the template: `<button type="button" data-action="myThing">`.
2. In `applications/actor/character-sheet.mjs`: `myThing: CharacterSheet.#onMyThing` in
   `DEFAULT_OPTIONS.actions`, and `static async #onMyThing(event, target) { ... }`.
3. Put the actual logic in a workflow/rules module and call it from the handler.

### Add a Combat-tab tracker
Pure decision in `rules/trackers.mjs`; Foundry actions in `workflow/trackers.mjs`; a `xxxVM()` in
`view-models/combat.mjs` returned from `combatVM`; a block in `combat.hbs` behind `{{#if vm.xxx.show}}`;
turn-based parts in `workflow/turn.mjs`. Tests in `tests/trackers.test.mjs`.

### Add a stored field to an item or actor type
Add it to the type's `defineSchema` (or a shared template in `data/item/templates.mjs`). Existing
documents get the field's initial value. If the item sheet should edit it, add it to that type's
`DETAILS` list in `view-models/item.mjs`. Renaming or moving a field needs a migration (below).

### Add a new item or actor type
Write the data model, add it to `data/_index.mjs`, add the type (and its `htmlFields`) to
`system.json` `documentTypes`, add its label to `lang/en.json`, give it `DETAILS` in
`view-models/item.mjs`. `npm run check` lists anything missing.

### Add a migration
1. A function that updates world documents; idempotent (running twice changes nothing more).
2. Append `{ id, label, run }` to `MIGRATIONS` in `module/migration/runner.mjs`. Never renumber.
3. If old data must load before the GM runs it, also convert it in the document's `static migrateData`.
4. A test in `tests/migration.test.mjs`.

### Add a GM-relayed action
Add a handler to `HANDLERS` in `module/socket.mjs`; call `asGM("name", payload)` with plain data.

## 6. Automating content

Content has two layers:

1. **Book text** — `tools/content/build_content.py` copies the books' text into
   `packs/_source/<pack>/*.json` (deterministic ids; only files with `flags.n5e.generated` are replaced).
2. **Automation data** — `tools/content/automation.py` patches those files by name with activities,
   transfer effects, feature choices and cast options. `build_content.py` runs it automatically.

Without authored activities, an item's buttons come from its text (`rules/activity-parse.mjs`):
attacks, saves, damage, temp HP and healing in the book's usual phrasing. Authored activities replace
the parsed ones for that item.

### Automate an item
Add an entry under its name in the right table of `automation.py` (STANCES, FEATURES, FEATS, JUTSU),
using the builders documented in that file:

```python
"Iron Fist Stance": {
    "system": {"unarmedAlt": {"die": "1d8", "item": "Combat Bracers", "ability": "str"}},
    "activities": [
        strike("Bone Breaking Strike", minLevel=5, oncePerTurn=True,
               **save("str", "tai", [cond("bruised", label="Bruised")])),
        effect("Bone Breaking Strike: AC penalty", [ch("system.bonuses.ac", "lvl(5:-1,10:-2)")],
               target="targets", expires="turnStart", minLevel=5)]},
```

Then `python3 tools/content/automation.py` and `npm test`.

Building blocks:

| Need | Use |
| --- | --- |
| attack with a changed die, extra dice, Pierce, max die, several attacks | `strike(label, "unarmed"/"weapon", dieSteps=, extraDice=, pierce=, maximize=, attacks=)` |
| a save that applies conditions | `act("save", label, **save(ability, "nin"/"tai"/"gen", [cond(...)]))` |
| a buff or penalty for a while | `effect(label, [ch(key, value)], target="self"/"targets", expires="turnStart"/"turnEnd"/"nextTurnEnd" or seconds=)` |
| temp HP, a named state, an Amp | `effect(..., tempHp="8")`, `state="crash"`, `ampType="will"` |
| "roll this and add it" | `act("roll", label, roll={"formula": ..., "note": ...})` |
| healing / CP / temp HP | `act("heal", label, heal={"formula": ..., "pool": "hp"/"cp"/"tempHp"})` |
| costs a pool | `cost={"pool": "superiorityDice", "amount": 1, "roll": True}` (rolled die = `@poolRoll`) |
| only from a level | `minLevel=5` |
| level scaling | `"lvl(1:1d8,5:2d8,11:3d8)"` in any formula or effect value |
| always-on bonus while owned (stance: while active) | `"effects": [(label, [ch(key, value)])]` |
| a picker on the Features tab | `"flags": {"choice": {"label": ..., "options": {...}}}` |
| an option in the cast dialog | `"flags": {"castOption": {...}}` (fields: top of `rules/cast-options.mjs`) |

A field an activity needs must exist in `activityFields` (`module/data/fields/shared.mjs`), or Foundry
drops it when the item loads.

## 7. Testing

- `tests/helpers/foundry-stub.mjs` fakes Foundry's data fields so the real data models run in Node.
- `tests/helpers/actor.mjs`: `makeActor({ system, items, conditions, n5eChanges, flags })` builds a
  prepared actor; `load(pack, namePart)` reads a pack source.
- Tests that need a rule setting stub it: `globalThis.game = { settings: { get: (s, k) => settings[k] } }`.
- Template tests render every sheet template with Handlebars against real view models.
- What Node can't test: anything that needs a running Foundry (dialogs, chat, hooks). Test the pure
  decision in Node, keep the Foundry part thin, and try it in Foundry before releasing.

## 8. Releasing

1. Bump the version in `system.json` and `package.json` (or `npm run release -- <version>`).
2. Add the version to `CHANGELOG.md`.
3. Commit and push to `main`. GitHub Actions (`.github/workflows/release.yml`) sees a version with no
   release yet, runs the tests, builds, tags `v<version>`, and publishes `system.json` + `n5e.zip`.
   Foundry's manifest URL (`.../releases/latest/download/system.json`) then offers the update.

Pushes that don't change the version publish nothing. Update Foundry from the Setup screen with the
world closed (compendium files are locked while a world is open).

## 9. Conventions and gotchas

- **Optional rules**: wrap every automation in its `rule("...")` check, so the panel can turn it off.
- **Who runs automation**: combat hooks act only on the active GM's client
  (`game.users.activeGM?.isSelf`). Buttons check `actor.isOwner`.
- **Stored vs derived**: write only schema fields. Derived values (`system.dr`, `system.ac`, totals,
  `maxValue`) are rebuilt on every prepare and anything written to them is lost.
- **Item ids in the actor**: active stance and concentration are item ids
  (`system.combat.activeStance`, `system.combat.concentrating`). Stance effects apply only while
  that stance is active (`documents/active-effect.mjs`).
- **Effect flags** the system reads (`flags.n5e.expires`, `state`, `exclusive`, `tracker`,
  `resave`, `gates`) are listed at the top of `documents/active-effect.mjs`.
- **Sets**: schema `set()` fields are JavaScript `Set`s once prepared, but arrays in JSON and in
  tests. Code uses a `list()` helper that accepts both.
- **Templates**: no logic helpers beyond `n5eEq` and `n5eGt`; nest `{{#if}}` blocks. Each sheet part
  must render exactly one root element.
- **CSS**: scope everything under `.n5e-v2` (sheets) or `.n5e-*-card` (chat).
- **Escaping**: anything put into tooltip HTML or data attributes goes through `esc()`.
- **Rulings**: when a rule changes, update the context file's Section 11 changelog, `CHANGELOG.md`,
  and `docs/RULES_MAP.md` if the code location changed.
