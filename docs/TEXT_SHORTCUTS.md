# Text shortcuts

Type these into journal pages, item descriptions or chat. They turn into clickable links.

## Rolls

| Type | Shows | Click |
| --- | --- | --- |
| `[[/save dex]]` | Dex save | Selected tokens (else your character) roll a Dexterity save |
| `[[/save dex dc=15]]` | Dex save DC 15 | ... against DC 15 |
| `[[/save wis dc=gen]]` | Wis save DC 15 | ... against the item owner's Genjutsu DC (`nin`, `tai`, `gen`) |
| `[[/save con dc=15 inflict=staggered,bleed:2]]` | Con save DC 15 | ... a failure offers Apply Staggered / Apply Bleed 2 |
| `[[/check prc dc=12]]` | Perception DC 12 | Selected tokens roll Perception (key or name: `[[/check Animal Handling]]`) |
| `[[/check tool=medicine dc=15]]` | Medicine Kit DC 15 | A toolkit check |
| `[[/check str dc=10]]` | Strength check DC 10 | An ability check |
| `[[/damage 2d6 fire, 1d6 cold]]` | 2d6 Fire + 1d6 Cold | A damage card with Apply buttons |
| `[[/damage 1d8 + @disciplines.tai.mod slashing]]` | ... | `@` references use the item owner's numbers |
| `[[/heal 2d8 + 3]]` | 2d8 + 3 HP | Heals the selected tokens; add `temp` (temporary HP) or `cp` |

## Conditions and States

| Type | Click | Shift+click |
| --- | --- | --- |
| `@Condition[bruised]` | Apply Bruised to selected tokens | Remove it |
| `@Condition[bleed 2]` | Apply 2 ranks | Remove 2 ranks |
| `@State[prone]` | Turn Prone on | Turn it off |

Hover a condition or State link to see its rules.

## Custom labels

Add `{label}` right after any shortcut: `[[/save dex dc=15]]{Dodge the falling rocks}`, `@Condition[shaken]{rattled}`.
