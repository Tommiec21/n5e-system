/**
 * Phase 1 placeholder sheets (ApplicationV2). They exist to show that every number on a character is
 * right and every piece of content has a home; the dnd5e-based sheets replace them in Phase 2.
 */
import { buildRows, coerceListInputs } from "./schema-form.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;

const ROWS_PARTIAL = "systems/n5e/templates/parts/field-rows.hbs";
export const TEMPLATE_PATHS = [ROWS_PARTIAL];

/** Decorate rows with booleans so templates need no comparison helpers. */
function decorate(rows) {
  return rows.map(r => ({
    ...r,
    isHeading: r.kind === "heading", isText: r.kind === "text" || r.kind === "list", isNumber: r.kind === "number",
    isCheckbox: r.kind === "checkbox", isSelect: r.kind === "select", isHtml: r.kind === "html",
    isJson: r.kind === "json",
    options: r.choices ? Object.entries(r.choices).map(([value, label]) => ({
      value, label: typeof label === "object" ? (label.label ?? value) : label, selected: value === r.value
    })) : null,
    indent: r.depth * 12
  }));
}

/** Open a file picker for the document image (works on both sheets). */
async function editImage(event, target) {
  const FilePicker = foundry.applications.apps.FilePicker.implementation;
  const fp = new FilePicker({
    type: "image",
    current: this.document.img,
    callback: path => this.document.update({ img: path })
  });
  return fp.browse();
}

/* -------------------------------------------- */
/*  Actor                                       */
/* -------------------------------------------- */

export class N5eActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "sheet", "actor", "placeholder"],
    position: { width: 760, height: 820 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editItem: N5eActorSheet.#onEditItem,
      deleteItem: N5eActorSheet.#onDeleteItem,
      deleteEffect: N5eActorSheet.#onDeleteEffect,
      toggleEffect: N5eActorSheet.#onToggleEffect,
      changeRanks: N5eActorSheet.#onChangeRanks,
      editImage
    }
  };

  static PARTS = {
    sheet: { template: "systems/n5e/templates/actor/placeholder.hbs", scrollable: [".n5e-body"] }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.document;
    const sys = actor.system;
    const N5E = CONFIG.N5E;
    context.actor = actor;
    context.sys = sys;
    context.abilities = Object.entries(N5E.abilities).map(([key, cfg]) => ({
      key, label: cfg.abbr, value: actor._source.system.abilities[key].value, mod: sys.abilities[key].mod,
      save: sys.saves[key].total, saveProficient: actor._source.system.saves[key].proficient,
      saveGranted: sys.saves[key].isProficient && !actor._source.system.saves[key].proficient
    }));
    context.skills = Object.entries(N5E.skills).map(([key, cfg]) => ({
      key, label: cfg.label, ability: sys.skills[key].ability, total: sys.skills[key].total,
      passive: sys.skills[key].passive, proficient: actor._source.system.skills[key].proficient,
      granted: sys.skills[key].isProficient && !actor._source.system.skills[key].proficient,
      mastery: sys.skills[key].mastery
    }));
    context.disciplines = N5E.castingDisciplines.map(key => ({
      key, label: N5E.disciplines[key].label, ability: sys.disciplines[key].ability,
      attack: sys.disciplines[key].attack, dc: sys.disciplines[key].dc
    }));
    context.mastery = Object.entries(sys.masteryMap ?? {}).map(([target, m]) => ({
      target, rank: m.rank, bonus: m.bonus, sources: m.sources.join(", "), capped: m.uncapped > m.rank
    }));
    context.resources = Object.entries(sys.resources ?? {}).map(([id, p]) => ({ id, label: p.label || id,
      value: p.value, max: p.maxValue }));
    const groups = {};
    for ( const item of actor.items ) {
      (groups[item.type] ??= []).push({
        id: item.id, name: item.name, img: item.img, type: item.type,
        rank: item.system.rank, live: item.system.live ?? null, equipped: item.system.equipped,
        levels: item.system.levels, review: item.getFlag("n5e", "review")
      });
    }
    context.itemGroups = Object.entries(groups).map(([type, items]) => ({
      type, label: game.i18n.localize(CONFIG.Item.typeLabels?.[type] ?? type), items
    }));
    context.effects = actor.effects.map(e => ({
      id: e.id, name: e.name, img: e.img, type: e.type, disabled: e.disabled,
      ranks: e.type === "condition" ? e.system.ranks : null,
      maxRanks: e.type === "condition" ? e.system.maxRanks : null
    }));
    context.conditionPenalties = sys.conditionPenalties;
    this._rows = buildRows(actor.system.schema, actor._source.system,
      { skip: new Set(["abilities", "saves", "skills"]) });
    context.rows = decorate(this._rows);
    context.isNPC = actor.type === "npc";
    return context;
  }

  /** @override */
  _processFormData(event, form, formData) {
    const flat = formData.object;
    coerceListInputs(flat, this._rows ?? []);
    return foundry.utils.expandObject(flat);
  }

  static #item(target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    return this.document.items.get(id);
  }

  static async #onEditItem(event, target) {
    N5eActorSheet.#item.call(this, target)?.sheet.render(true);
  }

  static async #onDeleteItem(event, target) {
    await N5eActorSheet.#item.call(this, target)?.deleteDialog();
  }

  static async #onDeleteEffect(event, target) {
    const id = target.closest("[data-effect-id]")?.dataset.effectId;
    await this.document.effects.get(id)?.delete();
  }

  static async #onToggleEffect(event, target) {
    const id = target.closest("[data-effect-id]")?.dataset.effectId;
    const effect = this.document.effects.get(id);
    await effect?.update({ disabled: !effect.disabled });
  }

  static async #onChangeRanks(event, target) {
    const id = target.closest("[data-effect-id]")?.dataset.effectId;
    const effect = this.document.effects.get(id);
    if ( !effect ) return;
    const delta = Number(target.dataset.delta) || 0;
    const max = effect.system.maxRanks ?? 1;
    const ranks = Math.max(0, Math.min(max, effect.system.ranks + delta));
    if ( ranks === 0 ) await effect.delete();
    else await effect.update({ "system.ranks": ranks });
  }
}

/* -------------------------------------------- */
/*  Item                                        */
/* -------------------------------------------- */

export class N5eItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "sheet", "item", "placeholder"],
    position: { width: 620, height: 720 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: { editImage }
  };

  static PARTS = {
    sheet: { template: "systems/n5e/templates/item/placeholder.hbs", scrollable: [".n5e-body"] }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    context.item = item;
    context.typeLabel = game.i18n.localize(CONFIG.Item.typeLabels?.[item.type] ?? item.type);
    context.live = item.system.live ?? null;
    context.review = item.getFlag("n5e", "review");
    context.legacyType = item.getFlag("n5e", "legacyType");
    this._rows = buildRows(item.system.schema, item._source.system);
    context.rows = decorate(this._rows);
    return context;
  }

  /** @override */
  _processFormData(event, form, formData) {
    const flat = formData.object;
    coerceListInputs(flat, this._rows ?? []);
    return foundry.utils.expandObject(flat);
  }
}
