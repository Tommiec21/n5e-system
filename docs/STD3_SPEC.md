# STD3 function spec: conditions and states as data

Status: **spec written 2026-11-15 (King: "Start."). Approved 2026-11-15; published `0.43.0-alpha.1`.**

Plan: `docs/STD_SPEC.md`, batch STD3. The contract allows engine code to name a condition or state key (a generic concept); what moves to data is **what each one does to rolls, damage and casting**, so the GM can open it in game and new conditions need no code. **No rule changes:** every behaviour below is today's, moved from code into each condition's entry.

## What is coded today

| Where | What |
| --- | --- |
| `rules/advantage.mjs advantageSources` | Advantage, disadvantage and automatic failure from Blinded, Restrained, Prone, Invisible, Helped, Staggered (and Encumbered), Petrified, Stunned, Unconscious, Dodging, Dazzled |
| `rules/damage.mjs damagePlan` | Petrified's resistance to all damage (`flags.resistAll`) |
| `rules/cast-checks.mjs` | Incapacitated, Stunned, Unconscious (no casting); Grappled, Restrained (no Hand Seals, Chakra Seals, Mobility); Confused (no Hand Seals); Slowed (component limit) |
| `workflow/cast-plan.mjs` | Crash (`hasState(actor, "crash")`: no cost reduction) |
| `dice/roll.mjs` | Helped ends after the roll it helped |
| `workflow/trackers.mjs` | Furious kept in step with Fury (stays: it is the tracker itself, a generic concept) |

## Functions

| # | Function | Behaviour |
| --- | --- | --- |
| C1 | Condition and state entries carry rule elements | `config/conditions.mjs`: each condition and state may have `rules: [...]` (v2 elements). `rules/elements.mjs ruleSources(actor)` adds one source per active condition or state (its label as the source name), so they read exactly like an item's elements. |
| C2 | Roll options for the predicates | `rollOptions` adds `ability:<key>` (the roll's ability: a save's or check's ability, an attack's ability), `range:melee` / `range:ranged`, and `self:sense:<key>` / `target:sense:<key>` for each sense the creature has. |
| C3 | Two generic keys | `noAdvantage` (removes every advantage source on the matching rolls: Dazzled) and the field `endsOnUse: true` (the condition or state ends after the roll it applied to: Helped). |
| C4 | `advantage.mjs` reads elements | `advantageSources` keeps only the click/forced mode and the cancelling rule (`resolveMode`); every named source moves into the entries (table below). |
| C5 | Casting limits as data | Entries may have `cast: {blocked: "reason"}` (no casting at all) or `cast: {components: ["hs", ...], reason}` (no jutsu with those components) or `cast: {maxComponents: n, reason}`. `cast-checks.mjs` reads these from every active condition and state; no names. |
| C6 | Damage taken as data | Petrified's "resistance to all damage" becomes an element `{key: "damageHandling", direction: "against", resistAll: true}` read by `damagePlan` through the target's elements (`damageHandling` gains `resistAll`). `ignoreTraits` (FIN) still switches it off. |
| C7 | States as data | Crash's "no cost reduction" becomes a rule element on the Crash state effect: `{key: "costReduction", value: 0}`, generic key read by `cast-plan.mjs` (no `hasState(actor, "crash")`). Fury, Flow, Combat Rival, Static, Set-Up and Follow Up, Elemental Flux already unlock their effects through `self:state:<key>` predicates; any remaining code check moves the same way. |
| C8 | Gate | `tools/report-std-audit.mjs` "Condition mechanics named in engines" drops `advantage.mjs`, `cast-checks.mjs` and `damage.mjs`; a test fails if they name a condition again. |

## The mapping (today's rules, now on each entry)

| Entry | Elements |
| --- | --- |
| Blinded | disadvantage on own attacks unless `self:sense` blindsight, tremorSense or chakraSensing; `against` advantage on attacks; disadvantage on Dex, Int, Wis saves |
| Restrained | disadvantage on own attacks; `against` advantage on attacks; cast: no hs, cs, m |
| Grappled | cast: no hs, cs, m |
| Prone | disadvantage on own attacks; `against` advantage on melee attacks, disadvantage on ranged |
| Invisible | advantage on own attacks unless `target:sense` trueSight or chakraSight; `against` disadvantage on attacks unless the attacker has trueSight or chakraSight |
| Petrified | `against` advantage on attacks; autoFail Str and Dex saves; `against` damageHandling resistAll; cast: blocked |
| Stunned | `against` advantage on attacks; autoFail Str and Dex saves; cast: blocked |
| Unconscious | `against` advantage on attacks; autoFail all saves; cast: blocked |
| Incapacitated | cast: blocked |
| Dodging | `against` disadvantage on attacks, and advantage on own Dex saves, both unless incapacitated, stunned, unconscious, grappled or restrained |
| Staggered | disadvantage on Str, Dex, Con attacks, saves and checks |
| Dazzled | `noAdvantage` on own attacks (its −2 per rank stays a numeric penalty) |
| Helped | advantage on own attacks and checks, `endsOnUse` |
| Confused | cast: no hs |
| Slowed | cast: maxComponents 2 |
| Encumbered (derived) | disadvantage on Str, Dex, Con attacks, saves and checks (a derived source while encumbered) |

Numeric penalties already in the entries (`perRank`, `flat`: Exhaustion, Bruised, Weakened, Shaken, Demoralized, Sealed, Dazzled, Deafened, Concussed, Envenomed) are data today and stay as they are.

## Releases

One release (STD3), as the rest of the code stays the same.

## Tests

- `tests/core/conditions-data.test.mjs`: every row of the mapping gives the same advantage, disadvantage, automatic failure and casting limits as before (the existing ADV1 and cast-check tests keep passing unchanged); Dazzled removes advantage; Helped ends on use; Petrified halves damage; Crash blocks cost reduction.
- The audit test: `advantage.mjs`, `cast-checks.mjs` and `damage.mjs` name no condition.

## Questions for King

None about rules: this moves today's behaviour into data. Approve the mapping, or correct any row that doesn't match how a condition should work.

## Progress log

- 2026-11-15 Claude: spec written from the STD0 audit. Awaiting approval.
- 2026-11-15 Claude: **built and published 0.43.0-alpha.1.**
  - Readings: C1 was built as a reader of its own (`rules/condition-elements.mjs`: `activeEntries`, `factOptions`, `conditionRoll`, `conditionDamageHandling`, `conditionCastProblems`) rather than adding conditions to `ruleSources`, so a condition is never counted twice; `advantage.mjs advantageSources` delegates to it. The Crash element (`costReduction` 0) also keeps the "more than one Molding" allowance tied to it, as before. The cast reasons name the blocked components (`{components}`).
  - Keys added: `noAdvantage`, `costReduction`; fields `endsOnUse`, `damageHandling.resistAll`. `damagePlan` reads `conditionDamageHandling(target)`; `cast-checks.mjs` reads `conditionCastProblems`; `cast-plan.mjs` reads `costReductionAllowed`; `roll.mjs` ends whatever `consume` lists.
  - Tests: ADV1, cast-check, Crash and Petrified tests now give real statuses instead of engine flags; `tests/core/conditions-data.test.mjs` +4 (every entry validates; the engines name no condition). Suites: 545 and 159 pass.
