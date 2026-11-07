# Changelog

## 0.2.0-alpha.3 — Combat tab

### Added
- Combat tab (replaces the empty Actions tab), holding everything a character does in a fight:
  - Trackers: Chain (boxes, plus which known jutsu have an effect at the current exact rank);
    Concentration (slots, each jutsu's upkeep at half the cost paid, Efficient waived, total upkeep
    at turn start with a not-enough-chakra warning, damage-check DC = 15 + ranks); Stance (active
    stance, Leave, switch to another); Combo / Finisher (Combo and Finisher jutsu, "Combo landed"
    toggle that marks Finishers as armed).
  - Pill buttons in five groups: Basic Combat (core actions, unarmed and weapon strikes, active
    features, usable items, and every in-combat skill action with its −3/−5 tier penalty), then
    Ninjutsu, Genjutsu, Taijutsu and Bukijutsu, each split into Actions / Bonus Actions /
    Reactions / Free & Special and sorted by rank.
  - Hover any pill for its full text: jutsu description with Chain, Finisher and Overcharge text,
    keywords, cost, hit and DC; skill actions show the roll and the outcome from the Ch6 table.
  - Click a pill to post it to chat; concentration jutsu get a toggle to start or end concentrating.

### Changed
- Chain, concentration and stance moved off the left rail into the Combat tab.

## 0.2.0-alpha.2 — Character sheet layout pass (SW5e-inspired)

### Changed
- Left rail is now the quick-reference column: portrait with level badge, Armor Class, Initiative,
  Speed, Proficiency, Damage Reduction, Hit Points, Chakra Points, Hit Dice and Chakra Dice bars,
  then Resources, Combat (Chain, concentration, stance) and Conditions.
- Resources: Will of Fire, class/clan resource pools and every feature with limited uses sit in one
  list, each a click-to-set bar with its recovery note ("1 + prof · back on a short or long rest").
- Header: compact ability strip (abbreviation, modifier, score; editable in edit mode) and identity
  bubbles for Class, Clan and Background that open the item.
- Main tab: Saving Throws panel and a compact Disciplines panel replace the large ability cards.
- Features tab no longer repeats resources.

### Fixed
- Feature uses written as formulas ("1 + @prof") now resolve against the owning actor.

## 0.2.0-alpha.1 — Phase 2: character sheet frame

### Added
- New character sheet (dnd5e v5 structure, PF2e touches): header with XP and Will of Fire, left rail
  (HP/CP meters with temp, AC, DR, initiative, speed, hit/chakra dice, Chain, concentration, stance,
  conditions with rank pips and an Add picker), and tabs Main, Actions (alpha.2), Jutsu, Inventory,
  Features, Effects, Biography.
- Play mode by default; the pencil switches to edit mode (scores, proficiencies, name, XP, details,
  all stored fields under Biography).
- Statistic breakdowns: hover AC, DR, initiative, HP/CP max, saves, skills, passives, discipline
  attack and DC, inventory slots to see every part, including condition penalties.
- Action glyphs (Action, Bonus Action, Reaction, Full Turn, Free) and rule chips for keywords,
  components, and weapon/armor properties.
- Jutsu tab: search, discipline filter, grouping by discipline then rank, live cost and hit/DC,
  expandable rows with Chain/Finisher/Overcharge/upcast text and a cast-rank picker.
- Inventory tab: slot meter, Equipped / Weapons & Armor / Storage / Toolkits / Consumables / Loot,
  equip toggles, clickable ammo die ladder and toolkit charges, Ryo.
- Features tab: class, clan (Hijutsu ability picker), background cards, stances with Enter/Leave,
  resource pools, features and feats.
- Pinned strip on Main (drag an item onto it, or use its pin), item context menu (Edit, Post to chat,
  Equip, Pin, Duplicate, Delete), Use posts an item card to chat (no rolls until Phase 3).
- Drag-and-drop rules: replacing a class, clan, or background asks first; duplicate jutsu are refused.
- Data: every derived number records its parts (`system.breakdowns`).
- Tests: view models for every tab, breakdown totals, and Handlebars rendering of every template.

## 0.1.0-alpha.2

### Fixed
- Releases are published as the latest release (not a GitHub pre-release), so Foundry's update link
  `releases/latest/download/system.json` resolves.

### Added
- Gear added to a character equips itself (weapons; armor if none is equipped; containers if none of
  that type is equipped). Equip toggle on the placeholder sheet's item list.

## 0.1.0-alpha.1 — Phase 1: data layer

### Added
- New standalone v13 system (id `n5e`) replacing the V3.1 (0.6.x) code base.
- Data models for 2 actor types, 13 item types, 6 effect types (TypeDataModel).
- `CONFIG.N5E` registries from the rules knowledge base: abilities, skills (Crafting removed),
  toolkits, progression, ranks, disciplines, DC tables, damage types, conditions (23 core + clan-scoped),
  states, keywords, stimuli, components, nature releases, areas, upcast presets, weapon/armor
  properties, stances, amps, terrain, rests, feat categories, skill actions, optional rules.
- Derived-data pipeline in a fixed 10-step order (see `module/data/actor/creature.mjs`).
- Rules functions with tests: proficiency, Mastery caps, HP/CP (10 + die max + Con, then die max +
  Con per level), AC formulas, chakra cost order and half-base floor, condition rank penalties,
  four-tier degree of success, Chain state machine, concentration DC and upkeep.
- Migration framework (world setting + numbered migrations) and the V3.1 → 4.0 mapping; old data is
  converted in memory on load and saved after a GM confirms.
- Placeholder sheets (ApplicationV2) showing every derived number and stored field.
- Tooling: pack/unpack (fvtt-cli, one JSON per document), lint, tests, consistency check, release
  zip, local install, GitHub Actions release workflow for manifest auto-updates.

### Rulings applied (King, 2026-11-07)
- Condition penalties (Shaken, Demoralized, Dazzled, Exhaustion) are folded into displayed totals.
- Skill actions: Proficient action without proficiency −3; Mastery action without Mastery −5;
  penalties don't stack (`rules/skill-actions.mjs`).
- Sealed modifies the base cost (raises the half-base floor) and applies to Cost None jutsu.
- Several cost multipliers: the caster chooses one (the preview shows the best and flags the choice).
- Concentration upkeep is half the cost actually paid when casting.
- Four-tier saves: a total exactly equal to the DC is a Success.
- Crits double damage dice and the ability modifier only; other flat bonuses don't double.
- Exhaustion's −1 to all dice rolls applies once per roll.
- Heavy armor ignores Dex entirely.
- Wearing Heavyweight (X) armor without the Strength score makes you Encumbered.
- Migrating unlinked tokens and world compendiums: deferred as a nice-to-have.
- E-Rank counts as rank 0; half-base cost floor rounds down.
- Hijutsu Flexibility uses the higher ability by default; players may pick one on the clan item
  (world setting "Hijutsu Flexibility: player's pick").
- Multiplication/division effects never stack (speed: Encumbered + Slowed = half, not a quarter).
- The ASI Mastery rank goes to a skill or toolkit only.
- Jutsu Scrolls exist for Ninjutsu and Genjutsu only.
- Adding ranks to a condition resets its duration.
- Damage: interception first (the interceptor's defenses apply instead of the target's), then DR
  once per damage roll, then resistance and immunity.
- Stabilize is an Action; hostile-terrain indirect exposure is a Survival check (incl. Extreme Cold).
- Concentration: base 2, features raise it, no hard cap.
- "Sealing Kit" is the toolkit name; starting wealth is 500 Ryo or 5d6 × 30 (Ch5).
