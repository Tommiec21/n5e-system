# DEF1: Defenses on the rail

King 2026-11-25: "there is no place on the sheet that displays if a player character is actively resistant or immune to a specific thing." Three mock-ups shown; King: "Option A."

Status: **built (0.111.0-alpha.1); text and Vulnerability (0.111.1-alpha.1).**

- A **Defenses** box on the rail after HD/CD and before Resources: one row each for **Resist**, **Immune** and **Vulnerable** (King: "Weakness is not a game term"), the damage types, conditions and states as chips (conditions in italics).
- Rows with nothing are left out; with no defenses the box is hidden.
- Hover text (King 2026-11-25, word for word; `DEFENSE_TEXT` in view-models/character.mjs):
  - Damage: Resist "X Damage is Halved." · Immune "X Damage is Nullified." · Vulnerable "X Damage is Doubled."
  - Condition: Resist "Adv on X Saving throws or Checks." · Immune "Cannot gain X Condition." · Vulnerable "Disadvantage on X Saving throws or Checks."
  - State: Resist "Adv on X Saving throws or Checks." · Immune "Cannot gain X State." · Vulnerable "Disadvantage on X Saving throws or Checks."
  - A condition group shows as "All Mental"; its text names the group ("Mental").
- Condition and State Vulnerability are new data: traits `conditionVuln` / `stateVuln`, effect keys `n5e.conditionVuln` (key or group) / `n5e.stateVuln`; saves against them (on save cards and saves to end them) take disadvantage, as Resistance gives advantage. Checks follow when checks against conditions are rolled by the system.
- Shinobi Scroll's "Weaknesses" row is now "Vulnerabilities" and lists condition and state vulnerabilities too.
- Data: the actor's prepared traits (resist, immune, vuln, conditionResist/Immune, stateResist/Immune), including what effects add.
- On the default sheet and the Classic, Dossier, Glass, Ink and One UI designs. Shinobi Scroll already shows its Immunities, Weaknesses and Resistances rows (LEFT1 P3) and is unchanged.

## Progress log
- 2026-11-25 King: Option A. Claude: built and published 0.111.0-alpha.1.
- 2026-11-25 King: Weak → Vulnerable; his hover text; condition/state Vulnerability. Claude: built, published 0.111.1-alpha.1.
