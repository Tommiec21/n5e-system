/**
 * NPCs, adversaries, summons, clones, and companions. Summons and clones are NPCs with a template
 * flag rather than separate actor types (Phase 1 plan).
 */
import CreatureData from "./creature.mjs";
import * as S from "../fields/shared.mjs";
import { poolMax } from "../../rules/progression.mjs";
import { dieFaces } from "../../rules/formula.mjs";
import { Breakdown } from "../../rules/breakdown.mjs";

export default class NPCData extends CreatureData {

  /** @override */
  static defineSchema() {
    const schema = super.defineSchema();
    schema.details = S.obj({
      biography: S.html(),
      level: S.int(1, { min: 0, max: 30 }),
      rank: S.str({ initial: "D" }),
      role: S.str({ initial: "standard" }),        // CONFIG.N5E.npcRoles
      template: S.str({ initial: "none" }),       // none|summon|clone|companion
      summoner: S.str(),                          // actor uuid
      summonRole: S.str(),
      tribe: S.str(),
      creatureType: S.str({ initial: "humanoid" })
    });
    schema.hitDie = S.str({ initial: "d8" });
    schema.chakraDie = S.str({ initial: "d8" });
    /** Direct overrides from stat blocks; null = use the level formula. */
    schema.hpMax = S.num(null, { min: 0 });
    schema.cpMax = S.num(null, { min: 0 });
    schema.jutsuSlots = S.resourcePool({ label: "Jutsu Slots", recoveryOn: "lr" });
    schema.diesAtZero = S.bool(true);
    return schema;
  }

  /** @override */
  _computeLevel() {
    return Math.max(0, this.details.level ?? 1);
  }

  /** @override */
  _preparePools({ conMod }) {
    const hitFaces = dieFaces(this.hitDie);
    const chakraFaces = dieFaces(this.chakraDie);
    super._preparePools({ hitFaces, chakraFaces, conMod });
    if ( this.hpMax != null ) {
      this.hp.max = this.hpMax + this.bonuses.hpMax;
      this.breakdowns["hp.max"] = new Breakdown("Hit Points").base("Stat block", this.hpMax).add("Bonuses", this.bonuses.hpMax);
    }
    if ( this.cpMax != null ) {
      this.cp.max = this.cpMax + this.bonuses.cpMax;
      this.breakdowns["cp.max"] = new Breakdown("Chakra Points").base("Stat block", this.cpMax).add("Bonuses", this.bonuses.cpMax);
    }
    if ( !this.level && this.hpMax == null ) this.hp.max = poolMax({ level: 0 });
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();
    this.jutsuSlots.maxValue = Number(this.jutsuSlots.max) || 0;
  }
}
