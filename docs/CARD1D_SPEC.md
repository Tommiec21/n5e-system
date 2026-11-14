# CARD1d plan: feature riders infused into the action card

Status: **plan for King's approval (2026-11-14). Nothing is built. Questions Q-CD5–Q-CD10 below.**

King (2026-11-14): features and effects that stack need a clear path to plug into the action card as additional fixtures. Example: a player casts a jutsu that forces a save and also uses a feature that says "on a failed save, also apply X". That rider belongs on the same card.

## What exists today

- **Cast options** (`rules/cast-options.mjs`, `flags.n5e.castOption(s)` on a feature).
  - Chosen in the cast dialog before the cast: Warfare, Hellrend, Chakra Compression, Crash, Devastation.
  - They can only add a fixed extra to the cast card: a damage button, a heal button, an effect button, a die roll or a note.
  - They can't react to how the cast turned out.
- **Moldings and Maneuvers** (`nin-molding`, `scout-maneuver` tags) are checkboxes in the same dialog. Only Precise, Heightened and Piercing change anything on the card, and that behaviour is hard-coded in `postCastCard`.
- **Maneuvers with their own activity** (Arresting Strike, Menacing Assault: a `save` activity with a Superiority Die cost and `inflicts`) post their own feature card, apart from the attack or jutsu they ride on.
- **The action card (CARD1a–c)** knows per target: hit/miss, save result, damage taken, conditions applied. It has no way for a feature to add to those results.

## What the two classes need (survey)

Read from all 271 Ninjutsu Specialist (84) and Scout-Nin (187) feature and option records in `packs/_source/features`. 115 of them have trigger language. Representative riders are listed per class by level, with the pattern each one needs.

**Ninjutsu Specialist**

| Feature (level) | Text, short | Arms | Trigger | Does |
| --- | --- | --- | --- | --- |
| Heightened Ninjutsu (1, Molding) | one target has disadvantage on its first save | cast | save rolled | roll modifier (exists, hard-coded) |
| Potent Ninjutsu (1, Molding) | after damage is rolled, up to 3 dice count as maximum | damage rolled | damage rolled | roll modifier on damage |
| Precise / Piercing Ninjutsu (1, Moldings) | advantage on one attack / ignore resistance and half DR | cast | attack / damage | roll and damage modifiers (exist, hard-coded) |
| Pyroclasm: Hellrend (2) | spend Pyroclasm: targets' DR −2 each | cast | damage | effect on targets (exists as a cast option) |
| Stormcircuit (2, Lightning Breaker) | once per turn, a creature that fails a save vs your Lightning ninjutsu can be marked with Static | trigger | failed save | mark (effect) on that target, limited count |
| Tempest Pressure (2, Storm Terror) | spend 1 Pressure as part of casting: creatures within 10 ft make a Str save or are pushed and Prone; or +1 Wind damage per die | cast | cast / damage | rider save with its own inflicts; extra damage |
| Gale Fracture (6, Storm Terror) | spend 2 Focus when casting: those who fail the jutsu's save get −2 AC and −1 saves (no save: a Dex save instead) | cast | failed save | effect on failed targets; a fallback save |
| Crimson Kindling (6, Blaze Walker) | spend 2 Focus: Burned creatures that fail get −1 save DC per Burned rank | cast | failed save | effect scaled by the target's ranks |
| Tsunami (18) | spend 3 Focus: failed targets' jutsu cost +level | cast | failed save | effect on failed targets |
| Lightning Breaker (18) | spend Focus and Shocked: dispel effects, then a Con save or Stunned | cast | cast | rider save, dispel (later: dispels) |

**Scout-Nin**

| Feature (level) | Text, short | Arms | Trigger | Does |
| --- | --- | --- | --- | --- |
| Warfare (2, Generalization) | once per turn, 1 Superiority Die: +Xd8 damage (half the dice on areas and attacks) | cast | damage | extra damage (exists as a cast option) |
| Brutish Momentum (3) | the first hit by 5+ over AC, or a failed save by 5+, against your Combat Rival: regain 1 Superiority Die | automatic | hit / failed save by margin | resource for the caster |
| Arresting Strike (3, Maneuver) | when you hit, 1 Superiority Die: a Str save or speed halved and Prone | trigger | hit | rider save with inflicts |
| Menacing Assault (3, Maneuver, Specialized) | when you damage your Combat Rival, 1 Superiority Die: chosen creatures make a Wis save or are Demoralized (half the die) | trigger | damage dealt | rider save; ranks from the paid die |
| Amplified Force (3, Maneuver, Specialized) | when you cast a jutsu that forces your Combat Rival to save against a condition, 1 Superiority Die: on a failure, +1 rank of that condition | cast | failed save | adds ranks to the jutsu's own condition |
| Authoritative Strike (3, Maneuver) | when you hit or a creature fails your jutsu's save, 1 Superiority Die: all of those gain Demoralized or Weakened 1 (your choice) | trigger | hit / failed save | condition on every qualifying target, one choice |
| Elemental Malady (3, Maneuver, Specialized) | as part of casting a nature-release jutsu that can inflict an elemental condition, 1 Superiority Die: + ranks equal to half the die when its condition is inflicted | cast | failed save / hit | adds ranks from the paid die |
| Superior Suppression (3, Maneuver) | when a creature under your jutsu saves, 1 Superiority Die: it rerolls, taking the lower; on a failure +1 Demoralized, Shaken or Sealed | trigger | save rolled | forced reroll (lower), then a condition |
| Spirit Siphon (3, Maneuver) | when you deal Chakra damage, 1 Superiority Die: a Wis save or Slow 1 (disadvantage if the target has a Mental condition) | trigger | damage dealt (Chakra) | rider save, conditional disadvantage |
| Willpower Surge (14, Void Heart) | a maneuver that would inflict a condition inflicts 2 ranks instead | passive | any rider | changes other riders (rank floor) |

**Not caster riders (left out of CARD1d, see Q-CD10).** These are reactions by the creature being hit or saving: Staggering Will, Phantom Avoidance, Transverse Defense, Clone Tactics, Who Decided That!?. The following are table procedures with no card data to change: Swap Spots (movement), Synchronization Technique and Tag-Team (summons).

## Design

### 1. A rider is a fixture on a feature

A feature declares `flags.n5e.riders` (a list), next to the existing `castOption(s)`. Each rider:

| Field | Meaning |
| --- | --- |
| `id`, `label` | identity, and the text on the card button |
| `arm` | `cast`: chosen in the cast dialog and paid there, the "as part of casting / when you cast… you can spend" wording. `trigger`: offered on the card when its trigger happens, the "when you hit / when a creature fails / when you deal damage" wording. `passive`: always on, nothing to pay |
| `when` | the card moment it acts on: `hit`, `crit`, `failedSave`, `saveRolled`, `damageRolled`, `damageDealt`, `cast` |
| `appliesTo` | the same filter as cast options (discipline, keywords, activation, requiresDamage), plus `kind` (jutsu, attack, feature), `inflictsCondition` (the action can inflict a condition), `damageType` (Spirit Siphon: chakra), `margin` (Brutish Momentum: 5) |
| `target` | `each` (every qualifying target), `one` (the user picks one row), or `chosen` (Menacing Assault: creatures of your choice). Optional `requires: {state: "combatRival", from: "caster"}` for Specialized maneuvers |
| `cost` | as cast options: `{pool, amount, choose, roll}`. With `roll`, the pool die is rolled once and is `@poolRoll` in the effects |
| `oncePerTurn`, `limit` | as cast options; `limit` for Static's mark count |
| `effects` | an ordered list from the vocabulary below |

**Effect vocabulary.** It reuses what activities and cast options already understand.

| Effect | Example | What the card does |
| --- | --- | --- |
| `addRanks {amount}` | Amplified Force `1`, Elemental Malady `floor(@poolRoll/2)` | Raises the ranks on the action's own "Apply <condition>" buttons for qualifying targets |
| `inflict {choose: [conditions]}` | Authoritative Strike, Superior Suppression | Adds "Apply X" buttons to qualifying rows; the caster picks the condition when using the rider |
| `save {ability, dc, inflicts, damage, disadvantageIf}` | Arresting Strike, Menacing Assault, Spirit Siphon, Tempest Pressure | Adds a rider save to each qualifying row, rolled by that creature's owner and recorded per rider. Then its own Apply buttons |
| `effect {changes, seconds}` | Gale Fracture, Crimson Kindling, Tsunami, Static | Adds "Apply <effect>" to qualifying rows (the CARD1b effect path) |
| `damage {formula, type}` | Warfare, Tempest Pressure | An extra damage part on the card's damage |
| `rollMod {reroll: "lower", maximizeDice: 3, disadvantage: "first"}` | Superior Suppression, Potent, Heightened | Acts on a recorded roll through a linked reroll (the CARD1c Will of Fire path) |
| `resource {pool, amount}` | Brutish Momentum | Offers "Regain 1 Superiority Die" to the caster's owner when the trigger happens |
| `note {text}` | movement, push, swap places | Shown on the qualifying row |

### 2. How it shows on the card

- **The cast dialog** lists `arm: cast` riders beside the existing cast options and pays their cost there. Chosen riders are written into the card (`flags.n5e.card.riders = [{id, featureUuid, label, paid, poolRoll}]`).
- **A new Riders section** appears when the card has riders.
  - For `arm: trigger` riders, the card shows **"Use <rider> (cost)"** for the caster's owner on each qualifying row, or once for a whole-card rider, as soon as the trigger has happened (the attack hit, the save failed, damage was dealt).
  - Using it pays the cost and posts a small linked note (`flags.n5e.cardRider`), recorded like every other card result.
- **On each qualifying row** the rider's effects become buttons for whoever acts:
  - the target's owner (the GM for NPCs) rolls rider saves and applies conditions and effects to their own creature;
  - the caster's owner applies extra damage and resources.

  This keeps the CARD1 ownership model; no new authority is added.
- **Undo** (Q-CD4) also removes what riders applied. A rider's spent cost is refunded only if the rider is undone before any of its effects were applied.

### 3. Stacking order (the clear path)

Per target, in this fixed order:

1. The action's own roll and its roll modifiers (`rollMod`: advantage/disadvantage, forced rerolls, maximized dice).
2. The action's outcome: hit/miss, save tier, damage share.
3. Riders that change the action's own results (`addRanks`, `damage`), in the order the user armed or used them.
4. Riders that add their own results (`inflict`, `save`, `effect`, `note`, `resource`).
5. Modifiers of riders (Willpower Surge: a maneuver's condition is at least 2 ranks).
6. The condition's rank cap from the registry.

The pure function `riderOutcome(card, target)` computes this list. The card draws from it, and tests pin it down.

### 4. Where the code goes

- `rules/riders.mjs` (new, pure, shared core):
  - `availableRiders(actor, action, now)`: the arm filter, like `availableCastOptions`;
  - `riderQualifies(rider, row, card)`: the trigger, target filter, margin and Combat Rival checks;
  - `riderOutcome(card, targetUuid)`: the stacking order above;
  - `resolveAmounts(rider, poolRoll)`.
- `workflow/riders.mjs` (new):
  - the cast-dialog list;
  - "Use rider" (pay, then post the linked rider note);
  - rider saves (`rollWithSpec` with `source` = the card and `riderId`);
  - the hooks into `renderActionCard`.
- `rules/action-card.mjs`:
  - `results.riders` (uses, per target where it applies);
  - `results.riderSaves[riderId][uuid]`, so a rider save never collides with the jutsu's own save.
- **Data:** `riders` authored on the starter features listed below. Heightened, Precise and Piercing move from the hard-coded checks in `postCastCard` to riders, with the same behaviour.

### 5. Releases

| Release | Contents |
| --- | --- |
| **CARD1d-a** | Rider model, Riders section, `arm: cast` and `arm: trigger`, effects `addRanks`, `inflict`, `save`, `effect`, `note`. Authored: Amplified Force, Elemental Malady, Authoritative Strike, Arresting Strike, Menacing Assault, Gale Fracture, Stormcircuit (mark with its count limit) |
| **CARD1d-b** | `rollMod` (forced reroll taking the lower, maximize dice), `resource`, `damage`, rider modifiers. Authored: Superior Suppression, Potent Ninjutsu, Brutish Momentum, Willpower Surge, Tempest Pressure, Spirit Siphon, Crimson Kindling. Heightened, Precise and Piercing move to riders |
| **Later (Tier 3, rule-element expansion)** | The remaining features with trigger language, authored in batches per subclass using the same vocabulary. No new code unless a new effect kind is needed |

### 6. Tests

`tests/core/riders.test.mjs`:
- the arm filter (keywords, discipline, Combat Rival, once per turn);
- triggers per row (hit, crit, failed save, margin of 5, damage type);
- the stacking order: Amplified Force + Elemental Malady + Willpower Surge on one Burned target, and the rank cap;
- `@poolRoll` amounts;
- rider saves keyed apart from the jutsu's own save.

## Questions for King

- **Q-CD5: stacking rank increases.** Amplified Force (+1), Elemental Malady (+half the Superiority Die) and Willpower Surge ("inflicts 2 ranks instead") can all hit the same Burned. Proposed: the base ranks, then the additions summed, then "at least 2", then the condition's cap. Is that right, or does each feature apply separately?
- **Q-CD6: when a rider is paid.** Proposed: follow the wording.
  - "As part of casting / when you cast… you can spend" is chosen and paid in the cast dialog. The cost is spent even if nobody ends up failing.
  - "When you hit / when a creature fails / when you deal damage" is offered on the card after the outcome and paid then.

  Agree?
- **Q-CD7: Specialized maneuvers and Combat Rival.** Should the card offer a Specialized maneuver only on your Combat Rival's row (the `combatRival` state from you), or on any row with a "not your Combat Rival" warning?
- **Q-CD8: "your choice" conditions** (Authoritative Strike: Demoralized or Weakened; Superior Suppression: Demoralized, Shaken or Sealed). Is it one choice for every affected creature when the rider is used, or a choice per creature?
- **Q-CD9: forced rerolls on someone else's save** (Superior Suppression: "they must reroll, taking the lower"). Proposed: the caster's owner pays on the card, and the target's owner then gets a "Reroll (take lower)" button on their row. That's the CARD1 model: each user rolls for their own creature. Or should the caster's client roll it?
- **Q-CD10: scope.** Caster-side riders only in CARD1d, with the target-side reactive features (Staggering Will, Phantom Avoidance, Transverse Defense, Clone Tactics, Who Decided That!?) in a later reactions batch?

## Progress log

- 2026-11-14 Claude: survey of Ninjutsu Specialist and Scout-Nin riders done; plan written for approval.
