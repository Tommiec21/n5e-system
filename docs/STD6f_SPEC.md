# STD6f function spec: jutsu as data

Status: **Approved by King 2026-11-22 (Q-J1 yes; Q-J2 fix and finish). F1 Taijutsu I (0.87.0-alpha.1) and F2 Taijutsu II (0.88.0-alpha.1) built: Taijutsu is done. F3 Bukijutsu I (0.89.0-alpha.1) F4 Bukijutsu II (0.90.0-alpha.1) and F5 Bukijutsu III (0.91.0-alpha.1) built: Bukijutsu is done. F6 Non-Elemental (0.92.0-alpha.1) F7 Medical (0.93.0-alpha.1) F8 Earth + Wind (0.94.0-alpha.1) F9 Fire + Water (0.95.0-alpha.1) and F10 Lightning (0.96.0-alpha.1) built: Ninjutsu is done. F11 Phantasm + Hallucinogenic (0.97.0-alpha.1) built. Next: F12 Psionic + Trickery.**

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

## F6 Ninjutsu I: Non-Elemental (0.92.0-alpha.1)

Review table: `docs/jutsu/ninjutsu-non-elemental-automation.md` (86 jutsu: 43 partly automated, 43 notes only). Table: `content/automation/jutsu/ninjutsu-non-elemental.json`.

- **Summons built** (`tools/content/build-summons.mjs`, folder Ninjutsu > Non-Elemental), from the Summon Stat Blocks section of the source book: Ink Bat/Snake, Ink Reptile, Ink Predator, Inanimate Puppet, Ink Oni and the shared **Clone** (every Clone jutsu; the Earth, Explosive, Water and Lightning Clone adjustments are on its sheet for F8–F10). Each uses your Ninjutsu attack bonus and save DC; AC and hit points grow by the rank you cast the jutsu at. The jutsu's buttons place them (Oni Twins: two, three at S-Rank).
- **Kept** (Q-J2): the Bestial Art: Hunter and Sealing Art: Gift of the Apex Amps (Hunter's loose 2d8 damage button removed; Gift of the Apex's Bull's Rush and Cat's Pounce rebuilt with their ability modifiers and saves).
- **Fixed:** buttons that applied the wrong thing: Sealing Art: Reject (the held object is Sealed, not the creature), Curse of the Prey (no Prone), Banishing Seal (2 Sealed when it returns, not on the failed save), Hex (counts as 1 Sealed; not a real Sealed), Sealing Art: Void (the Charisma save pulls; the damage and Restrained are for being inside).
- **Upcasts:** Arms of Buddha (+1d8 at C, a second attack at B, Fists of Peace at A, +1d8 more at S), Body Flicker's speed, Chakra Shield's temporary hit points, Chakra Skin's temporary hit points, Crown of Shining Stars' strike, Thunderous Screech's Dazed, Fracturing Splinter's Sealed, Splinter's 2 Sealed, Substitution Technique's AC and paper tag, Sealing Weapon's riders, Lion Mane's Bleed.
- **Notes only:** utility, sensory, travel and ritual jutsu (43), including the Flying Thunder God jutsu and Summoning Technique (Sage Beasts: the Summoning section, not this table).
- **By hand:** Chakra Skin's AC formula, Rasengan's nature release options, Life Transference's healing (twice the damage), the Clone's Ninjutsu modifier on Clone Strike, the Inanimate Puppet's number of Slams (the jutsu's rank).
- **No new holds:** every summon's stat block is complete.

## Text issues found in F6

- Ink Predator: Roar gives "2 ranks of Fear" (no such condition; built without a condition).
- Ink Predator and Beast Imitating Art: Predator (C-Rank): the stat block grows "for every rank above D-Rank"; Ink Oni (A-Rank jutsu) grows "above B-Rank". Built as written.
- Ink Bat/Snake: CHA modifier +5 with a −5 save (likely −5). Built as written.
- Ink Bat/Snake: "the Rodent can attempt to Restrain them both".
- Ink Reptile: Stampede "or half as much on a failed save"; Inky Screech "excluding its summoning".
- Ink Oni: Maul has no attack bonus in the block (the jutsu: your Ninjutsu attack bonus).
- Summon stat blocks: "Construct, unaligned" (5e leftover); saves listed lower than the modifiers.
- Beast Imitating Art: Reptile: "The Ink Bat/Snake uses…"; "Pidgeon".
- Excellent Chakra Spears: "9d6 damage" with no damage type.
- Shadow Shuriken Technique (D-Rank): upcast "above C-Rank" (built literally: +1d6 from B-Rank).
- Sealing Art: Circle of Defiance: "end a jutsu with the seal of resistance" (it grants temporary hit points).
- Sealing Art: Hex: "cursed" for "Hexed"; Death "for every rank about C-Rank".
- Darkvision: "you 60ft of Darkvision"; "every rank about C-Rank".
- Finger Carving Seal: "worlds" (words).
- Life Transference, Sealing Weapon, Warding Seal: the upcast runs into the paragraph.
- Sealing Art: Chakra Dispel: "Sealed, Sealed"; "seal of Dispis".
- Sealing Art: Commune: "You the most correct answer possible".
- Flying Thunder God jutsu: "Sealing Art: Chakra Seal" (the jutsu is Sealing Art: Chakra Mark); Barrier: "Sealed Art".
- Arms of Buddha: "that you can seem".
- Touch of Death: "a willing creature" then "an unwilling creature".

## F7 Ninjutsu II: Medical (0.93.0-alpha.1)

Review table: `docs/jutsu/ninjutsu-medical-release-automation.md` (68 jutsu: 52 partly automated, 16 notes only). Table: `content/automation/jutsu/ninjutsu-medical-release.json`.

- **Summon built:** the Supreme Poison Deity (Summons > Ninjutsu > Medical Release), from the Summon Stat Blocks section: AC 22, DR 8, 90 hit points, Huge; your Ninjutsu attack bonus and save DC; its initiative bonus linked to your Ninjutsu modifier + proficiency bonus.
- **Kept** (Q-J2): the Acid Armor, Grim Mask, Medical Aura, Investiture of Acid, Strength of 100, Aura of Power and Strength of 1000 Amps (Strength of 100's loose 2d8 roll removed; the others' extra buttons rebuilt).
- **Fixed:** attacks the import made saves (Wounds, Chakra Needles, Grim Blade); damage put on the wrong save (Ensnaring Strike's start-of-turn poison, Water to Acid's submerged acid); wrong conditions (Corrosive Plume's 5 Envenomed); loose rolls turned into damage, healing and temporary hit point buttons.
- **Upcasts:** Acid Armor (temporary hit points, armor acid, Acid Tail), Acid Whips (attacks and the Grappled damage), Adept Healing (all three versions), Necrosis (B-Rank burst), Corrupted Weapon, Healing Elixir, Infectious Acidic Blood (acid and the infections), Wounds (Bleed ranks), Venomous Shards (Envenomed), Spore Caller (B-Rank save), Blood Rot Curse (S-Rank acid blood), Virtue (by level).
- **Notes only:** utility, sensing, revival and ritual jutsu (16).
- **By hand:** damage type choices (Corroding Blast, Corrupted Weapon, Blood Rot Curse), Vampiric Touch's half healing, Grim Reality's cloak AC, the Infectious Acidic Blood infections, Healing Wave and Heal (split healing).
- **No new holds:** the Supreme Poison Deity's stat block is complete.

## Text issues found in F7

- Already on the errata list: Ray of Sickness (C-Rank in the D-Rank section); Blood Rot Curse (B-Rank) upcast "above C-Rank"; Acid Whips "Once per Creatures you hit"; Body Pathway Derangement "Up to 1 minute" without Concentration; Healing Elixir lists "Invisible".
- No success result: Grim Legion, Spore Caller, Corrosive Plume, Wither and Bloom (damage).
- Chakra Needles: "Make a ranged Ninjutsu check" (an attack). Wounds: "range ninjutsu attack".
- Honey Bee Technique: "can also end this condition" (the seized joints aren't a named condition). Reconstructive Hand: "compromised" isn't a condition in the rules.
- Grim Legion: upcast grows "the size of the cube" (it's a radius).
- Blood Rot Curse: "roll all spent hit die. Recording the result" (the result is never used); "who's hit points".
- Water to Acid: "such as stand on top of it".
- Necrosis: the B-Rank burst's damage isn't stated (built as the jutsu's damage at that rank).
- Upcast runs into the paragraph: Ensnaring Strike, Restorative, Vampiric Touch.
- Adept Healing "15-f00t", "30-f00t"; Necrosis "You infused"; Corrupt Missile "If this jutsu its cast"; Corruption "designed spread", "All creature who begins"; Venom Shock "un controllable"; Wither and Bloom "All creature of your choice"; Acidic Bolt "much make"; Infectious Acidic Blood "would attack to move"; Play Dead "when you case"; Poison Mist "begins to reeling"; Spore Caller "first enter your, poisonous aura"; Dead Heartbeat "can only be temporarily be"; Death Ward "talesman"; Reconstructive Hand "affect"; Venom Sphere "a ball of acidic point", "Creatures who that"; Regenerate "dull duration", "10 hit point"; Strength of 1000 "jutsu with both the Medical keyword"; Genocide "At the beginning of a creature who fails"; Wall of Bee's (apostrophe).

## F8 Ninjutsu III: Earth + Wind (0.94.0-alpha.1)

Review tables: `docs/jutsu/ninjutsu-earth-release-automation.md` (54 jutsu: 46 partly automated, 8 notes only) and `docs/jutsu/ninjutsu-wind-release-automation.md` (50 jutsu: 41 partly automated, 9 notes only).

- **Summons built** (Summons > Ninjutsu > Earth Release), from the Summon Stat Blocks section: Mud Wolf (AC 12 + your Ninjutsu modifier, 25 + 10 hit points per rank above C; two, +1 per rank) and Stone Dragon (AC 13 + your Ninjutsu modifier, DR 8, 80 + 20 hit points at S-Rank). Earth Clone places the shared Clone (its Earth Clone adjustments are on the Clone's sheet).
- **Kept** (Q-J2): the Jade Devotion, Sand Armor, Diamond Bone Hardening, Zephyr Strike, Wind Rider and Neverending Breath Amps (Jade Devotion's temporary hit points and Diamond Bone Hardening's S-Rank regrowth added).
- **Fixed:** conditions the import applied wrongly: Bottomless Swamp (Dying, Suffocating on the first failure), Cherishing Breezes (Dead and Dying), Vacuum Rain and Vacuum Field (Unconscious on the first failure), Rakshasa Barrier and Whirlwind Spear (every condition at once), Geo Progeniture (Stunned and Petrified on every failure), Star Shatter (Dying), Sand Coffin Binding (its compress damage on the save).
- **Upcasts:** Bedrock Skin, Dominus Banner, Calcite Boons (Stone's Power and Tenacity), Sand Binding (C, B and A riders), Tectonic Stone Spears (Bruised), Resonating Geo Isotoma, Geo Stone Weapon, Crystalized Ascension, Terrashield, Earth-Style Wall, Mud Wolf, Diamond Bone Hardening, Blades of the Wind, Gale Fists, Lion's Roar, Slicing Wind Bullet, Violent Whirlwind, Rakshasa Barrier, Vacuum Shield, Multilayered Gale, Vacuum Blade, Splitting Breeze.
- **Notes only:** utility, sensing and movement jutsu (17).
- **By hand:** Swirl (spreading Elemental conditions), Geo Breastplate's AC and DR, triple falling damage (Thumb of Destruction, Tornado Explosion), Moon Fall's doubled damage, Earth Clone's hit points.
- **No new holds:** both stat blocks are complete.

## Text issues found in F8

- Built on a reading; confirm: Stone Bamboo Shoot "Make a Ninjutsu Attack" (built as ranged); Mud Wolf Bite "+X to hit" and Stone Dragon Bite with no bonus (built with your Ninjutsu attack bonus); Stone Dragon Dust Breath "Recharge 7–8" (kept as written); Mud Wolf and Stone Dragon AC "+ your Ninjutsu ability modifier" (linked as your Ninjutsu attack bonus less proficiency).
- No success result: Partial Assimilation; Rock Tank's Prone save has no "on a failed save".
- Dice mismatch: Sandwich Technique is 2d12 but upcasts +1d6.
- Upcast from the wrong rank: Zephyr Strike (D-Rank) "above C-Rank".
- Lazuli Tusk upcast "the number of Earthen Artifacts you summon" (by how many?).
- Sandstorm upcast "the damage by 1d6 or the number of constructs" (pick one?), run into the paragraph.
- Added/Reduced Weight treats Encumbered as a Physical condition (it isn't one); "Up 1 minute".
- Neverending Breath: concentration up to 1 hour, text "up to 10 hours".
- Moon Fall: the 40-chakra shockwave excludes creatures that escaped, the 80-chakra one includes them; "Upon Competition".
- Stone Dragon block calls it "the Earth Dragon".
- Vacuum Rain: "or half as much damage on a successful save" sits after the suffocation text.
- Bursting Compressed Air: "can't shatters"; no upcast.
- Typos: Calcite Boons "gain advantaged"; Geo Genesis "you chose"; Golden Gems "to enhanced", "in one the following"; Mud Wave "not additional effect"; Mausoleum Rock "affect.."; Geo Stone Weapon "one of your hands are"; Crystalized Ascension "creature's gains"; Earth Clone "weights", "When command"; Geo Progeniture "or more than 1 shard", "each share", "half as much on and"; Sand Coffin Binding "damage that would be dealt to him", "they makes"; Cradle of Jade "When a you"; Crystal Arcanum "within range 30 feet"; Gravity Break "40 wide"; Dust Wind "until the end of their next."; Gryphon's Surge "creature s"; Lion's Roar "benefits of the duration"; Palm Vortex "additional affects"; Whirlwind Spear "longline"; Wind Rider "1 feet"; Vacuum Field "who's hit points"; Splitting Breeze "Infront".

## F9 Ninjutsu IV: Fire + Water (0.95.0-alpha.1)

Review tables: `docs/jutsu/ninjutsu-fire-release-automation.md` (51 jutsu: 41 partly automated, 10 notes only) and `docs/jutsu/ninjutsu-water-release-automation.md` (50 jutsu: 39 partly automated, 11 notes only).

- **Summons built** from the Summon Stat Blocks section: Flame Spider (Summons > Ninjutsu > Fire Release; AC 10 + 2 and 18 + 8 hit points per rank above D), Water Shark (14 + 1 AC and 18 + 10 hit points per rank above D; Piranha Shark places one, Shark Bomb two, three at S-Rank), Medical Jellyfish (12 + 2 AC and 20 + 8 hit points per rank above C) and Supreme Water Lion (AC 23, 105 hit points, Huge) in Water Release. Explosive Clone and Water Clone place the shared Clone. The summon builder's release label is now a parameter (the Fire and Water summons say their own release).
- **Kept** (Q-J2): the Flame Armor, Investiture of Flame, Body of Dawn, Viscous Water Mass and Blessing of Poseidon Amps (their extra buttons rebuilt: Investiture's fire cone, Body of Dawn's blinding light and water damage, Poseidon's tridents).
- **Fixed:** attacks the import made saves (Dolphin Break, Syrup Water Shuriken, Tsunami Mallet, Shark's Maw); wrong conditions (Drown's Dying, Heavenly Mirror of Pain's Sealed, Syrup Water Shuriken's Shaken on every failure, Tsunami Mallet's Grappled, Geo-style conditions on every failure); loose rolls turned into damage, healing and temporary hit point buttons.
- **Upcasts:** every "+1d6 + 1" style upcast grows both the dice and the flat bonus; Blazing Ash Cloud (C-Rank ignite, A-Rank Burned), Phoenix Fire (+2 attacks per rank), Devastating Blaze (Burned), Dragon Flame Bolt (attacks, Dazzled), Flame Coat, Hellfire Rejection (Shaken), Sanguine Weapon (autonomous and Pyronado attacks), Flaming Seals, Heavenly Flame, Dolphin Break and Tsunami Mallet (attacks), Water Shield, Raging Bubble Tide, Foul Legacy, Water Droplets of Change (Reflect), Hydra Scorpion (Shield, Swarm, Symphony), Blessing of Poseidon, Explosive Colliding Tsunami, Tsunami Bow, Shark Bomb.
- **Notes only:** utility, sensing and revival jutsu (21).
- **By hand:** the "near a sufficient source of water" options, Heat Snap's maximum Burned damage, Heavenly Mirror of Pain's shared damage, Delayed Fire Missile's growing dice, die-step increases (Tsunami Mallet, Water Dragon), Pierce DR.
- **No new holds:** all four stat blocks are complete.

## Text issues found in F9

- Built on a reading; confirm: Water Shield (B-Rank +1 AC, S-Rank +2) built as +4 AC at S, DR +2 at C and +2 more at A; Flaming Seals (A-Rank +1, S-Rank +2) built as +2 at A, +3 at S; Tsunami Mallet (+1 attack at B, +2 at S) built as 2 attacks at B and A, 3 at S; Blessing of Poseidon's A-Rank trident bonus built for A and S; Supreme Water Lion Claw and Bite (no bonus in the block) built with your Ninjutsu attack bonus.
- Phoenix Fire: two S-Rank lines (three times, then four times).
- Searing Rush: range "120 Foot Line", text "90 feet long".
- Crimson Butterfly: "On a failed save they take" is cut off.
- Flaming Trap: 5e leftovers ("spell", "spell save DC", "glyph"); "Investigation or Ninjutsu" (Ninshou?).
- Investiture of Flame: a 15-foot cone, then "Each creature in the line".
- Water Droplets of Change (C-Rank): upcast "above D-Rank"; "struct".
- Piranha Shark: an upcast that only raises the cost.
- Water Clone: upcast "and the number of Clones" (no cost); "can on cast".
- Heavenly Mirror of Pain: the last sentences are garbled ("Once the mirror is broken or you dismiss this jutsu as a bonus action. If you do neither…").
- Explosive Colliding Tsunami: A-Rank "only half as much damage on a failed save".
- Drown: "begin to Drown" (drowning isn't a condition; built as Suffocating).
- Supreme Water Lion block: CHA +5 with a −5 save; CON save +5 below its +9 modifier. Flame Spider block: "flame Spider"; Bite "+2 for every rank above D-Rank" (by hand); Flame Web "Recharge 9–10".
- Wall of Water: casting time "1 Action, 1 Reaction"; "a 5d6 Hit points".
- Typos: Fireball "success save"; Dragon Flame Bolt "effected creature" and its upcast split across lines; Fox Fire "3 chakras", "neither you or"; Green Fire "Self(45-Radius)"; Heavenly Prison "S-Rank, and its duration"; Everflame Fruit "who's"; Great Fire Cage "ranks of Burn"; Body of Dawn "effect cause by"; Explosive Clone "the they"; Dolphin Break "On a success you deal"; Shark's Maw "a sharks"; Viscous Water Mass "cast a B-Rank"; Water Formation "up to two twice"; Raging Bubble Tide "Ranging wave"; Hydra Scorpion "for its the duration", "use this, Action"; Blessing of Poseidon "a Atlantean"; Tsunami Bow "have not moves"; Great Shark Bullet "successful on"; Water Dragon "target creature 14d6"; Giant Water Prison Dance "60 radius".

## F10 Ninjutsu V: Lightning (0.96.0-alpha.1)

Review table: `docs/jutsu/ninjutsu-lightning-release-automation.md` (44 jutsu: 39 partly automated, 5 notes only).

- **Summons built** from the Summon Stat Blocks section (Summons > Ninjutsu > Lightning Release): Lightning Beast (AC 14 + 4 and 35 + 7 hit points per rank above B; Kill Switch, Static Rend ×2, Lightning Fang) for Beast Lightning, and Lightning Dragon (AC 22, DR 8, 60 hit points, Large; Lightning Bite, Lightning Breath) for Lightning Dragon's Overcharge. Lightning Clone places the shared Clone.
- **Kept** (Q-J2): the Spark, Jolt, Lightning Chakra Armor and Lightning King's Mantle Amps.
- **Fixed:** Banquet of Lightning and Static Falcon are Constitution saves with half (not bare damage); Lightning Ball is an attack plus a line save; Lightning Claw is Thunder Punch, Lightning Cross and Panther Claw attacks; Shock Whip is an attack, then the save; Lightning Reflex is no longer a save; Mark of Jolts is Jolts damage and a Shocks save; Thunder Tempest, Lightning Wall, Lightning Step, Chained Lightning, Storm Breaker and the A/S breaths save for half; Thunder Bomb has one save per number of Shocked ranks (3d8 to 7d8); Penance is temporary hit points; Raging Storm is an effect (resistances, +20 speed) plus its +2d8; Railgun no longer gives Shocked.
- **Overcharge buttons** (labelled "Overcharge: …"): Banquet of Lightning, Guiding Bolt's line, Lightning Claw's Panther Claw, Shock Whip, Chidori's Raikiri (B-Rank), Lightning Step, Spider Web, False Darkness, Lightning Lily, Lightning Spear, Lightning Dragon (the summon), Powerful Bullet Breath. The rest are notes on the button.
- **Upcasts:** dice per rank throughout; Guiding Bolt (C-Rank Surge and the jutsu-bonus damage, B-Rank Shocked), Lightning Buckler (+4 per rank), Lightning Claw (+1d6 at C and A, +1 attack at B), Lightning Retribution (+3 AC at B, 2 Shocked at A), Shock Whip (+1 target at C, Restrained at B), Chidori (+2d10), Lightning Rod (A-Rank 5d10, 8 DR), Thunder Bolt (B-Rank 3d12, A-Rank Shocked).
- **Notes only:** Lightning Reflex, Lightning Repel, Lightning Speed, Static Sense, Aftershock.
- **By hand:** critical threat range bonuses (Chidori, Lightning Claw, Bang), Pierce DR, Lightning Retribution's dice per instance, Thunder Bomb's splash, Chained Lightning's Overcharge Shocked, Thunder Bolt's 5-foot speed, Thunder Tempest's initiative, Absorb Lightning's temporary chakra, Static Rend's +2 against Shocked.
- **No new holds:** both stat blocks are complete.

## Text issues found in F10

- Built on a reading; confirm: Lightning Lily's "+1d12 per rank" also grows the Overcharge 9d12; Lightning Rod "+2S" read as +2 DR; Mark of Jolts' "1d6 or +1 trigger" left as a choice (dice on the button); Lightning Retribution's +2 AC lasts to the end of the turn; Lightning Shield's immunities and +5 AC built as one effect; Lightning Dragon block CHA +5 with a −5 save and Earth immunity as written; Lightning Beast's Static Rend and Lightning Fang use your Ninjutsu attack bonus.
- Chidori: its Overcharge field holds the upcast sentence ("For each rank above C-Rank…") as a second Overcharge.
- Shock Whip: "half damage on a successful save" after a hit (built as the save's half).
- Thunder Tempest: "are pushed back 10 feet and Shocked" (missing "and"); the import gave no half.
- Railgun: "On a failed a creature"; the import added Shocked (not in the text).
- Kirin: "on a failed Save" twice.
- Lightning Lily: "Select a point you can within range".
- Lightning Wall: "lighting" ×3, "attacks or affects".
- Guiding Bolt: "lighting damage"; "would make gain a jutsu based bonus".
- Lightning Step: "have is knocked Prone".
- Thunder Bolt: "has their legs begins to seize up".
- Typos: Banquet "gain an additional rank"; Lightning Buckler "shields you manifest sits", "can only be take"; Spark "Overcharge … you would take" (it's the target); Chained Lightning "that be targeted"; Lightning Shield "Reaction, to being damaged"; Storm Breaker "is plummeted", "Creatures … is Blinded"; Penance "a creature have"; Jolt "a creature have"; Lightning Chakra Armor "the bonus to attacks" (no attack bonus listed); Raging Storm "until it covering".

## F11 Genjutsu I: Phantasm + Hallucinogenic (0.97.0-alpha.1)

Review tables: `docs/jutsu/genjutsu-phantasm-automation.md` (53 jutsu: 52 partly automated, 1 notes only) and `docs/jutsu/genjutsu-hallucinogenic-automation.md` (22 jutsu: 18 partly automated, 4 notes only).

- **Summon built** from the Summon Stat Blocks section (Genjutsu Summons): Dark Phantasm (Summons > Genjutsu; AC 20, 10 hit points; Claws, Phantom Fangs), linked to your Genjutsu attack bonus and save DC. Dance Macabre places 4.
- **Kept** (Q-J2): the Gaslight, Semblance of Dread and Unlimited Pleasure Amps.
- **Four-tier saves:** every Genjutsu save carries its Critical Success, Success, Failure and Critical Failure text on the button (a plain save reads Critical Success as Success and Critical Failure as Failure). Failure conditions are on the save; Success and Critical Failure conditions are their own effect buttons; damage that differs by tier is one button per tier (Abhorrent Apparition, Effortless Paralysis, Frenzy: Cackle, Maddening Shadows, Unmistakable Fear, Will Breaker, Lotus: Dancing Petals).
- **Fixed:** loose rolls turned into damage, temporary hit point and penalty buttons; Phantom Dragon's Sealed moved from the save to Draconic Madness on a hit (with Demoralized); Mental Prison's 5d10 on either result; Poison Forest's Constitution resave; Frenzy: Mind Burst's attack then save; Catnap, Toad Song and Lotus: Hypnotic Hypnosis apply Unconscious; Parasitic Rider puts your body Prone and Stunned.
- **Upcasts:** Cause Fear (Shaken 2 at B, 3 at S; A-Rank 4d6 at the end of its turns), Frenzy: Mind Burst (+1d8; +1 attack at B and S), Heavenly Worded Song (A-Rank War Song effect), Heroism, Mind-Body Recovery, Maddening Shadows and Unmistakable Fear (+1 die per rank), Poison Forest (+2d8); target, radius and duration upcasts are in the button text.
- **Level scaling:** Feather Burst's 2d4, 3d4 and 4d4 buttons appear at 5th, 11th and 17th level.
- **Notes only:** Mental Clone, Devil Sight, Healed Thoughts, Shared Pain, Slug Dance.
- **By hand:** dice penalties (Bane, Compelled Duel, Zone of Truth), Psychic Malignance, Mind Prison's behavior table, Will Breaker's ability reduction, Toad Song's added modifiers, songs and tunes, upcasting and cost changes on the target's jutsu.
- **No new holds:** the Dark Phantasm block is complete.

## Text issues found in F11

- Built on a reading; confirm: Bane, Flash, Sanctuary, Encroaching Darkness, Lackluster Thoughts, Sleep of the Deep, Snake Play, Lion's Presence, Antipathy/Sympathy, Mental Prison, Poison Forest and Forget Me Not have plain saves; built as four-tier with Critical Success as Success and Critical Failure as Failure; Cause Fear's critical failure +1 Shaken stacks with the B- and S-Rank +1s; Phantom Dragon's Draconic Madness applied as 1 Demoralized and 1 Sealed.
- Soft Spoken Song: the A-Rank War Tune is named but never described (missing piece).
- Devil Sight: a D-Rank jutsu whose upcast says "above C-Rank".
- Antipathy/Sympathy: 5e leftovers ("frightened", "magical", "enchantment"; Frightened isn't an N5e condition).
- Lion's Presence: "the Fear condition" (not an N5e condition); Maddening Shadows: "end the fear condition".
- Zone of Truth: range "15 Foot radius Sphere", text "a 30-foot sphere … within range".
- Maddening Shadows: range "30-foot radius sphere", text "60-foot radius sphere".
- Poison Forest: range "60 Foot Cube", text "30 Foot Sphere"; the Genjutsu save is Intelligence, the resave Constitution.
- Heavenly Worded Song: Ancient Song "until with lowest ranked jutsu".
- Frenzy: Yellow: "causing their eyes to glow green" (Yellow); Frenzy: Blue "on a failed save, they after suffering".
- Mental Taunt: "used features".
- Corruption: Audacity: same opening line as Asperity.
- Lotus jutsu: "a space you can within range", "saving throw to as the pollen", "who's failed".
- Typos: Bane "feel deep seeded"; Bless "deep seeded Pride"; Cause Fear "incents"; Corruption: Mind Mist "Same a failure"; Frenzy: Black "all creatures in the turn initiative, is treated"; Heroism "All willing creatures in range is imbued"; Corruption: Alienation "communicated with"; Effortless Paralysis "Affected creatures mind"; Request of the Damned "who's name"; Shadow Monsters "The select creature"; Will Breaker "they tear the break"; Unlimited Pleasure "recouperation"; Snake Play "under the impression, they"; Medical Release: Healed Thoughts "compose a stimulant"; Chaotic World "Genjutsu’s effects and becomes aware"; Mind-Body recovery "C-Rank of lower".

## Progress log

- 2026-11-22 King: "Next batch" (after STD6e E8). Claude: spec proposed from a survey of the jutsu pack. Nothing built.
- 2026-11-22 King: "QJ1. Yes. QJ2. Fix/Finish the rest. Next Batch". Claude: F1 Taijutsu I built (91 jutsu); F-D3 (no-save conditions) and F-D4 ([Unarmed damage] in healing); published 0.87.0-alpha.1.
- 2026-11-22 King: "Next batch." Claude: F2 Taijutsu II built (55 jutsu): Taijutsu complete; published 0.88.0-alpha.1. No new questions.
- 2026-11-22 King: "Next batch." Claude: F3 Bukijutsu I built (103 jutsu: Shinobi Basics and Blade); F-D5 ([Weapon damage] in damage formulas); published 0.89.0-alpha.1. No new questions.
- 2026-11-23 King: "Next batch." Claude: F4 Bukijutsu II built (66 jutsu: Flail and Polearm); F-D5 adds @wdie (the weapon damage die alone); published 0.90.0-alpha.1. No new questions.
- 2026-11-23 King: "Next batch." Claude: F5 Bukijutsu III built (83 jutsu: Power and Ammunition): Bukijutsu complete; F-D2 (Fury tracker from data; Binding Fury Stance's trigger on its effect); published 0.91.0-alpha.1. No new questions.
- 2026-11-23 King: "Next batch." Claude: F6 Non-Elemental built (86 jutsu); six summons from the Summon Stat Blocks (Ink Bat/Snake, Ink Reptile, Ink Predator, Inanimate Puppet, Ink Oni, Clone); published 0.92.0-alpha.1. No new questions.
- 2026-11-23 King: "Make sure all missing pieces are being recorded in the MD file. Then move on to the next batch." Claude: F1–F6 text issues and built-on-a-reading items added to the context text-issues files (10a, 10b); F7 Medical built (68 jutsu) with the Supreme Poison Deity; published 0.93.0-alpha.1. No new questions.
- 2026-11-24 King: "Next Batch." Claude: F8 Earth + Wind built (104 jutsu) with the Mud Wolf and Stone Dragon; text issues logged in 10a; published 0.94.0-alpha.1. No new questions.
- 2026-11-24 King: "Next Batch." Claude: F9 Fire + Water built (101 jutsu) with the Flame Spider, Water Shark, Medical Jellyfish and Supreme Water Lion; text issues logged in 10a; published 0.95.0-alpha.1. No new questions.
- 2026-11-24 King: "Next batch." Claude: F10 Lightning built (44 jutsu) with the Lightning Beast and Lightning Dragon; text issues logged in 10a; published 0.96.0-alpha.1. No new questions.
- 2026-11-24 King: "Next batch." Claude: F11 Phantasm + Hallucinogenic built (75 jutsu) with the Dark Phantasm; text issues logged in 10a; published 0.97.0-alpha.1. No new questions.
