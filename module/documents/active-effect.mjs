/**
 * N5e ActiveEffect document. Token HUD status toggles create typed condition/state effects.
 */
export default class N5eActiveEffect extends ActiveEffect {

  /**
   * @override  A stance's effects apply only while it is the active stance (one stance at a time).
   */
  get isSuppressed() {
    const item = this.parent;
    if ( item?.documentName === "Item" && item.type === "stance" && item.actor ) {
      if ( item.actor.system?.combat?.activeStance !== item.id ) return true;
    }
    return super.isSuppressed;
  }

  /** Effect data for a condition from the registry. */
  static conditionData(key, { ranks = 1, sourceRank = "", origin } = {}) {
    const def = CONFIG.N5E.conditions[key] ?? CONFIG.N5E.clanConditions[key];
    return {
      name: def?.label ?? key,
      img: def?.icon ?? "icons/svg/aura.svg",
      type: "condition",
      statuses: [key],
      origin,
      system: { key, ranks, sourceRank }
    };
  }

  /** @override  Called by ActiveEffect.fromStatusEffect (token HUD). */
  static async _fromStatusEffect(statusId, effectData, options) {
    const N5E = CONFIG.N5E;
    if ( N5E.conditions[statusId] || N5E.clanConditions[statusId] ) {
      effectData.type = "condition";
      effectData.system = { key: statusId, ranks: 1 };
    } else if ( N5E.states[statusId] ) {
      effectData.type = "state";
      effectData.system = { key: statusId };
    }
    return super._fromStatusEffect(statusId, effectData, options);
  }

  /** Display name with ranks, e.g. "Exhaustion 3". */
  get rankedName() {
    if ( this.type !== "condition" ) return this.name;
    const max = this.system.maxRanks;
    return max ? `${this.name} ${this.system.ranks}` : this.name;
  }
}
