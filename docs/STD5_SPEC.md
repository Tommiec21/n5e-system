# STD5 function spec: in-game review

Status: **King 2026-11-15: "Build out the next 3 batches" (STD4, STD5, STD6a). Built and published `0.45.0-alpha.1`.**

Plan: `docs/STD_SPEC.md`, "Reviewable in game".

| # | Function | Behaviour |
| --- | --- | --- |
| R1 | Generated summaries | `rules/action-effects.mjs summarizeElement` (every key; triggers as "When …:", action-bound elements marked); `rules/automation-summary.mjs automationOf(item)`: channels (activities, effects and their changes, rule elements, action effects, triggers, reaction recipe, riders), notes, status (automated, partial, note, none) and `mentions` (text names a mechanic, nothing authored). |
| R2 | Automation tab | Every item sheet: a table of kind, source and plain line, with the status. |
| R3 | Notes tab | Every item sheet: the item's `note` elements (King Q-STD6: what stays at the table, apart from the item's text). |
| R4 | Effect editor | The rule-element help lists every key and field with examples; an "Apply to the action" box sets `flags.n5e.applyTo`. Validation is STD1's. |
| R5 | GM Automation Audit | Token-controls button (GM) and `game.n5e.api.automationAudit()`: world items or one N5e compendium, filtered by status or "text names mechanics", counts per status, click to open. |
| R6 | Card breakdowns | Already name every source: modifiers and advantage sources (each element's label), automatic results, rerolls and notes (STD1), damage handling (STD2). No change. |

## Progress log

- 2026-11-15 Claude: built and published `0.45.0-alpha.1`. Readings: the audit shows up to 500 rows per filter; the predicate builder is the documented syntax in the editor help (a click-to-build editor is left for later). Tests: `tests/core/automation-summary.test.mjs` +2. Suites: 552 and 162 pass.
