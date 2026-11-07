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
| Upkeep half cost; concentration DC max(15 + ranks, half damage) | `rules/cost.mjs` | 04, 10 |
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
