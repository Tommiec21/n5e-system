/** GEN1: Genjutsu Stimuli immunity (KB 04, KB 10; King 2026-11-14: Truesight counts). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { immuneToStimulus, genjutsuImmunity, creatureFacts } from "../../module/rules/stimuli.mjs";

const facts = ({ statuses = [], senses = {}, conditionImmune = [], damageImmune = [] } = {}) =>
  ({ statuses: new Set(statuses), senses, conditionImmune: new Set(conditionImmune), damageImmune: new Set(damageImmune) });

test("each Stimulus and what makes a creature immune to it", () => {
  assert.equal(immuneToStimulus("visual", facts({ statuses: ["blinded"] })), "Blinded");
  assert.equal(immuneToStimulus("visual", facts({ senses: { trueSight: 30 } })), "True Sight");
  assert.equal(immuneToStimulus("visual", facts()), null);
  assert.equal(immuneToStimulus("auditory", facts({ statuses: ["deafened"] })), "Deafened");
  assert.equal(immuneToStimulus("inhaled", facts({ conditionImmune: ["envenomed"] })), "immune to envenomed");
  assert.equal(immuneToStimulus("tactile", facts({ damageImmune: ["psychic"] })), "immune to psychic damage");
});

test("immune only when every Stimulus is covered; no Stimuli is never immune", () => {
  assert.deepEqual(genjutsuImmunity(["visual"], facts({ statuses: ["blinded"] })), { immune: true, reasons: ["Blinded (Visual)"] });
  assert.equal(genjutsuImmunity(["visual", "auditory"], facts({ statuses: ["blinded"] })).immune, false);
  assert.equal(genjutsuImmunity(["visual", "auditory"], facts({ statuses: ["blinded", "deafened"] })).immune, true);
  assert.equal(genjutsuImmunity([], facts({ statuses: ["blinded"] })).immune, false);
  assert.equal(genjutsuImmunity(new Set(["visual"]), facts({ senses: { trueSight: 60 } })).immune, true);
});

test("facts come from the actor's statuses, senses and immunities", () => {
  const actor = { statuses: new Set(["deafened"]), system: { traits: { senses: { trueSight: 10 }, conditionImmune: ["envenomed"], immune: new Set(["psychic"]) } } };
  const f = creatureFacts(actor);
  assert.equal(genjutsuImmunity(["visual", "auditory", "inhaled", "tactile"], f).immune, true);
  assert.equal(creatureFacts(null).statuses.size, 0);
});
