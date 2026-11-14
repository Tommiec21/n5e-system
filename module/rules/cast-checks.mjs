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
import { rankOrder } from "../config/core.mjs";
import { maxRankForLevel } from "./progression.mjs";
import { caughtBy } from "./cast-discipline.mjs";
import { tagsOn, suppressionBlocks } from "./jutsu-defense.mjs";

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
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
export function castBlockers(actor, item, { rank, discipline = "" } = {}) {
  const problems = [];
  const statuses = actor.statuses ?? new Set();
  const flags = actor.system?.conditionPenalties?.flags ?? {};
  const has = s => statuses.has?.(s);
  const comps = jutsuComponents(item);

  if ( flags.incapacitated || has("incapacitated") || has("stunned") || has("unconscious") ) problems.push("Incapacitated: can't take actions or Mold Chakra");
  const handsBound = has("grappled") || has("restrained");
  if ( comps.includes("hs") && handsBound ) problems.push("Hand Seals need free hands (Grappled or Restrained)");
  if ( comps.includes("hs") && list(flags.noComponents).includes("hs") ) problems.push("Confused: can't use Hand Seals");
  if ( comps.includes("cs") && handsBound ) problems.push("Chakra Seals need free hands (Grappled or Restrained)");
  if ( comps.includes("m") && handsBound ) problems.push("Mobility needs movement (Grappled or Restrained)");
  if ( Number.isFinite(flags.maxComponents) && comps.length > flags.maxComponents ) problems.push(`Slowed: can't cast a jutsu with more than ${flags.maxComponents} components (this one has ${comps.length})`);
  if ( flags.maxAttackOrJutsuPerTurn && actor.flags?.n5e?.economy?.attackOrJutsu ) problems.push("Shocked: already made an attack or cast a jutsu this turn");
  const sealed = flags["has.sealed"] ?? 0;
  if ( flags.noTeleportAtRanks && sealed >= flags.noTeleportAtRanks && /\bteleport/i.test(String(item.system?.description ?? "")) ) problems.push(`Sealed ${sealed}: can't teleport`);
  if ( flags.noDojutsu && kw(item).has("dojutsu") ) problems.push("Blinded: can't use Dojutsu");

  // Multi-discipline jutsu: the requirement uses the cast discipline's ability (MDISC1).
  const live = (discipline && item.system?.liveAs?.(discipline)) || item.system?.live || {};
  if ( live.meetsRequirement === false ) problems.push(`Needs ${String(live.ability ?? "").toUpperCase()} ${live.requirement} to cast this rank`);
  const castMax = actor.system?.grants?.maxRank ?? maxRankForLevel(actor.system?.level ?? 1);
  const at = rank ?? item.system?.rank;
  // Chakra Suppression Tag (KB 08): caught by any listed discipline (MDISC1).
  const tag = tagsOn(actor, "suppressionTag").find(t => suppressionBlocks({ tagRank: t.rank, castRank: at, ninOrGen: caughtBy(item, ["nin", "gen"]) }));
  if ( tag ) problems.push(`Chakra Suppression Tag (${tag.rank}-Rank): can't cast Ninjutsu or Genjutsu below ${tag.rank}-Rank`);
  if ( castMax && rankOrder.indexOf(at) > rankOrder.indexOf(castMax) ) problems.push(`${at}-Rank is above the highest rank you can cast (${castMax})`);
  return problems;
}
