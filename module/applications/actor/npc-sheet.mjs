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
import { npcHeaderVM, npcBuildVM, statBlockVM } from "../../view-models/npc.mjs";
import { statLine, ABILITY_KEYS, fullSaves } from "../../rules/adversary.mjs";
import { rule } from "../../rules/settings.mjs";
import { buildRows } from "../schema-form.mjs";

const T = name => `systems/n5e/templates/actor/npc/${name}.hbs`;

export const NPC_TEMPLATE_PATHS = [T("stat-block"), T("casting-lines")];

export default class NPCSheet extends CharacterSheet {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "sheet", "actor", "character", "npc", "n5e-v2"],
    position: { width: 860, height: 900 },
    actions: {
      npcApplyStatLine: NPCSheet.#onApplyStatLine,
      npcToggleFullSave: NPCSheet.#onToggleFullSave,
      npcToggleSkill: NPCSheet.#onToggleSkill
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
      context.limited = { name: actor.name, img: actor.img, blurb: d.blurb, publicHTML: await TextEditor.enrichHTML(d.publicNotes ?? "", { relativeTo: actor }) };
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
        break;
      case "jutsu":
      case "combat":
        // "Ninjutsu. +4 to hit, save DC 12" above the lists, as a stat block prints them.
        context.npcLines = statBlockVM(actor);
        break;
      case "biography":
        context.notes = {
          isGM: game.user.isGM, public: d.publicNotes, private: d.privateNotes, biography: d.biography,
          publicHTML: await TextEditor.enrichHTML(d.publicNotes ?? "", { relativeTo: actor }),
          privateHTML: game.user.isGM ? await TextEditor.enrichHTML(d.privateNotes ?? "", { relativeTo: actor }) : "",
          biographyHTML: await TextEditor.enrichHTML(d.biography ?? "", { relativeTo: actor })
        };
        if ( this.editMode ) context.rows = buildRows(actor.system.schema, actor._source.system, { skip: new Set(["abilities", "saves", "skills"]) });
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
}
