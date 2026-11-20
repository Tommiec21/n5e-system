# AMP1 function spec: Amps as packaged buffs (Amp cards)

Status: **spec written 2026-11-16 (King: "plan for designing amps as packaged buffs in this system", after the condition cards, CCOND1). King answered Q-A1–Q-A4 the same day (scope widened: typeless Amps, jutsu included, its own larger release). King answered Q-A5 and Q-A6 and approved the build. AMP1a released in 0.59.0-alpha.1; AMP1b in 0.61.0-alpha.1; AMP1c in 0.62.0-alpha.1; next AMP1d.**

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

### 6. King's answers (2026-11-16)

- **Q-A1 Clan Amps:** an Amp provided by a clan (clan features, clan jutsu, Hijutsu) is a **Clan Amp**, whatever type its box names. The box's named type is kept on the card as a note.
- **Q-A2 Who:** anyone can apply an Amp, with a confirmation that warns when the applier doesn't have its source (as condition cards warn).
- **Q-A3 Singleton:** the creature picks which Amp applies.
- **Q-A4 Typeless Amps:** self-buffs the books don't call Amps (Feral, Well Rested, Combat and Social Coordinated, DYNAMIC FORM!, Flawless, the stances…) become Amp cards **with no type**, and **jutsu are included**. The Automation Audit labels them "Amp: no type" so King can assign types.

### 7. What counts as an Amp (King's definition)

An Amp is a **bonus to a statistic, a unique ability or an action** that **lasts longer than one round**. Examples of the statistics: damage, DR, AC, speed, skills, saves, resistances and immunities, chakra costs, healing, extra actions. This covers everything the book's Amp section describes.
- **An Amp:** "+10 ft speed and +1 damage die, concentration up to 1 minute"; "resistance to fire for 1 minute"; a state such as Sharingan or Crash.
- **Not an Amp:** a bonus that happens once on use, such as healing now, a reroll, or +2 to this one attack; anything that ends within the same round; harmful effects on enemies (those are conditions).

### 8. Finding them: an Amp audit

- **Candidates:** a scan finds features and jutsu whose text gives a lasting bonus: a duration over one round (minutes, hours, concentration, "until the end of your next turn" across turns) with a bonus to a statistic, an ability or an action. A first pass over the 968 jutsu finds about **125 candidates**. Add to those the ~45 named Amp boxes, the 17 Amp buttons and the self-buff states. The scan suggests; it decides nothing.
- **Automation Audit:** a new **Amps** view in the GM's Automation Audit lists every Amp card and every candidate:
  - **typed** (Battle / Reflex / Fortitude / Will / Clan);
  - **"Amp: no type"** (King's queue to assign);
  - **candidate, not yet a card**;
  - **not an Amp** (dismissed).
  
  The type can be set from the row, which edits the card.
- **The generated report** (`docs/generated/std-audit.md`) gets the same Amps section, so the counts are tracked between releases.

## Phases

Its own larger release line (0.6x), in pieces:

| Phase | What |
| --- | --- |
| AMP1a | The engine: the `amp` item type (type may be empty) and card sheet, the registry, the Amps panel (active and available, Activate and End, uses and cooldowns), activities that name a card, drag onto allies with the confirmation (Q-A2), initiative start, the limit dialogs (Q-A3), clan-sourced = Clan (Q-A1), tests. |
| AMP1b | The Amp audit: the candidate scan, the Automation Audit's Amps view with "Amp: no type" and set-type, the report section. |
| AMP1c | Cards for the 17 Amps that have buttons today, with their features pointed at them. |
| AMP1d | Cards for the named Amp boxes in clans and classes, in batches (clan ones as Clan Amps). |
| AMP1e | Typeless cards for the self-buff states (Feral, Well Rested, Coordinated, DYNAMIC FORM!, Flawless, stances…). |
| AMP1f | Jutsu Amps from the audit's candidates, in batches (about 125 to review), typeless unless the jutsu names a type. |

## Questions for King

Answered 2026-11-16: Q-A1 clan-provided Amps are Clan Amps. Q-A2 anyone, with a confirmation or warning. Q-A3 the creature picks. Q-A4 the self-buff states and jutsu become typeless Amps, labelled in the audit. Q-A5 both, as a GM setting ("Amps that end on a condition": automatically or a reminder at the table). Q-A6 the order above is approved.

Claude's reading where the answers leave a gap: an Amp with no type has no type to clash with under Singleton, but it counts toward Rule of 3's.

Original questions:

- **Q-A1 Type of a clan Amp:** the rules say any clan-sourced Amp defaults to Clan, but clan boxes name a type (White Wolf "Battle Amp", Sharingan "Reflex Amp"). Which wins for the limits: the named type, or Clan?
- **Q-A2 Who applies:** like condition cards (any player or the GM, with a warning when the applier lacks the source)? Or only the owner, and only to themselves unless the text says it can be given?
- **Q-A3 Singleton choice:** when a second Amp of a type arrives, should the creature pick which one stays (KB 03) or the newer always win?
- **Q-A4 Self-buff states that aren't called Amps:** Feral, Well Rested, Combat and Social Coordinated, DYNAMIC FORM!, Flawless and the stances. Should these become Amp cards too, without an Amp type, as "packaged buffs", or stay as they are?
- **Q-A5 Ending:** should Amps that the text says end on Staggered, Blinded or 0 chakra end automatically, or be ended at the table?
- **Q-A6 Order:** after AMP1a, the 17 existing Amps first (AMP1b), or straight to the clans (AMP1c)?

## Progress log

- 2026-11-16 Claude: spec written. Surveyed the content: about 45 named Amp boxes (Battle ~25, Will 10, Fortitude 7, Reflex 3), 17 items with Amp buttons, the Amp limits and the Amps tracker as they are now.
- 2026-11-16 King: answers Q-A1–Q-A4 and the Amp definition (a lasting bonus to a statistic, ability or action; instant bonuses aren't Amps). Claude: spec widened (typeless Amps, jutsu, the Amp audit, phases AMP1a–f); first jutsu scan ≈125 candidates.
- 2026-11-16 King: Q-A5 both (a GM setting), Q-A6 approved. Claude: AMP1a built (0.59.0-alpha.1): the amp item type and Amps pack, the registry, the Amps panel, drag and Activate with the confirmation, the limit dialogs, endings by setting, initiative start, uses and cooldowns.
- 2026-11-16 Claude: AMP1b built (0.61.0-alpha.1): rules/amp-audit.mjs scan, the Automation Audit's Amps view (set type, Not an Amp / Restore, world setting ampAuditDismissed), report section. First pass: 240 candidates (jutsu 66, class features 28, clan features 122, stances 24), 17 with Amp buttons. Next: AMP1c (cards for the 17).
- 2026-11-16 King: the Amps view showed nothing (Source was the empty Amps compendium). Claude: the Amps view scans the world and every N5e compendium at once (0.61.0-alpha.2).
- 2026-11-16 King: the buttons make Amps with no mechanics; can they be built from their text? Claude: AMP1c (0.62.0-alpha.1): 20 cards from the book boxes (Orochimaru's Observation Compendium), buttons repointed, Crash's no-cost-reduction now applied, Battle Trance automated, ability facts added. Next: AMP1d (named Amp boxes in clans and classes).
- 2026-11-16 King: Crash damage is its own damage card. Claude: cast-option damage merges into the jutsu's damage roll (rules/cast-options.mjs mergeExtraDamage), 0.62.0-alpha.2.
- 2026-11-16 King (GM): jutsu and damage cards are separate. Claude: the Crash extra-damage button made a second damage roll for one effect, which the card rejects; merged in alpha.2. Note text corrected when a GM is connected (0.62.0-alpha.3).
- 2026-11-16 King: Fireball's damage still a separate card. Claude: cardSections gave no damage section to a save activity carrying damage (0.62.0-alpha.4).
- 2026-11-20 King: next batch (leave Codex's GM work alone). Claude: AMP1d built (0.66.0-alpha.1): 34 clan Amp cards (tools/content/build-clan-amp-cards.py), owners are the granting features, duration 'dismissed', lvl() values in effect changes now resolve (Flow's DC bonus was dropped). Not yet: the 5 class Amp boxes (Elemental Flux, Flash, Chained Cascade, Flow and Crash Duality); Blazing's start rule isn't in the Sarutobi features.
