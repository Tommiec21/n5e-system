/**
 * NPC sheet: the character sheet's tabs, rolls, casting and Combat tab, with a stat-block header
 * (level, rank, role, creature type, template; stat-block HP/CP and dice in edit mode) instead of
 * class progression and XP. Like dnd5e's NPC sheet sharing the character sheet's machinery.
 */
import CharacterSheet from "./character-sheet.mjs";
import { headerVM } from "../../view-models/character.mjs";
import { ranks, rankOrder } from "../../config/core.mjs";
import { npcRoles, npcTemplates } from "../../config/combat.mjs";

const opts = (choices, value) => Object.entries(choices).map(([v, l]) => ({ value: v, label: l?.label ?? l, selected: v === value }));

export default class NPCSheet extends CharacterSheet {
  static DEFAULT_OPTIONS = {
    classes: ["n5e", "sheet", "actor", "character", "npc", "n5e-v2"],
    position: { width: 860, height: 900 }
  };

  static PARTS = {
    ...CharacterSheet.PARTS,
    header: { template: "systems/n5e/templates/actor/npc/header.hbs" }
  };

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    if ( partId === "header" ) {
      const sys = this.actor.system;
      const src = this.actor._source.system;
      context.vm = headerVM(this.actor);
      context.npc = {
        level: src.details.level, hpMax: src.hpMax ?? "", cpMax: src.cpMax ?? "", hitDie: src.hitDie, chakraDie: src.chakraDie,
        creatureType: src.details.creatureType,
        rankOptions: opts(Object.fromEntries(rankOrder.map(r => [r, ranks[r].label])), src.details.rank),
        roleOptions: opts(npcRoles, src.details.role),
        templateOptions: opts(npcTemplates, src.details.template),
        summary: [`Level ${sys.level}`, ranks[src.details.rank]?.label, npcRoles[src.details.role],
          src.details.creatureType ? src.details.creatureType[0].toUpperCase() + src.details.creatureType.slice(1) : "",
          src.details.template !== "none" ? npcTemplates[src.details.template] : ""].filter(Boolean).join(" · ")
      };
    }
    return context;
  }
}
