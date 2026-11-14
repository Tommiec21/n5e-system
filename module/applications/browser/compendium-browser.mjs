/**
 * N5e Compendium Browser: every Item compendium (plus world items) in one filterable window, with a
 * tab per kind of item. Rows can be dragged onto a sheet (the sheet's own drop rules apply), opened,
 * or added straight to your character / selected token.
 *
 * Open it from the Compendium or Items sidebar ("N5e Browser" button) or with game.n5e.browser(tab).
 * The tabs, row fields and filter logic are pure functions in module/rules/browser.mjs; this file loads
 * the indexes (once, refreshed when a compendium changes), keeps the window's state, and renders
 * templates/apps/compendium-browser.hbs in two parts (filters, results) so typing in the search box
 * only redraws the results.
 */
import { TABS, INDEX_FIELDS, entryFrom, facetOptions, filterEntries, sortEntries } from "../../rules/browser.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const PAGE = 150;
const titleCase = s => String(s).replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\b\w/g, c => c.toUpperCase());

export default class CompendiumBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-compendium-browser",
    classes: ["n5e", "n5e-v2", "n5e-browser"],
    window: { title: "N5e Compendium Browser", icon: "fa-solid fa-book-open", resizable: true },
    position: { width: 900, height: 680 },
    actions: {
      tab: CompendiumBrowser.#onTab, open: CompendiumBrowser.#onOpen, add: CompendiumBrowser.#onAdd,
      more: CompendiumBrowser.#onMore, reset: CompendiumBrowser.#onReset
    }
  };

  static PARTS = {
    filters: { template: "systems/n5e/templates/apps/compendium-browser.hbs", scrollable: [".filters"] },
    results: { template: "systems/n5e/templates/apps/compendium-browser-results.hbs", scrollable: [".results"] }
  };

  // ---------------------------------------------------------------------------------------------- //
  //  Index cache (shared by every window; cleared when a compendium or world item changes)          //
  // ---------------------------------------------------------------------------------------------- //
  static #entries = null;
  static #loading = null;

  /** Every row, loading the indexes the first time. */
  static async entries() {
    if ( this.#entries ) return this.#entries;
    this.#loading ??= (async () => {
      const rows = [];
      for ( const pack of game.packs.filter(p => p.documentName === "Item" && p.visible) ) {
        const index = await pack.getIndex({ fields: INDEX_FIELDS });
        for ( const e of index ) rows.push(entryFrom({ ...e, uuid: e.uuid ?? `Compendium.${pack.collection}.Item.${e._id}` }, { pack: pack.metadata.label }));
      }
      for ( const item of game.items.filter(i => i.visible) ) rows.push(entryFrom({ ...item.toObject(), uuid: item.uuid }, { pack: "World" }));
      this.#entries = rows;
      this.#loading = null;
      return rows;
    })();
    return this.#loading;
  }

  /** Forget the cached rows (compendium or world items changed) and redraw an open window. */
  static invalidate() {
    this.#entries = null;
    if ( this.#instance?.rendered ) this.#instance.render();
  }

  static #instance;
  /** Open (or bring forward) the browser, optionally on a tab. */
  static open(tab) {
    this.#instance ??= new CompendiumBrowser();
    if ( tab && TABS[tab] ) this.#instance.state.tab = tab;
    return this.#instance.render({ force: true });
  }

  // ---------------------------------------------------------------------------------------------- //
  //  State                                                                                         //
  // ---------------------------------------------------------------------------------------------- //
  state = { tab: "jutsu", search: "", inText: false, sort: "rank", limit: PAGE, filters: Object.fromEntries(Object.keys(TABS).map(k => [k, {}])) };

  /** A filter value's label (rank "C" → "C-Rank", keyword key → its name, class identifier → class name...). */
  labelFor(field, value, classNames) {
    const N = CONFIG.N5E;
    switch ( field ) {
      case "rank": return `${value}-Rank`;
      case "discipline": return N.disciplines[value]?.label ?? titleCase(value);
      case "section": return N.jutsuSections?.[value]?.label ?? titleCase(value);
      case "keywords": return N.keywords?.[value]?.label ?? titleCase(value);
      case "activation": return N.activationTypes?.[value] ?? titleCase(value);
      case "cls": return classNames.get(value) ?? titleCase(value);
      case "categories": return N.stanceCategories?.[value] ?? titleCase(value);
      case "groups": return N.weaponGroups?.[value] ?? titleCase(value);
      case "category": return N.featureKinds?.[value] ?? N.featCategories?.[value] ?? N.weaponCategories?.[value] ?? titleCase(value);
      case "type": return game.i18n.localize(CONFIG.Item.typeLabels?.[value] ?? "") || titleCase(value);
      default: return String(value);
    }
  }

  /** @override */
  async _prepareContext() {
    const all = await CompendiumBrowser.entries();
    const s = this.state;
    const tabDef = TABS[s.tab];
    const inTab = all.filter(e => e.tab === s.tab);
    const classNames = new Map(all.filter(e => e.type === "class").map(e => [e.identifier ?? "", e.name]));
    const facets = facetOptions(inTab, s.tab);
    const current = s.filters[s.tab];
    const filters = tabDef.filters.map(f => {
      const want = current[f.field];
      const base = { ...f, isMulti: f.kind === "multi" || f.kind === "all", isRange: f.kind === "range", isMax: f.kind === "max", isBool: f.kind === "bool" };
      if ( base.isMulti ) base.options = (facets[f.field] ?? []).map(o => ({ ...o, label: this.labelFor(f.field, o.value, classNames), checked: want?.includes(o.value) }));
      if ( base.isRange ) Object.assign(base, facets[f.field], { min: want?.min ?? "", max: want?.max ?? "", lo: facets[f.field]?.min, hi: facets[f.field]?.max });
      if ( base.isMax ) Object.assign(base, { value: want ?? "", hi: facets[f.field]?.max });
      if ( base.isBool ) base.value = want ?? "";
      return base;
    }).filter(f => !f.isMulti || f.options.length);
    const rows = sortEntries(filterEntries(inTab, current, { search: s.search, inText: s.inText, tab: s.tab }), s.sort);
    return {
      tabs: Object.entries(TABS).map(([key, t]) => ({ key, label: t.label, active: key === s.tab, count: all.filter(e => e.tab === key).length })),
      filters, search: s.search, inText: s.inText,
      sorts: tabDef.sorts.map(k => ({ key: k, label: titleCase(k), selected: k === s.sort })),
      total: rows.length,
      rows: rows.slice(0, s.limit).map(r => ({ ...r, detail: this.detail(r, classNames) })),
      more: rows.length > s.limit,
      canAdd: !!this.addTarget()
    };
  }

  /** The one-line detail under a row's name. */
  detail(r, classNames) {
    const N = CONFIG.N5E;
    const bits = [];
    if ( r.tab === "jutsu" ) {
      bits.push(`${r.rank}-Rank ${N.disciplines[r.discipline]?.label ?? ""}`.trim());
      if ( r.cost != null ) bits.push(`${r.cost} CP`);
      if ( r.activation ) bits.push(N.activationTypes?.[r.activation] ?? r.activation);
      if ( r.concentration ) bits.push("Concentration");
      if ( r.hasArea ) bits.push("Area");
    } else if ( r.tab === "features" ) {
      if ( r.cls ) bits.push(classNames.get(r.cls) ?? titleCase(r.cls));
      if ( r.level ) bits.push(`Level ${r.level}`);
      if ( r.category ) bits.push(this.labelFor("category", r.category, classNames));
    } else if ( r.tab === "equipment" ) {
      bits.push(this.labelFor("type", r.type, classNames));
      if ( r.price ) bits.push(`${r.price} Ryo`);
    } else bits.push(this.labelFor("type", r.type, classNames));
    bits.push(r.pack);
    return bits.filter(Boolean).join(" · ");
  }

  /** Who the Add button adds to: the selected token's actor, else the user's character (if owned). */
  addTarget() {
    const a = canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character;
    return a?.isOwner ? a : null;
  }

  /** @override Inputs update the state; search redraws only the results (keeps the cursor). */
  _onRender(context, options) {
    super._onRender?.(context, options);
    const root = this.element;
    const filtersEl = root.querySelector(".filters");
    if ( filtersEl && !filtersEl.dataset.wired ) {
      filtersEl.dataset.wired = "1";
      let timer;
      filtersEl.addEventListener("input", ev => {
        if ( ev.target.name !== "search" ) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          this.state.search = ev.target.value;
          this.state.limit = PAGE;
          this.render({ parts: ["results"] });
        }, 200);
      });
      filtersEl.addEventListener("change", ev => this.#onFilterChange(ev));
    }
    // Drag rows onto sheets (the standard Item drop data).
    for ( const row of root.querySelectorAll(".results [data-uuid]") ) {
      row.addEventListener("dragstart", ev => ev.dataTransfer.setData("text/plain", JSON.stringify({ type: "Item", uuid: row.dataset.uuid })));
    }
  }

  /** A filter control changed: store it, redraw. */
  #onFilterChange(ev) {
    const el = ev.target;
    const s = this.state;
    const f = s.filters[s.tab];
    if ( el.name === "search" ) return;
    if ( el.name === "inText" ) s.inText = el.checked;
    else if ( el.name === "sort" ) s.sort = el.value;
    else if ( el.dataset.multi ) {
      const field = el.dataset.multi;
      const set = new Set(f[field] ?? []);
      if ( el.checked ) set.add(el.value);
      else set.delete(el.value);
      f[field] = [...set];
    } else if ( el.dataset.range ) {
      f[el.dataset.range] = { ...(f[el.dataset.range] ?? {}), [el.dataset.end]: el.value === "" ? null : Number(el.value) };
    } else if ( el.dataset.max ) f[el.dataset.max] = el.value === "" ? "" : Number(el.value);
    else if ( el.dataset.bool ) f[el.dataset.bool] = el.value;
    s.limit = PAGE;
    this.render({ parts: ["results"] });
  }

  static #onTab(event, target) {
    this.state.tab = target.dataset.tab;
    this.state.sort = TABS[this.state.tab].sorts[0];
    this.state.limit = PAGE;
    this.render();
  }

  static async #onOpen(event, target) {
    const doc = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    doc?.sheet?.render(true);
  }

  static async #onAdd(event, target) {
    const actor = this.addTarget();
    if ( !actor ) return ui.notifications.info("Select a token you own, or set your character, to add items.");
    const doc = await fromUuid(target.closest("[data-uuid]").dataset.uuid);
    if ( !doc ) return;
    // FIN1: features, feats, jutsu and stances an actor already has aren't added twice.
    const { existingCopy } = await import("../../rules/item-audit.mjs");
    if ( existingCopy([...actor.items], doc) ) return ui.notifications.warn(`${actor.name} already has ${doc.name}.`);
    await actor.createEmbeddedDocuments("Item", [doc.toObject()]);
    ui.notifications.info(`Added ${doc.name} to ${actor.name}.`);
  }

  static #onMore() {
    this.state.limit += PAGE;
    this.render({ parts: ["results"] });
  }

  static #onReset() {
    this.state.filters[this.state.tab] = {};
    this.state.search = "";
    this.render();
  }
}

/** Called once from n5e.mjs: sidebar buttons and cache invalidation. */
export function registerCompendiumBrowser() {
  const addButton = (app, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    const header = root?.querySelector(".header-actions, .directory-header .action-buttons, .directory-header");
    if ( !header || header.querySelector(".n5e-browser-open") ) return;
    const b = document.createElement("button");
    b.type = "button";
    b.className = "n5e-browser-open";
    b.innerHTML = '<i class="fa-solid fa-book-open"></i> N5e Browser';
    b.addEventListener("click", () => CompendiumBrowser.open());
    header.append(b);
  };
  Hooks.on("renderCompendiumDirectory", addButton);
  Hooks.on("renderItemDirectory", addButton);
  for ( const hook of ["createItem", "updateItem", "deleteItem", "updateCompendium"] ) {
    Hooks.on(hook, doc => {
      if ( hook !== "updateCompendium" && doc?.parent ) return;   // items on actors don't matter
      CompendiumBrowser.invalidate();
    });
  }
}
