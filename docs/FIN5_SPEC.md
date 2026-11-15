# FIN5 function spec: King's answers to Q-F1–Q-F7, and ROLL2 closed

Status: **approved by King 2026-11-15 ("Approved") and published `0.33.0-alpha.7`.**

## ROLL2: closed with no change (King 2026-11-15)

The six rolls ROLL1 left without a dialog (condition damage at turn start, Chilled movement damage, recharge, the ammunition die, hazard damage after a failed save, falling damage) don't need a confirmation: they keep rolling at once, as today.

## King's answers (2026-11-15)

- **Q-F1:** players can give items to each other. Already so (player characters, and Allied NPCs, which are player-owned).
- **Q-F2:** no taking from sheets you don't own. Players buy items from merchants: that is LOOT1 (merchant actors). Nothing changes here.
- **Q-F3:** yes, ryo moves the same way.
- **Q-F4:** yes, the size rule (disadvantage against a target one size larger, impossible two or more) applies to Grapple, Shove, Pin and Disarm as well as Trip.
- **Q-F5:** weapon Disarm and Trip: full weapon damage on a success, not the die alone.
- **Q-F6:** yes, the reader picks who takes the Read the Enemy benefit (one creature, themselves or an ally). Already so (the selected token, or the reader).
- **Q-F7:** either; the escapee picks Athletics or Acrobatics. Already so (two Escape actions).

## Functions

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | Give ryo | `rules/transfer.mjs` (`ryoPlan`), `workflow/transfer.mjs`, owner intent `transferItem` (or a `transferRyo` intent), the character sheet's currency | "Give ryo" next to the sheet's ryo: choose a recipient the same way as items (Q-F1) and an amount up to what you have; the active GM moves it (removed from you, added to them) and posts "A gave 50 ryo to B". |
| F2 | Size rule for more actions | `rules/skill-resolution.mjs` (`SIZE_GATED`) | Trip, Grapple, Shove, Pin and Disarm: disadvantage against a target one size larger; impossible against two or more larger (Q-F4). The skill-action card and the weapon Disarm/Trip/Grapple/Shove buttons use it. |
| F3 | Full weapon damage | `workflow/skill-actions.mjs` | A success from a weapon's Disarm or Trip property offers that weapon's full damage (its die, extra dice, ability modifier and flat bonuses, from the weapon's own attack spec) with Damage and Critical buttons, in place of the die alone (Q-F5). |

## Tests

`tests/core` or `tests/transfer.test.mjs`: ryo plan (amount bounds, not more than you have, recipients as items). `tests/skill-actions*.test.mjs`: the size gate for each of the five actions. A weapon Disarm success offers the full damage formula.

## Releases

One small release.

## Progress log

- 2026-11-15 Claude: spec written from King's answers; ROLL2 closed with no change; Q-F1, Q-F2, Q-F6 and Q-F7 already match the system.
- 2026-11-15 Claude: **built and published 0.33.0-alpha.7.** F1: `rules/transfer.mjs ryoPlan`; `workflow/transfer.mjs transferRyo`, `receiveRyo`, `promptGiveRyo`; owner intent `transferRyo {targetUuid, amount}`; sheet action `giveRyo` on the Inventory tab. F2: `SIZE_GATED` adds grapple, shove, pin, disarm. F3: `skill-actions.mjs` builds the damage from `weaponAttackSpec(actor, weapon).damage`. Tests: core +2 (size gate for each action, ryo plan), `tests/fin3.test.mjs` +1 (intent). Suites: 504 and 120 pass.
