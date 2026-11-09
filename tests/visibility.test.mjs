import { test } from "node:test";
import assert from "node:assert/strict";
import { observerVisibility, damageSourceVisibility } from "../module/canvas/visibility.mjs";
import { uncannyDodgeOffer } from "../module/rules/uncanny-dodge.mjs";
import { damagePlan } from "../module/rules/damage.mjs";

function fixture(mode = "basicSight") {
  const actor = { uuid: "Actor.defender", statuses: new Set(), effects: [] };
  const observer = { actor, document: { uuid: "Scene.s.Token.a", parent: { id: "s" }, elevation: 0, sight: { enabled: true }, detectionModes: [{ id: mode, enabled: true, range: 30 }] } };
  observer.vision = { object: observer, los: {} };
  const target = { actor: { uuid: "Actor.attacker", statuses: new Set(), effects: [] }, center: { x: 10, y: 0 }, document: { parent: { id: "s" }, elevation: 0 } };
  let called = 0, sees = true;
  const options = { canvasState: { ready: true, scene: { id: "s" } }, config: { Canvas: { detectionModes: {
    [mode]: { testVisibility: (source, data, config) => { called++; assert.equal(source, observer.vision); assert.equal(config.object, target); return sees; } }
  } } } };
  return { observer, target, options, calls: () => called, visible: value => { sees = value; } };
}

test("visibility uses exactly the observer's mode, including its range/walls result", () => {
  const f = fixture();
  assert.equal(observerVisibility(f.observer, f.target, f.options).visible, true);
  f.visible(false); assert.equal(observerVisibility(f.observer, f.target, f.options).visible, false);
  assert.equal(f.calls(), 2);
  f.target.document.elevation = 10; assert.equal(observerVisibility(f.observer, f.target, f.options).visible, null);
});
test("token-size sampling matches Foundry's nine-point tolerance without using global GM vision", () => {
  const f = fixture(); f.target.document.getSize = () => ({ width: 100, height: 100 });
  f.options.config.Canvas.detectionModes.basicSight.testVisibility = (source, mode, config) => {
    assert.equal(config.tests.length, 9);
    return config.tests.some(t => t.point.x === 35 && t.point.y === 25);
  };
  assert.equal(observerVisibility(f.observer, f.target, f.options).visible, true);
});
test("Blindsight satisfies can-see while blinded; Chakra Sensing and Tremor Sense do not", () => {
  const f = fixture("senseAll"); f.observer.actor.statuses.add("blinded");
  assert.equal(observerVisibility(f.observer, f.target, f.options).visible, true);
  for ( const mode of ["chakraSensing", "feelTremor"] ) {
    const g = fixture(mode); assert.equal(observerVisibility(g.observer, g.target, g.options).visible, false); assert.equal(g.calls(), 0);
  }
  const g = fixture(); g.observer.actor.statuses.add("blinded"); assert.equal(observerVisibility(g.observer, g.target, g.options).visible, false);
});
test("missing source, relational stealth, hidden tokens and backend failures remain unresolved", () => {
  const f = fixture(); f.observer.vision = null; assert.equal(observerVisibility(f.observer, f.target, f.options).visible, null);
  const g = fixture(); g.target.actor.effects.push({ system: { key: "hidden", target: "Actor.defender" } });
  assert.equal(observerVisibility(g.observer, g.target, g.options).visible, null);
  const h = fixture(); h.options.config.Canvas.detectionModes.basicSight.testVisibility = () => { throw new Error("provider missing"); };
  assert.equal(observerVisibility(h.observer, h.target, h.options).visible, null);
});
test("Dodge requires verified visibility and one reaction; half/double sources are deduplicated globally", () => {
  const actor = { flags: {}, statuses: new Set(), items: [{ id: "dodge", system: { identifier: "uncanny-dodge" } }],
    system: { dr: 4, hp: { value: 30, temp: 0, max: 30 }, cp: { value: 10, temp: 0 }, traits: { resist: new Set(["fire"]), vuln: new Set(["fire"]) } } };
  const context = { combat: true, instances: [{ amount: 20, type: "fire" }] };
  assert.throws(() => uncannyDodgeOffer(actor, { ...context, visibility: { visible: null, reason: "missing" } }), /unresolved/);
  assert.equal(uncannyDodgeOffer(actor, { ...context, visibility: { visible: false } }), null);
  assert.equal(uncannyDodgeOffer(actor, { ...context, visibility: { visible: true } }).multiplier, 0.5);
  assert.equal(damagePlan(actor, context.instances, { reactionMultiplier: 0.5 }).health, 16);
  actor.system.traits.vuln.clear(); assert.equal(damagePlan(actor, context.instances, { reactionMultiplier: 0.5, multiplier: 0.5 }).health, 8);
  globalThis.canvas = { ready: false }; assert.equal(damageSourceVisibility(actor, {}).visible, null);
});
