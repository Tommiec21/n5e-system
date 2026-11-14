# GEN1 function spec: Genjutsu stimuli and Unaware

Status: **approved by King 2026-11-14 ("Begin work I approve these"). In progress.** Release target `0.24.0-alpha.1`.

Plan row 16: Genjutsu stimuli immunity, Unaware, sense-based targeting.

Rules (KB 04, KB 10, King's rulings):
- Every Genjutsu has at least one Stimulus. A creature is immune to a Genjutsu only when it is immune to **all** of its Stimuli:
  - **Visual:** Blinded, or Truesight (Q-G1, King 2026-11-14).
  - **Auditory:** Deafened.
  - **Inhaled:** immune to Envenomed.
  - **Tactile:** immune to psychic damage (Tactile is what lets a Genjutsu deal damage).
- **Unaware** is not a Stimulus: the target doesn't know it is in the Genjutsu until it succeeds on Identify Genjutsu.
- **MDISC1 decision 15:** a multi-discipline jutsu cast as something other than Genjutsu has no Stimuli immunity.

Data already in place: `JutsuData.stimuli` (set on all 167 Genjutsu), `JutsuData.unaware` (35), and `CONFIG.N5E.stimuli[*].immuneVia`.

Sense-based targeting is already covered by the advantage engine (ADV1): attacks against an Invisible target have disadvantage unless the attacker has True Sight or Chakra Sight, and a Blinded attacker has disadvantage unless it has Blindsight, Tremor Sense or Chakra Sensing. GEN1 adds nothing there.

## Functions

After each function, add a line to the progress log and push.

| # | Function | File | Behaviour |
| --- | --- | --- | --- |
| F1 | `immuneToStimulus(stimulus, facts)`, `genjutsuImmunity(stimuli, facts)`, `creatureFacts(actor)` | `rules/stimuli.mjs` (new, pure) | Reads `immuneVia` (`condition:`, `sense:`, `conditionImmune:`, `damageImmune:`). Immune when the jutsu has stimuli and every one is covered; returns the reasons. |
| F2 | Save button skips immune targets | `workflow/activity-buttons.mjs` | A Genjutsu cast as Genjutsu: immune targets don't roll; a note card says why ("Immune: Blinded (Visual)"). |
| F3 | Attack button and immune targets | same | All targets immune: the attack is refused with the reason. Some immune: a warning names them. |
| F4 | Unaware note | `workflow/cast.mjs` | Cast as Genjutsu, an Unaware jutsu's card says its targets don't know they're in it until a successful Identify Genjutsu. |

## Tests

`tests/stimuli.test.mjs`: each Stimulus' immunity; all-must-be-immune; Truesight; empty stimuli never immune; facts from an actor.

## Progress log

- 2026-11-14 Claude: spec written; starting F1.
- 2026-11-14 Claude: **F1 done.** New `rules/stimuli.mjs`: `creatureFacts(actor)` (statuses, `traits.senses`, `traits.conditionImmune`, `traits.immune`), `immuneToStimulus`, `genjutsuImmunity` (all Stimuli must be covered; reasons like "Blinded (Visual)"). Next: F2/F3 (save and attack buttons).
- 2026-11-14 Claude: **F2 + F3 done.**
  - `stimuliImmune(message, actors)` in `workflow/activity-buttons.mjs` reads the cast card's jutsu and cast discipline (only `gen`).
  - Save button: immune owned targets get an "immune to <jutsu>" card with the reasons instead of a roll. The "only creatures you own" warning is skipped when every target was immune.
  - Attack button: every target immune → refused with the reasons; some → an info notice naming them.
  - Suite green. Next: F4 (Unaware note), then tests.
