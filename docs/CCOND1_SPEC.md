# CCOND1 function spec: class and clan conditions

Status: **spec written 2026-11-15 (King: "plan a system for Conditions unique to Classes and Clans … only they can apply them … condition cards that can be dragged and dropped on top of creatures or automatically applied via an apply button"). King answered Q-CC1–Q-CC7 the same day; Q-CC6 found in the books. King: "Start building the system." CCOND1a built (0.56.0-alpha.1).**

## The problem

Classes and clans define their own conditions: Balance Broken, Bone Broken and Flow Broken (Taijutsu Specialist), Shattered (Talented Genius), Blighted and Curse of the Reaper (Medical-Nin), Hobbled (Weapon Specialist), Disoriented, Ghostburn and Momentary Flaw (Scout-Nin), Suppressed (Hunter-Nin), Psychosis (Genjutsu Specialist), Provoked (Obsidian Guard), Reaver Echo, Transfiguration, and more in the clans. Today they are plain marker effects with notes; the core conditions (`config/conditions.mjs`) get ranks, penalties, rule elements, durations, decay, "Try to end", turn damage and the token icon, and these don't.

## Answer: yes, this is possible

Foundry supports every piece:

- **Dragging an item onto a token:** the system already listens for items dropped on the canvas (`dropCanvasData`, used for item transfer) and finds the token under the drop.
- **Dropping on a sheet:** the character sheet already handles item drops (`_onDropItem`); a condition card would be applied instead of added as an item.
- **Apply buttons:** activities and chat cards already apply core conditions (`inflicts`); class conditions use the same path.

## Design

### 1. The condition card (a new Item type, `condition`)

- One card per class or clan condition, kept in a new compendium, **Class & Clan Conditions**, organized by class and clan.
- **Fields:** the same shape as a core condition entry, so one engine runs both:
  - identifier, name, icon, rules text;
  - **owner:** class or clan (and the subclass when only it grants it);
  - tags (Physical, Mental, Sensory, Elemental, Fatigue);
  - ranks (none or a maximum);
  - duration (default, "until the end of its next turn", or "until a successful save");
  - decay, removal ("Try to end": check, DC), a save at the end of the creature's turn (with the applier's DC);
  - turn damage, rule elements (what it does to rolls and damage), cast limits, numeric penalties.
- **Card look:** an item sheet laid out like a card (icon, name, owner, tags, rank pips, rules summary). Cards also appear in a **Conditions** section on the owner's Features tab, ready to drag.

### 2. One registry, one engine

- At start-up, every card in the compendium and every world condition item registers under its identifier in `CONFIG.N5E.clanConditions`, the registry for every non-core condition (class and clan alike; build decision: every lookup in the system already reads it, so no second registry).
- From then on a class condition works like a core one: the token icon, the sheet rail with ranks and "Try to end", the penalties and rule elements, durations and decay, turn damage, and "Apply" buttons when jutsu text names it.
- On a creature it is the same condition effect as a core condition, plus who applied it (actor, feature, save DC) so end-of-turn saves use the right DC.

### 3. Who can apply it (King: only the class or clan)

- A card can only be applied by a creature that has its class (or subclass) or its clan. Every route checks this: drag and drop, apply buttons, the sheet and the API.
- The GM can always apply or remove any card (for adversaries, house rules and fixing mistakes).
- **Players and creatures they don't own:** the card is applied through the GM's client automatically, with no approval step (King Q-CC4).
- Class and clan conditions are left out of the token HUD's status list for players, so the HUD can't bypass the owner rule.
- **King Q-CC2:** whether a summon, clone or ally may apply one depends on the feature, so the rule is enforced at the table: any **player or the GM** can apply a card. The owner check is a warning (the applier has no matching class or clan), not a block.

### 4. Ways to apply

1. **Drag a card onto a token** on the canvas (from your sheet's Conditions section or the compendium).
2. **Drag a card onto a creature's sheet.**
3. **Apply button** on a feature's activity or chat card: a save that fails applies it to the failed targets, as core conditions do now.
4. **API:** `game.n5e.applyClassCondition(actor, key, {ranks, source})` for macros.

### 5. Moving today's markers onto cards

- **Taijutsu Specialist:** Balance Broken, Bone Broken, Flow Broken, Shattered.
- **Medical-Nin:** Blighted, Curse of the Reaper.
- **The other classes and the clans:** their conditions as each is reviewed (STD6d, STD6e).
- The current marker activities become apply buttons for the cards.
- Life Pulse and Hemorrhage Vitality are Physical conditions in the book's boxes, so they become cards too.

### 6. Rules from King's answers

- **Tags (Q-CC1):** a class condition counts as its tag for everything (ending, resisting and immunity to Physical, Mental… conditions).
- **Stacking (Q-CC3):** each card says whether it stacks (ranks) or not; when it doesn't, applying it again replaces it and the new duration wins.
- **No approval step (Q-CC4):** a player's card goes straight onto the target (through the GM's client when the player doesn't own it), with a chat line saying who applied what.
- **Applier gone (Q-CC5):** a class condition ends when the creature that applied it dies (0 HP and dead) or leaves the combat.
- **Visibility (Q-CC7):** a world setting the GM controls: players see a card's full rules on creatures they don't own, or only its name.

### 7. Class conditions found in the books (King Q-CC6: review the books first)

Swept from the docx books in the context folder (2026-11-15). The class conditions sit in text boxes that the class import missed, which is why the features only name them.

| Condition | Tag | Class (feature) |
| --- | --- | --- |
| Balance Broken | Physical | Taijutsu Specialist (Moment of Stillness) |
| Bone Broken | Physical | Taijutsu Specialist (Moment of Stillness) |
| Flow Broken | Physical | Taijutsu Specialist (Moment of Stillness) |
| Shattered | Physical | Taijutsu Specialist, Talented Genius (Shatterpoint) |
| Blighted | Elemental | Medical-Nin, Black Medicine (Toxic Chakra) |
| Curse of the Reaper (Cursed) | Mental | Medical-Nin, Reaper (Reapers Arsenal) |
| Life Pulse | Physical | Medical-Nin (Supreme Medic) |
| Hemorrhage Vitality | Physical | Medical-Nin (Supreme Medic) |
| Suppressed | Physical | Hunter-Nin (Twisted Medicine) |
| Disoriented | Mental | Scout-Nin, Cloning Scout (Clones Everywhere) |
| Ghostburn | Mental | Scout-Nin, Phantom Scout (Phantasmic Eruption) |
| Momentary Flaw | Elemental | Scout-Nin, Elemental Scout (Perceived Weakness) |
| Hobbled | Physical | Weapon Specialist (Savage Assault) |
| Shaken (Savage Assault's box) | Physical | Weapon Specialist: compare with the core Shaken in CCOND1b |
| Provoked | Mental | Obsidian Guard |
| Reaver Echo | Physical | Reaver |
| Transfiguration | Physical | Medical-Nin, Transmuter (Transfigured Technique) |
| Psychosis | Mental | Genjutsu Specialist (Venom Strike Expert) |
| Identity Crisis | Mental | Genjutsu Specialist (Betray Yourself) |

- **Bone Broken (Physical):** disadvantage on Constitution saves; can't Dash, Disengage or Dodge; DR reduced to 0; disarmed of everything it holds and can't hold weapons or items; ends at the end of its turn.
- **Flow Broken (Physical):** disadvantage on Dexterity saves; can't cast jutsu that share a keyword with a jutsu it cast since the start of its last turn; initiative count −4 (it moves in the order at the start of the next round); ends at the end of its turn.
- **Not class or clan conditions:** Infested (Tsunade's) and Psychic Malignance (Jiraiya's) belong to jutsu; Slowed and Shaken from jutsu are core conditions.
- **Clans:** no clan condition is worded the same way in the books; the clan pass (STD6e, CCOND1c) reads each clan for them.
- **Text issue:** the class conditions' boxes were not carried into the transcription (`N5e-Rules-KB` has them only for the Moment of Stillness three).

## Phases

| Phase | What |
| --- | --- |
| CCOND1a | The `condition` item type and card sheet, the registry, owner checks, drag onto tokens and sheets, apply buttons, the GM override, the Features-tab Conditions section, tests. |
| CCOND1b | Cards for every class condition in the table above (text from the books' boxes), and the class features' apply buttons pointed at them. |
| CCOND1c | The other classes' cards as STD6d reaches them, then the clans' cards with STD6e. |

## Questions for King

Answered 2026-11-15:
- Q-CC1 yes. Q-CC2 any player or GM can apply (it depends on the feature). Q-CC3 depends on the condition; generally the new duration wins. Q-CC4 no approval, let it go through. Q-CC5 yes. Q-CC6 review the books first (done: section 7). Q-CC7 a GM-controlled toggle.

Original questions:
- **Q-CC1 Tags:** do class conditions count as their tag for everything (for example "Balance Broken is treated as a Physical condition", so features that end, resist or make you immune to Physical conditions work on it)?
- **Q-CC2 Who:** only the creature with the class or clan, or also things it controls (summons, clones, a jutsu it gave an ally)? And the GM can always apply any card?
- **Q-CC3 Stacking:** if two creatures with the same class apply the same condition to one target, is it one instance (refreshed, the higher DC kept) or two?
- **Q-CC4 Players applying to enemies:** GM approval every time, or straight through?
- **Q-CC5 Applier gone:** does a class condition end when the creature that applied it dies or leaves the fight?
- **Q-CC6 Definitions:** the full text of Bone Broken and Flow Broken (and any other class or clan condition missing from the books).
- **Q-CC7 Visibility:** should players see a card's full rules when an enemy applies it to them (hover text), or only its name?

## Progress log

- 2026-11-15 Claude: spec written from King's request; existing class conditions surveyed from the feature text.
- 2026-11-15 King: answers Q-CC1–Q-CC7. Claude: swept the books for class conditions (19 found, Bone and Flow Broken defined); spec updated.
- 2026-11-15 King: "Start building the system." Claude: CCOND1a built and published 0.56.0-alpha.1.

## Build notes (CCOND1a, 0.56.0-alpha.1)

- **Code:** item type `condition` (`data/item/condition-card.mjs`); pure rules `rules/condition-cards.mjs` (card → registry entry, owner check, the Features-tab list, Q-CC7 visibility, resave DC, applied-by lookup); Foundry side `workflow/condition-cards.mjs` (start-up registration, `applyConditionCard`, canvas drops, the GM-side `applyCondition` owner intent, Q-CC5 endings). Sheet drops route cards to apply instead of adding an item. `actor.addCondition` takes extra flags (`appliedBy`, `resave`).
- **Engine:** condition flag `drZero` (DR is 0). Cards' rule elements live in the card's `flags.n5e.rules`.
- **Who applies to a creature the player doesn't own:** an owner intent on the applying actor (the player must own it); the active GM's client applies it without a dialog. The request is authenticated by Foundry (the GM sees which user changed the actor).
- **Q-CC5 "dies":** the Dead status, or an NPC at 0 HP. **"Leaves the fight":** its combatant is deleted or the combat ends.
- **Cards so far:** Balance Broken, Bone Broken, Flow Broken, Shattered. Flow Broken's keyword lock and initiative −4, Balance Broken's movement rule, Bone Broken's disarm and Shattered's level-scaled damage and remade save are on the card's text (at the table).
- **Next (CCOND1b):** the other 15 class conditions from section 7.
