/** Class & Clan limits (King 2026-11-21): when each class, subclass and clan limit comes back. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { POOL_RECOVERY, AMP_RECOVERY, applyPoolOverride, ampPer, recoveryText, limitSections, poolLimitKey, ampLimitKey } from "../module/rules/recovery-overrides.mjs";
import { restPlan } from "../module/rules/rest.mjs";

const skilled = { id: "skilledExploits", label: "Skilled Exploits", max: "1 + @prof", recovery: [{ on: "lr", amount: "all", formula: "", requires: "" }] };

test("the menu's choices: rests, half on a Short Rest and all on a Long Rest, 10 minutes, initiative and more", () => {
  for ( const k of ["sr", "lr", "halfSrFullLr", "fr", "rest10m", "initiative", "day", "turn", "round", "never"] ) assert.ok(POOL_RECOVERY[k], k);
  assert.deepEqual(POOL_RECOVERY.halfSrFullLr.recovery, [{ on: "sr", amount: "half" }, { on: "lr", amount: "all" }]);
  assert.deepEqual(POOL_RECOVERY.initiative.recovery.map(r => r.on), ["encounter"]);
  assert.deepEqual(Object.keys(AMP_RECOVERY), ["rest10m", "sr", "lr", "fr", "day"]);
});

test("a pool's recovery is replaced only when the GM chose something", () => {
  const key = poolLimitKey("hunters-exploits", "skilledExploits");
  assert.equal(key, "hunters-exploits.skilledExploits");
  assert.equal(applyPoolOverride(skilled, "hunters-exploits", {}), skilled);
  assert.equal(applyPoolOverride(skilled, "hunters-exploits", { [key]: "bogus" }), skilled);
  const sr = applyPoolOverride(skilled, "hunters-exploits", { [key]: "sr" });
  assert.deepEqual(sr.recovery.map(r => [r.on, r.amount]), [["sr", "all"]]);
  assert.equal(sr.max, "1 + @prof", "only when it comes back changes");
  assert.equal(applyPoolOverride(skilled, "other-feature", { [key]: "sr" }), skilled, "keyed by the owning feature");
});

test("the replaced recovery works on rests: half on a Short Rest, all on a Long Rest", () => {
  const pool = applyPoolOverride({ ...skilled, value: 0, maxValue: 6 }, "hunters-exploits", { "hunters-exploits.skilledExploits": "halfSrFullLr" });
  const actor = { system: { resources: { skilledExploits: { ...pool, value: 0, maxValue: 6 } }, hp: { value: 10, max: 10 }, cp: { value: 5, max: 5 },
    hitDice: { value: 1, max: 1, die: "d8" }, chakraDice: { value: 1, max: 1, die: "d8" }, abilities: { con: { mod: 0 } }, level: 1 }, items: [], effects: [], flags: {} };
  const short = restPlan(actor, "short");
  const long = restPlan(actor, "long");
  assert.equal(short.update["system.resources.skilledExploits.value"], 3);
  assert.equal(long.update["system.resources.skilledExploits.value"], 6);
});

test("Amp uses: the GM's period or the written one", () => {
  assert.equal(ampPer("battle-trance", "lr", {}), "lr");
  assert.equal(ampPer("battle-trance", "lr", { [ampLimitKey("battle-trance")]: "sr" }), "sr");
  assert.equal(ampPer("battle-trance", "lr", { [ampLimitKey("battle-trance")]: "initiative" }), "lr", "Amp uses only come back on rests");
});

test("how a written recovery reads", () => {
  assert.equal(recoveryText(skilled.recovery), "Long Rest");
  assert.equal(recoveryText([{ on: "sr", amount: "half" }, { on: "lr", amount: "all" }]), "Half on a Short Rest, all on a Long Rest");
  assert.equal(recoveryText([]), "Never (only by its feature)");
  assert.equal(recoveryText([{ on: "event", amount: "all" }]), "By its feature");
});

test("sections: classes (own features first, then subclasses), then clans, alphabetical", () => {
  const row = (kind, name, sub, feature) => ({ group: { kind, name, sub }, feature, key: feature });
  const out = limitSections([row("clan", "Uchiha", "", "Sharingan"), row("class", "Hunter-Nin", "Undertaker", "Carnage"),
    row("class", "Hunter-Nin", "", "Hunters Exploits"), row("class", "Hunter-Nin", "Necrotic Hand", "Decaying Compound"), row("class", "Genjutsu Specialist", "", "Actualization")]);
  assert.deepEqual(out.map(g => [g.kind, g.label]), [["class", "Genjutsu Specialist"], ["class", "Hunter-Nin"], ["clan", "Uchiha"]]);
  assert.deepEqual(out[1].sections.map(s => [s.label, s.sub]), [["Hunter-Nin", false], ["Necrotic Hand", true], ["Undertaker", true]]);
  assert.deepEqual(out.map(g => g.heading), ["Classes", "Classes", "Clans"]);
});
