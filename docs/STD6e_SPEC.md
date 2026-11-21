# STD6e function spec: clans as data

Status: **Approved by King 2026-11-21 ("Begin."). E1 Land of Earth built (0.79.0-alpha.1). Next: E2 Land of Wind.**

Plan: `docs/STD_SPEC.md` (STD6e: "Clan traits, hijutsu, clan conditions and keywords as data; `workflow/clan.mjs` name branches removed"). Same method as the class pass (`docs/STD6d_SPEC.md`).

## What's there today (survey, 2026-11-21)

| Content | Count | State |
| --- | ---: | --- |
| Clans | 44 (43 clans + Non-Clan) | Clan items carry ASI, speed, skills, affinities, languages, Hijutsu abilities, keywords and advancement as data. |
| Clan features and options | 621 (in the 43 clans) | No reviewed entries; no activities or effects (only Nara has 2 buttons). Mechanics today come from the text fallback. |
| Non-Clan | 36 own features and options, 577 Latent Bloodline variants | The variants copy other clans' features (Latent Hyūga, Latent Uchiha...). |
| Hijutsu | 408 | 16 with buttons; none reviewed. |
| Clan stances | 26 | No elements (STD6b covered the Fighting Stances compendium only). |
| Clan Amp cards | 34 | Done (AMP1d). |
| Clan condition cards | 35 | Done (CCOND1c); new ones added when a clan's text defines one. |
| Name branches | `"non-clan"` in `workflow/clan.mjs` and `advancement/clan.mjs` | The +1/+1/+1 ability pattern. |

## How a clan is done

- **One table per clan:** `content/automation/clans/<clan>.json`, one entry per feature, option, stance and (Q-E1) Hijutsu, keyed by identifier; the same entry keys as the class tables (`status`, `rules`, `activities`, `castOptions`, `pools`, `effects`, `dropEffects`, `duration`).
- **Applied by** `node tools/content/apply-automation.mjs` (it learns the clans pack); `npm run check` fails when a clan's item has no entry, an entry is invalid, or the table isn't applied.
- **Reviewed:** every listed item is marked `flags.n5e.reviewed`, so its text is display only.
- **Review table per clan:** `docs/clans/<clan>-automation.md` (features and options in level order, then stances, then Hijutsu by rank), with status, what's automated and what stays at the table.
- **Statuses:** automated, partly automated, notes only, no mechanics (as STD6d).
- **Clan pools** (Sharingan, Byakugan and the like) appear in the Class & Clan Limits menu automatically.
- **New condition cards** when a clan defines one that isn't a card yet; text issues go on the errata list; unclear mechanics become questions, never guesses.
- **Non-Clan** waits (King Q-E3), so its two `"non-clan"` name branches stay on the allowlist for now.

## Proposed batches (a few clans per release)

| # | Batch | Clans | Features and options |
| --- | --- | --- | ---: |
| E1 | Land of Earth | Bakuton, Futton, Shí Hóu, Yoton | 76 |
| E2 | Land of Wind | Fūshin, Hanami, Jiton, Konjiki, Shakuton | 58 |
| E3 | Land of Lightning | Chinoike, Keton, Ranton | 46 |
| E4 | Land of Water | Genwa, Hoshigaki, Hozuki, Kaguya, Vesper, Yamada, Yuki | 100 |
| E5 | Land of Sound | Jinzo, Jūgo, Kashu, Shoton, Tsuchigumo | 110 |
| E6 | Land of Fire I | Aburame, Akimichi, Hatake, Hyūga, Iburi, Inuzuka, Kurama | 82 |
| E7 | Land of Fire II | Namikaze, Nara, Sarutobi, Senju, Uchiha, Uzumaki, Yamanaka | 89 |
| E8 | Minor Lands | Hebi, Hoshi, Kuru, Ryu, Shikigami | 60 |
| — | Non-Clan | Not done (King Q-E3: Clan Feats and Latents wait for their overhaul) | — |

Plus each clan's stances and (Q-E1) Hijutsu in the same batch.

## King's answers (2026-11-21)

- **Q-E1:** Hijutsu with their clan, at the same time.
- **Q-E2:** clan stances with their clan.
- **Q-E3:** no. Clan Feats and Latents are not done at all: a major overhaul is coming for them.
- **Q-E4:** E1 first, then down the table.

## Engine additions

| # | Addition | Behaviour |
| --- | --- | --- |
| E-D1 | Clan tables | `content/automation/clans/<clan>.json` over the clan's folder in the clans pack (`tools/content/apply-automation.mjs` clanItems); review tables `docs/clans/<clan>-automation.md`. |
| E-D2 | Highest discipline | A feature save's DC source `"highest"` and an attack's discipline `"highest"`: the best of your Ninjutsu, Taijutsu and Genjutsu numbers ("your highest jutsu save DC"). |
| E-D3 | Hijutsu upcasts | A Hijutsu's per-rank buttons (`flags.n5e.jutsuBookImport.activitiesByRank`) carry the extra dice of each higher rank, like the jutsu importer's. |
| E-D4 | Cast rank on summons | A summon from a cast card passes its rank; summoner links can use `@rankValue` (D 1 ... S 5): the Clay constructs' hit points. |
| E-D5 | Item fields from tables | A table entry's `system` sets item fields (a stance's `unarmedDie` and `unarmedType`: Ballistic Knuckle). |

## E1 Land of Earth (0.79.0-alpha.1)

Review tables: `docs/clans/bakuton-automation.md`, `futton-automation.md`, `shi-hou-automation.md`, `yoton-automation.md` (117 items: 95 partly automated, 22 notes only).

- **Bakuton:** Primes (pool) with Prime and Detonate buttons; the ten Payloads as save buttons; the Clay Bombings attack on the Artistic Cataclysm stance; Ballistic Knuckle's 2d8 force; every Hijutsu with its buttons and upcast dice; the Clay Spider, Bird, Centipede and Dragon summons (Class & Clan Summons › Bakuton) with hit points by cast rank.
- **Futton:** Pressure (pool) with Boil Knuckle, Jet Dash and Vent Strike; Solid Fog; the Alchemical Fog and Steam Engine options; Caustic Aura and Great Wall Dissolution; every Hijutsu (Freight Train and Erupting Steam Wall keep their Amp buttons).
- **Shí Hóu:** Inner Chi spends on every transformation, Golden Strands, Primal Vanity and Nirvana; Confusing Technique.
- **Yoton:** Molten Terrain, Onyx, Volcanic and the Foundations with saves; World Forge; every Hijutsu.
- **At the table:** areas and movement, the second nature release (set it on the sheet), damage-type swaps, Spirit Bonded weapon properties.

## Questions for King (nothing waits on them)

- **Q-E5 Missing Bakuton Hijutsu:** Absolute Death Bombing's text also holds two B-Rank Hijutsu, Explosion Release: Clay Centipede and Explosion Release: Chain Reaction Blitz, which aren't items of their own. Add them as Hijutsu? (The Clay Centipede NPC is built.)
- **Q-E6 Primes and Pressure:** neither says when it's lost. Both pools empty at the start and end of combat (changeable in Class & Clan Limits). Fine?
- **Q-E7 Ballistic Knuckle:** "no longer adds your ability modifier" is a note (take it off the roll). Should the stance drop it automatically?

## Text issues (for the errata list)

- Bakuton: Clay Dragon says "two centipedes"; Clay Spiders' upcast starts "above C-Rank" (it's D-Rank); Chain Reaction Blitz's upcast grows "the size of the cone"; Volatile Movement says "half as much on a failure"; Artistic Cataclysm "unique for of combat".
- Futton: Steam Bullet and Hiding in Acid Rain say "Scaled" (Scald); Hiding in Acid Rain's upcast has no cost increase.
- Yoton: Hijutsu Flexibility says "Futton Clan Hijutsu"; Lava Stream "chape"; Rubber "gin a range"; Quicklime Hardening has no success result.

## Progress log

- 2026-11-21 Claude: spec written from a survey of the clans pack. Nothing built.
- 2026-11-21 King: "Q1. Same time. Q2. Yes. Q3. No. Clan Feats and Latents should not be done at all. There is a major overhaul coming for them. Q4. Sure. Begin." Claude: E1 Land of Earth built (117 items), engine E-D1–E-D5, Clay construct summons; published 0.79.0-alpha.1. Q-E5–Q-E7 asked; nothing waits on them.

