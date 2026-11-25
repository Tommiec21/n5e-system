/**
 * Clan setup window (King 2026-11-25): the same look as the level-up window. Ability increases as two
 * rows of pills (+2, then +1 from the rest; Non-Clan may take +1 to three), then one card per choice
 * from advancement/clan.mjs clanSetupFields: skill pills (a duplicate skill: every remaining skill),
 * affinity, branch, starting option cards, feature picks. Resolves the selection workflow/clan.mjs
 * addClan plans and applies ({mode, applyASI, abilities, choices}), or null when cancelled.
 */
import { abilities } from "../config/core.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const esc = s => foundry.utils.escapeHTML?.(String(s ?? "")) ?? String(s ?? "");

export default class ClanSetupWindow extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-clan-setup-{id}",
    classes: ["n5e", "n5e-v2", "n5e-level-up", "n5e-clan-setup"],
    tag: "div",
    window: { title: "Clan setup", icon: "fa-solid fa-users", resizable: true },
    position: { width: 760, height: 820 },
    actions: {
      apply: ClanSetupWindow.#onApply, cancel: ClanSetupWindow.#onCancel, pick: ClanSetupWindow.#onPick,
      plus2: ClanSetupWindow.#onPlus2, plus1: ClanSetupWindow.#onPlus1, pattern: ClanSetupWindow.#onPattern, applyAsi: ClanSetupWindow.#onApplyAsi
    }
  };

  static PARTS = { body: { template: "systems/n5e/templates/apps/clan-setup.hbs", scrollable: [".lu-steps"] } };

  /** Open the window and wait for Apply (the selection) or Cancel/close (null). */
  static wait(o) {
    return new Promise(resolve => {
      const win = new ClanSetupWindow({ window: { title: `${o.actor.name}: ${o.clan.name} clan setup` } });
      win.o = o;
      win.resolve = resolve;
      win.render({ force: true });
    });
  }

  o = null;
  resolve = null;
  sel = {};
  plus2 = "";
  plus1 = [];
  mode = "choose";
  applyASI = null;

  /** The "+1 to three" pattern is offered when the clan setup says so (workflow/clan.mjs: threeOption). */
  get nonClan() { return !!this.o.threeOption; }

  /** Fields the current branch shows. */
  #fields() {
    const branch = this.sel.branch?.[0] ?? "";
    return this.o.fields.filter(f => !f.branch || f.branch === branch);
  }

  /** A fixed (not duplicated) clan skill is granted, not picked. */
  static #granted(f) { return f.kind === "skill" && f.id.startsWith("fixed-") && f.options.length === 1; }

  /** @override */
  async _prepareContext() {
    const { actor, clan, old, docs, baseScore, error } = this.o;
    if ( this.applyASI === null ) this.applyASI = !old || Object.keys(old.flags?.n5e?.clanAbilityIncreases ?? {}).length > 0;
    const inc = this.#increments();
    const label = k => abilities[k]?.label ?? k;
    const asi = {
      three: this.mode === "three",
      plus2: KEYS.map(k => ({ key: k, label: label(k), on: this.plus2 === k })),
      plus1: KEYS.filter(k => this.mode === "three" || k !== this.plus2).map(k => ({ key: k, label: label(k), on: this.plus1.includes(k) })),
      results: KEYS.map(k => ({ abbr: abilities[k]?.abbr?.toUpperCase?.() ?? k.toUpperCase(), now: baseScore(k), plus: inc[k] ?? 0, result: baseScore(k) + (inc[k] ?? 0) })),
      need1: this.mode === "three" ? 3 : 1, have1: this.plus1.length
    };
    const fieldViews = [];
    const granted = [];
    for ( const f of this.#fields() ) {
      if ( ClanSetupWindow.#granted(f) ) { granted.push(f.options[0].label); continue; }
      const chosen = new Set(this.sel[f.id] ?? []);
      const cards = f.kind === "itemChoice";
      const options = f.options.map(opt => {
        const doc = cards ? docs.find(d => d.uuid === opt.value) : null;
        return { ...opt, on: chosen.has(opt.value), img: doc?.img ?? "",
          tip: doc ? `<div class="n5e-tip"><b class="tt">${esc(doc.name)}</b><div class="tb">${doc.system?.description ?? ""}</div></div>` : "" };
      });
      fieldViews.push({ id: f.id, label: f.label, count: f.count, have: chosen.size, full: chosen.size === f.count, cards, options,
        branchNote: f.branch ? (f.branch === "main" ? "Main Branch" : "Side Branch") : "" });
    }
    const problems = this.#problems();
    return {
      clan: clan.name, actor: actor.name, replaces: old?.name ?? "", applyASI: this.applyASI, nonClan: this.nonClan,
      asi, asiFull: this.#asiDone(), granted, fields: fieldViews, problems, ready: !problems.length, error
    };
  }

  #increments() {
    const out = {};
    if ( this.mode === "three" ) for ( const k of this.plus1 ) out[k] = 1;
    else { if ( this.plus2 ) out[this.plus2] = 2; for ( const k of this.plus1 ) out[k] = 1; }
    return out;
  }

  #asiDone() {
    return this.mode === "three" ? this.plus1.length === 3 : !!this.plus2 && this.plus1.length === 1;
  }

  #problems() {
    const out = [];
    if ( !this.#asiDone() ) out.push(this.mode === "three" ? "Pick three abilities for +1." : "Pick an ability for +2 and another for +1.");
    for ( const f of this.#fields() ) {
      if ( ClanSetupWindow.#granted(f) ) continue;
      const n = (this.sel[f.id] ?? []).length;
      if ( n !== f.count ) out.push(`${f.label}: choose ${f.count}.`);
    }
    return out;
  }

  static #onPlus2(event, target) {
    const k = target.dataset.key;
    this.plus2 = this.plus2 === k ? "" : k;
    this.plus1 = this.plus1.filter(x => x !== this.plus2);
    this.render();
  }

  static #onPlus1(event, target) {
    const k = target.dataset.key;
    const max = this.mode === "three" ? 3 : 1;
    if ( this.plus1.includes(k) ) this.plus1 = this.plus1.filter(x => x !== k);
    else this.plus1 = max === 1 ? [k] : [...this.plus1, k].slice(-max);
    this.render();
  }

  static #onPattern(event, target) {
    this.mode = target.dataset.mode;
    this.plus2 = "";
    this.plus1 = [];
    this.render();
  }

  static #onApplyAsi(event, target) {
    this.applyASI = !!target.checked;
  }

  static #onPick(event, target) {
    const f = this.o.fields.find(x => x.id === target.dataset.field);
    if ( !f ) return;
    const cur = this.sel[f.id] ?? [];
    const v = target.dataset.value;
    if ( cur.includes(v) ) this.sel[f.id] = cur.filter(x => x !== v);
    else this.sel[f.id] = f.count === 1 ? [v] : [...cur, v].slice(-f.count);
    this.render();
  }

  static #onApply() {
    if ( this.#problems().length ) return ui.notifications.warn(this.#problems()[0]);
    const ordered = this.mode === "three" ? [...this.plus1] : [this.plus2, ...this.plus1];
    const choices = {};
    for ( const f of this.o.fields ) choices[f.id] = ClanSetupWindow.#granted(f) ? [f.options[0].value] : (this.sel[f.id] ?? []);
    const r = this.resolve;
    this.resolve = null;
    r?.({ mode: this.mode, applyASI: this.applyASI, abilities: ordered, choices });
    return this.close();
  }

  static #onCancel() {
    return this.close();
  }

  /** @override */
  _onClose(options) {
    super._onClose?.(options);
    const r = this.resolve;
    this.resolve = null;
    r?.(null);
  }
}

