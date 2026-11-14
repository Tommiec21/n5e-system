# DATA1 function spec: data model update (disciplines, keywords, feature kinds, feats, weapon proficiency)

Status: **proposed 2026-11-13. Awaiting King's approval. No code written.**

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
| DATA2 `0.16.0-alpha.3` | Unarmed Strike item for every creature, stance recategorization (clan stances become Taijutsu, Bukijutsu or Chakra), content rebuild check |

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

_(filled in after each release)_
