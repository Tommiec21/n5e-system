# STD plan: full system standardization (no hard-coded effects)

Status: **plan for a later push (King, 2026-11-14). One of the final passes. Nothing is built. Questions Q-STD1–Q-STD6 below.**

King (2026-11-14): every effect from features, jutsu and feats must interact with the system in a way that can be reviewed in game and is not hard-coded. What can be built with Active Effects should be. Heightened must not be hard-coded: it runs through the Active Effects system, and that system must be robust enough to force advantage or disadvantage on saves without naming a feature in code. This covers all classes, all jutsu, all clans and all feats.

## The standard (what "done" means)

1. **No feature, jutsu, clan or feat is named in code.** Engines read data. No `identifier === "…"`, no `usedIds.has("precise-ninjutsu")`, no feature-specific branches. Engine code may name generic concepts (a condition key, a state key, an effect type), never content.
2. **Every mechanical effect is data a GM can open in game.** Effects are Active Effects on the item, with N5e rule elements, viewed and edited in the effect editor. Buttons are authored activities, and riders and action effects are visible on the item.
3. **Text is display only.** No mechanic is guessed from a description at play time.
4. **Every number on a card names its source.** Bonuses, advantage and disadvantage, rerolls, added ranks and DR changes all list where they came from.
5. **What can't be automated is still data:** a recorded `note` element with the reason, shown on the card. It is never silent.

## Where we are (0.28.0-alpha.1)

| Content | Records | With authored automation | How the rest works today |
| --- | --- | --- | --- |
| Class features and options | 700 | 151 | Text fallback (`activity-parse.mjs`), or nothing |
| Jutsu | 968 | 968 activities, generated from text by the importer | Riders in their text ("the target has disadvantage…", "+2 AC") are not Active Effects |
| Clan records | 1,712 | 0 | Clan data fields plus `workflow/clan.mjs` |
| Feats | 4 imported | 1 | The full feat list isn't imported yet |
| Stances | 24 | 16 | Activities, 2 Active Effects |

**What already exists to build on:**
- Active Effects with N5e change keys (`rules/change-keys.mjs`) and a validated effect editor (`rules/effect-authoring.mjs`).
- **Rule elements** in `flags.n5e.rules` (`rules/elements.mjs`): `modifier`, `degreeShift`, `advantage`, `disadvantage`, with selectors and `all` / `any` / `not` predicates over roll options (`self:state:crash`, `target:status:prone`).
- Activities, cast options, CARD1d riders, effect services and the TURN1 event dispatcher.

**What is hard-coded or text-driven today** (inventory, to be completed in STD0):
- **Feature branches by name:**
  - Precise, Heightened and Piercing Ninjutsu (`workflow/cast.mjs`, `activity-buttons.mjs`);
  - Uncanny Dodge (`rules/uncanny-dodge.mjs`, `reaction-adapters.mjs`);
  - Extra Attack (`rules/features.mjs`);
  - Deflection by Discipline / Weapon Specialist (`rules/deflection.mjs`);
  - Adaptive Initiative (`dice/roll.mjs`);
  - Binding Fury (`workflow/trackers.mjs onWeaponDamage`);
  - Non-clan (`workflow/clan.mjs`).
- **State checks in code:** Crash, Flow, Fury, Combat Rival, Helped.
- **Condition mechanics coded in engines:**
  - advantage sources from Prone, Restrained, Blinded, Invisible, Dodge and others in `rules/advantage.mjs`;
  - auto-fail saves;
  - Bruised, Weakened and Petrified in `damagePlan`.
- **The text fallback:** `effectiveActivities` → `parseActivities(description)`, plus inflicts and conditions read from jutsu text by the importer.
- **Limit of the rule-element engine:** it only reads the roller's own items and effects. It can't express an effect that acts on someone else's roll (Heightened: disadvantage on the target's save), an effect bound to one action, or one that is used up after N matches ("the first save").

## Design

### The automation contract

Every source (feature, jutsu, clan trait, feat, stance, condition, item) expresses its mechanics with exactly these, all visible on the document:

| Channel | Use | Where it lives |
| --- | --- | --- |
| **Active Effects + change keys** | Always-on numbers: bonuses, DR, Mastery, cost changes | `effects` on the item (transfer) or applied to a target |
| **Rule elements** | Contextual roll behaviour: modifiers, advantage/disadvantage, degree shifts, rerolls, dice changes, damage handling | `flags.n5e.rules` on an Active Effect or the item |
| **Activities** | Buttons the source has: attack, save, damage, heal, effect, summon, check, roll | `system.activities` |
| **Action effects** | Effects that exist for one action only (Moldings, Maneuvers, cast options, riders) | An Active Effect on the feature marked `applyTo: "action"`, copied onto the action card when chosen |
| **Trigger elements** | "When X happens, do Y": initiative, turn start/end, hit, failed save, damage dealt or taken, reaching 0 HP | Rule elements with an `on` event, dispatched by TURN1 and the action card |
| **Notes** | What stays at the table, with the reason | A `note` rule element, shown on the card |

### Rule elements v2 (the engine change)

The existing format gains fields. Every addition is generic, validated, and editable in the effect editor.

| Field | Values | Example |
| --- | --- | --- |
| `key` | Existing: `modifier`, `degreeShift`, `advantage`, `disadvantage`. **New:** `autoFail`, `autoSucceed`, `reroll` (`lower` / `higher` / `keep`), `maximizeDice` (count), `minimumDie`, `critRange`, `damage` (extra part), `damageHandling` (`ignoreResistance`, `immunityAsResistance`, `drMultiplier`), `addRanks`, `inflict`, `effect`, `resource`, `note` | Piercing: `damageHandling {ignoreResistance, drMultiplier: 0.5}` |
| `direction` | `self` (my rolls; the default), `imposed` (rolls others make against my action), `against` (rolls others make that target me) | Heightened: `imposed`; Dodge: `against` (attacks against me at disadvantage) |
| `scope` | `always`, `action` (only the action this was chosen for), `turn`, `round` | Moldings: `action` |
| `uses` | How many matching rolls it applies to before it is used up, counted on the action card or on the effect | Heightened: `1` ("the first save") |
| `targets` | `all`, `one` (the user picks), `chosen` | Heightened: `one target of the jutsu` |
| `on` | Trigger events for trigger elements | `failedSave`, `hit`, `turnStart`, `initiative`, `damageTaken` |

**The roll pipeline** (`rollWithSpec`, damage, healing) gathers elements from three directions, then the existing advantage engine counts them. Any advantage and any disadvantage cancel, as now, and every source is listed on the card.
1. **self:** the roller's items and effects (today's behaviour).
2. **imposed:** the action effects on the card the roll is linked to (`source` = the card). A target's save against a Heightened cast reads the card and finds "disadvantage on one target's first save". `uses` counts down on the card.
3. **against:** the effects on the creature being rolled against (attacks against a Dodging creature).

**Heightened, as data:** the Heightened Ninjutsu feature has an Active Effect "Heightened Ninjutsu" with `applyTo: "action"` and the rule element `{key: "disadvantage", selector: "save", direction: "imposed", targets: "one", uses: 1, label: "Heightened Ninjutsu"}`. Choosing it in the cast dialog copies it onto the card. The engine has no line naming Heightened.

### Conditions and states as data

- Each condition's mechanics become rule elements and change keys on the condition definition: Prone, Restrained, Blinded, Invisible, Dodge, Squeezing, Stunned, Petrified, Bruised, Weakened and every other one. Examples:
  - Prone: attacks against it from within 5 ft at advantage, from farther away at disadvantage;
  - Petrified: `autoFail` on Str/Dex saves, `damageHandling` resist all.
- `rules/advantage.mjs` and `damagePlan` then read elements instead of named condition flags.
- States (Crash, Flow, Fury, Combat Rival, Static, Set-Up and Follow Up, Elemental Flux) are Active Effects with a `state` key. What they unlock is rule elements predicated on `self:state:<key>`, which the engine already supports. The code-level state checks go away.

### Reviewable in game

- **Item sheets get an Automation tab:** every channel above in one list, with plain-language summaries generated from the data ("Disadvantage on one target's first save against this cast"), its status (automated / partial / note) and a link to edit.
- **The effect editor supports every element field:** validated, with a catalog, examples and the predicate builder.
- **A GM Automation Audit window** lists world and compendium items by status, and items whose text mentions mechanics no element covers. It is the in-game counterpart of the coverage reports.
- **Every card's breakdown** names each source (already true for modifiers; extended to every element).

### Enforcement

- **`npm run check` gains a no-hard-coding gate:**
  - it fails on new content-name branches in `module/` (`identifier === "…"` and similar);
  - an allowlist holds today's branches and shrinks with each batch until it is empty in STD7.
- **Schema validation of every pack document's elements**, as `npm run riders` does for riders.

## Batches

| # | Batch | Scope | Depends |
| --- | --- | --- | --- |
| STD0 | **Audit and contract** | Complete inventory of hard-coded branches, text-parse paths and per-content coverage; the contract written up for King's approval; the no-hard-coding gate with its starting allowlist; coverage reports per content type | — |
| STD1 | **Rule elements v2** | The new keys and fields (`direction`, `scope`, `uses`, `targets`); the three-direction roll pipeline; `uses` counted on the card; editor and validation support; tests per key | STD0 |
| STD2 | **Action effects** | `applyTo: "action"` effects chosen in the cast dialog and copied onto the card. Moldings, Maneuvers, cast options and CARD1d riders become action effects. Precise, Heightened and Piercing are rebuilt as data, and their code is removed | STD1 |
| STD3 | **Conditions and states as data** | Condition mechanics as elements on the condition definitions; states as Active Effects; `advantage.mjs`, `damagePlan` and the cast checks read elements; the named condition and state branches are removed | STD1 |
| STD4 | **Trigger elements** | `on` events dispatched by TURN1 and the action card (initiative, turn start/end, damage taken, 0 HP, hit, failed save). Uncanny Dodge, Deflection, Extra Attack, Adaptive Initiative and Binding Fury are rebuilt as data, and their code is removed | STD1, STD2 |
| STD5 | **In-game review** | The Automation tab, the generated summaries, the GM Automation Audit window, full breakdowns on cards | STD1–STD4 |
| STD6a | **Classes** (final pass, one class per release; this is FEATAUTO1 under the contract) | Every class feature and option: review table for King, then data. Text fallback off per class once reviewed | STD1–STD5 |
| STD6b | **Jutsu** (final pass, by discipline and release section) | Every jutsu's riders as Active Effects and elements, emitted by an upgraded importer where the pattern is regular; a review table per section for King | STD1–STD5 |
| STD6c | **Clans** (final pass, a few clans per release) | Clan traits, hijutsu, clan conditions and keywords as data. `workflow/clan.mjs` name branches removed | STD1–STD5 |
| STD6d | **Feats** (final pass) | Every feat as data (needs the full feat list imported, Q-STD4) | STD1–STD5 |
| STD6e | **Stances and items** | Stances, weapon properties, coatings, equipment: anything still coded | STD1–STD5 |
| STD7 | **Cleanup and lock** | Text-parse fallback removed for all content; legacy fields retired (`castOption` damage/heal/effect/roll/note and the CARD1d rider shape, migrated into action effects); allowlist empty, so the gate allows no content names; world migration (Q-STD5) | STD6a–e |

Each batch follows the usual rule: a spec, King's approval, build, tests, release, log.

## Questions for King

- **Q-STD1: CARD1d-b.** Build it now as planned (rerolls, maximize dice, resources, extra damage, rider modifiers in the rider format)? Or fold it into STD1/STD2 so those mechanics are born as rule elements and action effects? Proposed: fold, since STD2 would replace CARD1d-b's format anyway.
- **Q-STD2: FEATAUTO1.** Run it as STD6a under this contract (proposed), instead of as a separate earlier release?
- **Q-STD3: order of the final content passes.** Classes, jutsu, clans, feats, then stances and items (proposed)? Or another order?
- **Q-STD4: feats.** Only 4 feats are imported. Import the full feat list (from the feat balancing pass) before STD6d, as its own step?
- **Q-STD5: existing worlds.** After each content pass, should a GM-run migration update the copies of changed items already on actors (with a report of what changed)? Or do GMs re-drag items themselves?
- **Q-STD6: effects that can't be automated.** Record them as `note` elements shown on the card with the reason (proposed)?

## Progress log

- 2026-11-14 Claude: plan written from a survey of the current code and content. Nothing built.
