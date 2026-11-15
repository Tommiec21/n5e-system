/**
 * Pre-cast checks (pure; CAST1). What stops a creature from casting this jutsu now (KB 04/05):
 *   - Incapacitated (Stunned, Unconscious, Petrified...): no actions and can't Mold Chakra.
 *   - Hand Seals / Chakra Seals need free hands: Grappled or Restrained block them; Confused can't
 *     use Hand Seals.
 *   - Mobility needs movement: Grappled (speed 0) or Restrained block it.
 *   - Slowed: can't cast a jutsu with more than 2 components.
 *   - Shocked: at most one attack or one jutsu per turn.
 *   - Sealed 3+ ranks: can't teleport (jutsu whose text says it teleports).
 *   - Blinded: no [Dojutsu].
 *   - Chakra Suppression Tag (FIN2b): no Ninjutsu or Genjutsu below the tag's rank (any listed discipline).
 *   - Ability score requirement (B 16 / A 18 / S 20; not Hijutsu) and the highest rank for the level.
 */
import { conditionCastProblems } from "./condition-elements.mjs";
import { rankOrder } from "../config/core.mjs";
import { maxRankForLevel } from "./progression.mjs";
import { caughtBy } from "./cast-discipline.mjs";
import { tagsOn, suppressionBlocks } from "./jutsu-defense.mjs";

const kw = item => (item.system?.keywords instanceof Set ? item.system.keywords : new Set(item.system?.keywords ?? []));

/** Components this jutsu uses (count for Slowed). */
export function jutsuComponents(item) {
  const c = item.system?.components ?? {};
  const out = ["hs", "cm", "cs", "m"].filter(k => c[k]);
  if ( c.weapon?.required ) out.push("w");
  if ( c.tool?.required ) out.push("nt");
  return out;
}

/**
 * @param {Actor} actor
 * @param {Item} item           the jutsu
 * @param {{rank?: string}} [o]  the rank it is cast at
 * @returns {string[]} problems (empty = may cast)
 */
export function castBlockers(actor, item, { rank, discipline = "", scroll = false, ignore = [] } = {}) {
  const problems = [];
  const statuses = actor.statuses ?? new Set();
  const flags = actor.system?.conditionPenalties?.flags ?? {};
  // ENG1b: components an action effect removes (Subtle Ninjutsu: no hand seals).
  const comps = jutsuComponents(item).filter(c => !ignore.includes(c));

  // STD3: casting limits are data on each condition and state (config/conditions.mjs `cast`).
  problems.push(...conditionCastProblems({ statuses }, comps));
  if ( flags.maxAttackOrJutsuPerTurn && actor.flags?.n5e?.economy?.attackOrJutsu ) problems.push("Shocked: already made an attack or cast a jutsu this turn");
  const sealed = flags["has.sealed"] ?? 0;
  if ( flags.noTeleportAtRanks && sealed >= flags.noTeleportAtRanks && /\bteleport/i.test(String(item.system?.description ?? "")) ) problems.push(`Sealed ${sealed}: can't teleport`);
  if ( flags.noDojutsu && kw(item).has("dojutsu") ) problems.push("Blinded: can't use Dojutsu");

  // Multi-discipline jutsu: the requirement uses the cast discipline's ability (MDISC1).
  const live = (discipline && item.system?.liveAs?.(discipline)) || item.system?.live || {};
  // PRESTD1 Part B: a scroll has no ability requirement or rank cap (its skill tier limits the rank).
  if ( !scroll && live.meetsRequirement === false ) problems.push(`Needs ${String(live.ability ?? "").toUpperCase()} ${live.requirement} to cast this rank`);
  const castMax = actor.system?.grants?.maxRank ?? maxRankForLevel(actor.system?.level ?? 1);
  const at = rank ?? item.system?.rank;
  // Chakra Suppression Tag (KB 08): caught by any listed discipline (MDISC1).
  const tag = tagsOn(actor, "suppressionTag").find(t => suppressionBlocks({ tagRank: t.rank, castRank: at, ninOrGen: caughtBy(item, ["nin", "gen"]) }));
  if ( tag ) problems.push(`Chakra Suppression Tag (${tag.rank}-Rank): can't cast Ninjutsu or Genjutsu below ${tag.rank}-Rank`);
  if ( !scroll && castMax && rankOrder.indexOf(at) > rankOrder.indexOf(castMax) ) problems.push(`${at}-Rank is above the highest rank you can cast (${castMax})`);
  return problems;
}
