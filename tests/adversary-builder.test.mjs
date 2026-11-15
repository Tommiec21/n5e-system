/** NPC2: the Adversary Builder's view model and template. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { registerHelpers } from "../module/applications/helpers.mjs";
import { builderVM, STEPS } from "../module/view-models/adversary-builder.mjs";
import { blankDraft } from "../module/rules/adversary-builder.mjs";

const root = path.join(import.meta.dirname, "..", "templates");
const hbs = Handlebars.create();
registerHelpers(hbs);
hbs.registerPartial("systems/n5e/templates/actor/npc/stat-block.hbs", fs.readFileSync(path.join(root, "actor/npc/stat-block.hbs"), "utf8"));
hbs.registerPartial("systems/n5e/templates/apps/adversary-builder-jutsu.hbs", fs.readFileSync(path.join(root, "apps/adversary-builder-jutsu.hbs"), "utf8"));
const tpl = hbs.compile(fs.readFileSync(path.join(root, "apps/adversary-builder.hbs"), "utf8"));

test("every step renders, with the step list and Create or Update", () => {
  const draft = { ...blankDraft(), concept: "A lone predator.", traits: [{ name: "Charger", rank: "D", text: "" }], jutsu: [{ uuid: "u", name: "Body Flicker", rank: "D" }] };
  for ( const [step] of STEPS ) {
    const html = tpl({ vm: builderVM(draft, { step, isNew: true, jutsuResults: [{ uuid: "x", name: "Fireball", rank: "C", discipline: "nin" }], clanNames: ["Uchiha"] }) });
    assert.match(html, /data-action="goStep" data-step="finalize"/, step);
    assert.match(html, /Create<\/button>/, step);
  }
  assert.match(tpl({ vm: builderVM(draft, { step: "finalize" }) }), /Update<\/button>/);
});

test("cards show the book's choices; the selected one is marked", () => {
  const draft = { ...blankDraft(), class: "solo", role: "lurker", rank: "B" };
  const vm = builderVM(draft, { step: "class" });
  assert.deepEqual(vm.classCards.filter(c => c.selected).map(c => c.key), ["solo"]);
  assert.match(vm.classCards.find(c => c.key === "solo").hp, /1\.5 \+ 0\.5 per player/);
  assert.deepEqual(vm.rankCards.find(c => c.key === "B").casts, "C, B, A");
  assert.match(vm.roleCards.find(c => c.key === "lurker").text, /\+20 speed/);
  assert.match(tpl({ vm: builderVM(draft, { step: "rank" }) }), /data-value="B" aria-pressed="true"/);
});

test("level step: party level, baseline line, suggested counts; rebase only when editing", () => {
  const draft = { ...blankDraft(), level: 13, class: "elite", partyLevel: 9 };
  const html = tpl({ vm: builderVM(draft, { step: "level", isNew: false }) });
  assert.match(html, /\+7 {2}\+6 {2}\+5 {2}\+4 {2}\+3 {2}\+2/);
  assert.match(html, /name="partyLevel" value="9"/);
  assert.match(html, /More than 3 levels from the party/);
  assert.match(html, /data-action="rebase"/);
  assert.doesNotMatch(tpl({ vm: builderVM(draft, { step: "level", isNew: true }) }), /data-action="rebase"/);
});

test("attacks: jutsu count against the limit, outside ranks flagged, Freeform waits for NPC3", () => {
  const draft = { ...blankDraft(), rank: "D", jutsu: [{ uuid: "a", name: "Chidori", rank: "A" }] };
  const html = tpl({ vm: builderVM(draft, { step: "attacks" }) });
  assert.match(html, /1 of 4; suggested ranks D, C/);
  assert.match(html, /outside the suggested ranks/);
  assert.match(html, /Coming with NPC3/);
});

test("finalize: modifiers, budget, saves, armor, HP source; a Solo asks for players", () => {
  const draft = { ...blankDraft(), class: "solo", level: 5, mods: { str: 20, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, fullSaves: ["str"] };
  const vm = builderVM(draft, { step: "finalize" });
  assert.equal(vm.finalize.over, true);
  const html = tpl({ vm });
  assert.match(html, /name="mods.str" value="20"/);
  assert.match(html, /name="fullSave.str" checked/);
  assert.match(html, /name="partySize"/);
  assert.match(html, /Assigned 20 of 15/);
});
