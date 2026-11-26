/**
 * PLAY2 playtest fixes (King 2026-11-25): no "also Bukijutsu" note; Mastery set by hand in edit mode;
 * the Jutsu tab's hover card is the Combat tab's; clicking a jutsu opens its window instead of casting.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

test("PLAY2: Mastery boxes set, raise and lower the Manual ranks, keeping other sources", async () => {
  const { setManualMastery } = await import("../module/view-models/character.mjs");
  const feat = { target: "skill.ath", source: "Brutish Aggression" };
  let s = setManualMastery([feat], "skill.ath", 2);
  assert.deepEqual(s, [feat, { target: "skill.ath", source: "Manual 1" }, { target: "skill.ath", source: "Manual 2" }]);
  s = setManualMastery(s, "skill.ath", 2);
  assert.deepEqual(s, [feat, { target: "skill.ath", source: "Manual 1" }], "clicking the last lit box lowers by one");
  s = setManualMastery(s, "save.con", 3);
  assert.equal(s.filter(m => m.target === "save.con").length, 3);
  assert.equal(setManualMastery(s, "skill.ath", 1).filter(m => m.target === "skill.ath").length, 1, "the feature source stays");
  assert.equal(setManualMastery([], "attack.nin", 9).length, 3, "at most three");
});

test("PLAY2: the boxes are on skills, saves and disciplines in every design; no Bukijutsu note", () => {
  for ( const f of ["templates/actor/character/main.hbs", "templates/actor/designs/shared/skills.hbs",
    "templates/actor/designs/shared/saves.hbs", "templates/actor/designs/shared/disciplines.hbs"] ) {
    assert.match(read(f), /parts\/mastery-boxes\.hbs/, f);
  }
  assert.doesNotMatch(read("module/view-models/character.mjs"), /also Bukijutsu/);
  assert.match(read("templates/parts/mastery-boxes.hbs"), /@root\.editMode/);
});

test("PLAY2: Jutsu tab uses the Combat tab's card and opens the jutsu window", () => {
  assert.match(read("module/view-models/character.mjs"), /pillTip: tipHTML\(jutsuTipParts\(actor, i\)\)/);
  const tpl = read("templates/actor/character/jutsu.hbs");
  assert.doesNotMatch(tpl, /data-action="useItem"/);
  assert.match(tpl, /data-action="jutsuDetails"/);
  const cast = read("module/workflow/cast.mjs");
  assert.match(cast, /jutsuWindowParts/, "the jutsu window is built like the item sheet");
  assert.match(cast, /"n5e-jutsu-window"/);
});
