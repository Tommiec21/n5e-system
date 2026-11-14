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
| Fury, Marks, Branded, Amps (limits), 8-Inner Gates, resaves | `rules/trackers.mjs`, `workflow/trackers.mjs`, `config/combat.mjs` | 03, 05, Context 6/8f |
| Effects ending on the source's turn | `rules/trackers.mjs expiringEffects`, `workflow/trackers.mjs` | — |
| Stance effects only while active | `documents/active-effect.mjs isSuppressed` | 09 |
| Feature choices, Extra Attack, Superior Assault crit, recovery requirements | `rules/features.mjs` | 12 |
| Feat proficiency grants (Mastery when already proficient) | `creature.mjs _collectItemGrants` | 09 |
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
| Incapacitated does not end concentration | `rules/turn-start.mjs` |

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
