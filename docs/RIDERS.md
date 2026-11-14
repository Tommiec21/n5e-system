# Authoring riders (CARD1d)

A **rider** is a feature, clan or feat effect that rides on an attack, jutsu or feature use and shows on that action's card. For example: "on a failed save, also apply X", "when you hit, spend a Superiority Die to…", "as part of casting, spend 2 Focus to…".

Riders are **data only**. Adding one for any class needs no code:

1. **Find the feature.** `node tools/report-riders.mjs` writes `docs/generated/rider-coverage.md`, which lists every feature whose text reads like a rider, by class and level, with its identifier and whether a rider is authored.
2. **Add an entry** to `content/riders/<class>.json` (create the file for a new class, clan or feat group), keyed by the feature's identifier.
3. **Run `npm run riders`.** It validates the tables and writes them onto the feature sources. It is safe to rerun. Run it again after any content rebuild.
4. **Run `npm run check`.** It fails if a table is invalid or not applied.
5. **Run `npm run pack` and release** as usual.

Engine: `module/rules/riders.mjs` (pure, shared core) and `module/workflow/riders.mjs`. Add code only when a rider needs an effect type that doesn't exist yet.

## Table format

```json
{
  "class": "scout-nin",
  "features": {
    "<feature identifier>": {
      "castRiders": [ { "label": "…", "appliesTo": {…}, "cost": {…}, "oncePerTurn": true, "rider": { … } } ],
      "riders":     [ { …trigger rider… } ]
    }
  }
}
```

- **`castRiders`**: wording "as part of casting / when you cast… you can spend". Chosen and paid in the cast dialog, beside the other feature options. Its `appliesTo`, `cost` and `oncePerTurn` are cast-option fields (`rules/cast-options.mjs`). `rider` is what goes onto the card.
- **`riders`**: wording "when you hit / when a creature fails / when you deal damage". Offered on the card as **Use <label>** to the caster's owner once a target qualifies, and paid then.
- A maneuver authored as a cast rider leaves the "Moldings and Maneuvers" checkbox list. It still counts toward one Maneuver per turn.

## Rider fields

| Field | Values |
| --- | --- |
| `label` | Button and chip text |
| `when` | Any of `hit`, `crit`, `failedSave`, `damageDealt`, `cast`. A target qualifies when any of them happened to it |
| `appliesTo` | `kind` (`jutsu`/`attack`/`feature`), `discipline`, `keywords` (any), `natureRelease`, `inflictsCondition`, `inflictsTag` (e.g. `elemental`) |
| `target` | `each` (every qualifying target, the default), `one` (the user picks one), or `chosen` (the user picks creatures from the card's targets; the trigger is the card's, not each creature's) |
| `requires` | `{ "state": "combatRival" }` for Specialized maneuvers: offered on any row, with a "not your Combat Rival" warning (King Q-CD7) |
| `cost` | `{ "pool": "superiorityDice", "amount": 1, "roll": true }`. With `roll`, the pool die is rolled once and is `halfPoolRoll` in amounts |
| `oncePerTurn` | `true` for a trigger rider usable once per turn |
| `effects` | An ordered list, below |

## Effects

| Type | Fields | What happens |
| --- | --- | --- |
| `addRanks` | `amount` (number or `halfPoolRoll`), `conditions` (`inflicted` or a condition tag) | Raises the ranks on the action's own "Apply <condition>" button for qualifying targets. Several stack additively, then the condition's cap (King Q-CD5) |
| `inflict` | `choose: [{key, kind, ranks, label}]`, optional `expires` | "Apply X" per qualifying target. With several choices, the user picks one when using the rider, for every affected creature (King Q-CD8) |
| `save` | `ability`, `dc: {source: action\|nin\|tai\|gen}`, `inflicts`, `text` | **One save per event** (King): its inflicts apply on a failure of the action's own save. Only when the action forces no save does this rider's save become the event save, and then each target rolls it once |
| `effect` | `name`, `changes`, `seconds`, `state`, `expires`, `limit: {state, count}` | "Apply <name>" per qualifying target. `limit` caps marks per caster (count may use `lvl(…)`), and the oldest ends when exceeded |
| `note` | `text` | Shown on qualifying rows; resolved at the table |

`expires` uses the existing vocabulary: `turnStart` ("until the start of your next turn"), `turnEnd`, `nextTurnEnd`.

## Who presses what

- The **caster's owner** chooses cast riders, uses trigger riders, picks targets and conditions, and may cancel a rider before anything from it is applied (its cost is refunded).
- The **target's owner** (the GM for NPCs) rolls the event save and applies conditions and effects to their own creature.
- The **card's author** (or a GM) records rider uses on the card.

## Not yet (CARD1d-b and later)

- Effect types `rollMod` (forced reroll taking the lower, maximize damage dice), `resource` (regain a die), `damage`.
- Rider modifiers (Willpower Surge).
- Riders on the creature being hit or saving (reactions): a later batch (King Q-CD10).
