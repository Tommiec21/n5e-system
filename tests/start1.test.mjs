/**
 * King 2026-11-25 (playtest): Hijutsu only from the character's own clan in the browser; starting ability
 * scores (Standard Array, Point Buy, Roll) set before the clan, background and class.
 */
import "./helpers/foundry-stub.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { entryFrom, hijutsuVisible, TABS, INDEX_FIELDS } from "../module/rules/browser.mjs";
import { pointBuyCost, scoreProblems, newAbilityValues, recordedIncreases, allowedMethods } from "../module/rules/ability-generation.mjs";

const ROOT = path.join(import.meta.dirname, "..");

test("Hijutsu: a character sees only its own clan's; the GM sees all with a Clan filter", () => {
  const hyuga = entryFrom({ uuid: "a", name: "Gentle Fist", type: "jutsu", system: { section: "clan", hijutsu: { clan: "hyuga" } } });
  const uchiha = entryFrom({ uuid: "b", name: "Fireball", type: "jutsu", system: { section: "clan", hijutsu: { clan: "uchiha" } } });
  const plain = entryFrom({ uuid: "c", name: "Clone", type: "jutsu", system: { section: "nonElemental" } });
  assert.equal(hyuga.hijutsuClan, "hyuga");
  assert.deepEqual([hyuga, uchiha, plain].filter(e => hijutsuVisible(e, "hyuga")).map(e => e.name), ["Gentle Fist", "Clone"]);
  assert.deepEqual([hyuga, uchiha, plain].filter(e => hijutsuVisible(e, "")).map(e => e.name), ["Clone"], "no clan, no Hijutsu");
  assert.equal([hyuga, uchiha, plain].filter(e => hijutsuVisible(e, null)).length, 3, "no character: all");
  assert.ok(TABS.jutsu.filters.some(f => f.field === "hijutsuClan"));
  assert.ok(INDEX_FIELDS.includes("system.hijutsu"));
  const win = fs.readFileSync(path.join(ROOT, "module/applications/browser/compendium-browser.mjs"), "utf8");
  assert.match(win, /hijutsuVisible\(e, viewerClan\)/);
});

test("Starting scores: Standard Array, Point Buy (30, 8–15), Roll; increases kept", () => {
  const sa = { str: 15, dex: 14, con: 13, int: 12, wis: 11, cha: 10 };
  assert.deepEqual(scoreProblems("standard", sa), []);
  assert.match(scoreProblems("standard", { ...sa, cha: 15 })[0], /once/);
  assert.equal(pointBuyCost({ str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: 8 }), 27);
  assert.deepEqual(scoreProblems("pointBuy", { str: 15, dex: 15, con: 14, int: 10, wis: 8, cha: 8 }), []);
  assert.match(scoreProblems("pointBuy", { str: 15, dex: 15, con: 15, int: 12, wis: 8, cha: 8 })[0], /31 points/);
  assert.match(scoreProblems("pointBuy", { ...sa, str: 16 })[0], /8 to 15/);
  assert.deepEqual(scoreProblems("roll", { str: 16, dex: 12, con: 12, int: 9, wis: 14, cha: 7 }, [12, 16, 7, 14, 12, 9]), []);
  assert.match(scoreProblems("roll", sa, [12, 16, 7, 14, 12, 9])[0], /once/);
  assert.deepEqual(allowedMethods("any"), ["standard", "pointBuy", "roll"]);
  assert.deepEqual(allowedMethods("pointBuy"), ["pointBuy"]);
  const items = [{ type: "clan", flags: { n5e: { clanAbilityIncreases: { dex: 2, wis: 1 } } } }, { type: "class", flags: { n5e: { asi: { 4: { ability: "dex" } } } } }];
  const inc = recordedIncreases(items);
  assert.deepEqual([inc.dex, inc.wis, inc.str], [3, 1, 0]);
  const now = { str: 10, dex: 13, con: 10, int: 10, wis: 11, cha: 10 };
  assert.deepEqual(newAbilityValues(now, sa, null, inc), { str: 15, dex: 17, con: 13, int: 12, wis: 12, cha: 10 }, "first time: recorded increases on top");
  assert.deepEqual(newAbilityValues({ ...sa, dex: 17 }, { ...sa, dex: 13, con: 14 }, sa, inc).dex, 16, "changed later: the gain since the old base is kept");
});

test("Starting scores: the sheet offers them first; the world rule picks the method", () => {
  const sheet = fs.readFileSync(path.join(ROOT, "module/applications/actor/character-sheet.mjs"), "utf8");
  assert.match(sheet, /startingScores: CharacterSheet\.#onStartingScores/);
  assert.match(sheet, /if \( !await this\.#startingScoresFirst\(\) \) return null;/);
  assert.match(sheet, /\(await this\.#startingScoresFirst\(\)\) \? addClan/);
  assert.match(sheet, /\(await this\.#startingScoresFirst\(\)\) \? addBackground/);
  for ( const t of ["templates/actor/character/header.hbs", "templates/actor/designs/shared/header-buttons.hbs"] ) {
    assert.match(fs.readFileSync(path.join(ROOT, t), "utf8"), /data-action="startingScores"/, t);
  }
  assert.match(fs.readFileSync(path.join(ROOT, "module/config/rules.mjs"), "utf8"), /abilityGeneration: \{ group: "character", type: "choice", default: "any"/);
});
