/** ENG1: missing capabilities (per-turn healing, damage and saves on effects; formulas that read the target; marks). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { triggersFor, triggerOutcomes } from "../../module/rules/triggers.mjs";
import { targetFormula, conditionRanksOn } from "../../module/rules/target-formula.mjs";
import { validateConditionalRules } from "../../module/rules/effect-authoring.mjs";
import { summarizeElement } from "../../module/rules/action-effects.mjs";

const table = cls => JSON.parse(fs.readFileSync(`content/automation/${cls}.json`, "utf8")).features;

test("ENG1a: an effect's turn triggers heal, post damage and roll a save that ends it", () => {
  const hemo = table("medical-nin")["medical-perfection-supreme-medic"].castOptions.find(o => o.label.startsWith("Hemorrhage")).effect.rules;
  validateConditionalRules(hemo);
  const victim = { statuses: new Set(), items: [], effects: [{ id: "fx1", name: "Hemorrhage Vitality", changes: [], flags: { n5e: { rules: hemo.map(r => ({ ...r, dc: r.dc === "@dc.nin" ? 17 : r.dc })) } } }] };
  const start = triggerOutcomes(triggersFor(victim, "turnStart"));
  assert.deepEqual(start.damage.map(d => [d.formula, d.type, d.who]), [["6d6", "necrotic", "self"], ["6d6", "chakra", "self"]]);
  const end = triggerOutcomes(triggersFor(victim, "turnEnd"));
  assert.deepEqual(end.resave.map(s => [s.ability, s.dc, s.sourceId, s.isEffect]), [["con", 17, "fx1", true]]);

  const pulse = table("medical-nin")["medical-perfection-supreme-medic"].castOptions.find(o => o.label.startsWith("Life Pulse")).effect.rules;
  const ally = { statuses: new Set(), items: [], effects: [{ id: "fx2", changes: [], flags: { n5e: { rules: pulse } } }] };
  assert.deepEqual(triggerOutcomes(triggersFor(ally, "turnStart")).heal.map(h => [h.formula, h.pool]), [["4d6", "hp"], ["2d6", "cp"]]);

  const overheat = table("ninjutsu-specialist")["over-the-limit-blaze-walker"].activities[0].effect.rules;
  const hot = { system: { level: 6 }, statuses: new Set(), items: [], effects: [{ id: "fx3", changes: [], flags: { n5e: { rules: overheat } } }] };
  assert.deepEqual(triggerOutcomes(triggersFor(hot, "turnEnd")).damage.map(d => [d.formula, d.type, d.unreducible]), [["1d6", "fire", true]]);
  assert.match(summarizeElement(overheat.find(r => r.on)), /Takes 1d6 fire damage \(can't be reduced\)/);
});

test("ENG1a: formulas read the target's condition ranks and states; marks carry a limit", () => {
  const target = { effects: [{ system: { key: "envenomed", ranks: 3 } }, { system: { key: "bleed", ranks: 1 } }, { flags: { n5e: { state: "blighted" } } }] };
  assert.equal(conditionRanksOn(target, "envenomed"), 3);
  assert.equal(targetFormula("(@target.ranks.envenomed)d12", target), "(3)d12");
  assert.equal(targetFormula("(@target.ranks.envenomed)d12", null), "(0)d12");
  assert.equal(targetFormula("@target.state.blighted * 2", target), "1 * 2");
  const curse = table("medical-nin")["reapers-arsenal"].activities[0].effect;
  assert.equal(curse.limit, "lvl(2:1,18:2)");
  assert.equal(table("medical-nin")["toxic-chakra"].activities.find(a => a.label === "Septic Detonation").damage.parts[0].formula, "(@target.ranks.envenomed)d12");
});
