# SKILL1 function spec: executable skill actions

Status: **in progress (continuing the plan after ENV1a, 2026-11-14).** Release target `0.22.0-alpha.1`.

Plan row 15: executable skill actions (Grapple, Shove, Hide/Search, Stabilize...).

Rules (KB 02, Chapter 6):
- **Contests:** both roll; the higher total wins; a tie leaves the situation unchanged.
- **Passive checks:** 10 + the check's modifiers (+5 with advantage, -5 with disadvantage); the check meets or beats it.
- The action table (`CONFIG.N5E.skillActions`, 71 actions) already gives each action's skill, tier and `vs`.

## Functions

After each function, add a line to the progress log and push.

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | `parseVs`, `passiveScore`, `fixedDC`, `contestOutcome`, `checkOutcome`, `SKILL_RESULTS`, `skillActionEffects` | `rules/skill-resolution.mjs` (new, pure) | Reads the `vs` forms. Success effects: Trip → Prone; Grapple → Grappled (Restrained when beating by 10 with 1+ Mastery); Pin → Restrained; Takedown → Prone; Choke → Suffocating; notes for Muffle, Disarm, Blend In, Feint. |
| F2 | `resolveSkillAction(actor, key, message, targets)` | `workflow/skill-actions.mjs` (new), called by `rollD20` for skill actions | With one target: `passive:` compares to the target's passive score at once; `fixed:` to its DC (`8+level` / `12+level` use the target's level); `contest:` whispers the target's owners a card with a button per listed skill. |
| F3 | `onContestClick`, outcome card, `onSkillApplyClick` | same | The defender's roll is compared with the stored total. The outcome card shows the result and margin, and an **Apply <status> to <target>** button for the target's owner or the GM. |

## Not automated (stays a manual roll with the action's text)

- `dc:<ability>`, for example Shove "vs the target's Strength DC" and Request "vs the target's Wisdom DC": the book never defines a creature's ability DC (Q-S1).
- Jutsu DCs (Read the Enemy, Identify): they need the jutsu being read (CLASH1/GEN1).
- Saves, scores and GM tables.
- Hide and Search: Hidden and Undetected are relational states (GEN1).
- Stabilize: covered by the existing death-save tools.

## Questions for King

- **Q-S1. Ability DC.** Shove is "Athletics vs the target's Strength DC" and Request is "vs the target's Wisdom DC". The book doesn't define a creature's ability DC. Should it be 8 + proficiency + that ability's modifier, the passive ability check (10 + modifier), or something else?

## Progress log

- 2026-11-14 Claude: **F1–F3 done.**
  - New `rules/skill-resolution.mjs` and `workflow/skill-actions.mjs`.
  - `rollD20` calls `resolveSkillAction` after a skill-action roll.
  - The `[data-n5e-contest]` and `[data-n5e-skill-apply]` buttons are bound in `onRenderChatMessage`.
  - Every `SKILL_RESULTS` key exists in `CONFIG.N5E.skillActions`. Suite green (350).
  - Next: tests (`tests/skill-actions.test.mjs`), then release.
