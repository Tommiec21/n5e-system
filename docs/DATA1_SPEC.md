# DATA1 function spec: data model update (disciplines, keywords, feature kinds, feats, weapon proficiency)

Status: **King said "Start" (2026-11-13). DATA1a published 0.16.0-alpha.1; DATA1b published 0.16.0-alpha.2; DATA2 published 0.16.0-alpha.3.**

Implements King's 2026-11-13 data decisions (N5e-Context.md Section 12, "Data structure decisions" and the canonical keyword list), plus the rulings below.

**Q2 rulings (King 2026-11-13)**
- Background features become clan features.
- All feats join one group called **Feats**. Their former categories (General, Skill, Chakra, Ninjutsu, Genjutsu, Taijutsu, Critical, Clan, Class, Archetype, Rare) become keywords that keep them separate.

## Releases

One world migration (id 3) and a pack rewrite per release. Existing worlds update when the GM loads them; compendium sources are rewritten by the same functions, so packs and worlds agree.

| Release | Content |
| --- | --- |
| DATA1a `0.16.0-alpha.1` | Jutsu disciplines, the Bukijutsu move, keyword normalization, feature kinds, Feats group |
| DATA1b `0.16.0-alpha.2` | Weapon base keywords, weapon proficiency by category + group pairs, universal Kunai/Shuriken/Senbon |
| DATA2 `0.16.0-alpha.3` | Unarmed Strike item for every creature, all Chapter 5 weapons imported, content rebuild check (stance recategorization: King's own update) |

## DATA1a

### Jutsu disciplines

**`JutsuData` schema (`data/item/jutsu.mjs`).** New field `disciplines: Set` holding any of `nin`, `tai`, `gen`. The old `discipline` string stays as the default cast discipline, so every current caller keeps working. MDISC1 later adds the choice at cast time.

| Function | File | Behaviour |
| --- | --- | --- |
| `migrateJutsuDisciplines(source)` | `migration/data1.mjs` (pure) | Moves the old discipline into the new list. `buki` becomes `tai` plus the `bukijutsu` keyword. Hijutsu that list several disciplines in their keywords (for example ninjutsu + genjutsu + fuinjutsu) get all of them in the list. |
| `JutsuData#castingDisciplines` (getter) | `data/item/jutsu.mjs` | The jutsu's disciplines, falling back to `[discipline]`. Used by known-list checks, swaps, prerequisites and learning limits ("counts as every listed discipline"). |
| `isBukijutsu(item)` | `rules/keywords.mjs` | True when the jutsu has the `bukijutsu` keyword. Replaces every `discipline === "buki"` check (sheet sections, Chain, Bukijutsu feats). |
| `CONFIG.N5E.disciplines.buki` | `config/core.mjs` | Kept only as a label for sheet grouping; no jutsu stores it any more. |

### Keywords

| Function | File | Behaviour |
| --- | --- | --- |
| `normalizeKeyword(key)` | `rules/keywords.mjs` (pure) | Converts kebab-case to the camelCase used by the Release keys: `main-branch` → `mainBranch`, `yin-release` → `yinRelease`, `tag-team` → `tagTeam`, `bio-serpent` → `bioSerpent`. |
| `splitKeyword(key)` | same | Splits the 9 mis-split compound keywords into their parts: `bukijutsu-fire-release` → `bukijutsu` + `fireRelease`; `medical-stable` → `medical` + `stable`; `tactile-chain` → `tactile` + `chain`; `ninjutsu-clash` → `ninjutsu` + `clash`. `genjutsu-visual` and the other stimulus forms become plain stimuli (`genjutsu-visual` → `visual`). `inhale` → `inhaled`. |
| `migrateKeywords(source)` | `migration/data1.mjs` | Applies both functions, removes `combination` (King: removed entirely), and drops duplicates. |
| `keywordKey(entry)`, `keywordValue(entry)`, `hasKeyword(item, key, value?)` | `rules/keywords.mjs` | Readers for keywords that carry a value (see Q7). Every current `keywords.has(...)` call keeps working. |
| Clan keyword registry | `config/jutsu.mjs`, clan data | Clan-registered keys are renamed the same way, so clans still recognize their own unique keywords. |

### Feature kinds and the Feats group

| Function | File | Behaviour |
| --- | --- | --- |
| `CONFIG.N5E.featureKinds` | `config/character.mjs` | Class Feature, Class Feature Option, Clan Feature, Clan Feature Option, Feat, plus the reserved NPC kinds (Traits, Abilities, Strikes, Role, Class, Freeform). |
| `migrateFeatureKind(source)` | `migration/data1.mjs` | `classFeature` stays; `classOption` → `classFeatureOption`; `clanFeature` stays; `clanOption` → `clanFeatureOption`; `backgroundFeature` → `clanFeature`; old feat categories → `feat` plus that category as a keyword. |
| `featKeyword(item)` | `rules/keywords.mjs` | The feat's group keyword (general, skill, chakra and so on). |
| `eligibleFeats` (changed) | `advancement/steps.mjs` | Filters by feat keyword instead of category. |
| Sheet groups, Compendium Browser filters (changed) | `view-models/*`, `rules/browser.mjs` | Features and feats group by the new kinds; the Feats group filters by keyword. |

### Migration

| Function | File | Behaviour |
| --- | --- | --- |
| Migration 3 "Data model 2026-11-13" | `migration/runner.mjs` | Runs `migrateJutsuDisciplines`, `migrateKeywords` and `migrateFeatureKind` on world items, actor items and unlinked token items. Uses the existing persist and failure records. |
| `tools/migrate-packs.mjs` | new | Applies the same pure functions to `packs/_source` so compendiums match. |

## DATA1b: weapons

| Function | File | Behaviour |
| --- | --- | --- |
| Base weapon keyword | packs + `migration/data1.mjs` | Every weapon gets its own base keyword (`kunai`, `shuriken`, `senbon`, `battleWire`, `kusarigama`...), from its name in the Chapter 5 tables. |
| `weaponProficiencies` (new actor field `system.traits.weaponProf`) | `data/actor/creature.mjs` | A set of `category:group` pairs (`simple:blade`, `martial:power`). It collects class and feat grants and always includes the universal Kunai, Shuriken and Senbon proficiency. |
| `isProficient(actor, weapon)` | `rules/proficiency.mjs` (pure) | True when one granted pair matches the weapon's category and **any one** of its groups, when the base keyword is granted (universal or explicit), or when it is the Unarmed Strike. |
| Weapon `proficient` (changed) | `data/item/equipment.mjs` | Derived from `isProficient` in `prepareActorDerived`, no longer stored. A stored `false` from before stays as a manual override until edited. |
| `migrateWeaponGrants(source)` | `migration/data1.mjs` | Class data that granted whole categories ("Simple weapons") becomes every group of that category, listed out. King: whole-category grants are removed. |

## DATA2: content

| Function | File | Behaviour |
| --- | --- | --- |
| `UNARMED_STRIKE` item data | `config/equipment.mjs` | Weapon, group Unarmed, property Unarmed, 0 Bulk, always proficient, can't be dropped or unequipped. Base 1 + Str bludgeoning; the active stance sets its die and type (`rules/unarmed.mjs`). Uses Str, or Dex when all of the creature's Taijutsu use Dex, and counts as Finesse. |
| `ensureUnarmedStrike(actor)` | `workflow/unarmed.mjs` | GM side: adds the item to every character and NPC on create and in migration 4. |
| Stance recategorization | packs + migration 4 | Each clan stance gets one category: Taijutsu, Bukijutsu or Chakra. The proposed mapping goes to King for approval before the data changes. Cross-Style keeps all three because its text allows it (to confirm). |

## Tests

- `tests/data1.test.mjs`: every keyword in the packs maps to a canonical key; Bukijutsu moves into the list; Hijutsu keep all their disciplines; feature kinds and feat keywords are migrated; Combination is gone; migrating twice changes nothing.
- `tests/proficiency.test.mjs`: pairs, multi-group weapons, universal proficiency, Unarmed Strike.
- `tools/check.mjs` gains a check that pack sources contain only canonical keywords and kinds.

## Questions for King

- **Q7. Keyword storage.** The approved list says keywords are stored as `{key, value}`. The simplest version that keeps every current check working stores them as text: `deadly:1`, `reinforced:2`, plain `finesse`. Rules test `keyword:deadly` and `keyword:deadly:1` exactly as approved. Use the text form?
- **Q8. Clan stances.** For DATA2, should I propose the Taijutsu/Bukijutsu/Chakra category for each clan stance for you to approve, or do you want to give the mapping yourself?

## Final results

### DATA1a: published `v0.16.0-alpha.1`
- **Q7.** Taken as approved when King said "Start": keywords are stored as text, `key` or `key:value`.
- **Built.**
  - `rules/keywords.mjs`: `SPLIT_KEYWORDS`, `REMOVED_KEYWORDS`, `normalizeKeyword`, `canonicalKeywords`, `canonicalKeywordList`, `keywordKey`, `keywordValue`, `hasKeyword`, `isBukijutsu`, `jutsuGroup`, `FEAT_KEYWORDS`, `featKeywords`, `FEATURE_KINDS`, `featureKind`, `isFeatItem`, `featGroups`.
  - `migration/data1.mjs`: `migrateJutsuDisciplines`, `migrateKeywords`, `FEATURE_KIND_MAP`, `migrateFeatureKind`, `migrateItemData1`.
  - `migration/runner.mjs`: migration 3 `migrateDataModel`.
  - `tools/migrate-packs.mjs`.
  - `JutsuData`: `disciplines`, plus the `group` and `castingDisciplines` getters.
  - `FeatData`: `keywords`; the default category is `feat`.
  - `CONFIG.N5E.featureKinds`.
- **Changed.**
  - Jutsu grouping and labels use `group`: character and combat view-models, item view-model, chat card, cast card, level-up, browser index.
  - `isBukijutsu` replaces the `discipline === "buki"` checks.
  - `scopeApplies` matches the buki scope by keyword and listed disciplines.
  - Cast options match by discipline, group or listed discipline.
  - Feature and feat filters in eligibility, clan, steps, background, the Features tab, the item sheet ("Kind") and the browser.
  - The content builders apply `migrateItemData1` before writing.
- **Differs from the spec.**
  - The display group is Bukijutsu only when the main discipline is Taijutsu, so the 4 Ninjutsu that also list Bukijutsu stay Ninjutsu (castable as Ninjutsu or Taijutsu).
  - `jutsuGroup(item)` was added for raw sources.
- **Tests.**
  - Attempt 1: 5 old-model expectations failed. Four were rewritten to the new model.
  - "Whole jutsu book … discipline totals" failed on attempts 1 and 2, so the process stopped. The work was saved to `wip/data1a` and a handoff written.
  - King approved the group fix and a third attempt, which passed.
  - New `tests/data1.test.mjs` (4 tests) passed on its first attempt. Final: 318 pass, 2 skipped. Lint and check pass.

### DATA1b: published `v0.16.0-alpha.2`
- **Built.**
  - `rules/proficiency.mjs` (pure): `WEAPON_GROUPS`, `WEAPON_CATEGORIES`, `UNIVERSAL_WEAPONS`, `baseWeaponKey`, `expandGrant`, `expandGrants`, `isProficientWith`.
  - `WeaponData`: `keywords`.
  - `creature.mjs _collectItemGrants`: `grants.weaponProf` collects class `weaponProficiencies` and feat `grants.proficiencies` entries starting `weapon.`, expanded to pairs.
  - `workflow/attack.mjs`: proficiency comes from `isProficientWith`; a stored `proficient: false` still wins.
  - `migration/data1.mjs`: `migrateWeaponKeywords`, `migrateClassWeaponGrants`, `migrateItemData1b`; runner migration 4 `migrateWeapons`; `tools/migrate-packs.mjs` and the content builders apply it.
- **Differs from the spec.**
  - The grants live in `system.grants.weaponProf` (derived), not a stored `system.traits.weaponProf`, beside the other derived grants.
  - Proficiency is decided when attacking (`isProficientWith`) rather than written onto the weapon, so a stored `false` stays a manual override.
  - A weapon with no groups is matched by category alone. NPCs are always proficient.
  - Free choices such as "one exotic weapon" stay as text until a later batch adds the choice.
  - The packs hold only one weapon item (Kunai); the Chapter 5 tables are not imported, so their base keywords arrive when they are.
- **Tests.** New `tests/proficiency.test.mjs` (3 tests). One full-suite run, which passed on the first attempt: 321 pass, 2 skipped. Lint and check pass.

### DATA2: published `v0.16.0-alpha.3`
- **King's direction (2026-11-13).** Import all weapons as part of DATA2. Stances: no suggestions; King recategorizes them in his own updates (Q8 closed).
- **Built.**
  - `tools/content/sources/weapons.md`: the Chapter 5 weapon tables, copied from the rules KB source.
  - `tools/content/build-weapons.mjs`: `parseProperty`, `parseWeaponTables`, `weaponItem`; writes 55 weapons in Simple/Martial/Exotic folders under Weapons. The Kunai keeps id `n5eKunaiWeapon01`.
  - `config/equipment.mjs`: `unarmedStrike` item data; weapon group `unarmed`.
  - `rules/unarmed.mjs`: `isUnarmedStrike`, `equippedWeapons`.
  - `N5eActor#_preCreate` adds the Unarmed Strike to new characters and NPCs. `N5eItem` refuses a second copy, deletion (unless `n5eForce`) and unequipping.
  - `workflow/unarmed.mjs`: `ensureUnarmedStrike`; runner migration 5 `addUnarmedStrikes`.
  - `weaponAttackSpec` rolls the item as the unarmed strike. Weapon strikes, the Combat tab and feature checks ignore it.
- **Differs from the spec.**
  - The item is added on the creating client in `_preCreate`, not by a GM-side hook, and the migration is id 5, not 4.
  - No stance recategorization (King's call).
  - Unarmed Strike Str/Dex/Finesse and thrown-weapon d4 ammunition dice are left to ATK1: thrown weapons without the Ammunition property don't roll an Ammunition Die yet, because the attack can't yet tell a throw from a melee swing.
  - The content rebuild check: `tools/migrate-packs.mjs` changed 0 of 4,170 files, so every builder already writes the DATA1 shape.
- **Tests.** New `tests/weapons.test.mjs` (4 tests). One full-suite run, which passed on the first attempt: 325 pass, 2 skipped. Lint and check pass.
