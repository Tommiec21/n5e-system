/** NPC1a: the Bingo Book's adversary math (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  adversaryProf, statLine, rankPoints, abilityBudget, fullSaveCount, fullSaves, soloMultiplier, adversaryPools,
  adversaryAC, adversaryDR, adversaryParts, adversarySpeedBonus, autoFailsSaves, suggestedCounts, adversaryWarnings
} from "../../module/rules/adversary.mjs";
import { statLines, proficiencyByLevel } from "../../module/config/adversary.mjs";

const sum = parts => parts.reduce((a, p) => a + p.value, 0);

test("proficiency and stat lines follow the Base Adversary Statistics table", () => {
  assert.deepEqual([1, 3, 4, 7, 13, 20, 30].map(adversaryProf), [3, 3, 4, 5, 7, 9, 12]);
  assert.equal(proficiencyByLevel.length, 30);
  assert.equal(statLines.standard.length, 30);
  assert.equal(statLines.elite.length, 30);
  assert.deepEqual(statLine(5, "minion").line, [3, 2, 1, 0, -1, -2]);
  assert.deepEqual(statLine(5, "standard").line, [3, 2, 1, 0, -1, -2]);
  assert.deepEqual(statLine(13, "elite"), { line: [7, 6, 5, 4, 3, 2], sum: 27, missing: false });
  assert.deepEqual(statLine(30, "solo").line, [15, 13, 11, 8, 6, 4]);
  assert.deepEqual(statLine(19, "elite").line, [10, 9, 7, 6, 4, 3]);
  assert.equal(statLine(2, "elite").missing, true, "no Elite line before level 3");
});

test("the budget: the line's sum, plus Rank when switched on, Iconic +2, Epic +4", () => {
  assert.deepEqual(["E", "D", "C", "B", "A", "S"].map(rankPoints), [0, 1, 2, 3, 4, 5]);
  const p = { level: 5, class: "standard", rank: "A", mods: { str: 4, dex: 1, con: 1, int: 0, wis: -1, cha: -2 } };
  assert.deepEqual([abilityBudget(p).budget, abilityBudget(p).assigned, abilityBudget(p).difference], [3, 3, 0]);
  assert.equal(abilityBudget({ ...p, rankBonus: true }).budget, 7);
  assert.equal(abilityBudget({ ...p, iconic: true, epic: true }).budget, 9);
});

test("saves: 2 full at 1-7, 3 at 8-16, 4 at 17+; the highest modifiers unless the GM picks", () => {
  assert.deepEqual([1, 7, 8, 16, 17, 30].map(fullSaveCount), [2, 2, 3, 3, 4, 4]);
  const mods = { str: 4, dex: 0, con: 0, int: -1, wis: 2, cha: -2 };
  assert.deepEqual(fullSaves({ level: 5, mods }), ["str", "wis"]);
  assert.deepEqual(fullSaves({ level: 8, mods }), ["str", "wis", "dex"], "ties in ability order");
  assert.deepEqual(fullSaves({ level: 5, mods, fullSaves: ["cha", "int", "con"] }), ["cha", "int", "con"]);
});

test("Hit and Chakra Points: the book's worked numbers", () => {
  const p = { level: 5, rank: "C", mods: { con: 2 }, class: "standard" };
  assert.deepEqual([adversaryPools(p).hp, adversaryPools(p).cp], [60, 60]);
  assert.equal(adversaryPools({ ...p, class: "elite" }).hp, 75);
  assert.equal(soloMultiplier(4), 3.5);
  assert.equal(adversaryPools({ ...p, class: "solo", players: 4 }).hp, 210);
  assert.equal(adversaryPools({ ...p, class: "solo", players: 4, iconic: true }).hp, 315);
  assert.equal(adversaryPools({ ...p, class: "solo", players: 4, epic: true }).hp, 420);
  assert.equal(adversaryPools({ ...p, class: "solo", players: 4, iconic: true, epic: true }).hp, 525);
  assert.equal(adversaryPools({ level: 5, rank: "D", mods: { con: 0 }, class: "standard" }).hp, 40, "the Avenger");
  assert.equal(adversaryPools({ level: 3, rank: "D", mods: { con: 1 }, class: "elite" }).hp, 38, "38.75 rounds down");
  assert.deepEqual(adversaryPools({ level: 5, rank: "D", mods: { con: 1 }, class: "minion" }), { hp: 15, cp: 0, parts: [{ label: "Base", value: 10 }, { label: "Level", value: 5 }] });
  const parts = adversaryPools({ ...p, class: "elite", iconic: true }).parts;
  assert.equal(sum(parts), adversaryPools({ ...p, class: "elite", iconic: true }).hp, "parts add up to the total");
});

test("Lazy GM tables: 7/9/11 per level, Elite x1.25 and Solo x3.5 rounded up as printed", () => {
  assert.deepEqual(["lazyLow", "lazyMedium", "lazyHigh"].map(s => adversaryPools({ level: 5, class: "standard", hpSource: s }).hp), [35, 45, 55]);
  assert.deepEqual(["lazyLow", "lazyMedium", "lazyHigh"].map(s => adversaryPools({ level: 3, class: "elite", hpSource: s }).hp), [27, 34, 42]);
  assert.deepEqual(["lazyLow", "lazyMedium", "lazyHigh"].map(s => adversaryPools({ level: 30, class: "elite", hpSource: s }).hp), [263, 338, 413]);
  assert.deepEqual(["lazyLow", "lazyMedium", "lazyHigh"].map(s => adversaryPools({ level: 5, class: "solo", hpSource: s, players: 6 }).hp), [123, 158, 193]);
  assert.deepEqual(["lazyLow", "lazyMedium", "lazyHigh"].map(s => adversaryPools({ level: 27, class: "solo", hpSource: s }).hp), [662, 851, 1040]);
});

test("Armor Class and DR by level and armor type, with class, role and classification", () => {
  const ac = p => sum(adversaryAC(p));
  assert.deepEqual([1, 2, 3, 30].map(level => ac({ level, armor: "light" })), [17, 17, 18, 31]);
  assert.deepEqual([ac({ level: 13, armor: "medium" }), ac({ level: 30, armor: "heavy" })], [21, 27]);
  assert.deepEqual([ac({ level: 5, armor: "heavy", class: "standard", role: "striker" }), sum(adversaryDR({ armor: "heavy", role: "striker" }))], [15, 6], "the Avenger");
  assert.deepEqual([ac({ level: 5, armor: "medium", class: "standard", role: "controller" }), sum(adversaryDR({ armor: "medium" }))], [17, 3], "the Bishop");
  assert.equal(ac({ level: 5, armor: "light", class: "elite", role: "defender" }), 21);
  assert.equal(sum(adversaryDR({ armor: "light", role: "defender" })), 2);
  assert.equal(ac({ level: 5, armor: "light", class: "solo", iconic: true, epic: true }), 24);
  assert.equal(ac({ level: 5, armor: "heavy", class: "minion" }), 13);
});

test("role and class modifiers on saves, initiative, attacks, DCs, skills and speed", () => {
  const s = (kind, p) => sum(adversaryParts(kind, p));
  assert.deepEqual([s("save", { class: "elite" }), s("save", { class: "solo", role: "supporter" }), s("save", { class: "standard" })], [1, 3, 0]);
  assert.deepEqual([s("initiative", { class: "minion" }), s("initiative", { class: "elite", role: "striker" }), s("initiative", { class: "solo", iconic: true, epic: true })], [-2, 4, 6]);
  assert.deepEqual([s("dc", { role: "controller" }), s("dc", { role: "controller", iconic: true }), s("attack", { epic: true }), s("attack", { role: "controller" })], [1, 2, 1, 0]);
  assert.deepEqual([s("skill.ste", { role: "lurker" }), s("skill.cha", { role: "controller" }), s("skill.prc", { role: "supporter" }), s("skill.ath", { role: "lurker" })], [2, 2, 2, 0]);
  assert.deepEqual([adversarySpeedBonus({ role: "lurker" }), adversarySpeedBonus({ role: "striker" })], [20, 0]);
  assert.deepEqual([autoFailsSaves("minion"), autoFailsSaves("standard")], [true, false]);
});

test("suggested counts and notes", () => {
  assert.deepEqual(suggestedCounts({ level: 5, class: "minion" }), { traits: 1, jutsu: 4, freeformSlots: 2, multiattack: 1, fullSaves: 2 });
  assert.deepEqual(suggestedCounts({ level: 11, class: "standard" }), { traits: 3, jutsu: 6, freeformSlots: 4, multiattack: 3, fullSaves: 3 });
  assert.deepEqual(suggestedCounts({ level: 19, class: "solo" }), { traits: 7, jutsu: 8, freeformSlots: 7, multiattack: 4, fullSaves: 4 });
  assert.match(adversaryWarnings({ level: 2, class: "elite", mods: {} }).join("|"), /below level 3/);
  assert.match(adversaryWarnings({ level: 5, class: "standard", mods: { str: 5 } }).join("|"), /total 5; the baseline is 3/);
  assert.deepEqual(adversaryWarnings({ level: 5, class: "standard", mods: { str: 3, dex: 2, con: 1, wis: -1, cha: -2 } }), []);
});
