# Jutsu-granting feature sweep

King 2026-11-25: "Let's make sure that features that grant Jutsu, work with this new system automatically. Do a full class and clan feature sweep."

## Engine

- **Level grants:** `grants.jutsuByLevel` [{uuid, level}]: the jutsu is granted when the character reaches that level (gaining the feature, or a later level up), stamped with that level so Remove level takes it back.
- **Bonus Jutsu slots:**
  - `atLevels` ("3, 9, 14"): one slot per listed level reached.
  - `countBy: "prof"`: slots equal to the proficiency bonus.
  - `minRank`: at least this rank.
  - `nature`: needs a Nature Release keyword.
  - `uuids`: only these jutsu.
- **Level-up window:** shows level grants and new slots from features the character already has.
- **Item sheet:** the Bonus Jutsu section edits the new slot settings. Level grants are data-only for now (no sheet editor).

## Features wired

- **Medical-nin, Reaper's Techniques (Reaper Expanded jutsu):**
  - Grim Mask and Grim Weapon at 2nd.
  - Grim Blade and Grim Legion at 6th.
  - Grim Calling at 10th.
  - Grim Reality at 14th.
- **Scout-nin:**
  - **Mobile Savant (Pathfinder):** one slot at 3rd, 9th and 14th, only Zephyr Strike, Lightning Speed, Graceful Cat or Flower Petal Escape.
  - **Superior Clones (Cloning):** Shadow Clone Technique granted.
  - **Void Heart Mask (Void Heart):** slots equal to the proficiency bonus.
- **Hoshigaki, Commander of the Deep:** Summoning Technique granted.
- **Hoshigaki latent, Commander of the Deep:** Summoning Technique at 11th.
- **Jugo, Full Sage (Undiluted Rage):** the Full Sage item granted.
- **Sarutobi latent, Advanced Nature Proficiency I–IIII:** a Nature Release Ninjutsu slot at 3rd (D-Rank), 7th (C-Rank), 15th (B-Rank) and 18th (A-Rank).
- **Already wired (LVL1 L3):** the five ultimate Moldings.

## Left by hand

- **Mobile Savant's Chakra Movement:** not in the jutsu compendium.
- **Void Soul jutsu:** casting by the Void Soul only, and switching them each level.
- **Companion jutsu (not the character's):** Synthetic Awakening's Bio-Pet, Lucid Dreams' Dream Walker, Bonded Summoning's summons.
- **Keyword access only:** "can learn jutsu with the X keyword" features grant no slot.
- **Not grants:**
  - Signature Jutsu.
  - Sharingan Imprint.
  - Kuru Yin Chakra Adept I (removes jutsu).
  - Iburi Ashen Simplicity (downtime).

## Progress log
- 2026-11-25 King: full class and clan feature sweep. Claude: built and published 0.106.0-alpha.1.
