/**
 * Per-target resolution (pure; RES1, KB 03 and 04). One damage roll covers every target; each
 * target's share comes from its own attack result (one attack roll compared to each AC) or its own
 * save.
 *
 *   Attack   Hit or Critical hit -> full; Miss or natural 1 -> none.
 *   Save     Failure or Critical Failure -> full; Success -> half when the save says "half on
 *            success", else none; Critical Success (four-tier) -> none.
 *   A target that was hit and also rolled a save takes the save's result.
 */
import { attackTargetRows, ATTACK_RESULT_LABELS } from "./parity.mjs";

const SAVE_LABELS = ["Critical Failure", "Failure", "Success", "Critical Success"];

/** The share a save result gives: "full" | "half" | "none". */
export function saveMode(degree, { onSuccess = "none", fourTier = false } = {}) {
  if ( degree == null ) return null;
  if ( degree < 2 ) return "full";
  if ( fourTier && degree >= 3 ) return "none";
  return onSuccess === "half" ? "half" : "none";
}

/**
 * @param {object} o
 * @param {{total, natural, threshold, targets: {uuid, name, ac}[]}|null} [o.attack]
 * @param {{actorUuid, name, degree, onSuccess, fourTier}[]} [o.saves]
 * @returns {{uuid, name, outcome, mode: "full"|"half"|"none"}[]}
 */
export function targetOutcomes({ attack = null, saves = [] } = {}) {
  const rows = new Map();
  if ( attack?.targets?.length ) {
    for ( const r of attackTargetRows(attack, attack.targets, { isGM: true }) ) {
      if ( !r.result ) continue;
      rows.set(r.uuid, { uuid: r.uuid, name: r.name, outcome: ATTACK_RESULT_LABELS[r.result],
        mode: r.result === "hit" || r.result === "crit" ? "full" : "none" });
    }
  }
  for ( const s of saves ?? [] ) {
    const mode = saveMode(s.degree, s);
    if ( !mode || !s.actorUuid ) continue;
    const label = s.fourTier ? SAVE_LABELS[s.degree] : s.degree >= 2 ? "Success" : "Failure";
    const prior = rows.get(s.actorUuid);
    rows.set(s.actorUuid, { uuid: s.actorUuid, name: s.name ?? prior?.name ?? "", mode,
      outcome: `${prior ? `${prior.outcome}, ` : ""}save ${label}${mode === "half" ? " (half)" : ""}` });
  }
  return [...rows.values()];
}

/**
 * Pick the rolls linked to an origin card from chat message data (pure; F4's selection step).
 * @param {object|null} origin        the origin message's flags.n5e.roll (when it is an attack card) or null
 * @param {object[]} linked           flags.n5e.roll of messages whose source is the origin, oldest first
 * @returns {{attack: object|null, saves: object[]}}
 */
export function pickLinkedRolls(origin, linked = []) {
  const attacks = linked.filter(r => r?.kind === "attack");
  const attack = origin?.kind === "attack" ? origin : attacks.at(-1) ?? null;
  const latest = new Map();
  for ( const r of linked ) if ( r?.kind === "save" && r.dc != null && r.actorUuid ) latest.set(r.actorUuid, r);
  return { attack, saves: [...latest.values()] };
}
