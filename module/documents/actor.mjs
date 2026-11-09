/**
 * N5e Actor document.
 * Applies core Active Effect changes normally (effects pass 1) and holds back "n5e.*" change keys for
 * the system's derived-data pipeline (effects pass 2), so custom keys never hit Foundry's property
 * application.
 *
 * Prepare order for an actor (Foundry calls these; the N5e parts are in module/data/actor/creature.mjs):
 *   1. data model prepareBaseData        stored values, item grants
 *   2. applyActiveEffects (here)         core keys applied; n5e.* keys collected into _n5eChanges
 *   3. data model prepareDerivedData     every derived number (reads _n5eChanges via parseN5eChanges)
 *
 * Also the condition helpers every workflow uses: getCondition, addCondition, removeCondition.
 */
import { CHANGE_KEY_PREFIX } from "../rules/change-keys.mjs";
import { isV31Actor, migrateV31Actor } from "../migration/v31.mjs";
import { defaultDuration } from "../rules/condition-lifecycle.mjs";
import { rule } from "../rules-settings.mjs";

export default class N5eActor extends Actor {

  /** @override  V3.1 data is converted in memory on every load (persisted by the migration runner). */
  static migrateData(source) {
    if ( isV31Actor(source) ) {
      migrateV31Actor(source, { conditionKeys: new Set(Object.keys(CONFIG.N5E?.conditions ?? {})) });
    }
    return super.migrateData(source);
  }

  /**
   * @override
   * Same as core's applyActiveEffects (statuses, priority order, effect.apply), with one difference:
   * changes whose key starts with "n5e." are not applied to the actor. They are kept, with their
   * effect attached, in this._n5eChanges for the derived-data pipeline, which knows what they mean
   * (DR, crit range, cost changes, Mastery sources...; see module/rules/change-keys.mjs).
   */
  applyActiveEffects() {
    const overrides = {};
    this.statuses.clear();
    this._n5eChanges = [];
    const changes = [];
    for ( const effect of this.allApplicableEffects() ) {
      // effect.active is false for disabled effects and suppressed ones (inactive stances).
      if ( !effect.active ) continue;
      for ( const statusId of effect.statuses ) this.statuses.add(statusId);
      for ( const change of effect.changes ) {
        const c = foundry.utils.deepClone(change);
        c.effect = effect;
        c.priority ??= c.mode * 10;
        if ( c.key?.startsWith(CHANGE_KEY_PREFIX) ) this._n5eChanges.push(c);
        else changes.push(c);
      }
    }
    changes.sort((a, b) => a.priority - b.priority);
    for ( const change of changes ) {
      if ( !change.key ) continue;
      const result = change.effect.apply(this, change);
      Object.assign(overrides, result);
    }
    this.overrides = foundry.utils.expandObject(overrides);
  }

  /** @override  Adds the system's roll data (@prof, @level, @abilities..., @scale.<class>.<column>). */
  getRollData() {
    return { ...super.getRollData(), ...(this.system.getRollData?.() ?? {}) };
  }

  /** Convenience: the actor's condition effect for a key, if any. */
  getCondition(key) {
    return this.effects.find(e => e.type === "condition" && e.system.key === key) ?? null;
  }

  /**
   * Add ranks to a condition (one effect per condition; ranks stack, clamped to max).
   *   - Immunity (traits.conditionImmune) blocks it when the Condition resistance rule is on.
   *   - Existing condition: ranks add up and the duration restarts (King 2026-11-07).
   *   - New condition: the default 1-minute duration unless it persists or ends on its own
   *     (rules/condition-lifecycle.mjs defaultDuration); the combat round/turn is recorded either
   *     way, which "ends at the end of its next turn" conditions need.
   * @param {string} key          condition id (CONFIG.N5E.conditions or clanConditions)
   * @param {number} [ranks=1]
   * @param {object} [o]
   * @param {string} [o.sourceRank]  rank of the jutsu that caused it (Corroded and Charmed scale by it)
   * @param {string} [o.origin]      uuid of the source
   * @param {{seconds?: number, rounds?: number}} [o.duration]  overrides the default
   * @returns {Promise<ActiveEffect|null>}
   */
  async addCondition(key, ranks = 1, { sourceRank = "", origin, duration } = {}) {
    const def = CONFIG.N5E.conditions[key] ?? CONFIG.N5E.clanConditions[key];
    if ( !def ) throw new Error(`Unknown condition: ${key}`);
    if ( rule("conditionResistance") && this.system.traits?.conditionImmune?.has(key) ) return null;
    const existing = this.getCondition(key);
    if ( existing ) {
      // New ranks reset the condition's duration (King 2026-11-07).
      const max = def.maxRanks === 0 ? Infinity : def.maxRanks ?? 1;
      const next = existing.system.ranks + ranks;
      // Gaining the 11th rank of Exhaustion kills (optional rule).
      if ( def.flags?.deathAbove && next > def.flags.deathAbove && rule("exhaustionDeath") ) {
        await this.toggleStatusEffect("dead", { active: true, overlay: true });
      }
      return existing.update({
        "system.ranks": Math.min(max, existing.system.ranks + ranks),
        "duration.startTime": game.time.worldTime,
        "duration.startRound": game.combat?.round ?? null,
        "duration.startTurn": game.combat?.turn ?? null,
        ...(duration ? { "duration.seconds": duration.seconds ?? null, "duration.rounds": duration.rounds ?? null } : {})
      });
    }
    const data = CONFIG.ActiveEffect.documentClass.conditionData(key, { ranks, sourceRank, origin });
    const dur = duration ?? defaultDuration(key);
    if ( dur ) data.duration = { seconds: dur.seconds ?? null, rounds: dur.rounds ?? null, startTime: game.time.worldTime,
      startRound: game.combat?.round ?? null, startTurn: game.combat?.turn ?? null };
    else if ( game.combat ) data.duration = { startRound: game.combat.round, startTurn: game.combat.turn };
    return CONFIG.ActiveEffect.documentClass.create(data, { parent: this });
  }

  /** Remove ranks (or the whole condition when ranks >= current or ranks = "all"). */
  async removeCondition(key, ranks = "all") {
    const existing = this.getCondition(key);
    if ( !existing ) return null;
    if ( ranks === "all" || ranks >= existing.system.ranks ) return existing.delete();
    return existing.update({ "system.ranks": existing.system.ranks - ranks });
  }
}
