/**
 * N5e Item document. Using items (casting, attacking, features) lives in module/workflow/; this
 * class holds the document-level behavior: V3.1 data conversion, auto-equip, and roll data.
 */
import { isV31Item, migrateV31Item } from "../migration/v31.mjs";

export default class N5eItem extends Item {

  /** @override  V3.1 data is converted in memory on every load (persisted by the migration runner). */
  static migrateData(source) {
    if ( isV31Item(source) ) migrateV31Item(source);
    return super.migrateData(source);
  }

  /**
   * @override
   * Auto-equip gear added to a character: armor (if none is equipped), weapons, and containers
   * (if none of that storage type is equipped yet, since only one of each type counts).
   */
  async _preCreate(data, options, user) {
    if ( (await super._preCreate(data, options, user)) === false ) return false;
    const actor = this.parent;
    // Only characters, only equippable types, only if it isn't equipped already.
    if ( actor?.type !== "character" || !("equipped" in (this.system ?? {})) || this.system.equipped ) return;
    let equip = false;
    if ( this.type === "weapon" ) equip = true;
    else if ( this.type === "armor" ) equip = !actor.items.some(i => i.type === "armor" && i.system.equipped);
    else if ( this.type === "container" ) {
      equip = !actor.items.some(i => i.type === "container" && i.system.equipped
        && i.system.containerType === this.system.containerType);
    }
    if ( equip ) this.updateSource({ "system.equipped": true });
  }

  /**
   * @override
   * The owner's roll data plus @item (this item's system data) and, for jutsu, @rank (E=0 ... S=5)
   * so formulas like "2d6 * @rank" work.
   */
  getRollData() {
    const data = this.actor?.getRollData() ?? {};
    data.item = { ...(this.system.toObject?.() ?? {}) };
    if ( this.type === "jutsu" ) data.rank = CONFIG.N5E.ranks[this.system.rank]?.value ?? 0;
    return data;
  }
}
