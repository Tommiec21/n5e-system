/**
 * Vehicles (PRESTD1 Part D-ii, PF2e emulation; King Q-P8: their own actor type). Size, HP, AC and speed
 * as on any NPC, plus hardness (added to its Damage Reduction), crew and passengers (actor UUIDs, with
 * optional seat limits), a piloting check, and collision damage with a save.
 */
import NPCData from "./npc.mjs";
import * as S from "../fields/shared.mjs";

export default class VehicleData extends NPCData {
  static defineSchema() {
    const schema = super.defineSchema();
    schema.vehicle = S.obj({
      hardness: S.int(0, { min: 0 }),
      pilot: S.obj({ skill: S.str({ initial: "dex" }), dc: S.int(15, { min: 0 }) }),
      collision: S.obj({ damage: S.formula("2d10"), save: S.str({ initial: "dex" }), dc: S.int(15, { min: 0 }) }),
      capacity: S.obj({ crew: S.int(1, { min: 0 }), passengers: S.int(0, { min: 0 }) }),
      crew: S.arr(S.str({ blank: false })),
      passengers: S.arr(S.str({ blank: false })),
      notes: S.html()
    });
    return schema;
  }

  /** @override Hardness adds to Damage Reduction. */
  _statParts(kind) {
    const parts = super._statParts(kind);
    if ( kind === "dr" && this.vehicle?.hardness ) return [...parts, { label: "Hardness", value: this.vehicle.hardness }];
    return parts;
  }
}
