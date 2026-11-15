# PRESTD1 function spec: the combined batch before standardization

Status: **spec written 2026-11-15 (King: "Begin batch"). Awaiting King's answers and approval. Nothing is built.**

King (2026-11-15): combine VAR1a, SCROLL1, LOOT1, PF2E1, MISSION1 and SOCIAL1 into one batch, before standardization. Sources:
- `docs/VAR1_SPEC.md` (PF2e optional rules; King Q-V1–Q-V4);
- `docs/PF2E_PARITY_REVIEW.md` (King Q-PF1–Q-PF4: scrolls, loot, wands, flanking, hazards, vehicles, crafting, emulating PF2e for now);
- the Bingo Book, "Mission Rank(s)" to "Resolving The Encounter";
- King Q-F2 (2026-11-15): players buy from merchants and don't take from other sheets.

The parts below are one batch. Each part ends with its own small release (Q-P1).

## Part A: optional rules (VAR1a, VAR1b, VAR1c)

Every option is a world rule in `config/rules.mjs`, **off by default** so play doesn't change, and listed in `docs/RULES_MAP.md`.

| # | Option | Behaviour when on |
| --- | --- | --- |
| A1 | Critical damage rule | Double dice (today), double the total, or maximize the extra dice |
| A2 | Apply resistances automatically | Off: Apply ignores resistance, immunity and vulnerability, and the card names them for the GM |
| A3 | Remove expired effects automatically | Off: expired effects stay and are marked "expired" for the GM to remove |
| A4 | Show NPC roll breakdowns | Players see the breakdown of NPC rolls |
| A5 | Hide NPC damage taken | Damage-applied cards for NPCs go to the GM only |
| A6 | Hide NPC condition messages | Condition cards for NPCs go to the GM only |
| A7 | Hide NPC names | When an NPC token's nameplate is hidden, chat and the combat tracker show "Unknown creature" |
| A8 | Secret checks | A "Secret" toggle in the roll dialog; Stealth, Insight and identify rolls default to it; the roll goes to the GM only |
| A9 | Shared party vision | Players see through every party member's token |
| A10 | Party stats visible | Players can open the party overview |
| A11 | Scale tokens by size | A creature's size sets its token's width and height |
| A12 | Defeated marker | A creature at 0 HP (NPC) or dead (character) gets the defeated overlay |
| A13 | Encumbrance automation | Over capacity applies the encumbrance penalty as a status |
| A14 | Gradual ability increases (VAR1b) | An Ability Score Improvement's points arrive one per level over the levels before it |
| A15 | Free feat track (VAR1b) | Extra feat slots at the levels the GM sets, from the feat group the GM sets |
| A16 | Flat proficiency (VAR1b) | A GM-set proficiency (fixed, or a slower curve) for characters, NPCs and standard DCs |
| A17 | Crit and fumble table (VAR1c) | On a natural 20 or 1, a button draws from the GM's chosen roll table |
| A18 | Homebrew elements (VAR1c) | GM-defined keywords, weapon groups, damage types and languages, added to the config lists |
| A19 | World clock (VAR1c) | A small window with the world date and time; the GM can advance it (which runs breath, expiry and the like) |

## Part B: jutsu scrolls (SCROLL1)

| # | Function | Behaviour |
| --- | --- | --- |
| B1 | Scroll item | A consumable of subtype `scroll` that embeds one Ninjutsu or Genjutsu (no Taijutsu or Bukijutsu scrolls) at a rank. Made by dragging a jutsu onto the "make scroll" drop zone of a consumable, or by the GM from the jutsu's sheet. |
| B2 | Casting | "Cast from scroll" uses the scroll's own numbers by rank (`jutsuScroll`: D save DC 14, attack +6 … S save DC 22, attack +14), not the caster's. The Cast Ninjutsu / Genjutsu Scroll skill action gates it: non-proficient D-Rank or lower, proficient B or lower, Mastery any. The scroll is used up (Q-P3 on chakra). |
| B3 | Identify | An unidentified scroll shows only "Unidentified scroll (rank)". Ninshou or Illusions check vs the identify DC (D 12 … S 24); success reveals it. The wrong discipline: per Q-P4. |

## Part C: loot, merchants and the party stash (LOOT1)

| # | Function | Behaviour |
| --- | --- | --- |
| C1 | Loot actor type | A new actor type `loot` with a mode: **pile** (anyone can take its items) or **merchant** (players buy). Simple sheet: items, ryo, and for a merchant its price rates. |
| C2 | Taking from a pile | Drag an item from the pile's sheet to your own: it moves (the GM's client moves it when you don't own the pile). |
| C3 | Buying and selling | On a merchant's sheet, Buy pays the item's price (times the buy rate) from your ryo and moves the item to you. Selling: drag your item onto the merchant; you get its price times the sell rate. Rates per Q-P5. |
| C4 | Party stash | A loot actor marked as the party stash, owned by every player: items given to it move like any transfer (FIN1). |
| C5 | Lootable NPCs | A per-NPC "lootable" toggle (GM): a defeated lootable NPC's sheet works like a pile for players. Per Q-F2 this is off unless the GM turns it on for that NPC. |

## Part D: PF2e emulation (PF2E1, King Q-PF4: "emulating PF2e for now")

| # | Function | Behaviour (PF2e, ported) |
| --- | --- | --- |
| D1 | Wands | A wand item holds one jutsu at a rank. Once per day it casts it with the holder's own attack and DC. It can be overcharged once more that day: a flat check (DC 10) or the wand breaks; a broken wand that is overcharged is destroyed. Recharges on a Long Rest. |
| D2 | Flanking | Optional rule (off by default). A creature is flanked when two of its enemies are on opposite sides (a line between their centres passes through its token) and both are within melee reach. PF2e makes the flanked creature off-guard (−2 AC) against those two; per Q-P6 for N5e. |
| D3 | Hazards | A new actor type `hazard`: Stealth DC to notice, disable (skill and DC), AC, saves, HP and hardness, a trigger, and routine or one-time effects as activities (attacks, saves, damage). Placed as tokens; rolls like any creature. |
| D4 | Vehicles | A new actor type `vehicle`: size, HP, AC, hardness, speed, crew and passengers, piloting check (skill and DC), collision damage and save. Actors can be added as crew or passengers. |
| D5 | Crafting | A "Craft" action on the Inventory tab: choose a formula (an item in the compendium or one the GM adds), check (Crafting Kit / toolkit skill) vs the DC by item rank, cost and days. Success: pay the cost, the item is made after the days; critical success: fewer days; failure: no progress; critical failure: lose part of the materials. Numbers per Q-P7. |

## Part E: missions (MISSION1, the Bingo Book)

| # | Function | Behaviour |
| --- | --- | --- |
| E1 | Mission tables | `config/missions.mjs`: rewards by rank (XP per player D 100, C 250, B 350, A 600, S 1250; ryo ranges; downtime 4/6/8/10/12 or 2d4…2d12), tier modifications (Trivial −25% XP and ryo, −2 adversary level, failure 75%; Moderate none, 50%; Extreme +25%, +2, 25%), rank multipliers (×1–×5) and encounter costs (Social: Diplomatic 5, Intrigue 10, Hostile 15; Environmental: Traps 10, Puzzles 10, Chase 15, Stealth 15; Combat: Minions 5 per 5, Standard 10, Elite 25, Solo 50; modifiers Ambush +10, Objective +15, Escort/Defend +20; all × rank except Minions). Percentages round down. |
| E2 | Mission planner (GM) | A GM window: rank, tier, active players (the party), ryo per player within the range; the budget (XP per player × players); purchased encounters with their costs and what's left; notes. Saved as a journal entry page (so it lasts and can be shared). |
| E3 | Complete or fail | "Complete" pays each active player the ryo, the downtime and the XP (the total value of the purchased encounters split evenly, as the book says); "Failed" pays the tier's failure share. One chat card lists what each got. |

## Part F: social encounters (SOCIAL1, the Bingo Book)

| # | Function | Behaviour |
| --- | --- | --- |
| F1 | Social encounter tracker (GM) | Set up: the NPC, encounter type (Diplomatic, Intrigue, Hostile), attitude (Hostile to Helpful), starting points (−4, −2, 0, +2, +4), Patience (2, 3 or 4 rounds by attitude), 2–3 Motivations and 1–2 Pitfalls from the book's lists or typed (hidden from players). The Points of Agreement and Frustration total and the round are shown to everyone. |
| F2 | Player arguments | Each player's turn has buttons: Make an Impression or Request (Persuasion vs the NPC's Wisdom save DC), Lie or Impersonate (Deception vs its Insight DC), Coerce (Intimidation vs its Wisdom save DC), and "Other skill" (GM-approved). A "Uses a Motivation" toggle gives +2 and +1 PoA on a success. The result follows the Argument Results table (+2 PoA and a reveal on 10+, +2 on 5+, +1, −1, −2 and a new Pitfall on fail by 5+). DCs are Standard DCs (statistic + 10, King Q-S1). |
| F3 | Support and reactions | Perform (+2 to the next argument), Sense Motive (Insight vs Deception DC: reveal one Motivation or Pitfall), Recall Knowledge (History vs a GM DC: a hint; by 10+ a reveal), See Through Lies (Insight contested by the NPC's check). |
| F4 | GM controls | Pitfall triggered (+1 PoF and a secret −4 on that round's check), NPC actions (Convince, Misdirect, Pressure; Resist and Counter-Argue as reactions) with their secret checks and PoF, the type risks (Coerce in Diplomatic: +1 PoF; Intrigue's hidden "Revealing True Purpose"; Hostile: end now), next round, end. |
| F5 | Resolution | When Patience runs out (or the GM ends it), the score gives Critical Success (5+), Success (0–4), Failure (−1 to −4) or Critical Failure (−5 or less), with the type's outcome text. A card records it. |

## Tests

- `tests/core/missions.test.mjs`: budget, tier rounding, encounter costs × rank, the book's Team 7 example (C-Rank Extreme, 4 players: 1240 budget; 990 spent; 250 left), payouts and failure shares.
- `tests/core/social.test.mjs`: starting points, patience, argument results by margin, Motivation bonus, Pitfall, resolution bands.
- `tests/core/loot.test.mjs`: buy and sell prices, ryo bounds, pile and merchant permissions.
- `tests/core/scrolls.test.mjs`: scroll numbers by rank, the skill tier gate, identify DCs.
- `tests/core/pf2e-emulation.test.mjs`: flanking geometry, wand use and overcharge, crafting outcomes.
- Each option in Part A: on and off.

## Questions for King

- **Q-P1: releases.** Build and release the parts in order A (optional rules), B (scrolls), C (loot), D (PF2e emulation), E (missions), F (social), each its own small release? Or another order?
- **Q-P2: Part A.** All nineteen options, or drop any?
- **Q-P3: scroll chakra.** Does casting from a scroll cost chakra (the jutsu's cost, or none), and can someone who doesn't know the jutsu cast it if the skill tier allows the rank?
- **Q-P4: identify by the wrong discipline.** Can a Genjutsu user identify a Ninjutsu scroll (with a penalty, PF2e uses +5 DC), or only the matching skill?
- **Q-P5: merchant prices.** Buy at the listed price and sell at half (PF2e), with the GM able to change both rates per merchant?
- **Q-P6: flanking in N5e.** PF2e: off-guard, −2 AC against the two flankers. 5e's optional rule: advantage on melee attacks. Which, while you finalize N5e's version?
- **Q-P7: crafting numbers.** PF2e's DCs by item level, half the price as materials and 4 days minimum don't map to N5e ranks. Use the item's rank for the DC (D 12, C 15, B 18, A 21, S 24, the identify DCs), materials at half the price, and days by rank (D 1, C 2, B 4, A 7, S 14)? Or your numbers.
- **Q-P8: hazards and vehicles.** Their own actor types (PF2e), or NPCs with a "hazard" or "vehicle" kind on the existing sheet?
- **Q-P9: mission XP.** The book says the budget is XP per player × players, and players receive XP equal to the encounters purchased, split evenly. Is unspent budget lost (the example keeps 250 for twists during play)? And is it still split evenly when a player misses part of the mission?
- **Q-P10: social DCs.** "Wisdom Save DC" and "Insight DC": the Standard DC (the statistic + 10, King Q-S1), so Wisdom save + 10 and Insight + 10?

## Progress log

- 2026-11-15 Claude: spec written from VAR1, the PF2e review and the Bingo Book's mission and social chapters. Nothing built. Awaiting answers and approval.
