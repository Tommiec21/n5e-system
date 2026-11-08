/**
 * Player character. Level comes from the class item (single class in v1; multiclass is an optional rule).
 *
 * Almost everything a character has is shared with NPCs and lives in CreatureData (creature.mjs):
 * abilities, skills, HP/CP, disciplines, DR, conditions, resources. This class only adds the
 * character-specific stored fields (biography details, Ryo, downtime, Favor, lifestyle) and how the
 * level is found.
 */
import CreatureData from "./creature.mjs";
import * as S from "../fields/shared.mjs";

export default class CharacterData extends CreatureData {

  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();
    schema.details = S.obj({
      biography: S.html(),
      xp: S.int(0, { min: 0 }),
      ambition: S.str(),
      drive: S.str(),
      goals: S.str(),
      fears: S.str(),
      age: S.str(),
      village: S.str(),
      ninjaRank: S.str()
    });
    schema.currency = S.obj({ ryo: S.int(0, { min: 0 }) });
    schema.downtime = S.int(0, { min: 0 });
    schema.favor = S.int(0);
    schema.lifestyle = S.str();
    return schema;
  }

  /** @override  Character level = total class levels (1-20). With no class yet, level 1. */
  _computeLevel() {
    const classes = this.parent?.items?.filter(i => i.type === "class") ?? [];
    const total = classes.reduce((sum, c) => sum + (c.system.levels || 0), 0);
    return Math.max(1, Math.min(20, total || 1));
  }

  /** @override  Everything in CreatureData, then the XP needed for the next level (the header shows it). */
  prepareDerivedData() {
    super.prepareDerivedData();
    const N5E = globalThis.CONFIG?.N5E;
    const xpTable = N5E?.progression?.xpToLevel ?? {};
    this.details.xpNext = this.level >= 20 ? null : (xpTable[this.level + 1] ?? null);
  }
}
