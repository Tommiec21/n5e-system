/** NPC3: Freeform Strikes and Freeform Jutsu built from choices, their windows, and the builder's step 7. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { registerHelpers } from "../module/applications/helpers.mjs";
import { buildStrike, buildJutsu, recalculate, effectActivity, adversaryOf } from "../module/rules/freeform.mjs";
import { blankStrike, strikeFromForm, strikeVM, blankJutsu, jutsuFromForm, jutsuVM } from "../module/view-models/freeform.mjs";
import { builderVM } from "../module/view-models/adversary-builder.mjs";
import { blankDraft, draftFromActor, draftToUpdate, stepNotes } from "../module/rules/adversary-builder.mjs";
import { parseN5eChanges } from "../module/rules/change-keys.mjs";

const root = path.join(import.meta.dirname, "..", "templates");
const hbs = Handlebars.create();
registerHelpers(hbs);
const compile = f => hbs.compile(fs.readFileSync(path.join(root, f), "utf8"));
hbs.registerPartial("systems/n5e/templates/actor/npc/stat-block.hbs", fs.readFileSync(path.join(root, "actor/npc/stat-block.hbs"), "utf8"));
hbs.registerPartial("systems/n5e/templates/apps/adversary-builder-jutsu.hbs", fs.readFileSync(path.join(root, "apps/adversary-builder-jutsu.hbs"), "utf8"));

const elite6 = { name: "Kisame", level: 6, klass: "elite", dcs: [13, 15, 12] };

test("a Strike: attack on its line, table damage, rider save at the class DC", () => {
  const s = buildStrike({ ...blankStrike(), name: "Claw", reach: 10, damageType: "slashing", rider: { key: "prone", save: "str", recovery: "action" } }, elite6);
  assert.equal(s.type, "feat");
  assert.equal(s.system.category, "npcStrikes");
  const [atk, rider] = s.system.activities;
  assert.deepEqual(atk.attack, { discipline: "freeform", range: "melee", count: 1 });
  assert.equal(atk.damage.parts[0].formula, "1d10+3", "Tier 1 rider reads level 4");
  assert.equal(rider.type, "save");
  assert.equal(rider.save.dc.formula, "15");
  assert.equal(rider.inflicts[0].key, "prone");
  assert.equal(s.system.target.range.value, 10);
  assert.equal(s.flags.n5e.freeform.kind, "strike");
  assert.match(s.system.description, /DC 15 Str saving throw/);
});

test("a Strike: single combined attack, ranged, counts as Taijutsu", () => {
  const s = buildStrike({ ...blankStrike(), name: "Volley", range: "ranged", countsAs: "tai", single: true }, elite6);
  const [atk] = s.system.activities;
  assert.equal(atk.attack.discipline, "tai");
  assert.equal(atk.attack.range, "ranged");
  assert.equal(atk.damage.parts[0].formula, "3d8+15");
  assert.equal(s.system.target.range.value, 60);
});

test("an Offensive jutsu: area save with half damage, a condition and a rule-element effect", () => {
  const j = buildJutsu({ ...blankJutsu(elite6), name: "Great Fireball", rank: "C", target: "area", shape: "sphere",
    effects: [{ key: "burned", recovery: "save" }, { key: "attackDisadvantage", recovery: "rounds", rounds: 2 }] }, { level: 8, klass: "standard" });
  assert.equal(j.type, "jutsu");
  assert.equal(j.system.cost.value, 9);
  assert.equal(j.system.target.area.shape, "sphere");
  const save = j.system.activities.find(a => a.type === "save");
  assert.equal(save.save.onSuccess, "half");
  assert.equal(save.save.resave, true);
  assert.equal(save.inflicts[0].key, "burned");
  const eff = j.system.activities.find(a => a.type === "effect");
  assert.equal(eff.effect.seconds, 12);
  assert.deepEqual(eff.effect.rules[0], { key: "disadvantage", selector: "attack", label: "Disadvantage on attacks" });
  assert.equal(save.damage.parts[0].formula, "3d6+2", "level 8 less area (2) and two effects (1 + 1) = level 4");
});

test("an Offensive jutsu by attack: split over the attacks, effects as a follow-up save", () => {
  const j = buildJutsu({ ...blankJutsu(), name: "Twin Fang", resolve: "attack", attacks: 2, effects: [{ key: "bleed" }] }, { level: 13, klass: "elite" });
  const atk = j.system.activities.find(a => a.type === "attack");
  assert.equal(atk.attack.count, 2);
  assert.ok(j.system.activities.some(a => a.type === "save" && a.inflicts[0].key === "bleed"));
});

test("Defensive and Support jutsu: Active Effects, concentration except Burst", () => {
  const ac = buildJutsu({ ...blankJutsu(), name: "Earth Wall", type: "defensive", rank: "B", focus: "ac", range: "self" }, { level: 9, klass: "standard" });
  const eff = ac.system.activities[0].effect;
  assert.equal(eff.expires, "turnStart");
  assert.deepEqual(eff.changes[0], { key: "system.bonuses.ac", value: "4", mode: 2 });
  assert.equal(ac.system.activation.type, "reaction");
  const dr = buildJutsu({ ...blankJutsu(), name: "Iron Skin", type: "defensive", rank: "B", focus: "dr" }, { level: 9, klass: "elite" });
  assert.equal(dr.system.activities[0].effect.changes[0].value, "8");
  const res = buildJutsu({ ...blankJutsu(), name: "Fire Shield", type: "defensive", focus: "resistance", focusTypes: ["fire"] }, { level: 9, klass: "standard" });
  assert.deepEqual(res.system.activities[0].effect.changes[0], { key: "n5e.resist", value: "fire", mode: 2 });
  const sup = buildJutsu({ ...blankJutsu(), name: "War Cry", type: "support", focus: "attack" }, { level: 9, klass: "standard" });
  assert.equal(sup.system.duration.concentration, true);
  assert.equal(sup.system.activities[0].effect.changes[0].key, "n5e.attack.all");
  const burst = buildJutsu({ ...blankJutsu(), name: "Mend", type: "support", focus: "burst" }, { level: 10, klass: "standard" });
  assert.equal(burst.system.duration.concentration, false);
  assert.equal(burst.system.activities[0].type, "heal");
});

test("effect recovery: save re-saves, rounds set the duration, the rest are notes", () => {
  assert.equal(effectActivity({ key: "stunned", recovery: "save" }).resave, true);
  assert.equal(effectActivity({ key: "acPenalty", recovery: "rounds", rounds: 2 }).effect.seconds, 12);
  assert.match(effectActivity({ key: "forcedMovement", recovery: "action" }).note, /takes an action/);
  assert.match(effectActivity({ key: "custom", text: "Pinned to the wall" }).note, /Pinned to the wall/);
});

test("the new change keys parse: resist, immune, attack.all", () => {
  const m = parseN5eChanges([["n5e.resist", "fire"], ["n5e.immune", "poison"], ["n5e.attack.all", "2"]].map(([key, value]) => ({ key, value })));
  assert.deepEqual(m.resist, ["fire"]);
  assert.deepEqual(m.immune, ["poison"]);
  assert.equal(m.attack.all, 2);
});

test("a level change rebuilds Freeform Jutsu, keeps Strikes, and keeps hand-edited damage", () => {
  const j = buildJutsu({ ...blankJutsu(), name: "Fireball", rank: "B" }, { level: 9, klass: "standard" });
  const next = recalculate(j, { level: 12, klass: "standard" });
  assert.ok(next.data);
  assert.notEqual(next.data.system.activities[0].damage.parts[0].formula, j.system.activities[0].damage.parts[0].formula);
  assert.equal(recalculate(j, { level: 9, klass: "standard" }).data, null, "nothing changed");
  const edited = structuredClone(j);
  edited.system.activities[0].damage.parts[0].formula = "10d6";
  assert.deepEqual(recalculate(edited, { level: 12, klass: "standard" }), { data: null, handEdited: true });
  const s = buildStrike({ ...blankStrike(), name: "Claw" }, elite6);
  assert.equal(recalculate(s, { level: 12, klass: "elite" }).data, null);
});

test("the windows: form to choices, live numbers, and both templates render", () => {
  let c = strikeFromForm({ name: "Bite", riderKey: "bleed", riderSave: "con", riderRecovery: "rounds", riderRounds: "2" });
  assert.deepEqual(c.rider, { save: "con", recovery: "rounds", rounds: 2, key: "bleed" });
  const svm = strikeVM(c, elite6);
  assert.equal(svm.damage.dc, 15);
  assert.equal(svm.rider.isRounds, true);
  const sh = compile("apps/freeform-strike.hbs")({ vm: svm });
  assert.match(sh, /Create Strike/);
  assert.match(sh, /name="riderRounds"/);
  c = strikeFromForm({ riderKey: "" }, c);
  assert.equal(c.rider, null);

  let j = jutsuFromForm({ name: "Wind Blade", discipline: "nin", target: "area", shape: "cone", effect0Key: "slowed", effect1Key: "acPenalty", effect1Value: "-3" }, blankJutsu(elite6));
  assert.equal(j.effects.length, 2);
  assert.equal(j.effects[1].value, -3);
  const jvm = jutsuVM(j, elite6);
  assert.equal(jvm.live.kind, "damage");
  assert.ok(jvm.live.parts.length >= 3);
  j = jutsuFromForm({ type: "defensive" }, j);
  assert.equal(j.effects.length, 1, "defensive keeps one effect");
  assert.equal(j.range, "self");
  j = jutsuFromForm({ focus: "resistance", focusType0: "fire" }, j);
  const dvm = jutsuVM(j, elite6, { isEdit: true });
  assert.equal(dvm.focusTypeSlots.length, 1);
  const jh = compile("apps/freeform-jutsu.hbs")({ vm: dvm });
  assert.match(jh, /Update jutsu/);
  assert.match(jh, /name="focusType0"/);
});

test("builder step 7: lists Freeform entries, counts Freeform Jutsu, and saves them after the actor", () => {
  const draft = { ...blankDraft(), level: 6, class: "elite", freeform: [
    { kind: "strike", name: "Claw", choices: { ...blankStrike(), name: "Claw" } },
    { kind: "jutsu", name: "Fireball", choices: { ...blankJutsu(), name: "Fireball" } }] };
  const html = compile("apps/adversary-builder.hbs")({ vm: builderVM(draft, { step: "attacks", isNew: true }) });
  assert.match(html, /data-action="addFreeform" data-kind="strike"/);
  assert.match(html, /data-action="editFreeform" data-index="1"/);
  assert.match(html, /Fireball/);
  const plan = draftToUpdate(draft, null);
  assert.equal(plan.freeform.create.length, 2);
  assert.equal(plan.freeform.edit.length, 0);
  const many = { ...draft, level: 1, class: "minion", freeform: Array.from({ length: 6 }, () => draft.freeform[1]) };
  assert.ok(stepNotes(many).attacks.some(n => /Freeform/.test(n)));
});

test("draftFromActor reads Freeform items back; removing one in the builder deletes it", () => {
  const strike = { id: "s1", ...buildStrike({ ...blankStrike(), name: "Claw" }, elite6) };
  const jutsu = { id: "j1", ...buildJutsu({ ...blankJutsu(), name: "Fireball" }, elite6) };
  const actor = { name: "Kisame", img: "", system: { details: { level: 6, class: "elite" }, adversary: {} }, items: [strike, jutsu] };
  const d = draftFromActor(actor);
  assert.equal(d.jutsu.length, 0, "Freeform Jutsu are not compendium jutsu");
  assert.deepEqual(d.freeform.map(f => [f.id, f.kind]), [["s1", "strike"], ["j1", "jutsu"]]);
  d.freeform.splice(0, 1);
  d.freeform[0].dirty = true;
  const plan = draftToUpdate(d, actor);
  assert.deepEqual(plan.removed, ["s1"]);
  assert.equal(plan.freeform.edit[0].id, "j1");
  assert.equal(adversaryOf(actor).klass, "elite");
});
