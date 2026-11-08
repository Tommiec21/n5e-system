/**
 * Jutsu areas (KB 04 "Range, targets, areas"): reading a jutsu's area, sizing it for the cast rank,
 * turning it into Foundry template data, and testing which points it covers. Pure functions, no
 * Foundry calls (tests/areas.test.mjs); the map side is module/workflow/areas.mjs.
 *
 * Shapes (KB 04):
 *   cone      width at the end = its length (a 53.13° cone); the origin is not included
 *   cube      the origin is on one face (corner on the map); size = side length
 *   cylinder  origin = the circle's center; size = radius (height is not drawn)
 *   line      length × width (default width 5 ft); the origin is not included
 *   sphere    origin = center; size = radius. "radius" and "emanation" in text mean sphere
 *
 * Where an area comes from, in order: the item's system.target.area (authored), then the range text
 * ("Self (20-foot cone)"), then the description ("each creature in a 15-foot radius"). Upcast rules
 * with perRank {type: "area", value: "+5"} grow the size for each rank above the base rank.
 *
 * Coordinates: the map's, in feet, with y pointing down (screen coordinates). Directions are degrees
 * clockwise from +x, the way Foundry measures template direction.
 */
import { rankValue } from "./progression.mjs";

/** The angle of a cone whose width at the end equals its length (2·atan(1/2)), as in Foundry's 5e. */
export const CONE_ANGLE = 53.13;
/** A line's width when the text gives none. */
export const DEFAULT_LINE_WIDTH = 5;

// Words in text that name a shape → the shape key.
const SHAPE_WORDS = { cone: "cone", cube: "cube", square: "cube", cylinder: "cylinder", line: "line",
  sphere: "sphere", radius: "sphere", emanation: "sphere", circle: "sphere", aura: "sphere" };
const SIZE_SHAPE = /(\d+)\s*[- ]?\s*(?:foot|feet|ft\.?)(?:[- ]+(?:long|wide|tall|high))?[- ]+(cone|cube|square|cylinder|line|sphere|radius|emanation|circle|aura)\b/i;
const WIDTH = /(\d+)\s*[- ]?\s*(?:foot|feet|ft\.?)[- ]+wide/i;

/**
 * An area from text, or null. "Self (15-foot cone)" → {shape: "cone", size: 15};
 * "a 60-foot line that is 10 feet wide" → {shape: "line", size: 60, width: 10}.
 * @param {string} text  plain text or HTML (tags are ignored)
 */
export function parseArea(text) {
  const plain = String(text ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  const m = plain.match(SIZE_SHAPE);
  if ( !m ) return null;
  const shape = SHAPE_WORDS[m[2].toLowerCase()];
  const area = { shape, size: Number(m[1]) };
  if ( shape === "line" ) {
    // The width has to come after the line's size ("60-foot line, 5 feet wide").
    const w = plain.slice(m.index + m[0].length).match(WIDTH);
    area.width = w ? Number(w[1]) : DEFAULT_LINE_WIDTH;
  }
  return area;
}

/**
 * The area an item covers at a cast rank, or null when it has none.
 * @param {object} system   item.system (jutsu, feature...; anything with target/description)
 * @param {object} [o]
 * @param {string} [o.rank] cast rank (upcast area growth); defaults to the item's rank
 * @returns {{shape, size, width?, source: "item"|"range"|"text", self: boolean}|null}
 */
export function areaOf(system, { rank } = {}) {
  const t = system?.target ?? {};
  let area = null;
  let source = "item";
  if ( t.area?.shape && t.area.size ) {
    const shape = SHAPE_WORDS[String(t.area.shape).toLowerCase()] ?? t.area.shape;
    area = { shape, size: Number(t.area.size) };
    if ( shape === "line" ) area.width = Number(t.area.width) || DEFAULT_LINE_WIDTH;
  } else if ( (area = parseArea(t.range?.text)) ) source = "range";
  else if ( (area = parseArea(system?.description)) ) source = "text";
  if ( !area ) return null;
  // Upcast: each rank above the base adds the perRank "area" value to the size.
  const steps = rank && system.rank ? Math.max(0, rankValue(rank) - rankValue(system.rank)) : 0;
  for ( const p of system.upcast?.perRank ?? [] ) {
    if ( p.type !== "area" || !steps ) continue;
    const n = Number(String(p.value).replace(/[^\d.-]/g, ""));
    if ( Number.isFinite(n) ) area.size += n * steps;
  }
  area.source = source;
  area.self = t.range?.type === "self" || /^\s*self\b/i.test(t.range?.text ?? "");
  return area;
}

/** A short label: "20-ft cone", "60-ft line (10 ft wide)". */
export function areaLabel(area) {
  if ( !area ) return "";
  const width = area.shape === "line" && area.width !== DEFAULT_LINE_WIDTH ? ` (${area.width} ft wide)` : "";
  const name = area.shape === "sphere" ? "radius" : area.shape;
  return `${area.size}-ft ${name}${width}`;
}

/**
 * Foundry MeasuredTemplate fields for an area (sizes in scene distance units = feet).
 *   sphere / cylinder → circle; cone → cone (53.13°); line → ray; cube → rect (Foundry draws a rect
 *   as the diagonal from its origin, so the distance is side·√2 at 45°).
 * @param {object} area      from areaOf()
 * @param {number} [direction] degrees
 */
export function templateFields(area, direction = 0) {
  switch ( area.shape ) {
    case "cone": return { t: "cone", distance: area.size, angle: CONE_ANGLE, direction };
    case "line": return { t: "ray", distance: area.size, width: area.width ?? DEFAULT_LINE_WIDTH, direction };
    case "cube": return { t: "rect", distance: Math.round(area.size * Math.SQRT2 * 100) / 100, direction: 45 };
    default: return { t: "circle", distance: area.size, direction: 0 };
  }
}

/** Shortest difference between two angles, in degrees (0-180). */
function angleDiff(a, b) {
  const d = Math.abs(((a - b) % 360 + 540) % 360 - 180);
  return d;
}

/**
 * Is a point inside a template? All values in feet; template = {t, distance, width, angle, direction},
 * origin = the template's {x, y}. A small tolerance keeps points exactly on the edge inside.
 */
export function pointInTemplate(template, origin, point, tolerance = 0.01) {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dist = Math.hypot(dx, dy);
  const dir = template.direction ?? 0;
  switch ( template.t ) {
    case "circle": return dist <= template.distance + tolerance;
    case "cone": {
      if ( dist < tolerance ) return false;                       // origin excluded
      if ( dist > template.distance + tolerance ) return false;
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      return angleDiff(ang, dir) <= (template.angle ?? CONE_ANGLE) / 2 + tolerance;
    }
    case "ray": {
      const rad = dir * Math.PI / 180;
      const along = dx * Math.cos(rad) + dy * Math.sin(rad);
      const across = -dx * Math.sin(rad) + dy * Math.cos(rad);
      return along > tolerance && along <= template.distance + tolerance && Math.abs(across) <= (template.width ?? DEFAULT_LINE_WIDTH) / 2 + tolerance;
    }
    case "rect": {
      // Foundry rect: the box between the origin and the end of the diagonal.
      const rad = dir * Math.PI / 180;
      const ex = template.distance * Math.cos(rad);
      const ey = template.distance * Math.sin(rad);
      const [x0, x1] = [Math.min(0, ex), Math.max(0, ex)];
      const [y0, y1] = [Math.min(0, ey), Math.max(0, ey)];
      return dx >= x0 - tolerance && dx <= x1 + tolerance && dy >= y0 - tolerance && dy <= y1 + tolerance;
    }
    default: return false;
  }
}

/**
 * The ids of the tokens an area covers. A token is in the area when any of the squares it occupies
 * has its center inside (points = one center per occupied square).
 * @param {object} template  {t, distance, width, angle, direction}
 * @param {{x, y}} origin    feet
 * @param {{id, points: {x, y}[]}[]} tokens  feet
 * @param {object} [o]
 * @param {string} [o.exclude]  a token id to leave out (the caster of a Self area)
 */
export function tokensInTemplate(template, origin, tokens, { exclude } = {}) {
  return tokens.filter(t => t.id !== exclude && t.points.some(p => pointInTemplate(template, origin, p))).map(t => t.id);
}

/**
 * How long a placed area stays on the map:
 *   "concentration"  until the caster stops concentrating on the jutsu
 *   "rounds"         a number of rounds from the duration (1 minute = 10 rounds), in combat
 *   "turn"           instantaneous areas: removed at the end of the caster's turn
 *   "manual"         out of combat with a duration: removed by hand
 * @param {object} duration  item.system.duration {value, unit, concentration}
 * @param {boolean} inCombat
 */
export function areaLifetime(duration, inCombat) {
  if ( duration?.concentration ) return { kind: "concentration" };
  const per = { round: 1, turn: 1, minute: 10, hour: 600 }[duration?.unit];
  if ( !per || !duration?.value ) return { kind: "turn" };
  if ( !inCombat ) return { kind: "manual" };
  return { kind: "rounds", rounds: per * duration.value };
}

/** Has a "rounds" area run out? expires = {round, turn} recorded at placement; now = combat {round, turn}. */
export function areaExpired(expires, now) {
  if ( !expires || !now ) return false;
  return now.round > expires.round || (now.round === expires.round && now.turn >= expires.turn);
}
