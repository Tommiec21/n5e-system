/**
 * N5e item sheet (all 13 item types). Layout after dnd5e and PF2e item sheets: a header with the
 * item's one-line summary, a sidebar of key facts (PF2e), and tabs for Description, Details,
 * Advancement (classes, subclasses, clans) and Effects. Details are typed fields per item type from
 * the item view model, so one template serves every type.
 */
import { automationOf, STATUS_LABELS } from "../../rules/automation-summary.mjs";
import { itemVM } from "../../view-models/item.mjs";
import { editReaction } from "./reaction-editor.mjs";

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
      editReaction: async function() {
        try { await editReaction(this.document); }
        catch (error) { ui.notifications.warn(error.message); }
      },
      editImage: ItemSheet.#onEditImage,
      itemTab: ItemSheet.#onTab,
      toggleTag: ItemSheet.#onToggleTag,
      toggleProp: ItemSheet.#onToggleProp,
      createEffect: ItemSheet.#onCreateEffect,
      editEffect: ItemSheet.#onEditEffect,
      deleteEffect: ItemSheet.#onDeleteEffect,
      toggleEffect: ItemSheet.#onToggleEffect,
      editAmpBuff: ItemSheet.#onEditAmpBuff,
      removeUuid: ItemSheet.#onRemoveUuid
    }
  };

  static PARTS = {
    header: { template: T("header") },
    tabs: { template: T("tabs") },
    sidebar: { template: T("sidebar") },
    description: { template: T("description"), scrollable: [""] },
    details: { template: T("details"), scrollable: [""] },
    advancement: { template: T("advancement"), scrollable: [""] },
    effects: { template: T("effects"), scrollable: [""] },
    automation: { template: T("automation"), scrollable: [""] },
    notes: { template: T("notes"), scrollable: [""] }
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
      { id: "effects", label: "Effects" },
      { id: "automation", label: "Automation" },
      { id: "notes", label: "Notes" }
    ];
    if ( !tabs.some(t => t.id === this.#tab) ) this.#tab = "description";
    return Object.assign(context, {
      vm, item, editable: this.isEditable, canConfigureReaction: this.isEditable && game.user.isGM,
      auto: (({ channels, notes, status, mentions }) => ({ channels, notes, status, mentions, statusLabel: STATUS_LABELS[status] }))(automationOf(item)),
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
    const out = foundry.utils.expandObject(flat);
    // NT1: picking where a Bonus Jutsu came from names it; Class clears the source.
    const learned = out.system?.learned;
    if ( learned && this.document.type === "jutsu" ) {
      if ( learned.mode === "class" ) Object.assign(learned, { source: "", grantedBy: "" });
      else if ( learned.source && learned.source !== this.document._source.system.learned?.source ) {
        const from = this.document.actor?.items.find(i => [i.id, i.uuid, i._stats?.compendiumSource, i.flags?.core?.sourceId].includes(learned.source));
        if ( from ) learned.grantedBy = from.name;
      }
    }
    return out;
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
  /** UX1: an Amp card's "What it does" → its buff effect (made on first use; it never transfers). */
  static async #onEditAmpBuff() {
    const doc = this.document;
    let effect = doc.effects.contents[0];
    if ( !effect ) {
      const cls = CONFIG.ActiveEffect.documentClass;
      effect = await cls.create({ name: `${doc.name}`, img: doc.img, type: "generic", transfer: false, origin: doc.uuid }, { parent: doc });
    }
    return effect?.sheet.render(true);
  }

  /** @override  UX1: a select with per-option definitions swaps its definition when the choice changes. */
  async _onRender(context, options) {
    await super._onRender(context, options);
    // NT1: linked-document lists (a feature's Granted jutsu) take drops.
    for ( const zone of this.element.querySelectorAll("[data-uuid-drop]") ) {
      zone.addEventListener("dragover", ev => ev.preventDefault());
      zone.addEventListener("drop", ev => this.#onDropUuid(ev, zone));
    }
    for ( const select of this.element.querySelectorAll("select[data-hinted]") ) {
      select.addEventListener("change", () => {
        const hint = select.closest("label")?.querySelector("[data-hint-for]");
        if ( hint ) hint.textContent = select.selectedOptions[0]?.dataset.hint ?? "";
      });
    }
  }

  /** NT1: add a dropped document's uuid to a linked list (type-checked by data-accept). */
  async #onDropUuid(event, zone) {
    event.preventDefault();
    event.stopPropagation();
    if ( !this.isEditable ) return;
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); } catch { return; }
    const doc = data?.uuid ? await fromUuid(data.uuid) : null;
    if ( !doc ) return;
    if ( zone.dataset.accept && doc.type !== zone.dataset.accept ) return ui.notifications.warn(`Drop a ${zone.dataset.accept} here.`);
    const path = zone.dataset.uuidDrop;
    const uuid = doc._stats?.compendiumSource ?? doc.uuid;
    const cur = [...(foundry.utils.getProperty(this.document._source, path) ?? [])];
    if ( cur.includes(uuid) ) return;
    await this.document.update({ [path]: [...cur, uuid] });
  }

  /** NT1: remove one entry from a linked list. */
  static async #onRemoveUuid(event, target) {
    const path = target.dataset.path;
    const cur = [...(foundry.utils.getProperty(this.document._source, path) ?? [])];
    cur.splice(Number(target.dataset.index), 1);
    await this.document.update({ [path]: cur });
  }

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
