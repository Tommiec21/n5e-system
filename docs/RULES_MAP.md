# Rules map: rule → code → knowledge base

| Rule | Code | KB |
| --- | --- | --- |
| Proficiency by level | `config/core.mjs progression.proficiency`, `rules/progression.mjs` | 01 |
| Mastery: +2/+4/+6, max 3, level cap 1/2/3 at 1/7/12 | `config/core.mjs progression.mastery`, `rules/progression.mjs`, `creature.mjs _prepareMastery` | 01 |
| ASI levels grant +1 ability, feat, one Mastery rank | `progression.asiLevels`, `creature.mjs` (`mastery.asiAvailable`) | 01, 12 |
| HP/CP: 10 + die max + Con, then die max + Con | `rules/progression.mjs poolMax` | 01, 12 |
| AC formulas (default, Martial Technique, flat, formula) | `rules/ac.mjs` | 01, 08, 12 |
| Initiative = Dex + half prof + Mastery | `creature.mjs` | 01 |
| Saves: half prof if not proficient | `creature.mjs` | 01 |
| Discipline abilities Tai Str / Nin Int / Gen Wis; Buki uses Tai | `config/core.mjs disciplines` | 04, 10 |
| Jutsu DC 8 + mod + prof; attack mod + prof | `creature.mjs` | 04, 10 |
| Cost order, half-base floor, Special unreducible, upcast changes base | `rules/cost.mjs` | 04, 11 |
| Upkeep half cost; concentration DC max(15 + ranks, half damage) | `rules/turn-start.mjs`, `rules/damage.mjs` | 04, 10 |
| Ranked conditions and penalties | `config/conditions.mjs`, `rules/conditions.mjs` | 05 |
| Clan-scoped conditions | `ClanData.conditions`, `api.registerClanData` | 13 |
| Four-tier saves / beat-by-5 tables | `rules/degree.mjs` | 10, 08 |
| Chain count | `rules/chain.mjs` | 04, 10 |
| Inventory Slots = 10 + 2 × Str mod; Encumbered derived | `rules/progression.mjs`, `creature.mjs` | 08 |
| Crit range cap +3 | `config/combat.mjs critRangeCap`, `creature.mjs` | 03 |
| Ability score requirement B 16 / A 18 / S 20 (not Hijutsu) | `config/core.mjs ranks`, `item/jutsu.mjs` | 04, 10 |
| Hijutsu Flexibility | `item/jutsu.mjs prepareActorDerived` | 13 |
| Toolkit charges by rank, no recovery | `config/core.mjs toolkitRules`, `item/equipment.mjs` | 08 |
| V3.1 → 4.0 mapping | `migration/v31.mjs` | Phase 1 plan |
| Click modes, crit threshold, natural 1/20 Will of Fire | `dice/d20.mjs`, `dice/roll.mjs` | 03, 09 |
| Skill action tier penalties (−3 / −5, never stacking) | `rules/skill-actions.mjs`, `config/character.mjs skillActionTiers` | 02 |
| Jutsu activities read from text | `rules/activity-parse.mjs` | 10, 11 |
| Crit damage doubles dice and ability modifier only | `rules/activity-parse.mjs critFormula` | 03 |
| Unarmed damage (1 + Str; Taijutsu stances d6; stance types and item dice) | `rules/unarmed.mjs` | 03, 09 |
| Weapon attacks (melee Str, ranged Dex, finesse/thrown better) | `workflow/attack.mjs` | 03, 08 |
| Ammunition Die (d8 → d6 → d4 → 1 → gone on 1-2) | `workflow/ammo.mjs`, `config/equipment.mjs ammoDie` | 03, 08 |
| Casting: cost, Moldings/Maneuvers, concentration, Chain/Combo, cast options | `workflow/cast-plan.mjs`, `rules/cast-options.mjs`, `rules/cast-tracking.mjs` | 04, 12 |
| Turn start: upkeep, Chain reset, Combo clear, economy, recharge | `rules/turn-start.mjs`, `workflow/turn.mjs` | 03, 04 |
| Damage: interception, DR per resource pool with creature-chosen type order, before resistance, Pierce, Genjutsu psychic, res/vuln/immunity, temp pools | `rules/damage.mjs` | 03 |
| 0 HP, instant death, death saves, NPCs die at 0 | `rules/damage.mjs`, `workflow/apply-damage.mjs` | 03 |
| Concentration check on damage (Stable exempt) | `rules/damage.mjs concentrationOnDamage` | 04 |
| Conditions from failed saves (Apply buttons) | `rules/activity-parse.mjs parseInflicted` | 05, 10 |
| Rests (Short/Long/Full), limits, Ration Pool | `rules/rest.mjs`, `workflow/rest.mjs` | 06 |
| Condition lifecycle: turn damage, decay, 1-minute default, removal checks, resistance | `rules/condition-lifecycle.mjs`, `workflow/conditions.mjs` | 05 |
| Stamina (optional) | `rules/trackers.mjs usesStamina`, `creature.mjs` | 09 |
| Chilled movement damage | `rules/trackers.mjs chilledMove`, `workflow/trackers.mjs onTokenMove` | 05 |
| Fury, Marks, Branded, 8-Inner Gates, resaves | `rules/trackers.mjs`, `workflow/trackers.mjs`, `config/combat.mjs` | 03, 05, Context 6/8f |
| Effect editor in plain language: field dictionary, roll rules builder, change cards (UX1) | `config/effect-fields.mjs`, `rules/plain-language.mjs`, `view-models/effect-editor.mjs`, `applications/effect/effect-config.mjs` | UX1 spec |
| Combat card layout like SW5e: tiles, targets, Apply panel with multipliers (CARD2) | `rules/card-layout.mjs`, `workflow/card-layout.mjs`, `workflow/action-card.mjs` | CARD2 spec |
| Chat font sizes and fonts, world default or per user (CHATUI1) | `rules/chat-appearance.mjs`, `workflow/chat-appearance.mjs`, `applications/settings/chat-appearance.mjs` | CHATUI1 spec |
| Amp audit: candidate scan, Automation Audit Amps view, report section (AMP1b) | `rules/amp-audit.mjs`, `applications/gm/automation-audit.mjs`, `tools/report-std-audit.mjs` | AMP1 spec §8 |
| Amps: Amp cards, limits (creature picks), endings, uses, initiative start (AMP1a) | `rules/amp-cards.mjs`, `workflow/amp-cards.mjs`, `data/item/amp-card.mjs`, Amps panel in `view-models/combat.mjs` | 03 (Amps), AMP1 spec |
| Effects ending on the source's turn | `rules/trackers.mjs expiringEffects`, `workflow/trackers.mjs` | — |
| Stance effects only while active | `documents/active-effect.mjs isSuppressed` | 09 |
| Feature choices, Extra Attack, Superior Assault crit, recovery requirements | `rules/features.mjs` | 12 |
| Feat proficiency grants (Mastery when already proficient) | `creature.mjs _collectItemGrants` | 09 |
| Weapons (Ch5 tables: 55 weapons, properties with ranks, ranges, groups, Bulk) | `packs/_source/equipment`, `tools/content/build-weapons.mjs` | 08 |
| Unarmed Strike item on every character and NPC (can't be removed or unequipped) | `config/equipment.mjs unarmedStrike`, `documents/actor.mjs`, `documents/item.mjs`, `rules/unarmed.mjs` | 03 |
| Weapon attacks: bonuses/effects/Mastery, Critical X, Deadly X, Heavy, Volatile (jam/unjam), Versatile, Multiattack bonus attack, reach, thrown, long range, ranged in melee, Returning, ammo die only on ranged/thrown | `rules/weapon-properties.mjs`, `workflow/attack.mjs` | 03, 08 |
| Skill actions vs one target: passive scores, fixed DCs, contests (tie = no change), outcome Apply buttons (Prone, Grappled/Restrained, Suffocating); holds (who is holding, prerequisites for Pin/Takedown/Choke/Muffle, Escape, break past 5 ft), Trip size rule, weapon Disarm and Trip | `rules/skill-resolution.mjs`, `workflow/skill-actions.mjs` | 02 |
| Jutsu Clash: triggering discipline skill, rank Mastery, best of 3 (both B+), elemental advantage, Win (Concussed 1 + Dazed) / Draw | `rules/clash.mjs`, `workflow/clash.mjs` | Jiraiya's compendium |
| Genjutsu Stimuli immunity (all Stimuli: Visual Blinded/True Sight, Auditory Deafened, Inhaled Envenomed immunity, Tactile psychic immunity; only cast as Genjutsu); Unaware note | `rules/stimuli.mjs`, `workflow/activity-buttons.mjs stimuliImmune`, `workflow/cast.mjs` | 04, 10 |
| Standard DCs (statistic + 10) for Shove and Request; falling (Option A: past the Str score, 1d6/10 ft, max 100d6, Prone, ignores DR) | `rules/skill-resolution.mjs standardDC`, `rules/environment.mjs fallDamage`, `api.fall` | 02, 06 |
| Hostile Terrain region behaviour (turn-start Con save, damage ignoring DR); Suffocating breath countdown in combat | `rules/environment.mjs`, `workflow/environment.mjs`, `data/region/hostile-terrain.mjs` | 06 |
| Cover statuses (+2/+4 AC and Dex saves, Total refuses attacks); Opportunity Attack reminders (reach, Disengage, teleport/forced exempt); Disengage/Dodge effects; Engaged; Surprised round 1; Dodge lost at speed 0 | `rules/positioning.mjs`, `workflow/positioning.mjs`, `rules/advantage.mjs` | 03, 05 |
| One damage roll, per-target shares: hit/miss by each AC, per-target save results (fail full, success half/none), per-target Apply | `rules/resolution.mjs`, `workflow/resolution.mjs` | 03, 04 |
| Read the Enemy and Identify from cast cards; Suppress Chakra score effect; Counter Tag and Chakra Suppression Tag (effect states) | `rules/jutsu-defense.mjs`, `workflow/jutsu-defense.mjs`, `rules/cast-checks.mjs` | 02, 08 |
| Adversaries (Bingo Book): stat lines, proficiency, HP/CP, AC/DR, saves, attack and DC lines, role/class/Iconic/Epic modifiers, Minion rules, overrides | `config/adversary.mjs`, `rules/adversary.mjs`, `data/actor/npc.mjs` | Bingo Book |
| Roll dialog for every roll (parts with ticks, added modifiers, mode, group dialog, no key combinations) | `rules/roll-math.mjs`, `dice/roll-dialog.mjs`, `dice/roll.mjs`, `dice/advantaged.mjs`, `documents/combat.mjs` | — |
| NPC defenses, senses, speeds, switches; situational skill bonuses; what the players can learn (Read the Enemy reveal); journal stat block; Reset NPCs | `view-models/npc.mjs`, `applications/actor/npc-sheet.mjs`, `workflow/npc-knowledge.mjs`, `rules/npc-reset.mjs`, `documents/actor.mjs` | Bingo Book |
| Adversary Builder (the book's build steps) | `applications/npc/adversary-builder.mjs`, `rules/adversary-builder.mjs`, `view-models/adversary-builder.mjs` | Bingo Book |
| Item transfer between creatures (physical items; to player characters and Allied NPCs; through the GM when you don't own the receiver); item integrity audit and grant guards | `rules/transfer.mjs`, `workflow/transfer.mjs`, `rules/item-audit.mjs`, `applications/gm/item-integrity.mjs` | PF2e parity, King 2026-11-14 |
| Single action card: one card per jutsu/feature/weapon attack; per-target hit/miss, save, share, Apply/Half/Undo; area-covered targets; per-target owner saves; conditions/effects per target with Undo; damage reactions, Will of Fire rerolls and concentration checks on the card; other users' results recorded by the GM (owner intent), separate linked cards without a GM | `rules/action-card.mjs`, `workflow/action-card.mjs` | 03, 04 |
| Feature riders on the action card: cast riders (cast dialog) and trigger riders (on hit / failed save / damage dealt); one save per event (the action's save, else one chosen rider save); additive rank increases then the cap; one condition choice for all; Specialized warning off-Rival | `rules/riders.mjs`, `workflow/riders.mjs`, `content/riders/*.json` | 03, 04, King 2026-11-14 |
| Multi-discipline jutsu: Cast as choice; attack/DC/requirement by the cast discipline; locked while concentrating; Genjutsu riders only as Genjutsu; counts as every listed discipline for known lists | `rules/cast-discipline.mjs`, `JutsuData#liveAs`, `workflow/cast-plan.mjs`, `workflow/cast.mjs` | 04 |
| Light extra attack (Chapter 5: once per turn with the Attack action, adds the modifier; no Bonus Action off-hand attack) | `rules/weapon-properties.mjs lightAttackBlock`, `workflow/attack.mjs`, Combat tab | 08 |
| Strikes choose their weapon by keyword, group or property | `rules/weapon-properties.mjs matchingWeapons`, `workflow/attack.mjs pickWeapon` | 03 |
| Evocation (Combat Scrolls): echo attack bonus and type, no modifier, dice at 5/11/17, half die for Bukijutsu | `rules/weapon-properties.mjs`, `WeaponData.evocation` | 08 |
| Unarmed Strike: Dex when Taijutsu use Dex; counts as Finesse | `rules/unarmed.mjs unarmedAbility/hasFinesse` | 03 |
| Weapon proficiency by `category:group` pair or base weapon; any one group of a multi-group weapon; Kunai, Shuriken, Senbon and Unarmed Strike for everyone | `rules/proficiency.mjs`, `creature.mjs grants.weaponProf`, `workflow/attack.mjs` | 05 |
| Optional rules (every toggle) | `config/rules.mjs`, `rules-settings.mjs`, `applications/settings/rules-config.mjs` | various |
| Per-item automation for imported content | `tools/content/automation.py` | 09, 12, 13 |
| Areas: shapes, sizes from item/range/text, upcast growth, coverage, lifetimes | `rules/area.mjs`, `workflow/areas.mjs` | 04 |
| Senses → token vision and detection modes; Chakra Sensing mode | `rules/senses.mjs`, `documents/token.mjs`, `canvas/detection.mjs` | 06 |
| Climb/swim/crawl extra cost; ruler speed bands | `rules/senses.mjs`, `canvas/ruler.mjs` | 03, 06 |
| Text shortcuts: [[/save]], [[/check]], [[/damage]], [[/heal]], @Condition[], @State[] | `rules/enrichers.mjs`, `applications/enrichers.mjs`, `config/condition-text.mjs` | 05 |
| Compendium Browser: tabs, filters, sorting | `rules/browser.mjs`, `applications/browser/compendium-browser.mjs` | — |
# Shared execution additions (0.10.0-alpha.1)

- Activity turn limits/action tracking: `workflow/activity-execution.mjs`.
- Resource validation: `rules/resources.mjs`; payment: `workflow/resources.mjs`.
- Actor command queues: `workflow/commands.mjs` (client-local, not distributed transactions).
- Healing/revival: `workflow/health.mjs` calls the established `rules/damage.mjs` healing plan.
- Data-loss guard: `rules/activity-contract.mjs`, enforced by `tools/check.mjs`.
- Legacy retry and activity-field repair: migration 2 in `migration/runner.mjs`.
- Live client smoke check: `testing/smoke.mjs`.


# Coordination, reactions, effects and content additions (0.13.0-alpha.1 – alpha.14)

| Rule / capability | Code | Source |
| --- | --- | --- |
| GM-reviewed privileged requests; durable receipts, epochs, replay protection | `socket.mjs`, `automation/receipts.mjs`, `automation/history.mjs`, `applications/gm/automation-recovery.mjs` | MULTIPLAYER.md |
| Typed multiplayer workflows routed to the active GM (cast, attack, activity, resource, healing, rest, damage, hit, tracker, death save, Will of Fire...) | `automation/multiplayer.mjs`, `automation/commands.mjs` | MULTIPLAYER.md |
| Arithmetic precedence: + and − before × and ÷ (King 2026-11-09) | `rules/formula.mjs`, `dice/roll.mjs` | CODEX_CONTEXT 13.4 |
| Identical Half/Double sources apply once; opposites cancel | `rules/damage.mjs damagePlan` | King 2026-11-09 |
| DR protects HP and CP independently; damaged creature chooses type order | `rules/damage.mjs`, `workflow/apply-damage.mjs chooseDROrder` | King 2026-11-09 |
| Deflection = rolled DR with the same rules | `rules/deflection.mjs`, `workflow/reaction-adapters.mjs` | King 2026-11-09 |
| Reaction windows (successful hit, before damage), owned offers, 60 s default timeout, nested chains deferred | `workflow/reactions.mjs`, `workflow/reaction-dispatch.mjs`, `workflow/reaction-chain.mjs`, `rules/authored-reactions.mjs`, `applications/item/reaction-editor.mjs` | RX1–RX3, MP3 |
| Uncanny Dodge (optional registered ability; Blindsight counts as seeing) | `rules/uncanny-dodge.mjs`, `canvas/visibility.mjs` | VIS1 |
| Coordinated damage (pilot) and retargeting rolled damage | `workflow/coordinated-damage.mjs`, `workflow/apply-damage.mjs retargetDamage` | MP3 |
| Damage roll lineage and per-recipient application trace (internal) | `rules/damage-trace.mjs`, `view-models/damage-trace.mjs` | DT1, CHAT1 |
| Effect editor catalog, validation, presets, import/export | `rules/effect-authoring.mjs`, `applications/effect/effect-config.mjs` | EFFECT_EDITOR.md |
| Effect services: dynamic numeric changes, event expiration, approved world Macros, appearance providers | `rules/effect-services.mjs`, `automation/effect-services.mjs` | EFFECT_SERVICES.md |
| Backgrounds (16), classes to 20 (7 + 42 subclasses), clans (44), jutsu (968) builders | `tools/content/build-*.mjs` | JUTSU_IMPORT.md, CODEX_CONTEXT 13.3 |

# Known gaps (review 2026-11-13; see PROGRESSION_PLAN.md for the batch that closes each)

| Gap | Where it would live |
| --- | --- |

# Multiplayer parity (0.14.0-alpha.1–2, OPS1)

| Rule / capability | Code |
| --- | --- |
| Users change only what they own; the GM applies to NPCs (dnd5e/PF2e parity) | `automation/authority.mjs`, `workflow/apply-damage.mjs`, `workflow/effect-application.mjs` |
| Owner intents: Allied NPCs, rations, reaction choices finish on the GM's client | `automation/owner-intents.mjs` |
| Allied NPCs: player-summoned, owned and controlled; join combat | `workflow/allied.mjs`, `data/actor/npc.mjs allied` |
| Concentration-dependent effects end with the concentration | `workflow/effect-application.mjs removeDependents` |
| Attack target rows, DC visibility, concealed NPC descriptions | `rules/parity.mjs`, `dice/roll.mjs renderParityParts` |
| GM roll requests | `workflow/roll-request.mjs`, `applications/enrichers.mjs` |

# Turn engine (0.15.0-alpha.1, TURN1)

| Rule / capability | Code |
| --- | --- |
| Turn start/end, round start and combat start/end run only when combat moves forward (active GM) | `documents/combat.mjs N5eCombat`, `workflow/turn.mjs turnStartPipeline/turnEndPipeline/combatEndPipeline` |
| Turn / round / encounter recovery of uses and pools | `rules/recovery.mjs`, `workflow/recovery.mjs` |
| Upkeep: owner chooses each turn; none affordable → all end; unanswered → end at turn end; NPC auto/prompt/manual | `rules/upkeep.mjs`, `workflow/upkeep.mjs`, rule `npcUpkeep` |

# Effect expiry (0.15.0-alpha.2, EXPIRE1)

| Rule / capability | Code |
| --- | --- |
| Timed effects end when their duration runs out: in combat at each turn start for every combatant; out of combat when world time advances (non-Persists conditions included) | `rules/expiry.mjs`, `workflow/expiry.mjs`, `workflow/turn.mjs turnStartPipeline` |

# Damage numbers (0.15.0-alpha.4, DMG1)

| Rule | Code |
| --- | --- |
| Bruised +4 damage taken, before DR, to the first HP type | `rules/damage.mjs damagePlan` |
| Weakened −4/rank and Exhaustion −1/rank on dealt damage (first type first, floor 0), stored on the card | `rules/damage.mjs dealtDamagePenalty/reduceInstances`, `workflow/activity-buttons.mjs` |
| Petrified resistance to all damage | `rules/damage.mjs damagePlan` (`conditionPenalties.flags.resistAll`) |
| Exhaustion on healing and Short Rest dice | `rules/damage.mjs exhaustedRollTotal`, `workflow/activity-buttons.mjs`, `workflow/rest.mjs` |

# Advantage engine (0.15.0-alpha.5, ADV1)

| Rule | Code |
| --- | --- |
| Count advantage and disadvantage sources from conditions and states; any of each cancel; the click counts as one | `rules/advantage.mjs`, `dice/roll.mjs rollWithSpec` |
| Auto-fail saves: Petrified and Stunned (Str/Dex), Unconscious (all) | same |
| Dodging (until the start of the next turn) and Helped (the next attack or check) | `config/conditions.mjs states`, `workflow/turn.mjs` |
| Advantage on any dice roll: whole roll twice, keep higher (or lower); named dice only (ADV2, 0.15.0-alpha.6) | `rules/elements.mjs contextualAdvantage`, `dice/advantaged.mjs` |

# Pre-cast checks and roll-mode controls (0.15.0-alpha.7, CAST1)

| Rule | Code |
| --- | --- |
| Conditions, components, ability requirement and rank cap block casting | `rules/cast-checks.mjs`, `workflow/cast-plan.mjs` |
| Shocked: one attack or one jutsu per turn | `rules/cast-checks.mjs`, `workflow/attack.mjs shockedBlock`, economy `attackOrJutsu` |
| Sheet roll-mode toggle (until switched off) and per-roll Adv/Dis buttons | `applications/actor/character-sheet.mjs`, `dice/advantaged.mjs addSheetToggle`, `dice/roll.mjs addRollModeButtons` |
| Optional character sheet designs (Classic, Glass, Ink & Paper, Shinobi Scroll, One UI), chosen per character from the Sheet menu; same sheet logic, own chrome and styles | `applications/actor/sheet-designs.mjs`, `applications/actor/character-designs.mjs`, `templates/actor/designs/`, `styles/designs.css` |
| Class automation tables (Medical-Nin, Ninjutsu Specialist, Taijutsu Specialist): pools with level-scaled dice, fixed rank costs (`n5e.rankCost`), best-of-abilities element values | `content/automation/*.json`, `tools/content/apply-automation.mjs`, `data/actor/creature.mjs`, `data/item/jutsu.mjs`, `rules/elements.mjs`, `rules/change-keys.mjs` |
| Class and clan condition cards: registration, applying (drag, Apply, intents), owner warning, ending with the applier, rule visibility | `data/item/condition-card.mjs`, `rules/condition-cards.mjs`, `workflow/condition-cards.mjs`, `packs/_source/conditions/` |

# Concentration (0.15.0-alpha.9, CONC1)

| Rule | Code |
| --- | --- |
| Incapacitation ends all concentration | `rules/concentration.mjs`, `workflow/concentration.mjs checkConcentration` |
| Effects of concentration jutsu end with the concentration | `workflow/trackers.mjs` (`dependentOn`), `workflow/effect-application.mjs removeDependents` |
| Ready a jutsu: pay and hold with concentration, release with the Reaction, lost at the next turn start or when concentration breaks | `workflow/cast-plan.mjs`, `workflow/cast.mjs`, `workflow/concentration.mjs` |

## Freeform Strikes and Freeform Jutsu (NPC3, 0.33.0-alpha.1)

| Rule | Code |
| --- | --- |
| Strike damage: class column at the level, 2 lower with a Tier 1 rider, 3 lower with Tier 2; a Striker +1 | `rules/freeform.mjs strikeDamage`, `buildStrike` |
| Single attack with the combined damage of the table's attack count | `rules/freeform.mjs combineAttacks` |
| Rider DC: Minion lowest, Standard middle, Elite and Solo highest jutsu save DC | `rules/freeform.mjs riderDC` |
| Freeform Jutsu ranks by class and level; cost D 5, C 9, B 14, A 20, S 30, Minions 0 | `rules/freeform.mjs freeformRanks`, `freeformCostFor` |
| Effective level: Damage Penalties (area, effect tiers, no damage on save, lowest attack, pre-established), clamped 1–30 | `rules/freeform.mjs effectiveLevel`, `jutsuDamage` |
| Defensive and Support focus values; C and A use the rank below | `rules/freeform.mjs defensiveValue`, `supportValue`, `stepValue` |
| Effects & Conditions: conditions on a failed save, penalties and disadvantage as Active Effects, the rest as card notes; recovery by save, rounds or action | `rules/freeform.mjs effectActivity` |
| Freeform Jutsu follow level, class and role; Strikes are set when built; hand-edited damage kept | `rules/freeform.mjs recalculate`, `workflow/freeform.mjs` |

## Card and resolution limits (FIN3a, 0.33.0-alpha.2)

| Rule | Code |
| --- | --- |
| One save per effect; each save halves only its own effect's damage, for the creature that rolled it (King Q-F11) | `rules/action-card.mjs savesOf`, `savesForDamage`, `cardTargetRows`; `rules/resolution.mjs pickLinkedRolls`; `workflow/resolution.mjs linkedOutcomes` |
| Immune to a Genjutsu's stimuli: damage applies as 0, conditions and effects end at once (King Q-F12) | `workflow/action-card.mjs immuneTargets`, `workflow/apply-damage.mjs applyToSelected` |
| Effects offered to another owner's creature are recorded on the card when applied | `workflow/effect-application.mjs withCardLink`, `applyEffectFromCard` |
| Reaction windows shown on the card | `rules/action-card.mjs cardReactionWindows`, `workflow/reactions.mjs openReactionWindow` |

## Damage per effect and the Clash (FIN3b, 0.33.0-alpha.3)

| Rule | Code |
| --- | --- |
| Several damage rolls on one card, each with its own share and Apply | `rules/action-card.mjs damagesOf`, `appliedOf`, `cardTargetRows`; `workflow/action-card.mjs` |
| A concentrated jutsu clashes at the rank it was cast at | `workflow/cast-plan.mjs` (`concentrationRank`), `workflow/clash.mjs clashRank` |
| GM decides a clash automatically (King Q-F8) | `workflow/clash.mjs decideClash`, `rules/clash.mjs clashResult` |
| A dispelled jutsu ends at once with every effect it put out (King Q-F10) | `workflow/clash.mjs dispelSide`, `endEffectsOf` |

## Choke and breath (FIN4a, 0.33.0-alpha.4)

| Rule | Code |
| --- | --- |
| A choke's out-of-breath is Unconscious, not Dying; it ends with the hold (King Q-F15) | `rules/environment.mjs outOfBreathStatus`, `workflow/environment.mjs runOutOfBreath`, `registerEnvironmentHooks` |
| Breath outside combat: Con mod minutes (min 30 s); fresh count across combat; GM sets it (King Q-F16) | `rules/environment.mjs breathSeconds`, `breathState`; `workflow/environment.mjs breathClock`, `setBreath` |

## Indirect Exposure (FIN4b, 0.33.0-alpha.5)

| Rule | Code |
| --- | --- |
| Indirect Exposure: Survival vs the terrain DC, Release immunity suggested; the GM decides and applies (King Q-F14) | `rules/environment.mjs indirectExposure`, `mayBeImmune`; `workflow/environment.mjs indirectExposureCheck` |

## Opportunity Attacks: sight and reach (FIN4c, 0.33.0-alpha.6)

| Rule | Code |
| --- | --- |
| Opportunity Attack only from a creature that can see the mover; unchecked sight still reminds (King Q-F17) | `rules/positioning.mjs opportunityReminders`, `canvas/visibility.mjs observerVisibility`, `workflow/positioning.mjs` |
| Reach measured edge to edge | `rules/positioning.mjs nearestCells`, `edgeGap`; `workflow/positioning.mjs edgeDistance` |

## Ryo, size rule, weapon Disarm/Trip (FIN5, 0.33.0-alpha.7)

| Rule | Code |
| --- | --- |
| Ryo can be given like items (King Q-F3) | `rules/transfer.mjs ryoPlan`, `workflow/transfer.mjs transferRyo` |
| Size rule for Trip, Grapple, Shove, Pin and Disarm (King Q-F4) | `rules/skill-resolution.mjs SIZE_GATED`, `skillActionGate` |
| Weapon Disarm/Trip success: full weapon damage (King Q-F5) | `workflow/skill-actions.mjs` |

## Optional rules, part 1 (PRESTD1 A-i, 0.34.0-alpha.1)

| Rule (world setting) | Code |
| --- | --- |
| `critDamage`: dice (book), total, maximize | `rules/activity-parse.mjs critFormula`, `workflow/activity-buttons.mjs` |
| `applyResistances` | `rules/damage.mjs damagePlan({ignoreTraits})`, `workflow/apply-damage.mjs` |
| `removeExpiredEffects` | `workflow/expiry.mjs expireEffects` |
| `npcRollBreakdowns`, `hideNpcNames` | `workflow/npc-privacy.mjs renderPrivacy`, `registerPrivacyHooks` |
| `hideNpcDamage`, `hideNpcConditions` | `workflow/npc-privacy.mjs gmWhisper`; `workflow/apply-damage.mjs`, `workflow/conditions.mjs` |
| `secretChecks` | `dice/roll-dialog.mjs`, `rules/roll-math.mjs readChoice`, `dice/roll.mjs secretByDefault` |

## Optional rules, part 2 (PRESTD1 A-ii, 0.34.0-alpha.2)

| Rule (world setting) | Code |
| --- | --- |
| `sharedVision` | `workflow/table-options.mjs` (Token `_isVisionSource` wrap) |
| `partyStatsVisible` | `applications/gm/party-overview.mjs` |
| `scaleTokens` | `rules/token-size.mjs tokenSizeFor`, `workflow/table-options.mjs` |
| `defeatedMarker` | `rules/token-size.mjs isDefeated`, `workflow/table-options.mjs` |
| `encumbranceStatus` | `rules/token-size.mjs encumbranceChange`, `workflow/table-options.mjs` |

## Optional rules, part 3 (PRESTD1 A-iii/iv, 0.34.0-alpha.3)

| Rule (world setting) | Code |
| --- | --- |
| `freeFeatLevels`, `freeFeatGroup` | `rules/progression.mjs freeFeatCount`, `view-models/character.mjs` |
| `flatProficiency`, `flatProficiencyValue` | `rules/progression.mjs proficiencyFor`, `data/actor/creature.mjs` |
| `critTable`, `fumbleTable` | `rules/variants.mjs tableFor`, `workflow/variant-tools.mjs renderTableButton` |
| `homebrewKeywords`, `homebrewWeaponGroups`, `homebrewDamageTypes`, `homebrewLanguages` | `rules/variants.mjs parseHomebrew`, `mergeHomebrew`; `workflow/variant-tools.mjs applyHomebrew` |
| `worldClock` | `rules/variants.mjs worldTimeParts`, `workflow/variant-tools.mjs WorldClock` |

## Jutsu scrolls (PRESTD1 Part B, 0.35.0-alpha.1)

| Rule | Code |
| --- | --- |
| Ninjutsu and Genjutsu scrolls; casting check vs the identify DC within the skill tier; no chakra; the scroll's numbers (King Q-P3, Q-P11) | `rules/scrolls.mjs`, `workflow/scrolls.mjs castFromScroll`, `workflow/cast-plan.mjs` (`sel.scroll`), `rules/cast-checks.mjs` |
| Identify with the matching skill only (King Q-P4) | `workflow/scrolls.mjs identifyScroll` |

## Loot, merchants, party stash (PRESTD1 Part C, 0.36.0-alpha.1)

| Rule | Code |
| --- | --- |
| Take from piles and the stash; buy at price × buy rate, sell at price × sell rate (King Q-P5) | `rules/loot.mjs`, `workflow/loot.mjs` |
| No taking from sheets you don't own (King Q-F2); the GM leaves an NPC's items as a pile | `applications/actor/character-sheet.mjs _onDropItem`, `workflow/loot.mjs leaveLoot` |

## Wands, flanking, crafting (PRESTD1 D-i, 0.37.0-alpha.1)

| Rule | Code |
| --- | --- |
| Wand: once a day, overcharge with a DC 10 flat check, destroyed when overcharged again or broken; recharges on a Long Rest | `rules/pf2e-emulation.mjs wandAction`, `workflow/wands.mjs` |
| Flanking: opposite sides, both in melee reach; −2 AC or advantage (King Q-P6) | `rules/pf2e-emulation.mjs flanks`, `canvas/flanking.mjs`, `dice/roll.mjs rollWithSpec` |
| Crafting: toolkit check vs rank DC; critical halves days, critical failure loses half the materials (King Q-P7) | `rules/pf2e-emulation.mjs craftOutcome`, `workflow/crafting.mjs` |

## Hazards and vehicles (PRESTD1 D-ii, 0.37.0-alpha.2)

| Rule | Code |
| --- | --- |
| Hazards: notice (Perception vs Stealth DC), disable (skill or toolkit vs DC), trigger; hardness adds to DR (King Q-P8: own actor type) | `rules/hazards.mjs`, `data/actor/hazard.mjs`, `applications/actor/hazard-sheet.mjs` |
| Vehicles: piloting check, collision damage and save, crew and passengers; hardness adds to DR | `rules/hazards.mjs`, `data/actor/vehicle.mjs`, `applications/actor/hazard-sheet.mjs` |

## Missions (PRESTD1 Part E, 0.38.0-alpha.1)

| Rule | Code |
| --- | --- |
| Mission Rewards, Tier Modifications (round down), Rank Multipliers, encounter costs | `config/missions.mjs`, `rules/missions.mjs` |
| XP: total purchased split evenly among active players; failure: the tier's payout (King Q-P9: verbatim) | `rules/missions.mjs missionPayout`, `applications/gm/mission-planner.mjs award` |

## Social encounters (PRESTD1 Part F, 0.39.0-alpha.1)

| Rule | Code |
| --- | --- |
| Attitudes, starting points, Patience; Motivations and Pitfalls (hidden) | `config/social.mjs`, `rules/social.mjs socialSetup`, `workflow/social.mjs startSocialEncounter` |
| Primary arguments vs Standard DCs (King Q-P10), Argument Results, Motivation bonus, Pitfall −4, Coerce in Diplomatic | `rules/social.mjs primaryPoints`, `workflow/social.mjs receiveSocial` |
| Support (Perform, Sense Motive, Recall Knowledge), See Through Lies, NPC actions, type risks, resolution | `workflow/social.mjs`, `rules/social.mjs socialOutcome` |

## Gradual ability increases (PRESTD1 A14, 0.41.0-alpha.1)

| Rule | Code |
| --- | --- |
| Optional: +1 ability at 2, 6, 10, 14, 18; feat and its Mastery rank at 4, 8, 12, 16, 19 (King Q-P12, Q-P14) | `rules/progression.mjs asiParts`, `advancement/steps.mjs`, `templates/apps/level-up.hbs` |

## Standardization STD0–STD2 (0.42.0-alpha.1)

| Rule | Code |
| --- | --- |
| Precise Ninjutsu (advantage on the cast's attack), Heightened (one target, first save at disadvantage), Piercing (no resistance, immunity as resistance, half DR) | data: action effects in the features pack; engine: `rules/action-effects.mjs`, `rules/elements.mjs`, `rules/damage.mjs damagePlan({handling})` |
| Rule elements v2 (directions, uses, targets, new keys) | `rules/elements.mjs`, `rules/effect-authoring.mjs` |

## Conditions and states as data (STD3, 0.43.0-alpha.1)

| Rule | Code |
| --- | --- |
| Condition and state effects on rolls, damage and casting (Blinded, Restrained, Prone, Invisible, Petrified, Stunned, Unconscious, Dodging, Staggered, Dazzled, Helped, Encumbered, Grappled, Incapacitated, Confused, Slowed) | data: `config/conditions.mjs` `rules` and `cast`; reader: `rules/condition-elements.mjs` |
| Crash: no cost reduction | data: Chakra Surge's Crash effect (`costReduction` 0); `rules/elements.mjs costReductionAllowed` |

## Trigger elements (STD4, 0.44.0-alpha.1)

| Rule | Code |
| --- | --- |
| Uncanny Dodge, Deflection | data: reaction recipes on the features; engine `rules/authored-reactions.mjs` |
| Extra Attack, General Technique | data: `attacks` elements; `rules/features.mjs attacksPerAction` via `rules/elements.mjs attackElements` |
| Adaptive Initiative | data: `initiativeOptions`; `dice/roll.mjs rollInitiative` via `initiativeChoices` |
| Binding Fury Stance | data: trigger element; `rules/triggers.mjs`, `workflow/triggers.mjs` |

## Stances (STD6b, 0.47.0-alpha.1)

| Rule | Code |
| --- | --- |
| Stance weapons (Ronin, Reaper, Lance, Raid, Berserker, Stalwart, Bullseye, Dancer, Assassin) | data: stance `flags.n5e.qualifies`; `rules/stance-weapons.mjs` |
| Blade: advantage on Opportunity Attacks; Bleeding on a critical hit | data: advantage element and `criticalHit` triggers on the stance |
| Great Weapon: reroll 1s and 2s on weapon damage dice | data: `rerollBelow`; `rules/elements.mjs shapeDice`, `workflow/activity-buttons.mjs` |
| Guardian: Dodging gives advantage on Str and Dex saves | data: advantage element on the stance |
| Power: Bruised on a critical hit | data: `criticalHit` trigger on the stance |
| Everything else the stances do | notes on each stance's Notes tab (King Q-S3) |

## Classes (STD6d)

| Rule | Code |
| --- | --- |
| Medical-Nin features | data: `content/automation/medical-nin.json` (review: `docs/classes/medical-nin-automation.md`); applied by `tools/content/apply-automation.mjs` |
| Medical Release: Wisdom for Medical jutsu | `n5e.keywordAbility.medical`; `data/item/jutsu.mjs _liveNumbers` |
| Preserve Life (rank dice maximized), Hematoxic Touch (reroll 1s and 2s) | action effects; `rules/jutsu-facts.mjs resolveRankValues`, `workflow/activity-buttons.mjs` (healing and damage) |
| Battle Medic d12 / 2d12 Unarmed die | `n5e.unarmed.die`; `rules/unarmed.mjs unarmedSpec` |
| Bonus Action / Reaction casting (Quickened, Reactive, Reapers Techniques) | `flags.n5e.castAs`, cast option `castAs`; `workflow/cast-plan.mjs` |
| Great Weapon Stance: critical hit triples the modifier | data: `critAbilityMod`; `workflow/activity-buttons.mjs` |
| Ninjutsu Specialist features | data: `content/automation/ninjutsu-specialist.json` (review: `docs/classes/ninjutsu-specialist-automation.md`) |
| Flow: concentration advantage and Focus each turn | data: elements on the Flow effect; `workflow/apply-damage.mjs concentrationCheck` facts |
| Clash advantage by Release (Breakers) | data: advantage elements; `workflow/clash.mjs` facts |
| Potent Ninjutsu | data: `maximizeAfter`; `rules/elements.mjs maximizeAfterBonus`, `workflow/activity-buttons.mjs` |
| Chakra Compression 0-cost casting | cast option `costDelta: "zero"`; `workflow/cast-plan.mjs` |

## ENG1a capabilities

| Rule | Code |
| --- | --- |
| Effects that heal, damage or force a save each turn | `rules/triggers.mjs triggerOutcomes`, `workflow/triggers.mjs fireTriggers` |
| Formulas reading the target's condition ranks | `rules/target-formula.mjs`; `workflow/activity-buttons.mjs` damage |
| Marks (one or N per caster) | effect activity `limit`; `workflow/trackers.mjs applyActivityEffect` |
| Auras and zones (Bastion, Storm Zone, Black Lotus Bloom, Pressure Stagnation) | effect `aura`; `rules/auras.mjs auraPlan`, `workflow/auras.mjs` |
| Reactions that protect others (Vitality Guard) | recipe `ally`; `rules/authored-reactions.mjs allyReactionOffers`, `workflow/reaction-adapters.mjs`, `workflow/reaction-dispatch.mjs` (offer `reactor`) |
| Widened, Dragwind (area), Subtle (no hand seals) | data: `areaSize`, `ignoreComponent`; `rules/elements.mjs castShaping`, `rules/area.mjs areaOf`, `rules/cast-checks.mjs castBlockers` |
