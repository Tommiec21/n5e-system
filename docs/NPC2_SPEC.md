# NPC2 function spec: the Adversary Builder

Status: **Approved by King 2026-11-14. Published `0.32.0-alpha.1`.**

Plan: `docs/NPC1_PLAN.md`. After NPC1, NPC2 is only the builder window: the tables and the math are already in NPC1a (`config/adversary.mjs`, `rules/adversary.mjs`), and the Build tab edits every number.

Source: the Bingo Book, "Build Your Adversary", steps 1–9 and "Refining As You Play"; "Non-Freeform Jutsu" (jutsu counts and ranks); the Sasuke worked example.

## What NPC2 does and doesn't do

- **Does:** a step-by-step window that walks the GM through the book's steps and creates (or updates) the NPC: profile, ability modifiers, named jutsu, weapons, and traits.
- **Doesn't:** Freeform Strikes, Jutsu and Abilities (NPC3); Tenacity and Elite Actions (NPC4); phases (NPC5); the book's trait lists as content (NPC6). The builder leaves a clear place for each, filled in by those batches.

## The steps

| # | Step (the book's) | What the window shows | What it writes |
| --- | --- | --- | --- |
| S1 | **Define the Concept** | Name, portrait, and the one or two sentences: "What do they do in a fight, and why does fighting them feel different?" with the book's three examples as placeholders | `name`, `img`, concept (Q-N28) |
| S2 | **Pick a Class** | Four cards (Minion, Standard, Elite, Solo) with the book's text: role in the fight, how many players it challenges, action economy, HP rule. Elite before level 3 and Solo before 5 are marked | `details.class` |
| S3 | **Pick a Level** | Level 1–30. The party's level and the book's guidance: same level for a medium fight, +2 to push, −2 for easier, never beyond ±3. Preview: proficiency, the baseline stat line, suggested traits, jutsu and Freeform slots | `details.level` |
| S4 | **Pick a Role and Role Traits** | Five role cards (or none for a Solo) with the role bonus; Iconic and Epic toggles with their modifiers; the suggested trait count for class, level and classification; the traits chosen so far (Q-N26) | `details.role`, `iconic`, `epic`, trait items |
| S5 | **Pick a Rank** | Six rank cards: threat level, HP/CP per level, the suggested jutsu ranks, the Rank bonus switch (off to start). The book's advice: stay within one rank of the mission | `details.rank`, `adversary.rankBonus` |
| S6 | **Pick a Clan and Affiliation** | Clan or species (suggestions from the Clans compendium and the book's species list) and affiliation, both optional; their traits when NPC6 has them | `details.clan`, `details.affiliation` |
| S7 | **Assign attacks, jutsu and abilities** | Named jutsu from the Jutsu compendium, filtered to the suggested ranks for the adversary's rank, with the count against the limit (4 / 6 / 8 / 10 by level). Weapons from the Equipment compendium. Freeform Strikes, Jutsu and Abilities: a section that says "Coming with NPC3" until then | jutsu and weapon items |
| S7.5 | **Generic jutsu and General traits** (optional) | The same jutsu picker without the rank filter; General traits (Q-N26) | items |
| S8 | **Calculate and finalize** | Assign the six modifiers from the baseline line (pick which ability gets each value, or "Use baseline"), with the budget; armor type; HP from the formula or a Lazy GM column; party size for a Solo; full saves. Then the whole stat block as it will be, each number with an override box (the same as the Build tab) | `adversary.*`, overrides |
| S9 | **Start playing** | Create (or Update) closes the builder and opens the NPC's sheet | — |

**Navigation (Q-N29):** a step list down the side; Next and Back; any step can be opened at any time. A warning badge on a step that has a note (Elite below level 3, over the jutsu limit, modifiers over budget). Nothing blocks Create.

**The live preview:** a small stat block beside every step, updating as choices change, read from the same `rules/adversary.mjs` math.

## Functions

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | Builder window | `applications/npc/adversary-builder.mjs`, `templates/apps/adversary-builder/*.hbs` | The steps above. Works on a draft held in the window; nothing is saved until Create or Update. Closing asks before discarding changes. |
| F2 | Pure builder logic | `rules/adversary-builder.mjs` | `draftFromActor`, `draftToUpdate` (actor update and items to create or delete), `stepNotes(draft)` (the warning badges), `suggestedJutsuRanks(rank)`, `assignLine(line, order)` (the six values to abilities). |
| F3 | Suggested jutsu ranks | `config/adversary.mjs` | The book's table: D-Rank casts D and C; C casts D, C, B; B casts C, B, A; A casts B, A, S; S casts A and S. E-Rank per Q-N27. |
| F4 | Jutsu and weapon pickers | `applications/npc/adversary-builder.mjs` | Search and filter by discipline and rank, from the compendiums; chosen items are copied onto the NPC on Create, with the same duplicate guards as the rest of the system (FIN1). |
| F5 | Where it opens | `applications/actor/npc-sheet.mjs`, `n5e.mjs` | Per Q-N25: "Create adversary" on the Actors sidebar (GM), and "Open builder" on an adversary's Build tab. |
| F6 | Updating an existing adversary | F2 | The builder reads the NPC into a draft. Changing level or class doesn't change assigned modifiers unless the GM presses "Use baseline" (Q-N30). Items removed in the builder are deleted on Update. |

## Tests

`tests/core/adversary-builder.test.mjs`: draft round-trip (actor to draft to update, unchanged gives an empty update); `assignLine`; `stepNotes` for each warning; `suggestedJutsuRanks` for every rank; the Sasuke example (level 13 Elite, Iconic, A-Rank: 8 traits suggested, 6 jutsu, the right ranks). `tests/adversary-builder.test.mjs`: templates render each step; Create writes the profile, the modifiers and the items; Update deletes removed items; nothing saves before Create.

## Questions for King

- **Q-N25: where it opens.** A "Create adversary" button on the Actors sidebar (GM only), and "Open builder" on an adversary's Build tab? Should creating a plain NPC from Foundry's own "Create Actor" also open the builder, or stay a blank NPC?
- **Q-N26: traits before NPC6.** The book's trait lists (Role, clan, affiliation, General, Iconic) become content in NPC6, after standardization. Until then, should the builder let the GM type a trait (name, rank, text), saved as a trait on the NPC, with the pickers added by NPC6?
- **Q-N27: jutsu.** Pick named jutsu from the Jutsu compendium, filtered to the suggested ranks (with a switch to show all, warning but not blocking outside them), counting against the limit for the level? The book's rank table starts at D-Rank: what should an E-Rank adversary cast (proposed: E and D)?
- **Q-N28: the concept.** Store the one or two sentences as their own field, shown at the top of the Build tab and the Notes tab (GM only), or use it as the blurb under the name that players can see?
- **Q-N29: navigation.** Free movement between steps with a step list (proposed), or strictly one after another the first time through?
- **Q-N30: editing.** When an existing adversary is opened in the builder and its level or class changes, keep the assigned modifiers (proposed, with "Use baseline" to reset), or reset them to the new baseline line?
- **Q-N31: the party's level.** For the level step, read the party's level from the player characters assigned to users (as the Solo party size does), or let the GM type it?
- **Q-N32: releases.** One release?

## King's answers (2026-11-14)

- **Q-N25:** prompt. Creating an NPC through Foundry's "Create Actor" asks whether to open the Adversary Builder. The sidebar "Create adversary" button and the Build tab's "Open builder" stay as proposed.
- **Q-N26:** yes. The GM can type a trait (name, rank, text) in the builder; NPC6 adds the pickers.
- **Q-N27:** yes to the filtered picker with a show-all switch, warning but not blocking. An E-Rank adversary casts E and D.
- **Q-N28:** both. Claude's reading: the concept is its own field (shown on the Build and Notes tabs, GM only) and also fills the blurb players see, which the GM can then edit separately.
- **Q-N29:** free movement with a step list.
- **Q-N30:** keep the assigned modifiers, with an update button that adjusts them to the new baseline line for the changed level or class.
- **Q-N31:** the GM types the party's level.
- **Q-N32:** one release.

## Progress log

- 2026-11-14 Claude: **built (King: "Approved").**
  - F1: `applications/npc/adversary-builder.mjs` (ApplicationV2 form; draft in the window; close asks when dirty); `templates/apps/adversary-builder.hbs`, `adversary-builder-jutsu.hbs`. F2: `rules/adversary-builder.mjs` (`blankDraft`, `draftFromActor`, `draftToUpdate`, `assignLine`, `rebaseMods`, `stepNotes`, `suggestedRanksFor`, `draftProfile`); view model `view-models/adversary-builder.mjs`. F3: `suggestedJutsuRanks` and the builder's text in `config/adversary.mjs`. F4: pickers from the `n5e.jutsu` and `n5e.equipment` indexes; an item with the same type and name already on the NPC is skipped. F5: sidebar button, `N5eActor.createDialog` prompt, Build tab button. F6: editing keeps modifiers; "Update modifiers to the new baseline" (`rebaseMods`) keeps their order.
  - New field `system.details.concept`. Typed traits are `feat` items with category `npcTraits` and `flags.n5e.adversaryTrait.rank`.
  - The preview is an unsaved actor built from the draft, read through `statBlockVM`.
  - A new adversary's modifiers follow the baseline line when its class or level changes, until the GM edits a modifier.
  - **For King:** the book's tables suggest 2 (Elite) + 3 (levels 12–17) = 5 traits for Sasuke; its worked example counts +4 at level 13 and +2 for Iconic (8). The builder follows the tables and adds nothing for Iconic. Say if Iconic and Epic should add traits.
- 2026-11-14 Claude: tests. Attempt 1 failed (1): a test expected an over-budget flag for modifiers that were under budget (the test's numbers were wrong). Attempt 2 passed: `npm test` 466 pass, 2 skipped; core 103/103; lint and check clean. Files: `tests/core/adversary-builder.test.mjs`, `tests/adversary-builder.test.mjs`.
- 2026-11-14 Claude: **published `0.32.0-alpha.1`.** Not checked in a running Foundry world.
- 2026-11-14 Claude: King answered Q-N25–Q-N32.
- 2026-11-14 Claude: spec written from the Bingo Book's build steps and "Non-Freeform Jutsu". Nothing built.
