# PLAY1: playtest fixes

King 2026-11-25 (playtest with his wife, a Hyuga):
- "She is able to see Hijutsu from Clans she is not part of. This should be a clear filter added to the Browser. You only see Jutsu from a clan you have selected."
- "The Character creation process is missing applying the characters base Ability score line."

## Built (0.107.1-alpha.1)

### Hijutsu in the Compendium Browser
- Browsing for a character (the level-up window's or sheet's Learning for, or a player's own character) shows only that character's clan's Hijutsu; a character with no clan sees none.
- The line above the results says so: "Hijutsu: only Hyūga's (Name)".
- Browsing with no character (the GM) shows every clan's Hijutsu, with a new **Clan (Hijutsu)** filter.
- Each Hijutsu row names its clan.

### Starting ability scores
- Rules (KB 01): Standard Array 15/14/13/12/11/10; Point Buy 30 points, 8–15 before clan and background (8=0, 9=1, 10=2, 11=3, 12=4, 13=5, 14=7, 15=9); Roll 4d6 drop the lowest, six times.
- World rule **Starting ability scores** (Character group): the player picks the method (default), or the table sets one.
- A new character (no class yet) is asked for its starting scores before its first clan, background or class is applied. "Already set by hand" skips it.
- Sheet header: an **Ability Scores** button (highlighted) until they are set; in edit mode a button to change them later.
- Rolls are posted to chat and kept on the character (no rerolls).
- Increases already gained are kept: the first time, recorded clan increases and level-up ASIs go on top; later changes keep the difference from the old starting scores.

## Progress log
- 2026-11-25 King: playtest issues (Hijutsu from other clans; no starting ability scores). Claude: built and published 0.107.1-alpha.1.
