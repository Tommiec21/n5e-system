/**
 * N5e Actor document.
 * Applies core Active Effect changes normally (effects pass 1) and holds back "n5e.*" change keys for
 * the system's derived-data pipeline (effects pass 2), so custom keys never hit Foundry's property
 * application.
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

  /** @override */
  applyActiveEffects() {
    const overrides = {};
    this.statuses.clear();
    this._n5eChanges = [];
    const changes = [];
    for ( const effect of this.allApplicableEffects() ) {
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

  /** @override */
  getRollData() {
    return { ...super.getRollData(), ...(this.system.getRollData?.() ?? {}) };
  }

  /** Convenience: the actor's condition effect for a key, if any. */
  getCondition(key) {
    return this.effects.find(e => e.type === "condition" && e.system.key === key) ?? null;
  }

  /**
   * Add ranks to a condition (one effect per condition; ranks stack, clamped to max).
   * Phase 4 adds saves, immunity, and duration handling on top of this.
   */
  async addCondition(key, ranks = 1, { sourceRank = "", origin, duration } = {}) {
    const def = CONFIG.N5E.conditions[key] ?? CONFIG.N5E.clanConditions[key];
    if ( !def ) throw new Error(`Unknown condition: ${key}`);
    if ( rule("conditionResistance") && this.system.traits?.conditionImmune?.has(key) ) return null;
    const existing = this.getCondition(key);
    if ( existing ) {
      // New ranks reset the condition's duration (King 2026-11-07).
      const max = def.maxRanks ?? 1;
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
