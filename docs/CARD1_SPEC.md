# CARD1 function spec: single action card

Status: **approved by King 2026-11-14 ("Approved"; `actionCard` default = the new card, as proposed). CARD1a published `0.27.0-alpha.1`; CARD1b published `0.27.0-alpha.2`; CARD1c next (needs King's go-ahead).**

Plan row 10b (King 2026-11-13). One chat card per attack, jutsu or feature. Its sections fill in as buttons are pressed, SW5e style:
- attack, with hit or miss per target;
- area placement and covered targets;
- per-target saves, each rolled by the target's owner;
- damage, with per-target Apply and Undo;
- conditions and effects;
- reactions, Will of Fire and concentration.

Old chat cards stay as they are.

## What exists today, and what CARD1 reuses

Today one action produces several cards:
- `postCastCard` posts the cast card, and `attackWithWeapon` / `strikeAttack` the attack card.
- Each button posts its own roll message.
- `apply-damage.mjs` posts a summary card with Undo.
- RES1 draws per-target rows on damage cards from linked rolls (`flags.n5e.roll.source`), and CLASH1 does the same for its card.

CARD1 adds no new rules. It gathers these into one card and calls the existing functions:

| Section | Existing function it calls |
| --- | --- |
| Header, cost spent, rules text | `castPlan`, `postCastCard` content (cast); `weaponAttackSpec` (attack); `useFeature` (feature) |
| Attack | `rollWithSpec` with `source` = the card; `targetOutcomes` (RES1) for hit/miss against AC |
| Area | `placeArea`, `areaOf`; the targets the template covers |
| Saves | `rollWithSpec` per target by its owner; save tiers from `rules/degree.mjs` and `targetOutcomes` |
| Damage | the existing damage roll; `applyToSelected` per target; existing Undo snapshot |
| Conditions/effects | existing "Apply <condition>" and effect buttons (`effect-application.mjs`), per target |
| Reactions | `openReactionWindow` / `chooseReaction`; the result is shown in this section |
| Will of Fire | the existing reroll on d20 rolls (`dice/roll.mjs`, `data-n5e-wof`) |
| Concentration | `concentrationOnDamage` check button; the dependent-effect link (CONC1) |

Parity (OPS1, Section 7) is unchanged:
- Each user rolls and applies only for creatures they own, and the GM does it for NPCs.
- Players see attack results and DCs only as `attackRollVisibility` and `challengeVisibility` allow.
- There is no approval dialog anywhere.

## Card data

`flags.n5e.card` (version 1), written by the card's author:

- `kind`: `jutsu | attack | feature`; `actorUuid`, `itemUuid`; `castId`; and for jutsu, `rank` and `discipline` as cast.
- `targets`: `[{uuid, name, img}]`, the Foundry targets when the card was posted. Area targets are added when the template is placed.
- `sections`: the ordered sections this action has, from `cardSections`. Each section is `{key, state: "waiting" | "ready" | "done"}`.
- `applied`: `{[targetUuid]: {damage?: undoSnapshot, effects?: [effectUuid]}}`, for per-target Undo. Undo restores HP and CP and removes the conditions and effects applied from the card (Q-CD4).
- `results`: `{[section]: {[targetUuid]: result}}`, written by the author or by the GM from a `cardResult` intent.

Results rolled by another user, such as a target owner's save or an NPC's reaction (Q-CD1 = A, owner intent):
- The rolling user's client submits a new owner intent, `cardResult`, on the actor they own (`automation/owner-intents.mjs`), carrying `{messageId, section, targetUuid, result}`.
- The active GM's client validates it: the user must own the target, the section must exist, and each target can record its result only once. The GM then writes the result into `flags.n5e.card.results`.
- No dialog is shown at any point.
- **No GM connected:** the result posts as a separate small card linked to the action card (`flags.n5e.roll.source`). The action card shows these linked results until a GM connects. The GM's client then copies them into the card once.

## Functions

After each function, add a line to the progress log and push.

### CARD1a: structure, attack and damage (first release)

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| A1 | `cardSections(action)` | `rules/action-card.mjs` (new, pure, shared core) | From the cast plan / attack spec / feature activities: which sections the card has, in fixed order (attack, area, saves, damage, effects, reactions, concentration). |
| A2 | `targetRows(card, linked)` | same | Per target: hit/miss/crit against AC, save tier, damage share, applied or not. Built on `targetOutcomes` (RES1). Hides AC and DC per the visibility rules for non-GM viewers. |
| A3 | `sectionState(card, linked)` | same | Waiting, ready or done for each section, so buttons appear in order: for example, damage is ready once the attack is rolled. |
| A4 | `postActionCard(actor, action)` | `workflow/action-card.mjs` (new) | Posts the one card for jutsu casts, weapon attacks and strikes, and feature uses, all in CARD1a (Q-CD2). The world setting `actionCard` (Q-CD3) chooses between this card and the old cards; existing messages render as they are. |
| A4b | `cardResult` intent | `automation/owner-intents.mjs` | New intent type: validation (owner of the target, section exists, one result per target) and the GM handler that writes into the card. When no GM is active, falls back to a linked result card (Q-CD1). |
| A5 | `renderActionCard(message, html)` + refresh hook | same | Draws the sections and per-target rows from the card data and its linked results. Re-renders when a linked roll or result arrives (the RES1/CLASH1 pattern). |
| A6 | Attack and damage buttons | same | Roll the attack and the damage into the card. Per-target Apply / Apply half / Undo use `applyToSelected` and the existing undo snapshot. |

### CARD1b: areas, saves, conditions

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| B1 | Area section | `workflow/action-card.mjs` | Place the template from the card. The covered tokens become the card's targets. |
| B2 | Save section | same | One row per target with **Roll save**, which only that target's owner (GM for NPCs) can press. The tier comes from `rules/degree.mjs`; Heightened gives the first save disadvantage, as today. |
| B3 | Effects section | same | Per-target **Apply** for conditions and effects from the jutsu text and the save result (owner or GM only), with Undo. |

### CARD1c: reactions, Will of Fire, concentration, undo

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| C1 | Reactions section | same | Reaction windows opened by this action (Deflection, Uncanny Dodge, successful-hit reactions) show their decision and result in the card. |
| C2 | Will of Fire | same | Rerolls happen inside the section that holds the d20 roll; the card updates the row. |
| C3 | Concentration section | same | Concentration started by this cast; the damage check button for targets who took damage; effects that end with it. |
| C4 | Undo | same | Per-target Undo restores HP and CP and removes the conditions and effects applied from the card (Q-CD4). |

## Tests

`tests/core/action-card.test.mjs` (core-only):
- sections for each kind of action;
- section order and state progression;
- per-target rows for hit, miss and crit;
- each save tier;
- half and none damage;
- AC and DC hidden under each visibility setting.

## King's answers (2026-11-14)

- **Q-CD1:** owner intent (A). The GM writes other users' results into the card; with no GM connected, they post as a separate linked card.
- **Q-CD2:** all three (jutsu casts, weapon attacks and strikes, feature uses) in CARD1a.
- **Q-CD3:** a world setting chooses the new card or the old cards.
- **Q-CD4:** Undo restores damage and also removes the conditions and effects applied from the card.

Still to confirm with the approval: the `actionCard` setting's default. Proposed default: the new card.

## Progress log

- 2026-11-14 Claude: spec written; awaiting King's approval and answers to Q-CD1–Q-CD4.
- 2026-11-14 Claude: King answered Q-CD1 (A), Q-CD2 (all three), Q-CD3 (world setting) and Q-CD4 (damage and effects); the spec is updated. Awaiting approval to build.
- 2026-11-14 Claude: **Approved; building CARD1a.**
  - **Design for CARD1a:** a layer over the existing handlers, which stay the source of truth for rolls, Dice So Nice, roll modes and Will of Fire.
    - The action card is the cast card, the feature card, or (weapon attacks and strikes) the attack roll itself, with `flags.n5e.card` added.
    - Rolls made from its buttons stay linked messages (`roll.source`, `damage.originUuid`, and `damageApplication.sourceUuid` → damage → card).
    - The author records them in the card; other users go through the GM (`cardResult`). Recorded linked messages collapse to one line.
- 2026-11-14 Claude: **A1–A3 done.**
  - New pure `rules/action-card.mjs` (shared core):
    - `cardSections`, `resultsFromLinked`, `addCardResult` (attack and damage once per card; saves and applications once per target; an undone application can be replaced);
    - `mergedResults` (display fallback with no GM);
    - `cardTargetRows` (hidden hit/miss stays hidden, and so does its suggested share);
    - `sectionStates`.
  - Small fix in `workflow/apply-damage.mjs` `onApplyClick`: the damage message's uuid now travels as `rollTrace.sourceUuid`. Before, only the coordinated path set it, so "View damage roll" on ordinary apply cards had nothing to open.
  - Next: A4 (setting, card flags at the three entry points), A4b (`cardResult` intent).
- 2026-11-14 Claude: **A4 done.**
  - New world rule `actionCard` (casting group, default on).
  - New `workflow/action-card.mjs`, with `cardFlag()`: card data, or undefined when the setting is off.
  - **Card flags added at the entry points:**
    - `postCastCard` (kind jutsu: area from `areaOf`, concentration from the plan, rank, cast discipline);
    - `postItemCard` (kind feature, when the item has activities);
    - `attackWithWeapon` and `strikeAttack` (kind attack: the attack roll message is the card, through a new `card` option on `rollWithSpec`).
  - With the setting off, the flags and content are unchanged. Next: A4b `cardResult` intent.
- 2026-11-14 Claude: **A4b done.**
  - New owner intent `cardResult` (`{cardMessageId, linkedMessageId, undoneTarget}`), validated in `owner-intents.mjs`.
  - **`workflow/action-card.mjs` additions:**
    - `cardOfLinked`: roll source, damage origin, or application → damage → card.
    - `recordLinked`: the author or a GM writes directly; anyone else submits the intent. With no GM, the result stays a separate linked card.
    - `receiveCardResult`, the GM handler. It checks the linked message itself: its author is the requesting user, it links to this card, and per-target entries are only for creatures that user may change.
    - `syncCards`: the GM records results that arrived while no GM was connected.
  - **Undo** is read from the application summary (`flags.n5e.undone`, set by its author). It holds without a GM, and Undo can't be pressed twice.
  - Next: A5 render + refresh, A6 buttons.
- 2026-11-14 Claude: **A5 + A6 done.**
  - **`renderActionCard`:**
    - section chips (waiting/ready/done);
    - per-target rows: AC, hit/miss and save, as visibility allows; the suggested share only for creatures the viewer may change;
    - Apply / Half (the suggestion highlighted) or "Applied" + Undo;
    - a note when results are still separate cards waiting for a GM.
  - Linked messages recorded in a card collapse to one line ("Shown on the X card", Show/Hide).
  - **Hooks:**
    - the creator records new linked messages, and every client re-draws the card;
    - a card update re-draws its linked messages;
    - an undone application is recorded by its author;
    - the GM syncs on ready;
    - the `cardResult` handler is registered.
  - **`onActionCardClick`:** Apply/Half go through the damage card's own `onApplyClick` (fixed target, coordinated damage and reactions unchanged). Undo goes through the summary's Undo, by its author or a GM.
  - The summary's Undo now marks the summary `flags.n5e.undone`.
  - CSS in `styles/n5e.css`; `dice/roll.mjs` loads the module with RES1 and CLASH1 and binds the buttons.
  - Next: tests.
- 2026-11-14 Claude: **Tests done.**
  - New `tests/core/action-card.test.mjs` (6 tests) and `tests/action-card.test.mjs` (3 tests).
  - First attempt passed: full suite 374 passed, 2 skipped; core 52/52. Lint and check pass.
  - Release 0.27.0-alpha.1.

## Final results (CARD1a)

Published `v0.27.0-alpha.1`. A1–A6 and A4b were built as specified, plus two small fixes: the damage source travels with applications, and Undo marks its summary.
- **Limits.**
  - The card's targets are the Foundry targets when the card was posted (the attack's own snapshot adds to them). Area targets come in CARD1b.
  - Undo from the card restores everything on that summary. Applying from the card is always one target, but a summary made with the old "apply to selected tokens" can hold several.
  - Not tested in Foundry (no live testing); behaviour follows the existing Apply and Undo paths.
- 2026-11-14 Claude: **CARD1b approved by King ("Yes"); B1–B3 done.**
  - **Rules (`rules/action-card.mjs`):**
    - `mergeTargets`;
    - effect summaries (`flags.n5e.cardEffects`) become an `effects` section, a list per target that can be marked undone;
    - rows gain `saved`, `saveFailed`, effect labels and `canSeeSave` (challengeVisibility);
    - area and effects section states.
  - **B1:** `onAreaClick` adds the covered tokens to the card's targets (`addAreaTargets`, author or GM) and marks the area done.
  - **B2:** per-target "Roll X save" for the target's owner (GM for NPCs). It runs the card's own save button for that one creature, so stimuli immunity, condition resistance and Heightened work as before. Heightened's disadvantage is dropped once any save is recorded.
  - **B3:**
    - per-target "Apply <condition>" on a failed save, for the target's owner or GM; a resave is remembered as on the save card;
    - per-target "Apply <effect>" for target effects, for the caster's owner, only for effects with no cost, use limit or activation, since one click per creature mustn't charge again;
    - each application posts a small linked summary that the card records.
  - **Undo** now covers damage plus the conditions/effects applied from the card (Q-CD4), each by the user who applied it or the GM.
  - Next: tests.
- 2026-11-14 Claude: **CARD1b tests done.**
  - Added 3 core tests and 1 intent test. First attempt passed: full suite 378 passed, 2 skipped; core 55/55. Lint and check pass.
  - Release 0.27.0-alpha.2.

## Final results (CARD1b)

Published `v0.27.0-alpha.2`. B1–B3 were built as specified, and Undo now covers effects (Q-CD4).
- **Limits.**
  - One save per creature per card: a jutsu with two different save activities records only the first save each creature rolls.
  - An effect applied to a creature the caster's user doesn't own goes out as the existing offer card and isn't recorded on the action card.
  - A player who may apply a condition to their own creature can infer a failed save from the Apply button, even when DCs are hidden. dnd5e's save cards behave the same way.
  - Not tested in Foundry (no live testing).
- 2026-11-14 Claude: **CARD1c approved by King ("Yes"); C1–C3 done. C4 (Undo of damage and effects) already shipped in CARD1b.**
  - **Rules:**
    - a reactions section wherever there is damage;
    - Will of Fire rerolls (`roll.rerollOf`) replace the attack or save they reroll;
    - applied results carry the damage reaction (label, rolled reduction, multiplier) and the concentration check (DC and jutsu);
    - reactions and concentration section states.
  - **C1:**
    - each row shows the reaction a creature took against the damage, from the application trace;
    - the card has "Successful hit: reactions", which goes through the attack roll's own button, except on weapon-attack cards, where the roll already has it.
  - **C2:**
    - Will of Fire "reroll" / "keep higher" on the card for the attack (caster's owner) and on each save (that creature's owner);
    - `spendWillOfFire` marks `rerollOf`, and a reroll of a weapon-attack card links back to it.
  - **C3:**
    - the card says whether the caster still concentrates on the jutsu;
    - rows offer the concentration check the damage called for (that creature's owner), through the damage summary's own button;
    - `applyToSelected` records the check in its trace.
  - Next: tests.
