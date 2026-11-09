/**
 * Active Effect subtypes (Phase 1 plan, section 9). v13 supports system data models on effects.
 *   condition      one effect per condition; ranks stack on it; penalties from the registry
 *   state          States (separate from conditions; condition removal never touches them)
 *   amp            Battle / Reflex / Fortitude / Will / Clan
 *   stance         the single active stance
 *   concentration  a concentrated jutsu (max 2 per actor by default)
 *   generic        jutsu buffs, feature effects, item effects, ailments
 *
 * NOTE on stance and concentration: the live trackers are system.combat.activeStance and
 * system.combat.concentrating on the actor (item ids). These two effect types exist for data
 * imported from V3.1 and for future token display; the current workflows don't create them.
 *
 * Extra behavior any effect can opt into through flags.n5e (expires, state, exclusive, tracker,
 * resave, gates) is listed in module/documents/active-effect.mjs.
 */
import * as S from "../fields/shared.mjs";

const TDM = () => foundry.abstract.TypeDataModel;

/** A condition. Its rules (penalties, decay, removal) come from the registry entry for `key`. */
export class ConditionEffectData extends TDM() {
  static defineSchema() {
    return {
      key: S.str(),
      ranks: S.int(1, { min: 0 }),
      /** Rank of the inflicting jutsu (Corroded DR reduction, Charmed attitude shift). */
      sourceRank: S.str(),
      sourceUuid: S.str()
    };
  }

  /** Registry definition (core or clan-scoped). */
  get definition() {
    const N5E = globalThis.CONFIG?.N5E;
    return N5E?.conditions?.[this.key] ?? N5E?.clanConditions?.[this.key] ?? null;
  }

  get maxRanks() {
    return this.definition?.maxRanks ?? null;
  }

  /** Unranked conditions count as 1 rank; ranked ones never exceed their max. */
  prepareDerivedData() {
    const max = this.maxRanks;
    this.effectiveRanks = max == null ? 1 : max === 0 ? this.ranks : Math.min(this.ranks, max);
  }
}

/** A State (Prone, Grappled, Furious...): on or off, no ranks (CONFIG.N5E.states). */
export class StateEffectData extends TDM() {
  static defineSchema() {
    return {
      key: S.str(),
      /** For relational states (Hidden from / Engaged with): the other creature's actor or token uuid. */
      target: S.str()
    };
  }
}

/** An Amp. ampType drives the optional Amp limits (rules/trackers.mjs ampsToDisable). */
export class AmpEffectData extends TDM() {
  static defineSchema() {
    return {
      ampType: S.str({ initial: "battle" }),
      sourceUuid: S.str()
    };
  }
}

export class StanceEffectData extends TDM() {
  static defineSchema() {
    return {
      stanceUuid: S.str(),
      categories: S.set()
    };
  }
}

export class ConcentrationEffectData extends TDM() {
  static defineSchema() {
    return {
      jutsuUuid: S.str(),
      rank: S.str({ initial: "D" }),
      /** Cost actually paid at casting (after upcast and reductions); upkeep is half of it, round down. */
      cost: S.int(0, { min: 0 }),
      upkeep: S.int(0, { min: 0 }),
      stable: S.bool(),
      efficient: S.bool()
    };
  }
}

export class GenericEffectData extends TDM() {
  static defineSchema() {
    return {
      category: S.str(),         // jutsu | feature | item | ailment
      ailment: S.obj({ rank: S.str(), stage: S.int(0, { min: 0 }), dc: S.num(null), ability: S.str() })
    };
  }
}
