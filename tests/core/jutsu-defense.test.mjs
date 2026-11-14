/** FIN2b: Read the Enemy, Identify, Suppress Chakra and the two sealing tags (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { defenseAction, identifyDC, readEnemyChoices, suppressionScore, tagsOn, suppressionBlocks, counterTagAbsorbs } from "../../module/rules/jutsu-defense.mjs";
import { castBlockers } from "../../module/rules/cast-checks.mjs";

const tag = (state, disabled = false) => ({ disabled, flags: { n5e: { state } } });

test("the skill action follows the cast discipline; Identify is DC + 5", () => {
  assert.deepEqual(["nin", "tai", "buki", "gen"].map(d => defenseAction("read", d)), ["readEnemyNin", "readEnemyTai", "readEnemyTai", "readEnemyGen"]);
  assert.deepEqual(["nin", "tai", "gen"].map(d => defenseAction("identify", d)), ["identifyNinjutsu", "identifyTaijutsu", "identifyGenjutsu"]);
  assert.equal(identifyDC(14), 19);
});

test("Read the Enemy offers +1 saves and AC, or the discipline's option", () => {
  const gen = readEnemyChoices("gen");
  assert.deepEqual(gen.map(c => c.key), ["bonus", "option"]);
  assert.deepEqual(gen[0].changes.map(c => [c.key, c.value]), [["system.bonuses.ac", "1"], ["system.bonuses.save", "1"]]);
  assert.equal(gen[1].status, "blinded");
  assert.match(readEnemyChoices("tai")[1].note, /interpose/);
  assert.match(readEnemyChoices("nin")[1].note, /10 ft/);
});

test("Suppress Chakra: each reattempt in a row costs 2 more", () => {
  assert.deepEqual([0, 1, 3].map(n => suppressionScore(18, n)), [18, 16, 12]);
});

test("tags are read from effect states; disabled or unranked ones are ignored", () => {
  const actor = { effects: [tag("counterTag:C"), tag("counterTag:B", true), tag("suppressionTag:A"), tag("counterTag:X"), tag("flow")] };
  assert.deepEqual(tagsOn(actor, "counterTag").map(t => t.rank), ["C"]);
  assert.deepEqual(tagsOn(actor, "suppressionTag").map(t => t.rank), ["A"]);
});

test("Counter Tag: its rank or lower, one target, no area", () => {
  assert.equal(counterTagAbsorbs({ tagRank: "C", castRank: "C" }), true);
  assert.equal(counterTagAbsorbs({ tagRank: "C", castRank: "D" }), true);
  assert.equal(counterTagAbsorbs({ tagRank: "C", castRank: "B" }), false);
  assert.equal(counterTagAbsorbs({ tagRank: "C", castRank: "D", targetCount: 2 }), false);
  assert.equal(counterTagAbsorbs({ tagRank: "C", castRank: "D", area: true }), false);
});

test("Chakra Suppression Tag blocks Ninjutsu and Genjutsu below its rank, by any listed discipline", () => {
  assert.equal(suppressionBlocks({ tagRank: "B", castRank: "C" }), true);
  assert.equal(suppressionBlocks({ tagRank: "B", castRank: "B" }), false);
  assert.equal(suppressionBlocks({ tagRank: "B", castRank: "C", ninOrGen: false }), false);
  const actor = { statuses: new Set(), system: { level: 20 }, effects: [tag("suppressionTag:B")] };
  const jutsu = (discipline, disciplines = []) => ({ name: "J", system: { discipline, disciplines, rank: "C", components: {}, keywords: [] } });
  assert.match(castBlockers(actor, jutsu("nin"), { rank: "C" }).join("|"), /Chakra Suppression Tag \(B-Rank\)/);
  assert.match(castBlockers(actor, jutsu("tai", ["gen"]), { rank: "D" }).join("|"), /Chakra Suppression Tag/);
  assert.doesNotMatch(castBlockers(actor, jutsu("tai"), { rank: "C" }).join("|"), /Suppression Tag/);
  assert.doesNotMatch(castBlockers(actor, jutsu("gen"), { rank: "B" }).join("|"), /Suppression Tag/);
});
