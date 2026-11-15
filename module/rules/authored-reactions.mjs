/** Declarative before-damage recipes. Formulas are dice expressions, never JavaScript. */
export function validateReactionRecipe(value) {
  if ( !value || value.version !== 1 || typeof value.enabled !== "boolean"
    || typeof value.reduction !== "string" || value.reduction.length > 500
    || ![0.5, 1, 2].includes(value.multiplier)
    || typeof value.requireSight !== "boolean" || typeof value.spendReaction !== "boolean"
    || typeof value.pool !== "string" || (value.pool && !/^[a-zA-Z][a-zA-Z0-9_-]{0,59}$/.test(value.pool))
    || !Number.isSafeInteger(value.cost) || value.cost < 0 || (value.cost && !value.pool)
    || (value.requiresDR !== undefined && typeof value.requiresDR !== "boolean")
    || (value.ally !== undefined && (typeof value.ally !== "object" || !Number.isSafeInteger(value.ally?.range) || value.ally.range < 0 || value.ally.range > 300
      || (value.ally.includeSelf !== undefined && typeof value.ally.includeSelf !== "boolean")))
    || (value.requiresState !== undefined && (typeof value.requiresState !== "string" || !/^[\w-]{0,60}$/.test(value.requiresState))) ) throw new Error("Invalid reaction recipe. Check formula, multiplier and resource cost.");
  return { version: 1, enabled: value.enabled, reduction: value.reduction.trim(), multiplier: value.multiplier,
    requireSight: value.requireSight, spendReaction: value.spendReaction, pool: value.pool, cost: value.cost, requiresDR: !!value.requiresDR,
    ...(value.ally ? { ally: { range: value.ally.range, includeSelf: !!value.ally.includeSelf } } : {}),
    ...(value.requiresState ? { requiresState: value.requiresState } : {}) };
}

const inState = (actor, state) => [...(actor.effects ?? [])].some(e => !e.disabled && e.flags?.n5e?.state === state);
const cannotReact = actor => ["dead", "unconscious", "incapacitated", "stunned"].some(s => actor.statuses?.has(s));

/** Can this creature use this recipe now (its reaction, its pool, its state)? */
function usable(actor, recipe) {
  if ( recipe.spendReaction && actor.flags?.n5e?.economy?.reaction ) return false;
  if ( recipe.cost && (actor.system.resources?.[recipe.pool]?.value ?? 0) < recipe.cost ) return false;
  if ( recipe.requiresState && !inState(actor, recipe.requiresState) ) return false;
  return true;
}

/**
 * ENG1c: reactions that protect another creature (recipe `ally: {range, includeSelf}`): offered to
 * creatures within range of the damaged one. Each offer names the reacting creature (`reactor`),
 * whose owner is asked and who pays the cost; the damage changes for the damaged creature.
 * @param {Actor} target
 * @param {{combat, instances, ignoreDR, genjutsu, others: {actor, distance}[]}} o
 */
export function allyReactionOffers(target, { combat, instances = [], ignoreDR = false, genjutsu = false, others = [] } = {}) {
  if ( !combat || !instances.some(i => i.amount > 0) ) return [];
  const offers = [];
  for ( const { actor, distance } of others ) {
    if ( !actor || actor === target || cannotReact(actor) ) continue;
    for ( const item of actor.items ?? [] ) {
      const raw = item.flags?.n5e?.reaction;
      if ( !raw?.enabled || !raw.ally ) continue;
      const recipe = validateReactionRecipe(raw);
      if ( !(distance <= recipe.ally.range) || !usable(actor, recipe) ) continue;
      if ( recipe.requiresDR && (ignoreDR || !instances.some(i => i.amount > 0 && !(genjutsu && i.type === "psychic"))) ) continue;
      offers.push({ item, reactor: actor, label: `${item.name} (${actor.name})`,
        trigger: `${actor.name}: use ${item.name} for ${target.name}?${recipe.cost ? ` Cost: ${recipe.cost} ${recipe.pool}.` : ""}`, terms: recipe });
    }
  }
  return offers;
}

/**
 * Before-damage reactions authored on items (flags.n5e.reaction; STD4: Uncanny Dodge and Deflection
 * are recipes on their features, not code). `requiresDR`: only damage DR applies to.
 */
export function authoredReactionOffers(actor, { combat, instances = [], visibility, ignoreDR = false, genjutsu = false } = {}) {
  if ( !combat || !instances.some(i => i.amount > 0)
    || ["dead", "unconscious", "incapacitated", "stunned"].some(s => actor.statuses?.has(s)) ) return [];
  const offers = [];
  for ( const item of actor.items ) {
    const raw = item.flags?.n5e?.reaction;
    if ( !raw?.enabled ) continue;
    const recipe = validateReactionRecipe(raw);
    if ( recipe.ally && !recipe.ally.includeSelf ) continue;
    if ( recipe.requiresState && !inState(actor, recipe.requiresState) ) continue;
    if ( recipe.spendReaction && actor.flags?.n5e?.economy?.reaction ) continue;
    if ( recipe.requiresDR && (ignoreDR || !instances.some(i => i.amount > 0 && !(genjutsu && i.type === "psychic"))) ) continue;
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
