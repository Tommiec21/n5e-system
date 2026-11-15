# STD4 function spec: trigger elements

Status: **King 2026-11-15: "Build out the next 3 batches" (STD4, STD5, STD6a). Built and published `0.44.0-alpha.1`.**

Plan: `docs/STD_SPEC.md`, batch STD4. No rule changes: five coded features move into data.

| # | Function | Behaviour |
| --- | --- | --- |
| T1 | Trigger elements | A rule element with `on: <event>` fires when the event happens to its owner (`rules/triggers.mjs triggersFor`, `triggerOutcomes`; `workflow/triggers.mjs fireTriggers`). Events wired: initiative, turnStart, turnEnd (turn pipeline), hit, miss, failedSave, succeededSave (`rollWithSpec`), damageDealt (weapon damage), damageTaken, zeroHP (damage application). Outcomes: `resource` {pool, amount} ("fury" = the Fury tracker), `note` (whispered to the owner), `inflict` {condition, ranks, who: self or target}. `oncePerTurn` limits it to once per combat turn. |
| T2 | Active stance option | `self:stance:<identifier or name slug>` for predicates. |
| T3 | Uncanny Dodge | A before-damage reaction recipe on the feature (`flags.n5e.reaction`: halve, needs sight, spends the reaction). `rules/uncanny-dodge.mjs` and its adapter removed. |
| T4 | Deflection | A recipe on the Discipline feature: `(@scale.weaponSpecialist.deflectionDice)d12`, 1 Discipline, spends the reaction, only damage DR applies to (new recipe field `requiresDR`). The Weapon Specialist table gains a Deflection Dice column (1 at 1–10, 2 at 11–19, 3 at 20). `rules/deflection.mjs` and its adapter removed. |
| T5 | Extra Attack, General Technique | `attacks` elements (`value`, `implementsOnly`, `text`) read by `attacksPerAction`; Scout-Nin's Extra Attack carries the third attack with Kunai, Shuriken or Senbon. |
| T6 | Adaptive Initiative | An `initiativeOptions` element (`skills`, `text`) read by `rollInitiative`. |
| T7 | Binding Fury Stance | `{key: "resource", on: "damageDealt", selector: "damage:weapon", pool: "fury", amount: 1, oncePerTurn: true, predicate: "self:stance:binding-fury-stance"}` on the jutsu; `bindingFuryTrigger` removed. |

## Progress log

- 2026-11-15 Claude: built and published `0.44.0-alpha.1`. Hard-coding allowlist 25 → 19. Readings: the shinobi-implement test on weapon names stays for STD6a (items); the "Binding Fury Stance" predicate fires only while a stance with that identifier or name is the active stance, as the code did. Tests: Deflection, Uncanny Dodge, Extra Attack and Binding Fury tests rewritten against the data; `tests/core/elements-v2.test.mjs` +1. Suites: 550 and 160 pass.
