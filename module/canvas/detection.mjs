/**
 * The N5e detection mode: Chakra Sensing (KB 06). It notices chakra-bearing creatures within range,
 * through walls (the book allows walls up to 5 ft thick that aren't chakra-reinforced; Foundry can't
 * measure wall thickness, so walls are ignored). Creatures with no chakra (cp max 0) aren't sensed.
 * Registered at init (n5e.mjs); senses map to modes in module/rules/senses.mjs.
 */
export function registerDetectionModes() {
  const P = foundry.canvas?.perception ?? {};
  const Base = P.DetectionModeAll ?? P.DetectionMode ?? globalThis.DetectionMode;
  if ( !Base ) return;
  class ChakraSensing extends Base {
    /** @override Only creatures that have chakra. */
    _canDetect(visionSource, target) {
      const actor = target?.actor ?? target?.document?.actor;
      if ( !actor ) return false;
      if ( !((actor.system?.cp?.max ?? 0) > 0) ) return false;
      return super._canDetect ? super._canDetect(visionSource, target) : true;
    }
  }
  const types = (P.DetectionMode ?? Base).DETECTION_TYPES ?? {};
  CONFIG.Canvas.detectionModes.chakraSensing = new ChakraSensing({
    id: "chakraSensing", label: "Chakra Sensing", type: types.OTHER ?? 3, walls: false, angle: false
  });
}
