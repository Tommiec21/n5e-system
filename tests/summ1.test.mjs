/**
 * SUMM1 (King 2026-11-25): NPC Strikes features in the Strikes section (all NPCs, Q-SU1); the summoner
 * link is live (Q-SU2) and can be set by hand (Q-SU3: the GM or the summon's owner).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { liveLinks, linkLabels, linksNeedRank } from "../module/rules/summoner-links.mjs";

const ROOT = path.join(import.meta.dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

test("SUMM1: live links follow the summoner's current numbers", () => {
  const links = { "details.level": "@level", "bonuses.attack.nin": "max(@attack.nin, @attack.tai, @attack.gen) - @prof",
    "hp.bonus": "10 * max(0, @rankValue - 2)" };
  const sys = lvl => ({ level: lvl, prof: 3, disciplines: { nin: { attack: 7, dc: 15 }, tai: { attack: 5 }, gen: { attack: 4 } } });
  assert.deepEqual(Object.fromEntries(liveLinks(links, sys(5), "A")), { "details.level": 5, "bonuses.attack.nin": 4, "hp.bonus": 20 });
  assert.equal(Object.fromEntries(liveLinks(links, sys(9), "A"))["details.level"], 9, "a level-up reaches the summon");
  assert.deepEqual(linkLabels(links), ["level", "attack bonus", "hit points"]);
  assert.equal(linksNeedRank(links), true);
  assert.equal(linksNeedRank({ "details.level": "@level" }), false);
});

test("SUMM1: the data model applies the links before level and proficiency; placement stores the rank", () => {
  const npc = read("module/data/actor/npc.mjs");
  assert.ok(npc.indexOf("this._applySummonerLinks();") < npc.indexOf("super.prepareBaseData();", npc.indexOf("this._applySummonerLinks();")));
  assert.match(npc, /summonRank: S\.str\(\)/);
  assert.match(read("module/workflow/allied.mjs"), /summonRank: String\(rank/);
  assert.match(read("n5e.mjs"), /registerSummonerRefresh\(\);/);
});

test("SUMM1: Strikes lists NPC Strikes features with their attack; Features doesn't", async () => {
  const { featureStrike } = await import("../module/view-models/npc-statblock.mjs");
  const actor = { system: { disciplines: { nin: { attack: 8 }, tai: { attack: 6 }, gen: { attack: 5 } } } };
  const bite = { id: "b", name: "Bite", flags: {}, system: { category: "npcStrikes", description: "<em>Melee Weapon Attack:</em> reach 10 ft.",
    activities: [{ type: "attack", attack: { discipline: "highest", range: "melee", count: 2, bonus: "0" } }] } };
  assert.equal(featureStrike(actor, bite).text, "Melee attack +8 (×2). Melee Weapon Attack: reach 10 ft.");
  const vm = read("module/view-models/npc-statblock.mjs");
  assert.match(vm, /items\.filter\(i => i\.type === "feat" && !isStrike\(i\)\)/);
  assert.match(read("templates/actor/npc/header.hbs"), /npcLinkSummoner/);
});
