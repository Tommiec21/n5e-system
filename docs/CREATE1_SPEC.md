# CREATE1: character creation like dnd5e

King 2026-11-25: "Lets look into how dnd 5e handles the system." 1. A new character is prompted for its starting ability scores as the GM set the world up; default a mix of Point Buy and Standard Array the player toggles; Roll only when the GM turns it on. 2. The Class, Clan and Background buttons on the sheet open the compendium to pick one.

Status: **spec; waiting on King's answers.**

## How dnd5e does it (5.x)

- Empty Species / Background / Class slots on the sheet are buttons ("Add Species").
- A button opens the Compendium Browser locked to that item type, in **select mode** (a checkbox per row, "Selected 0 of 1", a Select button), with that type's filters.
- Selecting adds the item and runs its advancement steps in a window ("Advancement · Step 1 of 3").
- The ability increase step shows the six abilities with their current scores and the increase each gets.

## What we have now

- 7 classes, 42 subclasses, 44 clans and 16 backgrounds are already in the compendiums; the N5e Browser lists them on its Classes & Origins tab.
- Empty origins say "Drop a class / clan / background" (Features tab) or "Class: —" (the designs' header bubbles); dropping runs the level-1 window, the clan setup or the background setup.
- Starting scores (0.107.1): asked before a new character's first class, clan or background; the world rule's default lets the player pick Standard Array, Point Buy or Roll.
- Clan setup picks its +2 and +1 from two dropdowns; the current scores aren't shown.

## Plan

### C1 Starting scores when a character is made
- World rule **Starting ability scores**:
  - **Point Buy or Standard Array (player toggles)**: the new default.
  - **Standard Array only**.
  - **Point Buy only**.
  - **Roll (4d6, drop the lowest)**: only when the GM picks it.
- Creating a character actor opens its sheet with the **Starting ability scores** window on top, for the user who made it.
- The window: a Point Buy / Standard Array toggle (when both are allowed); Point Buy shows points spent live; Standard Array assigns each score once.
- Cancel: the sheet's Ability Scores button stays until they're set; the first class, clan or background still asks.

### C2 Origin buttons open the compendium
- The empty Class, Clan and Background origins become buttons ("Add Class", "Add Clan", "Add Background") on the Features tab and in every design's header.
- Each opens the N5e Browser on Classes & Origins, locked to that type (classes: no subclasses), in **select mode**: a Select button per row (or row checkbox and a Select button at the bottom, as dnd5e).
- Selecting runs exactly what dropping does (the level-1 window, the clan setup, the background setup).
- A filled origin keeps opening the item; in edit mode a swap button opens the picker to replace it (with the same "Replace?" confirmation as dropping).

### C3 Clan ability increases shown on the scores
- The clan setup's ability part becomes a six-ability grid as dnd5e's step: each ability's current score, a +2 / +1 pick (Non-Clan: three +1), and the result.
- The rest of the clan setup (skills, affinity, branch, starting options) stays as it is.

## Questions

- **Q-C1:** when the GM picks Roll, is it Roll only, or Roll plus the toggle (the player chooses)?
- **Q-C2:** the prompt on a new character: only for the user who created it, or also the first time an owning player opens a character the GM made for them?
- **Q-C3:** select mode: a Select button per row, or dnd5e's checkbox per row and one Select button at the bottom?
- **Q-C4:** the clan setup as one window (as now, with the new grid), or dnd5e-style steps (Ability increases → Skills and affinity → Starting options), one at a time?
- **Q-C5 (answered):** King: "the current N5e Browser only has Jutsu." The other tabs were hidden by a bug (Foundry hides inactive ".tab" elements); fixed in 0.107.2-alpha.1, so Classes & Origins shows again.

## Progress log
