/**
 * Jutsu roll facts (STD6d; docs/STD6d_SPEC.md). Rolls made from a cast card carry the jutsu's facts,
 * so rule elements and action effects can name them in predicates (rules/elements.mjs rollOptions
 * reads spec.facts):
 *   jutsu                    a roll from a jutsu's cast card
 *   jutsu:keyword:<k>        each keyword (medical, fireRelease, clash...)
 *   jutsu:rank:<R>           the rank it was cast at (D, C, B, A, S)
 *   jutsu:discipline:<d>     the discipline it was cast as (nin, tai, gen, buki)
 *   jutsu:id:<identifier>    the jutsu itself (STD6d Genjutsu Specialist: Black Fangs on Shadow Bite)
 * A save against a cast card carries the same facts prefixed "against:" (AMP1f batch 4: Aura of
 * Power, "against:jutsu:discipline:nin").
 * Pure: plain item data in.
 */
const list = v => (Array.isArray(v) ? v : v ? [...v] : []);

export function jutsuFacts(item, { rank = "", discipline = "" } = {}) {
  if ( !item || item.type !== "jutsu" ) return [];
  const sys = item.system ?? {};
  const facts = ["jutsu", ...list(sys.keywords).map(k => `jutsu:keyword:${k}`)];
  const r = rank || sys.rank;
  if ( r ) facts.push(`jutsu:rank:${r}`);
  const d = discipline || sys.discipline;
  if ( d ) facts.push(`jutsu:discipline:${d}`);
  if ( sys.identifier ) facts.push(`jutsu:id:${sys.identifier}`);
  return facts;
}

/** "@rankValue" in an action effect's element values, as the cast rank's number (D 1 ... S 5). */
export function resolveRankValues(rules, rankNumber) {
  return (rules ?? []).map(r => {
    const out = { ...r };
    for ( const [k, v] of Object.entries(out) ) {
      if ( typeof v === "string" && v.includes("@rankValue") ) {
        const s = v.replace(/@rankValue/g, String(rankNumber));
        const m = s.replace(/\s+/g, "").match(/^(-?\d+)(?:([+*])(-?\d+))?$/);
        out[k] = !m ? s : !m[2] ? Number(m[1]) : m[2] === "+" ? Number(m[1]) + Number(m[3]) : Number(m[1]) * Number(m[3]);
      }
    }
    return out;
  });
}
