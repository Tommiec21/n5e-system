/**
 * Phase 3 release 3: turn start (upkeep, Chain/Combo resets, action economy, recharge) and the NPC header.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import { makeActor, baseAbilities, load } from "./helpers/actor.mjs";
import { turnStartPlan, parseRecharge, economySlot } from "../module/rules/turn-start.mjs";
import { upkeepOptions, validateUpkeepChoice, upkeepMode, autoKeep } from "../module/rules/upkeep.mjs";
import { headerVM } from "../module/view-models/character.mjs";
import { combatVM } from "../module/view-models/combat.mjs";
import { registerHelpers } from "../module/applications/helpers.mjs";

const J = (id, name, cost, kw = ["ninjutsu"]) => ({ _id: id.padEnd(16, "0"), name, type: "jutsu", system: { discipline: "nin", rank: "D",
  keywords: kw, cost: { mode: "chakra", value: cost }, duration: { unit: "minute", value: 1, concentration: true } } });

test("upkeep options: half the paid cost, Efficient free; auto mode keeps in order; choices over budget are refused", () => {
  const a = makeActor({ system: structuredClone(baseAbilities), items: [J("a", "Mist", 9), J("b", "Veil", 8), J("c", "Calm", 6, ["genjutsu", "efficient"])] });
  a.system.combat.concentrating = ["a000000000000000", "b000000000000000", "c000000000000000"];
  a.flags = { n5e: { concentrationPaid: { a000000000000000: 9, b000000000000000: 8, c000000000000000: 6 } } };
  a.system.cp.value = 5;
  const o = upkeepOptions(a);
  assert.deepEqual(o.jutsu.map(x => [x.name, x.cost]), [["Mist", 4], ["Veil", 4], ["Calm", 0]]);
  assert.equal(o.noneAffordable, false);
  assert.deepEqual(autoKeep(o), ["a000000000000000", "c000000000000000"], "4 CP for Veil can't be paid from 1 CP left");
  assert.equal(validateUpkeepChoice(o, ["b000000000000000", "c000000000000000"]), 4, "the owner may keep Veil instead of Mist");
  assert.throws(() => validateUpkeepChoice(o, ["a000000000000000", "b000000000000000"]), /Not enough chakra/);
  assert.throws(() => validateUpkeepChoice(o, ["zzzz"]), /not waiting/);
  a.system.cp.value = 3;
  a.system.combat.concentrating = ["a000000000000000", "b000000000000000"];
  assert.equal(upkeepOptions(a).noneAffordable, true, "chakra for none: all end");
});

test("upkeep mode: players are asked; NPCs follow the world rule; Allied NPCs are asked; rule off skips", () => {
  assert.equal(upkeepMode({ type: "character" }, { npcUpkeep: "auto" }), "prompt");
  assert.equal(upkeepMode({ type: "npc", system: {} }, { npcUpkeep: "auto" }), "auto");
  assert.equal(upkeepMode({ type: "npc", system: {} }, { npcUpkeep: "manual" }), "manual");
  assert.equal(upkeepMode({ type: "npc", system: {} }, { npcUpkeep: "prompt" }), "prompt");
  assert.equal(upkeepMode({ type: "npc", system: { allied: true } }, { npcUpkeep: "auto" }), "prompt");
  assert.equal(upkeepMode({ type: "character" }, { upkeepRule: false }), "off");
});

test("Chain resets unless touched; Combo clears; economy resets", () => {
  const a = makeActor({ system: structuredClone(baseAbilities) });
  a.system.combat.chain.value = 2;
  a.flags = { n5e: { combo: { name: "Jab" }, economy: { action: true } } };
  let p = turnStartPlan(a);
  assert.ok(p.chainReset && p.comboCleared);
  assert.equal(p.update["system.combat.chain.value"], 0);
  assert.deepEqual(p.update["flags.n5e.economy"], { action: false, bonus: false, reaction: false, special: false, object: false, attackOrJutsu: false, attackAction: false, lightAttack: false });
  a.flags.n5e.chainTouched = true;
  p = turnStartPlan(a);
  assert.ok(!p.chainReset, "a Chain jutsu raised or maintained it since last turn");
  assert.equal(p.update["flags.n5e.chainTouched"], false);
});

test("recharge ranges and economy slots", () => {
  assert.deepEqual(parseRecharge("5-6"), { min: 5, die: 6 });
  assert.deepEqual(parseRecharge("7–8"), { min: 7, die: 8 });
  assert.deepEqual(parseRecharge("3-4"), { min: 3, die: 4 });
  assert.deepEqual(parseRecharge("6"), { min: 6, die: 6 });
  const breath = { _id: "breath0000000000", name: "Fire Breath", type: "feat", system: { uses: { max: "1", spent: 1, per: "recharge", recharge: "5-6" } } };
  const a = makeActor({ type: "npc", system: structuredClone(baseAbilities), items: [breath] });
  assert.deepEqual(turnStartPlan(a).recharges.map(r => [r.name, r.min, r.die]), [["Fire Breath", 5, 6]]);
  assert.equal(economySlot("fullTurn"), "action");
  assert.equal(economySlot("reaction"), "reaction");
  assert.equal(economySlot("none"), null);
});

test("combat tab shows the action economy", () => {
  const a = makeActor({ system: structuredClone(baseAbilities), items: [load("jutsu", "DynamicEntry")] });
  a.flags = { n5e: { economy: { bonus: true } } };
  const eco = combatVM(a).economy;
  assert.deepEqual(eco.map(e => e.key), ["action", "bonus", "reaction", "special", "object"]);
  assert.ok(eco.find(e => e.key === "bonus").used);
});

test("NPC header renders the stat-block summary and edit fields", () => {
  const hbs = Handlebars.create();
  registerHelpers(hbs);
  const tpl = hbs.compile(fs.readFileSync(path.join(import.meta.dirname, "..", "templates/actor/npc/header.hbs"), "utf8"));
  const a = makeActor({ type: "npc", system: { ...structuredClone(baseAbilities), details: { level: 6, rank: "C", role: "elite" }, hpMax: 55 } });
  const npc = { summary: "Level 6 · C-Rank · Elite", level: 6, hpMax: 55, rankOptions: [], roleOptions: [], templateOptions: [] };
  const play = tpl({ vm: headerVM(a), npc, editable: true, editMode: false });
  assert.match(play, /Level 6 · C-Rank · Elite/);
  assert.match(play, /data-roll="ability"/);
  const edit = tpl({ vm: headerVM(a), npc, editable: true, editMode: true });
  assert.match(edit, /name="system.hpMax" value="55"/);
  assert.equal(a.system.hp.max, 55, "stat-block HP override");
});
