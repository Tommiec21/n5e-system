# N5e progression plan (shared by Claude and Codex)

Saved 2026-11-13 by Claude against GitHub head `6c17e1a` (release 0.13.0-alpha.14, 285 tests pass, 2 skipped). This is the one roadmap both agents follow. Either agent can pick up where the other stopped. Game rules and King's rulings live in N5e-Context.md (OneDrive, Sections 11–12). The batch history lives in `docs/CODEX_CONTEXT.md`. This file holds the plan, the handoff rules and the status table.

## 1. Handoff protocol

Each session starts the same way, whichever agent runs it, so neither agent repeats or overwrites the other's work.

**Start of a session**
- `git fetch` and fast-forward `main`. Confirm the local branch tracks `origin/main` and is not behind. A stale checkout caused a wrong review on 2026-11-13.
- Check for `wip/*` branches. If one exists, read its handoff note in the ledger and continue it before starting anything new.
- Read Section 4 (status table), the last three entries of `docs/CODEX_CONTEXT.md`, and the files the batch touches.
- Claim the first batch marked **ready** that has no owner. Set its owner and date in Section 4, then commit and push that change alone (`docs: claim <batch> [skip ci]`) before writing code.

**During a batch**
- Keep to one batch per release. Bump the version by one alpha step (`0.13.0-alpha.15`, `-alpha.16`...).
- Rules decisions go in the pure `module/rules/`. Foundry work goes in `module/workflow/` or `module/automation/`. Reuse the existing planners, queues, receipts and multiplayer routing. Never build a parallel engine.
- Unclear game mechanics go to the user as a question. Record the question under Section 6 and leave the behaviour manual. Don't invent a rule.
- **Testing rule (user, 2026-11-09):** at most three attempts per test or scenario, counting local, CI and harness runs. After two failures, stop the whole process, report and wait for direction.
- **Release rule:** a GitHub release is the only production. Never install into local Foundry unless the user authorizes it separately. Never live-test unless the user asks; the user does acceptance.

**Running out of tokens mid-batch**
- Commit everything to `wip/<batch-id>` and push it. Never leave work only on local disk.
- Append a "Handoff" entry to `docs/CODEX_CONTEXT.md` covering what is done, what is next, which tests ran and their attempt counts, and any open question. Push it with `[skip ci]`.

**End of a batch**
- Update the status table (state, version, commit, CI run).
- Append the ledger entry to `docs/CODEX_CONTEXT.md`.
- Add rule → code rows to `docs/RULES_MAP.md` and remove the closed rows from its "Known gaps" table.
- Add new stored fields to `docs/DATA_REFERENCE.md`.
- Run `node tools/report-modules.mjs` to refresh `docs/generated/module-index.md`.
- N5e-Context.md (OneDrive): Claude merges the ledger into Section 11/12 when the device link works. Codex records in the ledger only.

## 2. End goal (King, 2026-11-13)

The end goal is one shared rules core used by both the N5e System and the N5e Module (the dnd5e 5.3.3 add-on), each with a thin adapter. Shared tests run against the core. A System release triggers a Module rebuild against the pinned dnd5e version. Rules and mechanics are shared; worlds are not. To prepare for this, every batch below keeps its rules pure and Foundry-free in `module/rules/`, which is the extraction boundary. Extraction itself is batch SHARED1, which runs after Tier 1.

## 3. Locked decisions to build against

N5e-Context.md Section 12 holds the full text. This is the short form.

- **Rulings (2026-11-13).**
  - Taijutsu attacks are not weapon attacks.
  - At the start of each turn, prompt for each concentrated jutsu: maintain or end. If chakra covers one but not both, the player chooses which to keep. If chakra covers neither, both end.
  - Crits don't double flat bonuses.
  - Exhaustion −1 applies to every dice roll, once per roll.
  - Falling: 1d6 per 10 ft past the Str score in feet, max 100d6.
  - Light property replaces the base Two-Weapon Fighting rule.
- **Earlier locked (Codex ledger).**
  - + and − before × and ÷.
  - Identical Half/Double sources apply once; opposites cancel.
  - DR protects HP and CP independently, in the creature's chosen type order. Deflection is rolled DR.
  - Reaction timeout 60 s by default; 0 disables it.
  - **Multiplayer parity (King 2026-11-13):** everything works exactly as in dnd5e and PF2e, with no GM relay for player → NPC changes. The one addition is **Allied NPCs**, which players control and can add to the world. See Section 7.
  - ~~Remote requests need GM review until sender authentication exists.~~ Superseded by King 2026-11-13: no GM approval on anything; routed requests execute on the GM client automatically.
  - Clan Feats removed; don't restore them.
- **Attack model.**
  - Two attack kinds:
    - Jutsu attack: Nin, Gen or Tai. Bukijutsu is a keyword on a Taijutsu attack. Jutsu-like feature attacks belong here too.
    - Weapon attack: includes the auto-granted Unarmed Strike item. It is always proficient, has 0 Bulk, takes its die and type from the stance, uses Str (or Dex if all Taijutsu use Dex), and counts as Finesse.
  - Strike vectors: Taijutsu stance strikes use Unarmed Strike, Bukijutsu stance strikes use a weapon, and feature strikes declare their own.
  - Weapon selection by keyword: one match is used automatically, several ask the player, none can't be cast.
- **Keyword model** (PF2e-style trait objects `{key, value}`; rules test `keyword:<key>[:<value>]`).
  - The approved canonical list is in N5e-Context.md.
  - Combination is removed.
  - Every weapon gets its base weapon keyword.
  - Weapon proficiency is stored as category + group pairs.
  - Kunai, Shuriken and Senbon have universal proficiency.
- **Multi-discipline jutsu.**
  - The player picks the casting discipline, and the jutsu resolves entirely as that discipline, including the ability requirement. The choice is locked for the concentration duration.
  - For known-jutsu, swap, prerequisite and learning-limit checks, the jutsu counts as every listed discipline.
  - When cast as a non-Genjutsu: stimuli give no immunity, and psychic damage doesn't ignore DR.
  - Suppression and Counter Tags catch any listed discipline.
- **Stances and feature kinds.**
  - Each stance has exactly one category (Taijutsu, Bukijutsu or Chakra) unless its text allows another. Clan stances are eliminated.
  - Feature kinds: Class Feature, Class Feature Option, Clan Feature, Clan Feature Option, NPC Traits, NPC Abilities, NPC Strikes, NPC Role, NPC Class, NPC Freeform.

## 4. Batch roadmap and status

Order: first fix user-reported problems, then Tier 1 (core rules correctness), then the data model, then Tier 2, then shared-core extraction, then Tier 3. Earlier batches unblock later ones. `R#` refers to the findings in Section 5.

| # | Batch | Scope | Closes | Depends | State | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | OPS1 multiplayer parity (priority one) + user-reported bugs | Make player ↔ NPC interaction match dnd5e 5.3.3 and PF2e exactly (King 2026-11-13; spec in Section 7). This removes every GM review dialog and the GM relay for player → NPC changes. It adds Allied NPCs: player-summoned and player-controlled creatures, the only exception. Audit both engines' source first, then rebuild the routed workflows to the parity spec, then fix the ActorDelta duplicate items and the missing embedded Kunai | R1–R3 | — | OPS1a published v0.14.0-alpha.1; OPS1b published v0.14.0-alpha.2; OPS1c waits on King's reproduction steps (see `docs/OPS1_SPEC.md` Final results) | released by Claude 2026-11-13 |
| 1 | TURN1 turn engine | Forward-only turn/round events: one dispatcher replaces both `combatTurnChange` hooks and ignores rewinds and repeats. Per-period uses and pool recovery (turn, round, encounter). Upkeep prompt per the ruling | R4–R7 | — | published v0.15.0-alpha.1 (spec `docs/TURN1_SPEC.md`) | released by Claude 2026-11-13 |
| 2 | EXPIRE1 effect expiry | Timed generic effects expire on turn boundaries in combat and on `updateWorldTime` outside it. Conditions' 1-minute default works outside combat | R8–R9 | TURN1 | published v0.15.0-alpha.2 (`docs/EXPIRE1_SPEC.md`) | released by Claude 2026-11-13 |
| 3 | DMG1 damage numbers | Apply Bruised (+4 taken), Weakened (−4/rank dealt), Petrified (resist all). Exhaustion −1 on damage and healing rolls. Falling/environment flag skips DR | R10–R12 | — | published v0.15.0-alpha.4 (`docs/DMG1_SPEC.md`); auto-fail saves move to ADV1 | released by Claude 2026-11-13 |
| 4 | ADV1 advantage engine | Count adv/dis sources (any of each cancel). Condition flags feed attacks and saves (Prone, Restrained, Blinded, Invisible, Dodge, Squeezing, Stunned...). Auto-fail Str/Dex saves; condition immunity/resistance on saves; Help | R13–R14 | — | published v0.15.0-alpha.5 (`docs/ADV1_SPEC.md`) | released by Claude 2026-11-13 |
| 5 | CAST1 pre-cast checks | Components vs conditions (`config/jutsu.mjs blockedBy`), Slowed (>2 components), Shocked (one attack or jutsu per turn), Confused (no HS), Sealed (teleport), Incapacitated (no Mold Chakra). Ability requirement and max rank for level | R15–R17 | ADV1 | published v0.15.0-alpha.7 (`docs/CAST1_SPEC.md`), plus King's roll-mode toggle and per-roll Adv/Dis buttons | released by Claude 2026-11-13 |
| 6 | CONC1 concentration | Incapacitated ends all concentration. Dependent effects and areas end with it. Ready-a-jutsu holds chakra | R18 | TURN1 | published v0.15.0-alpha.9 (`docs/CONC1_SPEC.md`) | released by Claude 2026-11-13 |
| 7 | DATA1 schema + migration | `discipline` → discipline list. `buki` → `tai` + `bukijutsu` keyword. Keyword objects `{key,value}` with normalization (Section 5, R20). Weapon groups and base keywords, proficiency pairs, feature kinds | R19–R22 | Q2 | ready (Q2 open) | — |
| 8 | DATA2 content rebuild | Re-run the builders against the DATA1 schema. Remove Combination. Recategorize stances. Unarmed Strike item granted to every creature | R19–R22 | DATA1 | after 7 | — |
| 9 | ATK1 weapon attacks | Item and effect attack/damage bonuses. Proficiency by category+group. Unarmed Strike Str/Dex/Finesse. Keyword-based weapon selection for strikes. Light-property extra attack. Long-range and ranged-in-melee disadvantage | R23–R25 | DATA2, ADV1 | after 8 | — |
| 10 | MDISC1 multi-discipline casting | Cast-discipline choice and lock. Counts as all listed disciplines for known/swap/prereq/limits. Genjutsu-only riders | R26 | DATA1, CAST1 | after 7 | — |
| 10b | CARD1 single action card (King 2026-11-13: later batch) | One card per attack, jutsu or feature, with sections that fill in as buttons are pressed (SW5e style): attack with per-target hit/miss, area placement and covered targets, per-target saves rolled by each target's owner, damage with per-target Apply/Undo, conditions/effects, reactions, Will of Fire and concentration. All state is stored on the card. Results for another user's card go through an owner intent, falling back to a separate card when no GM is connected. Probably 2–3 releases (structure + attack/damage; saves/conditions/areas; reactions/WoF/undo). Old chat cards stay as they are | — | OPS1 | later; function spec to be written for approval | — |
| 11 | RES1 per-target resolution | One damage roll for many targets, automatic per-target save tiers, hit vs AC per target | — | ADV1 | Tier 2 | — |
| 12 | POS1 positioning | Opportunity attacks and reach, Engaged, Surprise, Dodge, cover (+2/+4) | — | ADV1 | Tier 2 | — |
| 13 | CLASH1 | Clash contested workflow, rank bonus, best of 3, elemental advantage (Q3) | — | RES1 | Tier 2 | — |
| 14 | ENV1 | Hostile terrain as Region behaviours, falling, suffocation | — | TURN1 | Tier 2 | — |
| 15 | SKILL1 | Executable skill actions (Grapple, Shove, Hide/Search, Stabilize...) | — | ADV1 | Tier 2 | — |
| 16 | GEN1 | Genjutsu stimuli immunity, Unaware, sense-based targeting | — | ADV1 | Tier 2 | — |
| 17 | SHARED1 | Extract `module/rules` into the shared core; System adapter; Module adapter against dnd5e 5.3.3; CI propagation | — | Tier 1 | after Tier 1 | — |
| 18+ | Tier 3 | Rule-element expansion, stacking policy, Will of Fire spends, ailments, item mechanics (charges, ammo, scrolls, Fortified), interception/constructs/dispels, table procedures, NPC feature kinds with the Bingo Book | — | — | later | — |

## 5. Review findings (2026-11-13, code at 0.13.0-alpha.14)

No fixes were made in the review. Severity: **H** gives wrong results in play, **M** is missing enforcement, **L** is consistency or docs.

**User-reported, still open (Codex ledger)**
- R1 **H**. With multiplayer coordination on (the default), every player cast, attack, activity, resource spend and roll opens a GM review dialog (`socket.mjs` registerSocket → `DialogV2.confirm`). Owned actors are not exempt, because a socket sender cannot be authenticated. King 2026-11-13: remove it entirely (OPS1, priority one).
- R2 **H**. ActorDelta duplicate item report (unlinked tokens). Not yet investigated.
- R3 **M**. Missing embedded Kunai item report. Not yet investigated.

**Turn engine**
- R4 **H**. `combatTurnChange` drives turn start/end in `workflow/turn.mjs` and also in `automation/effect-services.mjs`. Rewinding a turn reruns start-of-turn upkeep, condition damage, decay and recharge. The two handlers are separate and run in no fixed order.
- R5 **M**. Item uses only reset on rests and Recharge. There is no `turn`, `round` or `encounter` reset for item uses; pools only refill per `turn`.
- R6 **H**. Upkeep auto-pays without asking. The 2026-11-13 ruling requires a maintain/end prompt each turn and a player choice when chakra covers some but not all.
- R7 **L**. The reaction reset is folded into the start-of-turn economy reset. That is correct RAW, but no dedicated rule toggle exists.

**Effect expiry**
- R8 **H**. Generic effects with a duration (rounds or seconds) are never removed. Only caster-tied `expires` effects, condition durations at turn end, and service event counters expire.
- R9 **M**. Conditions only expire through the combat turn hook. Out of combat, the 1-minute default never ends a condition (no `updateWorldTime` handler, unlike summons).

**Damage**
- R10 **H**. Bruised `damageTaken +4`, Weakened `damageDealt −4/rank` and Petrified `resistAll` appear on sheets but `damagePlan` never applies them. `autoFailSaves` is not used anywhere either.
- R11 **M**. Exhaustion −1 is applied to d20 rolls only. The ruling covers all dice rolls once per roll, including damage and healing.
- R12 **L**. DR is per pool, by ruling. The KB text says "each damage instance"; the ledger records King's newer ruling. Make sure the KB file is updated to match.

**Advantage and saves**
- R13 **H**. There is no advantage/disadvantage source engine. Mode comes from click modifiers plus a few cast flags (Precise, Heightened) and condition resistance. Condition flags such as `attackedWithAdvantage` are stored but not used.
- R14 **H**. Petrified, Stunned and Unconscious auto-fail saves are not applied.

**Casting**
- R15 **M**. `config/jutsu.mjs` components define `requires`/`blockedBy`, but no cast path reads them. Slowed, Shocked, Confused, Sealed (teleport) and Grappled (HS) are not enforced.
- R16 **M**. `meetsRequirement` (ability score B16/A18/S20) is computed in `item/jutsu.mjs` and shown, but `cast-plan.mjs` doesn't block or warn on it.
- R17 **M**. A jutsu above the caster's max rank for their level can be cast at its base rank. Only upcasting is capped.

**Concentration**
- R18 **H**. Incapacitated, Stunned, Unconscious and Petrified don't end concentration. Effects and areas that depend on a dropped concentration are only cleaned up for summons and areas.

**Data model (conflicts with the 2026-11-13 decisions)**
- R19 **H**. `system.discipline` is a single string with a `buki` value: 338 items, including 252 core jutsu and Hijutsu. The decision says Bukijutsu is a keyword on Taijutsu and that jutsu can list several disciplines. Hijutsu already list several in their keywords (for example ninjutsu + genjutsu + fuinjutsu) but cast as one.
- R20 **M**. Keyword data is inconsistent: 61 distinct keys.
  - Mixed spelling: `waterRelease` vs `yin-release`, `genjutsu-visual` vs `visual`, `inhale`/`inhaled`.
  - Mis-split compound keywords on 9 Hijutsu: `bukijutsu-fire-release`, `bukijutsu-water-release`, `medical-stable`, `tactile-chain`, `tactile-medical`, `tactile-earth-release`, `tactile-wind-release`, `tactile-lightning-release`, `ninjutsu-clash`.
  - Clan branch tags stored as keywords (`*-branch`).
  - `combination` is still on 10 core jutsu and 1 Taijutsu.
- R21 **M**. Feature categories in data are `classFeature`, `classOption`, `clanFeature`, `clanOption`, `backgroundFeature`, plus general feat categories. The approved kinds have no Background Feature (Q2) and no NPC kinds yet.
- R22 **L**. Duplicate feature names: Extra Attack ×3 and Chakra Stance ×2. They are probably intended per class, but they display ambiguously in the browser. Cross-Style (Sarutobi) has all three stance categories; check that its text allows this.

**Attacks**
- R23 **H**. Weapon attacks add only ability + proficiency + condition penalties. Effect keys, item bonuses and Mastery for weapon attacks are not included. `proficient` is a per-item boolean, not category+group.
- R24 **M**. Unarmed uses Str only. The ruling allows Dex if all Taijutsu use Dex, and it counts as Finesse. There is no Unarmed Strike item yet.
- R25 **M**. `strikeAttack` picks the first equipped weapon instead of selecting by keyword. There is no Light-property extra attack, no long-range disadvantage and no ranged-in-melee disadvantage.
- R26 **M**. There is no cast-discipline choice for multi-discipline jutsu (see R19).

**Docs (fixed in this pass)**
- `RULES_MAP.md` lacked everything after 0.10.
- `DEVELOPER.md`'s folder map lacked `automation/`, `testing/` and the newer docs.
- There was no index of functions; `docs/generated/module-index.md` is now generated by `tools/report-modules.mjs`.
- `DATA_REFERENCE.md` (0.10) and `AUTOMATION_FRAMEWORK.md` (0.9.3) are still behind. They are updated batch by batch from now on.

## 6. Questions for the user (King)

- Q1. **Answered by King 2026-11-13:** remove GM approval on everything, then match dnd5e/PF2e multiplayer behaviour exactly (Section 7). Routed requests run on the GM's client without a review dialog. This is priority one in the next approved batch (OPS1).
- Q2. Feature kinds: should Background Feature stay as a kind? Should general feats keep their categories (skill, taijutsu, ninjutsu) or become a kind?
- Q3. Clash ties: what happens? The book only says contests are "tie = status quo".
- Q4. Necrotic "halves HP regained until the end of the next turn" appears in CTX but not in the Ch8 text. Is it in or out?
- Q5. **Answered by King 2026-11-13:** exact parity. Remove the GM relay: players apply damage and effects only to what they own, and the GM applies to NPCs. The one addition is Allied NPCs (Section 7).

## 7. Multiplayer parity spec (King 2026-11-13: copy dnd5e and PF2e, no exceptions)

Every player-facing interaction with an NPC must work as it does in dnd5e 5.3.3 and PF2e. OPS1 starts with a line-by-line audit of both source trees. The dnd5e source is on King's PC under `dnd5src`; PF2e 7.12.2 has to be fetched. Each behaviour below gets a test. Items marked *verify* come from earlier reading and are confirmed against the PF2e source in OPS1.

**Authority model (both engines)**
- dnd5e 5.3.3 has no system socket at all. PF2e uses its socket only for a few GM-side chores, such as moving items between actors the player doesn't own (*verify* the full list).
- Each user changes only documents they own. Players roll for their characters; the GM's client rolls and changes NPCs.
- No approval dialogs exist anywhere.

**Attacks and targeting**
- The player targets tokens with Foundry targeting and rolls the attack on their own client.
- The chat card lists the targets, with hit/miss (dnd5e) or degree of success (PF2e) against each target's AC.
- How much of that players see is set by GM settings:
  - dnd5e: `attackRollVisibility` (all / hide AC / none; default none).
  - PF2e: metagame "show results" and "show DCs" (*verify*).
- dnd5e: "select targets" appears on attack cards.

**Damage and healing**
- Damage cards carry apply controls: dnd5e has the damage-application tray and context menu (full, half, double, healing, temp HP); PF2e has full, half, double, healing and shield block (*verify*).
- The controls appear for controlled or targeted tokens, and the list shows only actors the clicking user owns (dnd5e `damage-application.mjs`: `if (!actor?.isOwner) return`).
- The GM applies damage to NPCs. Players apply it to their own characters.

**Saves and checks**
- Save and check buttons on cards and in text links roll for the clicking user's own controlled tokens. The GM rolls NPC saves.
- dnd5e: GMs get a "request roll" link that posts a roll request to chat. Each player sees only their own entries (`request-message-data.mjs`).
- DC visibility: dnd5e `challengeVisibility` (all / player / none; default player). PF2e: metagame "show DCs" (*verify*).

**Effects and conditions**
- Apply-effect controls work only on tokens the clicking user owns, or any token for the GM (dnd5e `effect-application.mjs` throws an ownership warning otherwise).
- An effect that depends on the caster's concentration can be applied only by the GM or by the concentration's owner.
- Applied effects are tagged `dependentOn` the concentration, so they end when it ends.

**Other parity points**
- **Summoning (dnd5e):** needs the core "create tokens" permission plus the GM's `allowSummoning` setting. Summons are placed by the player.
- **Initiative:** players roll their own combatants; the GM rolls all NPCs (dnd5e `Combat5e`).
- **Health display:** dnd5e has a `bloodied` setting (all / player / none) that controls who sees the Bloodied state. PF2e uses token name visibility and hidden damage settings (*verify*).
- **Item descriptions:** dnd5e `concealItemDescriptions` hides NPC item text from players.
- **Rests, recharge, death saves and concentration:** each runs on the owner's client. The GM handles NPCs.
- **Rulers and templates:** core Foundry permissions apply; there is no system relay.

**N5e mechanics that dnd5e and PF2e don't have**
Reactions offered to an NPC's owner, Clash, Deflection and DR order prompts have no equivalent in either engine. They follow the same model: the prompt goes to the owning user, which is the GM for NPCs. They run with no approval step.

**Allied NPCs (King 2026-11-13: the only exception to parity)**
- An Allied NPC is a class of NPC that players control. Examples are creatures summoned by jutsu or class features: summons, clones, companions.
- **Players can add them to the world.** Casting a summon jutsu or using a summoning feature places the creature's token and gives the summoning player owner permission over it, with no GM step and no approval.
- If the player lacks Foundry's core permission to create actors or tokens, creation runs automatically on the GM's client. It is the only routed operation left, and it has no dialog.
- Today `workflow/automation.mjs summonTokens` and `dismissSummons` are GM-only. They become player-usable for Allied NPCs.
- **Players can control them.** The summoner owns the token and actor, so Allied NPCs follow the same ownership rules as player characters. The player moves them, rolls for them, applies damage and effects to them, and makes their saves. Their turns and reactions prompt their owning player.
- **Storage.** NPC data gets an allied marker linking it to the summoner (the existing `template` summon/clone/companion and `summoner` fields extend to cover this). Dismissal, concentration end and duration end remove the token as they do now.
- **Everything else matches dnd5e and PF2e.** Allied NPCs never give a player authority over non-allied NPCs.
- Q6. **Answered by King 2026-11-13:** out of combat they end immediately, unless applied manually (dragged effect, sheet, GM tools). Published 0.15.0-alpha.3.
