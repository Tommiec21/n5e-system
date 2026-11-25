# LVL1: Level-up update, remaining gaps (King 2026-11-24)

**Status: L1 (0.100.0-alpha.1), L2 (0.101.0-alpha.1) L3 (0.102.0-alpha.1) L5 (0.103.0-alpha.1) L6 (0.104.0-alpha.1) and L4 (0.105.0-alpha.1) built: LVL1 is complete.** Order: L1 → L2 → L3 → L5 → L6 → L4, one release each, King tests before the next. Follows NT1 (docs/NT1_SPEC.md).

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
- **L5 Review and history** (built 0.103.0-alpha.1): a **Review** section in the level-up window (one line per step: what it gives and what was chosen; missing picks in red; open jutsu slots "stay on the sheet"). **Level History** (header button, also at level 20, every sheet design): per level, newest first: items it stamped (features and feats, jutsu, stances), the ASI, 1st-level skills and toolkits chosen, what it switched out. **Change choices** (the character's owner) reopens a past level's options, feats, ASI (ability, feat, Mastery) and proficiencies, prefilled; applying swaps the items, moves the ASI and alerts the GM and owners with the changes. Not changeable there: subclass, features, HP/CP, jutsu (slots and swaps cover those). Remove level stays top level only.
- **L6 XP and GM control** (built 0.104.0-alpha.1): rules `leveling` (XP default / Milestone / Both) and `levelUpGate` (on: Level Up needs the required XP or a level the GM granted; off: players level freely; GMs can always level). Level Up lights up when ready, is dimmed with the reason otherwise (every sheet design). Applying a level spends the XP (leftover carries) or one granted level (`flags.n5e.levelsGranted`); leveled freely spends nothing. Party Overview (GM): Award XP to all, per-row XP and Grant level; rows show XP / next, granted levels and "ready". Remove level refunds what the level spent (King 2026-11-25): its XP, or its granted level (kept on the class, `flags.n5e.levelSpent.<level>`; levels applied before 0.106.1 have no record and refund nothing).
- **L4 Feat prerequisites** (built 0.105.0-alpha.1): feat `system.requirement` gains abilities (minimum scores), skills and toolkits (proficient in), affinity, keyword (knows a jutsu with it) and feats (uuids, drag and drop), beside level, class and clan; free-text `prerequisites` stay (judged by hand, never gray a feat out). Level-up feat lists (feat choices and the ASI feat) show every feat not owned; unmet ones are grayed out, listed last with "Missing: …", and still selectable; Apply (and Change choices, for newly taken feats) and a feat dropped on the sheet alert the GM and the player. Other feat lists (clan, background free feat) keep filtering. The data waits on King's final feat list (STD6c).

## Progress log

- 2026-11-24 King: spec answers Q1–Q13. Claude: L1 built and published 0.100.0-alpha.1.
- 2026-11-24 King: "Next batch." Claude: L2 built and published 0.101.0-alpha.1.
- 2026-11-24 King: "Apply the fix. Retest." Claude: L3 fixed (third run passed) and published 0.102.0-alpha.1.
- 2026-11-24 King: "Apply the fix and then the final run." Claude: L5 test stand-ins fixed (passed), design sheets given the Level History button; published 0.103.0-alpha.1.
- 2026-11-24 King: "Then move on to the next batch." Claude: L6 built and published 0.104.0-alpha.1.
- 2026-11-25 King: "Next batch." Claude: L4 built and published 0.105.0-alpha.1; LVL1 complete.
- 2026-11-25 King: "Make it refund." Claude: Remove level refunds the level's XP or granted level; published 0.106.1-alpha.1.
