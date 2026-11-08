/**
 * Cast plan (pure): everything casting a jutsu will change, worked out before anything is spent, so
 * the cast dialog can preview it and refuse what isn't allowed.
 *
 *   - Cost at the chosen rank, with the caster's pick among several multipliers/divisors (KB 04).
 *   - Moldings spend Focus (Ninjutsu only; one per cast unless in Crash), Assault Maneuvers spend
 *     Superiority Dice (one per turn).
 *   - Concentration jutsu start concentration and record the cost paid (upkeep = half of it); at the
 *     limit, one current jutsu must end.
 *   - Chain and Combo/Finisher update (rules/cast-tracking).
 */
import { castUpdates } from "../rules/cast-tracking.mjs";
import { resourceCost } from "../rules/resource-cost.mjs";
import { rankValue } from "../rules/progression.mjs";
import { economySlot } from "../rules/turn-start.mjs";
import { rule } from "../rules-settings.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);

/**
 * @param {object} actor
 * @param {object} item                 the jutsu (prepared, owned)
 * @param {object} [sel]
 * @param {string} [sel.rank]           cast rank (default: the jutsu's rank)
 * @param {number} [sel.multiplierChoice]
 * @param {number} [sel.divisorChoice]
 * @param {string[]} [sel.options]      ids of Molding / Maneuver items to use
 * @param {string} [sel.endConcentration] id of a concentrated jutsu to end (when at the limit)
 */
export function castPlan(actor, item, sel = {}) {
  const sys = actor.system;
  const j = item.system;
  const rank = sel.rank ?? j.rank;
  const problems = [];
  const warnings = [];

  // Cost.
  const cost = j.computeCost(sys, rank, { multiplierChoice: sel.multiplierChoice, divisorChoice: sel.divisorChoice });
  const spendsChakra = j.cost?.mode === "chakra";
  const cp = sys.cp?.value ?? 0;
  if ( spendsChakra && cost.cost > cp ) problems.push(`Not enough chakra (${cp} / ${cost.cost} CP)`);
  if ( item.system.live?.castable === false ) problems.push("Missing the affinity for this jutsu's Release");

  // Moldings and maneuvers.
  const pools = {};
  const used = list(sel.options).map(id => actor.items.get?.(id) ?? list(actor.items).find(i => i.id === id)).filter(Boolean);
  let moldings = 0;
  let maneuvers = 0;
  for ( const opt of used ) {
    const rc = resourceCost(opt);
    if ( !rc.pool ) continue;
    pools[rc.pool] = (pools[rc.pool] ?? 0) + rc.amount;
    if ( rc.pool === "focus" ) moldings++;
    else maneuvers++;
  }
  if ( moldings && j.discipline !== "nin" ) problems.push("Moldings only work on Ninjutsu");
  if ( moldings > 1 && rule("moldingLimit") ) warnings.push("More than one Molding on a cast needs the Crash state");
  if ( maneuvers > 1 ) warnings.push("Only one Maneuver per turn");
  for ( const [id, amount] of Object.entries(pools) ) {
    const have = sys.resources?.[id]?.value ?? 0;
    if ( have < amount ) problems.push(`Not enough ${sys.resources?.[id]?.label || id} (${have} / ${amount})`);
  }

  // Concentration.
  const concentrating = list(sys.combat?.concentrating);
  const isConc = !!j.duration?.concentration;
  let concentration = null;
  if ( isConc ) {
    const max = sys.concentration?.max ?? 2;
    const recast = concentrating.includes(item.id);
    const atLimit = !recast && concentrating.length >= max;
    const ending = atLimit ? sel.endConcentration : null;
    if ( atLimit && !ending ) problems.push(`Already concentrating on ${max} jutsu: choose one to end`);
    const keep = concentrating.filter(id => id !== ending && id !== item.id);
    concentration = { atLimit, ending, list: [...keep, item.id] };
  }

  // Actor update.
  const update = {};
  if ( spendsChakra && cost.cost ) update["system.cp.value"] = Math.max(0, cp - cost.cost);
  for ( const [id, amount] of Object.entries(pools) ) {
    update[`system.resources.${id}.value`] = Math.max(0, (sys.resources?.[id]?.value ?? 0) - amount);
  }
  if ( concentration ) {
    update["system.combat.concentrating"] = concentration.list;
    update[`flags.n5e.concentrationPaid.${item.id}`] = spendsChakra ? cost.cost : 0;
    if ( concentration.ending ) update[`flags.n5e.concentrationPaid.-=${concentration.ending}`] = null;
  }
  Object.assign(update, castUpdates(actor, item) ?? {});
  // Action economy: mark the slot this cast uses; warn when it's already spent this turn.
  const slot = economySlot(j.activation?.type);
  if ( slot && rule("actionEconomy") ) {
    if ( actor.flags?.n5e?.economy?.[slot] ) warnings.push(`Your ${slot === "bonus" ? "Bonus Action" : slot[0].toUpperCase() + slot.slice(1)} is already used this turn`);
    update[`flags.n5e.economy.${slot}`] = true;
    if ( j.activation?.type === "fullTurn" ) update["flags.n5e.economy.bonus"] = true;
  }

  return {
    rank, upcast: rankValue(rank) - rankValue(j.rank),
    cost: cost.cost, costMode: j.cost?.mode, costText: j.cost?.text ?? "", costBreakdown: cost,
    choices: cost.choices ?? {}, cpAfter: spendsChakra ? Math.max(0, cp - cost.cost) : cp,
    pools, options: used.map(o => ({ id: o.id, name: o.name })), concentration,
    problems, warnings, ok: problems.length === 0, update
  };
}
