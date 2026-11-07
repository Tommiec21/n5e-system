/**
 * Jutsu (KB 11 schema, signed off in the Phase 1 plan).
 * Full text always stays on the item, so a jutsu without automated activities still posts a readable card.
 */
import * as S from "../fields/shared.mjs";
import { baseFields, activatableFields } from "./templates.mjs";
import { computeJutsuCost } from "../../rules/cost.mjs";
import { scopeApplies } from "../../rules/change-keys.mjs";
import { rankValue, upcastRanks, maxRankForLevel, abilityRequirement } from "../../rules/progression.mjs";

export default class JutsuData extends foundry.abstract.TypeDataModel {

  /** @override */
  static defineSchema() {
    return {
      ...baseFields(),
      ...activatableFields(),
      rank: S.rank("D"),
      discipline: S.str({ initial: "nin" }),     // nin | tai | gen | buki
      section: S.str(),                           // CONFIG.N5E.jutsuSections
      keywords: S.set(),
      stimuli: S.set(),
      unaware: S.bool(),
      ability: S.str(),                           // override; "" = discipline ability
      cost: S.obj({ mode: S.str({ initial: "chakra" }), value: S.num(0, { min: 0 }), text: S.str() }),
      components: S.components(),
      upcast: S.obj({
        preset: S.str({ initial: "standard3" }),
        costPerRank: S.num(null),
        perRank: S.arr(S.obj({ type: S.str(), value: S.str() })),
        thresholds: S.obj({ B: S.str(), A: S.str(), S: S.str() }),
        text: S.html()
      }),
      riders: S.arr(S.obj(S.riderFields())),
      chainEffects: S.obj({ 1: S.html(), 2: S.html(), 3: S.html() }),
      finisher: S.obj({ only: S.bool(), text: S.html() }),
      overcharge: S.obj({ text: S.html() }),
      hijutsu: S.obj({ clan: S.str(), branch: S.str() }),
      learned: S.obj({
        mode: S.str({ initial: "known" }),        // known | granted (granted don't count against Jutsu Known)
        grantedBy: S.str()
      })
    };
  }

  get isHijutsu() {
    return this.keywords.has("hijutsu") || !!this.hijutsu.clan;
  }

  /** Discipline key whose attack/DC this jutsu uses (Bukijutsu -> Taijutsu). */
  get castingDiscipline() {
    return this.discipline === "buki" ? "tai" : this.discipline;
  }

  /** Upcast cost per rank from the preset or the item. */
  get costPerRank() {
    if ( this.upcast.costPerRank != null ) return this.upcast.costPerRank;
    return globalThis.CONFIG?.N5E?.upcastPresets?.[this.upcast.preset]?.costPerRank ?? 0;
  }

  /**
   * Live cost at a cast rank for an actor (step 10 and at cast time).
   * @param {object} actorSystem
   * @param {string} [castRank]
   * @param {object} [choices]   the caster's pick when several multipliers/divisors apply (index)
   */
  computeCost(actorSystem, castRank = this.rank, { multiplierChoice, divisorChoice } = {}) {
    const pen = actorSystem?.conditionPenalties;
    const mods = actorSystem?.modifiers;
    const ctx = { discipline: this.discipline, keywords: this.keywords, rank: castRank };
    const additions = [];
    const subtractions = [];
    const multipliers = [];
    const divisors = [];
    for ( const c of mods?.cost ?? [] ) {
      if ( !scopeApplies(c.scope, ctx) ) continue;
      if ( c.op === "multiply" ) multipliers.push(c.value);
      else if ( c.op === "divide" ) divisors.push(c.value);
      else if ( c.value >= 0 ) additions.push(c.value);
      else subtractions.push(-c.value);
    }
    const baseAdds = [pen?.baseCost?.[this.discipline] ?? 0];
    return computeJutsuCost({
      base: this.cost.value,
      mode: this.cost.mode,
      upcastRanks: Math.max(0, rankValue(castRank) - rankValue(this.rank)),
      costPerRank: this.costPerRank,
      baseAdds, additions, subtractions, multipliers, divisors, multiplierChoice, divisorChoice
    });
  }

  /** Step 10: numbers for this actor, shown on sheets and cards. */
  prepareActorDerived(actor) {
    const sys = actor.system;
    const disc = sys.disciplines?.[this.castingDiscipline];
    let abilityKey = this.ability || disc?.ability;
    // Hijutsu Flexibility: the higher of the clan's two abilities by default; players may pick one
    // when the world setting allows it (King 2026-11-07).
    const flex = sys.grants?.hijutsuAbilities ?? [];
    if ( this.isHijutsu && !this.ability && flex.length ) {
      const choice = sys.grants?.hijutsuChoice;
      const allowPick = globalThis.game?.settings?.get?.("n5e", "hijutsuFlexibilityPick") ?? true;
      if ( allowPick && choice && flex.includes(choice) ) abilityKey = choice;
      else abilityKey = flex.reduce((best, a) => ((sys.abilities[a]?.mod ?? -99) > (sys.abilities[best]?.mod ?? -99) ? a : best));
    }
    const abilityMod = sys.abilities?.[abilityKey]?.mod ?? 0;
    const delta = abilityMod - (disc?.mod ?? 0);
    const requirement = this.isHijutsu ? null : abilityRequirement(this.rank);
    const castMax = sys.grants?.maxRank ?? maxRankForLevel(sys.level ?? 1);
    const cost = this.computeCost(sys);
    const missingAccess = [];
    for ( const kw of this.keywords ) {
      const def = globalThis.CONFIG?.N5E?.keywords?.[kw];
      if ( !def?.affinity || this.isHijutsu ) continue;
      if ( !sys.grants?.affinities?.has(def.affinity) ) missingAccess.push(kw);
    }
    this.live = {
      ability: abilityKey,
      attack: (disc?.attack ?? 0) + delta,
      dc: (disc?.dc ?? 0) + delta,
      cost: cost.cost,
      costBreakdown: cost,
      requirement,
      meetsRequirement: requirement == null || (sys.abilities?.[abilityKey]?.value ?? 0) >= requirement,
      upcastRanks: this.upcast.preset === "none" ? [] : upcastRanks(this.rank, castMax),
      missingAccess,
      castable: missingAccess.length === 0
    };
  }
}
