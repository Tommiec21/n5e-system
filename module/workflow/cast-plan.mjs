import { resourceChange } from "../rules/resources.mjs";
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
import { castBlockers } from "../rules/cast-checks.mjs";
import { rule } from "../rules-settings.mjs";
import { availableCastOptions, applyCastOptions, hasState, pyroclasmGain } from "../rules/cast-options.mjs";
import { effectiveActivities } from "../rules/activity-parse.mjs";
import { resolveCastDiscipline } from "../rules/cast-discipline.mjs";

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
 * @param {object[]} [sel.featureOptions] [{id, amount}] feature cast options (Chakra Compression, Crash...)
 * @param {{round, turn}} [sel.now]     current combat turn
 * @param {string} [sel.discipline]    cast as this discipline (multi-discipline jutsu; MDISC1)
 */
export function castPlan(actor, item, sel = {}) {
  const sys = actor.system;
  const j = item.system;
  const rank = sel.rank ?? j.rank;
  const problems = [];
  const warnings = [];
  // Cast discipline (MDISC1): one of the listed disciplines; locked while concentrating on it.
  let discipline;
  try { discipline = resolveCastDiscipline(actor, item, sel.discipline); }
  catch (error) { problems.push(error.message); discipline = resolveCastDiscipline(actor, item, ""); }

  // Feature cast options.
  const now = sel.now ?? null;
  const crash = hasState(actor, "crash");
  const available = availableCastOptions(actor, item, effectiveActivities(item), now, { discipline });
  const chosen = sel.featureOptions ?? available.filter(o => o.auto && !o.used).map(o => ({ id: o.id }));
  const fx = applyCastOptions(actor, item, chosen, available, rank);
  problems.push(...fx.problems);

  // Cost.
  const cost = j.computeCost(sys, rank, { multiplierChoice: sel.multiplierChoice, divisorChoice: sel.divisorChoice,
    noReduction: crash, subtract: crash ? 0 : fx.subtract, discipline });
  if ( crash && fx.subtract > 0 ) warnings.push("Crash: no cost reduction applies");
  const imported = item.flags?.n5e?.jutsuBookImport;
  const spendsChakra = j.cost?.mode === "chakra" || (!!imported && j.cost?.mode === "special" && j.cost.value > 0);
  if ( imported?.manualCost ) problems.push("This jutsu has a source-defined cost. Resolve it manually; automatic casting cannot assume a free cost.");
  const cp = sys.cp?.value ?? 0;
  if ( spendsChakra && cost.cost > cp ) problems.push(`Not enough chakra (${cp} / ${cost.cost} CP)`);
  if ( item.system.live?.castable === false ) problems.push("Missing the affinity for this jutsu's Release");
  // Conditions, components, ability requirement and rank cap (rules/cast-checks.mjs; CAST1).
  problems.push(...castBlockers(actor, item, { rank, discipline }));
  if ( ["nin", "gen"].includes(discipline) && list(actor.effects).some(e => e.flags?.n5e?.gates && !e.disabled) ) {
    problems.push("Can't cast Ninjutsu or Genjutsu while an Inner Gate is open");
  }

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
  if ( moldings && discipline !== "nin" ) problems.push("Moldings only work on Ninjutsu");
  if ( moldings > 1 && rule("moldingLimit") && !crash ) warnings.push("More than one Molding on a cast needs the Crash state");
  for ( const [id, amount] of Object.entries(fx.pools) ) pools[id] = (pools[id] ?? 0) + amount;
  if ( maneuvers > 1 ) warnings.push("Only one Maneuver per turn");
  for ( const [id, amount] of Object.entries(pools) ) {
    try { resourceChange(sys.resources?.[id], amount); }
    catch (error) { problems.push(error.message); }
  }

  // Concentration.
  const concentrating = list(sys.combat?.concentrating);
  // Ready a jutsu (KB 03): 1-Action casting time; chakra is paid and held; concentrate until released.
  const ready = sel.ready ? { trigger: String(sel.ready.trigger ?? "").slice(0, 200) } : null;
  if ( ready && j.activation?.type !== "action" ) problems.push("Only a jutsu with a casting time of 1 Action can be readied");
  const isConc = !!j.duration?.concentration || !!ready;
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
    // The discipline stays locked for the whole duration (King 2026-11-13, decision 11).
    update[`flags.n5e.castDiscipline.${item.id}`] = discipline;
  }
  if ( ready ) update[`flags.n5e.readied.${item.id}`] = { trigger: ready.trigger, rank, cost: cost.cost, readiedAt: now };
  Object.assign(update, castUpdates(actor, item) ?? {});
  for ( const [k, v] of Object.entries(fx.update) ) update[k] = v === "@now" ? now : v;
  const pyro = pyroclasmGain(actor, item, now);
  if ( pyro ) {
    // Spending Pyroclasm on this cast happens first; the new ember comes after.
    const spent = pools.pyroclasm ?? 0;
    pyro["system.resources.pyroclasm.value"] = Math.min(3, Math.max(0, (sys.resources.pyroclasm.value ?? 0) - spent) + 1);
    Object.assign(update, pyro);
  }
  // Action economy: mark the slot this cast uses; warn when it's already spent this turn.
  // Quickened Ninjutsu: 1 Action -> Bonus Action; Reactive Ninjutsu: 1 Action -> Reaction.
  const ids = new Set(used.map(o => o.system?.identifier));
  const castAs = j.activation?.type === "action" && ids.has("quickened-ninjutsu") ? "bonus"
    : j.activation?.type === "action" && ids.has("reactive-ninjutsu") ? "reaction" : j.activation?.type;
  const slot = economySlot(castAs);
  if ( slot && rule("actionEconomy") ) {
    if ( actor.flags?.n5e?.economy?.[slot] ) warnings.push(`Your ${slot === "bonus" ? "Bonus Action" : slot[0].toUpperCase() + slot.slice(1)} is already used this turn`);
    update[`flags.n5e.economy.${slot}`] = true;
    update["flags.n5e.economy.attackOrJutsu"] = true;
    if ( j.activation?.type === "fullTurn" ) update["flags.n5e.economy.bonus"] = true;
  }

  return {
    rank, discipline, upcast: rankValue(rank) - rankValue(j.rank),
    cost: cost.cost, costMode: j.cost?.mode, costText: j.cost?.text ?? "", costBreakdown: cost,
    choices: cost.choices ?? {}, cpAfter: spendsChakra ? Math.max(0, cp - cost.cost) : cp,
    pools, options: [...used.map(o => ({ id: o.id, name: o.name })), ...fx.names.map(name => ({ id: "", name }))], concentration,
    featureOptions: available, extraDamage: fx.damage, extraHeals: fx.heals, extraEffects: fx.effects, extraRolls: fx.rolls, notes: fx.notes, riders: fx.riders ?? [],
    pyroclasm: !!pyro, ready,
    problems, warnings, ok: problems.length === 0, update
  };
}
