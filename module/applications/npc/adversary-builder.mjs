/**
 * The Adversary Builder (NPC2; King 2026-11-14): the Bingo Book's build steps in one window, with a
 * step list (any step can be opened at any time), a live stat block preview, and Create or Update.
 * Nothing is saved until then; closing with changes asks first.
 *
 * Logic: rules/adversary-builder.mjs (draft in and out, notes). View: view-models/adversary-builder.mjs.
 * Template: templates/apps/adversary-builder.hbs.
 */
import { blankDraft, draftFromActor, draftToUpdate, assignLine, rebaseMods, suggestedRanksFor } from "../../rules/adversary-builder.mjs";
import { builderVM, STEPS } from "../../view-models/adversary-builder.mjs";
import { statBlockVM } from "../../view-models/npc.mjs";
import { statLine, ABILITY_KEYS } from "../../rules/adversary.mjs";
import { adversaryClanGroups, roleModifiers } from "../../config/adversary.mjs";
import { adversaryOf, buildStrike, buildJutsu } from "../../rules/freeform.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const STEP_KEYS = STEPS.map(([k]) => k);

export default class AdversaryBuilder extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "n5e-v2", "n5e-adversary-builder"],
    tag: "form",
    window: { title: "Adversary Builder", icon: "fa-solid fa-user-ninja", resizable: true },
    position: { width: 980, height: 720 },
    form: { handler: AdversaryBuilder.#onForm, submitOnChange: true, closeOnSubmit: false },
    actions: {
      goStep: AdversaryBuilder.#onGoStep, next: AdversaryBuilder.#onNext, back: AdversaryBuilder.#onBack,
      pick: AdversaryBuilder.#onPick, addTrait: AdversaryBuilder.#onAddTrait, removeEntry: AdversaryBuilder.#onRemoveEntry,
      addEntry: AdversaryBuilder.#onAddEntry, toggleAllRanks: AdversaryBuilder.#onToggleAllRanks,
      useBaseline: AdversaryBuilder.#onUseBaseline, rebase: AdversaryBuilder.#onRebase, save: AdversaryBuilder.#onSave,
      addFreeform: AdversaryBuilder.#onAddFreeform, editFreeform: AdversaryBuilder.#onEditFreeform
    }
  };

  static PARTS = { body: { template: "systems/n5e/templates/apps/adversary-builder.hbs", scrollable: [".builder-body", ".builder-preview"] } };

  /** Open for an NPC (Update) or for a new adversary (Create). */
  static open(actor = null) {
    return new AdversaryBuilder({ actor }).render({ force: true });
  }

  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? null;
    this.draft = this.actor ? draftFromActor(this.actor) : blankDraft();
    this.step = "concept";
    this.dirty = false;
    this.showAllRanks = false;
    this.search = { jutsu: "", weapon: "" };
    this.dirtyMods = false;
  }

  get title() {
    return this.actor ? `Adversary Builder: ${this.actor.name}` : "Adversary Builder: new adversary";
  }

  /** The compendium indexes, loaded once per window. */
  async #indexes() {
    if ( this._indexes ) return this._indexes;
    const load = async (name, fields) => [...(await game.packs.get(`n5e.${name}`)?.getIndex({ fields }) ?? [])];
    const [jutsu, equipment, clans] = await Promise.all([
      load("jutsu", ["system.rank", "system.discipline"]), load("equipment", ["system.weaponType"]), load("clans", [])
    ]);
    this._indexes = { jutsu, weapons: equipment.filter(e => e.type === "weapon"), clans: clans.filter(c => c.type === "clan").map(c => c.name) };
    return this._indexes;
  }

  /** @override */
  async _prepareContext() {
    const idx = await this.#indexes();
    const ranks = suggestedRanksFor(this.draft.rank);
    const term = s => String(s ?? "").trim().toLowerCase();
    const allRanks = this.showAllRanks || this.step === "generic";
    const jutsuResults = idx.jutsu.filter(j => (allRanks || ranks.includes(j.system?.rank)) && (!term(this.search.jutsu) || j.name.toLowerCase().includes(term(this.search.jutsu))))
      .slice(0, 40).map(j => ({ uuid: j.uuid, name: j.name, rank: j.system?.rank ?? "", discipline: j.system?.discipline ?? "" }));
    const weaponResults = idx.weapons.filter(w => !term(this.search.weapon) || w.name.toLowerCase().includes(term(this.search.weapon)))
      .slice(0, 30).map(w => ({ uuid: w.uuid, name: w.name }));
    const clanNames = [...new Set([...adversaryClanGroups, ...idx.clans])].sort();
    return { vm: builderVM(this.draft, { step: this.step, isNew: !this.actor, preview: this.#preview(), jutsuResults, weaponResults,
      clanNames, showAllRanks: this.showAllRanks, search: this.search }) };
  }

  /** A stat block of the draft, from an unsaved actor (nothing is written). */
  #preview() {
    try {
      const { update } = draftToUpdate(this.draft, this.actor);
      const expanded = foundry.utils.expandObject(update);
      const base = this.actor ? this.actor.toObject() : { type: "npc", system: {} };
      const data = foundry.utils.mergeObject(base, { name: expanded.name, img: expanded.img, type: "npc", system: expanded.system }, { inplace: false });
      delete data._id;
      const temp = new CONFIG.Actor.documentClass(data);
      return statBlockVM(temp);
    } catch (error) {
      console.warn("n5e | builder preview", error);
      return null;
    }
  }

  /** @override  Search boxes re-render as you type. */
  async _onRender(context, options) {
    await super._onRender(context, options);
    for ( const input of this.element.querySelectorAll("[data-n5e-builder-search]") ) {
      input.addEventListener("input", foundry.utils.debounce(ev => {
        this.search[input.dataset.n5eBuilderSearch] = ev.target.value;
        this._refocus = input.dataset.n5eBuilderSearch;
        this.render();
      }, 250));
      if ( this._refocus === input.dataset.n5eBuilderSearch ) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
    this._refocus = null;
  }

  /** @override  Closing with unsaved changes asks first. */
  async close(options = {}) {
    if ( this.dirty && !options.force ) {
      const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Discard changes?" },
        content: "<p>Close the Adversary Builder without saving?</p>" });
      if ( !ok ) return this;
    }
    return super.close(options);
  }

  /** Form changes: every named field writes into the draft. */
  static async #onForm(event, form, formData) {
    const f = formData.object;
    const d = this.draft;
    for ( const k of ["name", "img", "concept", "blurb", "clan", "affiliation", "armor", "hpSource", "freeformAbility"] ) if ( k in f ) d[k] = f[k];
    for ( const k of ["blurbFollowsConcept", "iconic", "epic", "rankBonus"] ) if ( k in f ) d[k] = !!f[k];
    if ( "level" in f ) {
      const level = Math.min(30, Math.max(1, Number(f.level) || 1));
      // A new adversary follows the baseline line until its modifiers are edited.
      if ( level !== d.level && !this.actor && !this.dirtyMods ) d.mods = assignLine(statLine(level, d.class).line);
      d.level = level;
    }
    if ( "partyLevel" in f ) d.partyLevel = f.partyLevel === "" || f.partyLevel == null ? null : Number(f.partyLevel);
    if ( "partySize" in f ) d.partySize = Number(f.partySize) || 0;
    for ( const k of ["hpMax", "cpMax"] ) if ( k in f ) d[k] = f[k] === "" || f[k] == null ? null : Number(f[k]);
    for ( const key of ABILITY_KEYS ) if ( `mods.${key}` in f && Number(f[`mods.${key}`]) !== d.mods[key] ) {
      d.mods[key] = Number(f[`mods.${key}`]) || 0;
      this.dirtyMods = true;
    }
    if ( ABILITY_KEYS.some(k => `fullSave.${k}` in f) ) d.fullSaves = ABILITY_KEYS.filter(k => f[`fullSave.${k}`]);
    for ( const [k, v] of Object.entries(f) ) {
      const m = k.match(/^traits\.(\d+)\.(name|rank|text)$/);
      if ( m && d.traits[Number(m[1])] ) d.traits[Number(m[1])][m[2]] = v;
    }
    this.dirty = true;
    return this.render();
  }

  static #onGoStep(event, target) { this.step = target.dataset.step; return this.render(); }
  static #onNext() { this.step = STEP_KEYS[Math.min(STEP_KEYS.length - 1, STEP_KEYS.indexOf(this.step) + 1)]; return this.render(); }
  static #onBack() { this.step = STEP_KEYS[Math.max(0, STEP_KEYS.indexOf(this.step) - 1)]; return this.render(); }

  /** Class, role and rank cards. */
  static #onPick(event, target) {
    const { field, value } = target.dataset;
    const firstLine = field === "class" && !this.actor && !this.dirtyMods;
    this.draft[field] = value;
    // A new adversary follows the baseline line until its modifiers are edited.
    if ( firstLine ) this.draft.mods = assignLine(statLine(this.draft.level, this.draft.class).line);
    this.dirty = true;
    return this.render();
  }

  static #onAddTrait() { this.draft.traits.push({ name: "", rank: this.draft.rank, text: "" }); this.dirty = true; return this.render(); }

  static #onRemoveEntry(event, target) {
    this.draft[target.dataset.list].splice(Number(target.dataset.index), 1);
    this.dirty = true;
    return this.render();
  }

  static #onAddEntry(event, target) {
    const { list, uuid, name, rank, discipline } = target.dataset;
    if ( this.draft[list].some(e => e.uuid === uuid || e.name === name) ) return ui.notifications.info(`${name} is already on the adversary.`);
    this.draft[list].push(list === "jutsu" ? { uuid, name, rank, discipline } : { uuid, name });
    this.dirty = true;
    return this.render();
  }

  static #onToggleAllRanks() { this.showAllRanks = !this.showAllRanks; return this.render(); }

  static #onUseBaseline() {
    this.draft.mods = assignLine(statLine(this.draft.level, this.draft.class).line);
    this.dirty = true;
    return this.render();
  }

  /** King Q-N30: keep the order of the assigned modifiers, with the new line's values. */
  static #onRebase() {
    this.draft.mods = rebaseMods(this.draft.mods, this.draft.level, this.draft.class);
    this.dirty = true;
    return this.render();
  }

  /** The draft's numbers for the Freeform windows (level and class from the draft; save DCs from the preview). */
  #freeformAdv() {
    let dcs = [];
    try {
      const { update } = draftToUpdate(this.draft, this.actor);
      const expanded = foundry.utils.expandObject(update);
      const base = this.actor ? this.actor.toObject() : { type: "npc", system: {} };
      const data = foundry.utils.mergeObject(base, { name: expanded.name, type: "npc", system: expanded.system }, { inplace: false });
      delete data._id;
      dcs = adversaryOf(new CONFIG.Actor.documentClass(data)).dcs;
    } catch (error) {
      console.warn("n5e | builder freeform DCs", error);
    }
    return { name: this.draft.name, level: Math.min(30, Math.max(1, Number(this.draft.level) || 1)), klass: this.draft.class,
      damageLevel: roleModifiers[this.draft.role]?.damageLevel ?? 0, dcs };
  }

  /** Open a Freeform window whose Create/Update writes into the draft (NPC3d D3). */
  async #openFreeform(kind, index = null) {
    const entry = index == null ? null : this.draft.freeform[index];
    const file = kind === "strike" ? "freeform-strike" : "freeform-jutsu";
    const { default: Window } = await import(`./${file}.mjs`);
    return new Window({ adv: this.#freeformAdv(), choices: entry?.choices, isEdit: !!entry, onSave: choices => {
      if ( entry ) Object.assign(entry, { choices, name: choices.name, dirty: true });
      else this.draft.freeform.push({ kind, name: choices.name, choices });
      this.dirty = true;
      return this.render();
    } }).render({ force: true });
  }

  static #onAddFreeform(event, target) { return this.#openFreeform(target.dataset.kind); }
  static #onEditFreeform(event, target) {
    const entry = this.draft.freeform[Number(target.dataset.index)];
    return entry ? this.#openFreeform(entry.kind, Number(target.dataset.index)) : null;
  }

  /** Create or Update, then open the sheet. */
  static async #onSave() {
    const plan = draftToUpdate(this.draft, this.actor);
    let actor = this.actor;
    if ( !actor ) {
      const expanded = foundry.utils.expandObject(plan.update);
      actor = await CONFIG.Actor.documentClass.create({ name: expanded.name, img: expanded.img, type: "npc", system: expanded.system }, { n5eBuilder: true });
    } else await actor.update(plan.update);
    if ( !actor ) return null;
    if ( plan.removed.length ) await actor.deleteEmbeddedDocuments("Item", plan.removed);
    if ( plan.traitEdits.length ) await actor.updateEmbeddedDocuments("Item", plan.traitEdits);
    const fromPacks = [];
    for ( const uuid of plan.fromUuid ) {
      const doc = await fromUuid(uuid);
      if ( !doc ) continue;
      const data = doc.toObject();
      // The same item twice on one NPC is refused, as everywhere else (FIN1).
      if ( actor.items.some(i => i.type === data.type && i.name === data.name) ) continue;
      fromPacks.push({ ...data, _stats: { ...(data._stats ?? {}), compendiumSource: uuid } });
    }
    const create = [...fromPacks, ...plan.typed];
    if ( create.length ) await actor.createEmbeddedDocuments("Item", create);
    // Freeform items, built from the saved adversary (NPC3).
    const adv = adversaryOf(actor);
    const build = f => (f.kind === "strike" ? buildStrike : buildJutsu)(f.choices, adv);
    if ( plan.freeform.create.length ) await actor.createEmbeddedDocuments("Item", plan.freeform.create.map(build));
    if ( plan.freeform.edit.length ) await actor.updateEmbeddedDocuments("Item", plan.freeform.edit.map(f => {
      const data = build(f);
      return { _id: f.id, name: data.name, system: data.system, flags: data.flags };
    }));
    this.dirty = false;
    await this.close({ force: true });
    return actor.sheet.render(true);
  }
}

/** Foundry's Create Actor for an NPC asks whether to open the builder (King Q-N25). */
export async function promptBuilder(actor) {
  if ( actor?.type !== "npc" ) return null;
  const yes = await foundry.applications.api.DialogV2.confirm({ window: { title: "Adversary Builder" },
    content: `<p>Open the Adversary Builder for ${foundry.utils.escapeHTML?.(actor.name) ?? actor.name}?</p>` });
  return yes ? AdversaryBuilder.open(actor) : null;
}

/** "Create adversary" on the Actors sidebar (GM). */
export function addBuilderButton(app, html) {
  if ( !game.user.isGM ) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const actions = root?.querySelector(".header-actions");
  if ( !actions || actions.querySelector("[data-n5e-create-adversary]") ) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.n5eCreateAdversary = "1";
  button.innerHTML = '<i class="fa-solid fa-user-ninja"></i> Create adversary';
  button.addEventListener("click", ev => { ev.preventDefault(); AdversaryBuilder.open(); });
  actions.append(button);
}
