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
import { TABS, INDEX_FIELDS, entryFrom, facetOptions, filterEntries, sortEntries, hijutsuVisible } from "../../rules/browser.mjs";

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
  /** The open browser, if any (NT1 banner refresh). */
  static get current() { return this.#instance?.rendered ? this.#instance : null; }
  /** Open (or bring forward) the browser, optionally on a tab. */
  static open(tab, { filters = null, learning = null } = {}) {
    this.#instance ??= new CompendiumBrowser();
    const inst = this.#instance;
    if ( tab && TABS[tab] ) inst.state.tab = tab;
    // NT1: opened from a level-up or the Jutsu tab: preset the slot's filters (all removable) and show
    // whose open jutsu slots the drops fill.
    if ( filters ) {
      inst.state.filters[inst.state.tab] = foundry.utils.deepClone(filters);
      inst.state.limit = PAGE;
    }
    if ( learning !== null ) inst.learning = learning;
    return inst.render({ force: true });
  }

  /** NT1: the actor whose jutsu slots the banner shows (an Actor), or null. */
  learning = null;

  /** NT1: banner text for the learning actor: open slots and where they come from. */
  async learningBanner() {
    const actor = this.learning;
    if ( !actor || this.state.tab !== "jutsu" ) return null;
    const { jutsuSlots, filterText } = await import("../../rules/jutsu-slots.mjs");
    const s = jutsuSlots(actor);
    const N = CONFIG.N5E;
    const labels = { discipline: k => N.disciplines[k]?.label ?? k, section: k => N.jutsuSections?.[k]?.label ?? k, keyword: k => N.keywords?.[k]?.label ?? k };
    const parts = [];
    if ( s.class.open ) parts.push(`${s.class.open} class${s.class.maxRank ? ` (up to ${s.class.maxRank}-Rank)` : ""}`);
    for ( const src of s.bonus.sources ) if ( src.open ) parts.push(`${src.open} bonus from ${src.name}${filterText(src.filter, labels) ? ` (${filterText(src.filter, labels)})` : ""}`);
    return { name: actor.name, open: s.open, text: parts.join(" · ") || "no open slots (a drop is over the limit)" };
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
      case "hijutsuClan": return this.clanNames?.get(value) ?? titleCase(value);
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
    // King 2026-11-25: for a character, only its own clan's Hijutsu (rules/browser.mjs hijutsuVisible).
    const viewer = this.learning ?? (game.user.isGM ? null : game.user.character) ?? null;
    const viewerClan = viewer ? (viewer.items.find(i => i.type === "clan")?.system.identifier ?? "") : null;
    const inTab = all.filter(e => e.tab === s.tab && hijutsuVisible(e, viewerClan));
    const classNames = new Map(all.filter(e => e.type === "class").map(e => [e.identifier ?? "", e.name]));
    this.clanNames = new Map(all.filter(e => e.type === "clan").map(e => [e.identifier ?? "", e.name]));
    this.hijutsuNote = viewer && s.tab === "jutsu" ? `Hijutsu: ${viewerClan ? `only ${this.clanNames.get(viewerClan) ?? viewerClan}'s` : "none (no clan)"} (${viewer.name})` : "";
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
      canAdd: !!this.addTarget(),
      learning: await this.learningBanner(),
      hijutsuNote: this.hijutsuNote
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
      if ( r.hijutsuClan ) bits.push(`Hijutsu: ${this.clanNames?.get(r.hijutsuClan) ?? titleCase(r.hijutsuClan)}`);
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
    const a = (this.learning?.isOwner ? this.learning : null) ?? canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character;
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
    // NT1: a jutsu added to a character takes a slot and alerts what it breaks.
    if ( doc.type === "jutsu" && actor.type === "character" ) {
      const { learnJutsu } = await import("../../workflow/learn-jutsu.mjs");
      await learnJutsu(actor, doc);
      return ui.notifications.info(`${actor.name} learned ${doc.name}.`);
    }
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
    if ( !root || root.querySelector(".n5e-browser-open") ) return;
    // Always inside the header's action row. Some v13 builds render the Compendium sidebar without
    // one; make it (as dnd5e does) rather than dropping the button into a column container, where
    // it stretched to the sidebar's full height behind the pack list.
    let header = root.querySelector(".header-actions");
    if ( !header ) {
      const top = root.querySelector(":scope > header, .directory-header");
      if ( !top ) return;
      header = document.createElement("div");
      header.className = "header-actions action-buttons flexrow";
      top.insertAdjacentElement("afterbegin", header);
    }
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
      // NT1: the learning actor's jutsu changed: refresh the banner's open slots.
      if ( doc?.parent && doc.parent === CompendiumBrowser.current?.learning ) return CompendiumBrowser.current.render({ parts: ["results"] });
      if ( hook !== "updateCompendium" && doc?.parent ) return;   // items on actors don't matter
      CompendiumBrowser.invalidate();
    });
  }
}
