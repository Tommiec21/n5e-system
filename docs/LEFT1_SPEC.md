# LEFT1: small leftovers

King 2026-11-25: "Start a plan for all Small leftovers." Found in the roadmap scan of the full context and the repo docs.

Status: **plan; waiting on King's answers. Two fixes King raised the same day are built (0.106.3-alpha.1).**

## Built now (King's two fixes)

- **Level-up cards overflowing:** cards grow with their text; a long requirement line is cut at 3 lines, with the full text in the tooltip.
- **Classes compendium:** each class folder holds the class itself and a **Subclasses** folder with its subclasses (all 7 classes, 42 subclasses). Both builders write it this way.

## Parts

### P1 Players' Combat tab keyword colors (NPCUI1 Q-U2)
- Use the NPC sheet's keyword colors on the players' Combat tab (jutsu and attacks).
- The same color key, collapsible.

### P2 Click-to-build editor for effect conditions (STD5)
- Today a condition is typed in the documented syntax (`target:condition:prone`, `self:rank:B`...).
- Add a builder: pick a subject (self, target, item, option), then a fact, then a value; it writes the same syntax.
- The typed field stays for anything the builder doesn't cover.

### P3 Sheet design extras (SHEETS1)
- **Glass:** a client setting for the accent color and one to turn the blur off.
- **Fonts:** bundle the design fonts with the system so they work offline.
- **Shinobi Scroll:** the initiative ability choice; immunities and weaknesses rows.
- **Other tabs:** per-design layouts for the tabs other than Main (Q-SH5).

### P4 Bloodied (OPS1)
- The `bloodiedVisibility` setting was held back because nothing on a token shows Bloodied.
- Add a token marker at half hit points or below, then the setting (all / player / none, as dnd5e).

### P5 Free choices still stored as text (DATA1)
- Audit every class, subclass, clan and background feature for "of your choice" grants that are still text (example: "one exotic weapon").
- Each becomes a pick when the feature is gained (level up, clan or background), using the existing choice cards.
- An audit table first for King's review, then the data.

### P6 Sheet editor for jutsu granted at a level (sweep, 0.106)
- The item sheet's Bonus Jutsu section gets a "Granted at level" list: drop a jutsu, set its level, remove.

## Order

P6 → P1 → P4 → P2 → P5 → P3 (smallest first; one release each, King tests each).

## Questions

- **Q-L1 (P1):** colors on the players' Combat tab: the same key and colors as the NPC sheet?
- **Q-L2 (P2):** builder on every condition field (effects, riders, activities), or effects only?
- **Q-L3 (P3):** Shinobi Scroll's immunities and weaknesses: show condition immunities and damage resistances/weaknesses from the existing data, or drop the rows?
- **Q-L4 (P3, Q-SH5):** which designs get their own layouts for the other tabs: all five, some, or none?
- **Q-L5 (P4):** is Bloodied a thing at the table (token marker at half HP), or drop the setting?
- **Q-L6 (P5):** a pick when gained, as proposed, or a GM-set choice on the sheet?

## Progress log
- 2026-11-25 King: "Start a plan for all Small leftovers." Claude: plan written; the two fixes King raised (level-up card overflow, Classes compendium folders) built and published 0.106.3-alpha.1.
