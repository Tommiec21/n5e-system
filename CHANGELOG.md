# Changelog

## 0.7.0-alpha.1 — Phase 6: trackers and GM tools

### Added
- **Stamina** (optional rule, N5e Rules → Resting): a Stamina pool equal to your proficiency bonus
  appears on the rail. Feat abilities with Short Rest, Long Rest or rest-based uses spend Stamina
  instead of their own uses. Full on a Long Rest, half back on a Short Rest.
- **Chilled:** when a Chilled creature moves more than 5 ft in a turn, a damage card posts (1d10 cold
  per rank, ignores DR, once per turn). Forced movement is skipped; Apply hits that creature.
- **Fury tracker** (Combat tab): gain and spend buttons, and a Furious token status. Fury lasts until
  the end of the turn after you gain it. While in **Binding Fury Stance**, you gain Fury the first
  time each turn you roll weapon or Bukijutsu damage. The new effect key `n5e.fury.max` lets a
  feat stack Fury (Power Weapon Adept: +2).
- **Marks:** while you concentrate on a Mark jutsu (Rundas, Takeminakata's, Neith's, Apollo's,
  Artemis's, Ullr Ammo), the Combat tab has **Mark targets**. It marks the targeted creatures and
  steps your equipped weapon's Ammunition Die down 1. Marks show on the token and end at the end of
  your next turn.
- **Branded:** jutsu that Brand get a **Brand targets** button on the cast card. It places
  "Branded (Jutsu Name)" on the targeted creatures.
- **Amps:** jutsu that grant an Amp get an **Apply Amp** button on the cast card (targets, or
  yourself). The Combat tab lists your Amps with time left. With the optional Amp limit, a new Amp
  switches off older ones (Singleton: same type; Rule of 3's: oldest), and you pick which applies.
- **8-Inner Gates tracker** (with the 8-Inner Gates: Seimon feat):
  - **Open Gate N** in order (Action, Bonus Action or Reaction), up to the gates your takes of the
    feat allow. Gate 8 asks for the GM's permission.
  - Each gate's bonuses add up (Taijutsu attack and DC, speed, AC, Unarmed dice, crit range, Mastery,
    Pierce), and Gate 2 grants 10 temporary HP.
  - While a gate is open you can't cast Ninjutsu or Genjutsu, and their concentrations end.
  - **Close the gates** applies the Exhaustion, Bruised after Gate 7, and death after Gate 8. The
    gates then can't reopen for 10 minutes.
  - New effect key `n5e.unarmed.dice` (extra Unarmed damage dice).
- **End-of-turn resaves:** when a jutsu says the target can repeat the save at the end of each of its
  turns, the condition it applies remembers the save. At the end of each later turn, a **Resave**
  button appears, and a success ends the condition.
- **GM Party Overview** (Token controls → users icon, GM only): every player character and
  combatant with HP, CP, conditions, states, concentration, Fury, open Gate and Amps. Quick
  Damage / Heal (with type, through the full damage pipeline, undoable) and Add Condition per row.

## 0.6.0-alpha.1 — Phase 5: rests, condition lifecycle, optional rules

### Added
- **N5e Rules panel** (Game Settings → Configure Settings → N5e Rules): every automated rule can be
  switched on or off, grouped by Rolls, Casting, Damage, Conditions, Resting, Rations and Character.
  - Open to all players; only the GM can save changes.
  - **Book defaults** resets everything.
- **Rests** from the character header (Short / Long / Full):
  - **Short Rest:** spend up to half your Hit Dice and, separately, up to half your Chakra Dice,
    rolled together (+ Con per die). Death saves reset.
  - **Long Rest:** half max HP and CP back, half of spent Hit and Chakra Dice back, temporary HP and
    CP end, −2 Exhaustion with food and drink. Counts as a Short Rest for recoveries.
  - **Full Rest:** everything back; [Persists] conditions end.
  - Resource pools and limited uses recover on the matching rest; a summary card is posted.
  - Long and Full Rests need at least 1 HP; Envenomed creatures get no benefit.
- **Rest limits** (GM setting, free by default):
  - **Count:** Short Rests per Long Rest and Long Rests per Full Rest (0 = unlimited).
  - **Time:** one Long Rest per 24 hours, one Full Rest per 96 hours.
- **Ration Pool** (optional): pool size and current rations, Short and Long Rest costs, and whether
  Full Rests are allowed on missions are all editable. A rest without enough rations passes time with
  no benefit. Players' rests spend rations through the GM.
- **Condition lifecycle:**
  - **Turn start:** Burned (1d8 fire per rank) and Bleed (1d6 necrotic per rank) post a damage card;
    Apply hits that creature and ignores DR.
  - **Turn end:** Shocked, Shaken and Demoralized lose a rank; Staggered, Dazed, Berserk, Confused and
    Slowed end. A condition gained during the same turn waits for the next one.
  - **Default 1-minute duration** for conditions that don't persist or end on their own.
  - **Try to end** (hand icon on the rail): pick the check, roll vs the DC, spend the Action. Bleed
    removes an extra rank per 2 over the DC; a failed check against Sealed raises its DC by 4.
  - **Condition resistance:** advantage on saves against conditions you resist. Immunity blocks them.

## 0.5.0-alpha.1 — Phase 4: damage and conditions

### Added
- **Damage cards** roll each damage part separately (so each type keeps its amount) and carry
  **Apply / Half / ×2 / Heal** buttons that apply to the selected tokens.
  - **Interception:** select the interceptor and apply to them; the interceptor replaces the target,
    so their defenses are the ones that count (King's ruling).
  - **DR:** applied **once** to the whole damage calculation, before resistance, reduced by the
    attacker's Pierce.
  - **Psychic:** Genjutsu psychic damage ignores DR.
  - **Resistance and vulnerability:** resistance halves (round down) and vulnerability doubles; both
    on one type cancel. Immunity zeroes it.
  - **Chakra damage** goes to temporary CP, then CP; everything else to temporary HP, then HP.
- **Apply summary card** per application:
  - What each target took and the reductions applied.
  - **Undo** (restores HP, CP, temporary pools and death saves).
  - A **Concentration check** button for any target concentrating on a non-Stable jutsu:
    Con (Chakra Control) vs max(15 + ranks of everything concentrated on, half the damage). A
    failure ends those jutsu.
- **0 HP:**
  - Characters fall **Dying** (unconscious).
  - Damage beyond 0 that's at least max HP is instant death.
  - Damage while at 0 adds a death save failure (2 on a crit), and NPCs that die at 0 are marked
    **Dead**.
  - Healing at 0 ends Dying and resets successes.
  - **Envenomed** creatures can't regain HP.
- **Death saves:**
  - Shown on the rail at 0 HP (success and failure pips, Roll button) and offered on the start-of-turn
    card.
  - d20, no bonuses: 10+ succeeds; a natural 1 counts as two failures; a natural 20 brings you back to
    1 HP and removes two failures.
  - Three successes = Stabilized; three failures = Dead.
- **Conditions from failed saves:** the save button lists what the jutsu inflicts (read from its text,
  e.g. Butterfly Kick: Concussed 1; Flame Whip: Prone, Burned; Snake Constricting Grip: Restrained).
  A failed save shows **Apply** buttons for each, used by the creature's owner, because some only
  apply under conditions the text describes.

## 0.4.0-alpha.3 — Phase 3, release 3: turn flow and the NPC sheet

### Added
- **Start of each combatant's turn** (run once by the active GM):
  - **Concentration upkeep:** half the cost paid at casting (Efficient pays nothing), paid jutsu by
    jutsu; one that can't be paid ends.
  - **Chain** resets to 0 unless a Chain jutsu raised or maintained it since the last turn.
  - **An armed Combo** clears.
  - **Action economy** resets.
  - **Recharge abilities** roll their die (Recharge 5-6 = d6, 7-8 = d8, and so on) and come back
    on a hit.
  - One short chat card summarises it, with an **End** button for each jutsu still concentrated on.
- **Action economy tracker** at the top of the Combat tab: Action, Bonus, Reaction, Special,
  Object.
  - Casting, attacking and using features mark their slot automatically.
  - Click any slot to mark or restore it.
  - The cast dialog warns when the slot is already used.
- **NPC sheet:** every tab, roll, cast, attack and the Combat tab from the character sheet, with a
  stat-block header.
  - Play mode shows a summary (Level · Rank · Role · Type · Template).
  - Edit mode sets level, rank, role, creature type, template, stat-block HP/CP max (blank = from
    level) and the Hit/Chakra Die.
  - The Class/Clan/Background strip is hidden for NPCs.
- Limited uses can recover on **Recharge** (new "Recharge" range field, e.g. 5-6).
- The Phase 1 raw-data sheet stays available (not default) under Sheet configuration.

## 0.4.0-alpha.2 — Phase 3, release 2: attacks, damage, casting

### Added
- **Casting a jutsu**: Use (Jutsu or Combat tab) opens the cast dialog. Alt+click casts at base rank
  when nothing needs choosing.
  - Pick the cast rank (upcasting), and a multiplier or divisor when several apply (caster's
    choice).
  - Tick Moldings (spend Focus; Ninjutsu only, more than one warns about Crash) and Assault Maneuvers
    (spend Superiority Dice; one per turn warns).
  - Pick which concentration to end when at the limit.
  - The preview shows cost, CP left, extra resources and upkeep, and Cast stays off while anything
    blocks the cast (not enough chakra or Focus, missing affinity, concentration full).
  - Casting spends CP and resources, starts concentration with the cost paid recorded (upkeep = half),
    and updates Chain and Combo/Finisher, all in one update.
- **Cast card**: what was spent, the rules text (collapsed), and buttons for the jutsu's parts.
  - **Attack** (rolls the jutsu's attack with the crit range).
  - **Damage** and **Critical** (dice and ability modifier doubled, nothing else).
  - **Save** (each controlled token rolls vs the DC; Genjutsu report four-tier results).
  - **Temporary HP / Healing** (applies to controlled tokens or the caster; temp HP keeps the higher).
- Jutsu with no authored activities have their parts read from their text: "Make a melee ninjutsu
  attack", "Dexterity saving throw", "2d10+2 Fire damage", "[Unarmed damage] + 2d6", "half as much
  damage on a success", "gain 12 Temporary Hit points". All 12 compendium jutsu work this way.
- **Weapon and unarmed attacks** (Combat tab strikes, inventory Use):
  - Melee uses Str, ranged uses Dex, finesse/thrown the better of the two; plus proficiency and
    condition penalties.
  - Damage and Critical buttons are on the card.
  - Weapons with an Ammunition Die roll it after each attack; a 1-2 steps it down, and 0 removes
    the item.
- **Features spend their cost when used**: Moldings take Focus, Assault Maneuvers take Superiority
  Dice (the number in their text, e.g. Relentless Retaliation 2), and limited-use features take a
  use. A feature you can't pay for is refused with the reason. Feature cards show what was spent and
  their rollable parts.

### Changed
- Applying damage to tokens (DR, resistance, interception, concentration check on damage) is Phase 4;
  damage is rolled on the card for now.

## 0.4.0-alpha.1 — Phase 3, release 1: rolls

### Added
- **Everything rolls from the character sheet**:
  - ability checks (click the modifier in the ability strip), saves, skills, toolkits;
  - initiative (rail);
  - discipline attacks (Main tab);
  - the concentration check (Combat tab);
  - every skill action on the Combat tab, which rolls with its −3/−5 tier penalty and shows the
    roll and outcome from Ch6.
- **Roll modifiers:** click rolls; **Shift+click** opens a dialog (advantage/disadvantage plus a
  situational bonus); **Alt** = advantage; **Ctrl** = disadvantage.
- **Chat cards:**
  - Hover the bonus to see its breakdown.
  - Natural 20 and natural 1 are flagged, and attacks use the actor's crit range (+3 cap).
  - Condition penalties apply once per roll.
- **Will of Fire:**
  - Cards show buttons to spend one for a reroll or for advantage after the fact (a second d20,
    keep the higher).
  - The first natural 1 or 20 in an encounter grants one (max 3) with a chat note.
- **Adaptive Initiative** (Scout-Nin): rolling initiative offers Athletics, Ninshou, Illusions or
  Insight instead. In a combat, the roll sets the combatant's initiative.
- **Effect editor:** the Active Effect Key field suggests every N5e key (DR, Pierce, crit range,
  jutsu cost and upkeep by discipline/rank/keyword, save DC, attack, discipline ability, all dice,
  save-tier shift, concentration max, Mastery for every skill/save/toolkit) and the system bonus
  paths. Hover a key to see what it does; known keys turn green.
- Actors now compute ability check totals (`system.abilities.<key>.check`).

## 0.3.0-alpha.3 — Item sheets

### Added
- One N5e item sheet for all 13 item types, replacing the placeholder:
  - **Header:** image, name, and a one-line summary (e.g. "D-Rank Ninjutsu · Fire Release",
    "Simple melee weapon", "Medium jutsu tier").
  - **Sidebar of key facts (PF2e-style):**
    - Jutsu: cost, time, range, area, duration, attack and save DC when owned.
    - Weapons: damage, range, Ammunition Die.
    - Armor: AC, Dex cap, Str requirement.
    - Features: kind, uses, prerequisites, ASI.
    - Also keyword, component and property chips, and the source book.
  - **Description:** rich-text editor, plus the extra text fields an item needs: Chain 1-3 on Chain
    jutsu, Finisher on Finisher jutsu, Overcharge / At higher ranks when present, and stance upgrades.
  - **Details:** typed fields per item type, with click-to-toggle chips for keywords, stimuli,
    damage types, saves, skills and ability options. Weapon and armor properties toggle on and off
    and take a rank where the property is ranked.
  - **Progression** (classes) / **Advancement** (subclasses, clans): a level table showing what each
    level grants, the options, what was chosen, and the class table columns.
  - **Effects:** add, edit, enable/disable or delete the item's Active Effects.

## 0.3.0-alpha.2 — Sheet cleanup from King's review

### Changed
- Combat tab
  - Chain appears once a Chain jutsu is used. An Action Chain jutsu raises it by 1, a Bonus Action or
    Reaction one maintains it, and any non-Chain jutsu resets it.
  - Combo/Finisher appears once a Combo is used, listing the Finishers it arms. A Finisher or any
    other jutsu clears it.
  - Concentration appears once you know a concentration jutsu; Stance once you know a stance.
  - Skill Actions moved to the bottom, and disciplines you know no jutsu in are hidden.
- Jutsu tab: each jutsu is one compact line with the name, keyword chips, components as one short chip
  (HS·CM·CS), upcast marker, range, cost, hit/DC, and a small Use button.
- Rail
  - AC, SPD, Init, Prof and DR sit in one row of small tiles; hover any of them for the full name and
    the math.
  - Hit Dice and Chakra Dice share one row (HD 5/5 d8 · CD 5/5 d10).
  - The rail never scrolls sideways.
  - Recovery notes are terse ("10min/Rest", "SR/LR").
- Inventory: the ammo ladder is now one "Ammunition Die" control. Left click steps it down, right
  click steps it up, and reaching 0 removes the item.
- Features tab
  - Class / Clan / Background cards are a compact strip.
  - The Hijutsu ability picker sits in the Clan section.
  - Class features are grouped as core features, subclass features, then one group per option type
    (Shinobi's Path, Generalization, Assault Maneuvers, Moldings).
  - Feats are grouped by category, and Stances come last.
- Every compendium is organized into folders:
  - Classes: one folder per class.
  - Features: Class > Core / Subclass > options; option types get their own folders.
  - Fighting Stances: by type.
  - Feats: by category.
  - Jutsu: discipline > section > rank.
  - Equipment: by type.

## 0.3.0-alpha.1 — Level-up automation and the first class content

### Added
- **Level Up** (header button) and **character creation** (drop a class on a character): a dialog lists
  everything the new level grants, with a card for every choice, and Apply stays off until each one is
  made. Hover any card for its full text.
  - Hit and Chakra Points by rule (10 + die max + Con at 1st, die max + Con after; never rolled).
  - 1st level: the class's skill and toolkit picks.
  - Features granted automatically; option picks (Shinobi's Path, stances, Generalization, Moldings,
    Assault Maneuvers); Switch Hitter's primary discipline.
  - Subclass at the class's subclass level, then that subclass's own steps on the same page.
  - ASI levels: +1 ability, a feat (level requirement checked, prerequisites shown), and a Mastery rank
    in a proficient skill or toolkit.
  - Jutsu Known increases: learn from the jutsu compendium up to the class's highest rank, hiding jutsu
    whose Release you don't have (affinities gained this level count).
  - Granted affinities and Mastery (Blaze Walker's Fire Release, Scholar's Ninshou).
- **Remove level** (edit mode, arrow-down button): removes exactly what the highest level added,
  including its ASI and feat. Replacing a class removes everything the old one granted.
- Resource pools defined on items appear on the rail automatically and track their own value: Focus,
  Superiority Dice (from the class table), Pyroclasm (starts empty), a clan's Ocular Charges.
- Content, imported verbatim from the books by `tools/content/build_content.py`:
  - Scout-Nin (levels 1-5 and all 20 table rows) with Assault Scout, the 6 Shinobi's Paths,
    3 Generalizations and 10 Assault Maneuvers.
  - Ninjutsu Specialist (1-5, full table) with Blaze Walker, the 15 Moldings, and Chakra Surge's Crash
    and Flow.
  - All 24 Ch13 Fighting Stances (new Fighting Stances compendium).
  - 4 random feats a 4th-level character can take: Storing Seal Soul, Light Step Mastery, Master of
    Disguise, Illusionist Research (new Feats compendium).
  - 10 jutsu: Fire Release: Flame Whip, Fire Release: Fox Fire, Chakra Shield, Ink Clone,
    Beast Fist: Forceful Bull, Butterfly Kick, Snake Constricting Grip, Lotus: Anxious Petals,
    Glamor Tongue, Transform.

### Changed
- Class columns are available to formulas as `@scale.<classCamelCase>.<column>`
  (e.g. `@scale.scoutNin.superiorityDice`).

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
