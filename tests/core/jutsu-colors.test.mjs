/** NPCUI1: jutsu keyword colors and gradients (pure). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { colorKeys, pillGradient, sheetGroup } from "../../module/rules/jutsu-colors.mjs";
import { jutsuColors } from "../../module/config/jutsu-colors.mjs";

test("color keys follow the jutsu's keyword order, main discipline first", () => {
  assert.deepEqual(colorKeys({ discipline: "nin", keywords: ["fireRelease", "windRelease", "combo"] }), ["nin", "fireRelease", "windRelease"]);
  assert.deepEqual(colorKeys({ discipline: "tai", keywords: ["bukijutsu", "lightningRelease"] }), ["buki", "lightningRelease"]);
  assert.deepEqual(colorKeys({ discipline: "gen", disciplines: ["gen", "nin"], keywords: [] }), ["gen", "nin"]);
  assert.deepEqual(colorKeys({ discipline: "nin", keywords: new Set(["waterRelease", "waterRelease"]) }), ["nin", "waterRelease"]);
});

test("gradients: one keyword fades to paper; several run left to right", () => {
  assert.equal(pillGradient(["nin"]), `linear-gradient(90deg, ${jutsuColors.nin.color}, #fffaf1)`);
  assert.equal(pillGradient(["nin", "fireRelease"]), `linear-gradient(90deg, ${jutsuColors.nin.color}, ${jutsuColors.fireRelease.color})`);
  assert.notEqual(jutsuColors.buki.color, jutsuColors.windRelease.color, "smoke gray and silver differ");
});

test("Bukijutsu sits in the Taijutsu group", () => {
  assert.equal(sheetGroup({ discipline: "buki" }), "tai");
  assert.equal(sheetGroup({ discipline: "tai" }), "tai");
  assert.equal(sheetGroup({ discipline: "gen" }), "gen");
});
