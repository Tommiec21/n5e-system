# CLASH1 function spec: Jutsu Clash

Status: **approved by King 2026-11-14 ("Begin work I approve these"). In progress.** Release target `0.25.0-alpha.1`.

Plan row 13: Clash contested workflow, rank bonus, best of 3, elemental advantage (Q3).

Rules (Jiraiya's Jutsu Compendium, "Clashing Jutsu" and "Clashing Jutsu Examples"; King 2026-11-14 for Q3):
- Jutsu with the Clash keyword that interact initiate a clash. Both users make opposing checks:
  - Ninjutsu clash: Ninshou vs Ninshou.
  - Taijutsu clash: Martial Arts vs Martial Arts.
  - Ninjutsu vs Taijutsu: both follow the rules of the **triggering** jutsu.
  - MDISC1: the skill of the discipline the jutsu was cast as.
- **Rank bonus:** +1 Mastery rank to the clash check for each rank your jutsu is higher than the other.
- **Best of 3:** when both jutsu are B-Rank or higher (as cast), three contests; two or more wins takes the clash.
- **Elemental Advantage:** the superior Release rolls at advantage (Fire > Wind > Lightning > Earth > Water > Fire).
- **Win:** the winner applies its jutsu's effects; the loser's jutsu is dispelled, and the loser gains 1 rank of Concussed and is Dazed.
- **Draw:** both jutsu are dispelled, and no one suffers any effects. Both sides auto-winning is a Draw.
- Area jutsu: no saves are rolled until the clash is resolved. The loser automatically fails the save; others save normally. This is a table procedure the card states.

Parity (dnd5e / PF2e): nothing is detected automatically. The defender's owner starts the clash from the triggering cast card, and each side rolls only for its own creature.

## Functions

After each function, add a line to the progress log and push.

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | `clashSkill`, `rankMastery`, `elementalAdvantage`, `contestCount`, `clashResult` | `rules/clash.mjs` (new, pure) | The skill from the triggering jutsu's cast discipline; the Mastery bonus gained from the rank difference (up to rank 3); advantage from the element cycle; 1 or 3 contests; the winner or Draw from both sides' totals (ties within a contest give no one the point; best of 3 needs 2 wins). |
| F2 | Clash button | `workflow/activity-buttons.mjs` or `workflow/cast.mjs` | Cast cards of Clash-keyword jutsu get **Clash**. |
| F3 | `startClash(message)` | `workflow/clash.mjs` (new) | The clicking user picks one of their creatures (selected token or assigned character) and one of its Clash jutsu (concentrated ones first). Posts a Clash card with both sides, the skill, the contest count and each side's advantage and Mastery bonus. |
| F4 | `rollClash(card, side)` | same | Each side's owner rolls its clash checks (one roll per contest) with `source` = the card and `clashSide`. |
| F5 | `renderClash(card, html)` + refresh hook | same | Reads the linked rolls, shows each contest, and once both sides have rolled, the result: Win (loser: Apply Concussed 1 and Dazed; "dispel your jutsu" note) or Draw (both dispelled). |

## Tests

`tests/clash.test.mjs`: skill from the triggering discipline; rank Mastery (0 when lower or equal, capped at 3); element advantage both ways and neutral; 1 vs 3 contests; single, best-of-3 and tied results.

## Progress log

- 2026-11-14 Claude: spec written; starting F1.
- 2026-11-14 Claude: **F1 done.** New `rules/clash.mjs`: `clashSkill`, `rankMastery` (Mastery ranks and bonus gained, capped at rank 3), `releaseOf`, `elementalAdvantage`, `contestCount`, `clashResult` (auto-win on both sides = Draw). Checked: S vs C with Mastery 1 gives +2 ranks (+4); B vs A is best of 3; Fire beats Wind. Next: F2–F5 (workflow).
- 2026-11-14 Claude: **F2–F5 done.**
  - New `workflow/clash.mjs`:
    - `clashButton(item)`: added to cast-card extras for Clash-keyword jutsu.
    - `startClash(message)`: the defender is the clicking user's selected owned token or their character, but not the caster. It picks a Clash jutsu (concentrated first; a chooser when several) and posts the Clash card. `flags.n5e.clash = {skill, contests, a, b, triggerDiscipline}`, and each side carries `{actorUuid, name, item, rank, bonus, masteryRanks, advantage}`.
    - `rollClash(card, side)`: rolls the side's remaining checks with `source` = the card, the rank Mastery bonus, and element advantage.
    - `renderClash`: reads the linked rolls per actor and shows the result (Draw, or the winner plus the loser's Apply button).
    - `applyClashLoss`: adds Concussed 1 and Dazed.
    - `registerClashHooks`: re-renders the card when its rolls arrive.
  - `dice/roll.mjs` renders and binds the buttons and loads the module at startup with the resolution module.
  - Suite green. Next: tests, then release 0.25.0-alpha.1.
