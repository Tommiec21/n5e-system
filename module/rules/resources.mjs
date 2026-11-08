/** Positive integer costs only; explicit zero is a free operation, never an implicit spend of one. */
export function resourceChange(pool, amount, { gain = false } = {}) {
  amount = Number(amount);
  if ( !Number.isSafeInteger(amount) || amount < 0 ) throw new Error("Resource amount must be a non-negative integer.");
  if ( !pool ) throw new Error("Resource pool does not exist.");
  const value = Number(pool.value ?? 0);
  const max = Number(pool.maxValue ?? pool.max ?? 0);
  if ( !Number.isFinite(value) || !Number.isFinite(max) ) throw new Error("Resource pool has invalid values.");
  if ( !gain && amount > value ) throw new Error(`Not enough ${pool.label || "resources"}.`);
  if ( gain && amount > Math.max(0, max - value) ) throw new Error(`Cannot gain more than ${Math.max(0, max - value)} ${pool.label || "resources"}.`);
  return gain ? value + amount : value - amount;
}

