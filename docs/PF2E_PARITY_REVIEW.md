# PF2e functionality review and comparison

Status: **review for King (2026-11-14); King answered Q-PF1–Q-PF4 the same day. No code changed.**

King (2026-11-14): do a full review of PF2e's functionality from top to bottom (its tiered success system, spell scrolls, magic items, its active effect system), compare it to what we have, and verify we emulate all of its functionality.

**Sources.** PF2e system 8.7.0 source (`foundryvtt/pf2e`, commit 202cc17, read 2026-11-14), mainly `src/module/system` (checks, degree of success, damage, predication), `src/module/rules/rule-element` (all 43 rule elements), `src/module/item` (effect, condition, affliction, consumable, physical) and `src/module/actor` (item transfer, loot, party). N5e at 0.28.0-alpha.1.

**Verdict.** We do not emulate all of it. Tiered success, visibility settings, per-user ownership and the action card are at or near parity. The effect system is the large gap: PF2e has 43 kinds of rule element and we have 4. Scrolls and stored-jutsu items are not automated at all. Each gap below has a proposed home in the plan.

Key: **Match** (same capability), **Partial**, **Missing**, **N/A** (a PF2e rule with no N5e counterpart).

## 1. Tiered success and the check pipeline

| PF2e | N5e today | Status |
| --- | --- | --- |
| Four degrees from the total vs the DC (±10), natural 20 and 1 shift one step | `rules/degree.mjs`: the same four tiers on saves marked four-tier; N5e's own margins and natural rules | Match |
| `AdjustDegreeOfSuccess`: one step up or down, two steps, or "to" a named degree; per outcome ("a success becomes a critical success"); with a predicate | `degreeShift` rule element: a flat ± shift on saves only | Partial |
| Adjustments imposed by the **opposer** (the target's effects change the roller's degree) | None; the engine reads only the roller's own effects | Missing |
| `RollTwice` keep higher or lower (fortune / misfortune), from effects, with `removeAfterRoll` | Advantage and disadvantage counted from sources; rule elements `advantage` / `disadvantage`; no use-once | Partial |
| `SubstituteRoll`: replace the d20 with a set value ("treat the roll as a 10"), optional or required | None | Missing |
| Reroll from the message: hero point (keep new), keep higher, keep lower; old and new rolls shown; hooks | Will of Fire reroll and keep-higher; the reroll replaces the result on the action card. No keep-lower, no forced reroll | Partial |
| `RollNote`: text added to a roll for chosen outcomes, with a predicate and visibility | Notes only from the item's own activity text | Missing |
| Check dialog: toggle each modifier on or off, add an ad hoc modifier, choose fortune/misfortune and roll mode | Adv/Dis buttons and the roll-mode toggle; no per-modifier toggles or ad hoc modifier | Partial |
| Modifier types that stack by rule (circumstance, status, item, untyped) | All bonuses add (N5e rule); stacking policy is unwritten (Tier 3) | N/A until King rules on stacking |
| Check types and domains (attack, save, skill, flat check, initiative, counteract) used as selectors | Selectors: all, kind, type, type:key, kind:scope | Partial |
| Metagame settings: show DCs, show results, show breakdowns, secret damage, secret conditions, secret checks | Attack results and DC/pass-fail visibility; no setting for breakdowns, damage or secret checks | Partial |
| Check prompt generator (GM requests rolls from players) | `workflow/roll-request.mjs` | Match |
| Roll inspector (every modifier, option and predicate behind a roll) | Breakdown on the card; no inspector | Partial |

## 2. The effect system (rule elements)

PF2e does not use Foundry Active Effects for rules. Every item (feat, spell effect, equipment, condition) carries **rule elements**; effects are items of type `effect` dropped on an actor. All rule elements share: `predicate`, `priority`, `ignored`, `requiresEquipped`, `requiresInvestment`, value resolution with brackets and injected properties (`{item|…}`, `{actor|…}`), and lifecycle hooks (before and after data preparation, before and after a roll, on create and delete, on encounter events such as turn start).

N5e has Active Effects with change keys plus 4 rule elements (`modifier`, `degreeShift`, `advantage`, `disadvantage`) with selectors and `all` / `any` / `not` predicates over roll options.

| PF2e rule element | What it does | N5e today | Status |
| --- | --- | --- | --- |
| FlatModifier | Typed bonus or penalty to a selector, with min/max, damage type, `removeAfterRoll` | `modifier` element; change keys | Partial (no use-once, no damage-typed modifier) |
| AdjustModifier | Change or suppress another source's modifier | None | Missing |
| AdjustDegreeOfSuccess | See section 1 | `degreeShift` | Partial |
| RollTwice, SubstituteRoll | See section 1 | advantage elements | Partial / Missing |
| RollOption | Sets a named option other elements test; toggle on the sheet; suboptions; `count`; `removeAfterRoll` | `ruleToggle` on a source; states as options | Partial (no suboptions, no count, no use-once) |
| RollNote | See section 1 | None | Missing |
| DamageDice | Add dice, change die size or count, override damage type, by selector and predicate | Only cast options and activity formulas | Missing |
| DamageAlteration | Change properties of damage being dealt (type, dice, tags) | None | Missing |
| Immunity, Weakness, Resistance (IWR) | Add IWR with exceptions and "double vs" | Traits on the actor; Petrified hard-coded; no exceptions | Partial |
| ItemAlteration | Change another item's data (traits, damage, DC, uses, description) by type or id | None | Missing |
| GrantItem | Grant another item, tracked, removed with its granter, with alterations and preselected choices | Class, clan and background grants in workflow code; not tracked as a link | Partial |
| ChoiceSet | Prompt for a choice, store it, feed it to other elements and to the item name | `flags.n5e.choice` on features (generalizations, paths) | Partial |
| ActiveEffectLike (AELike) | Arbitrary data change at a chosen phase, with a predicate | Active Effect changes (no predicate, fixed phase) | Partial |
| EphemeralEffect | Apply an effect to the roller or the target **only for one roll** (this is how PF2e does "the target takes a −2 to this save") | None; Heightened is hard-coded | Missing |
| Aura | An area around a token that applies effects to creatures inside, with events (enter, turn start/end), a save, and removal on exit | None; areas are placed templates | Missing |
| TokenMark | Mark a specific token so options can test "the marked target" (Hunt Prey) | Combat Rival and Static as states on the target | Partial |
| EffectSpinoff | An item-granted effect the owner can drop on others | Effect buttons on cards | Partial |
| SpecialResource | A custom pool with max and renew rules, shown on the sheet | `resourcePools` on items, TURN1 recovery | Match |
| TempHP, LoseHitPoints, FastHealing | Temp HP on events; HP that can't be healed; regeneration each turn | Temp HP by activity; no fast healing or regeneration element | Partial |
| Strike, AdjustStrike, CritSpec, MAP, MartialProficiency | Add an attack; change strike traits and range; crit specializations; multiple attack penalty; proficiencies | Weapon attacks and properties in code; Extra Attack by name | Partial (data-driven: Missing) |
| BattleForm, CreatureSize, BaseSpeed, Sense, DexterityModifierCap, ActorTraits, SpecialStatistic | Transformations; size, speed, senses and trait changes; custom statistics | Change keys for some (speed, senses); no transformation | Partial |
| TokenLight, TokenImage, TokenName, TokenEffectIcon | Effects change the token's light, image, name, icons | Status icons only | Missing |
| CraftingAbility | Crafting formulas and prepared items | None | N/A unless N5e crafting is wanted |

**Effect items and their lifecycle**

| PF2e | N5e today | Status |
| --- | --- | --- |
| Duration in rounds, minutes, hours, days, encounter, unlimited; expiry at turn start or turn end of the origin; `sustained` | Seconds and rounds; `expires` at turn start, turn end, next turn end; upkeep and concentration | Match |
| Effect context: origin actor, token, item, the target, and the roll and degree that applied it | Origin and `expires.sourceUuid`; the action card records what applied | Partial |
| Badges: a counter or value on the effect, with labels per value, or a formula rerolled on events | Condition ranks; tracker counters | Partial |
| Unidentified effects (hidden from the player) | None | Missing |
| Effects panel (top-right list of everything on your token: click to adjust, remove, read) | Effects listed on the sheet | Missing |
| Effect tracker: ordered expiry, auto-remove expired effects (setting), cleanup at encounter end | EXPIRE1, TURN1 | Match |
| Conditions as items with rule elements; valued conditions; conditions that grant or override others (dying grants unconscious) | Conditions as config with ranks; mechanics partly in code | Partial |
| Persistent damage: formula, type, DC, an editor, a recovery flat check each turn | Turn-start condition damage; Resave button | Partial |
| Afflictions (poison, disease): onset, stages each with conditions, damage and effects, a save per interval that moves the stage | None | Missing (Tier 3 "ailments") |

## 3. Scrolls, wands and stored spells

| PF2e | N5e today | Status |
| --- | --- | --- |
| Drag a spell onto a sheet → make a scroll, wand or spell gem of a chosen rank; the consumable **embeds the spell** | Jutsu Scroll DCs by rank exist in config (`jutsuScroll`: identify, save DC, attack bonus) and the "Cast Ninjutsu/Genjutsu Scroll" skill actions exist as text. No scroll item holds a jutsu | Missing |
| Using it casts the embedded spell through the best spellcasting entry that can cast it, with the caster's DC | None | Missing |
| Trick Magic Item: a skill check to use an item you can't cast from, with a derived DC | The scroll skill actions describe this; not automated | Missing |
| Uses and charges on consumables; auto-destroy at zero; quantity stacks | Consumable `limit`, `destroyOnEmpty`, toolkit charges, Ammunition Die | Match |
| Consumable damage or healing roll on use; categories (potion, elixir, poison, talisman, snare, oil) | Consumable activities and `perRank` formulas | Match |
| Wands: once per day, overcharge | None in N5e's rules | N/A |

## 4. Magic items and physical items

| PF2e | N5e today | Status |
| --- | --- | --- |
| Runes: potency, striking, resilient, property runes with their own modifiers, dice, notes and degree adjustments; rune slots; price valuation | Seals: slots (3, +1 High Quality), seal charges; weapon and armor property ranks. Seal effects are not data-driven | Partial |
| Precious materials and grades | None | N/A |
| Investment (10 items) gating an item's rule elements; `requiresEquipped` | Equipped items feed grants (AC, DR, slots); no investment | Partial (equipped: Match) |
| Item activations with frequency (per day, per hour, per round), actions, self-effect applied on use | Activities with uses and per-period recovery (TURN1) | Match |
| Identification: unidentified name, image and description; identify checks with DCs; misidentify | None (scroll identify DCs exist only as numbers) | Missing |
| Bulk, containers, stowing, encumbrance (setting), carry types (held, worn, stowed), hands | Bulk, containers, storage slots, equipped state | Match |
| Item HP, hardness, broken and destroyed; shields and Shield Block on damage | Fortified is unbuilt (Tier 3); Deflection and Blocking on damage | Partial |
| Sub-items and attachments | None | N/A |
| Coins, price, selling; treasure items | Ryo; loot item type | Match |
| Kits (a bundle that unpacks into items) | Class and background starting gear grants | Match |
| Loot actors (lootable pile, merchant with buying and selling), lootable NPCs (setting), party actor with a shared stash | Party overview window (GM); no loot or merchant actor | Missing |
| Item transfer: drag between actors, quantity dialog, through the GM when you don't own the target; purchase from merchants | Planned as FIN1 | Missing (planned) |
| Trade dialog between players | None | Missing |

## 5. Damage

| PF2e | N5e today | Status |
| --- | --- | --- |
| Damage roll made of typed instances with categories (persistent, precision, splash), materials; crit doubling rules; damage dialog to toggle each part | Typed parts; crit doubles dice; no per-part toggle dialog | Partial |
| Apply buttons: full, half, double, healing; shield block toggle; apply to selected or targeted tokens; IWR applied with a breakdown; undo | Apply full/half/double/heal, per-target rows, Undo, DR and reaction reductions, source trace | Match |
| Reroll damage; secret damage setting | None | Missing |

## 6. Combat, tokens and sheets

| PF2e | N5e today | Status |
| --- | --- | --- |
| Initiative with a chosen statistic; encounter events fire rule elements | Initiative roll; TURN1 events (not reachable from data) | Partial |
| Flanking detection, reach enforcement (settings) | Engaged and reach in POS1; no flanking in N5e's rules | N/A / Match |
| Rules-based vision: senses and detection modes drive what tokens see | Senses in data; Genjutsu stimuli checks; no vision automation | Partial |
| Token auras drawn on the canvas | None | Missing |
| Action macros: one function per skill action with its DC, traits and outcome notes | SKILL1 skill actions with result text | Match |
| Hero points; dying, wounded, doomed; recovery checks | Will of Fire; dying and death saves | Match |
| Compendium browser with filters | Compendium browser | Match |
| Hazards, vehicles, familiars, armies | Summons and Allied NPCs | N/A beyond summons |
| World clock; rest for the night | World time for expiry; rests | Match |

## 7. What to do with the gaps

Most gaps are the same work as the standardization plan, which was already aimed at this. Proposed additions and homes, for King's approval:

| Gap | Proposed home |
| --- | --- |
| Degree adjustments per outcome and "to" a degree; opposer-imposed adjustments; substitute roll; forced reroll and keep lower; use-once elements; roll notes | **STD1** (rule elements v2). Add to its key list: `substituteRoll`, `rollNote`, per-outcome `degreeShift`, `removeAfterRoll` |
| One-roll effects on the target or roller (EphemeralEffect) | **STD1/STD2**: this is the `imposed` direction and action effects already planned |
| Damage dice, damage alteration, adjust-modifier, IWR with exceptions | **STD1**: `damage`, `damageHandling`; add `adjustModifier` and IWR exceptions |
| Item alteration, tracked grants, choice sets feeding other elements, predicates on data changes | **STD1**: add `itemAlteration`, `grantItem` (tracked), `choiceSet` as elements |
| Conditions as data, conditions that grant or override others, persistent damage with a recovery check | **STD3** |
| Encounter events reachable from data (turn start, initiative), fast healing / regeneration, temp HP on events | **STD4** |
| Effects panel; roll inspector; unidentified effects; per-modifier toggles and ad hoc modifier in the roll dialog; metagame settings for breakdowns and secret damage | **STD5** (in-game review); add these to its scope |
| Token light, image and name from effects; token marks as a general element | **STD1** (elements) + **STD5** |
| **Auras** | New batch **AURA1**, after STD4 (needs events and imposed effects) |
| **Jutsu scrolls**: a scroll item that embeds a jutsu at a rank, created by dragging a jutsu onto a sheet; cast through the scroll actions with the config DCs; the "cast a scroll you can't cast" check; identification of scrolls | New batch **SCROLL1** (Tier 3 "item mechanics: scrolls" promoted) |
| Seals as data-driven effects; item HP and Fortified; identification of items | **STD6a** Items, plus Tier 3 item mechanics |
| Loot piles, merchants, lootable NPCs, party stash, trade | **FIN1** covers transfer; loot and merchant actors as **LOOT1** if King wants them |
| Afflictions (onset, stages) | Tier 3 "ailments", after STD3 |
| Stacking by modifier type | King's stacking ruling (Tier 3 "stacking policy") |
| Reroll damage; damage dialog with per-part toggles | Tier 3 |

## King's answers (2026-11-14)

- **Q-PF1:** yes. The listed additions are in scope for STD1 and STD5.
- **Q-PF2:** yes. AURA1 (auras) and SCROLL1 (jutsu scrolls) are their own batches.
- **Q-PF3:** yes. N5e wants loot piles, merchants and a party stash (LOOT1).
- **Q-PF4:** wands, flanking, hazards, vehicles and crafting should all be built, emulating PF2e for now; King will finalize N5e's versions later. (Precious materials and investment limits were not asked for.)

## Progress log

- 2026-11-14 Claude: review written from PF2e 8.7.0 source and the N5e code at 0.28.0-alpha.1. Nothing built.
- 2026-11-14 Claude: King's answers recorded. New batches: AURA1, SCROLL1, LOOT1, and PF2E1 (wands, flanking, hazards, vehicles, crafting, emulating PF2e).
