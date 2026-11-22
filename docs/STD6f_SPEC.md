# STD6f function spec: jutsu as data

Status: **Approved by King 2026-11-22 (Q-J1 yes; Q-J2 fix and finish). F1 Taijutsu I built (0.87.0-alpha.1). Next: F2 Taijutsu II.**

Plan: `docs/STD_SPEC.md` (STD6f: "Every jutsu's riders as Active Effects and elements, emitted by an upgraded importer where the pattern is regular; a review table per section for King"). Same method as the clan pass (`docs/STD6e_SPEC.md`).

## What's there today (survey, 2026-11-22)

| Content | Count | State |
| --- | ---: | --- |
| Jutsu | 968 in 18 sections | All imported from the Jutsu Book by the jutsu importer (`tools/content/build-jutsu.mjs`); none reviewed. |
| Buttons | 1,514 | Save 533, roll 359, attack 287, utility 221, effect 51, damage 46, heal 17. Per-rank buttons carry the upcast dice. |
| Source-only jutsu | 221 | Only the "Resolve the jutsu's source instructions" button. |
| Riders left by hand | 664 | The importer's note "Conditional rider instructions are preserved; choose the applicable source activity manually" (Combo, Finisher, Chain, stance-gated and keyword-gated lines). |
| Rider fields | Chain 203, Finisher 49, Overcharge 23 | Parsed into the jutsu's fields; most still need their effects as data. |
| Jutsu Amps | 49 jutsu start an Amp | The Amp cards exist (AMP1). |
| Name tests | The Fury tracker's visibility (`view-models/combat.mjs`: an item's name or text mentions Fury) | STD6a I3 left it to this pass. |

| Discipline | Section | E | D | C | B | A | S | Total |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Taijutsu | General | 1 | 51 | 39 | 29 | 16 | 10 | 146 |
| Bukijutsu | Shinobi Basics | – | 21 | 17 | 12 | 10 | 8 | 68 |
| Bukijutsu | Blade | – | 10 | 9 | 8 | 5 | 3 | 35 |
| Bukijutsu | Flail | – | 9 | 8 | 8 | 5 | 3 | 33 |
| Bukijutsu | Polearm | – | 11 | 7 | 6 | 6 | 3 | 33 |
| Bukijutsu | Power | – | 9 | 8 | 5 | 5 | 3 | 30 |
| Bukijutsu | Ammunition | – | 18 | 13 | 11 | 7 | 4 | 53 |
| Ninjutsu | Non-Elemental | 10 | 30 | 15 | 15 | 10 | 6 | 86 |
| Ninjutsu | Medical Release | 1 | 25 | 19 | 11 | 7 | 5 | 68 |
| Ninjutsu | Earth Release | – | 22 | 14 | 8 | 7 | 3 | 54 |
| Ninjutsu | Wind Release | – | 21 | 13 | 8 | 6 | 2 | 50 |
| Ninjutsu | Fire Release | – | 19 | 12 | 10 | 7 | 3 | 51 |
| Ninjutsu | Water Release | – | 20 | 13 | 8 | 5 | 4 | 50 |
| Ninjutsu | Lightning Release | – | 15 | 13 | 7 | 6 | 3 | 44 |
| Genjutsu | Phantasm | 3 | 22 | 10 | 8 | 5 | 5 | 53 |
| Genjutsu | Hallucinogenic | – | 10 | 6 | 3 | 2 | 1 | 22 |
| Genjutsu | Psionic | 3 | 16 | 6 | 8 | 1 | 2 | 36 |
| Genjutsu | Trickery | 7 | 24 | 12 | 7 | 2 | 4 | 56 |

## How a section is done

- **One table per section:** `content/automation/jutsu/<discipline>-<section>.json`, one entry per jutsu, keyed by identifier, with the same entry keys as the clan tables (`status`, `rules`, `activities`, `castOptions`, `pools`, `effects`, `dropEffects`, `duration`, `flags`, `system`).
- **Applied by** `node tools/content/apply-automation.mjs` (it learns the jutsu pack), after the importer, so a rebuild of the pack keeps the reviewed data. `npm run check` fails when a jutsu in a done section has no entry, an entry is invalid, or the table isn't applied.
- **Reviewed:** every jutsu in a done section is marked `flags.n5e.reviewed`, so its text is display only (no guessed buttons at play time).
- **Riders as data:** Combo, Finisher, Chain, Overcharge, stance-gated and keyword-gated lines become cast dialog options or their own buttons with conditions, saves and damage as data; what can't be automated goes in the jutsu's notes (King Q-STD6).
- **Upcasts:** every per-rank button keeps its upcast dice; an upcast that only changes text becomes a note.
- **Review table per section:** `docs/jutsu/<discipline>-<section>-automation.md`, jutsu by rank then document order, with status, what's automated and what stays at the table.
- **Statuses:** automated, partly automated, notes only, no mechanics (as STD6d and STD6e).
- **Past rulings carried over without asking again:** an Amp copy in a jutsu's text is removed when the Amp card exists (Q-E12); one roll dealt as two types is `alsoAs` (Q-E20); the Ammunition die steps down per the Bukijutsu rules (Q-E16); the jutsu Amp decisions (Hijutsu aren't Clan Amps; jutsu Amps stay typeless; an upcast that changes an Amp gets its own card per rank; temp-HP-with-rider jutsu are Amps; 8-hour AC jutsu aren't Amps).
- **Summons:** a jutsu summon is built from its stat block; a missing or incomplete one goes in the held stat blocks table (`docs/STD6e_SPEC.md`, H-numbers carry on).
- **Text issues** go on the errata list; unclear mechanics become questions, checked against earlier specs first.

## Proposed batches (one release each)

| # | Batch | Sections | Jutsu |
| --- | --- | --- | ---: |
| F1 | Taijutsu I | General, E- to C-Rank | 91 |
| F2 | Taijutsu II | General, B- to S-Rank | 55 |
| F3 | Bukijutsu I | Shinobi Basics, Blade | 103 |
| F4 | Bukijutsu II | Flail, Polearm | 66 |
| F5 | Bukijutsu III | Power, Ammunition | 83 |
| F6 | Ninjutsu I | Non-Elemental | 86 |
| F7 | Ninjutsu II | Medical Release | 68 |
| F8 | Ninjutsu III | Earth Release, Wind Release | 104 |
| F9 | Ninjutsu IV | Fire Release, Water Release | 101 |
| F10 | Ninjutsu V | Lightning Release | 44 |
| F11 | Genjutsu I | Phantasm, Hallucinogenic | 75 |
| F12 | Genjutsu II | Psionic, Trickery | 92 |

## Engine additions

| # | Addition | Behaviour |
| --- | --- | --- |
| F-D1 | Jutsu tables | `content/automation/jutsu/<discipline>-<section>.json` over the section's folder in the jutsu pack; review tables `docs/jutsu/`. |
| F-D2 | Fury tracker from data | A jutsu or stance that gains or spends Fury says so in its data (`flags.n5e.trackers: ["fury"]`); the tracker's name-and-text test is removed from `view-models/combat.mjs`. |
| F-D3 | Conditions with no save | An effect button's `inflicts` (`[{key, kind, ranks}]`) puts conditions and states on its targets with no save ("knocked Prone", "Bruised and Staggered"); for a creature you don't own it goes through the GM's client with no approval step (owner intent `inflictConditions`). Built in F1. |
| F-D4 | [Unarmed damage] in healing | A heal's formula can use `@unarmed` (Iron Guard's temporary hit points: twice your [Unarmed damage] + your level). Built in F1. |
| F-D5 | More as needed | Anything a section needs that the engine can't do yet is listed here before it's built. |

## King's answers (2026-11-22)

- **Q-J1:** yes: the batches and order as proposed.
- **Q-J2:** keep the importer's correct buttons; fix and finish the rest.

## F1 Taijutsu I (0.87.0-alpha.1)

Review table: `docs/jutsu/taijutsu-general-automation.md` (91 jutsu: 85 partly automated, 6 notes only). Table: `content/automation/jutsu/taijutsu-general.json` (ranks E, D, C).

- **Kept** (Q-J2): the Beast Fist Amps and Royal Flush's Amp; the importer's buttons were right.
- **Fixed and finished:** every attack's number of attacks and its [Unarmed damage] plus dice; saves with what a failure inflicts; Finisher versions as their own buttons ("Finisher: …"); Combo, stance and target requirements in the button text; per-rank buttons with the upcast dice, die steps (Bolting Blossom, Straight Impact) and extra attacks (Noble Impact, Avalanche Dance, Flowing Water: No Beat, Prideful Assault); no-save conditions as effect buttons (F-D3); self bonuses as effects (Brace, Mirage Blitz, Iron Guard, Erratic Combo, Heat Up, Welter Move, Safety Release).
- **Notes only:** Howling Knuckle, Combat Clone, Evening Heavenly Crush, Fierce Snake, Late Death, Phantom Mobility (movement and action-economy rules the table runs).
- Also fixed in this release: four Shikigami effect buttons pointed at core conditions as if they were condition cards (Craft II Burned, Bleeding Edge, Sealed Page, Paper Chakram's Bleed); they now use F-D3.

## Text issues found in F1

- Already on the errata list: Fury Kick ("1d4 or 1d6"), Butterfly Kick ("2d4 or 1d8"), Iron Strike and Dragon Tail Foot (+1d8 on d6 dice) upcasts; Cyclone Surge's Mobility "keyword"; Royal Flush (C-Rank) upcast "above D-Rank"; Seikuken Goitsu "Tin and Tang" and Exposed (not a condition); Late Death "fails 0 death saving throws"; Leaf Sky Breaker's two Finisher grants; Whirlwind Snap's "triggering creature"; Moonlight High and Pressure Point Barrage have no upcast; Leaf Kick "1 rank of Slowed"; Dempsey Roll's trigger; Friction "can make spend"; Fist Slam "10-feet- into"; Draw "As a as a reaction".
- New: Swallow Dance, Break Spiral and Scattering Wave have no success result; Prideful Assault holds a "Character Art / Credits" line; Clawing Swift Fang "You a dash"; Feather Combo "attacks targeting."; Heavy Jolt "of your of your"; Leaf Hurricane "pushed 30 away" and Twin Heavenly Swallow "pushed 20 away" (feet); Grass Palm's save has no "on a failed save".

## Progress log

- 2026-11-22 King: "Next batch" (after STD6e E8). Claude: spec proposed from a survey of the jutsu pack. Nothing built.
- 2026-11-22 King: "QJ1. Yes. QJ2. Fix/Finish the rest. Next Batch". Claude: F1 Taijutsu I built (91 jutsu); F-D3 (no-save conditions) and F-D4 ([Unarmed damage] in healing); published 0.87.0-alpha.1.
