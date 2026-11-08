/**
 * N5e item sheet (all 13 item types). Layout after dnd5e and PF2e item sheets: a header with the
 * item's one-line summary, a sidebar of key facts (PF2e), and tabs for Description, Details,
 * Advancement (classes, subclasses, clans) and Effects. Details are typed fields per item type from
 * the item view model, so one template serves every type.
 */
import { itemVM } from "../../view-models/item.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const T = name => `systems/n5e/templates/item/${name}.hbs`;

export const ITEM_TEMPLATE_PATHS = ["header", "tabs", "sidebar", "description", "details", "advancement", "effects"].map(T);

export default class ItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "sheet", "item", "n5e-v2", "n5e-item"],
    position: { width: 720, height: 680 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      editImage: ItemSheet.#onEditImage,
      itemTab: ItemSheet.#onTab,
      toggleTag: ItemSheet.#onToggleTag,
      toggleProp: ItemSheet.#onToggleProp,
      createEffect: ItemSheet.#onCreateEffect,
      editEffect: ItemSheet.#onEditEffect,
      deleteEffect: ItemSheet.#onDeleteEffect,
      toggleEffect: ItemSheet.#onToggleEffect
    }
  };

  static PARTS = {
    header: { template: T("header") },
    tabs: { template: T("tabs") },
    sidebar: { template: T("sidebar") },
    description: { template: T("description"), scrollable: [""] },
    details: { template: T("details"), scrollable: [""] },
    advancement: { template: T("advancement"), scrollable: [""] },
    effects: { template: T("effects"), scrollable: [""] }
  };

  /** Current tab (kept across re-renders). */
  #tab = "description";

  /** Comma-separated list inputs to turn back into arrays on submit. */
  #listPaths = new Set();

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Hide the Advancement part for items that have none.
    const hasAdv = ["class", "subclass", "clan", "background"].includes(this.document.type)
      || (this.document.system.advancement?.length ?? 0) > 0;
    if ( !hasAdv ) options.parts = options.parts.filter(p => p !== "advancement");
  }

  /** Resolve a uuid to a name without loading the document (compendium indexes are cached). */
  static #nameOf(uuid) {
    try {
      return fromUuidSync(uuid)?.name ?? uuid.split(".").at(-1);
    } catch {
      return uuid.split(".").at(-1);
    }
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const item = this.document;
    const vm = itemVM(item, { source: item._source.system, nameOf: ItemSheet.#nameOf });
    this.#listPaths = new Set(vm.details.flatMap(s => s.fields).filter(f => f.kind === "list").map(f => f.path));
    const tabs = [
      { id: "description", label: "Description" },
      { id: "details", label: "Details" },
      ...(vm.advancement ? [{ id: "advancement", label: item.type === "class" ? "Progression" : "Advancement" }] : []),
      { id: "effects", label: "Effects" }
    ];
    if ( !tabs.some(t => t.id === this.#tab) ) this.#tab = "description";
    return Object.assign(context, {
      vm, item, editable: this.isEditable,
      typeLabel: game.i18n.localize(CONFIG.Item.typeLabels?.[item.type] ?? item.type),
      tabs: tabs.map(t => ({ ...t, active: t.id === this.#tab }))
    });
  }

  /** @override */
  async _preparePartContext(partId, context) {
    context = await super._preparePartContext(partId, context);
    context.tab = { active: partId === this.#tab, cssClass: partId === this.#tab ? "active" : "" };
    if ( partId === "description" ) {
      const TextEditor = foundry.applications.ux.TextEditor.implementation;
      context.blocks = await Promise.all(context.vm.htmlFields.map(async f => ({
        ...f,
        enriched: await TextEditor.enrichHTML(f.html, { relativeTo: this.document, rollData: this.document.getRollData?.() ?? {}, secrets: this.document.isOwner }),
        empty: !f.html
      })));
      context.blocks = context.blocks.filter(b => b.main || !b.empty || b.relevant);
    }
    return context;
  }

  /** @override */
  _processFormData(event, form, formData) {
    const flat = formData.object;
    for ( const path of this.#listPaths ) {
      if ( path in flat ) flat[path] = String(flat[path] ?? "").split(",").map(s => s.trim()).filter(Boolean);
    }
    return foundry.utils.expandObject(flat);
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #onTab(event, target) {
    this.#tab = target.dataset.tab;
    for ( const el of this.element.querySelectorAll(".n5e-item-tab") ) el.classList.toggle("active", el.dataset.tab === this.#tab);
    for ( const el of this.element.querySelectorAll("[data-action='itemTab']") ) el.classList.toggle("active", el.dataset.tab === this.#tab);
  }

  /** Click the header image: Foundry's file picker, saving the chosen path to the item's img. */
  static async #onEditImage() {
    if ( !this.isEditable ) return null;
    const FilePicker = foundry.applications.apps.FilePicker.implementation;
    return new FilePicker({ type: "image", current: this.document.img,
      callback: path => this.document.update({ img: path }) }).browse();
  }

  /** Add or remove one value of a Set/Array field. */
  static async #onToggleTag(event, target) {
    const { path, value } = target.dataset;
    const current = new Set(foundry.utils.getProperty(this.document._source, path) ?? []);
    if ( current.has(value) ) current.delete(value);
    else current.add(value);
    return this.document.update({ [path]: [...current] });
  }

  /** Add or remove a weapon/armor property (key -> rank map). */
  static async #onToggleProp(event, target) {
    const { path, value } = target.dataset;
    const has = value in (foundry.utils.getProperty(this.document._source, path) ?? {});
    return this.document.update(has ? { [`${path}.-=${value}`]: null } : { [`${path}.${value}`]: 1 });
  }

  /** Effects tab: new transfer effect (applies to the owner; a stance's only while it is active). */
  static async #onCreateEffect() {
    const cls = CONFIG.ActiveEffect.documentClass;
    return cls.create({ name: `${this.document.name} effect`, img: this.document.img, type: "generic",
      transfer: true, origin: this.document.uuid }, { parent: this.document });
  }

  /** The effect a clicked row belongs to ([data-effect-id]). */
  static #effect(target) {
    return this.document.effects.get(target.closest("[data-effect-id]")?.dataset.effectId);
  }

  static async #onEditEffect(event, target) {
    return ItemSheet.#effect.call(this, target)?.sheet.render(true);
  }

  static async #onDeleteEffect(event, target) {
    return ItemSheet.#effect.call(this, target)?.deleteDialog();
  }

  static async #onToggleEffect(event, target) {
    const e = ItemSheet.#effect.call(this, target);
    return e?.update({ disabled: !e.disabled });
  }
}
