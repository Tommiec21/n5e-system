/** PRESTD1 Part B: jutsu scrolls (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { scrollDiscipline, scrollSkill, scrollNumbers, skillTier, tierAllows, scrollName } from "../../module/rules/scrolls.mjs";

test("only Ninjutsu and Genjutsu go on scrolls, cast and identified by Ninshou or Illusions", () => {
  assert.equal(scrollDiscipline({ discipline: "nin" }), "nin");
  assert.equal(scrollDiscipline({ discipline: "tai", disciplines: ["tai", "gen"] }), "gen");
  assert.equal(scrollDiscipline({ discipline: "tai" }), null);
  assert.equal(scrollSkill("nin"), "nin");
  assert.equal(scrollSkill("gen"), "ill");
});

test("the scroll's numbers by rank; the casting DC is the identify DC (Q-P11)", () => {
  assert.deepEqual(scrollNumbers("D"), { identify: 12, castDC: 12, dc: 14, attack: 6 });
  assert.deepEqual(scrollNumbers("S"), { identify: 24, castDC: 24, dc: 22, attack: 14 });
});

test("skill tiers limit the rank: non-proficient D, proficient B, Mastery any", () => {
  assert.equal(skillTier({}), "np");
  assert.equal(skillTier({ proficient: true }), "proficient");
  assert.equal(skillTier({ proficient: true, mastery: 1 }), "mastery");
  assert.equal(tierAllows("np", "D"), true);
  assert.equal(tierAllows("np", "C"), false);
  assert.equal(tierAllows("proficient", "B"), true);
  assert.equal(tierAllows("proficient", "A"), false);
  assert.equal(tierAllows("mastery", "S"), true);
  assert.equal(scrollName({ identified: false, jutsuName: "Fireball", rank: "C" }), "Unidentified scroll (C-Rank)");
  assert.equal(scrollName({ identified: true, jutsuName: "Fireball", rank: "C" }), "Scroll: Fireball");
});
