# STD6f function spec: jutsu as data

Status: **Approved by King 2026-11-22 (Q-J1 yes; Q-J2 fix and finish). F1 Taijutsu I (0.87.0-alpha.1) and F2 Taijutsu II (0.88.0-alpha.1) built: Taijutsu is done. F3 Bukijutsu I (0.89.0-alpha.1) F4 Bukijutsu II (0.90.0-alpha.1) and F5 Bukijutsu III (0.91.0-alpha.1) built: Bukijutsu is done. Next: F6 Non-Elemental.**

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
| F-D2 | Fury tracker from data | A jutsu or stance that gains or spends Fury says so in its data (`flags.n5e.trackers: ["fury"]`); the tracker's name-and-text test is removed from `view-models/combat.mjs`. Built in F5: the tracker shows when Fury > 0, its maximum is raised, or an item has `trackers: ["fury"]`; Binding Fury Stance's Fury trigger moved from the jutsu (predicated on a stance item it never was) to its concentration effect, so it fires while the stance is up. |
| F-D3 | Conditions with no save | An effect button's `inflicts` (`[{key, kind, ranks}]`) puts conditions and states on its targets with no save ("knocked Prone", "Bruised and Staggered"); for a creature you don't own it goes through the GM's client with no approval step (owner intent `inflictConditions`). Built in F1. |
| F-D4 | [Unarmed damage] in healing | A heal's formula can use `@unarmed` (Iron Guard's temporary hit points: twice your [Unarmed damage] + your level). Built in F1. |
| F-D5 | [Weapon damage] in damage | A damage formula can use `@weapon`: your wielded weapon's die, extra dice and flat bonus (you pick the weapon if you hold several); the part takes the weapon's damage type when it has none, and the weapon's ability modifier. For saves that deal "[Weapon damage] + 1d8 earth" and the like. Built in F3. F4 adds `@wdie`: the weapon's damage die alone ("your weapon damage die + 2d8"), no bonus or modifier. |
| F-D6 | More as needed | Anything a section needs that the engine can't do yet is listed here before it's built. |

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

## F2 Taijutsu II (0.88.0-alpha.1)

Review table: `docs/jutsu/taijutsu-general-automation.md`, now the whole section (146 jutsu: 133 partly automated, 13 notes only); F2 adds the 55 B- to S-Rank jutsu (48 partly automated, 7 notes only).

- **Kept** (Q-J2): the Magnum Knuckle, Supreme Violence and Tiger Lily Amps.
- **Fixed and finished:** as F1: attacks with their number and dice, Finisher buttons, saves with what they inflict, per-rank dice and extra attacks (King's Fang, Leaf Hurricane Bullet, Predators Fang), no-save conditions (Maximum Entry's Bruised, Quaking Leg's Weakened, Owl Drop's grapple, Supreme Pacification, Violent Strangling's Exhaustion, Final Lotus's Prone); Still Earth: Reverb's buffs as an effect; Daytime Tiger's bludgeoning and force on one attack.
- **Notes only:** After Image Technique, Amphibious Gout, Combo Break, Combo Extender, Blue Rose, Red Lotus, White Lily (actions, reactions and Finisher targeting the table runs).
- **No new holds:** no Taijutsu summons a creature.

## Text issues found in F2

- Asakujaku: Morning Peacock gives no damage type; Titan Break "you instead my three"; Dragon Crush "a part of casting" (As a part); Breaker Fist "they are shaken as become Staggered"; Heavenly Foot of Pain's Finisher deals "half damage" of an unstated roll, with its upcast run into the same paragraph; Rabbit Boss Stomp's Finisher ends "and." and its upcast says "1d8 or 1d12"; Leaf Earth Crush and Passionate Dancing Leaf "All creature in in range"; Steel Knuckle "Make a two" and "feed"; Cherry Blossom Impact's save has no "on a failed save"; Night Guy "they take deal"; Supreme Pacification "Strength of Dexterity"; Unpredictable Blows "resist being Physical conditions"; World Breaker's Finisher "until the end of their turns"; Leaf Earth Crush and World Breaker have no success result.

## F3 Bukijutsu I (0.89.0-alpha.1)

Review tables: `docs/jutsu/bukijutsu-shinobi-basics-automation.md` (68 jutsu: 64 partly automated, 4 notes only) and `docs/jutsu/bukijutsu-blade-automation.md` (35 jutsu: 32 partly automated, 3 notes only). Tables: `content/automation/jutsu/bukijutsu-shinobi-basics.json` and `bukijutsu-blade.json` (ranks E–S).

- **Kept** (Q-J2): the Breath of Sound: Score, Guardian Knight, Blade Heart and The Zone Amps.
- **Fixed and finished:** weapon strikes with their number of attacks and extra dice; saves and attacks dealing [Weapon damage] plus typed dice (F-D5); Chain effects as their own buttons ("Chain N: …") with the Chain text on the card; per-rank dice and extra attacks (Breath of Beasts: Fang, Breath of Wind: Claws, Flying Swallow: Penetrate, Twin Rising Dragons, Ichimonji); no-save conditions (Binding Meteor, Killer Bee's Stunned, Shadowfall's Exhaustion); self bonuses as effects (Weapon Deflect, Mikiri Counter, Flurry Guard, Silent Killing, Reapers Swing, Disarming Riposte).
- **Notes only:** Devil's Gambit, Baton Pass, Breath of Sun: Fake Rainbow, Shinobi Cross, Sword Aura: Primary, Sword Aura: Secondary, Three Thousand Worlds (actions, reactions and choices the table runs).
- **By hand:** a chosen damage type (Twin Rising Dragons), Chain-only conditions (the button text says which Chain), "no ability modifier" (Afterglow, Multipoint Strike, Flying Swallow: Penetrate).
- **No new holds:** no Shinobi Basics or Blade jutsu summons a creature.

## Text issues found in F3

- Breath of Earth: Smash and Suicide Bombing "half as much on a failed save / failure"; Nobunaga's Rage upcast "above C-Rank" (it's B); Flying Swallow: Flurry Guard upcast "above B-Rank" (it's C); Breath of Moon: Catastrophe upcast "above B-Rank" (it's A); Grass-Cutting Strike "Male a"; Breath of Wind: Gusts' cost "12 Chakra, Chain"; Sword Aura: Monochrome holds an "Inverted" box; Infernal Slash's upcast runs into Chain 3; Danger Zone's Chain 1 runs into its upcast; Blade of Sin: Pride "Weapon, Ninjutsu…" as a damage type.

## F4 Bukijutsu II (0.90.0-alpha.1)

Review tables: `docs/jutsu/bukijutsu-flail-automation.md` (33 jutsu: 31 partly automated, 2 notes only) and `docs/jutsu/bukijutsu-polearm-automation.md` (33 jutsu: 31 partly automated, 2 notes only). Tables: `content/automation/jutsu/bukijutsu-flail.json` and `bukijutsu-polearm.json`.

- **Kept** (Q-J2): the Warriors Zone, Sparking Flail, Enhanced Blocking, Demon Hunter and Overcomer Amps (Demon Hunter and Overcomer with their other buttons fixed: Overcomer's wrong save removed, its 1d4 kept).
- **Fixed and finished:** weapon strikes with their number of attacks and extra dice; saves dealing [Weapon damage] plus dice; Chain effects as their own buttons; per-rank dice, extra attacks (Holes of Despair, Whip Like Strikes) and upcast riders (Bone Crusher's Prone, Branding Fury's S-Rank save, Bounding Blossom's Weakened, Offensive Dodge's +3 AC, Iron Web Dome's +1d8 and broken-dome damage); twice [Weapon damage] (Chain Kill, Dual Ring, Iron Web Dome); the weapon die alone (Razor's Swift, Merciless Havoc, F-D5 `@wdie`); no-save conditions (Impaler Stab, Heartstopper's Chain 3, Stanchion Sky Pillar's Exhaustion); Abyssal Aura's conditions as effect buttons for its next Flail damage.
- **Notes only:** Iron Web Deflection, Toads Whipping Tongue, Achilles Heel, Hollow Silhouette.
- **By hand:** Branded (not a condition; its effects are on the buttons), the weapon's damage type on untyped dice (Blue Moon's third attack, Dancing Fool's Embrace's tighten), contested checks (Iron Grasp, Hollow Silhouette), AC and DR penalties (Moon-Fang Piercer, Spear Assault), temporary hit points from [Weapon damage] (Bounding Blossom, Offensive Dodge).
- **No new holds:** no Flail or Polearm jutsu summons a creature.

## Text issues found in F4

- Branding Punishment: "two melee taijutsu attack"; its Chain 1 save has no "on a failed save" and its S-Rank line has no period.
- Dancing Fool's Embrace: "weapons ranged" and "no damage of effect".
- Iron Web Dome: "Weapons Damagte".
- Hurricane Flail: "withing".
- Lashing Attack and others: "Weapons damage" / "Weapon's damage" spelled several ways.
- Crucifixion: range "Self (" is cut off.
- Collateral Damage: "Saving thrown"; its success result is unclear about which creature takes half.
- Iron Grasp, Whip Like Strikes, Annihilation, Heartstopper: saves with no "on a failed save" wording; Whip Like Strikes "+10-movement speed".
- Annihilation: "being throw straight back".
- Yosaku Strike and Benthic Descent: the upcast runs into the paragraph; Benthic Descent "conditionas".
- Bounding Blossom and Murderous Stabbing Link: "withing"; Bounding Blossom's A-Rank line says "at A-Rank" (A only, or A and higher?) — built as A-Rank and higher.
- Sun Spear: "Fire damage and on hit."
- All-In Attack: "who case jutsu".
- Ocean Parting: no success result.
- Spear Assault: no success result.
- Merciless Havoc: keywords list Ninjutsu, not Chain, on a Bukijutsu.
- Razor's Swift: "must a Strength saving throw"; range "Weapons reach".

## F5 Bukijutsu III (0.91.0-alpha.1)

Review tables: `docs/jutsu/bukijutsu-power-automation.md` (30 jutsu: 28 partly automated, 2 notes only) and `docs/jutsu/bukijutsu-ammunition-automation.md` (53 jutsu: 46 partly automated, 7 notes only). Bukijutsu is done (6 sections, 252 jutsu).

- **Fury (F-D2):** the Binding Fury jutsu are tagged as Fury users; the tracker no longer appears for Rabbit Fury, Sun Spear and other names or text that merely say "fury". Binding Fury Stance's cast button now starts its concentration effect, which carries the Fury trigger. Fury spends are their own buttons ("Fury: …") or button text; the tracker's − spends it.
- **Fixed and finished:** weapon strikes (melee and ranged) with their number of attacks and extra dice; saves dealing [Weapon damage] plus dice; Chain buttons; per-rank dice, extra attacks (Monkey Kings Fang, Deadly Ranged Connection) and upcast riders (Brutal Block's temporary hit points, Tyger Claws' +2 critical range, Carpet of Steel's 6, Fangs of Medusa's 2d10, Tendon Shot's growing die, Burst Shot); critical-range effects; twice or three times [Weapon damage] (Heaven Earth Impact, Twinshot, Starstream); the weapon die alone (Tendon Shot, `@wdie`); no-save conditions.
- **Notes only:** Binding Fury: Rebound Swing, Monkey Kings Arrogance, Lethal Momentum, Counter Shot and the Mark jutsu (Rundas, Takeminakata's, Apollo's, Artemis's, Ullr; Neith's keeps its Ra detonation button). Marks are still placed from the Marks tracker, which finds them by name (a later STD pass).
- **By hand:** a chosen damage type (Blunt Strike's bludgeoning, Burst Shot's line, Sniper's Focus), the ammunition die's dice (Scattershot), delayed damage rounds (Shadow Eclipse), stacking critical range (Dragon's Roar).
- **No new holds:** no Power or Ammunition jutsu summons a creature.

## Text issues found in F5

- 2-Cross Strike: "two melee taijutsu" (attacks).
- Binding Fury: Demonic Dance, Shadowed Shot, Tyger Claws, Wrecking Ball: the upcast runs into the Chain paragraph.
- Monkey King's Stance: "increase … the Action damage 1d8" (by).
- Earth Breaker: "stand up form this jutsu".
- Castle Crasher: "[Weapons damage + 4d12" (bracket).
- Heaven Earth Impact: "be push 20-feet".
- Moonbane's Wrath: "gains becomes Bruised"; the save sentence runs on.
- Binding Fury: Onibi: "powerful trust".
- Binding Fury: Dragon's Roar: "pent of fury".
- Bite of the Viper (C-Rank): upcast "above D-Rank".
- Collateral Point Strikes: upcast "the damage by 1d4 and max by 1d4" (built as +1d4 damage).
- Retreating Shot: 3d6 base, upcast "+1d10".
- Wrecking Ball: "30-foot lone"; 2d8 base, upcast "+1d10".
- Burst Shot (B-Rank): upcast "above A-Rank" (built as S-Rank only).
- Fangs of Medusa: "Full Moon benefits on a Half Moon / Crescent Moon": no such benefits in the text.
- Fangs of Python: holds the Ullr Ammo "Skadi Marked" box; "they instead being Petrified".
- Tendon Shot: its Chain 2 is Fangs of Python's ("becomes Petrified if they fail by 5 or more").
- Binding Shot: "saving thrown", "the affects".
- Twinshot, Breach-N-Clear: "you [Weapons damage]".
- Starstream (S-Rank): upcast "above A-Rank"; "half as much on a success save".
- Scattershot: "fide spread", "Justus"; "6dx".
- Ullr Ammo's Skadi Marked box is on Fangs of Python, not Ullr Ammo.

## Progress log

- 2026-11-22 King: "Next batch" (after STD6e E8). Claude: spec proposed from a survey of the jutsu pack. Nothing built.
- 2026-11-22 King: "QJ1. Yes. QJ2. Fix/Finish the rest. Next Batch". Claude: F1 Taijutsu I built (91 jutsu); F-D3 (no-save conditions) and F-D4 ([Unarmed damage] in healing); published 0.87.0-alpha.1.
- 2026-11-22 King: "Next batch." Claude: F2 Taijutsu II built (55 jutsu): Taijutsu complete; published 0.88.0-alpha.1. No new questions.
- 2026-11-22 King: "Next batch." Claude: F3 Bukijutsu I built (103 jutsu: Shinobi Basics and Blade); F-D5 ([Weapon damage] in damage formulas); published 0.89.0-alpha.1. No new questions.
- 2026-11-23 King: "Next batch." Claude: F4 Bukijutsu II built (66 jutsu: Flail and Polearm); F-D5 adds @wdie (the weapon damage die alone); published 0.90.0-alpha.1. No new questions.
- 2026-11-23 King: "Next batch." Claude: F5 Bukijutsu III built (83 jutsu: Power and Ammunition): Bukijutsu complete; F-D2 (Fury tracker from data; Binding Fury Stance's trigger on its effect); published 0.91.0-alpha.1. No new questions.
