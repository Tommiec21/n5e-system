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
| Damage: interception, DR once before resistance, Pierce, Genjutsu psychic, res/vuln/immunity, temp pools | `rules/damage.mjs` | 03 |
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
