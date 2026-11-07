/**
 * N5e Item document. Rolling and use workflows arrive in Phase 3; Phase 1 only exposes data helpers.
 */
import { isV31Item, migrateV31Item } from "../migration/v31.mjs";

export default class N5eItem extends Item {

  /** @override  V3.1 data is converted in memory on every load (persisted by the migration runner). */
  static migrateData(source) {
    if ( isV31Item(source) ) migrateV31Item(source);
    return super.migrateData(source);
  }

  /** @override */
  getRollData() {
    const data = this.actor?.getRollData() ?? {};
    data.item = { ...(this.system.toObject?.() ?? {}) };
    if ( this.type === "jutsu" ) data.rank = CONFIG.N5E.ranks[this.system.rank]?.value ?? 0;
    return data;
  }
}
