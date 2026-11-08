/**
 * N5e ActiveEffect document. Token HUD status toggles create typed condition/state effects.
 *
 * Effect types (data models in module/data/effect/effects.mjs):
 *   condition      a ranked condition from the registry (system.key, system.ranks)
 *   state          a State such as Prone or Furious (system.key)
 *   amp            Battle / Reflex / Fortitude / Will / Clan Amp (system.ampType)
 *   stance, concentration, generic   other effects
 *
 * N5e also reads a few flags on any effect (all under flags.n5e):
 *   expires   {at: turnStart|turnEnd|nextTurnEnd, sourceUuid, placed}  ends on the source's turn
 *   state     a named state ("crash", "flow", "combatRival") other code checks for
 *   exclusive a group; applying one effect of the group removes the others
 *   tracker   {kind: mark|branded, ...}  Marks and Branded (rules/trackers.mjs)
 *   resave    {ability, dc, label, applied}  end-of-turn resave prompt
 *   gates     {n}  the 8-Inner Gates effect
 */
export default class N5eActiveEffect extends ActiveEffect {

  /**
   * @override  A stance's effects apply only while it is the active stance (one stance at a time).
   * Foundry checks isSuppressed on every prepare, so changing system.combat.activeStance turns the
   * stance's effects on and off with no extra bookkeeping.
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
      // The status id puts the condition's icon on the token and lets the HUD toggle it off.
      statuses: [key],
      origin,
      system: { key, ranks, sourceRank }
    };
  }

  /**
   * @override  Called by ActiveEffect.fromStatusEffect (token HUD, toggleStatusEffect).
   * Gives HUD-created effects the right N5e type so they behave like ones made by the system.
   */
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
