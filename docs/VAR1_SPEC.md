# VAR1 plan: PF2e optional rules ported to N5e

Status: **King answered Q-V1–Q-V4 on 2026-11-14. Awaiting King's go-ahead to build VAR1a. Nothing is built.**

King (2026-11-14): review PF2e's optional rules and port over as many as possible within the scope of our system, as its own batch.

Source: PF2e 8.7.0 (`system/settings/variant-rules.ts`, `automation.ts`, `metagame.ts`, `homebrew/`, `index.ts`). N5e already has 53 world rules in `config/rules.mjs`.

## PF2e's optional rules and how each ports

### Variant rules

| PF2e rule | What it does | N5e port | Fits? |
| --- | --- | --- | --- |
| Gradual Attribute Boosts | Spreads ability boosts over several levels instead of all at once | **Gradual ability increases:** an Ability Score Improvement's points are handed out one per level over the levels before it | Yes |
| Free Archetype | Extra feat slots for a second track | **Free feat track:** extra feat slots at set levels (GM chooses which levels and which feat group) | Yes |
| Automatic Bonus Progression | Item bonuses come from level instead of magic items | **Automatic gear progression:** attack, AC and save bonuses that High Quality gear and seals would give are granted by level; those item bonuses are then ignored | Yes, needs King's table (Q-V1) |
| Proficiency Without Level | Removes level from proficiency; DCs drop to match | **Flat proficiency:** a GM-set proficiency bonus (fixed, or a slower curve), applied to characters, NPCs and standard DCs | Yes |
| Stamina | HP split into stamina (recovers on a short break) and HP; resolve points | N5e already has a "Stamina pool for limited-use feats" rule with a different meaning. Port as **Vigor**: half of max HP becomes a pool that returns on a Short Rest | Yes, name and numbers need King (Q-V2) |
| Mythic rules | Mythic points, callings and feats | Overlaps Will of Fire variants (Kage Guide) and Iconic/Epic adversaries | Skip unless King wants it |

### World and automation options

| PF2e option | N5e today | Port |
| --- | --- | --- |
| Critical damage rule: double the damage or double the dice | Crits double dice and the ability modifier | **Critical damage rule:** choose double dice (current), double total, or maximize the extra dice |
| Critical hit and fumble deck buttons; draw automatically | None | **Crit and fumble table:** buttons on natural 20 and 1 that draw from a GM roll table |
| Actors dead at 0 HP | `npcDieAtZero`, `instantDeath`, `deathSaves` | Have |
| Encumbrance (apply the condition automatically) | Bulk and slots tracked | **Encumbrance automation:** apply the penalty when over capacity |
| Flanking detection | None | **Flanking:** King approved building it as PF2e does (Q-PF4); as an optional rule here |
| IWR automation on or off | Always on | **Apply resistances automatically:** a switch |
| Lootable NPCs | None | With LOOT1 |
| Reach enforcement | POS1 reach | Have |
| Remove expired effects | Always on | **Remove expired effects automatically:** a switch |
| Rules-based vision | `syncSenses` | Have |
| Show DCs, show outcomes | `challengeVisibility`, `attackRollVisibility` | Have |
| Show roll breakdowns to players | None | **Show NPC roll breakdowns** |
| Hide damage-taken and condition messages for NPCs | None | **Hide NPC damage taken**, **Hide NPC condition messages** |
| Show secret checks | None | **Secret checks:** rolls marked secret go to the GM only (Stealth, Insight, identify) |
| Shared party vision; show party-member stats | Party overview (GM only) | **Shared party vision**, **Party stats visible to players** |
| Tokens determine NPC name visibility | None | **Hide NPC names** in chat and the tracker when the nameplate is hidden |
| Homebrew elements: custom damage types, traits, weapon groups, languages | Keywords and groups fixed in config | **Homebrew elements:** GM-defined keywords, weapon groups, damage types and languages |
| Identify-magic modifier for the wrong tradition | None | With SCROLL1 (identify by the wrong discipline) |
| Token autoscale by size | None | **Scale tokens by creature size** |
| Death icon on defeated tokens | None | **Defeated marker** |
| World clock | World time only | **World clock** window with date and time (with the Tier 3 table procedures, or here) |
| Earn income | Downtime in the Bingo Book mission rewards | Later, with missions |

## Proposed batch

**VAR1a** (settings only, no new engines): critical damage rule, apply resistances automatically, remove expired effects automatically, show NPC roll breakdowns, hide NPC damage taken, hide NPC condition messages, hide NPC names, secret checks, shared party vision, party stats visible, scale tokens by size, defeated marker, encumbrance automation.

**VAR1b** (character-build variants): gradual ability increases, free feat track, flat proficiency. Automatic gear progression, Vigor (PF2e Stamina) and Mythic rules are dropped (King Q-V1–Q-V3: ignore).

**VAR1c:** crit and fumble table, homebrew elements, world clock.

Flanking goes with the PF2e-emulation work King approved (Q-PF4). Lootable NPCs go with LOOT1.

Each option is a world rule, off by default so existing play doesn't change, and is recorded in `docs/RULES_MAP.md`.

## King's answers (2026-11-14)

- **Q-V1:** ignore. Automatic gear progression is not ported.
- **Q-V2:** ignore. PF2e's Stamina (Vigor) is not ported.
- **Q-V3:** ignore. Mythic rules are not ported.
- **Q-V4:** yes. The three sub-batches are right, minus the dropped rules.

## Progress log

- 2026-11-14 Claude: plan written from the PF2e source. Nothing built.
- 2026-11-14 Claude: King's answers recorded; automatic gear progression, Vigor and Mythic dropped from VAR1.
