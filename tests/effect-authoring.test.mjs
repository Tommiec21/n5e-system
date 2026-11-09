import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Handlebars from "handlebars";
import { effectFieldCatalog, validateEffectChanges, validateConditionalRules, editorFlags, portableEffect, importEffect, effectPreview } from "../module/rules/effect-authoring.mjs";

const catalog = effectFieldCatalog({ abilities: { str: { label: "Strength" } }, skills: { ste: { label: "Stealth" } } });
const row = (key = "n5e.dr", value = "2", mode = 2) => ({ key, value, mode });

test("effect catalog describes actual custom/core types and supported modes", () => {
  assert.equal(catalog.find(f => f.key === "n5e.unarmed.dice").type, "dice");
  assert.deepEqual(catalog.find(f => f.key === "n5e.dr").modes, [0, 2]);
  assert.ok(catalog.find(f => f.key === "system.bonuses.ac").modes.includes(5));
  assert.equal(catalog.find(f => f.key === "n5e.mastery.skill.ste").type, "text");
});

test("typed changes reject invalid formulas, modes, paths and adjustment divisions", () => {
  for ( const change of [row("n5e.dr", "@level + 2"), row("n5e.dr", "2", 5), row("n5e.unarmed.dice", "1d8 + 2"),
    row("n5e.cost.all", "/0"), row("system.__proto__.x", "1"), row("unknown.field", "1"), null] ) {
    assert.ok(validateEffectChanges([change], [], catalog).errors.length);
  }
  for ( const change of [row(), row("n5e.cost.all", "*0.5"), row("n5e.cost.all", "-2"), row("n5e.unarmed.dice", "2d8")] ) {
    assert.deepEqual(validateEffectChanges([change], [], catalog).errors, []);
  }
});

test("unchanged legacy rows survive editing; modified unsupported rows do not", () => {
  const legacy = row("legacy.module.stat", "old", 5);
  const report = validateEffectChanges([{ ...legacy, priority: null }, row()], [legacy], catalog);
  assert.deepEqual(report.errors, []); assert.equal(report.warnings.length, 1);
  assert.equal(validateEffectChanges([{ ...legacy, value: "new" }], [legacy], catalog).errors.length, 1);
});

test("conditional rules use bounded existing predicate grammar without executable fields", () => {
  const rules = [{ key: "modifier", selector: "attack", value: 2, predicate: { all: ["self:status:prone"], not: ["target:state:hidden"] } }];
  assert.equal(validateConditionalRules(rules), rules);
  assert.throws(() => validateConditionalRules([{ ...rules[0], script: "run()" }]), /Unsupported/);
  assert.throws(() => validateConditionalRules([{ ...rules[0], value: "@level" }]), /numeric/);
  assert.throws(() => validateConditionalRules([{ ...rules[0], predicate: { javascript: [] } }]), /only/);
});

test("flag patches preserve unknown legacy data and validate levels/source timing", () => {
  const original = { unknown: { preserve: true }, levels: { min: 2, max: 5, metadata: "retain" }, rules: [] };
  const input = { min: "2", max: "5", rules: "[]" };
  assert.deepEqual(editorFlags(input, original), {});
  assert.equal(editorFlags({ ...input, min: "3" }, original).levels.metadata, "retain");
  assert.throws(() => editorFlags({ ...input, min: 6 }, original), /levels/);
  assert.throws(() => editorFlags({ ...input, expires: "turnEnd" }, original), /source actor/);
  assert.equal(editorFlags({ ...input, expires: "turnEnd", sourceUuid: "Actor.abc" }, original).expires.at, "turnEnd");
  assert.equal(original.unknown.preserve, true);
});

test("portable effects strip IDs and executable foreign flags, import disabled and never mutate source", () => {
  const source = { _id: "existing", name: "Armor", changes: [row()], disabled: false,
    flags: { dae: { macro: "foreign" }, n5e: { levels: { min: 1 }, macro: "foreign", expires: { sourceUuid: "Actor.old" } } } };
  const packet = portableEffect(source), imported = importEffect(JSON.stringify(packet), catalog);
  assert.equal(imported._id, undefined); assert.equal(imported.disabled, true);
  assert.equal(imported.flags.dae, undefined); assert.equal(imported.flags.n5e.macro, undefined);
  assert.equal(imported.flags.n5e.expires, undefined); assert.equal(source.disabled, false);
  assert.equal(source.flags.dae.macro, "foreign");
  assert.throws(() => importEffect('{"format":"n5e-effect","version":1,"effect":{"name":"X","system":{"__proto__":{}}}}', catalog), /Unsafe/);
});

test("field preview distinguishes stored core fields from effect-only N5e contributions", () => {
  const preview = effectPreview({ changes: [row()] }, { changes: [row("n5e.dr", "4"), row("system.bonuses.ac", "1")] }, { _source: { system: { bonuses: { ac: 3 } } } });
  assert.equal(preview.modifiersBefore.dr, 2); assert.equal(preview.modifiersAfter.dr, 4);
  assert.equal(preview.core[0].before, 3); assert.equal(preview.core[0].after, 4);
});

test("editor change actions are draft-only, preserve legacy data and reject stale saves", async () => {
  let writes = 0;
  const source = { _id: "effect", _stats: { modifiedTime: 1 }, name: "Original", changes: [row()], flags: { foreign: { retained: true } } };
  const merge = (base, patch) => {
    const result = structuredClone(base);
    for ( const [key, value] of Object.entries(patch) ) result[key] = value && typeof value === "object" && !Array.isArray(value)
      ? merge(result[key] ?? {}, value) : structuredClone(value);
    return result;
  };
  class Base {
    static PARTS = {};
    constructor({ document }) { this.document = document; this.isEditable = true; this.form = { values: { name: "Draft name", changes: { 0: row() } } }; }
    async _prepareContext() { return {}; }
    _processFormData(event, form, formData) { return structuredClone(formData.object); }
    render() {}
  }
  globalThis.foundry = { applications: { sheets: { ActiveEffectConfig: Base }, ux: { FormDataExtended: class { constructor(form) { this.object = form.values; } } } }, utils: { mergeObject: merge } };
  globalThis.CONFIG = { N5E: {} };
  const { default: Editor } = await import("../module/applications/effect/effect-config.mjs");
  const document = { _source: source, _stats: { modifiedTime: 1 }, toObject: () => structuredClone(source), update: () => { writes++; } };
  const editor = new Editor({ document });
  await editor._prepareContext({}); editor.editDraft("add");
  const context = await editor._prepareContext({});
  assert.equal(context.source.changes.length, 2); assert.equal(writes, 0); assert.equal(source.changes.length, 1);
  const update = editor._processFormData(null, editor.form, { object: editor.form.values });
  assert.equal(update.name, "Draft name"); assert.equal(update.flags.foreign.retained, true);
  assert.equal(update._id, undefined); assert.equal(update._stats, undefined);
  document._stats.modifiedTime = 2;
  assert.throws(() => editor._prepareSubmitData(null, editor.form, { object: editor.form.values }), /changed elsewhere/);
  assert.equal(writes, 0);
});

test("expanded editor template compiles", () => {
  assert.ok(Handlebars.precompile(fs.readFileSync(new URL("../templates/effect/changes.hbs", import.meta.url), "utf8")));
});
