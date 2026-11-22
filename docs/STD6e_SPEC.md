# STD6e function spec: clans as data

Status: **Approved by King 2026-11-21 ("Begin."). E1 Land of Earth built (0.79.0–0.79.2); E2 Land of Wind built (0.80.0-alpha.1). Next: E3 Land of Lightning.**

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
| E-D6 | Pool unit lifetime | A pool's `lifetime` (seconds): each unit lasts that long unless spent (spending uses the oldest; the actor's `flags.n5e.poolStamps`); the active GM drops expired units as world time passes (King Q-E6: Primes, Pressure). |
| E-D5 | Item fields from tables | A table entry's `system` sets item fields (a stance's `unarmedDie` and `unarmedType`: Ballistic Knuckle). |

## E1 Land of Earth (0.79.0-alpha.1)

Review tables: `docs/clans/bakuton-automation.md`, `futton-automation.md`, `shi-hou-automation.md`, `yoton-automation.md` (117 items: 95 partly automated, 22 notes only).

- **Bakuton:** Primes (pool) with Prime and Detonate buttons; the ten Payloads as save buttons; the Clay Bombings attack on the Artistic Cataclysm stance; Ballistic Knuckle's 2d8 force; every Hijutsu with its buttons and upcast dice; the Clay Spider, Bird, Centipede and Dragon summons (Class & Clan Summons › Bakuton) with hit points by cast rank.
- **Futton:** Pressure (pool) with Boil Knuckle, Jet Dash and Vent Strike; Solid Fog; the Alchemical Fog and Steam Engine options; Caustic Aura and Great Wall Dissolution; every Hijutsu (Freight Train and Erupting Steam Wall keep their Amp buttons).
- **Shí Hóu:** Inner Chi spends on every transformation, Golden Strands, Primal Vanity and Nirvana; Confusing Technique.
- **Yoton:** Molten Terrain, Onyx, Volcanic and the Foundations with saves; World Forge; every Hijutsu.
- **At the table:** areas and movement, the second nature release (set it on the sheet), damage-type swaps, Spirit Bonded weapon properties.

## E2 Land of Wind (0.80.0-alpha.1)

Review tables: `docs/clans/fushin-automation.md`, `hanami-automation.md`, `jiton-automation.md`, `konjiki-automation.md`, `shakuton-automation.md` (115 items: 100 partly automated, 15 notes only).

- **Fūshin:** High Pressure (pool, each lasts 1 minute) with Swirl and every Wind Whisper's spend; Wind Scythe with Jet Needle and Cleave; every Hijutsu with its tiers and upcast dice.
- **Hanami:** Boons/Banes (pool, back on a short or long rest) with a button for each; the Medical Fist stance (d6 Unarmed Damage, Athletics Mastery); Monstrous Burst and Healers Touch as cast dialog options on every Hanami Hijutsu; every Hijutsu (Sapping Fist and Defensive Cloak keep their Amp buttons).
- **Jiton:** Magnetic Charges (pool, +1 at the start of your turns) with every Magnetic Tag; each Dust Veil particle's save and Potency I condition (Volatile, Heavy, Brined, Unstable); Magnetic Surge; every Hijutsu (Dust Coat keeps its Amp button).
- **Konjiki:** Liquid Metal Ingots (pool, back on a short rest) with every Alomancy; Alomancy Infusions as cast dialog options on the Hijutsu; every Hijutsu.
- **Shakuton:** Scorch Charges (pool, each lasts 1 minute) with every Desiccated Heat ability; each Hijutsu's Scorch effect as a cast dialog option that spends its charges.

## Questions for King (nothing waits on them)

- **Q-E5 Missing Bakuton Hijutsu:** answered (King 2026-11-21): their own items. Explosion Release: Clay Centipede and Chain Reaction Blitz are B-Rank Hijutsu (split out of Absolute Death Bombing's text, added to the clan's Hijutsu list; 0.79.1-alpha.1).
- **Q-E6 Primes and Pressure:** answered (King 2026-11-21, after reading the full features): "1 minute cleanse unless spent". Each Prime and each Pressure lasts 1 minute from when it's gained unless spent first (pool `lifetime: 60`; spending uses the oldest; 0.79.2-alpha.1).
- **Q-E7 Ballistic Knuckle:** answered (King 2026-11-21): dropped automatically (stance field `unarmedNoMod`; 0.79.1-alpha.1).

- **Q-E8 Hanami Combo/Finisher Boon:** answered (King 2026-11-21): yes. Its own option item (split out of Boosting Boon's text; 0.80.1-alpha.1).
- **Q-E9 Fūshin Divine Wind stance:** answered (King 2026-11-21): yes. The stance's text is now Divine Winds' stance part (0.80.1-alpha.1).
- **Q-E10 Blazing Aura:** answered (King 2026-11-21): "+1d6 bonus damage". 1d6 at 3rd, 2d6 at 7th, 3d6 at 15th, as a damage button (0.80.1-alpha.1).
- **Q-E11 Jiton Magnetic Charges:** answered (King 2026-11-21): "Share duration". Units gained at the start of a turn (or any turn, round or combat recovery) carry the pool's lifetime too (0.80.1-alpha.1).

## Text issues (for the errata list)

- Bakuton: Absolute Death Bombing's text held two other Hijutsu (now split out, Q-E5); Clay Dragon says "two centipedes"; Clay Spiders' upcast starts "above C-Rank" (it's D-Rank); Chain Reaction Blitz's upcast grows "the size of the cone"; Volatile Movement says "half as much on a failure"; Artistic Cataclysm "unique for of combat".
- Futton: Steam Bullet and Hiding in Acid Rain say "Scaled" (Scald); Hiding in Acid Rain's upcast has no cost increase.
- Yoton: Hijutsu Flexibility says "Futton Clan Hijutsu"; Lava Stream "chape"; Rubber "gin a range"; Quicklime Hardening has no success result.
- Fūshin: Divine Wind stance holds Wind Scythe's text (fixed, Q-E9); "tuns"; Storm Bastion's upcast starts "above D-Rank" (it's C-Rank); Soaring Wind Veil, Storm Geyser, Vicious Vortex and Wind Serpent's Maw repeat their results above their tier list.
- Hanami: "Marital Arts"; the Boosting Boon option holds the Combo/Finisher Boon (split out, Q-E8); Blazing Aura has no base damage (Shakuton, Q-E10).
- Konjiki: Storm of Steel "1 rank of Ble"; Steel Rain and Steel Telekinesis "For each rank for each rank".
- Shakuton: Hellfire Murder "30-foor", "taking On a failed save"; Immolation "An Immolated created".

## Progress log

- 2026-11-21 Claude: spec written from a survey of the clans pack. Nothing built.
- 2026-11-21 King: "Q1. Same time. Q2. Yes. Q3. No. Clan Feats and Latents should not be done at all. There is a major overhaul coming for them. Q4. Sure. Begin." Claude: E1 Land of Earth built (117 items), engine E-D1–E-D5, Clay construct summons; published 0.79.0-alpha.1. Q-E5–Q-E7 asked; nothing waits on them.
- 2026-11-21 King: "Q5. Make them as its own item. Q6. Populate the entire feature. Q7. Drop it automatically." Claude: Clay Centipede and Chain Reaction Blitz as their own Hijutsu; Ballistic Knuckle drops the ability modifier; published 0.79.1-alpha.1. Full Priming Cataclysm, Broiling Rampart and Steam Engine text posted for Q-E6.
- 2026-11-21 King: "1 minute cleanse unless spent." Claude: pool unit lifetimes (E-D6); Primes and Pressure last 1 minute each; published 0.79.2-alpha.1.
- 2026-11-21 King: "Next batch." Claude: E2 Land of Wind built (115 items); published 0.80.0-alpha.1. Q-E8–Q-E11 asked; nothing waits on them.
- 2026-11-21 King: "Q8. Yes. Q9. Yes. Q10. +1d6 bonus damage. Q11. Share duration." Claude: Combo/Finisher Boon option, Divine Wind stance text, Blazing Aura damage, turn gains share the pool lifetime; published 0.80.1-alpha.1.
