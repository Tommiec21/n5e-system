/**
 * Senses → token vision (pure). The sheet's senses (system.traits.senses, feet) become a token's sight
 * range, vision mode and detection modes. Nothing is saved: the token document applies this every
 * prepare (module/documents/token.mjs), so changing a sense on the sheet updates every token.
 *
 * Mapping (KB 06 senses table):
 *   darkvision     sight range at least the darkvision range; "darkvision" vision mode; basic sight range
 *   blindsight     senseAll       (perceives within range without sight; walls block)
 *   tremorSense    feelTremor     (core: creatures on the ground)
 *   trueSight      seeAll         (sees everything, invisibility included)
 *   chakraSight    seeInvisibility (reveals jutsu invisibility)
 *   chakraSensing  chakraSensing  (N5e mode: chakra-bearing creatures, not blocked by walls; module/canvas/detection.mjs)
 * heatSense and waterSense have no map equivalent and stay on the sheet.
 */
export const SENSE_MODES = {
  blindsight: "senseAll",
  tremorSense: "feelTremor",
  trueSight: "seeAll",
  chakraSight: "seeInvisibility",
  chakraSensing: "chakraSensing"
};

/**
 * What a token's vision should be given the actor's senses.
 * @param {object} senses           system.traits.senses {key: feet}
 * @param {object} sight            the token's stored sight {range, visionMode}
 * @param {{id, range, enabled}[]} modes  the token's stored detection modes
 * @returns {{sight: {range, visionMode}, modes: {id, range, enabled}[]}}
 */
export function visionFromSenses(senses = {}, sight = {}, modes = []) {
  const out = { sight: { range: sight.range ?? 0, visionMode: sight.visionMode ?? "basic" }, modes: modes.map(m => ({ ...m })) };
  const dv = Number(senses.darkvision) || 0;
  if ( dv > 0 ) {
    out.sight.range = Math.max(out.sight.range || 0, dv);
    if ( out.sight.visionMode === "basic" ) out.sight.visionMode = "darkvision";
    const basic = out.modes.find(m => m.id === "basicSight");
    if ( basic ) basic.range = Math.max(basic.range ?? 0, dv);
    else out.modes.push({ id: "basicSight", range: dv, enabled: true });
  }
  for ( const [key, id] of Object.entries(SENSE_MODES) ) {
    const range = Number(senses[key]) || 0;
    if ( range <= 0 ) continue;
    const have = out.modes.find(m => m.id === id);
    // A mode set by hand on the token keeps its own settings unless the sense reaches farther.
    if ( have ) have.range = Math.max(have.range ?? 0, range);
    else out.modes.push({ id, range, enabled: true });
  }
  return out;
}

/**
 * Extra movement cost (KB 03, 06): climbing or swimming without that speed, and crawling, cost
 * +1 ft per ft (so +2 in difficult terrain, which already doubles the base cost).
 * @param {string} action   the movement action (walk, climb, swim, crawl, fly, burrow...)
 * @param {object} speed    the actor's derived system.speed
 * @param {number} baseCost the step's terrain cost
 * @param {number} distance the step's distance
 */
export function movementCost(action, speed = {}, baseCost, distance) {
  if ( action === "crawl" ) return baseCost + distance;
  if ( (action === "climb" || action === "swim") && !(speed[action] > 0) ) return baseCost + distance;
  return baseCost;
}

/**
 * Ruler band for a movement total: "normal" within the speed for that action, "dash" up to double,
 * "over" beyond. Actions without their own speed use walk (crawl and climb/swim without a speed).
 */
export function speedBand(action, speed = {}, cost) {
  const own = { fly: speed.fly, burrow: speed.burrow, climb: speed.climb, swim: speed.swim }[action];
  const base = own > 0 ? own : (speed.walk ?? 0);
  if ( !base ) return "normal";
  if ( cost <= base ) return "normal";
  if ( cost <= base * 2 ) return "dash";
  return "over";
}
