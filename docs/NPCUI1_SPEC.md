# NPCUI1 function spec: the NPC sheet redesign

Status: **spec written 2026-11-15 (King: "Design a better NPC Sheet"; layout settled on the design canvas "N5e NPC Sheet Redesign"). Awaiting approval.**

Why: NPC1b made the NPC sheet a subclass of the character sheet with a stat-block header on top, so every number showed twice and character-only parts (the Mastery/ASI banner, Will of Fire, the Pinned bar, Hit and Chakra Dice) appeared on adversaries.

## King's answers (2026-11-15)

- Combat, Jutsu and Features fold into the Stat Block tab.
- Keep Short Rest and Long Rest; no Hit or Chakra Dice on NPCs.
- Drop the simple NPC sheet.
- Abilities: each its own box with a labelled MOD and SAVE, 2 rows of 3, on the right; the six statistics (AC, DR, Init, Speed, Prof, Passive Perception) 2 rows of 3 on the left, a vertical divider between.
- Jutsu as small pills (like the players' Combat tab), hover for the details, click to cast; a light left-to-right gradient through each keyword's color in the jutsu's keyword order; grouped by discipline (Bukijutsu inside Taijutsu), then by rank from lowest (E/D) to S; the player sheet's action symbols on each pill; a "Hide color key" toggle (action symbols row above the colors); a discipline with no jutsu is hidden; each discipline can be hidden by hand with its own toggle.
- Colors: Ninjutsu blue, Taijutsu green, Genjutsu purple, Bukijutsu smoke gray, Earth Release brown, Wind Release silver, Fire Release ruby red, Water Release turquoise, Lightning Release gold.

## Functions

| # | Function | Behaviour |
| --- | --- | --- |
| U1 | Own sheet class | `NPCSheet` stops extending `CharacterSheet`; it shares the roll, cast, item and effect handlers through a mixin or shared module. Hazard and vehicle sheets extend the new class. |
| U2 | Header | Token image, name, "Level · Rank · Class Role", blurb line (template, size, clan); Short Rest, Long Rest, an edit button that opens Build (GM). Trackers: HP (current editable, max, temp, bar, Bloodied), CP (same, Drained), conditions (chips and Add). No numbers repeated from the body. |
| U3 | Tabs | Stat Block, Build (GM), Inventory, Effects, Notes. Hazards and vehicles keep their extra tab after Stat Block. |
| U4 | Core panel | Left: AC, DR, Initiative (rolls), Speed, Proficiency, Passive Perception, 2×3. Divider. Right: STR DEX CON / INT WIS CHA boxes, each with MOD (ability check) and SAVE (dark when proficient); every value rolls through the roll dialog. |
| U5 | Stat-block lines | Skills (proficient or bonus-bearing only, "all skills" expands), Disciplines (to hit and DC, linked rolls), Resistances, Immunities, Senses, Languages. |
| U6 | Strikes | Freeform Strikes and weapons as rows: name, reach or range, activation, damage line, Attack and Damage buttons; "+ Freeform Strike". |
| U7 | Jutsu pills | Grouped by discipline (Ninjutsu, Taijutsu, Genjutsu; Bukijutsu jutsu sit in the Taijutsu group, King 2026-11-15, and keep their smoke-gray color), then by rank E→S. Pill: action symbol (`glyph(activation)`), name, CP cost; background `linear-gradient(90deg, …)` through the keyword colors in order (the main discipline first, then its other disciplines and Release keywords as listed); one keyword fades into the paper color. Hover/focus: a dark card with a gradient strip, name, cost, keywords, rank, cast time with symbol, range, duration, roll (attack or save DC), effect summary. Click: cast (the cast dialog). Right-click: the usual menu. Header buttons: color key toggle, "+ Freeform Jutsu", Browse. Each discipline heading: color dot, numbers, count, Hide/Show. Empty disciplines are not drawn. |
| U8 | Toggles remembered | The color key and each discipline's hidden state are kept per user (client setting), so they persist across sheets and reloads. |
| U9 | Features and reactions | Features (template, role, class, clan) as stat-block paragraphs with Use where they have an activity; Reactions likewise. |
| U10 | Build tab (GM) | Identity (name, blurb, type), Bingo Book profile (level, rank, class, role, template, armor, size, party size; "Open Adversary Builder"), ability modifiers with the budget, Numbers (book value as placeholder; typing overrides, clearing restores; overridden values listed), defenses, senses, languages, switches (dies at 0 HP, allied, minion), GM tools (Reset to book numbers, Leave loot, journal stat block, what players know). Player-style NPCs show their level, HP/CP max and ability scores here instead. |
| U11 | Player view | Players without ownership: name, blurb, a condition word (Bloodied, etc.), what they have learned, public notes. No numbers, no Build. |
| U12 | Removed | Character-only parts on NPCs (Mastery/ASI banner, Will of Fire, Pinned bar, Hit and Chakra Dice); the simple NPC sheet (`npc-simple-sheet.mjs`, its registration and template). |
| U13 | Shared keyword colors | The colors live in one config table (`config/jutsu-colors.mjs`) so the player sheet can use them later (not part of this batch unless King says so). |

## Releases

- **NPCUI1a**: U1–U5, U12 (sheet class, header, tabs, core panel, stat-block lines, removals).
- **NPCUI1b**: U6–U9, U13 (strikes, jutsu pills, toggles, features).
- **NPCUI1c**: U10–U11 (Build tab and player view).

## Tests

- View-model tests: core panel values; skill line filter; jutsu grouping (Bukijutsu under Taijutsu, rank order E→S, empty groups dropped); gradient from keywords (order, single keyword fade, Bukijutsu smoke gray, Wind silver); action symbol per activation; Build override list.
- `tests/entry.test.mjs`: one fewer sheet (no simple NPC sheet).

## Questions for King

- **Q-U1:** should the color key start shown or hidden for a new user?
- **Q-U2:** players' Combat tab: use the same keyword colors there too (a later batch)?
- **Q-U3:** a jutsu with several disciplines (say Ninjutsu and Taijutsu): list it once under its main discipline (proposed), or under each?

## Progress log

- 2026-11-15 Claude: spec written from the design canvas. Awaiting answers and approval.
