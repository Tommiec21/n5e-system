# FEATAUTO1 plan: class features automated from authored data, not effect text

Status: **plan for a later release (King, 2026-11-14). Nothing is built. Questions Q-FA1–Q-FA6 below. Proposed to run as STD6a, the class pass, under the system standardization contract `docs/STD_SPEC.md` (Q-STD2).**

King (2026-11-14): plan a later release to review class features specifically, and build them so their functionality is automated directly in the system instead of being based on their effect text.

## Where class features stand (0.28.0-alpha.1)

Counted from `packs/_source/features` (features and options, all subclasses):

| Class | Features | No authored automation | Activities | Cast options | Riders | Effects | Choices | Pools |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Genjutsu Specialist | 107 | 85 | 18 | 2 | 0 | 3 | 0 | 2 |
| Hunter-Nin | 86 | 54 | 28 | 0 | 0 | 3 | 0 | 6 |
| Medical-Nin | 51 | 40 | 8 | 3 | 0 | 0 | 0 | 4 |
| Ninjutsu Specialist | 84 | 77 | 4 | 4 | 1 | 0 | 0 | 0 |
| Scout-Nin | 187 | 168 | 14 | 3 | 3 | 1 | 2 | 0 |
| Taijutsu Specialist | 84 | 53 | 19 | 11 | 0 | 3 | 0 | 4 |
| Weapon Specialist | 101 | 69 | 29 | 1 | 0 | 2 | 0 | 2 |
| **Total** | **700** | **546** | | | | | | |

**How features get behaviour today, in three places plus a fallback:**
- **Authoring tables:**
  - `tools/content/automation.py`: the legacy Python table; activities, cast options, choices, pools.
  - `content/riders/*.json`: CARD1d riders.
  - `build-class-expansion.mjs`: keeps the activities of existing records; the 408 expanded records are text only.
- **Hard-coded behaviour in workflow code:**
  - Moldings Precise, Heightened and Piercing in `postCastCard`;
  - Binding Fury in `onWeaponDamage`;
  - states such as Crash, Flow and Combat Rival.
- **The text fallback:** for any item without authored activities, `rules/activity-parse.mjs effectiveActivities` reads the description and guesses buttons (attack, save, damage, heal). For class features this is the "based on their effect text" behaviour King wants replaced.

## Goal

Every class feature has an **explicit, reviewed automation record**. The text is shown, never parsed. When a feature can't be automated, that is a recorded decision with a reason, not a silent guess.

## Design

### 1. One authoring source per class

`content/automation/<class>.json` generalizes the CARD1d rider tables. It is keyed by feature identifier, and every feature in the class has an entry:

| Field | Purpose | Engine that runs it |
| --- | --- | --- |
| `status` | `automated` / `partial` / `manual` / `none` (no mechanics: flavour, prerequisites) | — |
| `notes` | What is left to the table, shown on the feature card for `partial` and `manual` | Card |
| `activities` | Buttons the feature itself has (save, attack, damage, heal, effect, roll, check, summon) | `workflow/activity-buttons.mjs` |
| `effects` | Passive Active Effects (bonuses, Mastery, DR, change keys) | `rules/change-keys.mjs` |
| `castOptions`, `castRiders`, `riders` | Options in the cast dialog; riders on the action card | `rules/cast-options.mjs`, `rules/riders.mjs` |
| `resources` | Pools: max, die, regain on short/long rest, turn, round or encounter | `rules/resources.mjs`, TURN1 |
| `choices` | Generalizations, paths, evolutions, signature choices | `rules/features.mjs` |
| `states` | Named states the feature turns on or off (Crash, Flow, Elemental Flux, Combat Rival) and what they unlock | `effect-services` |
| `triggers` | Event hooks with no attack or jutsu card: initiative rolled, turn start/end, reaching 0 HP, taking damage | the TURN1 dispatcher |
| `uses` | Per-period uses (`turn` / `round` / `encounter` / rest) | TURN1 |

- **One tool:** `npm run automation` (generalizing `npm run riders`) validates every entry and writes it onto the feature sources, idempotently.
- **The migration:** `automation.py` entries and the rider tables move into these files, leaving one authoring place. The Python table is retired once its output is reproduced byte for byte.
- **The check:** `npm run check` fails on invalid entries or tables not applied. It also lists features of reviewed classes that have no entry.

### 2. Text is display only

- Once a class is reviewed (every feature has an entry), its features stop using the text fallback: `effectiveActivities` returns only authored activities for class features.
- Jutsu keep their current behaviour; jutsu automation is a separate question.
- Hard-coded feature behaviour moves into entries: the Moldings via CARD1d-b, and Binding Fury and the states here. This keeps the engine free of feature names.

### 3. Engine gaps, found per class before authoring

Each class review lists what its features need that no engine yet runs. From the Scout-Nin and Ninjutsu Specialist survey (CARD1d), the gaps likely to recur are:
- **Resources with regain rules:** Superiority Dice, Focus, Pyroclasm, Pressure, Tension, Ghostfire.
- **Marks and links:** Combat Rival, Static, Set-Up and Follow Up.
- **Rank-scaled and level-scaled amounts.**
- **Event triggers outside cards:** "when initiative is rolled", "when you take damage", "when a creature reaches 0 HP".
- **Zones and auras:** Seismic Tether, Pressure Stagnation.
- **Summons and clones acting with your features** (Cloning Scout, Summoner).
- **Target-side reactions:** the reactions batch (King Q-CD10).

A class release only authors what the engine can run. Anything needing a new engine piece is either built in that release, if King approves the gap, or left `partial` / `manual` with a note.

### 4. Review per class (King approves before authoring)

Each class release follows the spec-first rule:

1. **Review table** `docs/classes/<class>-automation.md`:
   - every feature and option in class-table order (by level, then as they appear), core first, then each subclass;
   - for each: the proposed `status`, the automation (which fields), engine gaps, and rules questions.
2. **King reviews and answers.** Unclear mechanics are asked, never invented.
3. **Build:** approved engine gaps, then the class's `content/automation/<class>.json`.
4. **Tests:** one scenario per automated mechanic (feature on an actor, the action, the expected card, actor and effect state), plus 100% entry coverage for the class.
5. **Release** and log it.

### 5. Order and size

- One class per release: FEAT1a–FEAT1g, about 50–190 features each.
- Scout-Nin, the largest, may split core and subclasses across two releases.
- Suggested start: Ninjutsu Specialist, then Scout-Nin, both surveyed in CARD1d. Then Taijutsu, Weapon, Hunter, Genjutsu and Medical (Q-FA1).

### 6. Dependencies

- **CARD1d-b:** `rollMod`, `resource`, `damage` and rider modifiers. Many features need these, so FEATAUTO1 should follow it.
- **A reactions batch** for target-side features (King Q-CD10). Until then those features are `partial` with notes.
- **Tier 3 items** (rule-element expansion, stacking policy, Will of Fire spends, item mechanics) are picked up only where a class needs them, as approved gaps.

## Questions for King

- **Q-FA1: class order.** Start with Ninjutsu Specialist, then Scout-Nin (both already surveyed), then Taijutsu, Weapon, Hunter, Genjutsu, Medical? Or another order?
- **Q-FA2: turning off the text fallback.** Per class, once that class is fully reviewed (proposed)? Or for all class features at once, at the end?
- **Q-FA3: manual features.** Show a "resolved at the table" note with the reason on the feature card (proposed), or leave the card as text only?
- **Q-FA4: subclasses.** Each class release covers core and all its subclasses (proposed), or core features first across all classes, then subclasses?
- **Q-FA5: review depth.** Do you want to review every class's full table before its build (proposed, matching spec-first), or only the rules questions and engine gaps?
- **Q-FA6: CARD1d-b first.** Build CARD1d-b before FEATAUTO1 (proposed, since many features need its effect types)?

## Progress log

- 2026-11-14 Claude: plan written. Coverage counted from the feature sources: 546 of 700 features have no authored automation. Nothing built.
