# CCOND1 function spec: class and clan conditions

Status: **spec written 2026-11-15 (King: "plan a system for Conditions unique to Classes and Clans … only they can apply them … condition cards that can be dragged and dropped on top of creatures or automatically applied via an apply button"). Awaiting answers and approval.**

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

- At start-up, every card in the compendium registers under its identifier (class cards in a new `classConditions` registry; clan cards in the existing `clanConditions`).
- From then on a class condition works like a core one: the token icon, the sheet rail with ranks and "Try to end", the penalties and rule elements, durations and decay, turn damage, and "Apply" buttons when jutsu text names it.
- On a creature it is the same condition effect as a core condition, plus who applied it (actor, feature, save DC) so end-of-turn saves use the right DC.

### 3. Who can apply it (King: only the class or clan)

- A card can only be applied by a creature that has its class (or subclass) or its clan. Every route checks this: drag and drop, apply buttons, the sheet and the API.
- The GM can always apply or remove any card (for adversaries, house rules and fixing mistakes).
- **Players and creatures they don't own:** applying to an enemy goes through the existing GM review (multiplayer coordination), the same as damage today. An apply button on a card whose save the target failed can go straight through (Q-CC4).
- Class and clan conditions are left out of the token HUD's status list for players, so the HUD can't bypass the owner rule.

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
- Life Pulse and Hemorrhage Vitality stay effects (they are jutsu-like states, not conditions), unless King says otherwise.

## Phases

| Phase | What |
| --- | --- |
| CCOND1a | The `condition` item type and card sheet, the registry, owner checks, drag onto tokens and sheets, apply buttons, the GM override, the Features-tab Conditions section, tests. |
| CCOND1b | Cards for the reviewed classes (Taijutsu Specialist, Medical-Nin, Ninjutsu Specialist) with King's definitions of Bone Broken and Flow Broken. |
| CCOND1c | The other classes' cards as STD6d reaches them, then the clans' cards with STD6e. |

## Questions for King

- **Q-CC1 Tags:** do class conditions count as their tag for everything (for example "Balance Broken is treated as a Physical condition", so features that end, resist or make you immune to Physical conditions work on it)?
- **Q-CC2 Who:** only the creature with the class or clan, or also things it controls (summons, clones, a jutsu it gave an ally)? And the GM can always apply any card?
- **Q-CC3 Stacking:** if two creatures with the same class apply the same condition to one target, is it one instance (refreshed, the higher DC kept) or two?
- **Q-CC4 Players applying to enemies:** GM approval every time, or straight through when it comes from a save the target failed (or a hit) on the card?
- **Q-CC5 Applier gone:** does a class condition end when the creature that applied it dies or leaves the fight?
- **Q-CC6 Definitions:** the full text of Bone Broken and Flow Broken (and any other class or clan condition missing from the books).
- **Q-CC7 Visibility:** should players see a card's full rules when an enemy applies it to them (hover text), or only its name?

## Progress log

- 2026-11-15 Claude: spec written from King's request; existing class conditions surveyed from the feature text.
