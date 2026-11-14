/** POS1: positioning (KB 03, 05). */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeActor, baseAbilities } from "./helpers/actor.mjs";
import { coverFrom, coverBonus, untargetable, provokingMove, opportunityReminders, isEngaged, surprisedEconomy,
  surpriseBlocksReaction, dodgeActive } from "../module/rules/positioning.mjs";
import { advantageSources } from "../module/rules/advantage.mjs";
import { meleeReach } from "../module/workflow/positioning.mjs";

const S = (...s) => new Set(s);
const EQUIP = path.join(import.meta.dirname, "..", "packs", "_source", "equipment");
const W = name => {
  const d = structuredClone(fs.readdirSync(EQUIP).map(f => JSON.parse(fs.readFileSync(path.join(EQUIP, f), "utf8"))).find(x => x.name === name));
  d.system.equipped = true;
  return d;
};

test("cover: the highest applies; +2/+4 to AC and Dex saves; Total can't be targeted", () => {
  assert.equal(coverFrom(S("coverPartial", "coverHalf")).key, "coverHalf");
  assert.equal(coverBonus(S("coverPartial")), 2);
  assert.equal(coverBonus(S("coverTotal")), 0);
  assert.ok(untargetable(S("coverTotal")) && !untargetable(S("coverHalf")));
  const a = makeActor({ system: structuredClone(baseAbilities) });
  const ac = a.system.ac.value, dex = a.system.saves.dex.total, str = a.system.saves.str.total;
  a.statuses = S("coverHalf");
  a.system.prepareDerivedData();
  assert.equal(a.system.ac.value, ac + 4);
  assert.equal(a.system.saves.dex.total, dex + 4);
  assert.equal(a.system.saves.str.total, str, "only Dex saves");
  assert.equal(a.system.cover, "coverHalf");
});

test("Opportunity Attack reminders: leaving reach provokes; teleport, forced, Disengage and unable watchers don't", () => {
  const w = (o = {}) => ({ name: "Guard", from: 5, to: 15, reach: 5, statuses: S(), reactionUsed: false, ...o });
  assert.equal(opportunityReminders([w()]).length, 1);
  assert.equal(opportunityReminders([w({ to: 5 })]).length, 0, "stays in reach");
  assert.equal(opportunityReminders([w({ from: 10, reach: 10, to: 15 })]).length, 1, "Reach weapon");
  assert.equal(opportunityReminders([w()], { action: "blink" }).length, 0, "teleport");
  assert.equal(opportunityReminders([w()], { forced: true }).length, 0, "forced movement");
  assert.equal(opportunityReminders([w()], { disengaged: true }).length, 0, "Disengage");
  assert.equal(opportunityReminders([w({ reactionUsed: true })]).length, 0);
  assert.equal(opportunityReminders([w({ statuses: S("stunned") })]).length, 0);
  assert.equal(opportunityReminders([w({ statuses: S("blinded") })]).length, 0, "must see the mover");
  assert.ok(provokingMove({ action: "walk" }) && !provokingMove({ action: "displace" }));
  const a = makeActor({ system: structuredClone(baseAbilities), items: [W("Katana"), W("Whip")] });
  assert.deepEqual([meleeReach(a).reach, meleeReach(a).weapon?.name], [15, "Whip"]);
  assert.deepEqual([meleeReach(makeActor({ system: structuredClone(baseAbilities) })).reach], [5], "unarmed");
});

test("Engaged lasts through the next round; Surprised spends the first turn and blocks Reactions until it ends", () => {
  assert.ok(isEngaged(3, 3) && isEngaged(3, 4) && !isEngaged(3, 5) && !isEngaged(undefined, 2));
  assert.deepEqual(surprisedEconomy(S("surprised"), 1), { action: true, bonus: true, move: true, reaction: true });
  assert.equal(surprisedEconomy(S("surprised"), 2), null);
  assert.equal(surprisedEconomy(S(), 1), null);
  assert.ok(surpriseBlocksReaction(S("surprised"), false) && !surpriseBlocksReaction(S("surprised"), true));
});

test("Dodge is lost while incapacitated or at speed 0", () => {
  assert.ok(dodgeActive(S("dodging")));
  assert.ok(!dodgeActive(S("dodging", "grappled")) && !dodgeActive(S("dodging", "restrained")) && !dodgeActive(S("dodging", "stunned")));
  const roller = { statuses: S(), flags: {}, senses: {} };
  const attack = target => advantageSources({ roller, target, kind: "attack", ability: "str" }).disadvantage;
  assert.deepEqual(attack({ statuses: S("dodging"), flags: {}, senses: {} }), ["Target Dodging"]);
  assert.deepEqual(attack({ statuses: S("dodging", "grappled"), flags: {}, senses: {} }), []);
  const save = statuses => advantageSources({ roller: { statuses, flags: {}, senses: {} }, kind: "save", ability: "dex" }).advantage;
  assert.deepEqual(save(S("dodging")), ["Dodging"]);
  assert.deepEqual(save(S("dodging", "restrained")), []);
});
