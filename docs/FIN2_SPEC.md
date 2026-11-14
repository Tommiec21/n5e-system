# FIN2 function spec: combat actions

Status: **draft for King's approval (2026-11-14). Nothing is built. Questions Q-F4–Q-F9 below.**

Plan: `docs/DEV_PLAN.md` batch 2. Finishes the combat actions that earlier batches left as text or by hand (ATK1, SKILL1, MDISC1, GEN1).

Rules used (Shinobi Handbook Ch3 skill actions, Ch5 equipment; `N5e-Rules-KB` 02 and 08):
- **Trip:** contested Athletics vs Acrobatics; Prone. Disadvantage if the target is 1 size larger; impossible if 2 or more larger.
- **Grapple:** contested Athletics vs Athletics or Acrobatics; Grappled. Escape is an Action using the same contest. The grapple ends if the creatures are moved more than 5 ft apart. With 1+ Mastery and beating by 10: Restrained, and escape is at disadvantage.
- **Pin** (while grappling): contested Athletics; Restrained, can't speak, can't make hand seals; escape at disadvantage.
- **Disarm:** contested Athletics vs Athletics or Sleight of Hand; the item lands within 5 ft (10 ft if beaten by 10).
- **Weapon property Disarm:** replace one attack with the Disarm or Grapple skill action; success deals the [Weapon's Damage] die. **Weapon property Trip:** replace one attack with Trip or Shove; success deals the [Weapon's Damage] die.
- **Read the Enemy** (Reaction, on seeing a jutsu's hand seals or complex movements): the discipline's skill vs the caster's save DC for that discipline. Success: learn name, rank and targets; then you or an ally within range may either gain +1 to saves and AC against it, or use the discipline's option (Genjutsu: close your eyes, Blinded; Taijutsu: interpose for an ally within 20 ft; Ninjutsu: move up to 10 ft).
- **Identify Ninjutsu / Genjutsu / Taijutsu** (Action): the discipline's skill vs the jutsu's save DC + 5. Success: name, rank, effects (Genjutsu: also its special end condition).
- **Suppress Chakra** (1 minute): the Chakra Control result is your Suppression Score; hidden from Chakra Sight whose passive Perception is below it; lasts 10 minutes; ends when you spend CP or a chakra-like resource; each reattempt is at −2.
- **Counter Tag** (D–A): absorbs the next single-target jutsu of its rank or lower. **Chakra Suppression Tag** (C–A, DC 15/17/19): the creature can't cast Ninjutsu or Genjutsu below the tag's rank.

## FIN2a: grapples, trips and disarms

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| A1 | `sizeGate(attackerSize, targetSize)` | `rules/skill-resolution.mjs` | `normal`, `disadvantage` (target 1 size larger) or `impossible` (2+ larger), for the actions Q-F4 names. |
| A2 | Size applied | `workflow/skill-actions.mjs` | The action is refused when impossible; rolled at disadvantage when one size larger, with the source listed. |
| A3 | Grapple link | same | Applying Grappled, or Restrained from a grapple or Pin, records who is holding (`flags.n5e.heldBy` on the effect). |
| A4 | Prerequisites | same | Pin, Takedown, Choke and Muffle are offered only against a creature you are holding. |
| A5 | **Escape** | same, `config/character.mjs` | A new action for a held creature: the same contest against its holder (Athletics or Acrobatics vs Athletics), at disadvantage when Restrained by the grapple or pinned. Success removes the hold. |
| A6 | Break on distance | `workflow/positioning.mjs` | When holder and held end more than 5 ft apart, the hold ends, with a chat line. |
| A7 | Weapon Disarm and Trip | `workflow/attack.mjs`, combat tab | A weapon with the Disarm property offers "Disarm" and "Grapple" in place of an attack; one with Trip offers "Trip" and "Shove". They run the skill action; on success a damage button for the weapon's damage die appears (Q-F5). Counts as one of the attacks of the Attack action. |

## FIN2b: reading and countering jutsu

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| B1 | **Read the Enemy** button | `workflow/action-card.mjs` or `workflow/cast.mjs` | On another creature's cast card: a user picks one of their creatures, spends its Reaction, and rolls the skill for the discipline the jutsu was cast as (MDISC1) against the caster's DC. |
| B2 | Read the Enemy result | same | Success whispers name, rank and targets to that user, then offers the two choices for the discipline as buttons for that creature or an ally (Q-F6): +1 saves and AC against this cast (an effect tied to the card), or the discipline's option (Blinded until it chooses to open its eyes; a move note; an interpose note). |
| B3 | **Identify** button | same | On a cast card or an ongoing effect's card: the discipline's skill vs the jutsu's save DC + 5; success whispers name, rank and effects. |
| B4 | **Suppress Chakra** | `workflow/skill-actions.mjs` | Rolls Chakra Control and applies a "Chakra Suppressed" effect for 10 minutes holding the score; each reattempt in a row is at −2; the effect ends when the creature spends CP or a chakra pool. |
| B5 | Chakra Suppression Tag | `rules/cast-checks.mjs`, equipment data | A creature under the tag's effect can't cast Ninjutsu or Genjutsu below the tag's rank (a jutsu listing either discipline is caught, MDISC1 `caughtBy`). The cast dialog says why. |
| B6 | Counter Tag | `workflow/action-card.mjs`, equipment data | A creature with an active Counter Tag targeted by a single-target jutsu of the tag's rank or lower gets "Counter Tag absorbs this" on its row; using it negates the jutsu for that creature and uses up the tag. |

## Tests

`tests/core/skill-size.test.mjs` (size gate), `tests/skill-actions-hold.test.mjs` (hold link, prerequisites, Escape, break on distance), `tests/read-enemy.test.mjs` (skill and DC by cast discipline, result choices, Identify DC + 5), `tests/cast-checks.test.mjs` additions (Suppression Tag), `tests/core/action-card.test.mjs` additions (Counter Tag row).

## Questions for King

- **Q-F4: size.** The book states the size rule (disadvantage one size larger, impossible two or more) for Trip. Does it also apply to Grapple, Shove, Pin and Disarm?
- **Q-F5: weapon Disarm and Trip damage.** "Success deals the [Weapon's Damage] die": is that the die alone, with no ability modifier?
- **Q-F6: Read the Enemy.** After a success, can the reader give the benefit to any one ally in range instead of themselves, and is it one creature only?
- **Q-F7: Escape.** Does the escaping creature choose Athletics or Acrobatics, against the holder's Athletics?
- **Q-F8: Suppression Tag and Counter Tag.** These need the full equipment text (how a tag is placed, its save, its duration). I'll read Chapter 5 for it during the build. If the text leaves a gap, I'll ask before building B5 and B6. Is that acceptable?
- **Q-F9:** Build FIN2a first as one release, then FIN2b?

## Progress log

- 2026-11-14 Claude: spec written from the KB. Nothing built.
- 2026-11-14 Claude: **FIN2a started (King: "Approved").** Q-F4–Q-F7 were not answered one by one, so the build uses the book's literal text and each reading stays open for King:
  - Q-F4: the size rule applies to Trip only (`SIZE_GATED = ["trip"]`; add keys there to widen it).
  - Q-F5: weapon Disarm and Trip roll the weapon's damage die alone, no ability modifier.
  - Q-F7: the escaping creature chooses Athletics (`escape`) or Acrobatics (`escapeAcrobatics`) against the holder's Athletics.
  - Q-F9: FIN2a first, FIN2b after.
- 2026-11-14 Claude: A1–A2 done: `sizeGate`, `skillActionGate` (pure); `rollD20` refuses or adds disadvantage before the roll.
- 2026-11-14 Claude: A3–A6 done: `flags.n5e.heldBy` on Grappled/Restrained effects applied from Grapple and Pin; `holdsOn`; prerequisites for Pin, Takedown, Choke, Muffle; Escape actions with "End the hold"; `onMoveForHolds` on `moveToken`.
- 2026-11-14 Claude: A7 done: weapon pills `skill:<key>` on the Combat tab; damage-die button on success. Not done: counting it as one of the attacks of the Attack action; nothing in the system counts attacks.
- 2026-11-14 Claude: tests attempt 1 passed: `npm test` 409 pass, 2 skipped; core 77/77; lint and check clean. Test files are `tests/core/skill-holds.test.mjs` and `tests/skill-actions-hold.test.mjs` (the spec's `skill-size` name was merged into the first).
- 2026-11-14 Claude: **FIN2a published `0.29.0-alpha.2`.** FIN2b not started.
