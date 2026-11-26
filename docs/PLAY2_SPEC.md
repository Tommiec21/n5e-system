# PLAY2: playtest fixes (sheet)

King 2026-11-25, from a playtest (four screenshots).

Status: **built (0.110.1-alpha.1).**

## Fixes

1. **Disciplines:** the "also Bukijutsu" note after Taijutsu is gone.
2. **Mastery set by hand:** in edit mode, three small diamond boxes sit beside the proficiency box on every skill, saving throw and discipline (default sheet and all designs).
   - A click sets that many ranks; clicking the last lit box lowers it by one.
   - Stored as Mastery sources "Manual 1–3" on the target (`skill.<key>`, `save.<key>`, `attack.<discipline>`); feature and ASI sources are kept; the level cap still applies.
   - A discipline's Mastery adds to its attack (the engine's `attack.<discipline>` target; no rule gives Mastery to a DC).
   - Saves and disciplines now show their Mastery (◆n) like skills.
3. **Jutsu tab hover:** the same card as the Combat tab (rank, discipline, action, cost, concentration, hit/DC, full text, Chain/Finisher/Overcharge, keywords).
4. **Clicking a jutsu on the Jutsu tab** (pill or Use) opens the jutsu's window, in the item sheet's look (0.110.2: header with icon, type and name; sidebar of chips and facts; parchment body): its full text, then the cast options (rank, cast as, multipliers, Moldings and Maneuvers, feature toggles, concentration, Ready), the cost preview, and Cast / Cancel. The Combat tab and pins still go straight to the cast dialog.

## Level-up details panel (King 2026-11-25, 0.111.2-alpha.1)

- Players found the long hover boxes hard to read. Clicking a card in the level-up window now widens the window to about 160% (to the right) and opens a details panel: the item's image, type and level, its extra line (prerequisite or rank), its keywords, and its full text, in the window's own fonts and colors.
- Clicking a choice card still picks it; clicking another card shows that one; the card being read has a gold ring. The × closes the panel and the window returns to its width.
- The long hover on those cards is gone; the header says "Click any card to read its full text."

## Item sheet description height (King 2026-11-25, 0.111.3-alpha.1)

- The editable Description box stayed at its 220px minimum and scrolled inside itself, leaving the rest of the card empty. It now grows with its text (the tab scrolls) and fills the card when the text is short.

## Progress log
- 2026-11-25 King: four playtest fixes. Claude: built and published 0.110.1-alpha.1.
- 2026-11-25 King: the jutsu window should use the item sheet's design. Claude: rebuilt in the item sheet's look, published 0.110.2-alpha.1.
- 2026-11-25 King: sidebar labels look 3D. Claude: Foundry's text shadow removed in N5e windows, published 0.110.3-alpha.1.
- 2026-11-25 King: level-up hover boxes too long; test a details panel that widens the window. Claude: built, published 0.111.2-alpha.1.
- 2026-11-25 King: feature text uses ~40% of the card and scrolls. Claude: description box fills the card, published 0.111.3-alpha.1.
