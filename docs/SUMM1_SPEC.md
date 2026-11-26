# SUMM1: summon strikes and the summoner link

King 2026-11-25 (Blood Dragon): "The Strike abilities that make sense, such as Bite and Hydra Bullet, are in the Feature section. Also, I notice there is no system to tie a summoned creature, to a summoner, in order to fulfill the rule of the summoned creature using a statistic from the summoner to determine some of its own statistics." Applies to every summon in Class & Clan Summons and the jutsu summons.

Status: **approved (King 2026-11-25: Q-SU1 all NPCs and adversaries, Q-SU2 live, Q-SU3 both); built (0.112.0-alpha.1).**

## What's there now

- **Strikes:** the 34 summons have 39 attacks (Bite, Hydra Bullet, Claw...) already tagged "NPC Strikes", but the NPC Stat Block's Strikes section only lists weapon items, so they fall into Features. Freeform Strikes have the same problem.
- **Summoner link:** every summon has its links (Blood Dragon: level, and its attack bonus and save DC from your highest jutsu ones). They're only applied when the creature is placed by its jutsu or feature's Summon button, copied once at that moment. A summon dragged from the compendium has no summoner, the sheet never shows who summoned it, and a summoner's level-up doesn't reach summons already on the map.

## Plan

### S1 Strikes
- The Stat Block's Strikes section lists every "NPC Strikes" feature (and weapons, as now) with its attack and damage line and roll buttons; they leave Features.
- Save and area abilities (Vicious Vortex, Blood Ocean) and traits stay in Features.

### S2 The summoner link
- **Shown:** a "Summoned by" line on the summon's sheet (the summoner's name, click to open) and its linked numbers ("Attack +8 and save DC 16: your highest jutsu ones").
- **Set by hand:** a "Link summoner" control for a summon placed without its button: drop a character on it, or pick one of the characters you own. "Unlink" clears it.
- **Live:** the linked numbers are worked out from the summoner each time the sheet's data is prepared, not copied once, so a summoner's level-up, Mastery or effect changes reach summons already on the map.
- The Summon buttons set the same link, so both ways work the same.

## Questions

- **Q-SU1 (S1):** Strikes for every NPC (adversaries' "NPC Strikes" features and Freeform Strikes too), or summons only?
- **Q-SU2 (S2):** live link (follows the summoner), or a copy taken when linked (re-link to refresh)?
- **Q-SU3 (S2):** who can set or clear the summoner: the GM and the summon's owner, or the GM only?

## King's answers (2026-11-25)

- **Q-SU1:** all NPCs and adversaries.
- **Q-SU2:** live.
- **Q-SU3:** both (the GM and the summon's owner).

## Built

- **S1:** NPC Stat Block Strikes = weapons + "NPC Strikes" features (attack bonus from the activity's discipline: highest, freeform line or a discipline, plus its bonus; ×N for multiattack), each with Attack (the feature's card). Features lists the rest.
- **S2:** `details.summonRank` (new); the data model applies `flags.n5e.fromSummoner` from the summoner's current data before level and proficiency (`_applySummonerLinks`, `rules/summoner-links.mjs liveLinks`). A summoner's data, item or effect change re-prepares its summons (world NPCs and scene tokens) and redraws their open sheets (`registerSummonerRefresh`, local only). Summon buttons store the cast rank. Header line: Summoned by (open), what it takes, rank; Link summoner (characters the user owns, or all for the GM; rank asked when links use @rankValue), drop a creature, Unlink.
- Built on a reading: a summon placed before SUMM1 has no stored rank; its rank-based numbers keep their placed values until it's linked again.

## Fix (King 2026-11-25, 0.112.1-alpha.1)

- The Blood Dragon linked to a character with Ninjutsu +3, Taijutsu +3, Genjutsu +4 rolled its Bite at −2. Cause: every "uses your attack bonus / save DC" link was a bonus ("your number − its proficiency"), which assumed the summon's ability modifier for that discipline is +0; the Blood Dragon's Ninjutsu uses its Intelligence 1 (−5).
- Fix: those links set the summon's total (`override.attack.<d>`, `override.dc.<d>`: Breakdown override; its own effects, Mastery and conditions still apply on top). All 34 summons rebuilt (build-summons.mjs `totalLinks`).

## Follow-up (King 2026-11-25, 0.112.2-alpha.1)

- The Bite still rolled −2: summons imported into a world before 0.112.1 keep the old bonus-style links (the Summon button reuses that world copy). Links are now converted when read (`totalLinks` in rules/summoner-links.mjs, used by the live link, the sheet line and placement), so old copies work without re-importing.
- The Blood Dragon had an Unarmed Strike (+9, its Strength): every NPC got one (DATA2). Summons (NPCs with summoner links) no longer get one (creation, migration, Item Integrity), and the Stat Block and Combat tab don't show one a summon already has.

## Progress log
- 2026-11-25 King: Blood Dragon strikes in Features; no summoner link. Claude: plan written.
- 2026-11-25 King: Q-SU1 all NPCs, Q-SU2 live, Q-SU3 both. Claude: built with CARDS1, published 0.112.0-alpha.1.
- 2026-11-25 King: Blood Dragon Bite −2 with a +4 summoner. Claude: links set totals, published 0.112.1-alpha.1.
- 2026-11-25 King: Bite still −2; Unarmed Strike +9 on the dragon. Claude: links converted when read; no Unarmed Strike on summons; published 0.112.2-alpha.1.
