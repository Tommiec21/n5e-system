import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveEffectFormula, effectFormulaData, expirationStep, validateServiceConfig } from "../module/rules/effect-services.mjs";
import { emitEffectEvent, approveEffectMacros, registerAppearanceProvider, refreshEffectAppearances } from "../module/automation/effect-services.mjs";

test("dynamic numeric changes use N5e precedence and reject missing, unsafe and cyclic references", () => {
  assert.equal(resolveEffectFormula("=1 + @level / 2", { level: 5 }), 3);
  assert.equal(resolveEffectFormula("=@base + @source.level", { base: 2, source: { level: 4 } }), 6);
  for ( const value of ["@missing", "@constructor.x", "process.exit()", "1 / 0", "1d6", "@cycle"] ) assert.throws(() => resolveEffectFormula(value, {}));
  assert.equal(resolveEffectFormula("=@level + 1", {}, { syntaxOnly: true }), 2);
});
test("formula context is a fixed source snapshot with existing ability arithmetic", () => {
  const actor = { _source: { system: { abilities: { str: { value: 16 } } } }, system: { level: 4, prof: 2 } };
  const data = effectFormulaData(actor); assert.equal(data.abilities.str.mod, 3); assert.equal(data.level, 4);
  data.system.abilities.str.value = 1; assert.equal(actor._source.system.abilities.str.value, 16);
});
test("expiration counts distinct events and preserves unmatched state", () => {
  const config = { expiration: [{ event: "damageTaken", count: 2 }] };
  const one = expirationStep(config, {}, "damageTaken", "a"); assert.equal(one.expired, false);
  assert.equal(expirationStep(config, one.state, "damageTaken", "a").state[0].count, 1);
  assert.equal(expirationStep(config, one.state, "damageTaken", "b").expired, true);
  assert.equal(expirationStep(config, one.state, "rest", "c").expired, false);
});
test("services reject unknown events, executable payloads and invalid bindings", () => {
  for ( const config of [{ expiration: [{ event: "attackMiss" }] }, { expiration: [{ event: "apply" }] },
    { macros: [{ event: "apply", uuid: "javascript:run" }] }, { appearance: [{ provider: "unknown", options: null }] }, { script: "run()" }] ) {
    assert.throws(() => validateServiceConfig(config));
  }
});

function fixture(config) {
  let approvals = {}, executions = 0, deleted = 0;
  const warnings = [], actor = { uuid: "Actor.test", documentName: "Actor" };
  const effect = { uuid: "Actor.test.ActiveEffect.effect", parent: actor, active: true, flags: { n5e: { services: config } },
    setFlag: async (scope, key, value) => { effect.flags.n5e[key] = value; }, delete: async () => { deleted++; } };
  actor.allApplicableEffects = () => [effect];
  const macro = { uuid: "Macro.test", documentName: "Macro", type: "script", command: "return 1", ownership: {}, execute: async () => { executions++; } };
  globalThis.game = { user: { isGM: true }, users: { activeGM: { isSelf: true } }, settings: {
    get: (scope, key) => key === "effectMacroApprovals" ? approvals : true,
    set: async (scope, key, value) => { approvals = value; }
  } };
  globalThis.foundry = { applications: { api: { DialogV2: { confirm: async () => true } } } };
  globalThis.ui = { notifications: { warn: message => warnings.push(message) } };
  globalThis.fromUuid = async uuid => uuid === macro.uuid ? macro : null;
  return { actor, effect, macro, executions: () => executions, deleted: () => deleted, warnings };
}
test("world macros require explicit GM approval; duplicate events and code edits cannot replay approval", async () => {
  const f = fixture({ macros: [{ event: "apply", uuid: "Macro.test" }] });
  await emitEffectEvent(f.actor, "apply", { id: "unapproved" }); assert.equal(f.executions(), 0);
  await approveEffectMacros(f.effect);
  await emitEffectEvent(f.actor, "apply", { id: "approved" }); assert.equal(f.executions(), 1);
  await emitEffectEvent(f.actor, "apply", { id: "approved" }); assert.equal(f.executions(), 1);
  f.macro.command = "different code";
  await emitEffectEvent(f.actor, "apply", { id: "edited" }); assert.equal(f.executions(), 1);
});
test("event expiration deletes only after configured count; non-GMs cannot execute or approve", async () => {
  const f = fixture({ expiration: [{ event: "turnEnd", count: 2 }] });
  await emitEffectEvent(f.actor, "turnEnd", { id: "one" }); assert.equal(f.deleted(), 0);
  await emitEffectEvent(f.actor, "turnEnd", { id: "two" }); assert.equal(f.deleted(), 1);
  game.users.activeGM.isSelf = false; game.user.isGM = false;
  await emitEffectEvent(f.actor, "turnEnd", { id: "three" }); assert.equal(f.deleted(), 1);
  await assert.rejects(approveEffectMacros(f.effect), /active GM/);
});
test("malformed service configuration is isolated from other effects", async () => {
  const f = fixture({ expiration: [{ event: "invalid" }] });
  const good = { ...f.effect, uuid: "Actor.test.ActiveEffect.good", flags: { n5e: { services: { expiration: [{ event: "rest" }] } } },
    setFlag: async () => {}, delete: async () => { good.deleted = true; } };
  f.actor.allApplicableEffects = () => [f.effect, good];
  await emitEffectEvent(f.actor, "rest", { id: "rest" });
  assert.equal(good.deleted, true); assert.equal(f.warnings.length, 1);
});
test("appearance providers apply once and clean up only their own handles", async () => {
  const f = fixture({ appearance: [{ provider: "test-color", options: {} }] });
  let applied = 0, removed = 0;
  const unregister = registerAppearanceProvider("test-color", { apply: async () => { applied++; return "owned"; }, remove: async (token, handle) => { assert.equal(handle, "owned"); removed++; } });
  globalThis.canvas = { tokens: { placeables: [{ document: { uuid: "Scene.s.Token.t" }, actor: f.actor, mesh: {} }] } };
  await refreshEffectAppearances(); await refreshEffectAppearances(); assert.equal(applied, 1);
  f.effect.active = false; await refreshEffectAppearances(); assert.equal(removed, 1);
  unregister();
});
