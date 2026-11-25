# NT1: Learning jutsu at level up through the Jutsu Browser (King 2026-11-24)

**Status: built, published 0.99.0-alpha.1.** First task of the level-up update; the rest of the level-up gaps follow.

## King's answers

- **Q1:** a level can be Applied with jutsu slots still open; they stay on the sheet.
- **Q2:** both the character sheet and the level-up window take jutsu drops.
- **Q3:** a drop that breaks a rule is an alert for the player and the GM, never a block.
- **Q4:** a drop with no open slot is allowed, with an alert for the player and the GM.
- **Q5:** track Class jutsu (the class's Jutsu Known) and Bonus Jutsu (granted by feats, features, traits...); players assign how each jutsu was learned; GMs can make a feature that grants extra jutsu, counted as Bonus Jutsu.
- **Q6:** the browser presets the slot's filters (highest rank, the slot's limits), all removable.

## Built

- **Level-up window:** no jutsu list (the jutsu compendium is never loaded there). A **Learn jutsu** card shows the open class slots (new this level, and any still open from earlier) and the highest rank; each feature gained this level with Bonus Jutsu slots gets a **Bonus jutsu: <feature>** card with its limits; a **Jutsu granted** card lists jutsu a feature grants outright. Each slot card takes drops and has **Open Jutsu Browser** (filters preset from the slot). Dropped jutsu show on the card with a remove button and any rule warnings. Slots never hold up Apply.
- **Jutsu Browser:** opened for a character it shows **Learning for <name>: N open · …** (class slots and each feature's bonus slots); the + button learns the jutsu the same way as a drop.
- **Character sheet:** dropping a jutsu takes a class slot if one is open, else a bonus slot it fits; it is stamped with the class and level, so Remove level takes it back. The Jutsu tab shows **Class used / Jutsu Known**, **Bonus used / limit** (hover: per feature) and, with open slots, **Jutsu to learn: N** (opens the browser for this character with the rank preset).
- **Alerts:** rank above the highest you can learn, a missing affinity, another clan's or branch's Hijutsu, Kinjutsu, a jutsu outside a bonus slot's limits, or no open slot: a warning to the user and a chat message whispered to the GMs and the character's owners. The jutsu is learned anyway.
- **Bonus Jutsu on features, feats and traits (GM-authored):** the item's Details tab has a **Bonus Jutsu** section: Slots (count), Up to (rank), Discipline, Section, Keyword, and **Granted jutsu** (drag jutsu in; each is granted outright when the item is gained: level-up, clan traits, or dropping the item on a character).
- **Jutsu's Learned section:** **Class** or **Bonus Jutsu**; for Bonus, **From** (one of the character's features, feats or traits, or Other) and **Granted by**. Old data reads as before: "known" is Class, "granted" is Bonus.

## Not in this task

- Connecting the existing content (features whose text grants jutsu: the Reaper's listed jutsu, Chakra Movement Ninjutsu, Blaze Walker's Fire jutsu, the Shark Summoning Technique and others) to the new fields is the content pass that follows; the fields are ready for GMs now.

## Progress log

- 2026-11-24 King: NT1 requested and Q1–Q6 answered. Claude: built and published 0.99.0-alpha.1.

