/**
 * Chakra cost calculation (KB 04, 11).
 *
 * Order: Base -> Addition -> Subtraction -> Multiplication -> Division.
 *  - Upcasting changes the BASE cost before anything else (+costPerRank per rank).
 *  - Sealed adds to the BASE cost of Ninjutsu and Genjutsu (+4 per rank), so it also raises the floor.
 *  - Floor: never below half the (modified) base cost, rounded down.
 *  - Special costs can't be reduced by anything (including "no cost"); they can be increased.
 *  - Multipliers don't stack: with several, one applies (the most favorable to the caster).
 *  - Rounding down is the universal default.
 */

/**
 * @typedef {object} CostInput
 * @property {number|null} base          printed cost (null/0 for None)
 * @property {"chakra"|"none"|"special"} [mode="chakra"]
 * @property {number} [upcastRanks=0]    ranks above base rank
 * @property {number} [costPerRank=0]    upcast cost per rank (preset standard3 = 3)
 * @property {number[]} [baseAdds]       base-cost additions (Sealed ranks x 4)
 * @property {number[]} [additions]
 * @property {number[]} [subtractions]   positive numbers
 * @property {number[]} [multipliers]
 * @property {number[]} [divisors]
 * @property {boolean} [free]            "costs no chakra" effects (ignored for Special)
 */

/**
 * @param {CostInput} input
 * @returns {{cost: number, base: number, floor: number, special: boolean, steps: object}}
 */
export function computeJutsuCost(input) {
  const mode = input.mode ?? "chakra";
  const special = mode === "special";
  const sum = arr => (arr ?? []).reduce((a, b) => a + (Number(b) || 0), 0);

  const printed = mode === "none" ? 0 : Math.max(0, Number(input.base) || 0);
  const base = printed + (input.upcastRanks ?? 0) * (input.costPerRank ?? 0) + sum(input.baseAdds);
  const floor = Math.floor(base / 2);

  let cost = base + sum(input.additions);
  const steps = { base, afterAdd: cost };

  if ( special ) {
    // Only increases apply.
    const ups = (input.multipliers ?? []).filter(m => m > 1);
    if ( ups.length ) cost = Math.floor(cost * Math.max(...ups));
    steps.final = cost;
    return { cost, base, floor: base, special, steps };
  }

  if ( input.free ) return { cost: 0, base, floor: 0, special, steps: { ...steps, final: 0 } };

  cost -= sum(input.subtractions);
  steps.afterSub = cost;
  if ( input.multipliers?.length ) cost = Math.floor(cost * Math.min(...input.multipliers));
  steps.afterMul = cost;
  if ( input.divisors?.length ) cost = Math.floor(cost / Math.max(...input.divisors));
  steps.afterDiv = cost;

  cost = Math.max(cost, floor, 0);
  steps.final = cost;
  return { cost, base, floor, special, steps };
}

/** Concentration upkeep: half the jutsu's original cost (round down); Efficient waives it. */
export function upkeepCost(originalCost, { efficient = false } = {}) {
  return efficient ? 0 : Math.floor((Number(originalCost) || 0) / 2);
}

/** Concentration damage check DC: max(15 + combined ranks of concentrated jutsu, half damage). */
export function concentrationDC({ rankValues = [], damage = 0, base = 15 }) {
  const ranks = rankValues.reduce((a, b) => a + b, 0);
  return Math.max(base + ranks, Math.floor(damage / 2));
}
