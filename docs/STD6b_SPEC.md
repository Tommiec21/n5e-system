# STD6b function spec: stances as data

Status: **King 2026-11-15: "QS1. Correct. QS2. Every one. QS3. Notes for now. Try to automate later. Approved." Built and published `0.47.0-alpha.1`.**

Plan: `docs/STD_SPEC.md`, STD6b. The contract: every mechanic is data (rule elements, activities, effects); what can't be automated is a **note** on the stance's Notes tab (King Q-STD6), never left only in the text. No rule changes.

## Today

- 24 stances. Data already: the unarmed die and type (`unarmedDie`, `unarmedAlt`), the stance weapon die, 16 stances' strikes as activities (Bleeding Edge, Reaping Swing, Savage Attack, Guardian Strike, Bone Breaking Strike, Roaring Strike, Opposite End and Sweeping Attack, Raiding Strike, Bunny Roundhouse, Serpent Grasp and Rattle, Pinpoint Shot, Assassination Strike, Titan Guard, Flutter Attack, Wolf Fang Fist, Drunken Fist's reduction), Rabbit Fist's speed and Titan Fist's Reinforced effects.
- Everything else is only in the text.

## Engine additions (generic, no stance named)

| # | Addition | Behaviour |
| --- | --- | --- |
| E1 | Stance weapons | A stance lists the weapons that qualify for it: `system.qualifies {groups: [...], properties: [...], items: [...]}`. Predicate options for an attack: `weapon:stance` (the weapon qualifies for the active stance), `weapon:group:<g>`, `weapon:property:<p>`. |
| E2 | Attack facts | `attack:opportunity` on Opportunity Attacks; a `criticalHit` trigger event (fires on a critical hit, with the target). |
| E3 | Reroll low damage dice | A damage element `rerollBelow: n`: dice showing n or less are rerolled once, keeping the new result (Foundry `ro<=n`). |

## The stances (proposed)

**Element** = automated by data; **Note** = on the Notes tab for the table.

| Stance | Element | Note |
| --- | --- | --- |
| Blade (Ronin: Blade group) | Advantage on Opportunity Attacks with a Ronin weapon; a critical hit with one gives the target 1 Bleed (trigger) | Hostile Mobility (M) casters provoke Opportunity Attacks; Bleeding Edge's +2 per Bleed rank; 10th level |
| Bombardment | — | Lingering Instant areas; one creature immune; Motion Wave |
| Conduit | — | Reaction resistance to damage matching an affinity; Chakra Control check for advantage; concentration upkeep −1 with two Release jutsu; Elemental Discharge |
| Construct | — | Downcast construct weapons; larger walls; Polymerization |
| Drunken Fist | (unarmed die: data) | Taijutsu reactions can't be reacted to; 5th-level disadvantage and retaliation; 10th level |
| Flailing (Reaper: Flail group) | — | Reaction Opportunity Attack when missed; 5th level |
| Frog Fist | (unarmed die: data) | Bypass interceptors; 5th-level leap; 10th-level range +10 ft and leap attack |
| Great Weapon (Berserker: Heavy property) | Reroll weapon damage dice of 1 or 2 once (E3); a critical hit doubles the ability modifier too | Cleave half damage to adjacent hostiles |
| Guardian (Stalwart: Blocking property) | Dodging: advantage on Str and Dex saves | Interpose reaction and its Opportunity Attack |
| Iron Fist | (unarmed die: data) | Unarmed attacks gain Heavy without the Str requirement; 10th level |
| Lion Fist | (unarmed die: data) | +1 to resist Demoralize and Shaken; Demoralize with the unarmed bonus; 5th and 10th level |
| Neurologist | — | Remake a missed Genjutsu attack; critical hits deny reactions; Double Frequency |
| Polearm (Lance: Polearm group) | — | Opportunity Attacks on entering reach; push instead of damage |
| Power (Raid: Power group) | A critical hit with a Raid weapon gives the target 1 Bruised (trigger) | Ready-action attack knocks Prone; Heavy without the Str requirement |
| Psion | — | Int saves become Str saves; d4 penalties; Psionic Payload |
| Rabbit Fist | (speed: data) | No Opportunity Attacks from creatures it damaged; 10th-level leap |
| Scroll Fist | — | Melee Combat Scroll attacks; 5-ft casting with +1d12; Twin Scroll Fist |
| Sensory | — | Hidden attackers can't surprise or gain advantage against it or allies within 5 ft; Sense Minor Chakra; Lock On |
| Serpent Fist | (unarmed die and type: data) | −1 to the next d20 after a hit; 5th-level grapple uses |
| Sharpshooter (Bullseye: Ammunition or Thrown) | — | Long range as normal range; +1 crit and Pierce 4 vs unaware or hidden targets; divert reaction |
| Silent Killing (Assassin: Iron Claw, Deadly or Hidden) | (unarmed die and type: data) | Pierce half DR and +1 crit while hidden |
| Titan Fist | (Reinforced: data) | Reinforced can't be reduced; 10th-level Attack after Titan Guard |
| Two-Weapon (Dancer: Light or Multiattack in each hand) | — | Multiattack adds the ability modifier; both weapons on Opportunity Attacks; Dash attack |
| Wolf Fist | (unarmed die: data) | Battle cry +1 (+2 at 10th); 10th-level three attacks |

Each note keeps the level it starts at. The level-gated parts become effects with the level range (`flags.n5e.levels`), so they appear only from that level.

## Questions for King

- **Q-S1: stance weapons.** From the stance text: Blade = Blade group (Ronin), Flailing = Flail group (Reaper), Polearm = Polearm group (Lance), Power = Power group (Raid), Great Weapon = Heavy property (Berserker), Guardian = Blocking property (Stalwart), Sharpshooter = Ammunition or Thrown (Bullseye), Two-Weapon = Light or Multiattack in each hand (Dancer), Silent Killing = Iron Claw, or a Deadly or Hidden weapon (Assassin). Correct?
- **Q-S2: Great Weapon's reroll.** "Reroll a 1 or 2 on the [Weapon Damage] die, keeping the second result": every weapon damage die (as built), or only one die per attack?
- **Q-S3: notes or more automation.** Most stance benefits are table calls (movement, reactions that redirect, area shapes). Is notes-on-the-Notes-tab right for those, or are there any you want automated now?

## Progress log

- 2026-11-15 Claude: spec written from the stance text. Awaiting answers and approval.
- 2026-11-15 King: Q-S1 correct; Q-S2 every weapon damage die; Q-S3 notes for now, automate later. Approved.
- 2026-11-15 Claude: **built, published 0.47.0-alpha.1.**
  - E1: `rules/stance-weapons.mjs` (`qualifiesForStance`, `weaponFacts`). The list is at `flags.n5e.qualifies` (not `system.qualifies`: like the stance's other data flags, no schema change). Attack specs carry `facts`; `rules/elements.mjs rollOptions` adds them. The card damage roll carries the weapon's facts too.
  - E2: `attack:opportunity` on Opportunity Attacks (`workflow/attack.mjs`); `criticalHit` in `ELEMENT_EVENTS`, fired by `dice/roll.mjs` on an attack whose natural roll is in its critical range, with the roll's target or the one targeted token.
  - E3: `rerollBelow` (Foundry `r<=n`, the reroll-once modifier; the spec's `ro` is not Foundry syntax), applied by `shapeDice` to the first damage part. Great Weapon's old `flags.n5e.weaponDie` (`r<3`) and its code in `weaponAttackSpec` are removed.
  - Great Weapon's "double your ability modifier on a critical hit" is a note: King's critical damage ruling already doubles the modifier for every critical hit, so it changes nothing.
  - Level-gated notes and Blade's 10th-level Bleeding are transfer effects on the stance with `flags.n5e.levels {min}` (and `flags.n5e.std6b`).
  - Tests: `tests/core/stances.test.mjs` (6). Suites: 561 (559 pass, 2 skipped) and 169 pass.
