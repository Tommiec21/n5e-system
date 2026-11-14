# CARD1 function spec: single action card

Status: **draft, awaiting King's approval. Nothing is built until King approves this spec and answers Q-CD1–Q-CD4.**

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
- `applied`: `{[targetUuid]: {damage?: undoSnapshot, effects?: [effectUuid]}}`, for per-target Undo.

Results that another user rolls (a target owner's save, an NPC's reaction) are stored as Q-CD1 decides.

## Functions

After each function, add a line to the progress log and push.

### CARD1a: structure, attack and damage (first release)

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| A1 | `cardSections(action)` | `rules/action-card.mjs` (new, pure, shared core) | From the cast plan / attack spec / feature activities: which sections the card has, in fixed order (attack, area, saves, damage, effects, reactions, concentration). |
| A2 | `targetRows(card, linked)` | same | Per target: hit/miss/crit against AC, save tier, damage share, applied or not. Built on `targetOutcomes` (RES1). Hides AC and DC per the visibility rules for non-GM viewers. |
| A3 | `sectionState(card, linked)` | same | Waiting, ready or done for each section, so buttons appear in order: for example, damage is ready once the attack is rolled. |
| A4 | `postActionCard(actor, action)` | `workflow/action-card.mjs` (new) | Posts the one card for a jutsu cast, weapon attack/strike or feature use (Q-CD2 decides which in CARD1a). |
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
| C4 | Undo | same | Per-target Undo covers what Q-CD4 decides. |

## Tests

`tests/core/action-card.test.mjs` (core-only):
- sections for each kind of action;
- section order and state progression;
- per-target rows for hit, miss and crit;
- each save tier;
- half and none damage;
- AC and DC hidden under each visibility setting.

## Questions for King

- **Q-CD1: where results rolled by another user are stored.** Examples are a target's owner rolling a save, or the GM's NPC reacting.
  - **(A) Owner intent, as the plan row says.** The other user's client sends the result to the GM's client through an owner intent, and the GM writes it into the card. With no GM connected, the result posts as a separate card.
  - **(B) Linked roll messages, as RES1 and CLASH1 do now.** Each user's roll is its own small message tied to the card, which reads them and fills in its rows. This works the same with or without a GM. The linked messages can be shown collapsed in the log ("Save for *Fireball* — see card").
- **Q-CD2: which actions use the new card in CARD1a.** All three (jutsu casts, weapon attacks and strikes, feature uses), or jutsu casts first with the others in CARD1b?
- **Q-CD3: the old cards.** Once CARD1 ships, do new actions always post the new card, with old messages still rendering as they are? Or is there a world setting to keep posting the old cards?
- **Q-CD4: what Undo restores.** Damage and healing only, as today, or also conditions and effects applied from the card?

## Progress log

- 2026-11-14 Claude: spec written; awaiting King's approval and answers to Q-CD1–Q-CD4.
