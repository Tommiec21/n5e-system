/**
 * Loot actors (PRESTD1 Part C; King 2026-11-15, Q-F2, Q-P5): a pile anyone may take from, a merchant
 * players buy from and sell to, or the party stash every player owns. Holds items and ryo.
 * Buy at the listed price times buyRate (1); sell at the price times sellRate (0.5); the GM may change
 * both per merchant.
 */
import * as S from "../fields/shared.mjs";

export default class LootActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      mode: S.str({ initial: "pile" }),            // pile | merchant | stash
      description: S.html(),
      currency: S.obj({ ryo: S.int(0, { min: 0 }) }),
      buyRate: S.num(1, { min: 0 }),
      sellRate: S.num(0.5, { min: 0 })
    };
  }
}
