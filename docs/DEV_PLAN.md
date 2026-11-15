# Development plan: unfinished work from shipped batches

Status: **FIN1 published `0.29.0-alpha.1` (King: "Start next batch"), without the parts Q-F1–Q-F3 decide. FIN2–FIN4 get their own specs.**

King (2026-11-14): assume the duplicate-item and missing-Kunai bugs can't be reproduced; finalize item transfers; organize every unfinished task from other batches and start a development plan.

Every leftover from a shipped batch has one home below: a FIN batch (before standardization), a STD batch, Tier 3, or blocked on King.

## Order

| # | Batch | Contents | State |
| --- | --- | --- | --- |
| 1 | **FIN1** item transfer and item integrity | Item transfer between actors (OPS1); the duplicate-item and missing-Kunai bugs handled without reproduction (OPS1c, R2, R3) | spec below; awaiting approval and Q-F1–Q-F3 |
| 2 | **FIN2** combat actions | Disarm and Trip in place of an attack (ATK1); Grapple and Shove size limits, "while grappling" prerequisites, Escape (SKILL1); Identify Genjutsu, Read the Enemy, Chakra Suppression, Counter Tags (MDISC1, GEN1) | spec to write |
| 3 | **FIN3** card and resolution limits | Two different saves on one jutsu; effects on creatures the caster doesn't own recorded on the card; GM reaction prompts linked to the card (CARD1). Stimulus-immune creatures dropped from damage rows (GEN1). Clash: upcast rank of a concentrated jutsu, auto-win buttons, Arts (S-Rank + 1), dispelling the loser's jutsu (CLASH1) | spec `docs/FIN3_SPEC.md` written 2026-11-14; **complete**: FIN3a 0.33.0-alpha.2, FIN3b 0.33.0-alpha.3 (Arts post-launch) |
| 4 | **FIN4** rules corrections | A choke sets Unconscious, not Dying (ENV1). "Can see you" from token vision instead of "not Blinded"; reach measured edge to edge (POS1). Out-of-combat breath; Indirect Exposure checks (ENV1). (Pierce item dropped: King 2026-11-15, Pierce is a universal counter to DR.) | spec `docs/FIN4_SPEC.md`; King answered Q-F14–Q-F18; **complete**: FIN4a 0.33.0-alpha.4, FIN4b 0.33.0-alpha.5, FIN4c 0.33.0-alpha.6 |
| 4b | **FIN5** King's answers to Q-F1–Q-F7 (ryo transfer, size rule for more actions, full weapon damage); ROLL2 closed with no change (King 2026-11-15) | **published 0.33.0-alpha.7** (`docs/FIN5_SPEC.md`) |
| 4c | **PRESTD1** one combined batch before standardization (King 2026-11-15): VAR1a optional-rule settings, SCROLL1 jutsu scrolls, LOOT1 loot piles, merchants and party stash (buying, King Q-F2), PF2E1 wands, flanking, hazards, vehicles and crafting, MISSION1 missions, SOCIAL1 social encounters | spec `docs/PRESTD1_SPEC.md` written 2026-11-15; approved 2026-11-15; **A-i 0.34.0-alpha.1, A-ii 0.34.0-alpha.2, A-iii/iv 0.34.0-alpha.3, B scrolls 0.35.0-alpha.1, C loot 0.36.0-alpha.1, D-i wands, flanking, crafting 0.37.0-alpha.1, D-ii hazards, vehicles 0.37.0-alpha.2, E missions 0.38.0-alpha.1, F social encounters 0.39.0-alpha.1; A14 0.41.0-alpha.1; complete** (A14 waits on Q-P12) |
| 4d | **NPCUI1** NPC sheet redesign (King 2026-11-15: "Design a better NPC Sheet") | spec `docs/NPCUI1_SPEC.md`; design canvas "N5e NPC Sheet Redesign"; King: "Deploy this"; **published 0.40.0-alpha.1** |
| 5 | STD0–STD7 | As `docs/STD_SPEC.md` | **STD0–STD2 published 0.42.0-alpha.1; STD3 0.43.0-alpha.1; STD4 0.44.0-alpha.1; STD5 0.45.0-alpha.1; STD6a 0.46.0-alpha.1; STD6b 0.47.0-alpha.1; STD6d Medical-Nin 0.48.0-alpha.1, Ninjutsu Specialist 0.49.0-alpha.1; ENG1a 0.50.0-alpha.1**; ENG1b–e (`docs/ENG1_SPEC.md`: Moldings that change the jutsu, reactions for others, auras, redo the two classes), then STD6d (the other five classes), STD6e, STD6f, then STD6c (feats, moved to the end by King; waits for the final feat list), STD7 |
| 6 | Tier 3 | As the plan table | later |

## Leftovers moved into later batches

| Leftover | From | Goes to |
| --- | --- | --- |
| Eight Gates (Gate 2 Hit Dice, the special action, Gate 8 crits on 16+, class and Gate bonuses not stacking, Exhaustion loss per 10 minutes) | 0.7.0 | STD6c Feats |
| Unarmed crits tripling; Taijutsu area and range increases | 0.7.0 | STD6b Stances / STD6d Classes |
| Repeated Exposure 2 per long rest | 0.7.0 | STD3 conditions as data |
| Free choices that are still text ("one exotic weapon") | DATA1 | STD6d Classes / STD6e Clans |
| Movement tracked as part of the turn (Surprised: no move) | POS1 | Tier 3 table procedures |
| Target-side reaction features (Staggering Will, Phantom Avoidance, Transverse Defense, Clone Tactics, Who Decided That!?) | CARD1d | Reactions batch, after STD4 |
| `bloodiedVisibility` setting | OPS1 | Tier 3 |

## Post-launch

- Arts (S-Rank + 1) in Clash, with class mods (King Q-F9, 2026-11-14).

## Decided

- Clash best of 3 with no side reaching two wins is a Draw (King 2026-11-15: approved).
- RES1, POS1 and SKILL1 rulings approved as built (King 2026-11-15).
- ENV1a kept as built (King 2026-11-15, option 1): turn-start exposure cards with a save button, damage applied by click; the breath count runs on its own.
- NPC readings approved as built (King 2026-11-15): Lurker speed on every speed, one Read the Enemy pick per success, concept field, 2 full saves at 1–7, Lazy GM tables as printed, Strikes set when built, the NPC3 table readings.

## Blocked on King

- NPC in-depth pass: the Bingo Book.
- Merchants and buying (King Q-F2): LOOT1.
- The final feat list (STD6c); the clan stance recategorization.

---

## FIN1 spec: item transfer and item integrity

### Part A: item transfer (parity with PF2e, no dialogs)

Today a player can only drop an item on a sheet they own. The `transferItem` owner intent exists with validation but has no handler.

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| A1 | `transferPlan(source, item, target, quantity)` | `rules/transfer.mjs` (new, pure) | Checks the move and returns what changes: the quantity leaving (1 to the stack size), whether it merges into a matching stack on the target (same identifier, same custom state) or becomes a new item, and what resets on the copy (equipped, loaded ammunition, active coatings). Refuses class, clan, background, feature, feat, jutsu and stance items: only physical items move. Refuses the Unarmed Strike. |
| A2 | `transferItem(source, item, target, quantity)` | `workflow/transfer.mjs` (new) | The user owns both actors: done on their client. The user owns only the source: submits the `transferItem` intent. No GM connected: a notice, nothing moves. |
| A3 | GM handler | same | Re-checks on the GM's client: the user owns the source, the item is still there in that quantity, the target is allowed (Q-F1). Removes from the source, then adds to the target; if the add fails, the source is restored. One chat line: "A gave 3 Kunai to B". |
| A4 | Drop handling | `applications/actor/character-sheet.mjs`, NPC sheet, canvas drop | Dropping an owned actor's item on another actor's sheet or token transfers it instead of copying. A stack asks "how many?" once. Dropping from a compendium or the Items sidebar still copies, as now. |

Tests: `tests/core/transfer.test.mjs` (plans: merge, split, resets, refusals) and `tests/transfer.test.mjs` (the handler: ownership, stale quantity, rollback, refusal of a disallowed target).

### Part B: duplicate items and the missing Kunai, without reproduction

What reading the code found:

- **Fixed already:** the "action's item is no longer owned" Kunai error came from the GM relay, removed in OPS1a.
- **Confirmed gap:** migration 5 (Unarmed Strike) covers world actors only. Unlinked tokens placed before 0.16.0 have no Unarmed Strike, and nothing adds it.
- **Duplicate risks:**
  - Clan, background and class grants create items without checking whether the actor already has them, so applying one twice, or two clients reacting to the same drop, duplicates.
  - The compendium browser's "add" copies without a check.
  - An unlinked token keeps its own item list; items granted to the base actor after the token was placed can appear alongside the token's copies.
- **Missing-item risk:** Kunai kept its id across the DATA2 weapon rebuild, but other rebuilt items did not. A grant that points at an old id finds nothing and is skipped silently.

Since the bug can't be reproduced, the fix is to close each path and add a tool that finds and repairs the damage:

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| B1 | `itemAudit(actorData)` | `rules/item-audit.mjs` (new, pure) | For one actor's items: duplicates (same identifier and type where only one may exist: class, clan, background, feature, feat, jutsu, stance, Unarmed Strike), grants whose source can't be found, and a missing Unarmed Strike. Stackable gear is never called a duplicate. |
| B2 | Grant guards | `workflow/clan.mjs`, `workflow/background.mjs`, `advancement/manager.mjs`, `compendium-browser.mjs` | Each grant skips items the actor already has (by identifier and type) and reports any grant it couldn't find instead of skipping silently. |
| B3 | Migration 7 | `migration/runner.mjs` | Unarmed Strike for unlinked tokens. |
| B4 | GM "Item integrity" tool | `applications/gm/` (new window) | Runs B1 over world actors and unlinked tokens. Lists each finding with **Remove duplicate** (keeps the copy with choices or uses spent) and **Restore missing**. Nothing is changed automatically. |
| B5 | Pack check | `tools/check.mjs` | Fails the build when a pack grant points at an item that doesn't exist. |

Tests: `tests/core/item-audit.test.mjs`; grant idempotency (apply a clan, a background and a level twice: no new items).

Release: `0.29.0-alpha.1` (Part A) and `0.29.0-alpha.2` (Part B), or together if King prefers.

### Questions for King

- **Q-F1: who can receive an item from a player?** Proposed, as PF2e: any player character, any Allied NPC, and any NPC the GM has marked as a loot or merchant target. Not ordinary hostile NPCs.
- **Q-F2: taking.** Can a player take an item *from* an actor they don't own (looting a defeated NPC's sheet)? Proposed: only from actors marked lootable by the GM; otherwise the GM hands items over.
- **Q-F3: ryo.** Should currency move the same way (give an amount to another actor)?

## Progress log

- 2026-11-14 Claude: plan written from the batch specs, `PROGRESSION_PLAN.md` and `N5e-Context.md`. Code read for FIN1; nothing built.
- 2026-11-14 Claude: **FIN1 started (King: "Start next batch").**
  - Q-F1–Q-F3 are unanswered, so FIN1 builds only what they don't touch: transfer from an actor you own to a player character or an Allied NPC (the GM may transfer to anything), and all of Part B. Loot and merchant targets, taking from actors you don't own, and ryo wait for King's answers and LOOT1.
  - **Pure rules done:** `rules/transfer.mjs` (`transferRefusal`, `canReceive`, `transferPlan`: quantity checks, stack merge, resets, grant links dropped) and `rules/item-audit.mjs` (`identityKey`, `existingCopy`, `itemAudit`: duplicates with keep/remove, missing Unarmed Strike).
  - Found while reading: missing grants already warn (`advancement/manager.mjs`, `advancement/clan.mjs`), so B2 is the duplicate guards only.
  - Next: workflow (transfer, GM handler, drops), grant guards, migration 7, the GM window, the pack check.
- 2026-11-14 Claude: **FIN1 workflow and Part B done.**
  - **Transfer:** `workflow/transfer.mjs` (`transferItem`, `receiveTransfer` GM handler with rollback, `transferFromDrop`, `registerTransfer` with the token drop hook); `character-sheet.mjs _onDropItem` gives instead of copying.
  - **Guards:** clan and background grants and the browser's Add skip items the actor already has; level-ups skip a compendium item already on the actor unless it is repeatable.
  - **Migration 7:** Unarmed Strike for unlinked tokens.
  - **GM window:** `applications/gm/item-integrity.mjs` with `templates/apps/item-integrity.hbs`, opened from the token controls.
  - **Pack check:** `tools/check-grants.mjs` in `npm run check`; all 3,065 links are valid, so a dangling pack link was not the cause of the missing-Kunai report.
- 2026-11-14 Claude: **Tests.** `tests/core/transfer.test.mjs` (7) and `tests/transfer.test.mjs` (5).
  - Attempt 1: 401 passed, 1 failed. The clan guard called `toObject` on items, which an existing clan test's stand-in items don't have. The guard never needed it; removed in all three guards.
  - Attempt 2: 402 passed, 2 skipped; core 72/72. Lint and check pass.

## Final results (FIN1)

Published `v0.29.0-alpha.1`.
- **Differs from the spec:**
  - Receivers are player characters and Allied NPCs only (the GM: anything). GM-marked loot and merchant targets, taking, and ryo were left out because Q-F1–Q-F3 are unanswered.
  - B2 needed no "missing grant" reporting: the grant paths already warn.
  - The Item Integrity window keeps the copy with choices or spent uses, else the oldest.
- **Limits.**
  - A player dropping onto a sheet they can only view depends on Foundry passing the drop to the sheet; dropping on the token always works.
  - Items inside a container move as plain items; the container link isn't carried.
  - The duplicate rule goes by type and identifier, so the window lists; the GM decides.
  - Not tested in Foundry (no live testing).
