/**
 * What using a feature or option costs from the character's pools (pure).
 *   - Moldings (tag nin-molding) spend Focus: 1, or the number their text names ("spend 2 Focus").
 *   - Assault Maneuvers (tag assault-maneuver) spend Superiority Dice: 1, or the number named
 *     ("spend two superiority die").
 *   - Features with limited uses spend 1 use.
 */
import { usesStamina } from "./trackers.mjs";

const WORDS = { one: 1, two: 2, three: 3, four: 4 };
const tags = item => new Set(item.system?.tags ?? []);
const text = item => String(item.system?.description ?? "").replace(/<[^>]+>/g, " ");

function countIn(item, noun) {
  const m = text(item).match(new RegExp(`spend(?:ing)? (\\d+|one|two|three|four) ${noun}`, "i"));
  if ( !m ) return 1;
  return Number(m[1]) || WORDS[m[1].toLowerCase()] || 1;
}

/**
 * @param {object} item
 * @returns {{pool: string|null, amount: number, uses: boolean}}
 */
export function resourceCost(item) {
  const t = tags(item);
  if ( t.has("nin-molding") ) return { pool: "focus", amount: countIn(item, "focus"), uses: false };
  if ( t.has("assault-maneuver") ) return { pool: "superiorityDice", amount: countIn(item, "superiority di"), uses: false };
  if ( usesStamina(item) ) return { pool: "stamina", amount: 1, uses: false };
  const max = item.system?.uses?.maxValue ?? 0;
  return { pool: null, amount: max ? 1 : 0, uses: max > 0 };
}

/**
 * Can the actor pay? Returns the problem, or null.
 * @param {object} actor
 * @param {{pool, amount, uses}} cost
 * @param {object} item
 */
export function cannotPay(actor, cost, item) {
  if ( cost.pool ) {
    const pool = actor.system.resources?.[cost.pool];
    if ( !pool ) return `No ${{ focus: "Focus", superiorityDice: "Superiority Dice", stamina: "Stamina" }[cost.pool] ?? cost.pool} pool`;
    if ( (pool.value ?? 0) < cost.amount ) return `Not enough ${pool.label || cost.pool} (${pool.value ?? 0} / ${cost.amount})`;
  }
  if ( cost.uses ) {
    const left = (item.system.uses.maxValue ?? 0) - (item.system.uses.spent ?? 0);
    if ( left < 1 ) return `${item.name} has no uses left`;
  }
  return null;
}
