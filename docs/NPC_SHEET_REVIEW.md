# NPC sheet review: dnd5e and PF2e against N5e's two NPC sheets

Status: **review for King (2026-11-14). Nothing built. Proposed follow-up: NPC1c (below), needs a spec and approval.**

Sources: dnd5e 6.1.0 (`applications/actor/npc-sheet.mjs`, `templates/actors/npc-*.hbs`, `embeds/npc-embed.hbs`, `data/actor/npc.mjs`); PF2e 8.7.0 (`actor/npc/sheet.ts`, `reset-batch.ts`, `skills-editor`); N5e 0.30.0-alpha.2 (tabbed NPC sheet, simple NPC sheet). N5e's sheets have not been opened in a running world.

**Answer: no.** N5e covers most of what both sheets do, but four things both of them show are missing from both N5e sheets, and several more are waiting on batches already planned.

## Feature by feature

| What the sheet does | dnd5e | PF2e | N5e tabbed | N5e simple |
| --- | --- | --- | --- | --- |
| Name, portrait, size, type line | yes | yes (traits, rarity) | yes; size only in the raw field editor | yes (read) |
| Level or CR, proficiency | CR, XP, proficiency | level | level, proficiency | yes |
| AC with its parts | config dialog | yes, details text | breakdown and override (Build) | yes |
| HP, temp HP, max | yes; HP formula can be rolled | yes, details text | yes; formula or Lazy GM, override | HP and CP typed; no temp |
| Second resource | — | — | Chakra Points | yes |
| Abilities with modifier and save | yes | modifiers | yes | yes |
| Skills, add or edit | config dialog | skills editor; situational variants ("+2 in forests") | trained tick and override; **no situational variants** | trained skills listed |
| Initiative, speeds | yes; all movement types editable | yes; all speeds | initiative yes; **other speeds only in the raw field editor** | walk speed only |
| **Senses** (darkvision, etc.) | sidebar | yes | **stored, not shown or editable** | **no** |
| **Resistances, immunities, vulnerabilities** | sidebar pills | yes, with values; hardness | **stored and used by damage, not shown or editable** | **no** |
| **Condition immunities** | sidebar pills | via immunities | **stored and used, not shown or editable** | **no** |
| **Languages** | sidebar | yes | **stored, not shown or editable** | **no** |
| Attacks listed with bonus and damage | actions list with description | strike rows with attack variants and damage buttons | Combat tab pills | **names only** |
| Abilities grouped by action cost | Actions, Bonus, Reactions, Legendary, Lair | interaction, defensive, offensive | Combat tab by activation; Features tab | one Traits list |
| Limited uses, recharge | yes | frequency | yes | no |
| Spells or jutsu | spellbook with slots | entries with DC, attack, slots | Jutsu tab; casting lines per discipline | by discipline and rank with cost |
| Inventory | yes | yes | yes | no |
| Effects and conditions | yes | yes | yes | no |
| Notes | biography, public text | public, private, blurb | public, private (GM), biography, blurb | public notes |
| Limited-permission view | yes | lootable view | yes | yes |
| Simple alternative sheet | — | yes | — | this is it |
| One-click strength adjustment | — | Elite / Weak | class select on the Build tab (Minion to Solo) | no |
| Build from a profile | — | — | Build tab | no |
| Boss resources | Legendary actions and resistances, lair | — | **not yet: NPC4 (Tenacity, Elite Actions)** | — |
| Identification | — | Recall Knowledge DCs | Read the Enemy and Identify from cast cards; no per-NPC DC | — |
| Loot from a dead NPC | treasure tags | lootable sheet | **not yet: LOOT1** | — |
| Stat block in a journal page | `@Embed` stat block | — | **no** | — |
| Reset many NPCs at once | — | batch reset (HP, slots, conditions) | **no** | — |
| Death saves or dies at 0 | death saves for important NPCs | — | `diesAtZero` works; **switch only in the raw field editor** | — |
| Rests | short and long rest buttons | — | inherited from the character sheet | no |
| Habitat, treasure, alignment | yes | — | no equivalent in N5e's rules | — |

## Gaps

**Missing from both N5e sheets now, and both other systems have them:**
1. Senses.
2. Resistances, immunities and vulnerabilities.
3. Condition immunities and resistances.
4. Languages.

These exist in the data and the damage and condition engines read them. The only way to set them today is the "All stored fields (advanced)" list on the Notes tab. The book's stat block also prints resistances, condition vulnerabilities and senses, so the stat-block header is short of the book here too.

**Missing, smaller:**
5. Size, the other movement speeds, `diesAtZero` and the Allied switch have no proper control.
6. The simple sheet lists attacks by name only; a stat block prints the bonus, reach and damage.
7. The simple sheet shows no conditions and no temp HP.
8. No stat block for journal pages.
9. No batch reset.
10. No situational skill variants.

**Already planned:** boss resources (NPC4), phases (NPC5), traits as content (NPC6), strikes with riders (NPC3), loot (LOOT1), the builder window (NPC2).

**Not applicable:** CR and XP (levels and the mission budget replace them), habitat, treasure tags, alignment, rolled HP, hardness, rarity.

## Proposed NPC1c (needs a spec and King's approval)

- A Defenses and Senses block on the Build tab and in the stat block: resistances, immunities, vulnerabilities, condition immunities and resistances, senses, languages, size, all speeds (items 1–5).
- `diesAtZero` and Allied on the Build tab (item 5).
- Simple sheet: attack lines with bonus, reach and damage; conditions; temp HP (items 6–7).
- Optional, each its own decision: journal stat block (8), batch reset (9), situational skill variants (10).

## Progress log

- 2026-11-14 Claude: review written from the dnd5e 6.1.0 and PF2e 8.7.0 sources and N5e 0.30.0-alpha.2. Nothing built.
