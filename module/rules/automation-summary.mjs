/**
 * What an item does, read from its data (STD5; docs/STD_SPEC.md "Reviewable in game"): every channel
 * (activities, Active Effects and their changes, rule elements, action effects, triggers, reaction
 * recipes, riders), a plain line for each, the notes kept for the table, and a status:
 *   automated  mechanics are data and nothing is left as a note
 *   partial    some mechanics are data; notes say what stays at the table
 *   note       only notes
 *   none       nothing authored
 * `mentions` flags text that names a mechanic while nothing is authored (the audit's review list).
 * Pure: plain item data in.
 */
import { summarizeElement } from "./action-effects.mjs";

const list = v => (Array.isArray(v) ? v : v ? [...v] : []);
const ACTIVITY = { attack: "Attack roll", save: "Saving throw", damage: "Damage", heal: "Healing", effect: "Applies an effect", utility: "Utility",
  check: "Check", inflict: "Inflicts a condition", summon: "Summon" };

const MECHANIC_TEXT = /\b(advantage|disadvantage|resistan(?:ce|t)|immun(?:e|ity)|bonus to|\+\d+ to|reaction|saving throw|\d+d\d+)\b/i;

export function automationOf(item) {
  const channels = [], notes = [];
  for ( const a of list(item.system?.activities) ) channels.push({ kind: "Activity", label: a.label || ACTIVITY[a.type] || a.type, summary: ACTIVITY[a.type] ?? a.type });
  const elementRows = (rules, origin, action = false) => {
    for ( const e of list(rules) ) {
      if ( !e || typeof e !== "object" ) continue;
      if ( e.key === "note" ) { notes.push({ label: e.label || origin, text: e.text ?? "" }); continue; }
      channels.push({ kind: e.on ? "Trigger" : action || e.scope === "action" ? "Action effect" : "Rule element", label: e.label || origin, summary: summarizeElement(e) });
    }
  };
  elementRows(item.flags?.n5e?.rules, item.name);
  // Cast options (STD6d: the Automation tab lists them too), and a Molding's casting-time change.
  const n5e = item.flags?.n5e ?? {};
  if ( n5e.castAs ) channels.push({ kind: "Casting time", label: item.name, summary: `A 1-Action Ninjutsu is cast as a ${n5e.castAs === "bonus" ? "Bonus Action" : "Reaction"}` });
  for ( const o of [n5e.castOption, ...list(n5e.castOptions)].filter(o => o && typeof o === "object") ) {
    channels.push({ kind: "Cast option", label: o.label || item.name, summary: castOptionSummary(o) });
  }
  for ( const fx of list(item.effects) ) {
    const n = fx.flags?.n5e ?? {};
    const action = n.applyTo === "action";
    const changes = list(fx.changes).filter(c => c?.key);
    if ( changes.length ) channels.push({ kind: action ? "Action effect" : "Effect", label: fx.name, summary: changes.map(c => `${c.key} ${c.value}`).join("; ") });
    elementRows(n.rules, fx.name, action);
  }
  const recipe = item.flags?.n5e?.reaction;
  if ( recipe?.enabled ) channels.push({ kind: "Reaction", label: item.name, summary: [recipe.multiplier !== 1 ? `damage ×${recipe.multiplier}` : "",
    recipe.reduction ? `reduce by ${recipe.reduction}` : "", recipe.cost ? `costs ${recipe.cost} ${recipe.pool}` : "", recipe.requireSight ? "needs sight" : "",
    recipe.spendReaction ? "uses the reaction" : "", recipe.ally ? `protects others within ${recipe.ally.range} ft${recipe.ally.includeSelf ? " and itself" : ""}` : "",
    recipe.requiresState ? `only in ${recipe.requiresState}` : ""].filter(Boolean).join(", ") });
  for ( const r of list(item.system?.riders) ) channels.push({ kind: "Rider", label: r.label || "Rider", summary: r.text || r.type || "" });
  const status = channels.length ? (notes.length ? "partial" : "automated") : notes.length ? "note" : "none";
  const text = String(item.system?.description ?? "").replace(/<[^>]+>/g, " ");
  return { channels, notes, status, mentions: status === "none" && MECHANIC_TEXT.test(text) };
}

/** One line for a cast option: what it applies to and what it does. */
function castOptionSummary(o) {
  const a = o.appliesTo ?? {};
  const when = [a.discipline, ...(a.keywords ?? []), a.namePrefix && `"${a.namePrefix}…"`, a.maxRank && `up to ${a.maxRank}`,
    a.requiresDamage && "deals damage", a.requiresHealing && "heals", o.requiresState && `in ${o.requiresState}`].filter(Boolean).join(", ");
  const does = [o.costDelta === "-rank" ? "cost −rank" : o.costDelta ? `cost ${o.costDelta}` : "", o.cost?.pool ? `spends ${o.cost.choose ? "any" : o.cost.amount ?? 1} ${o.cost.pool}` : "",
    o.damage?.formula ? `+${o.damage.formula} damage` : "", o.heal?.formula ? `+${o.heal.formula} ${o.heal.pool === "tempHp" ? "temporary HP" : "healing"}` : "",
    o.effect ? `applies ${o.effect.name ?? "an effect"}` : "", o.castAs ? `cast as a ${o.castAs === "bonus" ? "Bonus Action" : "Reaction"}` : "",
    o.rider ? "arms a rider" : "", o.note ? o.note : ""].filter(Boolean).join("; ");
  return `${when ? `${when}: ` : ""}${does || "an option in the cast dialog"}${o.auto ? " (on by default)" : ""}${o.oncePerTurn ? " (once per turn)" : ""}`;
}

export const STATUS_LABELS = { automated: "Automated", partial: "Partly automated", note: "Notes only", none: "Nothing authored" };
