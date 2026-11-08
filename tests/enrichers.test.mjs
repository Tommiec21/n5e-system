/**
 * Shortcuts in text (0.9.1): [[/save]], [[/check]], [[/damage]], [[/heal]], @Condition[], @State[].
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import N5E from "../module/config/index.mjs";
import { parseRollLink, parseConditionLink, splitArgs, parseInflicts } from "../module/rules/enrichers.mjs";

const ctx = {
  abilities: N5E.abilities, skills: N5E.skills, toolkits: N5E.toolkits, damageTypes: N5E.damageTypes,
  conditions: N5E.conditions, states: N5E.states, disciplines: N5E.disciplines, conditionText: N5E.conditionText,
  dcFor: d => ({ nin: 14, tai: 13, gen: 15 })[d] ?? null
};

test("arguments split into words and key=value options", () => {
  assert.deepEqual(splitArgs("dex dc=15 inflict=prone"), { words: ["dex"], opts: { dc: "15", inflict: "prone" } });
  assert.deepEqual(parseInflicts("staggered,bleed:2,nonsense", ctx).map(i => [i.key, i.kind, i.ranks]),
    [["staggered", "condition", 1], ["bleed", "condition", 2]]);
});

test("saves: fixed DC, the source's discipline DC, no DC, inflicts", () => {
  const a = parseRollLink("save", "dex dc=15", ctx);
  assert.deepEqual([a.ability, a.dc, a.label], ["dex", 15, "Dex save DC 15"]);
  const g = parseRollLink("save", "Wisdom dc=gen", ctx);
  assert.deepEqual([g.ability, g.dc, g.dcSource], ["wis", 15, "gen"]);
  const none = parseRollLink("save", "con", { ...ctx, dcFor: () => null });
  assert.equal(none.dc, null);
  const unresolved = parseRollLink("save", "con dc=nin", { ...ctx, dcFor: () => null });
  assert.equal(unresolved.label, "Con save (Ninjutsu DC)");
  assert.equal(parseRollLink("save", "con dc=15 inflict=prone", ctx).inflicts[0].kind, "state");
  assert.equal(parseRollLink("save", "luck", ctx), null);
});

test("checks: skill by key or name, toolkit, ability", () => {
  assert.deepEqual(parseRollLink("check", "prc dc=12", ctx), { kind: "check", type: "skill", key: "prc", dc: 12, label: "Perception DC 12" });
  assert.equal(parseRollLink("check", "Animal Handling", ctx).key, "ani");
  const t = parseRollLink("check", "tool=alchemist", ctx);
  assert.deepEqual([t.type, t.key], ["tool", "alchemist"]);
  const ab = parseRollLink("check", "str dc=10", ctx);
  assert.deepEqual([ab.type, ab.key, ab.label], ["ability", "str", "Strength check DC 10"]);
});

test("damage and healing", () => {
  const d = parseRollLink("damage", "2d6 fire, 1d8 + 3 slashing, 4", ctx);
  assert.deepEqual(d.parts, [{ formula: "2d6", type: "fire" }, { formula: "1d8 + 3", type: "slashing" }, { formula: "4", type: "" }]);
  assert.equal(d.label, "2d6 Fire + 1d8 + 3 Slashing + 4");
  assert.deepEqual(parseRollLink("heal", "2d8 + 3", ctx), { kind: "heal", formula: "2d8 + 3", pool: "hp", label: "2d8 + 3 HP" });
  assert.equal(parseRollLink("heal", "5 temp", ctx).pool, "tempHp");
  assert.equal(parseRollLink("heal", "1d6 cp", ctx).pool, "cp");
});

test("condition and State links carry their rules text", () => {
  const b = parseConditionLink("Condition", "bleed 2", ctx);
  assert.deepEqual([b.key, b.kind, b.ranks, b.label], ["bleed", "condition", 2, "Bleed 2"]);
  assert.match(b.text, /necrotic/);
  const p = parseConditionLink("State", "Prone", ctx);
  assert.equal(p.kind, "state");
  assert.equal(parseConditionLink("Condition", "prone", ctx).kind, "state", "a State named in @Condition still works");
  assert.equal(parseConditionLink("Condition", "Compelled: Charmed", ctx).key, "charmed");
  assert.equal(parseConditionLink("Condition", "nothing", ctx), null);
  for ( const k of [...Object.keys(N5E.conditions), ...Object.keys(N5E.states)] ) assert.ok(N5E.conditionText[k], `rules text for ${k}`);
});
