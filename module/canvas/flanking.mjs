/**
 * PRESTD1 Part D: flanking on the canvas (rule flanking; King Q-P6). A melee attacker flanks its target
 * when one of its allies (same token disposition, not incapacitated) is on the opposite side, both
 * within their melee reach of it (edge to edge). Geometry: rules/pf2e-emulation.mjs.
 */
import { flanks } from "../rules/pf2e-emulation.mjs";

const OUT = ["incapacitated", "stunned", "unconscious", "petrified", "dead", "dying"];

function gap(a, b) {
  const grid = canvas.grid;
  const ra = a.bounds, rb = b.bounds;
  const dx = Math.max(0, rb.x - (ra.x + ra.width), ra.x - (rb.x + rb.width));
  const dy = Math.max(0, rb.y - (ra.y + ra.height), ra.y - (rb.y + rb.height));
  // Touching tokens have a gap of 0; each empty square between them adds the grid distance.
  return Math.max(dx, dy) / grid.size * grid.distance;
}

/** The ally whose position flanks the target with this attacker, or null. */
export async function flankingAlly(attackerToken, targetToken) {
  if ( !attackerToken || !targetToken || !canvas?.ready ) return null;
  const { meleeReach } = await import("../workflow/positioning.mjs");
  const reachOf = t => meleeReach(t.actor).reach;
  const inReach = t => gap(t, targetToken) <= Math.max(0, reachOf(t) - canvas.grid.distance);
  const rect = { x: targetToken.bounds.x, y: targetToken.bounds.y, w: targetToken.bounds.width, h: targetToken.bounds.height };
  const me = { centre: attackerToken.center, inReach: inReach(attackerToken) };
  if ( !me.inReach ) return null;
  for ( const t of canvas.tokens.placeables ) {
    if ( t === attackerToken || t === targetToken || !t.actor || t.document.hidden ) continue;
    if ( t.document.disposition !== attackerToken.document.disposition ) continue;
    if ( OUT.some(s => t.actor.statuses?.has(s)) ) continue;
    if ( flanks(me, { centre: t.center, inReach: inReach(t) }, rect) ) return t;
  }
  return null;
}
