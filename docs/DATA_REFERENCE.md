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


## Added in 0.14.0 (OPS1)

| Field / flag | On | Meaning |
| --- | --- | --- |
| `system.allied` | NPC (usually on a token delta) | Allied NPC: player-summoned and player-controlled |
| `flags.n5e.allied = {ownerId, casterUuid, itemId}` | Token | Who summoned it and owns it |
| `flags.n5e.intents.<id> = {type, data, at}` | Actor | A pending owner intent (written by an owner, processed once by the active GM) |
| `flags.n5e.intentResults.<id> = {ok, result \| error}` | Actor | The intent's result; removed by the requester once read |
| `flags.n5e.dependentOn = {actorUuid, itemId}` | ActiveEffect | Ends when that actor stops concentrating on that jutsu |
| `flags.n5e.effectApplication = {effects, recipients, sourceUuid, concentrationItemId}` | ChatMessage | Effect-application card |
| `flags.n5e.rollRequest = {type, key, dc, label, entries}` | ChatMessage | GM roll request |
| `flags.n5e.roll.targets = [{uuid, name, ac}]`, `flags.n5e.roll.total` | ChatMessage | Attack target snapshot |

## Added in 0.15.0 (TURN1)

| Field / flag | On | Meaning |
| --- | --- | --- |
| `flags.n5e.upkeepPending = {combatId, round, turn, ids}` | Actor | Open upkeep decision; cleared when the owner answers, at turn end (unanswered jutsu end) or when combat ends |
| `system.uses.per` = `turn` / `round` / `encounter` | Item | Now recovered in combat (start of own turn / each round / combat start and end) |
| `system.resources.<id>.recovery[].on` = `turn` / `round` / `encounter` | Actor | Same periods for resource pools |

## Added in 0.15.0-alpha.3

| Field / flag | On | Meaning |
| --- | --- | --- |
| `flags.n5e.applied = "auto"` | Condition effect | Applied by a game effect, not by hand. Out of combat, "end of next turn" conditions with this tag end immediately. |

## Added in 0.15.0-alpha.4 (DMG1)

| Field / flag | On | Meaning |
| --- | --- | --- |
| `flags.n5e.damage.dealtPenalty` | Damage card | The source's Weakened + Exhaustion penalty, taken off when applied (first type first) |

## Added in 0.15.0-alpha.7 (CAST1)

| Field / flag | On | Meaning |
| --- | --- | --- |
| `flags.n5e.rollMode = {d20, damage, healing, other}` (each `advantage` / `disadvantage`; missing = Normal) | Actor | Roll modes from the Effects tab (0.15.0-alpha.8). A single string from alpha.7 applies to all groups. |
| `flags.n5e.economy.attackOrJutsu` | Actor | An attack or jutsu happened this turn (Shocked); reset at turn start |

## Added in 0.15.0-alpha.9 (CONC1)

| Field / flag | On | Meaning |
| --- | --- | --- |
| `flags.n5e.readied.<itemId> = {trigger, rank, cost, readiedAt}` | Actor | A readied jutsu, held in `system.combat.concentrating` |
| `flags.n5e.dependentOn` | ActiveEffect | Now also set by activity effects, Amps and Branded from concentration jutsu |

## Changed in 0.16.0-alpha.1 (DATA1a)

| Field | On | Meaning |
| --- | --- | --- |
| `system.disciplines` (set of `nin`/`tai`/`gen`) | Jutsu | Every listed discipline; `system.discipline` is the default cast discipline. `buki` is no longer stored: Bukijutsu = `tai` + keyword `bukijutsu`. |
| `system.keywords` | Jutsu, clan, feat | Canonical camelCase keys; a keyword with a value is stored as `key:value` |
| `system.category` | Feat item | Feature kind (`classFeature`, `classFeatureOption`, `clanFeature`, `clanFeatureOption`, `npc…`) or `feat` |
| `system.keywords` (new) | Feat item | Feats: group keywords (`general`, `skill`, `chakra`, `ninjutsu`, `genjutsu`, `taijutsu`, `critical`, `clan`, `class`, `archetype`, `rare`) |

## Changed in 0.16.0-alpha.2 (DATA1b)

| Field | On | Meaning |
| --- | --- | --- |
| `system.keywords` (new) | Weapon | Includes the weapon's base keyword (`kunai`, `battleWire`) |
| `system.weaponProficiencies` | Class | `category:group` pairs (`simple:blade`) or base weapon keys; whole categories are written out as every group. Free-choice text ("one exotic") is kept as text |
| `system.grants.weaponProf` (derived) | Character, NPC | Every weapon pair and base key granted by classes and feats (feat entries `weapon.<pair or key>`) |
| `system.proficient` | Weapon | `false` is now a manual override; otherwise proficiency is decided from `grants.weaponProf` |
| Migration 4 `migrateWeapons` | World | Adds weapon base keywords and expands class weapon grants |

## Added in 0.16.0-alpha.3 (DATA2)

| Field / data | On | Meaning |
| --- | --- | --- |
| Unarmed Strike item (`system.identifier = "unarmedStrike"`, `flags.n5e.unarmedStrike = true`, group `unarmed`) | Character, NPC | Added on create and by migration 5; can't be deleted (unless `options.n5eForce`), unequipped or duplicated |
| `CONFIG.N5E.unarmedStrike` | Config | The item data |
| `CONFIG.N5E.weaponGroups.unarmed` | Config | Group label for the Unarmed Strike |
| Weapons compendium | `packs/_source/equipment` | 55 Chapter 5 weapons in Simple / Martial / Exotic Weapons folders; `system.target.range` is reach for melee weapons, the range for ranged ones |
| Migration 5 `addUnarmedStrikes` | World | Adds the Unarmed Strike to existing characters and NPCs |

## Added in 0.17.0-alpha.1 (ATK1a)

| Field / flag | On | Meaning |
| --- | --- | --- |
| `system.bonuses.attack.weapon` / `.unarmed` | Character, NPC | Flat attack bonus for weapon / unarmed attacks (AE target) |
| `system.bonuses.damage.weapon` / `.unarmed` | Character, NPC | Flat damage bonus |
| `system.weaponBonuses.{weapon,unarmed}` (derived) | Character, NPC | `{attack: [{label, value}], damage}`: bonuses, `n5e.attack/damage.*` effects and Mastery (`attack.weapon`, `attack.unarmed`) |
| `n5e.damage.<weapon|unarmed>` | Active Effect change key | + damage on weapon or unarmed attacks |
| `flags.n5e.jammed` | Weapon | A Volatile weapon that backfired; cleared by Unjam (Action) |
| `flags.n5e.backfired` | Chat message | The attack backfired; no damage |
| `system.ammo` on Thrown weapons without Ammunition | Weapon | d4 Ammunition Die, steps `[4, 1, 0]` (migration 6) |
| `data-attack-mode` | Combat-tab pill | `thrown`, `twoHanded`, `bonus` or `unjam` |

## Added in 0.17.0-alpha.2 (ATK1b)

| Field / flag | On | Meaning |
| --- | --- | --- |
| `system.evocation = {discipline, type}` | Weapon (Evocation) | The sealed echo: `nin`, `gen` or `tai` (Weapon echo), and its damage type |
| `flags.n5e.economy.attackAction` | Actor | Took the Attack action this turn (reset at turn start) |
| `flags.n5e.economy.lightAttack` | Actor | Used the Light extra attack this turn (reset at turn start) |
| Strike data `weapon: {keywords, groups, properties}` | Activity `strike` | Optional: which equipped weapons the strike can use |
| `data-attack-mode="light"` | Combat-tab pill | The Light extra attack |
| Removed: `CONFIG.N5E.coreActions.offhand` | Config | King: Chapter 5 Light instead of the Chapter 8 Bonus Action off-hand attack |

## Added in 0.18.0-alpha.1 (MDISC1)

| Field / flag | On | Meaning |
| --- | --- | --- |
| `system.liveByDiscipline.<nin|tai|gen>` (derived) | Jutsu | `{discipline, ability, attack, dc, meetsRequirement, cost, ...}` per listed discipline; `system.live` is the default discipline's |
| `JutsuData#liveAs(discipline)` | Jutsu | The live numbers when cast as that discipline |
| `flags.n5e.castDiscipline.<itemId>` | Actor | The discipline a concentration jutsu was cast as; honoured while it is concentrated |
| `flags.n5e.cast.discipline` | Cast chat message | The discipline the jutsu was cast as |
| `castPlan(..., {discipline})` → `plan.discipline` | Workflow | Cast-as choice |

## Added in 0.19.0-alpha.1 (RES1)

| Field / flag | On | Meaning |
| --- | --- | --- |
| `flags.n5e.roll.source` | Attack / save roll message | Id of the card whose button made the roll |
| `flags.n5e.roll.onSuccess` | Save roll message | `half` or `none`: the damage share on a success |
| `flags.n5e.roll.name` | Roll message | The roller's name (per-target rows) |
| `data-on-success` | Save button | From the save activity's `onSuccess` |
| `data-target` on `data-n5e-apply` | Damage card per-target row | Apply to that creature (sets `targetUuid`) |

## Added in 0.20.0-alpha.1 (POS1)

| Field / flag | On | Meaning |
| --- | --- | --- |
| Statuses `coverPartial`, `coverHalf`, `coverTotal` | Token / actor | Cover set by the GM; the highest applies |
| `system.cover` (derived) | Character, NPC | The cover that applies, or null |
| `flags.n5e.economy.disengaged` | Actor | Disengage used this turn (reset at turn start) |
| `flags.n5e.engaged.<otherActorId>` | Actor | Round of the last melee attack between the two |
| `flags.n5e.surpriseDone` | Actor | A Surprised creature's first turn has ended (Reactions allowed); cleared at round 2 |
| `flags.n5e.opportunity` | Chat message | `{attackerUuid, targetUuid}` on an Opportunity Attack reminder |
| `mode: "opportunity"` | `attackWithWeapon` | Spends the Reaction; no range check |

## Added in 0.21.0-alpha.1 (ENV1a)

| Field / flag | On | Meaning |
| --- | --- | --- |
| RegionBehavior type `hostileTerrain` `{terrain, rank}` | Region | Hostile terrain: extremeHeat, extremeCold, toxic, chakraResistant; rank D–S |
| `flags.n5e.terrain` | Chat message | The Direct Exposure card: `{actorUuid, dc, damage, damageType, label}` |
| `flags.n5e.breath` | Actor | Turns of breath left while Suffocating (combat) |

## Added in 0.22.0-alpha.1 (SKILL1)

| Field / flag | On | Meaning |
| --- | --- | --- |
| `flags.n5e.contest` | Contest card | `{key, initiatorUuid, targetUuid, total}` |
| `flags.n5e.skillOutcome` | Outcome card | `{key, result, margin, targetUuid, statuses}` |
| `data-n5e-contest`, `data-n5e-skill-apply` | Chat buttons | Defender's contest roll; apply a status to the target |

## Added in 0.23.0-alpha.1 (SKILL1b, ENV1b)

| Field / API | On | Meaning |
| --- | --- | --- |
| `game.n5e.api.fall(actor, feet)` | API | Posts the fall damage card (Option A) |
| `flags.n5e.fall` | Chat message | `{feet, dice}` on a fall damage card |

## Added in 0.25.0-alpha.1 (CLASH1)

| Field / flag | On | Meaning |
| --- | --- | --- |
| `flags.n5e.clash` | Clash card | `{skill, contests, triggerDiscipline, a, b}`; sides `{actorUuid, name, item, rank, bonus, masteryRanks, advantage}` |
| Roll `flags.n5e.roll.source` = Clash card id | Clash rolls | Each side's checks, read by the card per actor |
| `data-n5e-clash`, `data-n5e-clash-roll`, `data-n5e-clash-lose` | Chat buttons | Start a clash; roll a side; apply the loss |

## Added in 0.26.0-alpha.1 (SHARED1a)

| File / API | Meaning |
| --- | --- |
| `core.json` | Shared-core manifest: roots, host hooks, tests folder, forbidden host names |
| `module/rules/settings.mjs` `setRuleProvider`, `rule` | Optional rules for the core; hosts provide the values |
| `module/rules/host.mjs` `setHost`, `n5eConfig` | The live N5E registry for the core; static config fallback |
| `module/adapters/system.mjs` | System adapter (game.settings, CONFIG.N5E); first import of `n5e.mjs` |
| Release asset `n5e-core.zip` | The core bundle for the Module (`index.mjs`, `CORE_API.md`, `tests/core`) |
| `npm run test:core` | Core tests in isolation (part of `verify`) |

## Added in 0.27.0-alpha.1 (CARD1a)

| Path | On | Meaning |
| --- | --- | --- |
| `flags.n5e.card` | Cast card, feature card, weapon attack roll | `{version: 1, kind: jutsu\|attack\|feature, actorUuid, itemUuid, rank, discipline, targets: [{uuid, name, img, ac}], sections: [...], results}` |
| `flags.n5e.card.results` | same | `{attack: {total, natural, threshold, targets, messageId}, damage: {total, crit, messageId}, saves: {[actorUuid]: {degree, fourTier, onSuccess, name, messageId}}, applied: {[actorUuid]: {mode, messageId, undone}}}`. Written by the card's author or the GM |
| `flags.n5e.undone` | Damage-applied summary | Set by its author (or a GM) when Undo is used |
| Owner intent `cardResult` | Actor | `{cardMessageId, linkedMessageId, undoneTarget}`: the GM records another user's linked result after checking the linked message |
| Rule `actionCard` | World setting | Single action card on (default) or off |

## Added in 0.27.0-alpha.2 (CARD1b)

| Path | On | Meaning |
| --- | --- | --- |
| `flags.n5e.card.areaPlaced` | Action card | An area was placed from the card; its covered tokens were added to `targets` |
| `flags.n5e.card.results.effects` | Action card | `{[actorUuid]: [{messageId, effects: [{uuid, label}], undone}]}` |
| `flags.n5e.cardEffects` | Effect note | `{sourceUuid: <action card uuid>, recipients: [{actorUuid, effects: [{uuid, label}]}]}`; `flags.n5e.undone` once undone |

## Added in 0.27.0-alpha.3 (CARD1c)

| Path | On | Meaning |
| --- | --- | --- |
| `flags.n5e.roll.rerollOf` | Will of Fire reroll | Id of the roll it rerolls; on an action card the reroll replaces it. A reroll of a weapon-attack card also gets `roll.source` = that card |
| `flags.n5e.damageApplication.recipients[].concentration` | Damage-applied summary | `{dc, jutsu: [ids], names}`: the concentration check this damage calls for |
| `flags.n5e.card.results.applied[uuid].reaction` / `.concentration` | Action card | The damage reaction (`{label, reduction, multiplier}`) and the concentration check, copied from the summary |

## Added in 0.28.0-alpha.1 (CARD1d-a)

| Path | On | Meaning |
| --- | --- | --- |
| `flags.n5e.riders` | Feature | Trigger riders (`docs/RIDERS.md`); written from `content/riders/<class>.json` by `npm run riders` |
| `flags.n5e.castOption(s)[].rider` | Feature | A cast rider: chosen and paid in the cast dialog, then written onto the card |
| `flags.n5e.riderTurn.<featureId:index>` | Actor | Once-per-turn use of a trigger rider (`{round, turn}`) |
| `flags.n5e.card.riders` | Action card | `[{key, id, itemUuid, arm, label, when, requires, effects, poolRoll, choice, targets, targetMode, paid, undone}]` |
| `flags.n5e.card.eventSave` | Action card | `{key, ability, dc}`: the rider save chosen as the event's one save, when the action forces none |
| `flags.n5e.cardEffects.recipients[].effects[].source` | Effect note | The button that applied it (`src:i:j`, `act:i`, a rider application id), so it shows once |
| `flags.n5e.riderFrom` | Active effect | The caster whose rider placed it (limited marks such as Static) |

## Added in 0.29.0-alpha.1 (FIN1)

| Path | On | Meaning |
| --- | --- | --- |
| Owner intent `transferItem` | Actor (the giver) | `{itemId, targetUuid, quantity}`: the GM moves the item after re-checking ownership, quantity and the receiver |
| World migration 7 | World | Unarmed Strike for unlinked tokens |

## Added in 0.29.0-alpha.2 (FIN2a)

| Path | On | Meaning |
| --- | --- | --- |
| `flags.n5e.heldBy` | ActiveEffect (Grappled or Restrained) | UUID of the actor holding the creature; set when the status is applied from Grapple or Pin. Read by `holdsOn(actor)` |
| `flags.n5e.actorUuid` | ChatMessage (skill action outcome) | The acting creature, for the hold and weapon buttons |
| Skill actions `escape`, `escapeAcrobatics` | `config/character.mjs` | Athletics or Acrobatics vs the holder's Athletics; result `release` |
| Attack mode `skill:<key>` | Combat tab weapon pill | Runs skill action `<key>` with the weapon (Disarm/Trip properties) |

## Added in 0.29.0-alpha.3 (FIN2b)

| Path | On | Meaning |
| --- | --- | --- |
| `flags.n5e.state` = `counterTag:<rank>` | ActiveEffect | A Counter Tag on the creature; absorbs the next single-target jutsu of that rank or lower |
| `flags.n5e.state` = `suppressionTag:<rank>` | ActiveEffect | Chakra Suppression Tag; `castBlockers` refuses Ninjutsu and Genjutsu below that rank |
| `flags.n5e.state` = `chakraSuppressed`, `flags.n5e.suppression {score, reattempts}` | ActiveEffect | Suppress Chakra, 10 minutes |
| `flags.n5e.state` = `readEnemy`, `flags.n5e.readEnemy {cardId}` | ActiveEffect | The +1 saves and AC benefit, 1 round |
| `flags.n5e.readEnemy {cardId, discipline, jutsu, readerUuid, used}` | ChatMessage (Read the Enemy result) | The benefit buttons read it |
| `flags.n5e.counterTag {cardId, targetUuid}` | ChatMessage | The jutsu on that card was absorbed for that creature |
| Activity `save.dc.source: "fixed"` | Item activities | The DC is the number in `save.dc.formula` (tools with their own DC) |

## Added in 0.30.0-alpha.1 (NPC1a): NPC actors

| Path | Meaning |
| --- | --- |
| `system.details.build` | `adversary` (Bingo Book math; the default for new NPCs since 0.30.0-alpha.2) or `character` (player-style; saved NPCs without the field) |
| `system.details.class` | minion, standard, elite, solo (was `details.role`) |
| `system.details.role` | none, striker, defender, lurker, controller, supporter |
| `system.details.clan`, `.affiliation`, `.iconic`, `.epic`, `.blurb`, `.publicNotes`, `.privateNotes` | Profile and notes |
| `system.adversary.mods.<ability>` | Assigned ability modifiers (the score is derived as 10 + 2 × modifier) |
| `system.adversary.fullSaves` | Fully proficient saves the GM picked; empty = the highest modifiers |
| `system.adversary.armor`, `.hpSource`, `.partySize`, `.rankBonus`, `.freeformAbility` | Armor type; formula or Lazy GM; Solo party size; Rank bonus switch; Weapon/Freeform ability |
| `system.adversary.overrides` | `prof`, `ac`, `dr`, `initiative`, `speed`, `passivePerception`, `saves.<ability>`, `attack.<nin, tai, gen, freeform>`, `dc.<same>`, `skills.<key>`; null = computed |
| `system.hpMax`, `system.cpMax` | Stated pool maximums (the HP and CP overrides) |
| Derived `system.adversaryBuild` | `profile`, `statLine`, `budget`, `fullSaves`, `suggested`, `warnings`, `baselines`, `freeform {ability, attack, dc}`; null for player-style NPCs |
| Derived `system.autoFailSaves` | true for Minions |

## Added in 0.31.0-alpha.1 (ROLL1)

| Path | Meaning |
| --- | --- |
| Setting `n5e.rollWithoutDialog` (client) | Skip the roll dialog for this user; off by default |
| Rule `rollEditsVisibility` | `all` (default) or `gm`: who sees struck and added parts on roll cards |
| `flags.n5e.roll.bonus`, `.extra` | Now the bonus and added dice after the dialog; Will of Fire rerolls repeat them |
| `flags.n5e.roll.breakdown.parts[].removed`, `.added`, `.dice` | Unticked parts, added modifiers, added dice |
| Card attribute `data-n5e-gm-only` | Removed for non-GM users when the card renders |
| `rollWithSpec` options `dialog`, `prepared {offLabels, added, mode}`, `situational [{label, value, when}]` | No dialog; a group's choice; unticked extra modifiers |

## Added in 0.31.0-alpha.2 (NPC1c)

| Path | Meaning |
| --- | --- |
| `system.situational[] {skill, value, when}` (NPC) | Situational skill bonuses, unticked in that skill's roll dialog |
| `system.knowledge.entries[] {id, kind: item, stat or text, ref, label, note}` (NPC) | What the players can learn; `ref` is an item id on this NPC or a statistic key (`KNOWABLE_STATS`) |
| `system.knowledge.learned[]` (NPC) | Entry ids the whole party knows |
| `flags.n5e.learn {npcUuid, readerUuid, available, picked}` (ChatMessage) | On a Read the Enemy success against an NPC with learnable entries |
| Owner intent `learnEntry {messageId, entryId}` | The reader's pick, finished on the GM's client |

## Added in 0.32.0-alpha.1 (NPC2)

| Path | Meaning |
| --- | --- |
| `system.details.concept` (NPC) | The builder's Step 1; GM only on the sheet |
| Item `feat` with `system.category: "npcTraits"`, `flags.n5e.adversaryTrait.rank` | A trait typed in the builder (until NPC6 brings the book's lists) |
| Config `suggestedJutsuRanks`, `classDescriptions`, `roleDescriptions`, `rankDescriptions`, `conceptExamples`, `adversaryClanGroups` | The builder's tables and text |

## Added in 0.33.0-alpha.1 (NPC3)

| Path | Meaning |
| --- | --- |
| Item `feat` with `system.category: "npcStrikes"` | A Freeform Strike: attack activity (`attack.discipline` `freeform`, `nin`, `tai` or `gen`), optional rider save with a fixed DC |
| `attack.discipline: "freeform"` | The attack row reads the adversary's Weapon/Freeform line (`system.adversaryBuild.freeform.attack`) |
| `flags.n5e.freeform {kind: strike or jutsu, choices, built {level, klass, damageLevel, formula, dc}, handEdited}` (Item) | The window's choices (one source for the windows, the builder and recalculation); `handEdited` when the damage was edited by hand |
| Activity `effect.rules[] {key, selector, label}` | Rule elements copied onto the applied effect (`flags.n5e.rules`), e.g. disadvantage on attacks |
| Change keys `n5e.resist`, `n5e.immune` (value: damage type), `n5e.attack.all` | Resistance and immunity from effects; a bonus to every attack line (Weapon/Freeform included) |
| Builder draft `freeform[] {id?, kind, name, choices, dirty?}`; `draftToUpdate().freeform {create, edit}` | Freeform entries, built after the save from the saved adversary |
| Config `config/freeform.mjs` | Strike and jutsu damage tables, Damage Penalties, Effects & Conditions, shapes, ranges, rank levels, cost, DR, focus values |

## Added in 0.33.0-alpha.2 (FIN3a)

| Path | Meaning |
| --- | --- |
| `flags.n5e.card.results.saves[uuid][effect]` | One save per creature per effect (was one per creature; old cards read as effect `"0"`) |
| Button attribute `data-effect` on `[data-n5e-act="save"]` and `[data-n5e-act="damage"]` | The card row (effect) the button belongs to |
| `flags.n5e.roll.effect`, `flags.n5e.damage.effect` | The effect a save or damage roll belongs to |
| `flags.n5e.effectApplication.card {messageId, source}` | The action card and button an effect offer came from |
| `flags.n5e.reactionWindow.sourceMessageId` | The attack or damage message a reaction window was opened for |

## Added in 0.33.0-alpha.3 (FIN3b)

| Path | Meaning |
| --- | --- |
| `flags.n5e.card.results.damage[effect]`, `.applied[uuid][effect]` | One damage roll per effect and one application per creature per effect (old cards read as their own effect) |
| `flags.n5e.damageApplication.effect` | The effect whose damage was applied |
| `flags.n5e.concentrationRank[itemId]` (Actor) | The rank a concentration jutsu was cast at |
| `flags.n5e.clash.auto` (`a` or `b`), `.dispelled[]`, side `itemId` | GM decision, dispelled sides, the clashing jutsu |
| Owner intent `dispelJutsu {itemId, messageId, side}` | A player's dispel, finished by the active GM |

## Added in 0.33.0-alpha.4 (FIN4a)

| Path | Meaning |
| --- | --- |
| `flags.n5e.choke {holder}` (Suffocating effect) | Suffocating from a Choke: Unconscious when breath runs out; ends with the holder's hold |
| `flags.n5e.breath` (Actor) | Turns of breath left (combat) or `{until}` world time (outside combat) |

## Added in 0.33.0-alpha.5 (FIN4b)

| Path | Meaning |
| --- | --- |
| `flags.n5e.indirectExposure {dc, note, actors[]}` (ChatMessage) | An Indirect Exposure check the GM posted |
| `game.n5e.api.indirectExposure()`; token control `n5eExposure` | Open the GM's Indirect Exposure dialog |

## Added in 0.33.0-alpha.7 (FIN5)

| Path | Meaning |
| --- | --- |
| Owner intent `transferRyo {targetUuid, amount}` | A player's ryo gift, finished by the active GM |
| Sheet action `giveRyo` (Inventory tab) | Give ryo to a player character or Allied NPC |

## Added in 0.34.0-alpha.1 (PRESTD1 A-i)

| Path | Meaning |
| --- | --- |
| `flags.n5e.expired` (ActiveEffect) | Ran out while "Remove expired effects automatically" is off |
| Roll dialog field `secret` | Secret roll (GM only) |

## Added in 0.35.0-alpha.1 (PRESTD1 Part B)

| Path | Meaning |
| --- | --- |
| Consumable `system.subtype: "scroll"` with `flags.n5e.scroll {jutsu, rank, discipline, identified}` | A jutsu scroll |
| `flags.n5e.scrollCopy {scrollId, numbers {attack, dc}}` (jutsu) | The hidden copy a scroll casts through; off the Jutsu tab |

## Added in 0.36.0-alpha.1 (PRESTD1 Part C)

| Path | Meaning |
| --- | --- |
| Actor type `loot`: `system.mode` (pile, merchant, stash), `system.currency.ryo`, `system.buyRate`, `system.sellRate`, `system.description` | Loot piles, merchants and the party stash |
| Owner intents `lootTake`, `lootBuy`, `lootSell {lootUuid, itemId, quantity}` | A player's take, purchase or sale, finished by the active GM |

## Added in 0.37.0-alpha.1 (PRESTD1 D-i)

| Path | Meaning |
| --- | --- |
| Consumable `system.subtype: "wand"`, `flags.n5e.wand {jutsu, rank, used, overcharged, broken}` | A wand and its state today |
| Jutsu `flags.n5e.wandCopy {wandId}` | The hidden copy a wand casts through (left out of jutsu lists) |
| Rules `flanking` (off, ac, advantage), `craftDCD`–`craftDCS`, `craftDaysD`–`craftDaysS`, `craftMaterials` | Flanking effect and crafting numbers (GM-editable) |

## Added in 0.37.0-alpha.2 (PRESTD1 D-ii)

| Path | Meaning |
| --- | --- |
| Actor type `hazard` (NPC fields plus) `system.hazard.kind` (simple, complex), `stealthDC`, `disable {skill, dc, note}` (skill key, `tool:<kit>` or ability), `hardness`, `trigger`, `routine` (HTML), `reset` | A hazard |
| Actor type `vehicle` (NPC fields plus) `system.vehicle.hardness`, `pilot {skill, dc}`, `collision {damage, save, dc}`, `capacity {crew, passengers}` (0: any), `crew`, `passengers` (actor UUIDs), `notes` | A vehicle |

## Added in 0.38.0-alpha.1 (PRESTD1 Part E)

| Path | Meaning |
| --- | --- |
| JournalEntryPage `flags.n5e.mission {name, rank, tier, players (actor UUIDs), ryo, downtime, lines [{key, count, cost}], notes, status}` | A saved mission plan (journal "N5e Missions") |
| `game.n5e.api.missionPlanner(page?)` | Open the mission planner |

## Added in 0.39.0-alpha.1 (PRESTD1 Part F)

| Path | Meaning |
| --- | --- |
| ChatMessage `flags.n5e.social {npcUuid, npcName, type, attitude, round, patience, poa, pof, revealed, perform, disadvantage, partyDisadvantage, log, ended, controlId}` | The public social encounter tracker |
| ChatMessage (GM whisper) `flags.n5e.socialGM {motivations, pitfalls [{text, revealed}], pitfallRound, recallDC, trackerId}` | The hidden half, GM only |
| Owner intent `socialResult {messageId, action, total, motivation, usedPerform}` | A player's social roll, applied by the active GM |
| `game.n5e.api.socialEncounter()` | Start one with the selected NPC token |

## Added in 0.40.0-alpha.1 (NPCUI1)

| Path | Meaning |
| --- | --- |
| Client setting `n5e.npcSheetView {legend, hidden}` | Each user's NPC sheet toggles: the jutsu color key, hidden disciplines (`nin`, `tai`, `gen`) |
| `CONFIG`-free table `config/jutsu-colors.mjs jutsuColors` | Keyword colors for jutsu pills (disciplines and Release keywords) |

## Added in 0.41.0-alpha.1 (PRESTD1 A14)

| Path | Meaning |
| --- | --- |
| Rule `gradualAbility` (boolean, off) | Gradual ability increases: +1 ability at 2, 6, 10, 14, 18; feat and Mastery at 4, 8, 12, 16, 19 |
| `progression.gradualAbilityLevels` | [2, 6, 10, 14, 18] |

## Added in 0.42.0-alpha.1 (STD0–STD2)

| Path | Meaning |
| --- | --- |
| Rule element fields `direction` (self, imposed, against), `scope` (always, action, turn, round), `uses`, `targets` (all, one, chosen), `on` | Rule elements v2 |
| Rule element keys `autoFail`, `autoSucceed`, `reroll {mode}`, `critRange`, `maximizeDice`, `minimumDie`, `damage {formula, damageType}`, `damageHandling {ignoreResistance, immunityAsResistance, drMultiplier}`, `addRanks`, `inflict {condition, ranks}`, `effect`, `resource {pool, amount}`, `note {text}` | New keys |
| ActiveEffect `flags.n5e.applyTo: "action"` | An action effect: copied onto the action's card, never applied to the actor |
| ChatMessage `flags.n5e.actionEffects [{id, origin, label, rules}]` | The action effects on a card |
| ChatMessage `flags.n5e.roll.consumed [{elementId, rollerUuid}]` | Uses a roll spent from its card |
| ChatMessage `flags.n5e.damage.handling` | Damage handling for when the damage is applied (replaces `piercing`) |
| `tools/hardcoding-allowlist.json` | Content names still in engine code (to be emptied by STD batches) |

## Added in 0.43.0-alpha.1 (STD3)

| Path | Meaning |
| --- | --- |
| `config/conditions.mjs` entry `rules` | What the condition or state does to rolls and damage (rule elements; `against` = rolls aimed at its creature) |
| `config/conditions.mjs` entry `cast` | `{blocked}`, `{components, reason}` or `{maxComponents, reason}` casting limits |
| Rule element keys `noAdvantage`, `costReduction`; fields `endsOnUse`, `damageHandling.resistAll` | STD3 additions |
| Predicate options `ability:<key>`, `range:melee` / `range:ranged`, `self:sense:<key>` / `target:sense:<key>` | Read by condition elements |

## Added in 0.44.0-alpha.1 (STD4)

| Path | Meaning |
| --- | --- |
| Rule element `on` (initiative, turnStart, turnEnd, hit, miss, failedSave, succeededSave, damageDealt, damageTaken, zeroHP) with keys `resource {pool, amount}`, `note {text}`, `inflict {condition, ranks, who}`; field `oncePerTurn` | Trigger elements |
| Rule element keys `attacks {value, implementsOnly, text}`, `initiativeOptions {skills, text}` | Attacks per Attack action; Initiative substitutes |
| Reaction recipe field `requiresDR` | Offered only against damage DR applies to |
| Actor `flags.n5e.triggerTurn {stamp, keys}` | Once-per-turn triggers already fired |
| Class column `deflectionDice` (Weapon Specialist) | Deflection dice by level |
| Predicate option `self:stance:<id>` | The active stance |

## Added in 0.45.0-alpha.1 (STD5)

| Path | Meaning |
| --- | --- |
| `game.n5e.api.automationAudit()` | The GM Automation Audit window |
| `rules/automation-summary.mjs automationOf(item)` | {channels, notes, status, mentions} for the Automation tab and the audit |

## Added in 0.46.0-alpha.1 (STD6a)

| Path | Meaning |
| --- | --- |
| Weapon `flags.n5e.implement` | A basic Shinobi implement (Kunai, Shuriken, Senbon) for "attacks with implements" |

## Added in 0.47.0-alpha.1 (STD6b)

| Path | Meaning |
| --- | --- |
| Stance `flags.n5e.qualifies` | {groups, properties, items}: the weapons that qualify for the stance (any match) |
| Stance `flags.n5e.rules`, effects with `flags.n5e.levels` | The stance's rule elements and notes; level-gated ones on transfer effects |
| Rule element `rerollBelow` {value} | Damage dice showing the value or less reroll once (Foundry `r<=n`) |
| Trigger event `criticalHit` | An attack's natural roll in its critical range |
| Roll facts `weapon`, `weapon:unarmed`, `weapon:group:<g>`, `weapon:property:<p>`, `weapon:stance`, `attack:opportunity` | Predicate options on weapon attack and damage rolls (spec `facts`) |
| Removed: stance `flags.n5e.weaponDie` | Replaced by `rerollBelow` |

## Added in 0.48.0-alpha.1 (STD6d, Medical-Nin)

| Path | Meaning |
| --- | --- |
| `content/automation/<class>.json` | A class's automation table (one entry per feature); `node tools/content/apply-automation.mjs` writes it onto the features |
| Feature `flags.n5e.reviewed` | Reviewed: no buttons are guessed from its text |
| Embedded effects with `flags.n5e.std6d` | Effects written from the automation table |
| Roll facts `jutsu`, `jutsu:keyword:<k>`, `jutsu:rank:<R>`, `jutsu:discipline:<d>` | Rolls from a cast card |
| Cast option `castAs`, `actionEffect`, `appliesTo.namePrefix`, `appliesTo.maxRank` | Casting time change; the one action effect it brings; name prefix; highest rank (a rank or `lvl(...)`) |
| Molding `flags.n5e.castAs` | "bonus" or "reaction" (Quickened, Reactive Ninjutsu) |
| Action effect element value `"@rankValue"` | The cast rank's number (D 1 … S 5), also `@rankValue+N`, `N*@rankValue` |
| Change key `n5e.keywordAbility.<keyword>` | Jutsu with the keyword may use this ability when higher |
| Change key `n5e.unarmed.die` | The Unarmed die becomes this when larger |
| Element `critAbilityMod` {value} | A critical hit adds the ability modifier this many more times (Great Weapon Stance) |
| Effect activity `effect.rules` | Any rule element; change values may use `@scale.<class>.<column>` |

## Added in 0.49.0-alpha.1 (STD6d, Ninjutsu Specialist)

| Path | Meaning |
| --- | --- |
| Roll facts `clash`, `clash:against:keyword:<k>` | Clash checks (with the side's own jutsu facts) |
| Roll facts `concentration`, `concentration:discipline:<d>` | Concentration checks |
| Cast option `costDelta: "zero"` | Cast at 0 cost (not a cost reduction) |
| Element `maximizeAfter` {value} | After the damage roll, up to N dice (the lowest) count as their maximum |
| Element value `"lvl(level:value,...)"` | Read at the element owner's level |
| Pools `tension` (Seismic Tether), `pressure` (Tempest Pressure) | Stone Crusher and Storm Terror resources |

## Added in 0.50.0-alpha.1 (ENG1a)

| Path | Meaning |
| --- | --- |
| Trigger element `heal` {formula, pool, who} | Heals at once (hp, cp, tempHp, tempCp) |
| Trigger element `damage` {formula, damageType, who, unreducible} | A damage card for the GM (fixed target; unreducible skips DR and resistance) |
| Trigger element `resave` {ability, dc} | The owner rolls the save; a success ends the effect carrying it |
| Effect activity element fields with `@scale.…`, `@dc.<disc>`, `@level` | The caster's values, fixed when the effect is applied |
| Effect activity `limit` (number or `lvl(...)`) | Mark: at most that many from one caster (`flags.n5e.mark`); the oldest ends |
| Damage formula `@target.ranks.<condition>`, `@target.state.<state>` | The one target's ranks, or 1/0 for the state |

## Added in 0.51.0-alpha.1 (ENG1b)

| Path | Meaning |
| --- | --- |
| Action-effect element `areaSize` {value, shapes} | The cast's area grows (all shapes, or per shape) |
| Action-effect element `ignoreComponent` {component} | The cast doesn't need hs, cm, cs or m |
| `plan.shaping` {grow, ignore}; area button `data-grow` | The cast's shaping, used by area placement |

## Added in 0.52.0-alpha.1 (ENG1c)

| Path | Meaning |
| --- | --- |
| Reaction recipe `ally` {range, includeSelf} | Offered to its owner when another creature within range is about to take damage |
| Reaction recipe `requiresState` | Only offered while its owner is in that state (flags.n5e.state) |
| Reaction preparation `reactorUpdate` {actor, update} | The protecting creature's cost, paid after validation |

## Added in 0.53.0-alpha.1 (ENG1d)

| Path | Meaning |
| --- | --- |
| Effect `flags.n5e.aura` {radius, who, includeSelf, effect} | An aura; its child effect goes to the creatures within range |
| Effect `flags.n5e.auraFrom` | A child of the aura effect with this uuid |
| Effect activity / cast option effect `aura` | Placed as an aura |
| Roll facts `attack:ranged`, `self:bloodied` | A ranged attack; at half HP or less |

## Added in 0.54.0-alpha.1 (SHEETS1)

| Path | Meaning |
| --- | --- |
| Actor `flags.core.sheetClass` `n5e.CharacterSheetClassic`, `n5e.CharacterSheetGlass`, `n5e.CharacterSheetInk`, `n5e.CharacterSheetScroll`, `n5e.CharacterSheetOneui` | The character's chosen sheet design (Foundry's own flag, set from the Sheet menu); empty means the default N5e sheet |

## Added in 0.55.0-alpha.1 (STD6d Taijutsu Specialist)

| Path | Meaning |
| --- | --- |
| Pool `die` `lvl(1:6,7:8,13:10,19:12)` | The pool die's size by the owner's level (Martial Dice) |
| Roll data `@pools.<id>.value`, `.max`, `.faces` | A pool's current value, maximum and die size, for formulas |
| Rule element value `mod(int,wis,cha)` | The highest of those ability modifiers |
| Change `n5e.rankCost.<scope>` "D:3,C:5,B:9,A:14,S:20" | A fixed Special cost by cast rank for jutsu in scope (`system.modifiers.rankCost`) |
| Roll fact `weapon:unarmed` | A damage roll from the Unarmed Strike item |
| Automation table effect `requiresStance` | The effect only applies in a stance of that category |

## Added in 0.56.0-alpha.1 (CCOND1a)

| Path | Meaning |
| --- | --- |
| Item type `condition` `system.owner` {kind, id, subclass} | The class (and subclass) or clan the condition card belongs to |
| `system.summary`, `tags`, `maxRanks`, `endsAt`, `persists`, `decay`, `removal`, `resave` {ability, source, dc}, `turnStartDamage`, `perRank`, `flat`, `flags`, `cast` | The condition's rules, the same shape as a core condition entry |
| Card `flags.n5e.rules` | The condition's rule elements |
| `CONFIG.N5E.clanConditions.<key>` `owner`, `card`, `summary`, `scope` | A registered card (class or clan) |
| Condition effect `flags.n5e.appliedBy` | The actor uuid that applied a card (it ends with that creature) |
| Condition flag `drZero` | The creature's DR is 0 |
| Owner intent `applyCondition` {key, targetUuid, ranks} | A player's card applied by the GM's client |
| World setting `conditionCardDetails` | Players see card rules on creatures they don't own (default on) |

## Added in 0.56.0-alpha.2

| Path | Meaning |
| --- | --- |
| Condition card `system.initiativeShift` | Initiative change each time it is applied in combat (Flow Broken −4) |
| Combatant `flags.n5e.pendingInitiative` | The change waiting for the start of the next round |

## Added in 0.57.0-alpha.1 (CCOND1c batch A)

| Path | Meaning |
| --- | --- |
| Condition card `system.seconds` | Its duration when not the default minute |
| Condition card `system.removal[].dcIncrease` | The removal DC rises by this after each failure |
| Condition card `system.resave.source` "highest" | The applier's highest jutsu save DC |
| Rule element value `ranks(N)` | N per rank of the condition carrying it |
| Condition effect `flags.n5e.rules` | A card's rule elements, copied onto the condition when it is applied |

## Added in 0.57.0-alpha.2 (CCOND1c batch B)

| Path | Meaning |
| --- | --- |
| Condition card `system.immunityFrom` | "damage:acid", "condition:dazzled": that immunity blocks this condition; "all:damage:fire,damage:earth" needs each |
| Trigger damage formula `@ranks` | The ranks of the condition carrying the element |

## Added in 0.57.0-alpha.3 (CCOND1c batch C)

| Path | Meaning |
| --- | --- |
| Condition card `system.changes` [{key, value, mode}] | Active Effect changes the condition carries (Jūgo +10 ft speed) |

## Added in 0.59.0-alpha.1 (AMP1a)

| Path | Meaning |
| --- | --- |
| Item type `amp` (Amp card) | A packaged Amp (`module/data/item/amp-card.mjs`); registers into `CONFIG.N5E.amps` by `system.identifier` |
| `amp.system.ampType` | battle, reflex, fortitude, will, clan, or "" (no type, King Q-A4) |
| `amp.system.namedType` | The type the book's box names when the limits use another (clan Amps are Clan, King Q-A1) |
| `amp.system.owner` {kind, id, subclass} | kind: any, class, subclass, clan, feat; id: its identifier (a feat's name made into one) |
| `amp.system.activation`, `giveable`, `startOnInitiative` ("" / ask / auto) | How it starts, whether it can be given to others, and whether it starts on rolling initiative |
| `amp.system.duration` {seconds, until, concentration} | until: "" (its seconds), turnStart, turnEnd, nextTurnEnd, combatEnd, rest |
| `amp.system.uses` {max, per}, `cooldown` | Uses (number or formula) per sr, lr, fr or day; seconds before it can start again after it ends |
| `amp.system.endsOn` | staggered, blinded, unconscious, noChakra, stanceLeave (the `ampEnding` setting: automatic or at the table) |
| `amp.system.changes`, `tempHp`, `state`, `exclusive`, `aura`; `flags.n5e.rules` | The buff: Active Effect changes, temporary HP, a named state, an exclusive group, an aura, rule elements |
| ActiveEffect `amp` `system.key` | The Amp card the effect came from |
| ActiveEffect `flags.n5e.ampEnds` | What ends it (the card's endsOn, plus combatEnd or rest) |
| Actor `flags.n5e.ampUses.<key>` {spent, per, cooldownUntil} | Uses spent and when its cooldown ends |
| Activity effect `amp` | Start this Amp card instead of building an effect |
| Rule setting `ampEnding` | auto (default) or table |
| Owner intent `applyAmp` {key, targetUuid} | A player giving an Amp to a creature they don't own |

## Added in 0.60.0-alpha.1 (UX1)

| Path | Meaning |
| --- | --- |
| `module/config/effect-fields.mjs` `fieldInfo(key, N5E)` | The plain-language entry for an effect field: name, category, what, enter, example, stacks, words (search synonyms). Every `changeKeyCatalog` key needs one (tests/ux1). |
| `effectFieldCatalog()` entries | Now also carry `name`, `category`, `what`, `enter`, `stacks`, `words`, `custom`; sorted by category. `n5e.resist` and `n5e.immune` are type `damageType`. |
| `validateEffectChanges()` `.rows` | {index: {problem, blocking}}: the plain-language problem for each change. |
| `module/rules/plain-language.mjs` | `describeChange`, `describeRule`, the roll rules builder (`ruleToRow`, `rowToRule`, `RULE_KINDS`, `selectorBases`, `WHEN_FACTS`). |
| Amp card: Active Effects on the card | Their changes and `flags.n5e.rules` are part of the Amp (with `system.changes` and the card's own rules); switched-off effects are left out. |

## Added in 0.60.0-alpha.3

| Path | Meaning |
| --- | --- |
| Change key `n5e.mastery.check.<ability>` | Ability Check Mastery: a Mastery source for that ability's checks (target `check.<ability>`) and every skill whose ability it is. |

## Added in 0.60.0-alpha.4

| Path | Meaning |
| --- | --- |
| Change key `n5e.conditionResist` | Condition resistance from an effect: a condition key (`bruised`) or a group (`group:physical`, `group:mental`, `group:sensory`, `group:elemental`, `group:fatigue`); joins `system.traits.conditionResist`. |
| `traits.conditionResist` values `group:<tag>` | Resists every condition with that tag (rules/condition-lifecycle.mjs `resistsAny`). |

## Added in 0.60.0-alpha.6

| Path | Meaning |
| --- | --- |
| Change key `n5e.unarmed.step` | Steps the unarmed damage die up (+) or down (−) along 1 > 1d4 > 1d6 > 1d8 > 1d10 > 1d12, capped at both ends; applied after `n5e.unarmed.die` (rules/unarmed.mjs `stepUnarmed`). |

## Added in 0.60.0-alpha.7

| Path | Meaning |
| --- | --- |
| Change key `n5e.conditionImmune` | Condition immunity from an effect: a condition key or `group:<tag>`; joins `traits.conditionImmune`. |
| Change keys `n5e.stateResist` / `n5e.stateImmune` | State resistance (advantage on saves against it and to end it) or immunity (it can't be applied); value a state key; join `traits.stateResist` / `traits.stateImmune`. |
| Actor `system.traits.stateResist`, `system.traits.stateImmune` | New sets (empty by default). |
| `traits.conditionImmune` values `group:<tag>` | Immune to every condition with that tag. |

## Added in 0.60.0-alpha.11

| Path | Meaning |
| --- | --- |
| Change keys `n5e.attack.<scope>` | Now also take dice ("1d4", "-1d4"), rolled with the attack. |
| Change keys `n5e.save.all`, `n5e.save.<ability>`, `n5e.check.all`, `n5e.check.<ability>`, `n5e.initiative` | Roll bonuses: a number or dice. `check.<ability>` covers that ability's checks and its skills. Parsed into `system.modifiers.rollBonus` [{selector, value or dice, label}] (rules/elements.mjs `rollBonusApplies`). |
| Rule element `modifier` `value` | May be dice. |
| Breakdown parts `dice` | A part with dice, rolled with the roll (rules/roll-math.mjs). |

## Added in 0.61.0-alpha.1 (AMP1b)

| Path | Meaning |
| --- | --- |
| World setting `n5e.ampAuditDismissed` | Item uuids the GM marked "Not an Amp" in the Amp audit. |
| `module/rules/amp-audit.mjs` `ampAuditOf(doc, {dismissed})` | The audit status of a document: typed, untyped, linked, candidate, dismissed (or null), with the reason. |

## Added in 0.62.0-alpha.1 (AMP1c)

| Path | Meaning |
| --- | --- |
| `packs/_source/amps/*` | 20 Amp cards (flags.n5e.amp1c), built by `tools/content/build-amp-cards.py` (idempotent; it also points the buttons at the cards). |
| Activity effect `{name, target, amp: key}` | Every former Amp button: it starts that card (no inline changes or rules). |
| Roll fact `ability:<ability>`, `ability:<nin|tai|gen>` | The ability a check or save uses, and whether it is that discipline's ability. |
| Delete option `n5eAmpSwap` | An exclusive-group swap; the ended Amp's cooldown doesn't start. |

### Action card results keys (0.63.0-alpha.2)

- `flags.n5e.card.results.saves`, `.applied` and `.effects` are keyed by creature uuid with `~` in place of `.` (`Actor~abc`), because Foundry splits dotted keys on update.
- Read them through `normalizeResults` (rules/action-card.mjs), which decodes the keys and repairs cards stored split. Write through `encodeResults`.

### Chat appearance settings (CHATUI1, 0.64.0-alpha.1)

- `n5e.chatAppearance` (world): `{scale, fonts: {head, body}, sizes: {body, speaker, title, subtitle, button, small, tag, tileHead, total, formula, section, target, apply, note}}`. Sizes in px; scale in %.
- `n5e.chatAppearanceMine` (client): the same plus `use` (boolean). Used instead of the world's when `use` is on.
- Applied as CSS custom properties on the page root: `--n5e-fs-<field>` (px, scaled) and `--n5e-ff-head` / `--n5e-ff-body`. N5e chat messages get the class `n5e-msg`.

### Clan Amp cards (AMP1d, 0.66.0-alpha.1)

- `packs/_source/amps/clan-*.json`, built by `tools/content/build-clan-amp-cards.py` (idempotent; box text read from the clan features at build time).
- `system.ampType` "clan"; `system.namedType` the box's type ("Battle Amp"); `system.owner` {kind: "feat", id: <granting feature identifier>} or {kind: "clan", id: <clan>}.
- `system.duration.until` adds `dismissed`: no time limit (`ampEffectPlan` → `permanent`, the effect gets no duration).
- Effect change values may hold `lvl(level:value,...)`; `resolveLevelTables` (rules/effect-services.mjs) resolves them in `applyActiveEffects`.

### Class Amp cards (AMP1d, 0.67.0-alpha.1)

- `flash`, `elemental-flux`, `chained-cascade`, `crash-duality`, `flow-duality` in `packs/_source/amps`, built by `tools/content/build-amp-cards.py` (entries may now carry `changes`).
- Crash Duality's damage: cast option on `summoning-duality-summoner` (content/automation/ninjutsu-specialist.json), `requiresState: "crashDuality"`, `lvl(6:1d10,11:2d10,19:3d10)`.
- Flow's turn-start Focus comes from the `flow` state only (rules/turn-start.mjs); Amp cards in that state carry no turn-start Focus rule.

### Amp versions (AMP1g, 0.68.0-alpha.1)

- `system.series`: the base Amp's identifier on each version; `system.level`: the character level a version starts at (0 on the base).
- Version cards: identifier `<base>-<level>`, name "<Base name> (<level>th)". Built by `tools/content/build-amp-versions.py` from the base cards (the base keeps its unversioned text in `flags.n5e.versionSource`). Build order: build-amp-cards.py, build-clan-amp-cards.py, build-amp-versions.py.
- `ampVersionFor(registry, key, level)` (rules/amp-cards.mjs) picks the version; `applyAmp` uses it (the applier's level). `ampCardsFor` shows only the highest reached version per series.
- Uses and cooldowns: `flags.n5e.ampUses.<series>` (trackKey).

### Self-buff states, stances, Coordinated (AMP1e, 0.69.0-alpha.1)

- Amp card `system.outsideLimits` (bool): the Amp limits ignore it (`ampLimitConflict` skips it as the new Amp and as an active one). Carried to the Amp effect as `system.outsideLimits`. DYNAMIC FORM! (`dynamic-form`) and Flawless (`flawless`) use it (King Q-E3).
- Ending `finisherCast`: casting a jutsu with the Finisher keyword (`isFinisherCast`, rules/cast-tracking.mjs) ends Amps that list it; it always ends them (it is part of the duration), whatever the `ampEnding` setting.
- Amp audit status `stance` (label "Stance"): every item of type `stance` (King Q-E1). `flags.n5e.notAmp` (a reason) on any document keeps it out of the audit.
- Condition card `system.choose` `{prompt, options: [{label, key, value, mode}]}`: the bearer's owners pick one option in chat (`flags.n5e.conditionChoice` on the message); it is added to the condition's changes, once (`flags.n5e.chosen`).
- Condition cards: `lvl(…)` in `changes` (and `choose` options) is read from the applier's character level when placed (King Q-E5: a feature's level is the character level of the character who has it); with no applier it is left for the bearer.
- Mastery change value `"Source ×N"`: N steps from one source (`Source 1` … `Source N`).
- `nara-combat-coordinated` and `nara-diplomatic-coordinated` (conditions pack), applied by Team Coordination's two buttons. The Combat Coordinated Amp cards (`combat-coordinated`, `-7`, `-15`) are gone (King Q-E4).

### Jutsu Amps (AMP1f, 0.70.0-alpha.1)

- Amp card owner kind `jutsu` (`owner.id`: the jutsu's identifier): owned by knowing the jutsu (`ownsAmp`), never offered by `ampCardsFor`; started by the jutsu's effect activity `{amp: key}`.
- `system.rank` (E–S): the cast rank a version starts at; versions share `system.series`. `ampVersionFor(registry, key, level, rank)` picks the highest rank at or below the cast (no rank: the base). The cast rank comes from the cast card's `flags.n5e.cast.rank` (activity-buttons.mjs → applyActivityEffect `rank` → applyAmp).
- `system.choose` `{prompt, options: [{label, changes, rules, duration}]}`: `applyAmp` opens the menu (`pickOption`); several targets pick once (`pickAmpOption`). `withChoice(plan, def, choice)` adds the option; an option `duration` replaces the card's. The applyAmp intent carries `choice`.
- Cards: `tools/content/build-jutsu-amp-cards.py` (keys `jutsu-<identifier>`, `-<rank>` or `-<level>` for versions; folder "Self-buffs and jutsu"). Rejected jutsu: `flags.n5e.notAmp`.
- AMP1f batch 2 (0.71.0-alpha.1): `choose.count` (picks, King Q-F7), `choose.changeable` (the Amps panel's Change button, `changeAmpChoice`, `ampChoiceUpdate`; King Q-F9), option `tempHp`; the picks are kept in `flags.n5e.ampChoice`. An aura child `{amp: key}` (workflow/auras.mjs) is that card's Amp effect on each creature in range (King Q-F6); the aura card is `outsideLimits`. Build entries may set `key`, `button: false` (the "in the aura" companion cards) and `drop` (activity ids the card replaces).

### Amp card fields added in AMP1f batch 3 (0.72.0-alpha.1)

- `system.buttons`: [{label, activation, text, effect}]; shown on the active Amp's row in the Amps panel; `effect` is an activity effect (changes, expires...) applied to the bearer (`useAmpButton`).
- `system.onEnd.condition`: a condition card key applied to the bearer when the Amp ends (not on a swap).
- `system.statuses`: token statuses the Amp effect carries while it lasts (`invisible`).
- Condition cards: `system.endsAt: "rest"` keeps the duration and also ends on any rest.
- Change key `n5e.vulnerable` (value: damage type) adds to `traits.vuln`.

### Fields added in AMP1f batch 4 (0.73.0-alpha.1)

- Amp card `system.endsWith`: an Amp key or series; the Amp ends when that Amp ends on its bearer, and starting it clears that Amp's `flags.n5e.dependentOn` and takes its jutsu off `system.combat.concentrating` (`ampsEndingWith`, `activeAmpOfSeries`).
- Amp card `system.buttons[].end: "pause"`: the button ends the Amp with `{n5eAmpPause: true}`, so `onEnd.condition` isn't applied.
- Aura `also: [{who, effect}]`: more creatures the same aura gives another child effect (`expandAuras`; children's `auraFrom` is `<uuid>#also<i>`).
- Condition cards: `system.statuses` (more token statuses the condition carries) and `system.endsAt: "fullRest"` (ends only on a full rest).
- Saves rolled from a cast card carry the jutsu's facts prefixed `against:` (`against:jutsu:discipline:nin`).
- Activity effect values: `@disciplines.<d>.mod` and `floor()`/`ceil()` are resolved when the effect is placed.

### Fields added in STD6d Weapon Specialist (0.74.0-alpha.1)

- Roll facts `option:<key>:<value>`: each class item's chosen level-up options (advancement type `option`), value slugged ("Thrown/Ammunition" → `thrown-ammunition`).
- Activity `cost.formula`: replaces `amount`; `lvl(...)` by level, or dice rolled and posted to chat.
- Automation table entry `dropEffects`: names of imported (non-`std6d`) effects on the feature to remove.

### Fields added in STD6d Scout-Nin (0.75.0-alpha.1)

- Feature pools `chakraBarrier` (max `2 * @level`, full on any rest), `ghostfire` (max `lvl(3:3,10:5)`), `tacticalInsight` (max 4).
- Placed effect values (changes, limits, aura child rules): `@prof` and `@abilities.<a>.mod` resolve from the caster when placed; the rule validator accepts them (with `floor()`/`ceil()`).

### Class & Clan Summons (0.76.0-alpha.1)

- Actor pack `summons` ("Class & Clan Summons"); sources from `tools/content/build-summons.mjs`.
- NPC `flags.n5e.fromSummoner`: `{ "<path under system>": "<formula>" }` over the summoner's numbers (`@level`, `@prof`, `@str`…, `@dc.nin`, `@attack.tai`, `@hp.max`, `@speed`, `@saves.<a>.proficient`, `@skills.<k>.total`, `@senses.<s>`, `@bonuses.attack.<k>`). A single reference keeps its value; otherwise arithmetic with max/min/floor/ceil. Written into the summoned token's `delta.system`, with `details.summoner` (the caster's uuid).
- Automation table entry `duration`: the feature's `system.duration` (how long its summons last).

### Class & Clan Limits and option-gated effects (0.77.0-alpha.1)

- World setting `limitRecovery`: `{ "<owner identifier>.<pool id>": "<choice>", "amp:<amp key>": "<choice>" }`. Pool choices: rest10m, sr, halfSrFullLr, lr, fr, day, initiative (recovers on encounter), round, turn, never. Amp choices: rest10m, sr, lr, fr, day. A choice replaces the written recovery (rules/recovery-overrides.mjs).
- Effect `flags.n5e.requiresOption: "<option key>:<value>"`: the effect is suppressed unless a class's level-up option with that key has that value chosen. Automation tables pass `requiresOption` through on effects.

### Optional damage elements (0.77.1-alpha.1)

- Rule element `{key: "damage", selector, formula, optional: true, label}`: shown unticked in the damage roll window and added only when ticked. With no `damageType` it takes the roll's first damage type. Lethal Attack uses two (full and half).

### Genjutsu Specialist additions (0.78.0-alpha.1)

- Roll fact `jutsu:id:<identifier>`: on every roll from a jutsu's cast card (and `against:jutsu:id:<identifier>` on saves against it).
- Change key `n5e.keywordAbility.discipline:<nin|tai|gen>`: every jutsu cast as that discipline may use this ability when it's higher.
- Summons: Duplicity (`fromSummoner`: level, AC = `@dc.gen`, speed) and Phantasm (level, Genjutsu attack bonus and save DC, senses).
- Class item `flags.n5e.abilityChoice.<disc>`: the player's pick of the ability for that discipline's jutsu when an effect offers another ("" = the higher). Read into `system.grants.disciplineAbilityChoice`.
- Armor category `illusory` (worn over armor) with `system.overlay`: `ability` (replaces Dex in AC: an ability or a discipline nin|tai|gen), `fromDC` (that discipline's save DC is the AC when higher), `whileState` (only in that named state). Rules: `rules/ac.mjs` overlayAC.
- Summon template `flags.n5e.summonerLook: true`: the placed token takes the summoner's token name, image and size. Summoner data adds `@speeds.<walk|climb|swim|fly|burrow>` and `@size`.

### Clans as data (0.79.0-alpha.1, STD6e)

- Clan tables: `content/automation/clans/<clan>.json` (`{clan, features: {<identifier>: entry}}`), same entry keys as class tables plus `system` (item fields, e.g. a stance's `unarmedDie`, `unarmedType`).
- Save `dc.source: "highest"` and attack `discipline: "highest"`: the best casting discipline's DC or attack bonus.
- Summoner links: `@rankValue` (the summoning jutsu's cast rank, D 1 ... S 5; 0 otherwise).
