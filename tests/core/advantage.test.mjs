/** ADV1: advantage/disadvantage sources and automatic save failures (STD3: read from the condition entries). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { advantageSources, resolveMode, sourcesNote } from "../../module/rules/advantage.mjs";

const who = ({ flags = {}, statuses = [], senses = {} } = {}) => ({ flags, statuses: new Set(statuses), senses });

test("counting: any advantage and any disadvantage cancel; the click counts as one source", () => {
  assert.equal(resolveMode({ advantage: ["A", "B"], disadvantage: [] }), "advantage");
  assert.equal(resolveMode({ advantage: ["A", "B"], disadvantage: ["C"] }), "normal");
  assert.equal(resolveMode({ advantage: [], disadvantage: [] }, "disadvantage"), "disadvantage");
  assert.equal(resolveMode({ advantage: ["A"], disadvantage: [] }, "disadvantage"), "normal");
  assert.equal(sourcesNote({ advantage: ["Target Prone"], disadvantage: ["Staggered"] }), "Advantage: Target Prone · Disadvantage: Staggered · they cancel");
});

test("attacks: attacker and target conditions and states", () => {
  const blind = who({ statuses: ["blinded"] });
  assert.deepEqual(advantageSources({ roller: blind, kind: "attack" }).disadvantage, ["Blinded"]);
  assert.deepEqual(advantageSources({ roller: who({ statuses: ["blinded"], senses: { blindsight: 10 } }), kind: "attack" }).disadvantage, [], "Blindsight ignores Blinded");
  const prone = who({ statuses: ["prone"] });
  assert.deepEqual(advantageSources({ roller: who(), target: prone, kind: "attack" }).advantage, ["Target Prone"]);
  assert.deepEqual(advantageSources({ roller: who(), target: prone, kind: "attack", ranged: true }).disadvantage, ["Target Prone"]);
  const invisible = who({ statuses: ["invisible"] });
  assert.deepEqual(advantageSources({ roller: invisible, target: who(), kind: "attack" }).advantage, ["Invisible"]);
  assert.deepEqual(advantageSources({ roller: invisible, target: who({ senses: { trueSight: 30 } }), kind: "attack" }).advantage, [], "True Sight sees it");
  assert.deepEqual(advantageSources({ roller: who(), target: invisible, kind: "attack" }).disadvantage, ["Target Invisible"]);
  assert.deepEqual(advantageSources({ roller: who(), target: who({ statuses: ["dodging"] }), kind: "attack" }).disadvantage, ["Target Dodging"]);
  assert.deepEqual(advantageSources({ roller: who(), target: who({ statuses: ["dodging", "stunned"] }), kind: "attack" }).disadvantage, [], "no Dodge while incapacitated");
  assert.deepEqual(advantageSources({ roller: who({ statuses: ["restrained"] }), target: who({ statuses: ["restrained"] }), kind: "attack" }),
    { advantage: ["Target Restrained"], disadvantage: ["Restrained"], autoFail: null, consume: [] });
  const dazzled = who({ statuses: ["dazzled"] });
  assert.deepEqual(advantageSources({ roller: dazzled, target: prone, kind: "attack" }).advantage, [], "Dazzled can't gain advantage");
  assert.deepEqual(advantageSources({ roller: who({ statuses: ["staggered"] }), kind: "attack", ability: "dex" }).disadvantage, ["Staggered"]);
  assert.deepEqual(advantageSources({ roller: who({ statuses: ["staggered"] }), kind: "attack", ability: "int" }).disadvantage, []);
});

test("saves: automatic failures, Blinded and Dodging", () => {
  assert.equal(advantageSources({ roller: who({ statuses: ["petrified"] }), kind: "save", ability: "dex" }).autoFail, "Petrified");
  assert.equal(advantageSources({ roller: who({ statuses: ["petrified"] }), kind: "save", ability: "wis" }).autoFail, null);
  assert.equal(advantageSources({ roller: who({ statuses: ["stunned"] }), kind: "save", ability: "str" }).autoFail, "Stunned");
  assert.equal(advantageSources({ roller: who({ statuses: ["stunned"] }), kind: "save", ability: "con" }).autoFail, null);
  assert.equal(advantageSources({ roller: who({ statuses: ["unconscious"] }), kind: "save", ability: "wis" }).autoFail, "Unconscious");
  assert.deepEqual(advantageSources({ roller: who({ statuses: ["blinded"] }), kind: "save", ability: "int" }).disadvantage, ["Blinded"]);
  assert.deepEqual(advantageSources({ roller: who({ statuses: ["dodging"] }), kind: "save", ability: "dex" }).advantage, ["Dodging"]);
});

test("Help: advantage on the next attack or check, then spent", () => {
  const helped = who({ statuses: ["helped"] });
  assert.deepEqual(advantageSources({ roller: helped, kind: "check", ability: "dex" }), { advantage: ["Helped"], disadvantage: [], autoFail: null, consume: ["helped"] });
  assert.deepEqual(advantageSources({ roller: helped, kind: "attack" }).consume, ["helped"]);
  assert.deepEqual(advantageSources({ roller: helped, kind: "save", ability: "dex" }).consume, []);
});
