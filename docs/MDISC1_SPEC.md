# MDISC1 function spec: multi-discipline casting

Status: **in progress (King: "Begin the work", 2026-11-13).** Release target `0.18.0-alpha.1`.

Closes plan finding R26: there is no cast-discipline choice for multi-discipline jutsu.

King's rulings (N5e-Context.md Section 12, data decisions 11, 14 and 15):
- **11.** Ability requirements (B 16 / A 18 / S 20) are checked against the chosen discipline's ability at cast time. A concentration jutsu keeps its chosen discipline for its whole duration (upkeep effects, Flow's Ninjutsu advantage...).
- **14.** Known-list checks: a multi-discipline jutsu counts as every discipline it lists for known-list requirements, level-up swaps "of the same type", prerequisites and learning limits (learnable if any one of its disciplines is allowed).
- **15.** Defenses: Identify and Read the Enemy use the skill for the cast discipline; Clash uses the cast discipline's skill. Cast as a non-Genjutsu discipline, its Stimuli give no immunity and its psychic damage doesn't ignore DR. Chakra Suppression and Counter Tags catch it by any listed discipline.

## Functions

Work through these in order. After each one, add a line to the progress log at the end and push, so the next agent can continue from there.

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | `JutsuData#liveByDiscipline`, `JutsuData#liveAs(discipline)` | `data/item/jutsu.mjs` | `prepareActorDerived` works out the live numbers (ability, attack, DC, requirement met) for every listed discipline. `live` stays the default discipline's numbers. `liveAs(d)` returns the numbers for `d` (falling back to `live`). Bukijutsu uses the Taijutsu numbers. |
| F2 | `castPlan(actor, item, {discipline})` | `workflow/cast-plan.mjs` | Validates the choice is one of `castingDisciplines`. The ability requirement, Inner Gate block (Ninjutsu/Genjutsu), Moldings (Ninjutsu only), Sealed base cost and feature cast options (`appliesTo.discipline`) use the cast discipline. Returns `plan.discipline`. A concentration jutsu records `flags.n5e.castDiscipline.<id>` (the lock). Recasting a concentrated jutsu keeps its locked discipline. |
| F3 | `castDisciplineOf(actor, item)`, `defaultCastDiscipline(actor, item)` | `rules/cast-discipline.mjs` (new, pure) | The locked discipline while concentrating, else the jutsu's default discipline. |
| F4 | Cast dialog choice | `workflow/cast.mjs` | "Cast as" select when the jutsu lists more than one discipline (locked to the concentration discipline while concentrating). The preview reflects the choice. |
| F5 | Cast card and buttons | `workflow/cast.mjs`, `workflow/activity-buttons.mjs` | The card subtitle names the cast discipline. `flags.n5e.cast.discipline` is stored. Attack bonuses and save DCs come from `liveAs(discipline)`. Genjutsu damage (psychic ignores DR) only when cast as Genjutsu. |
| F6 | Locked-discipline readers | `workflow/apply-damage.mjs`, `workflow/trackers.mjs` | Flow's Ninjutsu advantage on concentration checks and the Inner Gates' end of Ninjutsu/Genjutsu concentration read `castDisciplineOf`. |
| F7 | `countsAsDiscipline(item, d)`, `knowsJutsuOf(actor, {discipline, keyword})` | `rules/cast-discipline.mjs` | Known-list checks count every listed discipline (Bukijutsu counts as Taijutsu and as Bukijutsu). |
| F8 | `learnableJutsu({allowedDisciplines})` | `advancement/steps.mjs` | Optional learning limit: learnable when any one listed discipline is allowed. |
| F9 | Defense hooks | `rules/cast-discipline.mjs` | `defenseSkillFor(discipline)` (Identify, Read the Enemy and Clash use the cast discipline's skill), `stimuliApply(discipline)` (only when cast as Genjutsu), `caughtBy(item, disciplines)` (Chakra Suppression and Counter Tags: any listed discipline). Pure helpers for GEN1 and CLASH1, which build those workflows. |

## Not in MDISC1

- Identify, Read the Enemy, Clash, Chakra Suppression and Counter Tag workflows: their batches (CLASH1, GEN1, Tier 3) will call the F9 helpers.
- Stance requirement checks ("a Ninjutsu ... on your known list"): stance data is King's own update; F7 gives the check to use.

## Tests

`tests/mdisc.test.mjs`: per-discipline live numbers; the plan uses the chosen discipline (requirement, Moldings, Gates); the lock while concentrating; the card's Genjutsu damage flag; known-list helpers; learning limits; defense helpers.

## Progress log

- 2026-11-13 Claude: spec written; starting F1.
