/**
 * LEFT1 P4 (King Q-L5): a red drop on a token at half its hit points or less (rules/bloodied.mjs).
 * Drawn on each client's canvas, so no document changes; the world rule bloodiedVisibility decides who sees it.
 */
import { isBloodied, showBloodied } from "../rules/bloodied.mjs";
import { rule } from "../rules-settings.mjs";

const KEY = "n5eBloodied";

/** Add, move or remove the marker on one token. */
function draw(token) {
  const actor = token?.actor;
  let setting = "player";
  try { setting = rule("bloodiedVisibility") ?? "player"; } catch { /* rules not ready: the default */ }
  const on = !!actor && isBloodied(actor.system?.hp)
    && showBloodied(setting, { isGM: !!game.user?.isGM, playerOwned: !!actor.hasPlayerOwner });
  let mark = token[KEY];
  if ( !on ) {
    if ( mark ) { mark.destroy(); token[KEY] = null; }
    return;
  }
  if ( !mark || mark.destroyed ) {
    mark = new globalThis.PIXI.Graphics();
    token[KEY] = mark;
    token.addChild(mark);
  }
  const size = Math.max(12, Math.min(token.w, token.h) * 0.22);
  const x = token.w - size * 0.75, y = token.h - size * 0.95;
  mark.clear();
  // A drop: a circle with a point on top, white outline.
  mark.lineStyle(2, 0xFFFFFF, 1).beginFill(0xB3261E, 0.95);
  mark.moveTo(x, y - size * 0.55);
  mark.bezierCurveTo(x + size * 0.45, y - size * 0.05, x + size * 0.45, y + size * 0.45, x, y + size * 0.45);
  mark.bezierCurveTo(x - size * 0.45, y + size * 0.45, x - size * 0.45, y - size * 0.05, x, y - size * 0.55);
  mark.endFill();
  mark.zIndex = 10;
}

const refreshActor = actor => {
  for ( const t of actor?.getActiveTokens?.() ?? [] ) draw(t);
};

export function registerBloodiedMarker() {
  Hooks.on("refreshToken", token => draw(token));
  Hooks.on("updateActor", actor => refreshActor(actor));
  const all = () => { for ( const t of globalThis.canvas?.tokens?.placeables ?? [] ) draw(t); };
  Hooks.on("updateSetting", setting => { if ( String(setting?.key ?? "").startsWith("n5e.") ) all(); });
  Hooks.on("canvasReady", all);
  all();
}
