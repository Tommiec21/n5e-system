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

test("DEF1: rows for Resist, Immune, Weak; empty rows left out; nothing: null", () => {
  assert.equal(defenseChipsVM(actor({})), null);
  const vm = defenseChipsVM(actor({ resist: new Set(["fire"]), conditionResist: new Set(["burned"]), conditionImmune: new Set(["envenomed"]), vuln: new Set() }));
  assert.deepEqual(vm.rows.map(r => r.key), ["resist", "immune"]);
  const [fire, fr] = vm.rows[0].chips;
  assert.equal(fire.condition, false);
  assert.match(fire.tip, /half damage/);
  assert.equal(fr.condition, true);
  assert.match(fr.tip, /advantage on saves/);
  assert.match(vm.rows[1].chips[0].tip, /can't gain it/);
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
