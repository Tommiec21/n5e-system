# ENG1 function spec: the missing capabilities

Status: **King 2026-11-15: "Building the missing capabilities is the next correct step. Do that immediately." ENG1a published 0.50.0-alpha.1; ENG1b 0.51.0-alpha.1; ENG1c 0.52.0-alpha.1.**

Why: the STD6d class review left most class features as notes, but not because they are judgment calls. A handful of general capabilities was missing, and the same ones recur across classes, clans and jutsu. Each is built once, generically, as data the effects use (no class or feature named in code). Then the reviewed classes are redone and the class pass continues with the fuller toolkit (`docs/STD6d_SPEC.md`).

## Batches

| # | Capability | Data | Unlocks (examples) |
| --- | --- | --- | --- |
| ENG1a | **Effects that act each turn** | Trigger elements on an effect: `heal {formula, pool, who}` (applied at once), `damage {formula, damageType, who, unreducible}` (a damage card for the GM, like condition damage), `resave {ability, dc}` (the owner rolls; a success ends the effect) | Life Pulse, Hemorrhage Vitality, Mending Spark, Overheat and Burnout self-damage |
| ENG1a | **Caster numbers kept on the effect** | In an effect activity's elements, `@scale.<class>.<column>`, `@dc.<discipline>` and `@level` are the caster's, fixed when applied | Mending Spark's Channeled Healing, Hemorrhage Vitality's save DC |
| ENG1a | **Formulas that read the target** | `@target.ranks.<condition>`, `@target.state.<state>` in damage formulas (the one target) | Septic Detonation (1d12 per rank of Envenomed) |
| ENG1a | **Marks** | Effect activity `limit` (a number or `lvl(...)`): at most that many from one caster; the oldest ends | Curse of the Reaper (1, 2 at 18th), Vital Thread, Transfiguration |
| ENG1b | **Moldings that change the jutsu** | Action-effect elements on the cast: range, area size, an extra target, no hand seals, excluded creatures | Distant, Widened, Doubled, Subtle, Careful; Dragwind |
| ENG1c | **Reactions that protect others** (the planned reactions batch) | Reaction recipes offered to the ally's owner, not only the damaged creature's | Vitality Guard, Counter Seal, Interpose, Grit |
| ENG1d | **Auras and zones** (AURA1) | Effects that apply to creatures within a radius of a token, and to creatures that enter | Black Lotus Bloom, Pressure Stagnation, Storm Zone |
| ENG1e | **Redo the reviewed classes** | Move Medical-Nin and Ninjutsu Specialist notes onto the new capabilities | — |

Each batch: spec section here, build, tests, release, log. King said to build them immediately, so the ENG1b–ENG1e specs are written as each starts and built without a separate approval; anything unclear is asked, not invented.

## ENG1a (0.50.0-alpha.1)

- `rules/elements.mjs`: new keys `heal`, `resave`; `damage` with `on` is a trigger outcome.
- `rules/triggers.mjs triggerOutcomes`: damage, heal, resave (with the effect that carries it).
- `workflow/triggers.mjs fireTriggers`: heals at once; posts damage cards (fixed target; `unreducible` skips DR and resistance); rolls the save and ends the effect on a success.
- `workflow/trackers.mjs applyActivityEffect`: resolves `@scale`, `@dc`, `@level` in element fields; `limit` marks (oldest ends; flags.n5e.mark).
- `rules/target-formula.mjs`: `@target.ranks.<key>`, `@target.state.<key>`; used by card damage rolls.
- **Class data now using them:**
  - **Medical-Nin:** Life Pulse (heals each turn), Hemorrhage Vitality (damage each turn, save to end), Mending Spark (heals each turn), Septic Detonation (a damage button per rank of Envenomed), Curse of the Reaper (one at a time, two at 18th), Vital Thread (one at a time).
  - **Ninjutsu Specialist:** Overheat and Burnout (fire damage to you each turn).
- Also in this release (STD6d answers): Toxic Tongue gives immunity to Envenomed (King Q-D1).

## ENG1b (0.51.0-alpha.1)

- **New action-effect elements:** `areaSize {value | shapes: {sphere, cube, cone, line, cylinder}}` grows the cast's area; `ignoreComponent {component}` removes a component from the cast checks.
- **Where they act:**
  - `rules/elements.mjs castShaping` collects them from the chosen Moldings and options.
  - `workflow/cast-plan.mjs` passes them to `castBlockers(..., {ignore})` and keeps `plan.shaping`.
  - `areaOf(system, {grow})`, `placeArea` and the card's Place area button size the template.
  - `namedActionEffects` (in `rules/cast-options.mjs`) is shared by the plan and the card.
- **Data:**
  - **Widened Ninjutsu:** sphere and cube +5 ft, cone and line (length) +10 ft, cylinder +10 ft radius.
  - **Subtle Ninjutsu:** no hand seals.
  - **Dragwind:** +5/+10/+15 ft by level, now an action effect of its option.
- **Not automated, with notes:** Distant (range isn't enforced anywhere, so +30 ft changes nothing to check), Doubled and Careful (the caster picks the targets), and the alternative Widened choices (a line 5 ft wider, a cylinder 10 ft taller).
- **Question Q-E1:** Widened says a cube's "radius" grows 5 ft. The template's cube size is its side. I add 5 ft to the side. Should it be 10 (5 on each side)?

## ENG1c (0.52.0-alpha.1)

- **Recipe fields:** a damage reaction recipe (`flags.n5e.reaction`) can now carry `ally {range, includeSelf}` (it protects other creatures within range) and `requiresState` (it is only offered while its owner is in that state). The item's reaction editor has both fields.
- **How it's offered:**
  - Before damage is applied in combat, creatures within range of the damaged one are offered their ally reactions (`rules/authored-reactions.mjs allyReactionOffers`; adapter `authored-ally-damage` in `workflow/reaction-adapters.mjs`).
  - The reacting creature's owner is asked. The dispatcher accepts an offer's `reactor`.
  - The damaged creature's damage changes: multiplier and/or rolled reduction.
  - The reactor pays the cost and spends its reaction once the damage is validated (`reactorUpdate`, `workflow/apply-damage.mjs`).
- **Data:** Vitality Guard (Healing Ascension) halves the damage to an ally within 30 ft, for 1 Healing Surge, only in Ascension.
- **Left as buttons, because they don't change the incoming damage:**
  - Counter Seal: it changes a save, and its +2 effect button stays.
  - Grit: it gives temporary HP that outlast the hit.
  - Interpose: it redirects the attack.

## Progress log

- 2026-11-15 Claude: plan written from the STD6d review; ENG1a built and published 0.50.0-alpha.1. Tests: `tests/core/eng1.test.mjs`.
- 2026-11-15 Claude: ENG1b built and published 0.51.0-alpha.1.
- 2026-11-15 Claude: ENG1c built and published 0.52.0-alpha.1.
