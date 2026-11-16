# AMP1 function spec: Amps as packaged buffs (Amp cards)

Status: **spec written 2026-11-16 (King: "plan for designing amps as packaged buffs in this system", after the condition cards, CCOND1). Awaiting answers and approval.**

## The problem

The rules define an Amp as a beneficial effect that lasts beyond one turn, with one of five types, and an optional limit:
- **Battle:** attack, damage, save DCs, action economy.
- **Reflex:** Dex and Int, AC, speed, action economy.
- **Fortitude:** Str and Con, AC or DR, resistances and immunities.
- **Will:** Wis and Cha, chakra costs, healing, mental and sensory protection.
- **Clan:** from clan features and jutsu.
- **Optional limit:** Rule of 3's (3 active) or Singleton (one per type) (KB 03).

Today an Amp is an effect with an `ampType` that a feature's button builds by hand. That has three problems:
- **Only some have buttons.** 17 items carry one; about 45 named Amp boxes in the clans and classes have no button and are text only, among them White Wolf, Sharingan, Kujaku Mode, Battle Lust, Speed Sovereign, Elemental Cloak, Ascension, Crash and Flow.
- **Each one is rebuilt by hand** in every feature that grants it, with its own duration, uses and cooldown text.
- **Allies are left out:** they can't be handed an Amp, and the Singleton limit switches off the older Amp instead of letting the creature pick which applies (KB 03).

## The idea

Package each Amp the way class and clan conditions are packaged: an **Amp card**. A card holds the whole buff once. Features, jutsu and players apply it by name; the engine runs it the same everywhere.

## Design

### 1. The Amp card (a new Item type, `amp`)

- Kept in a new compendium, **Amps**, with folders by class and clan.
- **Fields:**
  - identifier, name, icon, rules text, summary;
  - **Amp type** (Battle, Reflex, Fortitude, Will, Clan);
  - **owner** (class, subclass, clan, feat, or anyone);
  - **duration:** 1 minute, 10 minutes, concentration, until the end of combat, until a rest, or a turn-based ending;
  - **activation:** Action, Bonus Action, Reaction, on rolling initiative, or a trigger;
  - **uses:** per rest, plus a cooldown such as "10 minutes before re-entry";
  - **exclusive group:** Crash or Flow, stances;
  - the buff itself: Active Effect changes, rule elements (with level-scaled `lvl()`, `mod()`, `ranks()` values), turn triggers, auras (ENG1d) and pools it grants;
  - **ends when:** Staggered, Blinded, 0 chakra, leaving a stance, and so on.
- The card face looks like the condition cards, in the Amp type's colour.

### 2. One registry, one engine

- Cards register at start-up in `CONFIG.N5E.amps`.
- Applying one creates the existing `amp` effect type, carrying the card's changes, rules and timing. That keeps today's Amps tracker, limits and expiry, and adds the card link.
- A creature's **Amps panel** (Combat tab, today's tracker) lists:
  - each active Amp with its type colour, time left and an End button;
  - the Amps it can start (its class, subclass, clan and feats), each with **Activate** and use and cooldown pips.

### 3. Applying and starting Amps

1. **Activate** on the Amps panel or a feature's button. Effect activities name the card (`{amp: key}`), as they name condition cards now.
2. **Drag a card onto an ally's token or sheet**, for Amps that can be given (Battle Medic, Ascension, auras).
3. **On rolling initiative:** cards set to start then (Sharingan in combat, Elemental Cloak at 17th) start or ask.
4. **API:** `game.n5e.api.applyAmp(actor, key)`.
- **An ally you don't own:** the GM's client applies it, as with condition cards.

### 4. Limits (optional rule, unchanged default: none)

- **Rule of 3's:** a 4th Amp asks which one to end.
- **Singleton:** a second Amp of a type asks which one applies, rather than always ending the older one (KB 03: "creature picks which applies").

### 5. Moving today's Amps onto cards

- The 17 items with an Amp button: Chakra Surge's Crash and Flow, Healing Ascension, Battle Medic and others. Their buttons will apply the cards.
- The ~45 named Amp boxes in clans and classes become cards in batches, like the clan conditions.

## Phases

| Phase | What |
| --- | --- |
| AMP1a | The `amp` item type and card sheet, the registry, the Amps panel (active and available, Activate and End, uses and cooldowns), activities that name a card, drag onto allies, initiative start, the limit dialogs, tests. |
| AMP1b | Cards for the 17 Amps that have buttons today, with their features pointed at them. |
| AMP1c | Cards for the clan and class Amp boxes, in batches (Battle about 25, Will 10, Fortitude 7, Reflex 3). |

## Questions for King

- **Q-A1 Type of a clan Amp:** the rules say any clan-sourced Amp defaults to Clan, but clan boxes name a type (White Wolf "Battle Amp", Sharingan "Reflex Amp"). Which wins for the limits: the named type, or Clan?
- **Q-A2 Who applies:** like condition cards (any player or the GM, with a warning when the applier lacks the source)? Or only the owner, and only to themselves unless the text says it can be given?
- **Q-A3 Singleton choice:** when a second Amp of a type arrives, should the creature pick which one stays (KB 03) or the newer always win?
- **Q-A4 Self-buff states that aren't called Amps:** Feral, Well Rested, Combat and Social Coordinated, DYNAMIC FORM!, Flawless and the stances. Should these become Amp cards too, without an Amp type, as "packaged buffs", or stay as they are?
- **Q-A5 Ending:** should Amps that the text says end on Staggered, Blinded or 0 chakra end automatically, or be ended at the table?
- **Q-A6 Order:** after AMP1a, the 17 existing Amps first (AMP1b), or straight to the clans (AMP1c)?

## Progress log

- 2026-11-16 Claude: spec written. Surveyed the content: about 45 named Amp boxes (Battle ~25, Will 10, Fortitude 7, Reflex 3), 17 items with Amp buttons, the Amp limits and the Amps tracker as they are now.
