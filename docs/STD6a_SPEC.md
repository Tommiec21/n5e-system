# STD6a function spec: items

Status: **King 2026-11-15: "Build out the next 3 batches" (STD4, STD5, STD6a). Built and published `0.46.0-alpha.1`. Q-I1 answered.**

Plan: `docs/STD_SPEC.md`, STD6a (items, the first content pass).

## What the survey found

- **Weapons (55):** their mechanics are their properties, damage, range and group, all data on the item already, read by generic code that names properties (allowed: a property is a generic concept).
- **Consumables (7):** all have authored activities.
- **Armor and containers (2):** data fields (armor category, properties, capacity).
- **Still found by name:** the basic Shinobi implements (Kunai, Shuriken, Senbon) were found by a name pattern for Extra Attack's third attack; Binding Fury Stance was found by name for the Fury tracker's display.

## Functions

| # | Function | Behaviour |
| --- | --- | --- |
| I1 | Implements as data | Weapons carry `flags.n5e.implement: true`; `attacksPerAction` reads it. The seven weapons the old pattern matched are marked (see Q-I1). |
| I2 | Fury tracker display | "Gains Fury on weapon damage" is read from the trigger element (STD4) on the active stance, not its name. |
| I3 | Left for later passes | The Fury tracker's visibility (text mentions Fury: STD6f jutsu), the 8 Inner Gates feat test (STD6c feats), Mark jutsu by name (STD6f). |

## Questions for King

- **Q-I1: which weapons are "Kunai, Shuriken or Senbon" for Scout-Nin's third attack?** The old name pattern matched Kunai, Shuriken, Senbon, and also Fuma-Shuriken, Monster Shuriken, Ballistic Kunai Gun and Ballistic Shuriken Rifle. All seven are marked so nothing changes; say which ones should not count and I'll unmark them.

## Progress log

- 2026-11-15 Claude: built and published `0.46.0-alpha.1`. Tests: core +1 (the flag counts, the name alone no longer does). Suites: 552 and 163 pass.
- 2026-11-15 Claude: King answered **Q-I1: only Kunai and Shuriken proper**, none of the weapons that mention them. Published `0.46.0-alpha.2`: Fuma-Shuriken, Monster Shuriken, Ballistic Kunai Gun and Ballistic Shuriken Rifle unmarked. Senbon stays marked (the feature names it; it is not a weapon that mentions them).
- 2026-11-15 Claude: King confirmed Senbon counts. Q-I1 closed: Kunai, Shuriken and Senbon.
