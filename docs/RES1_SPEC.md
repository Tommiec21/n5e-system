# RES1 function spec: per-target resolution

Status: **published `0.19.0-alpha.1` (King: "Start again", 2026-11-14, continuing the plan).**

Plan row 11: one damage roll for many targets, automatic per-target save results, hit vs AC per target.

Rules (KB 03 and 04):
- One damage roll covers every target.
- A single attack against several creatures is one roll compared to each AC; each hit counts as its own attack, and target-specific advantage, disadvantage and bonuses don't apply.
- Saves are rolled by each target.

Already in place before RES1:
- Attack cards list each target with Hit / Miss / Critical against its AC (OPS1, `rules/parity.mjs attackTargetRows`, with the `attackRollVisibility` world rule).
- With several targets, no target's facts are used for advantage.
- The save button rolls one save per selected target.
- Apply buttons can already apply to a fixed target (`flags.n5e.damage.targetUuid`).

Missing (what RES1 adds): damage doesn't know which targets were hit or saved, so every Apply is manual on selected tokens.

## Functions

After each function, add a line to the progress log and push.

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | `targetOutcomes({attack, saves})` | `rules/resolution.mjs` (new, pure) | Per target `{uuid, name, outcome, mode}`. Attack: Hit or Critical → `full`, Miss or natural 1 → `none`. Save: failure (or critical failure) → `full`; success → `half` when the save says half on success, else `none` (four-tier: critical success → `none`). A target that was hit and also saved takes the save's mode. Targets with neither stay out. |
| F2 | `rollWithSpec({source})` | `dice/roll.mjs` | Attack and save rolls made from a card's buttons store `flags.n5e.roll.source` (the card's message id). Save rolls also store `onSuccess` (`half` or `none`). |
| F3 | Card buttons pass the source | `workflow/activity-buttons.mjs` | The attack and save buttons pass `source: message.id` and the save's `onSuccess` (new `data-on-success`). |
| F4 | `linkedOutcomes(damageMessage)` | `workflow/resolution.mjs` (new) | Reads the damage card's origin card. Its attack is the origin itself if it is an attack card, else the latest attack roll whose `source` is the origin. Its saves are the latest save per creature with that `source`. Returns `targetOutcomes(...)`. |
| F5 | Per-target rows on the damage card | `workflow/resolution.mjs`, `dice/roll.mjs renderParityParts` | Each viewer sees a row per linked target they may change (the GM sees all): name, outcome, and **Apply** (full or half) or "No damage". |
| F6 | Per-target Apply | `workflow/apply-damage.mjs onApplyClick` | `data-n5e-apply` + `data-target`: applies to that creature through the normal path (coordinated reactions, Undo), the same as a fixed target. |
| F7 | Live refresh | `workflow/resolution.mjs` hook | When a linked attack or save roll is created, damage cards from the same origin re-render, so rows appear as saves come in. |

## Not in RES1

The single combined action card (CARD1) and placing areas from cards.

## Tests

`tests/resolution.test.mjs`: outcomes for hits, misses, crits, natural 1; half / none on success; four-tier; hit plus save; linking from flags (pure part of F4).

## Progress log

- 2026-11-14 Claude: spec written; starting F1.
- 2026-11-14 Claude: **F1 done.** New `rules/resolution.mjs`: `saveMode(degree, {onSuccess, fourTier})`, `targetOutcomes({attack, saves})`, plus `pickLinkedRolls(origin, linked)` (the pure selection step of F4: the origin attack card or the latest linked attack, and the latest save per creature). Next: F2 + F3 (store `source` and `onSuccess` on rolls).
- 2026-11-14 Claude: **F2 + F3 done.** `rollWithSpec({source, onSuccess})` stores `flags.n5e.roll.source`, `.onSuccess` and `.name` (the roller). Card attack and save buttons pass `source: message.id`. Save buttons carry `data-on-success` (from `save.onSuccess`) and pass it. Suite green. Next: F4 + F5 (linked outcomes, rows on the damage card).
- 2026-11-14 Claude: **F4–F7 done.**
  - New `workflow/resolution.mjs`:
    - `linkedOutcomes(damageMessage)` reads the origin card (`originUuid`) and the rolls whose `source` is it, then runs `pickLinkedRolls` and `targetOutcomes`.
    - `renderResolution(message, html)` adds a "Per target" box above the Apply row. Rows show only for creatures the viewer may change; the GM sees all. Each row has Apply / Apply half / No damage.
    - `registerResolutionHooks()`: on `createChatMessage` of a linked roll, re-renders the damage cards from that origin.
  - `dice/roll.mjs`: `registerResolution()` loads the module at startup, so rows draw synchronously in `onRenderChatMessage` before the listeners are bound. `n5e.mjs` calls it.
  - `onApplyClick`: a `data-target` on an Apply button sets `targetUuid`, so the normal fixed-target path runs (coordinated reactions, Undo).
  - Suite green. Next: tests (`tests/resolution.test.mjs`), then release 0.19.0-alpha.1.
- 2026-11-14 Claude: **Tests done.** New `tests/resolution.test.mjs` (5 tests) passed on the first attempt: 342 pass, 2 skipped. Lint and check pass.

## Final results

Published `v0.19.0-alpha.1`. F1–F7 were built as specified; the progress log lists each one.
- **Differs from the spec:** none in behaviour. `pickLinkedRolls` was split out of F4 as a pure function so it is tested in Node.
- **Limits.**
  - Targets with no AC (no automatic hit result) and saves rolled outside the card's button get no row; Apply on selected tokens still works for them.
  - The rows are drawn for damage cards created from now on; older cards have no linked rolls.
