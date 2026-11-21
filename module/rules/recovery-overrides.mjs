/**
 * Class & Clan limits (King 2026-11-21): the GM can change when a class, subclass or clan feature's
 * limit comes back. The world setting `limitRecovery` maps a limit's key to a choice below:
 *   "<owner item identifier>.<pool id>"  a resource pool (Skilled Exploits: "hunters-exploits.skilledExploits")
 *   "amp:<amp key>"                      an Amp card's uses
 * A blank or missing choice keeps the recovery as written. Pure.
 */

/** Recharge choices for resource pools: label and the recovery list it stands for. */
export const POOL_RECOVERY = Object.freeze({
  rest10m: { label: "10 minutes of rest", recovery: [{ on: "rest10m", amount: "all" }] },
  sr: { label: "Short Rest", recovery: [{ on: "sr", amount: "all" }] },
  halfSrFullLr: { label: "Half on a Short Rest, all on a Long Rest", recovery: [{ on: "sr", amount: "half" }, { on: "lr", amount: "all" }] },
  lr: { label: "Long Rest", recovery: [{ on: "lr", amount: "all" }] },
  fr: { label: "Full Rest", recovery: [{ on: "fr", amount: "all" }] },
  day: { label: "Each day", recovery: [{ on: "day", amount: "all" }] },
  initiative: { label: "Initiative (combat start and end)", recovery: [{ on: "encounter", amount: "all" }] },
  round: { label: "Each round", recovery: [{ on: "round", amount: "all" }] },
  turn: { label: "Start of your turn", recovery: [{ on: "turn", amount: "all" }] },
  never: { label: "Never (only by its feature)", recovery: [] }
});

/** Recharge choices for Amp uses (they come back on rests). */
export const AMP_RECOVERY = Object.freeze({
  rest10m: "10 minutes of rest", sr: "Short Rest", lr: "Long Rest", fr: "Full Rest", day: "Each day"
});

const ON_LABELS = { rest10m: "10 minutes of rest", sr: "Short Rest", rest: "any rest", lr: "Long Rest", fr: "Full Rest", day: "each day",
  encounter: "combat start and end", round: "each round", turn: "start of turn", turnStart: "start of turn", event: "by its feature", never: "never" };

export const poolLimitKey = (ownerIdentifier, poolId) => `${ownerIdentifier}.${poolId}`;
export const ampLimitKey = key => `amp:${key}`;

/** How a recovery list reads ("Half on a Short Rest, all on a Long Rest"). */
export function recoveryText(recovery = []) {
  const list = Array.isArray(recovery) ? recovery : [];
  if ( !list.length ) return "Never (only by its feature)";
  if ( list.every(r => r.on === "event") ) return "By its feature";
  const preset = Object.values(POOL_RECOVERY).find(p => JSON.stringify(p.recovery.map(r => [r.on, r.amount ?? "all"]))
    === JSON.stringify(list.map(r => [r.on, r.amount || "all"])));
  if ( preset ) return preset.label;
  return list.map(r => {
    const amount = r.amount === "half" ? "half" : r.amount === "formula" ? `${r.formula || "some"}` : r.amount === "setHalf" ? "up to half" : "all";
    return `${amount} on ${ON_LABELS[r.on] ?? r.on}`;
  }).join(", ");
}

/** A pool with its recovery replaced by the GM's choice (unchanged without one). */
export function applyPoolOverride(pool, ownerIdentifier, overrides = {}) {
  const choice = overrides?.[poolLimitKey(ownerIdentifier, pool?.id)];
  const preset = choice && POOL_RECOVERY[choice];
  if ( !preset ) return pool;
  // Recoveries that need a feature (an upgrade's extra recovery) stay with the written ones only.
  return { ...pool, recovery: preset.recovery.map(r => ({ ...r, formula: "", requires: "" })), recoveryOverride: choice };
}

/** An Amp's uses period with the GM's choice applied. */
export function ampPer(key, writtenPer, overrides = {}) {
  const choice = overrides?.[ampLimitKey(key)];
  return choice && AMP_RECOVERY[choice] ? choice : writtenPer;
}

/**
 * Limits grouped for the menu: classes (each with its own features, then its subclasses), then
 * clans. Rows are {group: {kind, name, sub?}, key, feature, limit, written, choice, amp}.
 * @returns {{label: string, kind: string, sections: {label: string, rows: object[]}[]}[]}
 */
export function limitSections(rows) {
  const byKind = { class: new Map(), clan: new Map() };
  for ( const r of rows ) {
    const kind = r.group?.kind === "clan" ? "clan" : "class";
    const name = r.group?.name || "Other";
    if ( !byKind[kind].has(name) ) byKind[kind].set(name, new Map());
    const subs = byKind[kind].get(name);
    const sub = r.group?.sub || "";
    if ( !subs.has(sub) ) subs.set(sub, []);
    subs.get(sub).push(r);
  }
  const out = [];
  for ( const [kind, label] of [["class", "Classes"], ["clan", "Clans"]] ) {
    const names = [...byKind[kind].keys()].sort((a, b) => a.localeCompare(b));
    for ( const name of names ) {
      const subs = byKind[kind].get(name);
      const sections = [...subs.keys()].sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)))
        .map(sub => ({ label: sub || name, sub: !!sub, rows: subs.get(sub).sort((a, b) => a.feature.localeCompare(b.feature)) }));
      out.push({ kind, heading: label, label: name, sections });
    }
  }
  return out;
}
