# PRESTD1 function spec: the combined batch before standardization

Status: **spec written 2026-11-15 (King: "Begin batch"). King answered Q-P1–Q-P11 and approved (2026-11-15). Part A-i published `0.34.0-alpha.1`, A-ii `0.34.0-alpha.2`, A-iii/iv (without A14) `0.34.0-alpha.3`; Part B `0.35.0-alpha.1`; Part C `0.36.0-alpha.1`; D-i (wands, flanking, crafting) `0.37.0-alpha.1`. Q-P12 open.**

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
| B2 | Casting | Q-P3: no chakra; anyone can cast. "Cast from scroll" first makes the Cast Ninjutsu / Genjutsu Scroll check (Ninshou or Illusions; DC per Q-P11); the skill tier still limits the rank (non-proficient D-Rank or lower, proficient B or lower, Mastery any). On a success the jutsu resolves with the scroll's own numbers by rank (`jutsuScroll`: D save DC 14, attack +6 … S save DC 22, attack +14), not the caster's. The scroll is used up. |
| B3 | Identify | An unidentified scroll shows only "Unidentified scroll (rank)". Ninshou (Ninjutsu scroll) or Illusions (Genjutsu scroll) check vs the identify DC (D 12 … S 24); success reveals it. Only the matching skill can identify it (Q-P4). |

## Part C: loot, merchants and the party stash (LOOT1)

| # | Function | Behaviour |
| --- | --- | --- |
| C1 | Loot actor type | A new actor type `loot` with a mode: **pile** (anyone can take its items) or **merchant** (players buy). Simple sheet: items, ryo, and for a merchant its price rates. |
| C2 | Taking from a pile | Drag an item from the pile's sheet to your own: it moves (the GM's client moves it when you don't own the pile). |
| C3 | Buying and selling | On a merchant's sheet, Buy pays the item's price (times the buy rate) from your ryo and moves the item to you. Selling: drag your item onto the merchant; you get its price times the sell rate. Q-P5: buy at the listed price (rate 1), sell at half (rate 0.5); the GM can change both per merchant. |
| C4 | Party stash | A loot actor marked as the party stash, owned by every player: items given to it move like any transfer (FIN1). |
| C5 | Lootable NPCs | A per-NPC "lootable" toggle (GM): a defeated lootable NPC's sheet works like a pile for players. Per Q-F2 this is off unless the GM turns it on for that NPC. |

## Part D: PF2e emulation (PF2E1, King Q-PF4: "emulating PF2e for now")

| # | Function | Behaviour (PF2e, ported) |
| --- | --- | --- |
| D1 | Wands | A wand item holds one jutsu at a rank. Once per day it casts it with the holder's own attack and DC. It can be overcharged once more that day: a flat check (DC 10) or the wand breaks; a broken wand that is overcharged is destroyed. Recharges on a Long Rest. |
| D2 | Flanking | Optional rule (off by default). A creature is flanked when two of its enemies are on opposite sides (a line between their centres passes through its token) and both are within melee reach. Q-P6: the GM chooses the effect in the rule's setting: off, −2 AC against the two flankers (PF2e), or advantage on their melee attacks (5e). |
| D3 | Hazards | A new actor type `hazard` (Q-P8): Stealth DC to notice, disable (skill and DC), AC, saves, HP and hardness, a trigger, and routine or one-time effects as activities (attacks, saves, damage). Placed as tokens; rolls like any creature. |
| D4 | Vehicles | A new actor type `vehicle` (Q-P8): size, HP, AC, hardness, speed, crew and passengers, piloting check (skill and DC), collision damage and save. Actors can be added as crew or passengers. |
| D5 | Crafting | A "Craft" action on the Inventory tab: choose a formula (an item in the compendium or one the GM adds), check (Crafting Kit / toolkit skill) vs the DC by item rank, cost and days. Success: pay the cost, the item is made after the days; critical success: fewer days; failure: no progress; critical failure: lose part of the materials. Q-P7: DC by rank D 12, C 15, B 18, A 21, S 24; materials half the price; days D 1, C 2, B 4, A 7, S 14; all editable by the GM in the settings. |

## Part E: missions (MISSION1, the Bingo Book)

| # | Function | Behaviour |
| --- | --- | --- |
| E1 | Mission tables | `config/missions.mjs`: rewards by rank (XP per player D 100, C 250, B 350, A 600, S 1250; ryo ranges; downtime 4/6/8/10/12 or 2d4…2d12), tier modifications (Trivial −25% XP and ryo, −2 adversary level, failure 75%; Moderate none, 50%; Extreme +25%, +2, 25%), rank multipliers (×1–×5) and encounter costs (Social: Diplomatic 5, Intrigue 10, Hostile 15; Environmental: Traps 10, Puzzles 10, Chase 15, Stealth 15; Combat: Minions 5 per 5, Standard 10, Elite 25, Solo 50; modifiers Ambush +10, Objective +15, Escort/Defend +20; all × rank except Minions). Percentages round down. |
| E2 | Mission planner (GM) | A GM window: rank, tier, active players (the party), ryo per player within the range; the budget (XP per player × players); purchased encounters with their costs and what's left; notes. Saved as a journal entry page (so it lasts and can be shared). |
| E3 | Complete or fail | Q-P9: the book's rules, verbatim, with no per-player XP logic of our own. The card states the rule as printed ("Players receive XP equal to the total value of all encounters purchased, split evenly among active players"; "Failing a mission, results in a player getting only half of the original payout, downtime and XP. This is further modified based on mission tier.") and shows that figure for the active players the GM lists. The GM awards it (one Award button) and can change any number first. Ryo is paid per player as set in the planner; downtime as the rank gives. |

## Part F: social encounters (SOCIAL1, the Bingo Book)

| # | Function | Behaviour |
| --- | --- | --- |
| F1 | Social encounter tracker (GM) | Set up: the NPC, encounter type (Diplomatic, Intrigue, Hostile), attitude (Hostile to Helpful), starting points (−4, −2, 0, +2, +4), Patience (2, 3 or 4 rounds by attitude), 2–3 Motivations and 1–2 Pitfalls from the book's lists or typed (hidden from players). The Points of Agreement and Frustration total and the round are shown to everyone. |
| F2 | Player arguments | Each player's turn has buttons: Make an Impression or Request (Persuasion vs the NPC's Wisdom save DC), Lie or Impersonate (Deception vs its Insight DC), Coerce (Intimidation vs its Wisdom save DC) (Q-P10: Standard DCs, the statistic + 10), and "Other skill" (GM-approved). A "Uses a Motivation" toggle gives +2 and +1 PoA on a success. The result follows the Argument Results table (+2 PoA and a reveal on 10+, +2 on 5+, +1, −1, −2 and a new Pitfall on fail by 5+). DCs are Standard DCs (statistic + 10, King Q-S1). |
| F3 | Support and reactions | Perform (+2 to the next argument), Sense Motive (Insight vs Deception DC: reveal one Motivation or Pitfall), Recall Knowledge (History vs a GM DC: a hint; by 10+ a reveal), See Through Lies (Insight contested by the NPC's check). |
| F4 | GM controls | Pitfall triggered (+1 PoF and a secret −4 on that round's check), NPC actions (Convince, Misdirect, Pressure; Resist and Counter-Argue as reactions) with their secret checks and PoF, the type risks (Coerce in Diplomatic: +1 PoF; Intrigue's hidden "Revealing True Purpose"; Hostile: end now), next round, end. |
| F5 | Resolution | When Patience runs out (or the GM ends it), the score gives Critical Success (5+), Success (0–4), Failure (−1 to −4) or Critical Failure (−5 or less), with the type's outcome text. A card records it. |

## Releases (Q-P1: in pieces)

A (optional rules), B (scrolls), C (loot), D (PF2e emulation), E (missions), F (social), each its own release; Part A may split further.

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

## King's answers (2026-11-15)

- **Q-P1:** release in pieces.
- **Q-P2:** build all nineteen options.
- **Q-P3:** no chakra. Anyone can cast, but they must make the appropriate skill check to cast.
- **Q-P4:** no: only the matching skill identifies a scroll.
- **Q-P5:** yes: buy at the listed price, sell at half, GM-adjustable per merchant.
- **Q-P6:** a variable the GM can change.
- **Q-P7:** yes for now; every number editable by the GM in the settings.
- **Q-P8:** their own actor types.
- **Q-P9:** don't automate how much XP each player gets; follow the Mission XP rules verbatim.
- **Q-P10:** yes, Standard DCs.

## Open

- **Q-P12: gradual ability increases (A14).** The system doesn't add ASI ability points itself; the ASI table says "Ability Score Improvement/Feat" and the code counts one Mastery rank per ASI. How many ability points does an ASI give (5e's two, or one)? With two, the gradual rule gives one point at the level before the ASI and one at the ASI. With one, there is nothing to spread.

## Settled

- **Q-P11 (approved with the spec, 2026-11-15): the identify DC for the scroll's rank.** Was: The book gives each rank an identify DC (D 12, C 15, B 18, A 21, S 24) and a save DC (D 14 … S 22) but no casting DC. Proposed: the identify DC for the scroll's rank. Or another number?

## Progress log

- 2026-11-15 Claude: spec written from VAR1, the PF2e review and the Bingo Book's mission and social chapters. Nothing built. Awaiting answers and approval.
- 2026-11-15 Claude: King's answers recorded; Q-P11 (scroll casting DC) open.
- 2026-11-15 Claude: King approved; Q-P11 as proposed (identify DC). Part A split into A-i (A1–A8), A-ii (A9–A13), A-iii/iv (A14–A19).
- 2026-11-15 Claude: **A-i built and published 0.34.0-alpha.1.** Rules `critDamage`, `applyResistances`, `removeExpiredEffects`, `npcRollBreakdowns`, `hideNpcDamage`, `hideNpcConditions`, `hideNpcNames`, `secretChecks` (groups `optional`, `privacy`). Code: `rules/activity-parse.mjs critFormula(formula, mod, mode)`; `rules/damage.mjs damagePlan({ignoreTraits})`; `workflow/expiry.mjs` marks `flags.n5e.expired`; new `workflow/npc-privacy.mjs` (`privateNpc`, `gmWhisper`, `hideNameFor`, `renderPrivacy`, combat tracker hook); `readChoice().secret`, the dialog's Secret box, `secretByDefault`. Tests: `tests/core/optional-rules.test.mjs` (4), `tests/fin3.test.mjs` +2. Suites: 510 and 124 pass.
- 2026-11-15 Claude: **A-ii built and published 0.34.0-alpha.2.** Rules `sharedVision`, `partyStatsVisible`, `scaleTokens`, `defeatedMarker`, `encumbranceStatus`. Code: `rules/token-size.mjs` (`tokenSizeFor`, `isDefeated`, `encumbranceChange`); `workflow/table-options.mjs` (token vision source wrap, preCreateToken sizing, size change resize, combatant defeated, Encumbered state); party overview for players (PCs only, no quick controls). Tests: core +1. Suites: 511 and 125 pass.
- 2026-11-15 Claude: **A-iii/iv built and published 0.34.0-alpha.3** (A15–A19). Rules type `text` added (settings String; panel text input). Rules `freeFeatLevels`, `freeFeatGroup`, `flatProficiency`, `flatProficiencyValue`, `critTable`, `fumbleTable`, `homebrewKeywords`, `homebrewWeaponGroups`, `homebrewDamageTypes`, `homebrewLanguages`, `worldClock`. Code: `rules/progression.mjs proficiencyFor`, `freeFeatCount`; `rules/variants.mjs` (`parseHomebrew`, `mergeHomebrew`, `worldTimeParts`, `CLOCK_STEPS`, `tableFor`); `workflow/variant-tools.mjs` (`applyHomebrew` at ready, `renderTableButton`, `WorldClock`). A14 waits on Q-P12. Tests: core +1. Suites: 512 and 126 pass.
- 2026-11-15 Claude: **Part B built and published 0.35.0-alpha.1.** `rules/scrolls.mjs` (`scrollDiscipline`, `scrollSkill`, `scrollNumbers`, `skillTier`, `tierAllows`, `scrollName`); `workflow/scrolls.mjs` (`scrollData`, `makeScroll`, `promptMakeScroll`, `castFromScroll`, `identifyScroll`, `scrollContextOptions`); scrolls cast through a hidden copy (`flags.n5e.scrollCopy {scrollId, numbers}`) whose live attack and DC are the scroll's; `castPlan({scroll})` spends no chakra and skips affinity, ability requirement and rank cap; API `makeScroll`.
  - Differs from the spec: no "make scroll" drop zone; scrolls are made from the jutsu's right-click menu (GM) or the API.
  - Reading: a failed casting check doesn't use the scroll up (the rules don't say); say if it should.
  - Tests: `tests/core/scrolls.test.mjs` (3), `tests/fin3.test.mjs` +1. Suites: 516 and 129 pass.
- 2026-11-15 Claude: **Part C built and published 0.36.0-alpha.1.** Actor type `loot` (`data/actor/loot.mjs`: mode pile|merchant|stash, currency.ryo, buyRate 1, sellRate 0.5, description); `rules/loot.mjs` (`priceOf`, `canTake`, `purchase`, `saleValue`); `workflow/loot.mjs` (`takeFromLoot`, `buyFromMerchant`, `sellToMerchant`, `leaveLoot`, intents `lootTake`, `lootBuy`, `lootSell`); `applications/actor/loot-sheet.mjs` and `templates/actor/loot/sheet.hbs`; `canReceive` accepts piles and the stash; FIN1's `moveItem` exported.
  - Differs from the spec: C5 "lootable NPCs" is the GM's "Leave loot" (the NPC's items become a pile beside it) instead of opening the NPC's own sheet to players. Dragging items out of any sheet you don't own is now refused (it used to copy them).
  - Tests: `tests/core/loot.test.mjs` (2), `tests/fin3.test.mjs` +1, `tests/entry.test.mjs` updated (3 actor types, 7 sheets). Suites: 519 and 131 pass.
- 2026-11-15 Claude: **D-i built and published 0.37.0-alpha.1** (D1, D2, D5). `rules/pf2e-emulation.mjs` (`wandAction`, `overchargeHolds`, `segmentHitsRect`, `flanks`, `flankingEffect`, `craftNumbers`, `craftOutcome`); rules `flanking` and the `crafting` group (`craftDCD..S`, `craftDaysD..S`, `craftMaterials`); `canvas/flanking.mjs flankingAlly`, applied in `dice/roll.mjs rollWithSpec` for single-target melee attacks; `workflow/wands.mjs` (`wandData`, `makeWand`, `useWand`, `rechargeWands` from `executeRest`, `wandContextOptions`; hidden copy `flags.n5e.wandCopy`, cast with `castPlan({scroll, wand})`: no chakra, holder's limits kept); `workflow/crafting.mjs` (`promptCraft`, `craft`; Inventory "Craft" button). Readings: a broken wand used again is destroyed (D1 text); a Full Rest recharges wands too; crafting uses the item's own rank when it has one. Tests: `tests/core/pf2e-emulation.test.mjs` +5. Suites: 524 and 136 pass. D-ii (hazards, vehicles) next.
