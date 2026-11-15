/**
 * Hazards (PRESTD1 Part D-ii, PF2e emulation; King Q-P8: their own actor type). A trap or dangerous
 * place: noticed with Perception against its Stealth DC, disabled with a skill or toolkit check, a
 * trigger, and what it does (its attacks, saves and damage are features and jutsu with activities,
 * as on any NPC). Everything else is an NPC: it rolls, saves and takes damage like one; its hardness
 * adds to its Damage Reduction.
 */
import NPCData from "./npc.mjs";
import * as S from "../fields/shared.mjs";

export default class HazardData extends NPCData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.hazard = S.obj({
      kind: S.str({ initial: "simple" }),
      stealthDC: S.int(15, { min: 0 }),
      disable: S.obj({ skill: S.str({ initial: "tool:trappers" }), dc: S.int(15, { min: 0 }), note: S.str() }),
      hardness: S.int(0, { min: 0 }),
      trigger: S.html(),
      routine: S.html(),
      reset: S.str()
    });
    return schema;
  }

  /** @override Hardness adds to Damage Reduction. */
  _statParts(kind) {
    const parts = super._statParts(kind);
    if ( kind === "dr" && this.hazard?.hardness ) return [...parts, { label: "Hardness", value: this.hazard.hardness }];
    return parts;
  }
}
