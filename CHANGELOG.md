## 0.15.0-alpha.2 — Timed effects expire (EXPIRE1)

- Effects with a duration (generic effects, Amps, Marks, activity effects) are removed when their duration runs out.
  - In combat: checked for every combatant at each turn start.
  - Out of combat: checked whenever world time advances (rests, travel, the GM's clock).
- Conditions that don't Persist now expire out of combat after their duration (the 1-minute default). In combat they keep their turn-end processing.
- Never removed automatically: effects with no duration, [Persists] conditions, and effects tied to their source's turns.
- What ended is listed on one GM-whispered card.

## 0.15.0-alpha.1 — Turn engine (TURN1)

- Turn start, turn end, round start and combat start/end now come from a new N5e Combat class, using Foundry's forward-only turn methods (as dnd5e does). Rewinding a turn or round no longer re-runs upkeep, condition damage, decay, recharge or effect events. The duplicate turn hooks are gone.
- Uses and resource pools marked per turn, per round or per encounter now recover: turn at the creature's turn start, round at each round start, encounter at combat start and end. What recovered is listed on the turn card.
- **Concentration upkeep prompt (King 2026-11-13).**
  - At the start of each turn, the owner ticks which concentration jutsu to maintain. A running CP total stops them choosing more than they can pay.
  - If chakra covers none, all end automatically.
  - An unanswered prompt ends those jutsu at the end of the turn.
  - Jutsu that are dropped lose their areas, summons and dependent effects.
- New world rule "NPC concentration upkeep": Automatic (default; maintain while chakra allows), Ask the GM each turn, or Manual tracking. Allied NPCs are asked like players.

## 0.14.0-alpha.2 — dnd5e-parity chat visibility and roll requests (OPS1b)

- Attack cards list every target with Hit / Miss / Critical hit / Natural 1. The new rule "Attack results shown to players" (all / hit-miss only / GM only; default GM only) matches dnd5e's Attack Roll Visibility. The GM always sees results and AC.
- New rule "DCs and pass/fail shown to players" (everyone / player-owned rolls only / GM only; default player-owned), matching dnd5e's Challenge Visibility.
- New rule "Conceal NPC item descriptions", matching dnd5e's setting of the same name.
- GM roll requests: a request icon next to [[/save]] and [[/check]] links posts a request card for the selected tokens, or for anyone. Each player sees and rolls only for creatures they own.
- Effect-application cards (from OPS1a) are wired to chat: the owner of each recipient presses Apply.
- Not included: a Bloodied visibility setting. N5e has no on-token Bloodied marker yet, so the setting would control nothing.

## 0.14.0-alpha.1 — Multiplayer parity with dnd5e/PF2e and Allied NPCs (OPS1a)

- No GM approval dialogs anywhere, and no GM relay for player → NPC changes (King 2026-11-13). Each user changes only what they own, as in dnd5e and PF2e; the GM applies results to NPCs.
- Casts, attacks, rolls, rests, feature uses, resources, healing, Will of Fire, death saves and tracker buttons run on the clicking user's client.
- Apply buttons act on owned recipients and name the rest ("The GM applies this to: …").
- Effects on creatures you don't own go on an Apply card for their owner. Effects tied to concentration end with it.
- "Successful hit" reactions run for owned recipients without a confirmation dialog. A player's choice on a GM's reaction window applies automatically.
- **Allied NPCs.** Summons, clones and companions are placed for the summoning player, who owns and controls them. They join combat beside the caster. New world rule "Players may summon Allied NPCs" (default on).
- **Owner intents.** Allied NPC placement, party rations and reaction choices finish on the GM's client from an authenticated flag on the player's own actor, with no socket and no dialog.
- **Removed:** `module/socket.mjs`, `automation/multiplayer.mjs`, the `multiplayerCoordination` rule and the manifest socket.

## 0.13.0-alpha.14 — Complete Jiraiya jutsu content import (JUTSU1)

- Import all 968 source-book jutsu into the core Jutsu compendium: 403 Ninjutsu, 167 Genjutsu, 146 Taijutsu and 252 Bukijutsu.
- Organize 118 folders as Discipline / Nature Release or Group / Rank; preserve the existing 12 jutsu IDs and distinguish both Brutal Block variants.
- Preserve original rules, keywords/stimuli, costs/components, riders and 1,535 source expressions with line/hash provenance. Record four metadata-label repairs without changing source text.
- Author existing-schema activities conservatively: never combine alternative/periodic damage with base damage. 192 source-clear higher-rank damage maps are consumed by the existing cast-card activity selector; current unarmed damage types follow the active stance.
- Charge imported fixed Special chakra costs through existing cost rules. Eleven unresolved/scheduled/ambiguous costs are explicitly manual rather than silently free; complex choices/riders remain source-directed.
- Add a reproducible checked-in source snapshot, importer, coverage report and ten focused checks. No new gameplay framework, live verification or local installation.

## 0.13.0-alpha.13 — Compact Foundry damage cards (CHAT1)

- Use Foundry's standard expandable dice renderer for the actual damage roll only.
- Remove custom roll prose, repeated damage types/totals, normal-versus-critical comparisons, applied calculation blocks and coordination/undo boilerplate from new chat cards.
- Applied cards retain the recipient/result and a compact dice icon for the source roll. Verification and calculation records remain internal; arithmetic is unchanged.
- Seven focused checks passed; no live verification or local installation.

## 0.13.0-alpha.12 — Damage roll/application trace (DT1)

- Show original formulas, kept/discarded die results and normal/critical formula basis directly on new damage cards.
- Associate application with the saved source roll, verify typed amounts/totals against stored rolls, and retain a structured per-recipient audit.
- Show rolled amount, DR/multiplier steps, final damage, temporary-pool consumption and HP/CP before/after. View source roll without rerolling; preserve source whisper/blind visibility on summaries.
- Resolve legitimate card actions stored in message flavor as well as content, while fingerprinting both and still rejecting changed action data.
- Six focused automated checks passed; no damage-rule change, live testing or local installation. Separate ActorDelta duplicate-item and GM-approval policy reports are not claimed fixed.

## 0.13.0-alpha.11 — Effect services (ES1)

- Dynamic numeric changes use the existing bounded N5e arithmetic parser and a fixed base/source snapshot. Invalid or missing references skip only that change with actor diagnostics.
- Event-count expiration handles turn start/end, combat end, damage taken, confirmed hits and rests with persisted counters and duplicate event suppression.
- Opt-in world Macro bindings require active-GM approval keyed to the effect, bindings, Macro code and ownership. Foreign scripts remain inert; Macro code is trusted, not sandboxed.
- Add optional appearance provider registration and a reversible built-in filter (grayscale, sepia, brightness), with independent cleanup and error isolation.
- Integrate authoring and approvals into the expanded editor and APIs. Portable copies exclude executable bindings. No live verification or local installation.

## 0.13.0-alpha.10 — Expanded effect authoring (EE1)

- Expand the existing Foundry effect editor with a searchable typed field browser, explanations, presets, validation and draft-only add/remove/import actions. Save is the commit boundary; stale document saves are refused.
- Expose existing N5e level/stance suppression, activity exclusivity, state, conditional roll predicates and source-turn expiration controls alongside native transfer/duration settings.
- Add bounded field estimates, N5e contribution previews, source/timing diagnostics and a raw draft view. Preserve unknown existing flags and unchanged legacy rows.
- Export portable N5e effect data; import/copy disabled effects without IDs or foreign executable flags. Explicitly identify future engines as unavailable.
- Nine focused automated checks passed; no live verification. GitHub publication only.

## 0.13.0-alpha.9 — Native multiplayer coordination (MP3)

- Route native casts, feature use, attacks, activities, resource payments, healing, rests, trackers, saves and damage through active-GM execution, preserving the existing planners and local actor locks.
- Carry player selection/target snapshots; reconstruct actions from original stored cards and reject cards changed while awaiting approval. Remote requests retain mandatory GM review.
- Return verified durable results, coalesce simultaneous clicks, retain duplicate detection and isolate failed requests with an unconfirmed-result warning. No automatic retry or expanded recovery.
- Add Retarget to rolled damage; retain the original roll and use the recipient's defenses. Permit successful-hit confirmation windows and rolled-damage reactions only. Other timings are manual.
- Defer nested chains and advanced redirects by user instruction. No live verification; user performs in-game acceptance. No local Foundry installation changes.

## 0.13.0-alpha.8 — Extensible reactions and reviewed recovery (RX3 / MP2)

- Replace hardcoded reaction branching with an owned-item adapter registry, multiple offers, deterministic priorities and one-use preparation.
- Add a GM item-sheet damage-reaction editor: rolled DR, multipliers, resource costs, reaction spending and automated source sight. Keep existing DR/HP/CP arithmetic.
- Resolve explicitly authored nested interruptions newest first, with depth/work bounds and no mutation lock held while choosing child reactions.
- Revalidate eligibility, costs, authority and turn immediately before commit, including after DR allocation dialogs.
- Share durable GM command coordination through the public API; allow explicit recovery of interrupted review, never replay applying/uncertain mutations.
- Publish the exact CI-verified artifact without a redundant release test run. No local Foundry installation changes or new live verification.

## 0.13.0-alpha.7 — Live-verified reaction fixes (LIVE1)

- Close stale owner prompts on resolution, handoff or deletion without sending an extra decision.
- Make long automation recovery histories scrollable.
- Record 17 isolated live scenarios, their coverage and limits. No production Foundry installation changes.

## 0.13.0-alpha.6 — N5e dice-expression precedence (MATH2)

- Route N5e-owned dice through a local grouping adapter so addition/subtraction precede multiplication/division; keep Foundry dice evaluation and third-party Roll behavior intact.
- Preserve explicit grouping, supported pool/function syntax and flavor; report unsupported syntax rather than falling back to conventional precedence.
- No global Roll patch or new dependency.

## 0.13.0-alpha.5 — Observer visibility and Uncanny Dodge (VIS1)

- Use observer-specific Foundry13 detection with token-size sampling; Blindsight qualifies per user ruling, while unsupported/ambiguous sight remains unresolved.
- Integrate visibility-checked Uncanny Dodge with the optional coordinated damage pilot, reaction revalidation and non-stacking/cancelling multiplier rules.
- No GM visibility substitute, full cover engine, elevated-scene certification or live multiplayer certification is claimed.

## 0.13.0-alpha.4 — Coordinated damage and base Deflection (RX2)

- Optional GM damage-card workflow with durable per-card/actor identity, private reaction decisions, eligibility rechecks and combined damage/resource/reaction updates.
- Apply user rulings: DR independently protects HP/CP; the creature chooses type allocation within a pool; Deflection is rolled DR with the same rules.
- Legacy manual workflow stays default; coordinated corrections use explicit reconciliation rather than unsafe snapshot undo. Advanced Deflection and Uncanny Dodge remain outside this pilot.

## 0.13.0-alpha.3 — N5e numeric precedence and damage modifiers (MATH1)

- Numeric formula parser evaluates addition/subtraction before multiplication/division, with explicit grouping and no JavaScript evaluation.
- Flat damage subtraction precedes multipliers; equal half/double sources apply once and opposite sources cancel.
- Scope: numeric preparation and damage planning; complex Foundry dice syntax still requires a later adapter. No automated ability use yet.

## 0.13.0-alpha.2 — Reaction decision-window pilot (RX1)

- Optional private owner accept/decline prompts, active-GM review and final resolution, persisted deadlines, and a GM-editable 60-second timeout (0 disables it).
- Decisions never auto-spend or apply effects; no unattended use of unauthenticated player replies. Uncanny Dodge remains pending automated visibility.
- Records the user's N5e arithmetic precedence ruling; arithmetic implementation is a separate prerequisite batch, not silently changed here.

## 0.13.0-alpha.1 — Multiplayer receipt foundation (MP1)

- Keep GM review mandatory for unauthenticated remote effect/ration requests, superseding the 0.10.1 automatic-request option by explicit user direction.
- Persist request intent/results, reject changed-content replay, serialize remote requests and stop uncertain applications from retrying after reconnect.
- Add GM-only receipt inspection and explicit archive/epoch rotation. Retain upstream button, save-cost, parser, free-cost and ration fixes.
- Scope: existing remote effect/ration relay, not yet coordinated combat or reactive prompts. Live multi-client validation remains outstanding.

# 0.12.0-alpha.2

- Remove all 147 imported Clan Feats and their empty folders; exclude them from future content builds while the rules are being revised. Preserve clan features, Hijutsu and other clan content.

# Changelog

## 0.10.1-alpha.1 — Review fixes

### Fixed
- **Failed button clicks:** a click that stops with a warning (no targets, not the owner, coated weapon you don't own...) now refunds its pool cost and no longer uses up once-per-turn or the action.
- **Player effects on enemies:** Marks, Branded, Amps and jutsu effects on creatures a player doesn't own apply right away again; the GM's client still checks every request. A declined or timed-out request shows a notice and the other targets still get the effect.
- **Costed saves:** saves with a cost and no damage (Okuri-Inu Fang) get a **Use** button that pays it. The defenders' save button stays free, and a once-per-turn feature's allowance is no longer blocked by its own save clicks.
- **Text parser:** damage types in jutsu text are matched with correctly escaped names.
- **Free pool costs:** a 0-cost pool feature (Weapon Katas) no longer posts a "Spent 0" roll.
- **Rest with rations:** a declined or timed-out ration request stops the rest with a notice instead of an error.

### Added
- **N5e Rules → Casting and combat:** "GM approves player requests" (off by default). On: the GM confirms each player request in a dialog, as in 0.10.0.

## 0.10.0-alpha.1 — Shared execution and maintenance safeguards

### Correctness
- Preserve resource-gain, amount-choice and repeat-save activity fields through item loading.
- Apply once-per-turn activity limits, including alternative buttons on one feature; record declared action costs.
- Route activity and damage-card healing through one service, including Envenomed and revival cleanup.
- Validate resource amounts and serialize local commands; refund a cancelled activity's pool payment.
- Keep recognized alternative save outcomes separate, avoid immunity/removal infliction, and recognize runtime registry additions.
- Show explicit instructions for manual activity kinds instead of silently omitting them.

### Maintenance
- Separate activity execution, resource arithmetic/payment, actor sequencing and healing into focused modules.
- Reject undeclared activity fields during verification; registration keys/labels are validated.
- Add versioned repair for dropped booleans on linked world items without replacing IDs or other edits.
- Record migration failures and retain their prior version; validate replacements and attempt restoration on failure.
- Gate both CI and publishing on the same verification command, also required by manual release builds.
- Add focused regression coverage and an opt-in live Foundry smoke check (`game.n5e.api.runSmokeTests()`).

### GM behavior
- Remove unrestricted remote deletion and validate effect/ration requests. Remote privileged requests
  now require GM review because system sockets do not authenticate senders. Owned changes remain direct.
- Ration-dependent player rests wait for approval before granting benefits.

### Boundaries
- Local command queues prevent overlapping clicks on one client, not simultaneous control from several clients.
- Text parsing remains a fallback; unusual conditional prose needs authored activities.
- Live Foundry and multiplayer smoke checks are separate from automated Node verification. See `docs/MAINTENANCE.md`.

## 0.9.3-alpha.2 — Rules settings window fix

- Fixed **Open N5e Rules** failing to open: its template had multiple top-level elements, which Foundry's ApplicationV2 renderer rejects. A single wrapper now contains the header, rules and footer.
- Preserved scrolling for the grouped rules and the player's read-only view.
- Added regression coverage using the actual panel context and template for both GM and player views.

## 0.9.3-alpha.1 — Automation framework

### Added
- Data-driven contextual modifiers and save-tier shifts on owned items and Active Effects, with nested predicates, source labels and optional Features-tab toggles.
- Expandable d20 roll breakdowns. Target-specific predicates use a single target, never a guessed target for a group.
- Authored four-tier save text selects one outcome; Will of Fire rerolls recalculate the outcome. Existing save-tier Active Effects now participate in d20 saves.
- Temporary weapon damage coatings, with typed damage, expiry and optional use counts. Weapon attacks and strikes apply coatings without editing base weapon data; uses are spent on the damage roll.
- GM summon/clone placement from authored world Actor templates, using unlinked tokens. Concentration and elapsed world time clean up flagged tokens across scenes without altering the template actor.
- Public automation API, `n5e.summoned` extension hook, and `docs/AUTOMATION_FRAMEWORK.md` with examples, stored fields, boundaries and a live-world checklist.

### Scope
- This completes the reusable framework batch after 0.9.2. Features still need authored rule data; it does not infer every mechanic from prose.
- Save outcomes display their selected text; conditional effects still require application. Summon templates retain their authored stats and ownership. Coatings currently add damage, not arbitrary on-hit conditions or weapon properties.
- Verified outside Foundry; live v13 world testing remains required. No additional classes, levels or clans are imported.

## 0.9.2-alpha.1 — Compendium Browser

### Added
- **N5e Compendium Browser:** every Item compendium plus world items in one window.
  - Open it with the **N5e Browser** button in the Compendium and Items sidebars, the **Browse** button on the character sheet's Jutsu tab, or `game.n5e.browser()`.
  - **Jutsu tab:** rank, discipline, section, keywords (all must match), activation, chakra cost range, concentration, has an area, source.
  - **Features & Feats tab:** category, class, option group, level up to, source.
  - **Stances tab:** category, source.
  - **Equipment tab:** type, category, weapon group, price up to, source.
  - **Classes & Origins tab:** classes, subclasses, clans, backgrounds.
  - Every tab: name search (optionally the rules text) and sorting (rank, name, cost, level, price).
  - Filter lists show how many items have each value.
  - Drag a row onto a sheet; click a name to open it; **+** adds it to your selected token or character.

## 0.9.1-alpha.1 — Shortcuts in text

### Added
- **Roll shortcuts** for journals, item descriptions and chat (full list in `docs/TEXT_SHORTCUTS.md`):
  - `[[/save dex dc=15]]`; `dc=nin|tai|gen` uses the item owner's save DC; `inflict=staggered,bleed:2` adds Apply buttons on a failure.
  - `[[/check prc dc=12]]`, `[[/check tool=medicine]]`, `[[/check str]]`.
  - `[[/damage 2d6 fire, 1d6 cold]]`: a damage card with Apply buttons.
  - `[[/heal 2d8 + 3]]`; add `temp` or `cp`.
  - Saves and checks roll for your selected tokens (else your character), the same way cast-card buttons do.
- **Condition and State links:** `@Condition[bleed 2]`, `@State[prone]`.
  - Hover shows the rules (KB 05).
  - Click applies to the selected tokens; Shift+click removes.
- **Custom labels:** `{label}` after any shortcut.
- Jutsu descriptions on cast cards resolve shortcuts with the caster's numbers.

## 0.9.0-alpha.1 — Jutsu on the map

### Added
- **Area shapes from jutsu:**
  - Cast cards for jutsu with an area get a **Place area** button (e.g. "20-ft radius", "15-ft cone").
  - With the new rule on (default), placement starts right after casting.
  - The area comes from the jutsu's area fields, else its range text ("Self (15-foot cone)"), else its description.
  - Upcast rules that grow the area add to the size for each rank cast above base.
  - Shapes: cone (53°), line (with its width), cube, sphere/radius, cylinder.
  - Self areas sit on the caster; cones and lines turn toward the cursor. Other areas follow the cursor, snapped to the grid.
  - Shift or Ctrl + mouse wheel rotates. Left click places; right click or Escape cancels.
- **Targeting from the area:** placing an area targets every token inside it (any square it occupies). The caster is left out of Self areas.
- **Lasting areas:**
  - Instantaneous areas leave the map at the end of the caster's turn.
  - Timed areas (1 minute = 10 rounds) leave when their round comes.
  - Concentration areas leave when concentration ends.
  - A creature starting its turn inside a lasting area gives the GM a card with that jutsu's buttons.
- **Senses on tokens:**
  - Darkvision sets the token's sight range and darkvision mode.
  - Blindsight, Tremor Sense, True Sight and Chakra Sight become detection modes.
  - New **Chakra Sensing** detection mode: notices creatures with chakra, through walls.
  - Changing a sense on the sheet updates every token. Set a token's `flags.n5e.manualVision` to keep its own settings.
- **Movement:**
  - Climbing or swimming without that speed, and crawling, cost +1 ft per ft (Foundry's difficult terrain still applies on top).
  - The token ruler turns yellow past your speed (Dash) and red past double.
- **N5e Rules panel:** new "Map: areas, senses and movement" section with a toggle for each of the above.

## 0.8.1-alpha.1 — Class feature automation

### Added
- **Genjutsu Specialist:**
  - Reality Shift (Alteration of Reality) as a 1-minute Will Amp state that spends an Actualization Die.
  - Rending Thoughts: Wisdom save on the Genjutsu DC, with damage buttons for success, failure and critical failure.
  - Mental Refocus and Phantasm buttons for Actualization Dice.
  - Mind Over Matter as a Genjutsu cast option (+Genjutsu modifier psychic damage).
  - Phantom Vapors: Alchemist's tools, a Vapor Charges pool, throw and recharge buttons.
  - Inceptions: Hallucinatory Instrument, Illusory Weapon attacks (melee and ranged), Reality Marble, Temporal Stopwatch.
  - Mirages: Beguiling Influence and Illusionary Vigor Mastery, Demon Sight darkvision, Cloak of Chains, Decelerate,
    Book of Stolen Secrets, Psyche Drinker, Relentless Pain, Muddled Movements.
- **Hunter-Nin:**
  - Creed proficiencies granted (Warden, Brutal, Medical, Stalkers, Void, Wolf), plus Brutal speed and Stalkers Blindsight.
  - Pools with gain and spend buttons: Carnage, Black Medicine Array, Dread Arsenal, Prosthetic uses, Posture.
  - Void Anchor marks; Cunning Action Stealth check.
  - Every Skilled Exploit gets a check button for its skill.
- **Medical-Nin:**
  - Channeled Healing adds its healing to Medical jutsu automatically (once per turn).
  - Rejuvenating Rest roll; Talented Support and Hematoxic Touch cast options.
  - Blight and Healing Surge counters; Ascension state; Transfigured Technique.
  - Byakugou Seals pool and Battle Medic state; Chakra Scalpel attack; Mystical Palm.
- **Taijutsu Specialist:**
  - Sustained Pressure damage and Valve Break cast option.
  - Path cast options in a Taijutsu stance (Tyrant, Genius, Savage, Predator, Hero, Technician); Genius +1 Taijutsu DC.
  - Martial Techniques: saves, rolls and Martial Die cast options (Arresting, Forceful, Drowsy, Martial Guard,
    Parry The Shot, Delayed Fall, Precise, Raw, Technical, Shockwave, Quivering, Regenerative Surge,
    Hurricane Strikes, Step of Savagery).
  - Moment of Stillness breakers (Bone, Balance, Flow) with saves and Broken effects.
  - Momentum, Tempo and Perfection counters; Elemental Cloak state.
- **Weapon Specialist:**
  - Critical Focus (+1 Bukijutsu crit range); Eye for Skill check.
  - Augmentations: Restorative healing, Mobile speed roll, Sensory Blindsight, Enduring/Psyche/Tactical spends.
  - Katas: saves (Battle Boast, Disorienting Strike, Horrid Aggression, Muted Strike), rolls, effects,
    Hidden Hand Mastery, Efficient Bukijutsu cast option, Discipline gain buttons.
  - Doctrines: Battle Trance, Waltz and Samba (one at a time), Vector Seal, Quarry, Obsidian Ward pool, Provoke, Okuri-Inu Fang.

## 0.8.0-alpha.1 — Five more classes, levels 1-5

### Added
- **Genjutsu Specialist, Hunter-Nin, Medical-Nin, Taijutsu Specialist and Weapon Specialist**,
  levels 1-5. Each comes from the book with:
  - Its table, proficiencies, every core feature from 1st to 5th level, and its stance pick.
  - Every subclass, with its features up to 5th level.
  - Every option list, with options that need a level above 5th left out.
  - The level-up dialog handles them all.
  - **Genjutsu Specialist:**
    - 5 Genjutsu Pledges, 4 Genjutsu Inceptions, and 46 Malleable Mirages (2 at 2nd, 1 more at 4th).
    - Actualization Dice (1 + proficiency, d6). With Mental Refocus, a Short Rest gives 2 back.
    - Illusions Mastery.
  - **Hunter-Nin:**
    - 6 Hunter Creeds, and 27 Hunters Exploits (Skilled and Combat).
    - Lethal Precision (Taijutsu or Bukijutsu), plus Silent Killing granted.
    - Lethal Attack dice from the table.
    - Skilled Exploit uses (proficiency per Long Rest).
    - A free-choice Mastery at 5th.
  - **Medical-Nin:**
    - 5 Tenets of Medicine.
    - Medical Domain with Domain Charges (4; all back on a Short Rest).
    - Medicine Mastery.
  - **Taijutsu Specialist:**
    - 5 Taijutsu Styles, 17 Martial Techniques, 6 Paths of Perfection, and the 3 Moment of Stillness
      techniques.
    - Martial Dice, which refill at the start of every turn.
    - Replaces the Phase 1 sample class, keeping its id.
  - **Weapon Specialist:**
    - 6 Combat Doctrines, 30 Katas in their four groups, and 6 Augmentations.
    - Weapon Focus group.
    - Discipline (d12 Flurry Die; all back on a Short Rest).
- **Automation for the new classes:**
  - **Genjutsu Specialist:**
    - Actualization cast options: +rank d6 damage, or −1 to the targets' save per die.
    - Actualization skill-check die.
    - Chakra Disruption: a cost increase on the targets.
  - **Hunter-Nin:**
    - Lethal Attack damage buttons (full, or half for the Attack action).
    - Swift Response Initiative Mastery.
    - Primary Target marker.
  - **Medical-Nin:** Preserve Life, Sustain Life and Take Life buttons that spend a Domain Charge.
  - **Taijutsu Specialist:**
    - Martial Technique AC.
    - Enhanced Movement speed: +10, then +15 from 5th.
  - **Weapon Specialist:** Deflection, Chakra Strike and Chained Momentum buttons that spend
    Discipline.
  - **Option costs:** Martial Techniques spend Martial Dice, Katas spend Discipline (only the ones
    whose text spends it), and Skilled Exploits spend a use.
- **Level-up:** free-choice Mastery steps.
- **Framework additions:**
  - Pools that refill each turn.
  - Pool maxes that scale by level.
  - Rest recovery by formula, which can require a feature.
  - Effects that apply only at some levels.
  - `@rankValue` in cast-option formulas.
- **Folders:** class option lists are filed by their book groups (Skilled / Combat Exploits, Kata
  groups).

### Fixed
- Only Scout-Nin's Extra Attack gives a third attack with Kunai, Shuriken or Senbon.

### Not included
- Intelligence Operative, Puppet Master and Science-Nin stay out until they're remixed.

## 0.7.1-alpha.1 — Automation pass for the content in the system

### Fixed
- **Unarmed damage:** only Taijutsu stances (and stances that say so) set the Unarmed die to d6.
  Bukijutsu and Chakra stances no longer do. Serpent Fist deals piercing, Silent Killing slashing
  (d8 with Iron Claws), and Iron Fist rolls a d8 with Combat Bracers when Strength is your Taijutsu
  ability. Inner Gate dice now also apply to Unarmed Strikes.
- **Stance effects** apply only while that stance is active.
- **Focus** only recovers to half on a Short Rest with Tenketsu Refinement (5th level).
- **Chakra Surge** now includes the Flow box, which the book layout had placed in Chakra Compression.

### Added
- **Stance strikes and abilities.** The active stance shows its strikes on the Combat tab; they post
  as a card with buttons. 5th- and 10th-level options appear at those levels. The strikes: Bleeding
  Edge, Reaping Swing (with its DR penalty), Savage Attack (+1 die, 10th-level Prone save), Guardian
  Strike, Bone Breaking Strike (Str save, Bruised, AC penalty), Roaring Strike, Opposite End, Sweeping
  Attack, Raiding Strike (Pierce 4), Bunny Roundhouse, Serpent Grasp, Serpents Rattle, Pinpoint Shot
  (max die), Assassination Strike (max die), Flutter Attack (two attacks, Dazed save) and Wolf Fang
  Fist (die +1 step, 2 attacks, 3 at 10th).
  - **Passive effects:** Rabbit Fist +10 speed; Titan Fist Reinforced (= Taijutsu modifier, or
    armor's +2) and Titan Guard (+2 AC and DR until your next turn).
  - **Other stance abilities:** Great Weapon rerolls 1s and 2s on Heavy weapons' damage die;
    Drunken Fist's damage reduction roll.
- **Class features:**
  - **Chakra Compression:** a cast-dialog option that cuts cost by the rank, once per turn, on
    1-Action Ninjutsu.
  - **Chakra Surge:**
    - Enter Crash or Flow, a Will Amp for 1 minute. Entering one ends the other.
    - Crash adds its +d10s to Ninjutsu damage (half for areas), lifts the one-Molding limit, and
      blocks cost reduction.
    - Flow gives +Ninjutsu DC, +1 Focus at the start of each turn, and advantage on Ninjutsu
      Concentration checks.
  - **Quickened / Reactive Ninjutsu** change which action the cast uses.
  - **Pyroclasm:**
    - Gained once per turn when casting a Fire Release jutsu (max 3).
    - **Detonate:** choose how many to spend; Dex save, 2d6 fire and Burned per Pyroclasm.
    - **Hellrend:** cast option; targets' DR −2 per Pyroclasm until the end of your next turn.
    - **Devastation:** cast option; rolls the d6.
  - **Brutish Momentum:**
    - **Combat Rival** marker, which ends when combat ends.
    - **Relentless Durability:** spend a Superiority Die for temporary HP (×2 at 10th, ×3 at 17th).
  - **Superiority Dice** are rolled whenever they're spent. The Assault Maneuvers have buttons for
    their saves and effects (Arresting Strike, Menacing Assault, Rending Critical, Limit Breaker,
    Knock Back, Whirlwind Strike, Staggering Will, Relentless Retaliation, Superior Momentum).
  - **Jack of All:** pick the active Generalization on the Features tab.
    - **Warfare:** bonus d8s on casts (cast option) or attacks (button), 1 Superiority Die, once per
      turn.
    - **Seize** and **Tactics** have buttons.
  - **Switch Hitter:** pick your Primary discipline on the Features tab. Superior Assault's +1 crit
    range follows it. Follow Up and Set-Up place their markers and penalties.
  - **Extra Attack / General Technique:** attacks per Attack action are shown on the Unarmed Strike.
  - **Meditation:** a group CP roll.
  - **Path of the Swift:** +10 speed.
  - **Tenacious Ninjutsu:** a clash roll.
  - **Scholar:** Ninshou Mastery at 7th and 13th.
- **Feats:**
  - **Illusionist Research:** +1 Int or Wis, and Illusions proficiency (Mastery if already
    proficient).
  - **Master of Disguise:** Disguise Kit proficiency (or Mastery).
  - **Light Step Mastery:** +1 AC reaction.
- **Jutsu:**
  - **Forceful Bull:** Strength becomes 18 and 8 temporary HP, with a refresh button.
  - **Fox Fire:** a Glowing marker on the target.
  - **Glamor Tongue:** a marker on the target.
- **New building blocks** for future content:
  - Strike activities (Unarmed or weapon, die steps, extra dice, Pierce, maximized die, several
    attacks).
  - Effect activities (self or targets, ending at the start or end of your turn or the end of your
    next turn; temporary HP, Amps, exclusive states).
  - Roll activities, and pool costs (fixed, rolled, or "any number").
  - Level-scaled formulas: `lvl(1:1d8,5:2d8)`.
  - Feature choices, and cast options from features.
  - Feat proficiency grants.
  - The `n5e.reinforced` effect key.
- Content automation lives in `tools/content/automation.py`, so it survives re-importing the books.

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
# Background content update

- Added all 16 Chapter 3 backgrounds in a dedicated compendium, organized by background with nested feature and starting-equipment folders.
- Added background setup choices, linked feature/feat grants, equipment manifests and a separate background-feature group.
- Preserved full conditional feature text and flagged the undefined Traveler's Pack rather than inventing rules.

# Class content expansion through level 20

- Completed core and subclass feature imports for the seven supported classes, with 42 subclasses and full late-level option lists.
- Preserved existing IDs and automation; added structured choice eligibility and apply-time guards.
- Organized new content by class/subclass and added source-derived regression coverage.
- Existing actor copies are not overwritten; contextual rules and new feature automation still require review.

# Clan content import in six batches

- Added all 44 source clan packages, organized by nation and clan inside the built-in Clans compendium.
- Imported source level features, Hijutsu, clan feats, optional mutations, stance records, companion rules and latent bloodline tables.
- Added clan setup and level-up integration, branch and clan access checks, replacement rollback and source-derived regression coverage.
- Preserved existing identities and actor data. Contextual effects, mutation dependencies, latent budgets and companion construction still need manual review.

