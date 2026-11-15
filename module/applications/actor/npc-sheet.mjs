/**
 * NPC sheet (NPC1b): the character sheet's tabs, rolls, casting and Combat tab, with
 *   - a stat-block header in the Bingo Book's layout (templates/actor/npc/header.hbs);
 *   - a Build tab: the adversary profile, the modifier budget, and every computed number with its
 *     baseline and an override (templates/actor/npc/build.hbs; the math is rules/adversary.mjs);
 *   - a Notes tab in place of Biography (public notes, GM-only private notes, biography);
 *   - a limited view (name, portrait, blurb, public notes) for users with Limited permission.
 * Everything else is inherited, so changes to the character sheet apply here too.
 * NPCSimpleSheet (npc-simple-sheet.mjs) is the one-page alternative.
 */
import CharacterSheet from "./character-sheet.mjs";
import { headerVM } from "../../view-models/character.mjs";
import { npcHeaderVM, npcBuildVM, statBlockVM, npcDefensesVM, npcKnowledgeVM, learnedVM } from "../../view-models/npc.mjs";
import { statLine, ABILITY_KEYS, fullSaves } from "../../rules/adversary.mjs";
import { rule } from "../../rules/settings.mjs";
import { buildRows } from "../schema-form.mjs";

const T = name => `systems/n5e/templates/actor/npc/${name}.hbs`;

export const NPC_TEMPLATE_PATHS = [T("stat-block"), T("casting-lines"), T("embed"), "systems/n5e/templates/apps/adversary-builder-jutsu.hbs"];

export default class NPCSheet extends CharacterSheet {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "sheet", "actor", "character", "npc", "n5e-v2"],
    position: { width: 860, height: 900 },
    actions: {
      npcApplyStatLine: NPCSheet.#onApplyStatLine,
      npcToggleFullSave: NPCSheet.#onToggleFullSave,
      npcToggleSkill: NPCSheet.#onToggleSkill,
      npcAddTrait: NPCSheet.#onAddTrait,
      npcRemoveTrait: NPCSheet.#onRemoveTrait,
      npcAddSituational: NPCSheet.#onAddSituational,
      npcRemoveSituational: NPCSheet.#onRemoveSituational,
      npcAddKnowledge: NPCSheet.#onAddKnowledge,
      npcRemoveKnowledge: NPCSheet.#onRemoveKnowledge,
      npcMoveKnowledge: NPCSheet.#onMoveKnowledge,
      npcToggleLearned: NPCSheet.#onToggleLearned,
      npcOpenBuilder: NPCSheet.#onOpenBuilder,
      npcNewFreeform: NPCSheet.#onNewFreeform
    }
  };

  static PARTS = {
    ...CharacterSheet.PARTS,
    header: { template: T("header") },
    build: { template: T("build"), scrollable: [""] },
    biography: { template: T("notes"), scrollable: [""] },
    limited: { template: T("limited") }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "main", label: "Main" },
        { id: "build", label: "Build" },
        { id: "combat", label: "Combat" },
        { id: "jutsu", label: "Jutsu" },
        { id: "inventory", label: "Inventory" },
        { id: "features", label: "Features" },
        { id: "effects", label: "Effects" },
        { id: "biography", label: "Notes" }
      ],
      initial: "main"
    }
  };

  /** The Freeform buttons at the top of the Jutsu and Combat tabs (an editable sheet only). */
  #addFreeformButtons() {
    if ( !this.isEditable || this.isLimitedView ) return;
    for ( const [tab, kind, label] of [["jutsu", "jutsu", "New Freeform Jutsu"], ["combat", "strike", "New Freeform Strike"]] ) {
      const section = this.element.querySelector(`section.tab[data-tab="${tab}"]`);
      if ( !section || section.querySelector("[data-n5e-new-freeform]") ) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "n5e-new-freeform";
      button.dataset.action = "npcNewFreeform";
      button.dataset.kind = kind;
      button.dataset.n5eNewFreeform = kind;
      button.innerHTML = `<i class="fa-solid fa-wand-sparkles"></i> ${label}`;
      section.prepend(button);
    }
  }

  /** A user with Limited permission (and no more) sees the limited view only. */
  get isLimitedView() {
    return !game.user.isGM && this.actor.limited;
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if ( this.isLimitedView ) options.parts = ["limited"];
    else options.parts = (options.parts ?? Object.keys(this.constructor.PARTS)).filter(p => p !== "limited");
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const actor = this.actor;
    const d = actor.system.details;
    if ( partId === "limited" ) {
      const learned = learnedVM(actor);
      for ( const e of learned ) e.text = await TextEditor.enrichHTML(e.text ?? "", { relativeTo: actor });
      context.limited = { name: actor.name, img: actor.img, blurb: d.blurb, learned,
        publicHTML: await TextEditor.enrichHTML(d.publicNotes ?? "", { relativeTo: actor }) };
      return context;
    }
    context = await super._preparePartContext(partId, context, options);
    switch ( partId ) {
      case "header":
        context.vm = headerVM(actor);
        context.npc = npcHeaderVM(actor);
        break;
      case "build":
        context.tab = context.tabs.build;
        context.vm = npcBuildVM(actor, { partyManual: rule("adversaryPartySize") === "manual" });
        context.defenses = npcDefensesVM(actor);
        context.knowledge = npcKnowledgeVM(actor);
        break;
      case "jutsu":
      case "combat":
        // "Ninjutsu. +4 to hit, save DC 12" above the lists, as a stat block prints them.
        context.npcLines = statBlockVM(actor);
        break;
      case "biography":
        context.notes = {
          isGM: game.user.isGM, public: d.publicNotes, private: d.privateNotes, biography: d.biography, concept: game.user.isGM ? d.concept : "",
          publicHTML: await TextEditor.enrichHTML(d.publicNotes ?? "", { relativeTo: actor }),
          privateHTML: game.user.isGM ? await TextEditor.enrichHTML(d.privateNotes ?? "", { relativeTo: actor }) : "",
          biographyHTML: await TextEditor.enrichHTML(d.biography ?? "", { relativeTo: actor })
        };
        // The raw field editor leaves out everything the header and Build tab already edit, so no field
        // is in the form twice (NPC1c).
        if ( this.editMode ) context.rows = buildRows(actor.system.schema, actor._source.system, { skip: new Set(["abilities", "saves", "skills",
          "details", "adversary", "traits", "hpMax", "cpMax", "diesAtZero", "allied", "situational", "knowledge"]) });
        break;
    }
    return context;
  }

  /** "Use baseline": the six modifiers become the baseline line, highest first in ability order. */
  static async #onApplyStatLine() {
    if ( !this.isEditable ) return;
    const { details } = this.actor.system;
    const { line } = statLine(details.level, details.class);
    return this.actor.update(Object.fromEntries(ABILITY_KEYS.map((key, i) => [`system.adversary.mods.${key}`, line[i]])));
  }

  /** Tick or untick a fully proficient save. The first tick starts from the saves in use now. */
  static async #onToggleFullSave(event, target) {
    if ( !this.isEditable ) return;
    const key = target.dataset.key;
    const current = new Set(fullSaves(this.actor.system.adversaryProfile));
    if ( current.has(key) ) current.delete(key); else current.add(key);
    return this.actor.update({ "system.adversary.fullSaves": ABILITY_KEYS.filter(k => current.has(k)) });
  }

  /** Tick or untick a trained skill (a button, so the Main tab's own checkbox isn't doubled in the form). */
  static async #onToggleSkill(event, target) {
    if ( !this.isEditable ) return;
    const key = target.dataset.key;
    return this.actor.update({ [`system.skills.${key}.proficient`]: !this.actor._source.system.skills?.[key]?.proficient });
  }

  /**
   * @override
   * Rows of list fields are edited in place ("system.situational.0.when"); they are merged into the
   * stored arrays here, so the arrays are saved whole.
   */
  _processFormData(event, form, formData) {
    const flat = formData.object;
    const src = this.actor._source.system;
    const lists = { situational: foundry.utils.deepClone(src.situational ?? []), "knowledge.entries": foundry.utils.deepClone(src.knowledge?.entries ?? []) };
    const touched = new Set();
    for ( const [key, value] of Object.entries(flat) ) {
      const m = key.match(/^system\.(situational|knowledge\.entries)\.(\d+)\.(\w+)$/);
      if ( !m ) continue;
      const row = lists[m[1]][Number(m[2])];
      if ( row ) row[m[3]] = m[3] === "value" ? Number(value) || 0 : value;
      touched.add(m[1]);
      delete flat[key];
    }
    for ( const name of touched ) flat[`system.${name}`] = lists[name];
    return super._processFormData(event, form, formData);
  }

  /** @override  The learnable list takes items dragged from this sheet (NPC1c C4). */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#addFreeformButtons();
    const zone = this.element.querySelector("[data-n5e-learn-drop]");
    if ( !zone || !this.isEditable ) return;
    zone.addEventListener("dragover", ev => { ev.preventDefault(); zone.classList.add("over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      zone.classList.remove("over");
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(ev);
      const item = data?.type === "Item" && data.uuid ? await fromUuid(data.uuid) : null;
      if ( !item || item.parent !== this.actor ) return ui.notifications.warn("Drag a feature, trait, jutsu or item from this NPC's own sheet.");
      await this.#addKnowledge({ kind: "item", ref: item.id, label: item.name });
    });
  }

  /** Add one learnable entry (no duplicates). */
  async #addKnowledge(entry) {
    const k = foundry.utils.deepClone(this.actor._source.system.knowledge ?? { entries: [], learned: [] });
    if ( k.entries.some(e => e.kind === entry.kind && e.ref && e.ref === entry.ref) ) return ui.notifications.info(`${entry.label} is already on the list.`);
    k.entries.push({ id: foundry.utils.randomID(), note: "", ...entry });
    return this.actor.update({ "system.knowledge.entries": k.entries });
  }

  /** Add a damage type, condition or language to a set (Build tab chips). */
  static async #onAddTrait(event, target) {
    if ( !this.isEditable ) return;
    const field = target.dataset.field;
    const row = target.closest(".build-set");
    const value = row?.querySelector("[data-n5e-trait-custom]")?.value.trim() || row?.querySelector("[data-n5e-trait-pick]")?.value;
    if ( !value ) return;
    const current = new Set(field.split(".").reduce((o, k) => o?.[k], this.actor._source.system) ?? []);
    current.add(value);
    return this.actor.update({ [`system.${field}`]: [...current] });
  }

  static async #onRemoveTrait(event, target) {
    if ( !this.isEditable ) return;
    const { field, key } = target.dataset;
    const current = new Set(field.split(".").reduce((o, k) => o?.[k], this.actor._source.system) ?? []);
    current.delete(key);
    return this.actor.update({ [`system.${field}`]: [...current] });
  }

  static async #onAddSituational() {
    if ( !this.isEditable ) return;
    const list = foundry.utils.deepClone(this.actor._source.system.situational ?? []);
    list.push({ skill: "ste", value: 2, when: "" });
    return this.actor.update({ "system.situational": list });
  }

  static async #onRemoveSituational(event, target) {
    if ( !this.isEditable ) return;
    const list = foundry.utils.deepClone(this.actor._source.system.situational ?? []);
    list.splice(Number(target.dataset.index), 1);
    return this.actor.update({ "system.situational": list });
  }

  static async #onAddKnowledge(event, target) {
    if ( !this.isEditable ) return;
    const row = target.closest(".build-row");
    if ( target.dataset.kind === "stat" ) {
      const select = row?.querySelector("[data-n5e-learn-stat]");
      if ( !select?.value ) return;
      return this.#addKnowledge({ kind: "stat", ref: select.value, label: select.selectedOptions[0]?.textContent ?? select.value });
    }
    const text = row?.querySelector("[data-n5e-learn-text]")?.value.trim();
    if ( !text ) return;
    return this.#addKnowledge({ kind: "text", ref: "", label: "Note", note: text });
  }

  static async #onRemoveKnowledge(event, target) {
    if ( !this.isEditable ) return;
    const k = foundry.utils.deepClone(this.actor._source.system.knowledge);
    const [gone] = k.entries.splice(Number(target.dataset.index), 1);
    return this.actor.update({ "system.knowledge.entries": k.entries, "system.knowledge.learned": k.learned.filter(id => id !== gone?.id) });
  }

  static async #onMoveKnowledge(event, target) {
    if ( !this.isEditable ) return;
    const entries = foundry.utils.deepClone(this.actor._source.system.knowledge.entries);
    const i = Number(target.dataset.index), j = i + Number(target.dataset.dir);
    if ( j < 0 || j >= entries.length ) return;
    [entries[i], entries[j]] = [entries[j], entries[i]];
    return this.actor.update({ "system.knowledge.entries": entries });
  }

  /** The GM marks an entry known or not known to the party by hand (NPC1c C6). */
  static async #onToggleLearned(event, target) {
    if ( !this.isEditable ) return;
    const learned = new Set(this.actor._source.system.knowledge.learned ?? []);
    if ( learned.has(target.dataset.id) ) learned.delete(target.dataset.id); else learned.add(target.dataset.id);
    return this.actor.update({ "system.knowledge.learned": [...learned] });
  }

  /** The Adversary Builder for this NPC (NPC2). */
  static async #onOpenBuilder() {
    if ( !this.isEditable ) return;
    const { default: AdversaryBuilder } = await import("../npc/adversary-builder.mjs");
    return AdversaryBuilder.open(this.actor);
  }

  /** "New Freeform Jutsu" (Jutsu tab) and "New Freeform Strike" (Combat tab) (NPC3d D3). */
  static async #onNewFreeform(event, target) {
    if ( !this.isEditable ) return;
    const file = target.dataset.kind === "strike" ? "freeform-strike" : "freeform-jutsu";
    const { default: Window } = await import(`../npc/${file}.mjs`);
    return new Window({ actor: this.actor }).render({ force: true });
  }
}
