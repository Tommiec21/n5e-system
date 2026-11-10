/** Lossless association of damage amounts with saved rolls. Never evaluates or rerolls dice. */
export function damageRollTrace(rolls, instances, metadata = []) {
  return { version: 1, total: instances.reduce((sum, part) => sum + part.amount, 0),
    parts: instances.map((part, index) => {
      const roll = rolls[index], extra = metadata[index] ?? {};
      return { type: part.type ?? "", amount: part.amount, formula: String(roll?.formula ?? extra.formula ?? ""),
        normalFormula: extra.normalFormula ?? null, abilityMod: extra.abilityMod ?? null,
        dice: [...roll?.dice ?? []].slice(0, 50).map(die => ({ formula: die.formula ?? `${die.number ?? 1}d${die.faces}`,
          results: (die.results ?? []).slice(0, 256).map(r => ({ value: r.result, kept: r.active !== false && !r.discarded && !r.rerolled })) })) };
    }) };
}

export function damageFromMessage(message) {
  const stored = message.getFlag("n5e", "damage");
  if ( !stored || !Array.isArray(stored.instances) || !stored.instances.length
    || stored.instances.some(p => !Number.isFinite(p.amount) || p.amount < 0) ) throw new Error("This card has no valid stored damage amounts.");
  const instances = stored.instances.map(p => ({ ...p })), rolls = [...message.rolls ?? []];
  if ( rolls.length ) {
    if ( rolls.length !== instances.length || rolls.some((roll, i) => !Number.isFinite(roll.total) || roll.total !== instances[i].amount) ) throw new Error("Damage amounts do not match the saved rolls. Nothing was applied; inspect the original card.");
  }
  const total = instances.reduce((sum, p) => sum + p.amount, 0);
  if ( stored.total !== undefined && stored.total !== total ) throw new Error("The damage total does not match its typed parts. Nothing was applied.");
  const trace = damageRollTrace(rolls, instances, stored.rollTrace?.parts);
  trace.sourceUuid = message.uuid ?? null;
  trace.originUuid = stored.originUuid ?? null;
  trace.critical = !!stored.crit;
  trace.verifiedRolls = rolls.length === instances.length;
  if ( !rolls.length ) trace.parts = trace.parts.map(p => ({ ...p, formula: "", dice: [] }));
  return { ...stored, instances, total, rollTrace: trace,
    sourceVisibility: { whisper: [...message.whisper ?? []].map(u => typeof u === "string" ? u : u.id), blind: !!message.blind } };
}

export function damageApplicationTrace(actor, data, mode, plan, before, reaction = {}) {
  const pools = ["hp", "cp"].map(pool => ({ pool, before: before[pool], after: actor.system[pool].value,
    temporaryBefore: before[pool === "hp" ? "tempHp" : "tempCp"] ?? 0, temporaryAfter: actor.system[pool].temp ?? 0 }));
  return { actorUuid: actor.uuid, actorName: actor.name, sourceUuid: data.rollTrace?.sourceUuid ?? null, mode,
    rolled: data.total ?? data.instances.reduce((sum, p) => sum + p.amount, 0), damageInput: plan.raw,
    finalDamage: plan.total, hpDamage: plan.health, cpDamage: plan.chakra,
    steps: [...plan.steps], parts: structuredClone(plan.parts), pools,
    reaction: reaction.label ?? null, rolledReduction: reaction.flatReduction ?? 0, reactionMultiplier: reaction.multiplier ?? 1 };
}
