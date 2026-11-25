# LVL1: Level-up update, remaining gaps (King 2026-11-24)

**Status: L1 (0.100.0-alpha.1), L2 (0.101.0-alpha.1) and L3 (0.102.0-alpha.1) built.** Order: L1 → L2 → L3 → L5 → L6 → L4, one release each, King tests before the next. Follows NT1 (docs/NT1_SPEC.md).

## King's answers

1. **Ability score requirement** (B 16, A 18, S 20; not Hijutsu): **blocks** learning.
2. **Granted jutsu already known:** a replacement Bonus Jutsu slot, same discipline and section, up to the granted jutsu's rank.
3. **Deleting a granted jutsu:** alert only.
4. **Jutsu swaps at level up:** any number.
5. **"Same type":** the same discipline (Ninjutsu, Genjutsu, Taijutsu, Bukijutsu).
6. **Swaps:** only at level up.
7. **Option swaps:** other swappable options exist; for now only the ones known (Malleable Mirages).
8. **Moldings' "one of which can be C-Rank or lower":** one of the two can be C-Rank even when your highest rank is D-Rank.
9. **Unmet feat prerequisites:** grayed out; if added anyway, alert the GM and the player.
10. **Changing a past level's choices:** allowed (the character's owner), alerted to the GM; Remove level stays top level only.
11. **Leveling:** XP by default; the GM can change it at will or use a combination (XP and GM-granted levels).
12. **Who can level:** a GM toggle; the standard is when the character has the required XP.
13. **XP on level up:** applying a level takes the required XP and keeps the leftover.

## Parts

- **L1 Jutsu learning rules** (built 0.100.0-alpha.1): the ability requirement blocks learning (sheet drop, browser +, level-up window; this level's ASI counts); a feature's outright grant is still given below the requirement, with an alert (it can't be cast until then); a granted jutsu already known adds a replacement Bonus Jutsu slot on that feature (level-up window: a "Bonus jutsu: <feature> (instead of <jutsu>)" card); deleting a granted jutsu from the sheet alerts the player and the GM.
- **L2 Swaps** (built 0.101.0-alpha.1): at a level that learns a new jutsu, a **Swap jutsu** card lists the known class jutsu (granted ones excluded); each one picked gets a **Swap: replace <jutsu>** card that takes a drop of the same discipline within the highest rank (another discipline alerts; nothing dropped: the old jutsu stays). Option swaps: advancement entries have a `swap` setting (Malleable Mirages' six entries); the choice card lists the earlier picks with the same key, and each one switched out adds a pick. What a level switched out is kept on the class (`flags.n5e.levelSwaps.<level>`) and Remove level puts it back.
- **L3 Conditional grants** (built 0.102.0-alpha.1): feature Bonus Jutsu get `condition` ("affinity:fire", "skill:<key>", "tool:<key>", "save:<key>"), read against what the character had before the item was gained and saved on it (`flags.n5e.conditionMet`), and `aboveMax` (that many may be up to a rank above the highest). The five ultimate Moldings: if the affinity was already had, 2 Bonus Jutsu slots of that release's Ninjutsu, one up to C-Rank above the highest. A fixed class skill or toolkit proficiency already had (clan, background, feat, by hand) becomes a pick of another at 1st level. Already handled: Phantom Vapors' proficiency → Mastery (feature proficiency rule). Not a level-up grant: Mind Body Augmentation (a jutsu effect).
- **L5 Review and history:** a review step before Apply; Level History on the sheet; change a past level's choices (owner; GM alerted).
- **L6 XP and GM control:** leveling mode XP / Milestone / both; GM toggle for who can level (standard: with the required XP); applying takes the XP and keeps the leftover; Party Overview Award XP and Grant level.
- **L4 Feat prerequisites:** structured prerequisites; unmet feats grayed out in the level-up list; added anyway: alert the GM and the player. Content waits on the final feat list (STD6c).

## Progress log

- 2026-11-24 King: spec answers Q1–Q13. Claude: L1 built and published 0.100.0-alpha.1.
- 2026-11-24 King: "Next batch." Claude: L2 built and published 0.101.0-alpha.1.
- 2026-11-24 King: "Apply the fix. Retest." Claude: L3 fixed (third run passed) and published 0.102.0-alpha.1.
