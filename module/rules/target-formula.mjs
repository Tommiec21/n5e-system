/**
 * Formulas that read the target (ENG1a; docs/ENG1_SPEC.md): "@target.ranks.<condition>" is the
 * target's ranks of that condition, "@target.state.<state>" is 1 when it is in that state (else 0).
 * Without exactly one target they read 0. Pure: plain actor data in.
 */
const list = v => (Array.isArray(v) ? v : v ? [...v] : []);

/** The target's ranks of a condition (condition effects carry system.key and system.ranks). */
export function conditionRanksOn(actor, key) {
  return list(actor?.effects).filter(e => !e.disabled && e.system?.key === key).reduce((t, e) => t + Math.max(1, Number(e.system?.ranks) || 1), 0);
}

export function targetFormula(formula, target = null) {
  return String(formula ?? "")
    .replace(/@target\.ranks\.(\w+)/g, (m, key) => String(target ? conditionRanksOn(target, key) : 0))
    .replace(/@target\.state\.(\w+)/g, (m, key) => String(target && list(target.effects).some(e => !e.disabled && e.flags?.n5e?.state === key) ? 1 : 0));
}
