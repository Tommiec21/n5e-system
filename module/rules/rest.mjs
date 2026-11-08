/**
 * Rests (pure). KB 06 with King's rulings; limits and rations are GM settings (config/rules.mjs).
 *
 * Short (1 h): spend up to half your max Hit Dice and, separately, up to half your max Chakra Dice
 *   (rolled all at once, + Con per die); "sr", "rest" and "rest10m" recoveries; death saves reset.
 * Long (8 h): regain half max HP and half max CP; regain half of spent Hit and Chakra Dice; temp HP/CP
 *   end; counts as a Short Rest for recoveries (not dice spending); "lr" recoveries; −2 Exhaustion
 *   with food and drink.
 * Full (24 h): everything back; [Persists] conditions removed; all recoveries.
 * Envenomed: no rest benefits. Long and Full need at least 1 HP.
 */
import { rule } from "../rules-settings.mjs";
import { recoveryAllowed } from "./features.mjs";

const DAY = 86400;
const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const RECOVERS = {
  short: ["sr", "rest", "rest10m"],
  long: ["sr", "rest", "rest10m", "lr", "day"],
  full: ["sr", "rest", "rest10m", "lr", "day", "fr"]
};
export const REST_LABELS = { short: "Short Rest", long: "Long Rest", full: "Full Rest" };

const hasCondition = (actor, key) => list(actor.effects).some(e => e.type === "condition" && e.system?.key === key && !e.disabled);

/**
 * May this rest be taken now, and does it give its benefits?
 * @param {object} actor
 * @param {"short"|"long"|"full"} type
 * @param {object} [o]
 * @param {number} [o.now]       world time in seconds
 * @param {number} [o.rations]   rations in the pool now
 * @returns {{ok: boolean, benefit: boolean, reason: string, rationCost: number}}
 */
export function restCheck(actor, type, { now = 0, rations = rule("rationPool") } = {}) {
  const sys = actor.system;
  const counters = actor.flags?.n5e?.rest ?? {};
  let rationCost = 0;
  if ( type !== "short" && rule("restNeedsHP") && (sys.hp?.value ?? 0) < 1 ) {
    return { ok: false, benefit: false, reason: "A Long or Full Rest needs at least 1 HP.", rationCost };
  }
  if ( rule("rations") ) {
    if ( type === "full" && !rule("rationFullOnMissions") ) return { ok: false, benefit: false, reason: "No Full Rests on missions (Ration Pool rule).", rationCost };
    rationCost = type === "short" ? rule("rationShortCost") : type === "long" ? rule("rationLongCost") : 0;
    if ( rationCost > rations ) {
      return { ok: true, benefit: false, rationCost: 0, reason: `Not enough rations (${rations} / ${rationCost}): time passes with no benefit.` };
    }
  } else if ( rule("restLimit") === "count" ) {
    const sr = rule("shortRestsPerLong");
    const lr = rule("longRestsPerFull");
    if ( type === "short" && sr > 0 && (counters.srSinceLr ?? 0) >= sr ) return { ok: false, benefit: false, reason: `Only ${sr} Short Rest${sr > 1 ? "s" : ""} per Long Rest.`, rationCost };
    if ( type === "long" && lr > 0 && (counters.lrSinceFr ?? 0) >= lr ) return { ok: false, benefit: false, reason: `Only ${lr} Long Rest${lr > 1 ? "s" : ""} per Full Rest.`, rationCost };
  } else if ( rule("restLimit") === "time" ) {
    if ( type === "long" && counters.lastLr != null && now - counters.lastLr < DAY ) return { ok: false, benefit: false, reason: "Only one Long Rest per 24 hours.", rationCost };
    if ( type === "full" && counters.lastFr != null && now - counters.lastFr < 4 * DAY ) return { ok: false, benefit: false, reason: "Only one Full Rest per 96 hours.", rationCost };
  }
  if ( rule("envenomedBlocksHealing") && hasCondition(actor, "envenomed") ) {
    return { ok: true, benefit: false, rationCost, reason: "Envenomed: no benefit from resting." };
  }
  return { ok: true, benefit: true, reason: "", rationCost };
}

/** Most dice a Short Rest can spend from a pool: half the max (min 1), no more than remain. */
export function shortRestDice(pool) {
  return Math.min(pool?.value ?? 0, Math.max(1, Math.floor((pool?.max ?? 0) / 2)));
}

/**
 * Everything a rest changes.
 * @param {object} actor
 * @param {"short"|"long"|"full"} type
 * @param {object} [o]
 * @param {number} [o.hdSpent]   Short Rest: Hit Dice spent
 * @param {number} [o.cdSpent]   Short Rest: Chakra Dice spent
 * @param {number} [o.hdRoll]    their rolled total (dice + Con per die)
 * @param {number} [o.cdRoll]
 * @param {boolean} [o.food]     Long Rest with food and drink
 * @param {number} [o.now]
 * @param {boolean} [o.benefit=true]  false: only time passes (counters still advance)
 */
export function restPlan(actor, type, { hdSpent = 0, cdSpent = 0, hdRoll = 0, cdRoll = 0, food = true, now = 0, benefit = true } = {}) {
  const sys = actor.system;
  const update = {};
  const items = [];
  const conditions = [];
  const lines = [];
  const counters = { ...(actor.flags?.n5e?.rest ?? {}) };
  if ( type === "short" ) counters.srSinceLr = (counters.srSinceLr ?? 0) + 1;
  if ( type === "long" ) Object.assign(counters, { srSinceLr: 0, lrSinceFr: (counters.lrSinceFr ?? 0) + 1, lastLr: now });
  if ( type === "full" ) Object.assign(counters, { srSinceLr: 0, lrSinceFr: 0, lastLr: now, lastFr: now });
  update["flags.n5e.rest"] = counters;
  if ( !benefit ) return { update, items, conditions, lines: ["Time passes, but the rest gives no benefit."] };

  const hp = sys.hp;
  const cp = sys.cp;
  const hd = sys.hitDice;
  const cd = sys.chakraDice;
  if ( type === "short" ) {
    if ( hdSpent ) {
      const v = Math.min(hp.max, hp.value + Math.max(0, hdRoll));
      update["system.hp.value"] = v;
      update["system.hitDice.spent"] = (hd.max - hd.value) + hdSpent;
      lines.push(`Spent ${hdSpent} Hit ${hdSpent > 1 ? "Dice" : "Die"}: +${v - hp.value} HP`);
    }
    if ( cdSpent ) {
      const v = Math.min(cp.max, cp.value + Math.max(0, cdRoll));
      update["system.cp.value"] = v;
      update["system.chakraDice.spent"] = (cd.max - cd.value) + cdSpent;
      lines.push(`Spent ${cdSpent} Chakra ${cdSpent > 1 ? "Dice" : "Die"}: +${v - cp.value} CP`);
    }
  } else if ( type === "long" ) {
    const hv = Math.min(hp.max, hp.value + Math.floor(hp.max / 2));
    const cv = Math.min(cp.max, cp.value + Math.floor(cp.max / 2));
    const hdBack = hd.max - hd.value > 0 ? Math.max(1, Math.floor((hd.max - hd.value) / 2)) : 0;
    const cdBack = cd.max - cd.value > 0 ? Math.max(1, Math.floor((cd.max - cd.value) / 2)) : 0;
    Object.assign(update, { "system.hp.value": hv, "system.cp.value": cv, "system.hp.temp": 0, "system.cp.temp": 0,
      "system.hitDice.spent": Math.max(0, hd.max - hd.value - hdBack), "system.chakraDice.spent": Math.max(0, cd.max - cd.value - cdBack) });
    lines.push(`+${hv - hp.value} HP, +${cv - cp.value} CP (half of max)`);
    if ( hdBack || cdBack ) lines.push(`Regained ${hdBack} Hit and ${cdBack} Chakra ${hdBack + cdBack > 1 ? "Dice" : "Die"}`);
    if ( food && rule("exhaustionLongRest") && hasCondition(actor, "exhaustion") ) {
      conditions.push({ key: "exhaustion", ranks: 2 });
      lines.push("−2 Exhaustion (food and drink)");
    }
  } else {
    Object.assign(update, { "system.hp.value": hp.max, "system.cp.value": cp.max, "system.hp.temp": 0, "system.cp.temp": 0,
      "system.hitDice.spent": 0, "system.chakraDice.spent": 0 });
    lines.push("All HP, CP, Hit Dice and Chakra Dice restored");
    const persisting = list(actor.effects).filter(e => e.type === "condition" && !e.disabled
      && (globalThis.CONFIG?.N5E?.conditions?.[e.system?.key]?.persists ?? e.system?.persists));
    for ( const e of persisting ) conditions.push({ key: e.system.key, ranks: "all" });
    if ( persisting.length ) lines.push(`Removed: ${persisting.map(e => e.name).join(", ")}`);
  }
  // Death saves reset on any rest (failures persist until a Short Rest).
  update["system.deathSaves.success"] = 0;
  update["system.deathSaves.failure"] = 0;

  // Resource pools and limited uses.
  const recovers = new Set(RECOVERS[type]);
  const refreshed = [];
  for ( const [id, pool] of Object.entries(sys.resources ?? {}) ) {
    const r = list(pool.recovery).find(x => recovers.has(x.on) && recoveryAllowed(actor, x));
    if ( !r ) continue;
    const max = pool.maxValue ?? 0;
    let v = pool.value ?? 0;
    if ( r.amount === "setHalf" && type === "short" ) v = Math.max(v, Math.floor(max / 2));
    else if ( r.amount === "half" ) v = Math.min(max, v + Math.floor(max / 2));
    else v = max;
    // A Short Rest only uses a pool's short-rest rule; longer rests use the strongest one.
    if ( type !== "short" && list(pool.recovery).some(x => ["lr", "fr", "day"].includes(x.on) && recovers.has(x.on)) ) v = max;
    if ( v !== pool.value ) {
      update[`system.resources.${id}.value`] = v;
      refreshed.push(pool.label || id);
    }
  }
  for ( const i of list(actor.items) ) {
    const u = i.system?.uses;
    if ( u?.max && recovers.has(u.per) && (u.spent ?? 0) > 0 ) {
      items.push({ _id: i.id, "system.uses.spent": 0 });
      refreshed.push(i.name);
    }
  }
  if ( refreshed.length ) lines.push(`Recovered: ${refreshed.join(", ")}`);
  return { update, items, conditions, lines };
}
