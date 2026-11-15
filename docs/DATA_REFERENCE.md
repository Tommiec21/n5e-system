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
