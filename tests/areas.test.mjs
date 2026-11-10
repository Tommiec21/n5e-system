/**
 * Jutsu on the map (0.9.0): area parsing and sizing, template geometry, token coverage, area
 * lifetimes, senses → token vision, movement costs and ruler bands.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseArea, areaOf, areaLabel, templateFields, pointInTemplate, tokensInTemplate, areaLifetime, areaExpired, CONE_ANGLE }
  from "../module/rules/area.mjs";
import { visionFromSenses, movementCost, speedBand } from "../module/rules/senses.mjs";
import { load } from "./helpers/actor.mjs";

test("areas from text: cones, radii, lines with widths, cubes", () => {
  assert.deepEqual(parseArea("Self (15-foot cone)"), { shape: "cone", size: 15 });
  assert.deepEqual(parseArea("each creature in a 20-foot radius"), { shape: "sphere", size: 20 });
  assert.deepEqual(parseArea("a 60-foot line that is 10 feet wide"), { shape: "line", size: 60, width: 10 });
  assert.deepEqual(parseArea("a 30 ft. line"), { shape: "line", size: 30, width: 5 });
  assert.deepEqual(parseArea("<p>a <b>10-foot cube</b></p>"), { shape: "cube", size: 10 });
  assert.equal(parseArea("range 60 feet"), null);
});

test("areaOf: authored area first, Self flag, upcast growth", () => {
  const whip = load("jutsu", "flame-whip").system;
  const a = areaOf(whip);
  assert.equal(a, null, "Flame Whip targets one creature within 20 feet; it is not a radius");
  const sys = { rank: "C", target: { range: { type: "feet", text: "" }, area: {} }, description: "a 15-foot cone",
    upcast: { perRank: [{ type: "area", value: "+5 ft" }] } };
  assert.equal(areaOf(sys, { rank: "A" }).size, 25, "two ranks above C: +10");
  assert.equal(areaOf(sys).size, 15);
  assert.equal(areaLabel({ shape: "sphere", size: 20 }), "20-ft radius");
  assert.equal(areaLabel({ shape: "line", size: 60, width: 10 }), "60-ft line (10 ft wide)");
});

test("template fields per shape", () => {
  assert.deepEqual(templateFields({ shape: "cone", size: 15 }, 90), { t: "cone", distance: 15, angle: CONE_ANGLE, direction: 90 });
  assert.equal(templateFields({ shape: "cube", size: 10 }).t, "rect");
  assert.equal(templateFields({ shape: "cube", size: 10 }).distance, 14.14);
  assert.equal(templateFields({ shape: "cylinder", size: 10 }).t, "circle");
  assert.equal(templateFields({ shape: "line", size: 30, width: 5 }).t, "ray");
});

test("coverage: circle includes origin; cone and line exclude it; rect covers its square", () => {
  const o = { x: 0, y: 0 };
  assert.ok(pointInTemplate({ t: "circle", distance: 10 }, o, { x: 0, y: 0 }));
  assert.ok(pointInTemplate({ t: "circle", distance: 10 }, o, { x: 10, y: 0 }));
  assert.ok(!pointInTemplate({ t: "circle", distance: 10 }, o, { x: 8, y: 8 }));
  const cone = { t: "cone", distance: 15, angle: CONE_ANGLE, direction: 0 };
  assert.ok(!pointInTemplate(cone, o, o), "origin excluded");
  assert.ok(pointInTemplate(cone, o, { x: 10, y: 4 }));
  assert.ok(!pointInTemplate(cone, o, { x: 10, y: 6 }), "outside the 53° spread");
  assert.ok(!pointInTemplate(cone, o, { x: -5, y: 0 }), "behind");
  const line = { t: "ray", distance: 30, width: 5, direction: 90 };
  assert.ok(pointInTemplate(line, o, { x: 2, y: 25 }));
  assert.ok(!pointInTemplate(line, o, { x: 3, y: 25 }));
  const cube = { t: "rect", distance: 10 * Math.SQRT2, direction: 45 };
  assert.ok(pointInTemplate(cube, o, { x: 2.5, y: 7.5 }));
  assert.ok(!pointInTemplate(cube, o, { x: 12.5, y: 2.5 }));
});

test("tokens in an area: any occupied square counts; the Self caster is left out", () => {
  const tpl = { t: "circle", distance: 10 };
  const tokens = [
    { id: "caster", points: [{ x: 2.5, y: 2.5 }] },
    { id: "near", points: [{ x: 7.5, y: 2.5 }] },
    { id: "big", points: [{ x: 22.5, y: 2.5 }, { x: 12.5, y: 2.5 }] },
    { id: "far", points: [{ x: 30, y: 30 }] }
  ];
  assert.deepEqual(tokensInTemplate(tpl, { x: 2.5, y: 2.5 }, tokens, { exclude: "caster" }), ["near", "big"]);
});

test("area lifetimes", () => {
  assert.deepEqual(areaLifetime({ concentration: true, unit: "minute", value: 1 }, true), { kind: "concentration" });
  assert.deepEqual(areaLifetime({ unit: "instant" }, true), { kind: "turn" });
  assert.deepEqual(areaLifetime({ unit: "minute", value: 1 }, true), { kind: "rounds", rounds: 10 });
  assert.deepEqual(areaLifetime({ unit: "minute", value: 1 }, false), { kind: "manual" });
  assert.ok(areaExpired({ round: 3, turn: 1 }, { round: 3, turn: 1 }));
  assert.ok(!areaExpired({ round: 3, turn: 1 }, { round: 3, turn: 0 }));
  assert.ok(areaExpired({ round: 3, turn: 1 }, { round: 4, turn: 0 }));
});

test("senses become token vision and detection modes", () => {
  const v = visionFromSenses({ darkvision: 60, blindsight: 10, chakraSensing: 30 }, { range: 0, visionMode: "basic" },
    [{ id: "basicSight", range: 0, enabled: true }]);
  assert.deepEqual(v.sight, { range: 60, visionMode: "darkvision" });
  assert.equal(v.modes.find(m => m.id === "basicSight").range, 60);
  assert.equal(v.modes.find(m => m.id === "senseAll").range, 10);
  assert.equal(v.modes.find(m => m.id === "chakraSensing").range, 30);
  const keep = visionFromSenses({ trueSight: 30 }, { range: 120, visionMode: "basic" }, [{ id: "seeAll", range: 60, enabled: true }]);
  assert.equal(keep.sight.range, 120, "no darkvision: sight unchanged");
  assert.equal(keep.modes.find(m => m.id === "seeAll").range, 60, "a longer hand-set range is kept");
});

test("movement costs and ruler bands", () => {
  assert.equal(movementCost("climb", { climb: 0 }, 5, 5), 10);
  assert.equal(movementCost("climb", { climb: 30 }, 5, 5), 5);
  assert.equal(movementCost("crawl", {}, 10, 5), 15, "crawling in difficult terrain: 3 ft per ft");
  assert.equal(movementCost("walk", {}, 5, 5), 5);
  const speed = { walk: 30, fly: 0, climb: 0 };
  assert.equal(speedBand("walk", speed, 30), "normal");
  assert.equal(speedBand("walk", speed, 45), "dash");
  assert.equal(speedBand("walk", speed, 65), "over");
  assert.equal(speedBand("fly", { walk: 30, fly: 60 }, 60), "normal");
});
