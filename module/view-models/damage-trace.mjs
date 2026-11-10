import { esc } from "./common.mjs";

export function damageRollHTML(trace) {
  if ( !trace ) return '<p class="note">No source roll was attached to this manual damage entry.</p>';
  const parts = trace.parts.map(part => {
    const dice = part.dice.map(die => `${esc(die.formula)}: ${die.results.map(r => r.kept ? esc(String(r.value)) : `<s>${esc(String(r.value))}</s>`).join(", ")}`).join("; ");
    return `<li><b>${esc(part.type || "Untyped")}</b>: ${part.formula ? `${esc(part.formula)} = ` : ""}<b>${part.amount}</b>${dice ? `<div>Dice: ${dice}</div>` : ""}${trace.critical && part.normalFormula ? `<div>Normal formula: ${esc(part.normalFormula)}; critical formula: ${esc(part.formula)}</div>` : ""}</li>`;
  }).join("");
  return `<details class="n5e-damage-trace" open><summary>${trace.critical ? "Critical damage" : "Damage"} roll breakdown — ${trace.total}</summary><ol>${parts}</ol><div>Rolled total: <b>${trace.total}</b>${trace.verifiedRolls === false ? " · No saved dice attached to this legacy/manual entry" : ""}</div></details>`;
}
export function damageApplicationHTML(trace) {
  return `<details class="n5e-damage-trace" open><summary>Applied calculation</summary><div>Rolled ${trace.rolled} → damage input ${trace.damageInput} → after defenses <b>${trace.finalDamage}</b></div>
    <div>Application: ${esc(trace.mode)}${trace.reaction ? `; reaction: ${esc(trace.reaction)}` : ""}${trace.rolledReduction ? `; rolled DR: ${trace.rolledReduction}` : ""}${trace.reactionMultiplier !== 1 ? `; reaction multiplier: ×${trace.reactionMultiplier}` : ""}</div>
    <ol>${trace.steps.length ? trace.steps.map(step => `<li>${esc(step)}</li>`).join("") : "<li>No reduction or multiplier changed the damage.</li>"}</ol>
    <div>${trace.parts.map(part => `${esc(part.type || "Untyped")}: ${part.amount}`).join("; ")}</div>
    ${trace.pools.map(p => `<div>${p.pool.toUpperCase()}: ${p.before} → ${p.after}; temporary: ${p.temporaryBefore} → ${p.temporaryAfter}</div>`).join("")}</details>`;
}
