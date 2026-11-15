# NPC3 function spec: Freeform Strikes and Freeform Jutsu

Status: **All questions answered (King 2026-11-14); waiting for King's go-ahead to build. Nothing is built.**

Plan: `docs/NPC1_PLAN.md` ("How adversaries fight: Freeform"). Source: the Bingo Book, "Adversary Combat": Freeform Strike (with Multiattack and the Freeform Strike Table), Freeform Jutsu (Offensive, Defensive, Support, with the rank, penalty, shape, effects and damage tables), Non-Freeform Jutsu, Freeform Abilities (with the nine examples). Chakra cost ranges: core book, "Chakra Cost by Rank".

## What NPC3 does and doesn't do

- **Does:** the book's three build-your-own tools, as items the system can roll and automate, built in the Adversary Builder's step 7 and editable afterwards. The tables are data; the math is pure and tested.
- **Doesn't:** spend Tenacity, Elite Actions, Health Gates (NPC4); Transformations and Battlefield Domains (NPC5); the trait lists (NPC6).

## NPC3a: tables and math (pure)

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| A1 | Tables as data | `config/freeform.mjs` | Freeform Strike Table (levels 1–30; Low, Medium, High, with the attack count printed in the cell); both Freeform Jutsu Damage Tables (Elite/Solo and Minion/Standard; Very Low to Very High = D to S); Rank Damage columns; Damage Penalty table; Effects & Conditions table (tier, effect, condition or not); Shapes; rank-by-level limits per class; Freeform DR table; the Defensive and Support focus values; Chakra cost per rank (Q-N33). |
| A2 | Strike damage | `rules/freeform.mjs` | `strikeDamage(level, class, riderTier)`: the column by class (Low Minion, Medium Standard, High Elite and Solo); a Tier 1 rider reads 2 levels lower, Tier 2 reads 3 lower; returns `{formula, attacks}`. `cumulativeStrike(...)`: the single-attack option (the attacks' damage added). |
| A3 | Multiattack | same | Minion 1 always; Standard 1, 2 at 6, 3 at 11; Elite and Solo 2, 3 at 6, 4 at 11 (already in NPC1a's suggested counts). |
| A4 | Jutsu ranks allowed | same | `freeformRanks(class, level)`: Minion D, C at 11, B at 20; Standard D, C at 5, B at 9, A at 13, S at 17; Elite and Solo D, C at 3, B at 7, A at 11, S at 15. Suggestions: shown, not blocking. |
| A5 | Jutsu damage | same | `effectiveLevel(level, penalties)`: area −2, Tier 1 effect −1, Tier 2 −2, no damage on save +1, lowest attack bonus +1, preestablished effect +1 or +2; clamped to 1–30. `jutsuDamage(level, class, rank, penalties)`: the cell for that effective level and the rank's column, from the class's table; split evenly when the jutsu makes more than one attack. |
| A6 | Defensive values | same | AC by rank (D +3, B +4, S +5; Q-N40); DR from the Freeform DR table by class and rank; temporary HP (Elite and Solo only): the Minion/Standard jutsu table at level ÷ 4, rounded up; immunity (A-Rank and above, one damage type). |
| A7 | Support values | same | Attack or save bonus (D +1, B +2, S +3), check Mastery ranks (1, 2, 3), AC (+1 at D, +1 per rank above), damage (+1 effective level from C, +2 from A), speed (+10 at D, +10 per rank above), Hit Point Burst (level ÷ 2, rounded up, on the jutsu table), Hit Point Regen (level ÷ 4, rounded up, on the Strike table: Low Standard, Medium Elite, High Solo), resistances (1, 2 at B, 3 at S). |
| A8 | Rider save DC | same | Minion: its lowest jutsu save DC; Standard: the middle one; Elite and Solo: the highest. |
| A9 | Chakra cost | same | By rank from A1 (Q-N33). A Minion's Freeform Jutsu cost nothing (the book: one per turn at no cost; Q-N39). |

## NPC3b: the items

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| B1 | Freeform Strike | items: `feat`, category `npcStrikes` | Melee (reach the GM sets) or ranged (60 ft). Counts as a weapon attack, or as a Ninjutsu, Genjutsu or Taijutsu attack (Q-N35). An attack and a damage activity with the table's formula and the type the GM picks. Optional rider: an effect from the table, the save the GM picks, at the A8 DC; applied on a failed save through the action card. `flags.n5e.freeform` keeps the choices so the builder can rebuild it. |
| B2 | Multiattack | B1, the action card | Per Q-N38. |
| B3 | Freeform Jutsu (Offensive) | items: `jutsu`, `flags.n5e.freeform.kind: "offensive"` | A real jutsu: rank, keywords (its disciplines), range (Touch 5 ft, Close 30 ft, Long 60 ft), single target (attack or save) or an area (Line, Sphere, Cone, Cylinder, Cube at the book's sizes, placed as a template), up to two extra effects with their recovery (Q-N36, Q-N37), damage from A5, cost from A9. Casts through the normal cast dialog and action card. |
| B4 | Freeform Jutsu (Defensive) | same, `kind: "defensive"` | Usually a reaction, usually self: AC, DR, resistance or immunity until the start of the adversary's next turn (an Elite or Solo: until its next Elite Action, once NPC4 exists; the start of its next turn until then), or temporary HP until used up. One optional extra effect. |
| B5 | Freeform Jutsu (Support) | same, `kind: "support"` | Usually a bonus action on an ally: one focus from A7, under concentration except Hit Point Burst. |
| B6 | Freeform Ability | items: `feat`, category `npcAbilities` | Name, Tenacity cost (1, 2 or 3), rank, timing (when it can be used), text; optional activities (a save, an effect) where the GM wants buttons. Spending Tenacity per Q-N34. The nine book examples are offered as starting templates in the builder. |

## NPC3c: building them

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| C1 | Builder step 7 | `applications/npc/adversary-builder.mjs`, `templates/apps/adversary-builder.hbs` | The "Coming with NPC3" section becomes three builders. **Strike:** the five decisions (range, counts-as, rider and its save, damage type, name), with the table's damage shown as you choose. **Jutsu:** offensive, defensive or support, then the book's steps for that kind, with the effective level and damage (or focus value) shown live. **Ability:** cost, rank, timing, text, or start from a book example. The jutsu count includes Freeform Jutsu against the limit. Slots used against the suggested Freeform slots for the class and level. |
| C2 | Draft and save | `rules/adversary-builder.mjs` | Freeform entries in the draft (`freeform: [{kind, …choices}]`); `draftToUpdate` creates or updates their items from the choices; `draftFromActor` reads them back from `flags.n5e.freeform`. |
| C3 | After building | the NPC sheet | Freeform items are ordinary items on the sheet (Combat, Jutsu, Features tabs) and can be edited there. "Rebuild in the builder" opens step 7 on that item. |
| C4 | Level changes | `rules/freeform.mjs` | When the adversary's level changes, its Freeform items are recalculated from their choices (damage, DC, values), so a level 9 adversary taken to 12 hits like a level 12 one. A hand-edited formula is kept and marked (Q-N38's sibling: the GM's edit wins). |

## Tests

`tests/core/freeform.test.mjs`: every table spot-checked against the book (Strike rows 1, 6, 11, 30; jutsu tables rows 1, 13, 30 in each column); `strikeDamage` with Tier 1 and Tier 2 riders; `freeformRanks` at each threshold; `effectiveLevel` with every penalty and the clamp; defensive and support values; rider DC by class; costs. `tests/freeform-items.test.mjs`: each kind built from choices gives the right item and activities; a level change recalculates; the builder's step 7 renders and saves; casting a Freeform Jutsu goes through the action card with its riders.

## Questions for King

- **Q-N33: Chakra cost.** The book says a Freeform Jutsu's rank sets its cost but gives no number. The core book's ranges are D 3–5, C 6–9, B 10–14, A 15–19, S 20+. Default to D 4, C 8, B 12, A 17, S 22, editable per jutsu, or other numbers?
- **Q-N34: Abilities before Tenacity.** Freeform Abilities spend Tenacity, which comes with NPC4 (after standardization). Build Abilities now with their cost stored and shown, usable as a card without spending until NPC4? Or move Abilities to NPC4?
- **Q-N35: which attack bonus a Strike uses.** "Normally uses your highest attack bonus": default to the highest of the Weapon/Freeform, Ninjutsu, Taijutsu and Genjutsu lines, and the counts-as choice picks the line?
- **Q-N36: automating effects.** Conditions from the Effects table apply on a failed save, as jutsu conditions do now. Non-condition effects: AC, DR and speed penalties, roll penalties and disadvantage as Active Effects; forced movement, dispel, interrupt and action denial as notes on the card for the GM to apply? "Make your own" as typed text only?
- **Q-N37: recovery.** Each effect records its recovery: take an action, a save at the end of the target's turn, or wait 1–2 rounds. Should the system run these (the save prompt at the end of the turn, removal after the rounds), as it does for jutsu conditions today?
- **Q-N38: Multiattack.** One click rolls all the attacks against the target(s) on one action card (proposed), or one attack per click with the count shown? And the "single attack, combined damage" option: per Strike, chosen in the builder?
- **Q-N39: Minions' Freeform Jutsu.** Cost 0 and one per turn: should the system warn on a second Freeform Jutsu in the same turn, or leave it to the GM?
- **Q-N40: gaps in the focus values.** The book gives some values only at D, B and S (Defensive AC +3/+4/+5; Support attack and save +1/+2/+3; check Mastery 1/2/3). For C and A, use the step below (C as D, A as B)?
- **Q-N41: releases.** One release, or NPC3a and NPC3b together then NPC3c?

## King's answers (2026-11-14)

- **Q-N33:** Freeform Jutsu chakra cost by rank: D 5, C 9, B 14, A 20, S 30 (editable per jutsu).
- **Q-N34:** Freeform Abilities move to NPC4, with Tenacity. B6 and the builder's Ability section are out of NPC3.
- **Q-N35:** the GM builds a Strike and it is set when built: the attack line (Weapon/Freeform, Ninjutsu, Taijutsu or Genjutsu) is chosen in the builder and kept. Claude's reading, applied to C4: a Strike does not recalculate when the adversary's level changes; "Rebuild in the builder" recalculates it. Freeform Jutsu recalculate as C4 says.
- **Q-N36:** agreed: conditions on a failed save; AC/DR/speed penalties, roll penalties and disadvantage as Active Effects; forced movement, dispel, interrupt and action denial as card notes; "Make your own" as text.
- **Q-N37:** yes, the system runs each effect's recovery as it does for jutsu conditions.
- **Q-N38:** one attack per click (the count shown). The single-attack, combined-damage option is chosen per Strike in the builder.
- **Q-N39:** leave a Minion's once-per-turn Freeform Jutsu to the GM; no warning.
- **Q-N40:** for C and A, use the value of the rank below (C as D, A as B).
- **Q-N41:** one release.

## Progress log

- 2026-11-14 Claude: King answered Q-N33–Q-N41. Abilities moved to NPC4.
- 2026-11-14 Claude: spec written from the Bingo Book's "Adversary Combat" chapter and the core book's chakra cost ranges. Nothing built.
