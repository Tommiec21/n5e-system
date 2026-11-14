# CARD1 function spec: single action card

Status: **approved by King 2026-11-14 ("Approved"; `actionCard` default = the new card, as proposed). Building CARD1a.**

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
