/** NPC2: the Adversary Builder's logic (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { blankDraft, draftFromActor, draftToUpdate, assignLine, rebaseMods, suggestedRanksFor, stepNotes } from "../../module/rules/adversary-builder.mjs";
import { suggestedCounts } from "../../module/rules/adversary.mjs";

const item = (id, type, name, system = {}, flags = {}) => ({ id, type, name, system, flags });

test("suggested jutsu ranks for every rank (E-Rank: E and D, King Q-N27)", () => {
  assert.deepEqual(["E", "D", "C", "B", "A", "S"].map(suggestedRanksFor), [["E", "D"], ["D", "C"], ["D", "C", "B"], ["C", "B", "A"], ["B", "A", "S"], ["A", "S"]]);
});

test("the baseline line given in order; rebase keeps the order with the new values (King Q-N30)", () => {
  assert.deepEqual(assignLine([3, 2, 1, 0, -1, -2]), { str: 3, dex: 2, con: 1, int: 0, wis: -1, cha: -2 });
  assert.deepEqual(assignLine([3, 2, 1, 0, -1, -2], ["dex", "wis", "con", "str", "int", "cha"]), { dex: 3, wis: 2, con: 1, str: 0, int: -1, cha: -2 });
  const mods = { str: 4, dex: 0, con: 0, int: -1, wis: 2, cha: -2 };
  assert.deepEqual(rebaseMods(mods, 13, "elite"), { str: 7, wis: 6, dex: 5, con: 4, int: 3, cha: 2 });
});

test("an NPC read into a draft and saved back unchanged gives the same profile and no item changes", () => {
  const actor = { name: "Avenger", img: "a.png", items: [
    item("j1", "jutsu", "Compelled Duel", { rank: "D", discipline: "gen" }), item("w1", "weapon", "Blessed Blade"),
    item("u1", "weapon", "Unarmed Strike", { identifier: "unarmedStrike" }), item("t1", "feat", "Hold Still", { category: "npcTraits", description: "<p>x</p>" }, { n5e: { adversaryTrait: { rank: "D" } } }),
    item("f1", "feat", "Some feat", { category: "feat" })],
    _source: { system: { hpMax: null, cpMax: null, details: { class: "standard", level: 5, role: "striker", rank: "D", concept: "A zealot.", blurb: "A zealot." },
      adversary: { mods: { str: 4, dex: 0, con: 0, int: -1, wis: 2, cha: -2 }, armor: "heavy", fullSaves: [], hpSource: "formula", partySize: 4, rankBonus: false, freeformAbility: "str" } } } };
  const draft = draftFromActor(actor);
  assert.deepEqual([draft.jutsu.map(j => j.id), draft.weapons.map(w => w.id), draft.traits.map(t => [t.id, t.rank])], [["j1"], ["w1"], [["t1", "D"]]]);
  assert.equal(draft.blurbFollowsConcept, true);
  const plan = draftToUpdate(draft, actor);
  assert.deepEqual([plan.fromUuid, plan.typed, plan.removed], [[], [], []]);
  assert.equal(plan.update["system.details.build"], "adversary");
  assert.equal(plan.update["system.adversary.armor"], "heavy");
  draft.jutsu = [];
  draft.traits.push({ name: "Charger", rank: "D", text: "Advantage after 15 ft." });
  draft.weapons.push({ uuid: "Compendium.n5e.equipment.Item.x", name: "Spear" });
  draft.concept = "A zealot who burns.";
  const next = draftToUpdate(draft, actor);
  assert.deepEqual(next.removed, ["j1"], "the unarmed strike and other feats are never removed");
  assert.deepEqual(next.fromUuid, ["Compendium.n5e.equipment.Item.x"]);
  assert.deepEqual(next.typed[0], { name: "Charger", type: "feat", system: { category: "npcTraits", description: "<p>Advantage after 15 ft.</p>" }, flags: { n5e: { adversaryTrait: { rank: "D" } } } });
  assert.equal(next.update["system.details.blurb"], "A zealot who burns.", "the blurb follows the concept (King Q-N28)");
  draft.blurbFollowsConcept = false;
  draft.blurb = "A masked cultist.";
  assert.equal(draftToUpdate(draft, actor).update["system.details.blurb"], "A masked cultist.");
});

test("step notes: concept, class level, party level, traits, jutsu limit and ranks; nothing blocks", () => {
  const d = { ...blankDraft(), concept: "", class: "elite", level: 2, partyLevel: 7, rank: "D",
    traits: Array.from({ length: 5 }, () => ({ name: "x" })), jutsu: [{ name: "A", rank: "S" }, ...Array.from({ length: 4 }, (_, i) => ({ name: `J${i}`, rank: "D" }))] };
  const n = stepNotes(d);
  assert.match(n.concept[0], /No concept/);
  assert.match(n.class.join("|"), /below level 3/);
  assert.match(n.level[0], /More than 3 levels/);
  assert.match(n.role[0], /5 traits; the book suggests 3/);
  assert.match(n.attacks.join("|"), /5 jutsu; the limit at this level is 4/);
  assert.match(n.attacks.join("|"), /Outside the suggested ranks \(D, C\): A/);
  assert.deepEqual(stepNotes({ ...blankDraft(), concept: "x", partyLevel: null }).level, []);
});

test("the Sasuke example: a level 13 Iconic A-Rank Elite casts B, A and S, knows 6 jutsu, and has 7 traits", () => {
  const counts = suggestedCounts({ level: 13, class: "elite", iconic: true });
  assert.deepEqual([counts.jutsu, suggestedRanksFor("A")], [6, ["B", "A", "S"]]);
  // 2 (Elite) + 3 (levels 12-17, the table) + 2 (Iconic, the example). The example's "+4 at level 13" contradicts the table.
  assert.equal(counts.traits, 7);
  assert.equal(suggestedCounts({ level: 13, class: "elite", epic: true }).traits, 5, "the book gives Epic no traits");
});
