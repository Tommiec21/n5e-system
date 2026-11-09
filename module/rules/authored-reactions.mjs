/** Declarative before-damage recipes. Formulas are dice expressions, never JavaScript. */
export function validateReactionRecipe(value) {
  if ( !value || value.version !== 1 || typeof value.enabled !== "boolean"
    || typeof value.reduction !== "string" || value.reduction.length > 500
    || ![0.5, 1, 2].includes(value.multiplier)
    || typeof value.requireSight !== "boolean" || typeof value.spendReaction !== "boolean"
    || typeof value.pool !== "string" || (value.pool && !/^[a-zA-Z][a-zA-Z0-9_-]{0,59}$/.test(value.pool))
    || !Number.isSafeInteger(value.cost) || value.cost < 0 || (value.cost && !value.pool) ) throw new Error("Invalid reaction recipe. Check formula, multiplier and resource cost.");
  return { version: 1, enabled: value.enabled, reduction: value.reduction.trim(), multiplier: value.multiplier,
    requireSight: value.requireSight, spendReaction: value.spendReaction, pool: value.pool, cost: value.cost };
}

export function authoredReactionOffers(actor, { combat, instances = [], visibility } = {}) {
  if ( !combat || !instances.some(i => i.amount > 0)
    || ["dead", "unconscious", "incapacitated", "stunned"].some(s => actor.statuses?.has(s)) ) return [];
  const offers = [];
  for ( const item of actor.items ) {
    const raw = item.flags?.n5e?.reaction;
    if ( !raw?.enabled ) continue;
    const recipe = validateReactionRecipe(raw);
    if ( recipe.spendReaction && actor.flags?.n5e?.economy?.reaction ) continue;
    if ( recipe.cost && (actor.system.resources?.[recipe.pool]?.value ?? 0) < recipe.cost ) continue;
    if ( recipe.requireSight ) {
      const sight = visibility();
      if ( sight?.visible == null ) throw new Error(`${item.name}: reaction visibility is unresolved.`);
      if ( !sight.visible ) continue;
    }
    offers.push({ item, label: item.name, trigger: `Use ${item.name}?${recipe.cost ? ` Cost: ${recipe.cost} ${recipe.pool}.` : ""}`, terms: recipe });
  }
  return offers;
}
