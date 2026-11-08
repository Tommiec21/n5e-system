# Data reference

Everything the N5e system stores in a world, with where it is written and read. Use this before
adding a field, renaming one (that needs a migration), or writing a macro against the data.

Two rules hold throughout:

- **Stored** data is what a document's `defineSchema()` declares, plus `flags.n5e.*`. It is saved.
- **Derived** data (totals, DCs, AC, `maxValue`, `live`, `breakdowns`, `modifiers`, states) is rebuilt
  on every prepare (`module/data/actor/creature.mjs`). Writing to it does nothing lasting.

Contents:
[Actor system](#1-actor-system-stored) ·
[Actor derived](#2-actor-system-derived) ·
[Actor flags](#3-actor-flags-flagsn5e) ·
[Item fields](#4-item-fields-shared) ·
[Item flags](#5-item-flags-flagsn5e) ·
[Effects](#6-active-effects) ·
[Chat messages](#7-chat-message-flags-and-buttons) ·
[Settings](#8-world-settings) ·
[Hooks](#9-hooks-the-system-listens-to) ·
[Socket](#10-gm-relay-socket) ·
[Formulas](#11-formula-tokens)

---

## 1. Actor system (stored)

Schema: `module/data/actor/creature.mjs` (shared), `character.mjs`, `npc.mjs`.

| Path | Meaning | Written by |
| --- | --- | --- |
| `abilities.<key>.value` | ability score (mods are derived) | sheet, level-up ASI, effects (UPGRADE: Forceful Bull) |
| `saves.<key>.proficient`, `skills.<key>.proficient`, `skills.<key>.ability`, `skills.<key>.bonus` | proficiency checkboxes, the skill's ability, a flat/formula bonus | sheet |
| `tools.<key>.proficient` | toolkit proficiency | sheet |
| `mastery.sources[]` | `{target: "skill.ath", source}` Mastery sources added by hand or level-up | sheet, level-up |
| `hp.value`, `hp.temp`, `cp.value`, `cp.temp` | current pools (max is derived) | damage/heal, rests, sheet |
| `hitDice.spent`, `chakraDice.spent` | dice spent (max = level, value = max − spent) | Short/Long/Full Rest |
| `deathSaves.success / failure` | 0-3 each | death saves, damage at 0 HP, rests |
| `disciplines.<nin\|tai\|gen>.ability` | casting ability per discipline (Bukijutsu uses Taijutsu) | sheet |
| `affinities`, `keywordAccess` | set on the actor itself (items add more when prepared) | sheet |
| `attributes.ac.calc / flat / formula` | AC method (`default`, `martialTechnique`, `flat`, `formula`) | sheet, effects (Martial Technique) |
| `traits.dr`, `traits.pierce`, `traits.resist / vuln / immune`, `traits.conditionResist / conditionImmune`, `traits.senses.*`, `traits.speed.*`, `traits.size`, `traits.languages` | base defenses and senses | sheet, NPC stat blocks |
| `combat.chain.value / active / used` | Bukijutsu Chain 0-3 | cast plan, turn start, sheet |
| `combat.comboTargets` | creatures a Combo affected | (reserved) |
| `combat.fury` | Fury stacks (cap: 1 + `n5e.fury.max`) | Fury tracker, Binding Fury, turn end |
| `combat.activeStance` | id of the active stance item | sheet (Enter / Leave) |
| `combat.concentrating[]` | ids of jutsu concentrated on, in start order (upkeep order) | cast plan, turn start, concentration checks |
| `resources.<id>.value` (and optional overrides) | current value of a pool; the pool's definition comes from an item (`resourcePools`) or the Stamina rule | spending, rests, sheet |
| `willOfFire.value` | 0-3 | natural 1/20 award, spending on a roll card |
| `bonuses.*` | flat numbers for effects to ADD to: `ac`, `initiative`, `hpMax`, `cpMax`, `hpPerLevel`, `cpPerLevel`, `inventorySlots`, `speed`, `attack.<disc>`, `saveDC.<disc>`, `save`, `check` | Active Effects only |
| `details.biography` | rich text | sheet |

Resource pool ids in use: `focus` (Ninjutsu Specialist), `superiorityDice` (Scout-Nin, die d8),
`pyroclasm` (Blaze Walker, max 3, starts empty), `ocularCharges` (Uchiha), `stamina` (optional rule).

## 2. Actor system (derived)

Rebuilt every prepare; read these, never write them.

| Path | Meaning |
| --- | --- |
| `level`, `prof` | character level, proficiency bonus |
| `abilities.<key>.mod / check / save` | modifiers |
| `saves.<key>.total`, `skills.<key>.total / mastery / passive / isProficient`, `tools.<key>.isProficient` | roll bonuses |
| `hp.max`, `cp.max`, `hitDice.max / value / die`, `chakraDice.*` | pool maxes and dice |
| `resources.<id>.maxValue` | evaluated pool max (`"1 + @prof"`, `@scale.scoutNin.superiorityDice`) |
| `disciplines.<disc>.mod / attack / dc` | jutsu numbers per discipline |
| `initiative.total`, `ac.value`, `dr`, `pierce`, `critRange.<scope>`, `speed.*` | combat numbers |
| `concentration.max / dcBase` | concentration limit and base DC |
| `modifiers` | parsed `n5e.*` effect changes (`rules/change-keys.mjs emptyModifiers`) |
| `conditionPenalties` | summed condition rank penalties (`rules/conditions.mjs`) |
| `grants` | what items grant: skills, tools, saves, affinities, keywords, Mastery, class/clan/background items, pools, `scale` (class table columns) |
| `states.bloodied / drained / ...` | computed states |
| `breakdowns[key]` | each total's parts, for the sheet's hover tooltips |
| item `system.live` (jutsu) | cost, DC, attack, ability, castable, upcast ranks for this owner |
| item `system.uses.maxValue` | evaluated limited-use max |

## 3. Actor flags (`flags.n5e.*`)

| Flag | Meaning | Written / read |
| --- | --- | --- |
| `economy` | `{action, bonus, reaction, special, object}` used this turn | cast plan, attacks, Combat tab; reset at turn start |
| `concentrationPaid.<itemId>` | CP paid when the jutsu was cast (upkeep = half) | cast plan; turn start, concentration tracker |
| `chainTouched` | a Chain jutsu raised or kept Chain since the turn began (no reset) | cast tracking; turn start |
| `combo` | `{id, name}` armed Finisher window this turn | cast tracking; turn start clears |
| `optionTurn.<optionId>` | `{round, turn}` a once-per-turn cast option was last used | cast plan |
| `pyroTurn` | `{round, turn}` Pyroclasm was last gained | cast plan |
| `furyGained`, `furyTurnGain` | `{round, turn}` Fury last gained / last gained from Binding Fury | Fury tracker; turn end |
| `chilledMove` | `{round, turn, feet, triggered}` movement this turn while Chilled | `moveToken` hook |
| `gates.cooldownUntil` | world time the Inner Gates can reopen | closing the gates |
| `rest` | `{srSinceLr, lrSinceFr, lastLr, lastFr}` rest counters | rests (rest limits) |
| `wofEncounter` | combat id the encounter's Will of Fire was already awarded in | roll workflow |
| `pins` | item ids pinned to the Main tab | sheet |
| `migratedFrom`, `legacy.*`, `legacyType`, `review` | V3.1 migration markers and unmapped values | migration |

## 4. Item fields (shared)

Field builders: `module/data/fields/shared.mjs`; per-type schemas in `module/data/item/`.

| Field | On | Meaning |
| --- | --- | --- |
| `identifier` | all | stable slug other data refers to (`superior-assault`, `scout-nin`) |
| `description`, `source` | all | rich text; book citation |
| `activation`, `target` (range/area), `duration`, `uses` | activatable types | `uses.per`: turn, round, encounter, sr, lr, rest, rest10m, fr, day, recharge; `uses.recharge`: "5-6" |
| `activities[]` | activatable types | authored activities (below); replace the text parser's for that item |
| `featureType` | feats, stances | `active` / `passive` |
| `resourcePools[]` | class, subclass, clan, feat | pool definitions: `id, label, max, die, recovery[{on, amount, requires}]` |
| `advancement[]` | class, subclass, clan | level-keyed grants: feature, itemChoice, trait, mastery, asi... |
| `grants.mastery / proficiencies / jutsu / keywords` | feat | `proficiencies`: `"skill.ill"`, `"tool.disguise"` (Mastery instead when already proficient) |
| `unarmedDie`, `unarmedType`, `unarmedAlt {die, item, ability}` | stance | Unarmed damage while active (`rules/unarmed.mjs`) |
| `categories` | stance | taijutsu, bukijutsu, chakra, clan |

**Activity fields** (`activityFields()`): `id, type, label, text, minLevel, oncePerTurn, activation,
cost {pool, amount, roll, choose}, attack {discipline, range, count, bonus}, save {abilities, dc
{source}, onSuccess, fourTier, resave, tiers}, inflicts [{key, kind, ranks, label}], damage {parts
[{formula, type}], pierce, ignoreDR}, heal {formula, pool}, strike {kind, dieSteps, extraDice, pierce,
maximize, attacks}, effect {name, target, changes, expires, seconds, tempHp, state, exclusive, ampType},
roll {formula, note}, condition, summon, movement, check, riders`. Types with buttons today: attack,
save, damage, heal, effect, roll (`workflow/activity-buttons.mjs`). A field not in the schema is
dropped when Foundry loads the item.

## 5. Item flags (`flags.n5e.*`)

| Flag | Meaning | Read by |
| --- | --- | --- |
| `generated` | written by `tools/content/build_content.py` (re-imports replace it) | importer |
| `advancement` | `{origin, level, step}`: which level-up granted this item | Remove level |
| `asi.<level>` (on the class) | what that level's ASI chose | Remove level |
| `choice` | `{label, options: {value: label}, value}` feature picker on the Features tab | `rules/features.mjs` (`switch-hitter`, `jack-of-all`) |
| `castOption` / `castOptions[]` | options a feature adds to the cast dialog (fields: `rules/cast-options.mjs` header) | cast plan |
| `weaponDie` (on a stance) | `{mod: "r<3", property: "heavy"}` weapon damage die rule while active | `workflow/attack.mjs` |

## 6. Active Effects

Types (`module/data/effect/effects.mjs`): `generic`, `condition` (`system.key`, `ranks`,
`sourceRank`), `state` (`key`, `target`), `amp` (`ampType`, `sourceUuid`), `stance`, `concentration`.

Item effects with `transfer: true` apply to the owner; a **stance's** only while it is the active
stance (`documents/active-effect.mjs isSuppressed`). Changes whose key starts with `n5e.` are parsed
into `system.modifiers` (`rules/change-keys.mjs`), not applied by Foundry.

| Effect flag | Meaning | Read by |
| --- | --- | --- |
| `expires` | `{at: turnStart\|turnEnd\|nextTurnEnd, sourceUuid, placed}`: ends on the source creature's turn | `rules/trackers.mjs expiringEffects`, turn hooks |
| `state` | named state: `crash`, `flow`, `combatRival` | cast options, turn start (Flow Focus), concentration checks, combat end |
| `exclusive` | group: applying one removes the others (`surge`) | `applyActivityEffect` |
| `tracker` | `{kind: mark\|branded, jutsu, sourceUuid, sourceName, placed}` | Mark expiry |
| `resave` | `{ability, dc, label, applied}`: repeat the save at the end of the creature's turns | turn end card |
| `gates` | `{n}`: the 8-Inner Gates effect, highest open gate | Gates tracker, cast plan |
| `removalDC` | added to a condition's removal DC (Sealed failures) | Try to end |
| `automation` | transfer effect written by `automation.py` (re-runs replace it) | automation script |

## 7. Chat message flags and buttons

| Flag | On | Meaning |
| --- | --- | --- |
| `cast` | cast card | `{itemUuid, actorUuid, rank, cost}` |
| `roll` | d20 roll card | `{type, key, mode, bonus, natural, label, kind, actorUuid, ...}` |
| `actorUuid`, `itemUuid`, `rank` | item cards, damage cards | the source |
| `damage` | damage card | `{instances [{amount, type}], total, crit, pierce, genjutsu, ignoreDR, targetUuid}` |
| `undo` | apply summary | snapshots restored by Undo |
| `turnStart` | turn card | marks a start-of-turn summary |

`data-n5e-area="<item uuid>"` + `data-rank` on a cast card places that jutsu's area (`workflow/areas.mjs`).

Text links (`a.n5e-link[data-n5e-link]`, from `[[/save]]` and the other shortcuts in `docs/TEXT_SHORTCUTS.md`) carry
`data-spec` (the parsed shortcut, JSON) and `data-source-uuid`; one document-level click listener handles them
(`applications/enrichers.mjs`).

### Area templates (MeasuredTemplate `flags.n5e`)

| Flag | Meaning |
| --- | --- |
| `actorUuid`, `itemUuid`, `itemId` | caster and jutsu |
| `rank` | cast rank (upcast area size, buttons on reminder cards) |
| `lifetime` | `concentration` \| `rounds` \| `turn` \| `manual` (`rules/area.mjs areaLifetime`) |
| `expires` | `{round, turn}` for `rounds` areas |
| `originToken` | the caster's token id for Self areas (left out of targeting and reminders) |
| `casterCombatant` | the caster's combatant id when placed in combat |

Token `flags.n5e.manualVision = true` stops sheet senses from overriding that token's vision.

Button attributes are listed in the header of `workflow/activity-buttons.mjs`; the click dispatch
for every `data-n5e-*` attribute is `onRenderChatMessage` in `dice/roll.mjs`.

## 8. World settings

One per rule in `module/config/rules.mjs` (key = rule key, `config: false`, edited in the
**N5e Rules** panel registered as the `rulesConfig` menu). Read with `rule("key")`
(`module/rules-settings.mjs`). Plus `migrationVersion` (`module/migration/runner.mjs`): the last
migration that ran in this world.

## 9. Hooks the system listens to

| Hook | Where | Does |
| --- | --- | --- |
| `init`, `ready` | `n5e.mjs` | registration; migrations and the GM socket at ready |
| `renderChatMessageHTML` | `n5e.mjs` → `dice/roll.mjs onRenderChatMessage`, `workflow/turn.mjs onRenderTurnCard` | wires card buttons |
| `combatTurnChange`, `combatStart` | `workflow/turn.mjs` | end/start of turn automation (active GM) |
| `moveToken` | `workflow/turn.mjs` → `trackers.mjs onTokenMove` | Chilled |
| `createActiveEffect` | `workflow/turn.mjs` → `trackers.mjs onAmpCreated` | Amp limit |
| `deleteCombat` | `workflow/turn.mjs` | Combat Rival markers end |
| `updateActor` | `workflow/areas.mjs` | concentration areas leave the map when concentration ends |
| `getSceneControlButtons` | `applications/gm/party-overview.mjs` | GM Party Overview button |
| `updateActor`, `create/update/deleteActiveEffect`, `updateCombat`, `create/deleteCombatant` | party overview | live refresh |

## 10. GM relay (socket)

`module/socket.mjs`: `asGM(type, payload)` runs on the active GM's client (directly when the caller
is a GM). Handlers: `spendRations {amount}`, `createEffects {actorUuid, effects}`,
`deleteEffects {uuids}`. Payloads must be plain data.

## 11. Formula tokens

| Token | Meaning | Resolved by |
| --- | --- | --- |
| `@prof`, `@abilities.str.mod`, ... | Foundry roll data (`actor.getRollData()`) | Roll |
| `@scale.<classCamelCase>.<column>` | class table column at the class's level | pool max, formulas |
| `@unarmed` | the actor's Unarmed damage formula | damage buttons |
| `@wdie` | one more weapon damage die (strikes) | `strikeAttack` |
| `@level` | character level | `rules/unarmed.mjs resolveFormula` |
| `lvl(1:1d8,5:2d8,11:3d8)` | value for the highest level reached (0 below the first) | `resolveFormula` |
| `@poolRoll` | the pool die rolled when paying an activity's cost | activity clicks |
| `@amount` | how many of a pool the player chose to spend | activity clicks, cast options |
# Maintenance additions (0.10.0-alpha.1)

- `flags.n5e.activityUsage.<itemId>`: last successful once-per-turn use as `combatId:round:turn`.
  Alternative buttons share the item key. Old stamps expire by comparison, not by timed deletion.
- World setting `migrationFailures`: `{migration, errors: [{uuid, error}]}` when an upgrade fails;
  the previous `migrationVersion` is retained. Cleared after a successful migration step.
- Activity schema now stores `cost.gain`, `cost.choose` and `save.resave` booleans. Omitted cost
  amount defaults to 1; an explicitly authored 0 remains zero.
- Public `game.n5e.api.runSmokeTests()` performs an opt-in, unsaved-document Foundry check.
- Extension hooks: `n5e.preActivity`, `n5e.activityComplete`, `n5e.registryChanged`.
- Socket messages use `{requestId,type,payload}` and acknowledgement `{responseTo,ok,error}`.
  Sender claims are not authorization. Remote privileged changes require GM review; remote
  document deletion is unsupported. See [MAINTENANCE.md](MAINTENANCE.md).

