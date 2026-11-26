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

## Progress log
- 2026-11-25 King: four playtest fixes. Claude: built and published 0.110.1-alpha.1.
- 2026-11-25 King: the jutsu window should use the item sheet's design. Claude: rebuilt in the item sheet's look, published 0.110.2-alpha.1.
- 2026-11-25 King: sidebar labels look 3D. Claude: Foundry's text shadow removed in N5e windows, published 0.110.3-alpha.1.
