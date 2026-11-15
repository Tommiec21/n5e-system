# NPC1c function spec: closing the NPC sheet gaps

Status: **Approved by King 2026-11-14 (with ROLL1). Published `0.31.0-alpha.2`.**

King (2026-11-14): anything missing from the NPC sheets that is relevant goes into a batch for future inclusion. Source: `docs/NPC_SHEET_REVIEW.md` (dnd5e 6.1.0 and PF2e 8.7.0 against N5e 0.30.0-alpha.2), items 1–11. Items already owned by a planned batch stay there (boss resources NPC4, strikes NPC3, loot LOOT1, trait content NPC6).

## NPC1c-a: defenses, senses and switches

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| A1 | Defenses block | `templates/actor/npc/build.hbs`, `view-models/npc.mjs` | On the Build tab, for both builds: resistances, immunities, vulnerabilities (damage types), condition immunities and condition resistances. Pick from the system's lists; each shows as a removable chip. Writes the existing fields (`system.traits.resist`, `immune`, `vuln`, `conditionImmune`, `conditionResist`), which damage and conditions already read. |
| A2 | Senses and languages | same | Senses (the existing `system.traits.senses` fields, each with a range) and languages (`system.traits.languages`). |
| A3 | Size and speeds | same | Size select; walk, climb, swim, fly, burrow and hover. For an adversary the walk speed here is the base the Role bonus and the speed override apply to. |
| A4 | Switches | same | "Dies at 0 Hit Points" (`system.diesAtZero`) and Allied (`system.allied`), with a line saying what each does. |
| A5 | Stat block lines | `templates/actor/npc/stat-block.hbs` | The book's lines, shown only when filled: Resistances, Immunities, Vulnerabilities, Condition Immunities, Condition Resistances; Senses (special senses, then passive Perception); Languages; every speed. Appears in the header, the simple sheet and the journal stat block (C1). |
| A6 | Rest buttons | `templates/actor/npc/header.hbs` | Short Rest and Long Rest on the NPC header, calling the existing rest workflow. Shown for player-style NPCs and Allied NPCs (Q-N18). |

## NPC1c-b: simple sheet

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| B1 | Attack lines | `view-models/npc.mjs`, `templates/actor/npc/simple.hbs` | Each weapon as a stat block prints it: "Bloody Spear. Melee weapon attack: +7, reach 10 ft. Hit: 1d6 + 2 piercing." The numbers come from the same attack spec the Combat tab uses. The name still rolls the attack. |
| B2 | Multiattack line | same | "Multiattack: N attacks" from the suggested count for the class and level, until NPC3 gives it a real entry. |
| B3 | Conditions | same | Active conditions with ranks, as chips; click to open the same condition controls the rail uses. |
| B4 | Temp HP and temp CP | same | Beside current HP and CP. |
| B5 | Limited uses | same | "n/max" beside a trait or jutsu that has uses, as the tabbed sheet shows. |

## NPC1c-c: tools around the sheet

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| C1 | Journal stat block | `applications/enrichers.mjs`, `templates/actor/npc/embed.hbs` | An NPC dropped into a journal page (Foundry's `@Embed`) renders its stat block (A5 layout with traits, jutsu and attacks, as the simple sheet). Read only. Private notes never appear. |
| C2 | Batch reset | `applications/gm/npc-reset.mjs` | A GM tool: pick NPCs (selected tokens, or a folder) and reset HP, CP and temp to full, clear conditions, restore limited uses and pools. A confirmation lists what will change; each option can be unticked. |
| C3 | Situational skill bonuses | `data/actor/npc.mjs`, `view-models/npc.mjs` | A list on the Build tab: skill, bonus, and when it applies ("+2 Stealth in forests"). Shown in the stat block's Skills line and offered as a tick in the roll dialog for that skill. Nothing applies by itself (Q-N20). |

## NPC1c-d: what the players can learn (King Q-N21)

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| C4 | Learnable list | `data/actor/npc.mjs`, `templates/actor/npc/build.hbs` | A "What the players can learn" list on the Build tab. The GM drags in features, traits, jutsu and items from the sheet, and statistics (AC, a save, a resistance, HP, the stat block lines) from a picker. Each entry can be reordered, removed, and given a short note. |
| C5 | Reveal | `workflow/jutsu-defense.mjs`, `workflow/npc-knowledge.mjs` (new) | Read the Enemy works the same everywhere (King Q-N23): the reaction on seeing the creature cast a jutsu, the cast discipline's skill against its save DC (FIN2b). On a success, besides the jutsu's name, rank and targets: the GM gets a dialog listing the learnable entries not yet known and ticks which are available; the player then picks one from that pool (King Q-N22). The pick is shown to the party. |
| C6 | What the party knows | `data/actor/npc.mjs`, `templates/actor/npc/limited.hbs` | Learned entries are known to the whole party (King Q-N24). The NPC records them; the limited view shows them, so the party can look them up later. The GM can add or remove an entry from what the party knows by hand. |

## Not in this batch

- CR and XP, habitat, treasure tags, alignment, rolled HP, hardness, rarity: no equivalent in N5e's rules.

## Tests

`tests/npc-sheet.test.mjs` additions: every defense, sense, language and speed set through the Build fields appears in the stat block and is absent when empty; no field name repeats across header, Build and Main in one form; rest buttons shown for the right NPCs; simple sheet attack lines match the Combat tab's numbers; journal embed never contains private notes. `tests/npc-reset.test.mjs`: each reset option changes only what it names.

## Questions for King

- **Q-N18: rest buttons.** Show Short and Long Rest on every NPC, or only on player-style and Allied NPCs (proposed)? The book gives adversaries no rest rules that I found.
- **Q-N19: releases.** Three small releases (a, b, c), or one?
- **Q-N20: situational skill bonuses.** Is a tick in the roll dialog right, or should some apply by themselves from the scene (a later batch, since nothing yet knows terrain)?

## King's answers (2026-11-14)

- **Q-N22:** the GM picks what is available; the player picks from that pool. Claude's reading: one entry per successful Read the Enemy (the number per success was not stated).
- **Q-N23:** all Read the Enemy functions the same.
- **Q-N24:** the whole party learns it.

- **Q-N18:** rest buttons on all NPCs.
- **Q-N19:** one release.
- **Q-N20:** King's standing direction is that every roll opens a dialog showing the roll's math, where the player can add modifiers, as dnd5e and PF2e do. That is not how N5e works today (see ROLL1 in `docs/PROGRESSION_PLAN.md`). C3's situational bonuses will be modifiers the ROLL1 dialog lists and lets the roller switch on; until ROLL1 ships they are shown in the stat block only.
- **Q-N21:** add a "What the players can learn" field. The GM drags features, traits, statistics and other fields into it; when a player uses Read the Enemy, aspects from it are revealed. Built as C4 below; open points in Q-N22–Q-N24.

## Progress log

- 2026-11-14 Claude: spec written from `docs/NPC_SHEET_REVIEW.md`. Nothing built.
- 2026-11-14 Claude: **built after ROLL1 (King: "Approved").**
  - A1–A4: `npcDefensesVM`; Build tab section for both builds; chips through `npcAddTrait` / `npcRemoveTrait` (buttons, so no field is in the form twice). A5: `statBlockVM` `defenses`, `senses`, `languages`. A6: rest buttons on the NPC header (King Q-N18: all NPCs).
  - **Reading to confirm:** the Lurker's "+20 Speed" goes through the existing speed bonus, which adds to every speed the creature has (walk and climb alike). If the book means walking speed only, that is a one-line change.
  - B1–B5: `attackLine` (from the Combat tab's attack spec), Multiattack from the suggested count, conditions, temp HP and CP, uses.
  - C1: `N5eActor._buildEmbedHTML` with `templates/actor/npc/embed.hbs`. C2: `rules/npc-reset.mjs` (pure) and `applications/gm/npc-reset.mjs` (a "Reset NPCs" button on the Actors sidebar through `renderActorDirectory`). C3: `system.situational`; `rollSpec` passes them to the roll dialog (ROLL1 A3).
  - C4–C6: `system.knowledge {{entries, learned}}`; Build tab list with a drop zone; `workflow/npc-knowledge.mjs` (`learnSectionHTML`, `onLearnOffer`, `onLearnPick`, `learnEntry`); owner intent `learnEntry`; Read the Enemy results carry `flags.n5e.learn`. King Q-N22 reading: one pick per success.
  - Found while building: the Notes tab's raw field editor repeated every NPC field the header and Build tab edit. It now leaves them out.
- 2026-11-14 Claude: tests. Attempt 1 failed (3): two test fixtures used an item type that doesn't exist ("feature"; features are "feat") and the old weapon damage field; one expectation missed that the Lurker bonus applies to every speed. Attempt 2 passed: `npm test` 456 pass, 2 skipped; core 98/98; lint and check clean. File: `tests/npc1c.test.mjs`.
- 2026-11-14 Claude: **published `0.31.0-alpha.2`.** Not checked in a running Foundry world.
