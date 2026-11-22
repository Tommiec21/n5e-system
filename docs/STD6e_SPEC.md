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
| E-D7 | Combat recovery amounts | A pool's turn, round and combat recovery uses its amount: `formula` regains that many (Jiton's 1 Magnetic Charge a turn; before this it refilled), `half` half the max, and the new `empty` drops it to 0 (Stellar Charges and Voltage start each combat at 0; Starlights end with it). `rules/recovery.mjs combatRecoveredValue`. |
| E-D8 | Rest recovery "empty" | A long rest can empty a pool too (Jūgo's Nature Energy resets to 0). `rules/rest.mjs`. |
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

## E3 Land of Lightning (0.81.0-alpha.1)

Review tables: `docs/clans/chinoike-automation.md`, `keton-automation.md`, `ranton-automation.md` (84 items: 74 partly automated, 10 notes only).

- **Chinoike:** the Ketsuryugan Amp (and its 11th-level card); Crimson Charges (pool, back on a short or long rest) with every Crimson Evocation; each Hijutsu's Blood Detonation as a cast dialog option for 2 Crimson Charges (Rivers of Blood: any number); Crimson Pact's Amp; Crimson Domain (once per long rest); every Hijutsu; the Blood Dragon summon (Class & Clan Summons › Chinoike), using your highest jutsu attack bonus and save DC.
- **Keton:** Starlights (pool, each lasts 1 minute, gone when combat ends) with Manifest and Dismiss; the Solar Flare stance (Stellar Knuckle and Plasma Burst attacks); Stellar Charges (pool, 0 each combat) with every Constellation; Fission's saves; Event Horizon's Amp (once per long rest, 4 Stellar Charges); every Hijutsu (Light Binding Step keeps its Amp button).
- **Ranton:** the Laser Circus stance and attack (also on Storm Release Manifestation - Storm); Voltage (pool, 0 each combat) with every Storm Circuit; Spear and Shield Form effects (Shield Form's temporary hit points from your Voltage); every Gale Circuit; Eye of the Storm (once per long rest); every Hijutsu.
- **At the table:** Starlight and Refraction Point positions, damage-type swaps, the second nature release (set it on the sheet), branch-only items (their notes say the branch).

## E4 Land of Water (0.82.0-alpha.1)

Review tables: `docs/clans/genwa-automation.md`, `hoshigaki-automation.md`, `hozuki-automation.md`, `kaguya-automation.md`, `vesper-automation.md`, `yamada-automation.md`, `yuki-automation.md` (151 items: 99 partly automated, 52 notes only).

- **Genwa:** Uplink and Downlink stance buttons, Radiant Beam and Radiant Saber attacks, Signal Boosted's Amp; each Hijutsu's Angel Link and Demon Link as cast dialog options; Data Leak; every Data Channel; every Hijutsu (the Neon Antivirus has no stat block: held, like Q-E14).
- **Hoshigaki:** Apex Predator's four Amp cards (1st, 7th, 11th, 15th); Ravenous Chakra by rank; the Tiger Shark's Maw bite; Shark Skinned's DR; Abyssal Bulwark's resistances; King of the Deep (once per long rest); every Predator Trait and Surge.
- **Hozuki:** Hydration (pool, back on a long rest) with every Liquification Technique and the Water Bullet attack; each Hijutsu's Hydrofication as a cast dialog option for 1 Hydration; Mirage Regent and Tidal Gains Amps (4 Hydration); the Steam Imp summon (Class & Clan Summons › Hozuki); every Hijutsu.
- **Kaguya:** Battle Lust (pool, up to 5, gone after combat) and its Amp cards; each Hijutsu's Battle Lust spend as a cast dialog option; Desire for Battle; every Defining Anatomy; every Hijutsu.
- **Vesper:** the Claws of Night stance (d8 slashing, Crimson Hemorrhage save); Echolocation and Pinging; Hypnotic Voice and Gaze; Umbral Monarch's Amps with Sonic Lance and Umbral Shockwave; every Nocturnal Dominion and Supremacy option.
- **Yamada:** the Tameshi Itto-ryu stance with Empty Blade; each Hijutsu's Ideal Cut and Tao as cast dialog options; the Sever saves; every Asaemon Discipline and Tao Attunement; every Hijutsu.
- **Yuki:** Ice Mirrors (pool, each lasts 1 minute); every Bloody Mist Legacy path; Sanctum of Ice; Demonic Ice Prism (once per rest); every Hijutsu.
- **Past rulings applied, not asked again:** copied Amp text removed from Ravenous Chakra, Blood As Thick As Oil, Mirage Regent, Dread Weave and Network Integration (King Q-E12); the Vesper and Yamada stance items hold their stance's own text (King Q-E9).
- **Fixed from E3:** Bloody Resilience's 15th-level clot rolled 1d8 once; it's 1d8 per rank removed.

## E5 Land of Sound (0.83.0-alpha.1)

Review tables: `docs/clans/jinzo-automation.md`, `jugo-automation.md`, `kashu-automation.md`, `shoton-automation.md`, `tsuchigumo-automation.md` (174 items: 124 partly automated, 50 notes only).

- **Jinzo:** Shin-Pet and Shin-Seal focus buttons; Shin-Seals (pool, up to your proficiency bonus, each 1 minute) with each Hijutsu's Shin-Seal spend as a cast dialog option; Soft Physique; every Biovolution and Synthwakening; Synthetic Chakra Mode's Amps; every Hijutsu. The Bio-Pet stays a note (Q-E19).
- **Jūgo:** Nature Energy (pool, 0 after a long rest) with Heal and every expenditure; each Hijutsu's Amplify as a cast dialog option; Flesh Crafting's Tyrants Presence and King of Savagery; every Feral Instinct; The Hunter; Cascading Mania; the four mutations as notes.
- **Kashu:** the three Doki summons (Class & Clan Summons › Kashu; their stat blocks were printed under Chains of Fantasia); Resonance (pool, each 1 minute, 0 each combat) with every Melody and Symphony; Bell Wires (pool, gone after combat) with every Mnemody; the Harmonies; Killing Frequency; every Hijutsu.
- **Shoton:** Hardness (pool, back on a long rest); Crystal Weapon Dance and Crystal Aura; every Crystal Type; Crystal Ascension; the Crystal Rabbit, Deer and Dragon summons (Class & Clan Summons › Shoton) with AC, DR and hit points by cast rank; every Hijutsu (Crystal Armor and Crystal Wheel keep their Amp buttons).
- **Tsuchigumo:** Web Anchors (pool, each 1 minute) with every Silk Weave; Arachnid's Amp; the Brood Mother summon (Class & Clan Summons › Tsuchigumo; its Broodlings have no stat block: held, like Q-E14); every Hijutsu.
- **Past rulings applied:** copied Amp text removed from Synthetic Battle Aura and Web Walker (Q-E12).
- **King's Q-E17 and Q-E18 (in this release):** Hydration's other triggers regain 1; Vesper's duplicate "Claws of the Night" stance is deleted (its level-7 grant removed; Umbral Monarch's Beast Claws points at Claws of Night).

## E6 Land of Fire I (0.84.0-alpha.1)

Review tables: `docs/clans/aburame-automation.md`, `akimichi-automation.md`, `hatake-automation.md`, `hyuga-automation.md`, `iburi-automation.md`, `inuzuka-automation.md`, `kurama-automation.md` (143 items: 109 partly automated, 34 notes only).

- **Aburame:** the Swarm Chakra stance; each Hijutsu's "Swarm active" as a cast dialog option; Kikaichu Swarm attacks; Festering Brood; Grand Veil's Plague Swarm and Queen's Call; Beetles and Mosquitoes; every Hijutsu.
- **Akimichi:** Calories (pool) with every Caloric Art; the Expansion Technique stance; each Hijutsu's "Pay with Calories" (cost zero, spends Calories) and Expansion Crash as cast dialog options; Lunch Breaks; Butterfly Mode; Seismic Bounce; every Hijutsu.
- **Hatake:** White Chakra and Command Dice (pools) with every White Wolf Art, Pack Tactic and spend; the White Wolf Amp; Captain, Hatake.
- **Hyūga:** the Byakugan; the Gentle Fist stance; each Hijutsu's Eight Trigram as a cast dialog option with the Disrupt / Block saves; every Dogma; the Eight Trigrams features; Heavenly Technique; every Hijutsu.
- **Iburi:** the Smoke Style stance with Dancing Cinder, Fume Brawler, Cinder Bow and Smoke Chains; Smoke Style cast dialog options; Will-O-Wisps; Aberration of Smoke; Ashen Monarch; Black Lung; every Hijutsu.
- **Inuzuka:** the Four-Legs stance; the Feral Amps; each Tag-Team Hijutsu's Nin-Dog effect as a cast dialog option; Two-Headed Wolf; every Hijutsu. The Nin-Dog and Two-Headed Wolf stat blocks are held (H6, H7).
- **Kurama:** Oni-Coils (pool); every Onijutsu as a cast dialog option on your Genjutsu (The Pain Is Real on damaging Action Ninjutsu, Taijutsu and Bukijutsu); Illusion Made Manifest; Well Rested; Inner Self. The Dream Walker's stat block is held (H8).
- **Past rulings applied:** copied Amp text removed from Caloric Arts, Last to Move Loses, Savage Attacker and Déjà vu (Q-E12); the Akimichi, Hyūga and Inuzuka stance items hold their stance's own text (Q-E9).

## Questions for King (nothing waits on them)

- **Q-E5 Missing Bakuton Hijutsu:** answered (King 2026-11-21): their own items. Explosion Release: Clay Centipede and Chain Reaction Blitz are B-Rank Hijutsu (split out of Absolute Death Bombing's text, added to the clan's Hijutsu list; 0.79.1-alpha.1).
- **Q-E6 Primes and Pressure:** answered (King 2026-11-21, after reading the full features): "1 minute cleanse unless spent". Each Prime and each Pressure lasts 1 minute from when it's gained unless spent first (pool `lifetime: 60`; spending uses the oldest; 0.79.2-alpha.1).
- **Q-E7 Ballistic Knuckle:** answered (King 2026-11-21): dropped automatically (stance field `unarmedNoMod`; 0.79.1-alpha.1).

- **Q-E8 Hanami Combo/Finisher Boon:** answered (King 2026-11-21): yes. Its own option item (split out of Boosting Boon's text; 0.80.1-alpha.1).
- **Q-E9 Fūshin Divine Wind stance:** answered (King 2026-11-21): yes. The stance's text is now Divine Winds' stance part (0.80.1-alpha.1).
- **Q-E10 Blazing Aura:** answered (King 2026-11-21): "+1d6 bonus damage". 1d6 at 3rd, 2d6 at 7th, 3d6 at 15th, as a damage button (0.80.1-alpha.1).
- **Q-E11 Jiton Magnetic Charges:** answered (King 2026-11-21): "Share duration". Units gained at the start of a turn (or any turn, round or combat recovery) carry the pool's lifetime too (0.80.1-alpha.1).

- **Q-E12 Stray Amp text:** answered (King 2026-11-21): "Remove the copy." Crimson Architect no longer holds Crimson Pact's Amp; Aphelion – The Mirror and Stellar Convergence no longer hold Event Horizon's (0.81.1-alpha.1).
- **Q-E13 Aphelion – The Mirror:** its text gives no Stellar Charge cost (every other Constellation has one). What does it cost? King asked for the full text (posted 2026-11-21); waiting on his answer.
- **Q-E14 Storm Release: Snake Chains:** "The Storm Snake has the listed statistics" but no stat block is in the text. What are its statistics? (Then it becomes a summon like the Blood Dragon.) King 2026-11-21: "Hold off on this." Listed under Held stat blocks below.
- **Q-E15 Plasma Release: Light Binding Step:** asked in error: King already answered this as Q-F14 (docs/AMP1F_SPEC.md, 2026-11-21): the reaction line is a mistake and isn't there. The note says so (0.81.1-alpha.1).
- **Q-E16 Crimson Weaponry:** answered (King 2026-11-21): rolling a 1 or 2 doesn't reduce the ammunition die by one step (the note says so; 0.81.1-alpha.1).

- **Q-E17 Hozuki Hydration:** answered (King 2026-11-21): "1." Each non-rest trigger regains 1 Hydration (0.83.0-alpha.1).
- **Q-E18 Vesper's two stance items:** answered (King 2026-11-21): "Yes." "Claws of the Night" is deleted (0.83.0-alpha.1).
- **Q-E19 Jinzo Bio-Pet:** answered (King 2026-11-22): "Hold them." Listed under Held stat blocks below.

- **Q-E20 Aburame Parasitic Giant Insect:** "The affected creature takes 10d12 poison and chakra damage." Is that 10d12 poison plus 10d12 chakra, or one 10d12 roll dealt as both (or split)? The button rolls 10d12 poison for now.

## Held stat blocks (King 2026-11-22: "Hold them... I need to keep them together so I can give you the correct stat blocks.")

Each is a note on its item until King gives its stat block; then it becomes a summon under Class & Clan Summons.

| # | Creature | Clan | Item(s) that summon it | What the text has | Held since |
|---|---|---|---|---|---|
| H1 | Storm Snake | Ranton | Storm Release: Snake Chains (B-Rank Hijutsu) | No stat block ("has the listed statistics", none listed) | Q-E14 (0.81.1) |
| H2 | Neon Antivirus | Genwa | Data Release: Antivirus (Hijutsu; Angel and Demon Link versions) | No stat block | 0.82.0 (same as H1) |
| H3 | Broodling | Tsuchigumo | Brood Mother's Hatching Brood (King of the Brood); Spider Art: Rain of Spiders | No stat block (the Brood Mother's is complete and built) | 0.83.0 (same as H1) |
| H4 | Bio-Amphibian | Jinzo | Bio-Bonded Pet | A stat block, traits and attacks (Tongue Lash, Oil Spit, Sticky Ground, Oil Burst), filed as option items under I've Become, Me | Q-E19 (0.83.0) |
| H5 | Bio-Serpent | Jinzo | Bio-Bonded Pet | A stat block and traits filed under I've Become, Me; its Bite has no numbers | Q-E19 (0.83.0) |
| H6 | Nin-Dog | Inuzuka | Beast Master (and every Tag-Team Hijutsu) | A stat block in Savage Attacker's text, with blank save bonuses; breeds and traits in Beast Master and Nin-Dog Traits | 0.84.0 |
| H7 | Two-Headed Wolf | Inuzuka | Two-Headed Wolf | A stat block in its text; Intelligence, Wisdom and Charisma blank (Shared Mind) | 0.84.0 |
| H8 | Dream Walker | Kurama | Dream Walker (and Lucid Dreams, Inner Self) | A stat block in its text with five types; save bonuses blank | 0.84.0 |

Not held (built from complete stat blocks): Clay Spider, Bird, Centipede and Dragon (Bakuton); Blood Dragon (Chinoike); Steam Imp (Hozuki); Doki (Bandaged), (Claw) and (Club) (Kashu); Crystal Rabbit, Deer and Dragon (Shoton); Brood Mother (Tsuchigumo). Clans not built yet name stat blocks too (checked when their batch comes): Wood Dragon (Senju), Star Beast (Kujaku).

## Text issues (for the errata list)

- Bakuton: Absolute Death Bombing's text held two other Hijutsu (now split out, Q-E5); Clay Dragon says "two centipedes"; Clay Spiders' upcast starts "above C-Rank" (it's D-Rank); Chain Reaction Blitz's upcast grows "the size of the cone"; Volatile Movement says "half as much on a failure"; Artistic Cataclysm "unique for of combat".
- Futton: Steam Bullet and Hiding in Acid Rain say "Scaled" (Scald); Hiding in Acid Rain's upcast has no cost increase.
- Yoton: Hijutsu Flexibility says "Futton Clan Hijutsu"; Lava Stream "chape"; Rubber "gin a range"; Quicklime Hardening has no success result.
- Fūshin: Divine Wind stance holds Wind Scythe's text (fixed, Q-E9); "tuns"; Storm Bastion's upcast starts "above D-Rank" (it's C-Rank); Soaring Wind Veil, Storm Geyser, Vicious Vortex and Wind Serpent's Maw repeat their results above their tier list.
- Hanami: "Marital Arts"; the Boosting Boon option holds the Combo/Finisher Boon (split out, Q-E8); Blazing Aura has no base damage (Shakuton, Q-E10).
- Konjiki: Storm of Steel "1 rank of Ble"; Steel Rain and Steel Telekinesis "For each rank for each rank".
- Shakuton: Hellfire Murder "30-foor", "taking On a failed save"; Immolation "An Immolated created".
- Chinoike: Ketsuryugan "1o minutes"; Blood Drain "cat at B-Rank"/"cat at S-Rank"; Blood Missiles "cat at C-Rank" and "saving throw vs gaining"; Sanguine Sphere's upcast is split over three lines; Illusory Pain Receptor spends no Crimson Charges; Crimson Architect held Crimson Pact's Amp (removed, Q-E12); Crimson Weaponry's ammunition sentence is garbled (Q-E16).
- Keton: Plasma Release Manifestation "change the damage type to Fire or Lightning respectively" (swap); Plasma Beam's upcast has no cost increase; Light Binding Step names a reaction it doesn't grant (King Q-F14: a mistake); Event Horizon's Amp sat in Aphelion's and Stellar Convergence's text (removed, Q-E12); Kagayaki "on a failure ... on a failure"; Nova Ascension and Fission "Either form" (unfinished); Solar Prominence "Fusion of Fission".
- Ranton: Gale Style "unique for of combat"; Storm Release Manifestation - Reezaa "change the damage type to Water or Lightning" and both Manifestations "Cold or Lightning release keywords" (Water); Snake Chains has no stat block (Q-E14); Storm Drain "granting then"; Lariat "clothes line".
- Genwa: Data Crash has both a failure paragraph and a tier list; Neon Antivirus (Antivirus) and its Link effects have no stat block; Data Break, Network Integration and Ice Release Manifestation (Yuki) hold copies of their clan's condition text.
- Hoshigaki: Apex Berserker "wing link fins"; Ravenous Chakra held Apex Predator's Amp (removed).
- Hozuki: Mirage Regent's option held Tidal Gains' Amp and Blood As Thick As Oil held Mirage Regent's (removed); Tidal Gains "exist this state" and "until you complete a short rest" vs Heir of the Mist's "a rest"; Great Water Arm's damage has no type; Rain Dance range "Instance"; Steam Imp "The Steam can attack"; Hydration's triggers don't say how much (Q-E17).
- Kaguya: Shikotsumyaku Stance and Dance of the Pale Tyrant don't say what action enters them; Dance of the Seedling Fern's range says 40 feet, its text 45; Dance of the Katsura and Ten-Finger "Bleeding" (Bleed).
- Vesper: both stance items held other features' text (fixed, Q-E9 ruling; duplicate: Q-E18); Dread Weave held Umbral Monarch's Amp (removed).
- Yamada: the stance item held Asaemon Disciplines' text (fixed, Q-E9 ruling); Single Swing's upcast says "above B-Rank" (it's A-Rank); Senta Piercing "laten Tao" and its upcast adds 1d12 to a jutsu with only [Weapons Damage]; Demon Rain "earth-bound strikes.."; Spring Garden "and for the affected creature".
- Yuki: Ice Release Manifestation "change the damage type to Wind or Cold respectively" (swap); Ten Thousand Ice Petals "the increase the ranks of Frostbite inflicted to +2"; Frostbite "at the end of their for each rank".
- Jinzo: I've Become, Me holds the Bio-Pet stat blocks and the Stupor and Doused condition text (Q-E19); Adaptive Biology's upcast says above D-Rank (it's C-Rank); Binding Serpent Curse's upcast adds Envenomed it never inflicts; Hidden Shadow Burial "saving th row"; Synthetic Battle Aura held Synthetic Chakra Mode's Amp (removed).
- Jūgo: Nature Energy is spelled "Natural Energy" in Amplify lines; Feral Abandon ends "also count for Feral Mania and"; Natures Voice holds the Manic condition text; Cellular Regeneration "If this just is cast".
- Kashu: the three Doki stat blocks sit in Chains of Fantasia's text; Doki AC "+1 at 7th and 15th levels" (+1 each, or once?); Resonance Crown calls a melody "Overturn Burst" in Subsonic Pressure; Harmonic Songs have no option items (all in the feature).
- Shoton: Crystal Prison "encasing a creature you touch within" (leftover); Crystal Dragon CHA +5 with save −5; Gods Crossing upcast "If this jutsu is cast at B-Rank or higher, you can cross".
- Tsuchigumo: Master Silk Weaver holds the Brood Mother's stat block; Broodlings have no stat block; Web Walker held Arachnid's Amp (removed); Spiders Thread "even though full cover, though attacks through full cover at made".
- Aburame: Festering Brood's parenthesis never closes; Insect Sphere "entrap creatures in a select creature"; Parasitic Insect Cloud "poisoned" (Envenomed?); Parasitic Giant Insect "than has", "pours"; Larva holds the Infested condition text.
- Akimichi: the stance item held Seismic Bounce's text (fixed, Q-E9 ruling); Caloric Arts held Caloric Ignition's Amp (removed); Human Boulder's upcast says above C-Rank (it's D-Rank); Butterfly Bullet Bomb "Staggard".
- Hatake: Last to Move Loses held White Wolf's Amp (removed); In/famous is printed inside Leaders Aura's option.
- Hyūga: the stance item held Heavenly Technique's text (fixed, Q-E9 ruling); Grid Palm's upcast says above D-Rank (it's C-Rank); Gentle End "server internal damage"; 64 Palms "vs the AC the result against".
- Iburi: Smoke Style "impossible to impossible to"; Chimney Dance "of the same time"; Incinerating Burst has no cost increase; Smoke Dragon's range is a 90-foot line, its text 60; Orbital Drop "uch" and an unfinished last sentence; Body Oxidation "you entire their body".
- Inuzuka: the stance item held Beast Human Clone's text (fixed, Q-E9 ruling); Savage Attacker held Feral's Amp (removed) and the Nin-Dog's stat block (H6).
- Kurama: Déjà vu held Well Rested's Amp (removed); Lucid Dreams: Elemental's Lightning Rope has no rank; Dream Walker's text lists the stat block before the feature.

## Progress log

- 2026-11-21 Claude: spec written from a survey of the clans pack. Nothing built.
- 2026-11-21 King: "Q1. Same time. Q2. Yes. Q3. No. Clan Feats and Latents should not be done at all. There is a major overhaul coming for them. Q4. Sure. Begin." Claude: E1 Land of Earth built (117 items), engine E-D1–E-D5, Clay construct summons; published 0.79.0-alpha.1. Q-E5–Q-E7 asked; nothing waits on them.
- 2026-11-21 King: "Q5. Make them as its own item. Q6. Populate the entire feature. Q7. Drop it automatically." Claude: Clay Centipede and Chain Reaction Blitz as their own Hijutsu; Ballistic Knuckle drops the ability modifier; published 0.79.1-alpha.1. Full Priming Cataclysm, Broiling Rampart and Steam Engine text posted for Q-E6.
- 2026-11-21 King: "1 minute cleanse unless spent." Claude: pool unit lifetimes (E-D6); Primes and Pressure last 1 minute each; published 0.79.2-alpha.1.
- 2026-11-21 King: "Next batch." Claude: E2 Land of Wind built (115 items); published 0.80.0-alpha.1. Q-E8–Q-E11 asked; nothing waits on them.
- 2026-11-21 King: "Q8. Yes. Q9. Yes. Q10. +1d6 bonus damage. Q11. Share duration." Claude: Combo/Finisher Boon option, Divine Wind stance text, Blazing Aura damage, turn gains share the pool lifetime; published 0.80.1-alpha.1.
- 2026-11-21 King: "Next Batch." Claude: E3 Land of Lightning built (84 items), E-D7 combat recovery amounts (fixes Jiton refilling), the Blood Dragon summon; published 0.81.0-alpha.1. Q-E12–Q-E16 asked; nothing waits on them.
- 2026-11-21 King: "Q12. Remove the copy. Q13. Post the full effect text. Q14. Hold off on this. Q15. post the full effect text. Q16. That means rolling a 1 or 2 doesn't reduce the ammunition die by one step." Claude: Amp copies removed, Crimson Weaponry note; full Aphelion and Light Binding Step text posted; published 0.81.1-alpha.1.
- 2026-11-21 King: "Next batch." Claude: E4 Land of Water built (151 items), the Steam Imp summon; earlier rulings Q-E9 and Q-E12 applied without asking; published 0.82.0-alpha.1. Q-E17 and Q-E18 asked (checked earlier specs first); nothing waits on them.
- 2026-11-21 King: "Q17. 1. Q18. Yes. Next batch." Claude: Hydration +1, duplicate Vesper stance deleted; E5 Land of Sound built (174 items), seven summons (Doki x3, Crystal Rabbit, Deer, Dragon, Brood Mother), rest "empty"; published 0.83.0-alpha.1. Q-E19 asked (checked earlier specs first).
- 2026-11-22 King: "Hold them. Review the record to make sure all held stat blocks are there." Claude: Q-E19 held; scanned every clan item for stat block references; Held stat blocks table H1–H5 added.
- 2026-11-22 Claude: published 0.83.1-alpha.1 (held notes point at H1–H5).
- 2026-11-22 King: "Next batch" Claude: E6 Land of Fire I built (143 items); Nin-Dog, Two-Headed Wolf and Dream Walker added to the held stat blocks (H6–H8); Q-E9 and Q-E12 rulings applied; published 0.84.0-alpha.1. Q-E20 asked (checked earlier specs first).
