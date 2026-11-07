/**
 * N5e custom Active Effect change keys (Phase 1 plan, section 9). Changes whose key starts with "n5e."
 * are held back from core application and parsed here into one structured object the derived-data
 * pipeline reads.
 *
 *   n5e.mastery.<target>          adds a Mastery source; value = source label (e.g. skill.ste, save.con)
 *   n5e.dr                        +DR (number)
 *   n5e.pierce                    +Pierce (number)
 *   n5e.critRange.<scope>         +crit range (all|weapon|unarmed|nin|tai|gen|buki); capped at +3
 *   n5e.cost.<scope>              cost change: number (+/-), "*0.5" multiplier, "/2" divisor;
 *                                 scope all|nin|tai|gen|buki|keyword.<k>|rank.<R>
 *   n5e.saveDC.<disc|all>         +save DC
 *   n5e.attack.<disc>             +attack bonus
 *   n5e.disciplineAbility.<disc>  sets the discipline's ability (value: ability key)
 *   n5e.saveTier.shift            moves four-tier results by N steps (+/-)
 *   n5e.concentration.max         +max concentration jutsu
 *   n5e.upkeep.<scope>            upkeep change (number), same scopes as cost
 *   n5e.dice.all                  bonus/penalty to all dice rolls
 */

export const CHANGE_KEY_PREFIX = "n5e.";

export function emptyModifiers() {
  return {
    mastery: [], dr: 0, pierce: 0, critRange: {}, cost: [], saveDC: {}, attack: {}, disciplineAbility: {},
    saveTierShift: 0, concentrationMax: 0, upkeep: [], diceAll: 0, unknown: []
  };
}

const num = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Parse a cost-like value: "-2" -> {op:"add", value:-2}; "*0.5" -> multiply; "/2" -> divide. */
export function parseCostValue(value) {
  const s = String(value ?? "").trim();
  if ( s.startsWith("*") ) return { op: "multiply", value: num(s.slice(1)) || 1 };
  if ( s.startsWith("/") ) return { op: "divide", value: num(s.slice(1)) || 1 };
  return { op: "add", value: num(s) };
}

/**
 * @param {Array<{key: string, value: any, effect?: {name?: string, id?: string}}>} changes
 */
export function parseN5eChanges(changes) {
  const out = emptyModifiers();
  for ( const change of changes ) {
    const key = String(change.key ?? "");
    if ( !key.startsWith(CHANGE_KEY_PREFIX) ) continue;
    const [, group, ...rest] = key.split(".");
    const sub = rest.join(".");
    const label = change.effect?.name ?? "Effect";
    switch ( group ) {
      case "mastery":
        if ( sub ) out.mastery.push({ target: sub, source: String(change.value || label) });
        break;
      case "dr": out.dr += num(change.value); break;
      case "pierce": out.pierce += num(change.value); break;
      case "critRange": {
        const scope = sub || "all";
        out.critRange[scope] = (out.critRange[scope] ?? 0) + num(change.value);
        break;
      }
      case "cost": out.cost.push({ scope: sub || "all", ...parseCostValue(change.value), source: label }); break;
      case "upkeep": out.upkeep.push({ scope: sub || "all", ...parseCostValue(change.value), source: label }); break;
      case "saveDC": {
        const scope = sub || "all";
        out.saveDC[scope] = (out.saveDC[scope] ?? 0) + num(change.value);
        break;
      }
      case "attack": {
        const scope = sub || "all";
        out.attack[scope] = (out.attack[scope] ?? 0) + num(change.value);
        break;
      }
      case "disciplineAbility": if ( sub ) out.disciplineAbility[sub] = String(change.value); break;
      case "saveTier": out.saveTierShift += num(change.value); break;
      case "concentration": out.concentrationMax += num(change.value); break;
      case "dice": out.diceAll += num(change.value); break;
      default: out.unknown.push(key);
    }
  }
  return out;
}

/**
 * Does a cost scope apply to a jutsu?
 * @param {string} scope
 * @param {{discipline: string, keywords: Set<string>|string[], rank: string}} jutsu
 */
export function scopeApplies(scope, jutsu) {
  if ( !scope || scope === "all" ) return true;
  if ( scope.startsWith("keyword.") ) return new Set(jutsu.keywords).has(scope.slice(8));
  if ( scope.startsWith("rank.") ) return jutsu.rank === scope.slice(5);
  return jutsu.discipline === scope;
}
