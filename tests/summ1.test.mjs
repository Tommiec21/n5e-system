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
  // A bonus-style link ("your number − @prof") reads as the total (0.112.2): your best +7.
  assert.deepEqual(Object.fromEntries(liveLinks(links, sys(5), "A")), { "details.level": 5, "override.attack.nin": 7, "hp.bonus": 20 });
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

test("SUMM1: the Blood Dragon's attack and DC are the summoner's highest totals, not a bonus on its own abilities", () => {
  const dragon = JSON.parse(read("packs/_source/summons/chinoike/blood-dragon-n5e6xblImso76jRj.json"));
  const links = dragon.flags.n5e.fromSummoner;
  assert.equal(links["override.attack.nin"], "max(@attack.nin, @attack.tai, @attack.gen)");
  assert.equal(links["override.dc.nin"], "max(@dc.nin, @dc.tai, @dc.gen)");
  assert.equal(links["bonuses.attack.nin"], undefined);
  // King's character: Ninjutsu +3 DC 11, Taijutsu +3 DC 12, Genjutsu +4 DC 12.
  const pc = { level: 2, prof: 2, disciplines: { nin: { attack: 3, dc: 11 }, tai: { attack: 3, dc: 12 }, gen: { attack: 4, dc: 12 } } };
  const got = Object.fromEntries(liveLinks(links, pc));
  assert.equal(got["override.attack.nin"], 4);
  assert.equal(got["override.dc.nin"], 12);
  assert.ok(read("module/data/actor/npc.mjs").includes("if ( this._linkOverrides?.[key] != null ) return this._linkOverrides[key];"));
});


test("SUMM1: summons imported before 0.112.1 (bonus-style links) still get the summoner's totals; summons get no Unarmed Strike", async () => {
  const old = { "details.level": "@level", "bonuses.attack.nin": "max(@attack.nin, @attack.tai, @attack.gen) - @prof", "bonuses.saveDC.nin": "max(@dc.nin, @dc.tai, @dc.gen) - 8 - @prof" };
  const pc = { level: 5, prof: 3, disciplines: { nin: { attack: 3, dc: 11 }, tai: { attack: 3, dc: 12 }, gen: { attack: 4, dc: 12 } } };
  const got = Object.fromEntries(liveLinks(old, pc));
  assert.equal(got["override.attack.nin"], 4);
  assert.equal(got["override.dc.nin"], 12);
  assert.equal(got["bonuses.attack.nin"], undefined);
  const { getsUnarmedStrike } = await import("../module/rules/unarmed.mjs");
  assert.equal(getsUnarmedStrike({ type: "npc", flags: { n5e: { fromSummoner: old } } }), false);
  assert.equal(getsUnarmedStrike({ type: "npc", flags: {} }), true);
  assert.equal(getsUnarmedStrike({ type: "character" }), true);
  const { itemAudit } = await import("../module/rules/item-audit.mjs");
  assert.equal(itemAudit({ type: "npc", items: [], flags: { n5e: { fromSummoner: old } } }).missingUnarmed, false);
});

test("SUMM1: links read the same nested (as Foundry stores them in a world) or flat (pack source)", async () => {
  const { flatLinks, linkLabels: labels, linksNeedRank: needRank } = await import("../module/rules/summoner-links.mjs");
  const flat = JSON.parse(read("packs/_source/summons/ninjutsu/earth-release/stone-dragon-n5eB04AbOJC1Hp4V.json")).flags.n5e.fromSummoner;
  // Foundry's expandObject on create: dotted keys become nested objects.
  const nested = {};
  for ( const [k, v] of Object.entries(flat) ) {
    const keys = k.split(".");
    let o = nested;
    for ( const p of keys.slice(0, -1) ) o = (o[p] ??= {});
    o[keys.at(-1)] = v;
  }
  assert.deepEqual(flatLinks(nested), flat);
  const pc = { level: 9, prof: 4, disciplines: { nin: { attack: 3, dc: 11 }, tai: { attack: 3, dc: 12 }, gen: { attack: 4, dc: 12 } } };
  assert.deepEqual(Object.fromEntries(liveLinks(nested, pc, "A")), Object.fromEntries(liveLinks(flat, pc, "A")));
  assert.equal(Object.fromEntries(liveLinks(nested, pc, "A"))["details.level"], 9);
  assert.deepEqual(labels(nested), labels(flat));
  assert.ok(!labels(nested).includes("override") && !labels(nested).includes("details"));
  assert.equal(needRank(nested), needRank(flat));
});
