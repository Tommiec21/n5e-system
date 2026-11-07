/**
 * N5e character sheet (Phase 2).
 * Structure follows dnd5e v5's ApplicationV2 sheets (one part per tab, edit/play mode, context menus);
 * statistic breakdowns, action glyphs and rule chips follow PF2e. All data comes from view models in
 * module/view-models/character.mjs.
 */
import {
  headerVM, railVM, mainVM, jutsuVM, inventoryVM, featuresVM, effectsVM, biographyVM
} from "../../view-models/character.mjs";
import { buildRows, coerceListInputs } from "../schema-form.mjs";
import { postItemCard } from "../../chat/card.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

const T = name => `systems/n5e/templates/actor/character/${name}.hbs`;

/** Partials used inside the character templates. */
export const CHARACTER_TEMPLATE_PATHS = [
  "systems/n5e/templates/parts/field-rows.hbs",
  "systems/n5e/templates/parts/chips.hbs",
  "systems/n5e/templates/parts/item-controls.hbs"
];

export default class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  static DEFAULT_OPTIONS = {
    classes: ["n5e", "sheet", "actor", "character", "n5e-v2"],
    position: { width: 900, height: 1000 },
    window: { resizable: true },
    form: { submitOnChange: true },
    actions: {
      n5eTab: CharacterSheet.#onTab,
      toggleMode: CharacterSheet.#onToggleMode,
      editImage: CharacterSheet.#onEditImage,
      editItem: CharacterSheet.#onEditItem,
      deleteItem: CharacterSheet.#onDeleteItem,
      useItem: CharacterSheet.#onUseItem,
      toggleEquip: CharacterSheet.#onToggleEquip,
      togglePin: CharacterSheet.#onTogglePin,
      toggleExpand: CharacterSheet.#onToggleExpand,
      castRank: CharacterSheet.#onCastRank,
      jutsuFilter: CharacterSheet.#onJutsuFilter,
      setAmmo: CharacterSheet.#onSetAmmo,
      setCharge: CharacterSheet.#onSetCharge,
      setWillOfFire: CharacterSheet.#onSetWillOfFire,
      setChain: CharacterSheet.#onSetChain,
      changeRanks: CharacterSheet.#onChangeRanks,
      toggleEffect: CharacterSheet.#onToggleEffect,
      deleteEffect: CharacterSheet.#onDeleteEffect,
      editEffect: CharacterSheet.#onEditEffect,
      enterStance: CharacterSheet.#onEnterStance,
      setPool: CharacterSheet.#onSetPool
    }
  };

  static PARTS = {
    header: { template: T("header") },
    tabs: { template: T("tabs") },
    rail: { template: T("rail"), scrollable: [""] },
    main: { template: T("main"), scrollable: [""] },
    actions: { template: T("actions"), scrollable: [""] },
    jutsu: { template: T("jutsu"), scrollable: [".n5e-jutsu-list"] },
    inventory: { template: T("inventory"), scrollable: [""] },
    features: { template: T("features"), scrollable: [""] },
    effects: { template: T("effects"), scrollable: [""] },
    biography: { template: T("biography"), scrollable: [""] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main", label: "Main" },
        { id: "actions", label: "Actions" },
        { id: "jutsu", label: "Jutsu" },
        { id: "inventory", label: "Inventory" },
        { id: "features", label: "Features" },
        { id: "effects", label: "Effects" },
        { id: "biography", label: "Biography" }
      ],
      initial: "main"
    }
  };

  /** Parts that are tabs (the rest are always shown). */
  static TAB_PARTS = new Set(["main", "actions", "jutsu", "inventory", "features", "effects", "biography"]);

  /* -------------------------------------------- */
  /*  Sheet UI state (not stored on the actor)    */
  /* -------------------------------------------- */

  /** Edit mode (pencil toggle, as in dnd5e v5). */
  #editMode = false;

  /** Jutsu tab state. */
  #jutsu = { discipline: "", search: "", expanded: new Set(), castRank: {}, refocus: false };

  get editMode() {
    return this.#editMode && this.isEditable;
  }

  /* -------------------------------------------- */
  /*  Context                                     */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.editMode = this.editMode;
    context.editable = this.isEditable;
    context.tabs = this._prepareTabs("primary");
    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const actor = this.actor;
    if ( CharacterSheet.TAB_PARTS.has(partId) ) context.tab = context.tabs[partId];
    switch ( partId ) {
      case "header": context.vm = headerVM(actor); break;
      case "rail":
        context.vm = railVM(actor, { ...CONFIG.N5E.conditions, ...CONFIG.N5E.clanConditions });
        context.conditionChoices = Object.entries({ ...CONFIG.N5E.conditions, ...CONFIG.N5E.clanConditions })
          .map(([key, c]) => ({ key, label: c.label })).sort((a, b) => a.label.localeCompare(b.label));
        break;
      case "main": context.vm = mainVM(actor); break;
      case "jutsu": context.vm = jutsuVM(actor, this.#jutsu); break;
      case "inventory": context.vm = inventoryVM(actor); break;
      case "features": context.vm = featuresVM(actor); break;
      case "effects": context.vm = effectsVM(actor); break;
      case "biography": {
        context.vm = biographyVM(actor);
        const TextEditor = foundry.applications.ux.TextEditor.implementation;
        context.vm.biographyHTML = await TextEditor.enrichHTML(context.vm.biography, { relativeTo: actor });
        if ( this.editMode ) {
          this._rows = buildRows(actor.system.schema, actor._source.system, { skip: new Set(["abilities", "saves", "skills"]) });
          context.rows = this._rows.map(r => ({ ...r, isHeading: r.kind === "heading", isText: r.kind === "text" || r.kind === "list",
            isNumber: r.kind === "number", isCheckbox: r.kind === "checkbox", isSelect: r.kind === "select",
            isHtml: r.kind === "html", isJson: r.kind === "json", indent: r.depth * 12,
            options: r.choices ? Object.entries(r.choices).map(([value, label]) => ({ value, label: typeof label === "object" ? label.label ?? value : label, selected: value === r.value })) : null }));
        }
        break;
      }
    }
    return context;
  }

  /** @override */
  _processFormData(event, form, formData) {
    const flat = formData.object;
    coerceListInputs(flat, this._rows ?? []);
    return foundry.utils.expandObject(flat);
  }

  /* -------------------------------------------- */
  /*  Rendering hooks                             */
  /* -------------------------------------------- */

  /** @override */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    const ContextMenu = foundry.applications.ux.ContextMenu.implementation;
    new ContextMenu(this.element, "[data-item-id].n5e-row", this.#itemContextOptions(), { jQuery: false, fixed: true });
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.classList.toggle("edit-mode", this.editMode);

    // Jutsu search: re-render only the jutsu part, keep focus in the box.
    const search = this.element.querySelector("[data-jutsu-search]");
    if ( search ) {
      search.addEventListener("input", foundry.utils.debounce(ev => {
        this.#jutsu.search = ev.target.value;
        this.#jutsu.refocus = true;
        this.render({ parts: ["jutsu"] });
      }, 200));
      if ( this.#jutsu.refocus ) {
        this.#jutsu.refocus = false;
        search.focus();
        search.setSelectionRange(search.value.length, search.value.length);
      }
    }

    // Add-condition picker in the rail.
    this.element.querySelector("[data-add-condition]")?.addEventListener("change", async ev => {
      const key = ev.target.value;
      ev.target.value = "";
      if ( key ) await this.actor.addCondition(key, 1);
    });

    // Fields that live on an owned item (class levels, Hijutsu choice): update the item, not the actor.
    for ( const input of this.element.querySelectorAll("[data-item-field]") ) {
      input.addEventListener("change", async ev => {
        ev.stopPropagation();
        const item = this.actor.items.get(ev.target.closest("[data-item-id]")?.dataset.itemId);
        if ( !item ) return;
        let value = ev.target.type === "checkbox" ? ev.target.checked : ev.target.value;
        if ( ev.target.type === "number" ) value = Number(value);
        await item.update({ [ev.target.dataset.itemField]: value });
      });
    }
  }

  /* -------------------------------------------- */
  /*  Drag and drop rules                         */
  /* -------------------------------------------- */

  /** @override */
  async _onDropItem(event, item) {
    if ( !this.actor.isOwner ) return null;
    const actor = this.actor;

    // Dropping one of our own items on the Pinned strip pins it.
    if ( item.parent === actor ) {
      if ( event.target.closest?.("[data-pin-zone]") ) return this.#pin(item.id, true);
      return super._onDropItem(event, item);
    }

    // One class, clan, background: replacing asks first.
    if ( ["class", "clan", "background"].includes(item.type) ) {
      const existing = actor.items.find(i => i.type === item.type);
      if ( existing ) {
        const multiclass = item.type === "class" && game.settings.get("n5e", "multiclassing");
        if ( !multiclass ) {
          const ok = await foundry.applications.api.DialogV2.confirm({
            window: { title: `Replace ${existing.name}?` },
            content: `<p>${this.actor.name} already has the ${game.i18n.localize(`TYPES.Item.${item.type}`)} `
              + `<strong>${existing.name}</strong>. Replace it with <strong>${item.name}</strong>?</p>`,
            rejectClose: false
          });
          if ( !ok ) return null;
          await existing.delete();
        }
      }
    }

    // A jutsu the character already knows.
    if ( item.type === "jutsu" ) {
      const key = item.system.identifier || item.name;
      if ( actor.items.some(i => i.type === "jutsu" && (i.system.identifier || i.name) === key) ) {
        ui.notifications.warn(`${actor.name} already knows ${item.name}.`);
        return null;
      }
    }

    const created = await super._onDropItem(event, item);
    if ( created && event.target.closest?.("[data-pin-zone]") ) await this.#pin(created.id, true);
    return created;
  }

  /* -------------------------------------------- */
  /*  Context menu                                */
  /* -------------------------------------------- */

  #itemContextOptions() {
    const item = li => this.actor.items.get(li.dataset.itemId);
    const owner = () => this.actor.isOwner;
    return [
      { name: "Edit", icon: "<i class=\"fa-solid fa-pen-to-square\"></i>", condition: owner,
        callback: li => item(li)?.sheet.render(true) },
      { name: "Post to chat", icon: "<i class=\"fa-solid fa-comment\"></i>",
        callback: li => { const i = item(li); if ( i ) postItemCard(i); } },
      { name: "Equip / Unequip", icon: "<i class=\"fa-solid fa-shield-halved\"></i>",
        condition: li => owner() && ["weapon", "armor", "container"].includes(item(li)?.type),
        callback: li => { const i = item(li); i?.update({ "system.equipped": !i.system.equipped }); } },
      { name: "Pin / Unpin", icon: "<i class=\"fa-solid fa-thumbtack\"></i>", condition: owner,
        callback: li => this.#pin(li.dataset.itemId) },
      { name: "Duplicate", icon: "<i class=\"fa-solid fa-copy\"></i>",
        condition: li => owner() && !["class", "clan", "background", "jutsu"].includes(item(li)?.type),
        callback: li => { const i = item(li); if ( i ) i.clone({ name: `${i.name} (copy)` }, { save: true }); } },
      { name: "Delete", icon: "<i class=\"fa-solid fa-trash\"></i>", condition: owner,
        callback: li => item(li)?.deleteDialog() }
    ];
  }

  /** Pin or unpin an item on the Main tab (stored in actor flags). */
  async #pin(itemId, force) {
    const pins = [...(this.actor.getFlag("n5e", "pins") ?? [])];
    const has = pins.includes(itemId);
    if ( force === true && has ) return null;
    const next = has ? pins.filter(id => id !== itemId) : [...pins, itemId];
    return this.actor.setFlag("n5e", "pins", next);
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static #itemFrom(target) {
    return this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
  }

  static #onTab(event, target) {
    this.changeTab(target.dataset.tab, target.dataset.group ?? "primary");
  }

  static #onToggleMode() {
    this.#editMode = !this.#editMode;
    this.render();
  }

  static async #onEditImage() {
    if ( !this.isEditable ) return;
    const FilePicker = foundry.applications.apps.FilePicker.implementation;
    return new FilePicker({ type: "image", current: this.actor.img,
      callback: path => this.actor.update({ img: path }) }).browse();
  }

  static #onEditItem(event, target) {
    CharacterSheet.#itemFrom.call(this, target)?.sheet.render(true);
  }

  static async #onDeleteItem(event, target) {
    await CharacterSheet.#itemFrom.call(this, target)?.deleteDialog();
  }

  static async #onUseItem(event, target) {
    const item = CharacterSheet.#itemFrom.call(this, target);
    if ( item ) await postItemCard(item, { rank: this.#jutsu.castRank[item.id] });
  }

  static async #onToggleEquip(event, target) {
    const item = CharacterSheet.#itemFrom.call(this, target);
    if ( item && "equipped" in item.system ) await item.update({ "system.equipped": !item.system.equipped });
  }

  static async #onTogglePin(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    if ( id ) await this.#pin(id);
  }

  static #onToggleExpand(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    if ( !id ) return;
    const set = this.#jutsu.expanded;
    if ( set.has(id) ) set.delete(id);
    else set.add(id);
    this.render({ parts: ["jutsu"] });
  }

  static #onCastRank(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    if ( !id ) return;
    this.#jutsu.castRank[id] = target.dataset.rank;
    this.render({ parts: ["jutsu"] });
  }

  static #onJutsuFilter(event, target) {
    this.#jutsu.discipline = target.dataset.discipline ?? "";
    this.render({ parts: ["jutsu"] });
  }

  static async #onSetAmmo(event, target) {
    const item = CharacterSheet.#itemFrom.call(this, target);
    if ( item ) await item.update({ "system.ammo.step": Number(target.dataset.idx) });
  }

  static async #onSetCharge(event, target) {
    const item = CharacterSheet.#itemFrom.call(this, target);
    if ( !item ) return;
    const idx = Number(target.dataset.idx);
    const value = item.system.charges.value === idx + 1 ? idx : idx + 1;
    await item.update({ "system.charges.value": value });
  }

  static async #onSetWillOfFire(event, target) {
    const n = Number(target.dataset.value);
    const value = this.actor.system.willOfFire.value === n ? n - 1 : n;
    await this.actor.update({ "system.willOfFire.value": Math.max(0, value) });
  }

  static async #onSetChain(event, target) {
    const n = Number(target.dataset.value);
    const value = this.actor.system.combat.chain.value === n ? n - 1 : n;
    await this.actor.update({ "system.combat.chain.value": Math.max(0, value) });
  }

  static async #onChangeRanks(event, target) {
    const effect = this.actor.effects.get(target.closest("[data-effect-id]")?.dataset.effectId);
    if ( !effect ) return;
    const max = effect.system.maxRanks ?? 1;
    const ranks = Math.max(0, Math.min(max, effect.system.ranks + (Number(target.dataset.delta) || 0)));
    if ( ranks === 0 ) await effect.delete();
    else await effect.update({ "system.ranks": ranks });
  }

  static async #onToggleEffect(event, target) {
    const effect = this.actor.effects.get(target.closest("[data-effect-id]")?.dataset.effectId);
    await effect?.update({ disabled: !effect.disabled });
  }

  static async #onDeleteEffect(event, target) {
    await this.actor.effects.get(target.closest("[data-effect-id]")?.dataset.effectId)?.delete();
  }

  static #onEditEffect(event, target) {
    this.actor.effects.get(target.closest("[data-effect-id]")?.dataset.effectId)?.sheet.render(true);
  }

  static async #onEnterStance(event, target) {
    const id = target.closest("[data-item-id]")?.dataset.itemId;
    const current = this.actor.system.combat.activeStance;
    await this.actor.update({ "system.combat.activeStance": current === id ? "" : id });
  }

  static async #onSetPool(event, target) {
    const pool = target.closest("[data-pool]")?.dataset.pool;
    if ( !pool ) return;
    const n = Number(target.dataset.value);
    const current = this.actor.system.resources[pool]?.value ?? 0;
    await this.actor.update({ [`system.resources.${pool}.value`]: current === n ? n - 1 : n });
  }
}
