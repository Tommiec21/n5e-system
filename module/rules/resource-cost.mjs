/**
 * What using a feature or option costs from the character's pools (pure).
 *   - Moldings (tag nin-molding) spend Focus: 1, or the number their text names ("spend 2 Focus").
 *   - Assault Maneuvers (tag assault-maneuver) spend Superiority Dice: 1, or the number named
 *     ("spend two superiority die").
 *   - Martial Techniques (tai-technique) spend Martial Dice, Moment of Stillness techniques 2 Martial
 *     Dice, Katas (weapon-kata) Discipline: the number their text names; a Kata whose text spends nothing
 *     (it gains Discipline instead) costs nothing.
 *   - Skilled Exploits (hunter-exploit with "Exploit Type: Skilled Exploit") spend 1 Skilled Exploit use.
 *   - Features with limited uses spend 1 use.
 *   - With the Stamina rule on, feats whose uses recover on a rest spend 1 Stamina instead.
 * Features whose authored activities carry their own cost (e.g. "1 Superiority Die" on a button)
 * pay on that button instead (workflow/use-feature.mjs). New tag-based costs go in resourceCost.
 */
import { usesStamina } from "./trackers.mjs";

const WORDS = { one: 1, two: 2, three: 3, four: 4 };
const tags = item => new Set(item.system?.tags ?? []);
const text = item => String(item.system?.description ?? "").replace(/<[^>]+>/g, " ");

/** How many of a pool the text says to spend ("spend two superiority die"): 1 if it doesn't say. */
function countIn(item, noun) {
  const m = text(item).match(new RegExp(`spend(?:ing)? (?:up to )?(\\d+|one|two|three|four) ${noun}`, "i"));
  if ( !m ) return 1;
  return Number(m[1]) || WORDS[m[1].toLowerCase()] || 1;
}

// Tag -> [pool id, the pool's name in the book's text, cost when the text names no number].
// minimum 0 = free unless the text says "spend" (Katas that gain Discipline).
const TAG_POOLS = {
  "nin-molding": ["focus", "focus", 1],
  "assault-maneuver": ["superiorityDice", "superiority di", 1],
  "tai-technique": ["martialDice", "martial di", 1],
  "tai-stillness": ["martialDice", "martial di", 2],
  "weapon-kata": ["discipline", "discipline", 0]
};

/**
 * @param {object} item
 * @returns {{pool: string|null, amount: number, uses: boolean}}
 */
export function resourceCost(item) {
  const t = tags(item);
  for ( const [tag, [pool, noun, base]] of Object.entries(TAG_POOLS) ) {
    if ( !t.has(tag) ) continue;
    if ( base === 0 && !/\bspend/i.test(text(item)) ) return { pool: null, amount: 0, uses: false };
    const named = new RegExp(`spend(?:ing)? (?:up to )?(\\d+|one|two|three|four) ${noun}`, "i").test(text(item));
    return { pool, amount: named ? countIn(item, noun) : Math.max(1, base), uses: false };
  }
  if ( t.has("hunter-exploit") && /Exploit Type:\s*Skilled/i.test(text(item)) ) return { pool: "skilledExploits", amount: 1, uses: false };
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
