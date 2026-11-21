# AMP1e function spec: typeless self-buff states

Status: **spec written 2026-11-20 from King's answers to Q-E1–Q-E4. King: "Build" (2026-11-20). Built and released in 0.69.0-alpha.1.** Part of AMP1 (`docs/AMP1_SPEC.md`); follows AMP1g (0.68.0-alpha.1). Codex's Journal Desk files are not touched.

## King's answers (2026-11-20)

- **Q-E1 Stances:** stances stay stances (their own item type, one active at a time, level effects inside the item). They do **not** become Amp cards. The Amp audit labels them **"Stance"**, nothing more.
- **Q-E2 Feral and Well Rested:** stay **Clan** Amp cards, as AMP1d built them. No change.
- **Q-E3 DYNAMIC FORM! and Flawless:** become Amp cards with no type, and they **do not count toward Rule of 3's**.
- **Q-E4 Coordinated:** a **condition**, not an Amp, even though the Nara boxes print "Will Amp" and "Social Amp". This is the exception to the rule.

## What gets built

### 1. Stances in the Amp audit
- `rules/amp-audit.mjs`: a stance gets its own status, **stance**, instead of **candidate**. The reason text is "Stance" (the old "King Q-A4: stances become Amps with no type" goes away).
- The Automation Audit's Amps view shows them in a **Stance** group with no set-type control and no "Not an Amp" button.
- The generated report (`docs/generated/std-audit.md`) counts stances on their own line and no longer lists them as candidates.
- Both the 24 Stances-pack items and the clan stances (Gentle Fist, Swarm Chakra, Four-Legs and the rest) are covered, since both are item type `stance`.

### 2. Amps outside the limits
- A new Amp card field, **Outside the Amp limits** (`system.outsideLimits`, default off), shown on the card sheet.
- `ampLimitConflict` skips a card with this on: it never triggers Rule of 3's, is never offered in its keep dialog, and isn't switched off by it. (Typeless cards already have no Singleton type.)
- The Amps panel marks such a card "Doesn't count toward Rule of 3's".

### 3. DYNAMIC FORM! card (typeless, outside the limits)
- Owner: Never Ending Combo (Taijutsu Specialist, Passionate). Starts when you cast a Taijutsu with the Combo keyword.
- **Ends when:** you cast a Taijutsu with the Finisher keyword, or initiative ends. Adds a new ending trigger, **finisherCast** ("Casting a Finisher"), next to the existing ones.
- Tempo stays on the Tempo pool with its current buttons (Gain Tempo, Spend Tempo). The bonuses that depend on how much Tempo you have stay with the pool, because a card's effects can't change with a pool's count. The card's text lists them.
- The existing "Enter DYNAMIC FORM!" activity is repointed at the card (`{amp: key}`), like the AMP1c buttons.

### 4. Flawless card (typeless, outside the limits)
- Owner: Genius Talent (Taijutsu Specialist, Talented Genius). Starts on initiative (`startOnInitiative`); ends at the end of combat (`combatEnd`).
- Perfection stays on its pool; the Flawless abilities (Disturbance, Focus, Technique, Execution, Balance, Guard, Clash, Stances, Power) keep their buttons and are only available while the Flawless card is active, as now.
- The existing "Become Flawless" activity is repointed at the card.
- If either feature has level-based growth, versions follow AMP1g ("[Name] (level)").

### 5. Coordinated condition cards (the exception)
- Two condition cards in the `conditions` pack, registered like the other clan conditions: **Combat Coordinated** and **Diplomatic Coordinated**.
- Given by Team Coordination (Nara, 7th): all allies get **Combat Coordinated** when initiative is rolled, until initiative ends; **Diplomatic Coordinated** when a social encounter starts, for the rest of it.
- **Combat Coordinated:** Mastery ranks to initiative (1, 2 at 7th, 3 at 15th); a note and button for Team Coordination (take or give a place in initiative with another Combat Coordinated creature); a reaction button for Coordinated Support (make the check or save for another Combat Coordinated creature with your statistics).
- **Diplomatic Coordinated:** Mastery ranks (same scaling) to one of Deception, Persuasion or Intimidation, picked when applied; advantage on Insight against a creature tied to your background, as a note.
- The Amp audit stops listing the Nara boxes as Amp candidates (they're conditions now).

### 6. Tests and docs
- Tests: stance status and label; `outsideLimits` skipped by Rule of 3's; `finisherCast` ending; DYNAMIC FORM! and Flawless start and end; the two Coordinated cards apply, scale and end.
- `DATA_REFERENCE.md` (the new card field and ending), `DEV_PLAN.md`, `AMP1_SPEC.md` progress log, `CHANGELOG.md`, `CODEX_CONTEXT.md`.
- Release: **0.69.0-alpha.1**.

## Answered

- **Q-E5 (King 2026-11-20):** a feature's level is **always the character level** of the character who has the feature, never a clan or class level. Coordinated's ranks (1, 2 at 7th, 3 at 15th) use the Nara's character level, fixed when the condition is applied.

## Progress log

- 2026-11-20 King: Q-E1 (b) stances labelled "Stance" in the audit; Q-E2 Feral and Well Rested stay Clan; Q-E3 DYNAMIC FORM! and Flawless become typeless cards outside Rule of 3's; Q-E4 Coordinated is a condition, the exception. Claude: spec written; waiting for approval.
- 2026-11-20 King: Q-E5, a feature's level is always the character level of the character who has it. Claude: Coordinated scales by the Nara's character level.
- 2026-11-20 King: "Build". Claude: AMP1e built (0.69.0-alpha.1). Differences from the plan: the Combat Coordinated Amp cards made in AMP1d/AMP1g (3 cards) were removed, since Coordinated is now a condition; the initiative swap and Coordinated Support are notes on the condition card (a condition has no buttons); casting a Finisher always ends DYNAMIC FORM! (it is the state's duration, not a hostile condition), whatever the "Amps that end on a condition" setting says. New general pieces: condition-card choices in chat, lvl() in a condition card read from the applier, Mastery "Source ×N", flags.n5e.notAmp for the audit.
