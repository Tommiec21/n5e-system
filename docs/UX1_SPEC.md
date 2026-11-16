# UX1 function spec: a readable Amp card and effect editor

Status: **plan written 2026-11-16 at King's request ("pivot and focus on the Amp Card ... Write out your plan before deploying"). King approved (Q-U1–Q-U4) and asked for both phases at once: released in 0.60.0-alpha.1.** Next: AMP1b.

## What King asked for

1. The Amp card's change rows overlap.
2. The field search is good, but its wording is too technical for players.
3. The bottom of the editor should explain each added field in plain language, so nobody breaks something by accident. A translation layer: the stored key stays `n5e.unarmed.die`, but people see [Unarmed Damage Die].
4. "Conditional roll modifiers" is a wall of text and needs a breakdown.

The rules for the writing:
- Short descriptions, at most 2 sentences.
- Bullets where they help.
- Collapsible, so unneeded detail stays hidden.
- Definitions that appear when an option is selected.

## What I found

- **The overlap:** each change row is a 5-column grid (field, mode, value, priority, remove). Foundry's own sheet styles squeeze the inputs, so a row's columns run into the next row. Mode shows "Upgrade" cut off, and the field names are cut off too.
- **A gap in AMP1a:** the effect you built on the Amp card ("Amp card effect") is **not applied** when the Amp starts. The engine reads the card's own Changes list (`system.changes`) and roll rules, not Active Effects on the card. Most people will build the buff exactly the way you did, so the fix is to read the card's effects.
- **The field list:** 140 fields in 14 groups. Their labels mix rules and syntax ("Fixed cost by cast rank, treated as Special (value "D:3,C:5,…"; scope like n5e.cost)").

## The plan

### 1. A field dictionary (the translation layer)

- **What:** a new data file, `config/effect-fields.mjs`. For every field key it holds:
  - **name** in plain words: `n5e.unarmed.die` → **Unarmed Damage Die**;
  - **category** for players: Defense, Attacks, Damage, Jutsu Cost, Saves & DCs, Skills & Mastery, Speed & Movement, Health & Chakra, Ability Scores;
  - **what it does:** 1 to 2 sentences;
  - **what to enter:** the value in plain words, with an example;
  - **how it stacks:** one line ("Adds to other bonuses." / "Only the largest one counts.");
  - **search words:** synonyms such as "fist, punch" for unarmed, or "DR, armor" for Damage Reduction.
- **Families of fields** (every skill's mastery, every discipline's cost) come from one template each, so the 140 entries are about 40 written lines.
- **The stored key never changes,** so nothing that already exists breaks. The key appears only in a small grey line inside "Advanced".
- **A test** fails if any field in the catalogue has no dictionary entry, so new fields can't ship without a plain name.

Example entries:

| Field | Name | What it does | What to enter |
| --- | --- | --- | --- |
| n5e.unarmed.die | Unarmed Damage Die | Sets your unarmed strike's damage die. It only applies if it's bigger than the die you already have. | A die, such as 1d10. |
| n5e.dr | Damage Reduction | Reduces damage you take from each hit. | A number, such as 2. |
| n5e.cost.nin | Ninjutsu Cost | Changes the chakra cost of your Ninjutsu. | A number (−2), or a multiplier (*0.5 halves it). |
| n5e.mastery.skill.ath | Athletics Mastery | Raises your mastery rank in Athletics by one step. | Where it comes from, such as "White Wolf". |

### 2. The field picker

- **Search** matches the plain name, the category and the search words, as well as the key.
- **The dropdown** is grouped by category and shows plain names only: **[Unarmed Damage Die]**, not "Damage · Unarmed damage die becomes this when larger (value e.g. 1d12) [dice] — n5e.unarmed.die".
- **"About this field"** appears under the picker as soon as a field is selected, showing:
  - what it does;
  - what to enter;
  - an example;
  - how it stacks.
  
  It is built from the dictionary and updates as you move through the list.

### 3. The changes list (fixes the overlap)

- **Each change becomes a small card** stacked top to bottom instead of a squeezed grid row:
  - **Line 1:** the plain name (bold) and a remove button.
  - **Line 2:** the value box, shaped to the field:
    - a number box for numbers;
    - a dropdown for an ability or a damage type;
    - a dice box ("1d8") for dice.
  - **"What this does"** (collapsed): the field's definition, shown again.
  - **"Advanced"** (collapsed): the stored key, mode and priority. N5e fields don't use mode or priority, so for them this section only shows the key.
- **Errors are in plain words, on the card that has the problem.** For example: "Enter a die, like 1d10." instead of "Change 1: this mode is not supported for the field."
- **"Add blank change"** moves into "Advanced". Players add fields from the picker.

### 4. The rest of the editor tab: shorter and collapsible

Every section keeps its tools but opens with at most 2 sentences. Everything else is collapsed:

| Today | Becomes | Opening line |
| --- | --- | --- |
| Conditions, suppression and source-turn expiration | **When this effect works** | Limit it to character levels or a stance. Outside them it switches off; it isn't deleted. |
| Conditional roll modifiers | **Roll rules** (section 5) | Advantage, bonuses or extra damage that apply only in some situations. |
| Current timing and source diagnostics | **Timing details** (GM) | What the effect's timers are set to right now. |
| Field estimates and N5e modifier contributions | **Preview** | What this effect would change on the creature. |
| Draft data and portability | **Copy and share** | Export, import or duplicate this effect. |
| Effect services: expiration, world Macros and appearance | **Automation (GM)** | End the effect on an event, or run a world macro. GM only. |

### 5. Roll rules in plain language (King's point 4)

- **Today:** one paragraph listing every key, plus a JSON box.
- **Becomes:** a list of rules. Each rule is a row of dropdowns in plain words:
  - **Kind:** Bonus, Advantage, Disadvantage, Critical range, Extra damage, Reroll, Gain resource, Inflict condition, Note.
  - **Applies to:** Attack rolls, Damage, Saving throws (with ability), Skill checks (with skill), Jutsu casting, Everything.
  - **Only when** (optional): for example, while in a stance, while a condition is on you, against a target with a condition, in melee or at range.
  - **Value**, when the kind needs one.
  - **Limits** (collapsed): once per turn, a number of uses, ends when used, on a trigger (on a hit, at the start of your turn).
- **A definition box** under each row says what the rule does in one sentence. For example, "Advantage on your attack rolls while in your stance."
- **Raw JSON** stays in a collapsed "Advanced" box, for rules the dropdowns can't express. Those rules show as a plain line ("A custom rule") instead of being lost.

### 6. The Amp card itself

- **The card sheet in plain sections,** each field with a one-line definition that shows when it's selected or hovered:
  - **What it is:** name, Amp type (or No type), who it belongs to, summary.
  - **Starting it:** activation, start on initiative, can be given to others, uses, cooldown.
  - **How long it lasts:** duration, or "until"; concentration.
  - **What ends it:** checkboxes such as "Staggered" and "0 chakra", each explained.
  - **What it does:** the buff, written out in plain words from its changes and roll rules: "+2 Damage Reduction", "Unarmed Damage Die becomes 1d10", "Advantage on Athletics checks". An **Edit** button opens the effect editor above.
  - **Advanced** (collapsed): identifier, the type the box names, exclusive group, state, temporary HP.
- **Engine fix:** starting an Amp also copies the changes and roll rules from the card's own Active Effects. The card's Changes list still works.

## Phases

| Phase | What |
| --- | --- |
| UX1a | Sections 1–4 and 6: the dictionary, picker, change cards and plain-language tab for every effect editor in the system, plus the Amp card sheet and the engine fix. |
| UX1b | Section 5: the roll rules builder. |

Then back to AMP1b (the Amp audit).

## Questions for King

- **Q-U1 Mode and priority:** hide them for N5e fields (they do nothing there) and tuck them under Advanced for Foundry's core fields?
- **Q-U2 The stored key:** show it to everyone inside Advanced, or only to the GM?
- **Q-U3 Order:** UX1a then UX1b as above, or the roll rules builder first?
- **Q-U4 Categories:** do the player categories in section 1 read right, or do you want different ones?

## King's answers

- Q-U1: yes, no mode or priority for N5e fields; core fields keep them under Advanced.
- Q-U2: everyone can see the stored key.
- Q-U3: the order is right; build both phases at once.
- Q-U4: yes.

## Progress log

- 2026-11-16 King: the Amp card's effect editor overlaps, its wording is too technical, it needs plain definitions; pivot to readability. Claude: plan written; found that card Active Effects aren't applied by AMP1a (fix in UX1a).
- 2026-11-16 King: Q-U1 yes, Q-U2 everyone sees the key, Q-U3 both phases at once, Q-U4 yes. Claude: UX1a and UX1b built (0.60.0-alpha.1). One category added beyond the plan: Other (initiative, inventory slots, max concentration, all dice rolls).
- 2026-11-16 King: the Changes content showed on every tab. Claude: fixed in 0.60.0-alpha.2 (the new flex layout overrode Foundry's hiding of inactive tabs).
- 2026-11-16 King: add Ability Check Mastery (covers the ability's whole skill suite). Claude: n5e.mastery.check.<ability> in 0.60.0-alpha.3; it also applies to the plain ability check; distinct sources count once together with each skill's own.
- 2026-11-16 King: Condition Resistance (advantage on saves to resist a named condition or a condition group). Claude: n5e.conditionResist in 0.60.0-alpha.4; also applies to end-of-turn saves to end the condition.
- 2026-11-16 King: change cards should cascade across rows, max 3 per row. Claude: grid in 0.60.0-alpha.5.
- 2026-11-16 King: an option that reads the current unarmed die and steps it up or down (1 > d4 > ... > d12). Claude: n5e.unarmed.step in 0.60.0-alpha.6, applied after the die override.
- 2026-11-16 King: Condition Immunity, State Resistance and Immunity; level up broken; ability score edits failing. Claude: 0.60.0-alpha.7 fixes level-up.hbs (broken since 0.41: misplaced {{/if}}), collapses duplicate form fields, adds the three fields, and compile-checks every template in the tests.
- 2026-11-16 King: Amp card fields all over the place; drop the Attack pill; Amps panel overlap; jutsu chips stacked (wants a row view and a pill view); two tiny unexplained fields in the damage dialog. Claude: all in 0.60.0-alpha.8.
