/**
 * Timed effect expiry (pure; EXPIRE1). An effect whose duration has run out is removed:
 *   - in combat, checked for every combatant at each turn start (Foundry's duration math counts rounds
 *     and turns globally, so a "1 round" effect ends at the same moment for everyone);
 *   - out of combat, checked whenever world time advances.
 * Never removed here: effects with no duration, [Persists] conditions, conditions when the
 * conditionDurations rule is off, and effects whose own lifecycle ends them (caster-tied
 * `flags.n5e.expires`). Conditions in combat keep their turn-end processing (condition-lifecycle.mjs);
 * out of combat they expire here, and "until the end of its next turn" conditions applied by game
 * effects (flags.n5e.applied = "auto") end at once; deliberate ones (sheet, GM tools, dragged) stay.
 */
import { conditions as coreConditions } from "../config/conditions.mjs";
import { rule } from "./settings.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const defOf = (key, registry) => registry[key] ?? globalThis.CONFIG?.N5E?.clanConditions?.[key];

/** Foundry's own duration check: a timed duration with nothing remaining. */
export const durationExpired = e => !!e.duration?.type && e.duration.type !== "none" && Number.isFinite(e.duration.remaining) && e.duration.remaining <= 0;

/**
 * @param {Actor} actor
 * @param {{includeConditions?: boolean, isExpired?: Function}} [o]
 * @returns {{id: string, name: string}[]}
 */
export function expiredEffects(actor, { includeConditions = false, isExpired = durationExpired } = {}, registry = coreConditions) {
  const out = [];
  for ( const e of list(actor?.effects) ) {
    if ( e.flags?.n5e?.expires ) continue;
    if ( e.type === "condition" ) {
      if ( !includeConditions || !rule("conditionDurations") ) continue;
      const def = defOf(e.system?.key, registry);
      // Out of combat, "end of its next turn" conditions from game effects end at once (King 2026-11-13).
      if ( def?.endsAt === "nextTurnEnd" && e.flags?.n5e?.applied === "auto" ) { out.push({ id: e.id, name: e.name }); continue; }
      if ( def?.persists ) continue;
    }
    if ( isExpired(e) ) out.push({ id: e.id, name: e.name });
  }
  return out;
}
