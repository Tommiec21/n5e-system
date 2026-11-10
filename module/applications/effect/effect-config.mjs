/** Expanded authoring on Foundry's supported effect sheet. All editing is draft-only until Save. */
import { effectFieldCatalog, validateEffectChanges, editorFlags, EFFECT_PRESETS, effectPreview, portableEffect, importEffect } from "../../rules/effect-authoring.mjs";

const Base = foundry.applications.sheets.ActiveEffectConfig;
export default class EffectConfig extends Base {
  static DEFAULT_OPTIONS = {
    classes: ["n5e-effect-config"], position: { width: 860, height: 760 }, window: { resizable: true },
    actions: {
      approveMacros: async function() { try { await (await import("../../automation/effect-services.mjs")).approveEffectMacros(this.document); } catch (error) { this.notice(error.message); } },
      addChange: function() { this.editDraft("add"); }, deleteChange: function(event, target) { this.editDraft("delete", Number(target.closest("[data-index]").dataset.index)); },
      addField: function() { this.editDraft("field"); }, preset: function() { this.editDraft("preset"); },
      exportEffect: function() { this.exportDraft(); }, importEffect: function() { this.importDraft(); },
      duplicateEffect: function() { this.duplicateDraft(); }
    }
  };
  static PARTS = { ...Base.PARTS, changes: { template: "systems/n5e/templates/effect/changes.hbs", scrollable: [""] } };
  #draft = null;
  #revision;
  get catalog() { return effectFieldCatalog(CONFIG.N5E); }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    if ( !this.#draft ) { this.#draft = this.document.toObject(); this.#revision = this.document._stats?.modifiedTime; }
    context.source = structuredClone(this.#draft);
    context.buttons = [{ type: "submit", icon: "fa-solid fa-floppy-disk", label: "Save effect" }];
    return context;
  }
  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    if ( partId !== "changes" ) return context;
    const flags = this.#draft.flags?.n5e ?? {};
    return Object.assign(context, { catalog: this.catalog, presets: EFFECT_PRESETS, canApproveMacros: !!globalThis.game?.user?.isGM, expirationChoices: { "": "None", turnStart: "Start of source turn", turnEnd: "End of source turn", nextTurnEnd: "End of next source turn" },
      guidance: { min: flags.levels?.min ?? 0, max: flags.levels?.max ?? 0, stance: flags.requiresStance ?? "",
        exclusive: flags.exclusive ?? "", state: flags.state ?? "", expires: flags.expires?.at ?? "", sourceUuid: flags.expires?.sourceUuid ?? "",
        rules: JSON.stringify(flags.rules ?? [], null, 2), services: JSON.stringify(flags.services ?? {}, null, 2) },
      raw: JSON.stringify(this.#draft, null, 2), timing: JSON.stringify({ origin: this.#draft.origin ?? null,
        disabled: this.#draft.disabled, transfer: this.#draft.transfer, configuredDuration: this.#draft.duration ?? {},
        sourceTurn: flags.expires ?? null, currentCoreDuration: this.document.duration ?? null }, null, 2),
      suppression: this.document.isSuppressed ? "Currently suppressed" : this.document.disabled ? "Currently disabled" : "Currently enabled; transfer and parent availability still apply" });
  }

  readDraft(formData) {
    const data = super._processFormData(null, this.form, formData);
    const guidance = data.n5eEditor;
    delete data.n5eEditor;
    if ( data.changes ) data.changes = Object.values(data.changes).map((row, i) => ({ ...this.#draft.changes?.[i], ...row }));
    else data.changes = [];
    const next = foundry.utils.mergeObject(structuredClone(this.#draft), data, { inplace: false });
    if ( guidance ) {
      const patch = editorFlags(guidance, this.#draft.flags?.n5e);
      if ( patch.services && JSON.stringify(patch.services.macros) !== JSON.stringify(this.#draft.flags?.n5e?.services?.macros ?? []) && !globalThis.game?.user?.isGM ) throw new Error("Only a GM may author Macro bindings.");
      if ( patch.expires && !patch.expires.placed ) patch.expires.placed = game.combat?.started ? { round: game.combat.round, turn: game.combat.turn } : null;
      next.flags ??= {}; next.flags.n5e = { ...next.flags.n5e, ...patch };
    }
    return next;
  }
  capture() { this.#draft = this.readDraft(new foundry.applications.ux.FormDataExtended(this.form)); return this.#draft; }
  check(draft) {
    const report = validateEffectChanges(draft.changes ?? [], this.document._source.changes ?? [], this.catalog);
    if ( report.errors.length ) throw new Error(report.errors.join(" "));
    return report;
  }
  _processFormData(event, form, formData) { const draft = this.readDraft(formData); this.check(draft); delete draft._id; delete draft._stats; return draft; }
  _prepareSubmitData(event, form, formData, updateData) {
    if ( this.#revision !== this.document._stats?.modifiedTime ) throw new Error("This effect changed elsewhere. Keep/export your draft, then reopen the effect before saving.");
    const data = super._prepareSubmitData(event, form, formData, updateData);
    this.check(data);
    return data;
  }
  editDraft(action, index) {
    try {
      if ( !this.isEditable ) return;
      this.capture();
      if ( action === "delete" ) this.#draft.changes.splice(index, 1);
      else if ( action === "preset" ) {
        const id = this.element.querySelector("[data-preset]").value;
        this.#draft.changes.push(...structuredClone(EFFECT_PRESETS.find(p => p.id === id)?.changes ?? []));
      } else {
        const key = action === "field" ? this.element.querySelector("[data-field-picker]").value : "";
        const field = this.catalog.find(c => c.key === key);
        if ( action === "field" && !field ) throw new Error("Choose a supported field from the browser.");
        this.#draft.changes.push({ key, mode: 2, value: field?.type === "ability" ? "wis" : field?.type === "dice" ? "1d8" : field?.type === "text" ? this.#draft.name : "1", priority: 20 });
      }
      this.render();
    } catch (error) { this.notice(error.message); }
  }
  notice(message) { const box = this.element.querySelector("[data-editor-status]"); if ( box ) box.textContent = message; else ui.notifications.warn(message); }
  exportDraft() {
    try { this.capture(); globalThis.saveDataToFile(JSON.stringify(portableEffect(this.#draft), null, 2), "application/json", "n5e-effect.json"); }
    catch (error) { this.notice(error.message); }
  }
  async importDraft() {
    try {
      if ( !this.isEditable ) return;
      const text = await foundry.applications.api.DialogV2.prompt({ window: { title: "Import N5e effect draft" },
        content: '<p>Paste an N5e effect export. Imported fields remain a disabled draft until Save. Foreign script flags and IDs are excluded.</p><textarea name="json" rows="12" aria-label="N5e effect JSON"></textarea>',
        ok: { label: "Load draft", callback: (event, button) => button.form.elements.json.value }, rejectClose: false });
      if ( text == null ) return;
      this.capture();
      const imported = importEffect(text, this.catalog);
      this.#draft = foundry.utils.mergeObject(this.#draft, imported, { inplace: false });
      this.render();
    } catch (error) { this.notice(error.message); }
  }
  async duplicateDraft() {
    try {
      if ( !this.isEditable ) return;
      this.capture(); this.check(this.#draft);
      const data = importEffect(JSON.stringify(portableEffect(this.#draft)), this.catalog);
      data.name += " (copy)";
      if ( !await foundry.applications.api.DialogV2.confirm({ window: { title: "Create disabled copy" }, content: "<p>Create this effect as a disabled copy on the same parent? The original is unchanged.</p>", rejectClose: false }) ) return;
      await this.document.parent.createEmbeddedDocuments("ActiveEffect", [data]);
      this.notice("Created a disabled copy. The original draft has not been saved.");
    } catch (error) { this.notice(error.message); }
  }
  async _onRender(context, options) {
    await super._onRender(context, options);
    const picker = this.element.querySelector("[data-field-picker]");
    this.element.querySelector("[data-field-search]")?.addEventListener("input", event => {
      const query = event.target.value.toLowerCase();
      for ( const option of picker.options ) option.hidden = !option.textContent.toLowerCase().includes(query);
      const first = [...picker.options].find(o => !o.hidden); if ( first ) picker.value = first.value;
    });
    const update = () => {
      try {
        const draft = this.readDraft(new foundry.applications.ux.FormDataExtended(this.form));
        const report = validateEffectChanges(draft.changes, this.document._source.changes ?? [], this.catalog);
        this.notice([...report.errors, ...report.warnings].join(" ") || "Draft valid. Save effect to apply changes.");
        const raw = this.element.querySelector("[data-raw]"); if ( raw ) raw.value = JSON.stringify(draft, null, 2);
        const preview = this.element.querySelector("[data-preview]");
        if ( preview ) preview.textContent = JSON.stringify(effectPreview(this.document._source, draft, this.document.parent?.actor ?? this.document.parent), null, 2);
        for ( const input of this.element.querySelectorAll('[name^="changes."][name$=".key"]') ) {
          const field = this.catalog.find(f => f.key === input.value);
          input.title = field ? field.label + " · " + field.behavior : "Unsupported legacy field: preserved if unchanged";
        }
      } catch (error) { this.notice(error.message); }
    };
    this.element.querySelector('[data-tab="changes"]')?.addEventListener("input", update);
    update();
  }
}
