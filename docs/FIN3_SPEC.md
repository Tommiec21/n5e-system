# FIN3 function spec: card and resolution limits

Status: **spec written 2026-11-14 (King: "Next batch"). King answered Q-F8–Q-F10, Q-F12, Q-F13; Q-F11 explained, awaiting answer. Split into FIN3a (card) and FIN3b (Clash). Awaiting approval.**

Plan: `docs/DEV_PLAN.md` row 3. It closes the limits that CARD1, GEN1 and CLASH1 recorded when they shipped. NPC4–NPC6 wait for STD4 (King Q-N2), so FIN3 is the next batch in order.

## What is open today (from the shipped specs)

| # | Limit | From | What happens now |
| --- | --- | --- | --- |
| L1 | A jutsu with two different save activities records only the first save each creature rolls | CARD1b | 17 compendium jutsu have 2 or 3 save activities (Cherry Blossom Impact Con then Dex, Breath of Wind: Claws Str then Dex, Abyssal Aura three Wis saves...). The second save button rolls, but the card refuses the result ("already recorded") and its conditions can't be applied from the card. |
| L2 | An effect put on a creature the caster's user doesn't own goes out as the offer card and isn't recorded on the action card | CARD1b | The owner applies it from the offer card; the action card's Effects section never shows it, and Undo from the card can't remove it. |
| L3 | GM-opened reaction windows (whispered prompts) aren't linked to a card | CARD1c | The window lives on its own. The card only learns about the reaction after damage is applied (from the damage trace). |
| L4 | Damage rows don't drop creatures immune to a Genjutsu's stimuli | GEN1 | The save card says "immune", but the damage row still offers Apply. |
| L5 | The defender in a Clash uses its jutsu's base rank | CLASH1 | A concentrated jutsu cast at a higher rank clashes at its printed rank, so the rank Mastery bonus and best-of-3 can be wrong. |
| L6 | Auto-win features have no button | CLASH1 | `clashResult` supports auto-wins; nothing on the card sets them. |
| L7 | Arts (S-Rank + 1) aren't modelled | CLASH1 | The rank comparison stops at S. |
| L8 | Dispelling the loser's jutsu is a note | CLASH1 | The loser's concentration and the jutsu's effects stay until someone ends them by hand. |

## Functions

After each function, add a line to the progress log and push.

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | Saves per activity | `rules/action-card.mjs` (`addCardResult`, `resultsFromLinked`, `cardTargetRows`, `sectionStates`), `workflow/action-card.mjs`, `workflow/activity-buttons.mjs` | Save results are kept per target **and per save activity** (`results.saves[uuid][saveKey]`, `saveKey` = the activity's id or index). A save roll carries its `saveKey`. Each row shows one line per save ("Con: Failure · Dex: Success"); "Roll X save" and "Apply <condition>" exist per save, each applying the conditions of its own activity. Damage halving follows the save on the activity that carries the damage (Q-F11). The saves section is done once every target has every save. Cards posted before FIN3 read their single save as the first activity's. |
| F2 | Offered effects recorded | `workflow/effect-application.mjs` (offer card), `workflow/action-card.mjs`, owner intent `cardResult` | The offer card carries the action card's message id and the activity key. When the owner applies the effect from the offer card, the effect summary is linked to the action card and recorded through the existing `cardResult` intent (the GM writes it), so the Effects section shows it and the card's Undo removes it. Until accepted, the row shows "Offered to <owner>". |
| F3 | Reaction windows on the card | `workflow/reactions.mjs` (`openReactionWindow` gains `cardMessageId`), `workflow/reaction-dispatch.mjs`, `rules/action-card.mjs` | A reaction window opened for an attack, save or damage on an action card stores that card's id. The card's Reactions section lists each window per creature: pending (with the time left), taken (and what), declined or timed out, and each refreshes when the window changes. The window keeps working as today; the card only shows it. |
| F4 | Immune creatures on damage rows | `rules/action-card.mjs` (`cardTargetRows`), `workflow/apply-damage.mjs`, `workflow/effect-application.mjs`, `workflow/activity-buttons.mjs` (`stimuliImmune`) | Q-F12: Apply stays. A creature immune to the jutsu's stimuli (cast as Genjutsu) shows "Immune (<reason>)" on its row; applying damage to it applies 0 (the trace names the immunity), and a condition or effect from that jutsu applied to it ends at once (it is not left on the creature). |
| F5 | Cast rank kept while concentrating | `workflow/cast.mjs`, `workflow/concentration.mjs`, `workflow/clash.mjs` | When a concentration jutsu is cast, its cast rank and discipline are stored on the caster (`flags.n5e.concentrationCast[itemId] = {rank, discipline, messageId}`) and cleared when concentration ends. The Clash uses that rank for the defender (and the attacker's concentrated jutsu, when it is the trigger), and the chooser shows it ("Fireball (A, cast at S)"). |
| F6 | Auto-win buttons | `workflow/clash.mjs`, `rules/clash.mjs` | Q-F8: GM only. The Clash card shows the GM "<side> wins automatically" for each side; pressing it decides the clash for that side (no rolls needed), and the card says it was a GM decision. |
| F7 | Arts | — | Q-F9: **post-launch** (involves class mods). Not in FIN3; recorded in `docs/DEV_PLAN.md` under post-launch work. |
| F8 | Dispel the loser | `workflow/clash.mjs` (`applyClashLoss`), `workflow/concentration.mjs` | Q-F10: a dispelled effect ends immediately. The loser's Apply ends its concentration on the clashing jutsu and every effect that jutsu put out (CONC1 dependents, and effects from it with no concentration), and marks it dispelled on the card. On a Draw, "Dispel both" does the same for both sides (each owner for their side, or the GM). |

## Releases (Q-F13: smaller batches)

- **FIN3a** (card): F1, F2, F3, F4.
- **FIN3b** (Clash): F5, F6, F8.

## Tests

- `tests/core/action-card.test.mjs`: two saves on one card per target; each save's conditions; done only when every save is in; old single-save cards; damage share from the damage-carrying save; offered effect pending then recorded; reaction window states on the card; an immune row has no share.
- `tests/clash.test.mjs`: cast rank from the concentration flag; auto-win from the card; Art above S in rank Mastery and contest count; the loss ends concentration.

## Questions for King

- **Q-F8: Auto-win features.** The Clash rules mention features that win a clash automatically, but none of the imported content says so (the closest is "You automatically initiate a clash... even if their jutsu doesn't have the clash keyword"). Which features win a clash automatically? Or should every Clash card simply have an "Auto-win" button for each side, for the GM or the side's owner to press when a feature says so?
- **Q-F9: Arts.** What makes a jutsu an Art (a keyword, a section, a rank on the item, named jutsu)? And does "S-Rank + 1" mean it counts as one rank above S for the rank bonus and for best of 3?
- **Q-F10: Dispelling.** When a clash is lost: end the loser's concentration on that jutsu automatically when the Apply button is pressed (proposed), or keep a separate "Dispel" button? A non-concentration jutsu has nothing lasting to end; is "dispelled" there only "its effects don't apply"?
- **Q-F11: Two saves and damage.** On a jutsu with two saves, half damage on a success follows the save on the activity that carries the damage (proposed)? When neither save activity carries the damage (a separate damage activity), the first save?
- **Q-F12: Immune creatures.** Hide Apply on an immune creature's damage row with a GM-only "Apply anyway" (proposed), or show nothing at all?
- **Q-F13: Releases.** One release, or F1–F4 (card) then F5–F8 (Clash)?

## King's answers (2026-11-14)

- **Q-F8:** auto-wins exist (some Ninjutsu specialist class features). For now an auto-win button, GM only, to decide the winner.
- **Q-F9:** Arts are much later and involve class mods: post-launch work, not a priority.
- **Q-F10:** a dispelled effect is ended immediately at the time of dispelling.
- **Q-F11:** King asked for an explanation and an example (given 2026-11-14); open.
- **Q-F12:** keep Apply; the immunity reduces the damage to 0, or immediately ends the effect on them.
- **Q-F13:** smaller batches.

## Progress log

- 2026-11-14 Claude: answers recorded; F7 moved to post-launch; split into FIN3a and FIN3b. Found: Cherry Blossom Impact's first save carries the strike's damage, where the text makes it an attack whose hit deals the damage (import fix candidate for STD6).
- 2026-11-14 Claude: spec written from the CARD1b, CARD1c, GEN1 and CLASH1 limits; 17 jutsu with more than one save found in the compendium. Awaiting answers and approval.
