# NPC review: PF2e's NPC handling, the Bingo Book's adversary design, and a plan

Status: **review and plan for King (2026-11-14). Nothing is built. Questions Q-N1–Q-N6 below.**

King (2026-11-14): review how PF2e handles NPCs, because N5e's NPCs will be closer to them; break down the Bingo Book to understand the structure of NPC design. Everything needed from the Bingo Book ends after the section "Maybe I want to live?".

**Sources.**
- PF2e 8.7.0 source: `actor/npc`, `actor/hazard`, `actor/loot`, `item/melee`, `recall-knowledge.ts`.
- The Bingo Book (King's copy in the ContextFile folder, read 2026-11-14), from "Allies & Adversaries" through "Maybe I want to live?". Tables there sit inside text boxes; `tools/docx-extract.py` reads them.
- N5e 0.28.0-alpha.1: `data/actor/npc.mjs`, which its own header calls a stopgap.

## Part 1: how PF2e handles NPCs

| Area | PF2e |
| --- | --- |
| **Numbers are typed in, not derived** | An NPC's AC, saves, perception, skills, attack bonuses, damage and DCs are entered directly from the stat block. Nothing is computed from ability scores, classes or proficiency. Rule elements and conditions then modify those numbers |
| **Attacks are their own item type** (`melee`) | Name, bonus, damage parts with types, traits, range, and **attack effects**: named riders such as Grab or Knockdown that link to an action on the same NPC and show as notes on the hit |
| **Abilities are action items** | Sorted on the sheet into interaction, defensive and offensive; each has an action cost, traits, frequency and rule elements. Passive abilities are the same item with no cost |
| **Spellcasting entries** | Each tradition/DC/attack is an entry holding spells by rank with uses; innate, prepared, spontaneous, focus |
| **Elite and Weak adjustments** | One click raises or lowers level, HP, AC, saves, attacks, damage and DCs by a fixed table; shown as a labelled modifier everywhere |
| **Variants** | `variantClone` makes a renamed, re-skinned copy; skills can have predicated "special" variants (+2 to Stealth in forests) |
| **Identification** | Recall Knowledge DCs by level and rarity, with the skills that apply, shown on the sheet |
| **Traits, size, rarity, alliance** | Traits drive rule elements and targeting; alliance (party, opposition, neutral) decides who is an ally for effects |
| **Notes** | Public notes, private GM notes, and a one-line blurb |
| **Lootable** | An NPC can be marked lootable (or all are, by setting) and its sheet becomes a loot sheet for players when it dies |
| **Sheets** | A full sheet and a simple sheet; a batch tool resets HP, spell slots and conditions on many NPCs |
| **Hazards** | A separate actor type for traps and hazards: stealth DC, disable checks, hardness and HP, routine, reset |
| **Same engines** | NPC rolls go through the same check, damage, degree-of-success and rule-element engines as characters |

## Part 2: the Bingo Book's adversary design

The Bingo Book replaces challenge rating with a build system. An adversary is assembled from six choices, and every number comes from tables keyed to those choices.

### The profile

| Choice | Values | What it sets |
| --- | --- | --- |
| **Level** | 1–30, one-to-one with player level | Proficiency bonus, the ability modifier line, AC by armor type, damage table rows, trait count, jutsu count and ranks |
| **Class** | Minion, Standard, Elite, Solo | Action economy, HP multiplier, Freeform slots, multiattack, Tenacity and Elite Actions, which damage columns it uses |
| **Role** | Striker, Defender, Lurker, Controller, Supporter (Solos take no Role and may use every Role's traits) | A role bonus and the pool of 30 Role Traits it picks from |
| **Rank** | E, D, C, B, A, S | Hit and Chakra die and HP/CP per level; aura sizes; jutsu ranks it casts; which damage column a Freeform Jutsu uses |
| **Clan / Species** | 40 groups (Aburame … Ōtsutsuki; Aberration, Beast, Construct, Demon, Plant, Undead …) | Access to that clan's Hijutsu and its Adversary Traits (328 trait entries) |
| **Affiliation** | A village or faction | Affiliation Traits |
| **Optional classification** | Iconic, Epic | Extra HP multiplier, AC, attack/DC, ability points, initiative; Iconic Traits |

### The numbers

- **Proficiency and ability modifiers** come from one table by level: a six-value line for Minion/Standard and a higher line for Elite/Solo. The GM may redistribute the total, raise one score by up to +2, or use a lower line.
- **Hit Points and Chakra Points are the same value:** `10 + (Level × Con modifier) + (Level × per-level value for the Rank)`, where the per-level value is E 4, D 6, C 8, B 10, A 12, S 20.
  - Elite ×1.25. Solo ×(1.5 + 0.5 per player). Iconic ×1.5, Epic ×2, both ×2.5.
  - Minion: HP = 10 + Level, no Chakra pool, automatically fails saving throws, AC −2, initiative −2.
  - "Lazy GM" tables give ready-made HP/CP by level.
- **Armor Class** from a table by level and armor type (Light, Medium, Heavy), with DR +3 for Medium and +6 for Heavy. Or computed like a player. Defender +1 AC and +2 DR; Elite +1 AC; Solo +2 AC.
- **Saves** in three grades (best, average, worst); Elite +1, Solo +2, Supporter +1.
- **Attack bonuses and save DCs** per discipline, computed like a player's (proficiency + the ability; 8 + proficiency + the ability), plus a Weapon/Freeform line that may use any ability. Controller +1 save DCs.
- **Role bonuses:** Striker +1 level on damage tables and +2 initiative; Defender +1 AC, +2 DR; Lurker +20 speed, +2 Stealth; Controller +1 save DCs, +2 Chakra Control; Supporter +1 saves, +2 Perception.
- **Trait count:** Solo 3, Elite 2, Standard 1, Minion 0; plus 1 at levels 1–5, 2 at 6–11, 3 at 12–17, 4 at 18+.
- **Jutsu count:** 4 at levels 1–6, 6 at 7–13, 8 at 14–20, 10 at 21+; ranks cast depend on the adversary's Rank.

### How adversaries fight: Freeform

Adversaries don't need named techniques. Three build-your-own tools, each with slots by class and level:

| Tool | Costs | Built from |
| --- | --- | --- |
| **Freeform Strike** | Nothing | Range (melee, or ranged 60 ft); optional rider from the Effects & Conditions table with a save; damage from the Freeform Strike table (Low, Medium, High by level). A Tier 1 rider reads the table 2 levels lower, Tier 2 reads it 3 lower |
| **Freeform Jutsu** (offensive, defensive, support) | Chakra, by rank | Rank (limited by class and level); keywords; range; single target or an area shape; up to 2 extra effects; damage from the jutsu damage tables (Very Low … Very High = D … S rank) at an effective level adjusted by the Damage Penalty table (area −2, Tier 1 effect −1, Tier 2 effect −2, no damage on save +1, lowest attack bonus +1, pre-established effect +1/+2). Defensive: AC, DR (its own table by class and rank), temp HP, resistance, immunity. Support: attack, save, check, AC, damage, speed bonuses, resistance, a heal burst, regeneration |
| **Freeform Ability** | Tenacity (1, 2, 3+ by impact), tagged with a rank and a timing | A non-jutsu trick; 9 worked examples (Rejuvenate, Shinra Tensei, Amaterasu …) |

- **Multiattack** is built in: Minions 1; Standards 1, then 2 at level 6 and 3 at 11; Elites and Solos 2, then 3 at 6 and 4 at 11. Or one attack dealing the combined damage.
- **Effects & Conditions table:** Tier 1 (Bruised, Bleed, Shaken, Weakened, elemental afflictions, Envenomed, Concussed, Demoralized, Sealed, Dazzled, Deafened, Grappled, Prone, AC/DR/speed penalty, roll penalty, push/pull) and Tier 2 (dispel or interrupt, disadvantage, Berserk/Charm/Confused, Blinded, Slowed, Stunned, Exhaustion, Dazed, Staggered, Restrained, action denial).
- **Recovery** from an adversary's condition is one of: take an action, save at the end of the turn, or wait 1–2 rounds.

### Elite and Solo machinery

- **Elite Actions.** An Elite takes 1 per round after a player's or player-ally's turn (plus shared extras for parties above 2 players). A Solo takes one after every player and player-ally in initiative, minus one. Options: Attack, Cast, Command (spend 1 Tenacity to summon Minions), or use an Ability/Trait. Conditions tick on Elite Actions as if they were turns.
- **Tenacity.** Pool: Elite half level (rounded up), Solo full level. Regain 2 at the start of its turn, 1 on any natural 20 or 1, and all of it on a Phase Change. Spend: 1–3 points for 1–3 ranks of Mastery on a check or save (or 1d4 per point), abilities and traits, summoning Minions, 5 to transform early.
- **Phased combat (Solos; Elites optionally).**
  - **Health Gates** at 60% and 30% HP: all effects on it end, it regains 20% Chakra and all Tenacity, and a phase transition plays out (it can't be targeted or act hostilely until initiative count 0; the environment changes).
  - **Healing Surge:** conscious players at or below half HP may spend up to 2 Hit Dice.
  - **Transformation** (or a Battlefield Domain, never both): 2–3 buffs (damage as +2/+4 levels, senses, AC and DR, size, resistances with a new vulnerability, movement, summons, a Rule Break), one exclusive ability, an optional suppression condition; it moves to initiative 99.
  - **Battlefield Domain:** the battlefield takes its own turns (initiative 99, then mid-round), runs a two-step effect cycle, gives the adversary resistance to all damage and to conditions while active, can be studied with skill checks, and has a Counter that switches it off.
- **Minion groups** run three ways from the same stat block: Individuals (shared initiative and one shared Reaction), Collective Turn (one attack roll applied to every chosen target), or Mob (one Large or Huge creature with HP = 10 × Minions + level, losing a Minion per 10 HP, attacking by forcing a save; a Huge Mob is immune to single-target effects).

### Around the adversary

- **Role Traits:** 150 (30 per Role), ranked D to S, with tagged families that share rules: Aura (radius by Rank: 10 ft at D to 30 ft at S), Ambush, Barrier (counts as Ninjutsu/Fuinjutsu), Intercept (10-ft radius), Mark (cleansed like a condition), Strike.
- **Missions.** Rank D–S and tier (Trivial, Moderate, Extreme) set XP, ryo and downtime per player. The XP is a budget for buying encounters: Minions 5, Standard 10 × rank, Elite 25 × rank, Solo 50 × rank; social and environmental encounters 5–15 × rank; combat modifiers (Ambush, Objective, Escort) add more.
- **Social encounters** use the combat action economy with Attitudes (Hostile to Helpful), Points of Agreement and Frustration, Patience, Motivations and Pitfalls.
- **Stat block layout** (from the worked Cultist examples): name; class, size, Rank, Role, affiliation; level and proficiency; AC and DR; HP, CP, Tenacity; speed and initiative; six abilities each with modifier and save; skills; resistances and condition vulnerabilities; senses; traits tagged `[Role]`; jutsu per discipline with attack bonus and save DC, grouped by rank with cost; Freeform jutsu written out in full; attacks with Multiattack.
- **Design philosophy:** narrative over numbers; 30 levels in brackets (Genin 1–6 … Ōtsutsuki 25–30); unique or renamed traits are expected; adversary intelligence follows rank and class; adversaries may flee or surrender.

## Part 3: N5e today, and where PF2e's approach fits

**N5e's NPC today** is a character without a class: level, rank, role, creature type, typed Hit and Chakra dice, optional HP/CP overrides, and a `diesAtZero` switch. Abilities drive everything through the character formulas. There is no adversary class (Minion to Solo), no Tenacity, no Elite Actions, no Freeform items, no Role or clan traits, no phases, and no NPC pack.

**Where the two sources agree.** The Bingo Book is close to PF2e in the ways that matter for the build:

| PF2e | Bingo Book | Consequence for N5e |
| --- | --- | --- |
| Numbers typed in from the stat block | Numbers from tables, then adjusted by hand | NPC statistics are **stored values**, not derived from character formulas |
| `melee` attack items with attack effects | Freeform Strikes with a rider and a save | A **strike** item type for NPCs |
| Action items with cost and frequency | Traits, Freeform Abilities, Elite Abilities | NPC **ability** items with timing, rank and Tenacity cost |
| Elite/Weak one-click adjustment | Class, Rank, Iconic and Epic multipliers | **Adjustments** applied as labelled modifiers |
| Spellcasting entries with DC and attack | Jutsu per discipline with attack and DC, plus Freeform Jutsu | Per-discipline **casting lines**; Freeform Jutsu as NPC-only jutsu items |
| Recall Knowledge DCs | Read the Enemy, Identify | Identification DCs on the sheet |
| Lootable NPCs, hazards | Traps and puzzles in the mission budget | With LOOT1 and the hazards work |
| Same engines as characters | Same rules, different sources of numbers | NPC rolls keep using the action card, riders and rule elements |

## Proposed batches (each needs its own spec and King's approval)

| Batch | Contents |
| --- | --- |
| **NPC1** data model and sheet | Adversary fields: class, role, rank, clan/species, affiliation, Iconic/Epic; stored statistics (AC, DR, HP, CP, saves, per-discipline attack and DC, skills) with a "calculate from the tables" button; the stat-block sheet in the Bingo Book layout; a simple sheet; public and private notes |
| **NPC2** builder | The Bingo Book tables as data (statistics by level, AC by level, HP/CP, role and class modifiers, trait and jutsu counts); a step-by-step builder that follows the book's steps 1–8; party-size input for Solos |
| **NPC3** Freeform | Strike, Freeform Jutsu and Freeform Ability items; the strike and jutsu damage tables; the Damage Penalty and Effects & Conditions tables; multiattack |
| **NPC4** Elite machinery | Tenacity (pool, regain, spends); Elite Actions in the turn order; Minion groups (Individuals, Collective Turn, Mob); Command |
| **NPC5** phases | Health Gates, phase transitions, Healing Surge, Transformations and Rule Breaks, Battlefield Domains as a combatant |
| **NPC6** content | The 150 Role Traits, the clan/species and affiliation traits, the Elite Abilities, then the book's adversaries as a compendium (through the standardization contract: data, no content named in code) |
| **MISSION1** | Mission rank, tier, XP budget and encounter purchasing; rewards |
| **SOCIAL1** | Social encounters: attitudes, agreement and frustration, patience |

NPC1–NPC3 can come before standardization. NPC4–NPC6 lean on STD1–STD4 (auras, triggers, imposed effects), so they fit best after those.

## Questions for King

- **Q-N1:** Stored or derived? Proposed, as PF2e does: an adversary's statistics are stored values filled in by the builder and editable by hand. Characters stay derived.
- **Q-N2:** Friendly NPCs built "as a PC with average HP/CP" (the book's first Allies option): should those be character actors, with adversary-style NPCs as the NPC actor type?
- **Q-N3:** Solo HP depends on party size (×(1.5 + 0.5 per player)). Should the sheet take a party-size number per adversary, or read the active party?
- **Q-N4:** The book's tables run to level 30. NPC2 would carry all 30 levels. Should NPC levels above 20 be allowed from the start?
- **Q-N5:** Is the batch order right, with NPC1–NPC3 before standardization and NPC4–NPC6 after STD4?
- **Q-N6:** The book's chapters after "Maybe I want to live?" (the nations, clans, Jinchūriki, unaffiliated and legendary adversaries) hold the actual stat blocks. You said everything needed ends before them. Does that mean NPC6 should not import those adversaries, or only that the *rules* end there?

## Progress log

- 2026-11-14 Claude: PF2e NPC source and the Bingo Book's rules section read; plan written. Nothing built.
