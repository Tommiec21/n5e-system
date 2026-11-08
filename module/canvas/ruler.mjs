/**
 * Movement on the map (Foundry v13 movement actions):
 *   - costs: climbing/swimming without that speed and crawling cost +1 ft per ft (movementCosts rule);
 *   - the token ruler colors squares by the actor's speed for the movement action: within speed as
 *     normal, up to double (Dash) yellow, beyond red (rulerSpeed rule).
 * The rules are pure functions in module/rules/senses.mjs (movementCost, speedBand).
 */
import { movementCost, speedBand } from "../rules/senses.mjs";
import { rule } from "../rules-settings.mjs";

const safeRule = key => { try { return rule(key); } catch { return true; } };

/** Called at init. */
export function registerMovement() {
  const actions = CONFIG.Token?.movement?.actions;
  if ( actions ) {
    for ( const key of ["climb", "swim", "crawl"] ) {
      if ( !actions[key] ) continue;
      actions[key].getCostFunction = token => {
        const speed = token?.actor?.system?.speed ?? {};
        return (baseCost, from, to, distance) => (safeRule("movementCosts") ? movementCost(key, speed, baseCost, distance) : baseCost);
      };
    }
  }
  const Base = foundry.canvas?.placeables?.tokens?.TokenRuler;
  if ( !Base ) return;
  class N5eTokenRuler extends Base {
    static BAND_COLORS = { dash: 0xffcc00, over: 0xcc2222 };

    /** @override */
    _getGridHighlightStyle(waypoint, offset) {
      const style = super._getGridHighlightStyle(waypoint, offset);
      if ( !safeRule("rulerSpeed") ) return style;
      const speed = this.token?.actor?.system?.speed;
      const cost = waypoint?.measurement?.cost;
      if ( !speed || !Number.isFinite(cost) || (style.alpha ?? 1) === 0 ) return style;
      const band = speedBand(waypoint.action ?? "walk", speed, cost);
      if ( band !== "normal" ) style.color = N5eTokenRuler.BAND_COLORS[band];
      return style;
    }
  }
  CONFIG.Token.rulerClass = N5eTokenRuler;
}
