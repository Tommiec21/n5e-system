/**
 * DEF1 (King 2026-11-25, Option A): the rail's Defenses box after HD/CD, before Resources; hidden when empty.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { defenseChipsVM } from "../module/view-models/character.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const actor = traits => ({ system: { traits } });

test("DEF1: rows for Resist, Immune, Vulnerable with King's text; empty rows left out; nothing: null", () => {
  assert.equal(defenseChipsVM(actor({})), null);
  const vm = defenseChipsVM(actor({ resist: new Set(["fire"]), conditionResist: new Set(["burned"]), conditionImmune: new Set(["envenomed"]),
    vuln: new Set(["lightning"]), conditionVuln: new Set(["group:mental"]), stateVuln: new Set(["prone"]), stateImmune: new Set(["grappled"]) }));
  assert.deepEqual(vm.rows.map(r => [r.key, r.label]), [["resist", "Resist"], ["immune", "Immune"], ["vuln", "Vulnerable"]]);
  const tips = Object.fromEntries(vm.rows.map(r => [r.key, r.chips.map(c => c.tip)]));
  assert.deepEqual(tips.resist, ["Fire Damage is Halved.", "Adv on Burned Saving throws or Checks."]);
  assert.deepEqual(tips.immune, ["Cannot gain Envenomed Condition.", "Cannot gain Grappled State."]);
  assert.deepEqual(tips.vuln, ["Lightning Damage is Doubled.", "Disadvantage on Mental Saving throws or Checks.", "Disadvantage on Prone Saving throws or Checks."]);
  assert.equal(vm.rows[2].chips[1].label, "All Mental");
  assert.equal(vm.rows[0].chips[0].condition, false);
  assert.equal(vm.rows[0].chips[1].condition, true);
});

test("DEF1: condition and state Vulnerability are data (effect keys, traits) and give disadvantage", () => {
  const src = fs.readFileSync(path.join(ROOT, "module/rules/change-keys.mjs"), "utf8");
  assert.match(src, /case "conditionVuln": case "stateVuln":/);
  assert.match(fs.readFileSync(path.join(ROOT, "module/data/actor/creature.mjs"), "utf8"), /conditionVuln: S\.set\(\), stateVuln: S\.set\(\)/);
  for ( const f of ["module/workflow/activity-buttons.mjs", "module/workflow/trackers.mjs"] ) {
    assert.match(fs.readFileSync(path.join(ROOT, f), "utf8"), /vulnerableToAny\(.*\)[\s\S]*Vulnerable to the condition/, f);
  }
});

test("DEF1: on the default rail and every design rail but the Scroll (which has its own rows), before Resources", () => {
  const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
  const def = read("templates/actor/character/rail.hbs");
  assert.ok(def.indexOf("shared/defenses.hbs") < def.indexOf("<h3>Resources</h3>") && def.indexOf("shared/defenses.hbs") > def.indexOf("die cd"));
  for ( const d of ["classic", "dossier", "glass", "ink", "oneui"] ) {
    const r = read(`templates/actor/designs/${d}/rail.hbs`);
    assert.ok(r.indexOf("shared/dice.hbs") < r.indexOf("shared/defenses.hbs") && r.indexOf("shared/defenses.hbs") < r.indexOf("shared/resources.hbs"), d);
  }
});
