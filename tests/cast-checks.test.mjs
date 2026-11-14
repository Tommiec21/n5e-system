/** CAST1: pre-cast checks, Shocked, sheet roll-mode toggle. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { castBlockers, jutsuComponents } from "../module/rules/cast-checks.mjs";
import { addSheetToggle } from "../module/dice/advantaged.mjs";
import { resolveMode } from "../module/rules/advantage.mjs";

const jutsu = (components = {}, extra = {}) => ({ name: "Test", system: { rank: "D", keywords: [], description: "", components, live: {}, ...extra } });
const caster = ({ statuses = [], flags = {}, economy = {}, level = 5, maxRank = "C" } = {}) => ({
  statuses: new Set(statuses), flags: { n5e: { economy } },
  system: { level, grants: { maxRank }, conditionPenalties: { flags } } });

test("components count and component blocks", () => {
  assert.deepEqual(jutsuComponents(jutsu({ hs: true, cm: true, weapon: { required: true } })), ["hs", "cm", "w"]);
  const hs = jutsu({ hs: true, cm: true });
  assert.deepEqual(castBlockers(caster(), hs), []);
  assert.match(castBlockers(caster({ statuses: ["grappled"] }), hs)[0], /Hand Seals need free hands/);
  assert.match(castBlockers(caster({ flags: { noComponents: ["hs"] } }), hs)[0], /Confused/);
  assert.match(castBlockers(caster({ statuses: ["restrained"] }), jutsu({ m: true }))[0], /Mobility/);
  assert.match(castBlockers(caster({ statuses: ["stunned"] }), jutsu({ cm: true }))[0], /Incapacitated/);
  assert.match(castBlockers(caster({ flags: { maxComponents: 2 } }), jutsu({ hs: true, cm: true, m: true }))[0], /Slowed/);
  assert.deepEqual(castBlockers(caster({ flags: { maxComponents: 2 } }), hs), [], "two components are fine while Slowed");
});

test("Shocked, Sealed teleport, Blinded Dojutsu", () => {
  const shocked = { maxAttackOrJutsuPerTurn: 1 };
  assert.deepEqual(castBlockers(caster({ flags: shocked }), jutsu()), []);
  assert.match(castBlockers(caster({ flags: shocked, economy: { attackOrJutsu: true } }), jutsu())[0], /Shocked/);
  const tp = jutsu({}, { description: "You teleport up to 30 feet." });
  assert.match(castBlockers(caster({ flags: { noTeleportAtRanks: 3, "has.sealed": 3 } }), tp)[0], /Sealed 3/);
  assert.deepEqual(castBlockers(caster({ flags: { noTeleportAtRanks: 3, "has.sealed": 2 } }), tp), []);
  assert.match(castBlockers(caster({ flags: { noDojutsu: true } }), jutsu({}, { keywords: ["dojutsu"] }))[0], /Dojutsu/);
});

test("ability requirement and highest rank for the level", () => {
  assert.match(castBlockers(caster(), jutsu({}, { live: { meetsRequirement: false, ability: "int", requirement: 16 } }))[0], /Needs INT 16/);
  assert.match(castBlockers(caster({ maxRank: "C" }), jutsu({}, { rank: "B" }))[0], /B-Rank is above the highest rank you can cast \(C\)/);
  assert.deepEqual(castBlockers(caster({ maxRank: "C" }), jutsu({}, { rank: "C" })), []);
  assert.match(castBlockers(caster({ maxRank: "C" }), jutsu({}, { rank: "D" }), { rank: "B" })[0], /B-Rank/, "upcast rank is checked");
});

test("sheet toggle counts as one source until switched off; a per-roll Dis cancels it", () => {
  const adv = addSheetToggle({ advantage: [], disadvantage: [] }, { flags: { n5e: { rollMode: "advantage" } } });
  assert.deepEqual(adv.advantage, ["Sheet toggle"]);
  assert.equal(resolveMode(adv), "advantage");
  assert.equal(resolveMode(adv, "disadvantage"), "normal");
  assert.deepEqual(addSheetToggle({ advantage: [], disadvantage: [] }, { flags: {} }), { advantage: [], disadvantage: [] });
});
