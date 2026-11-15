/**
 * Stance weapons (STD6b E1; docs/STD6b_SPEC.md). A stance lists the weapons that qualify for it at
 * flags.n5e.qualifies {groups: [...], properties: [...], items: [...]}: a weapon qualifies when it has
 * any listed group or property, or its name or identifier is listed (King Q-S1). Pure: plain data in.
 *
 * The facts a weapon gives a roll (rules/elements.mjs rollOptions reads spec.facts):
 *   weapon                 a weapon attack or damage roll ("weapon:unarmed" for an unarmed strike)
 *   weapon:group:<g>       each weapon group
 *   weapon:property:<p>    each property
 *   weapon:stance          the weapon qualifies for the active stance
 */
const list = v => (Array.isArray(v) ? v : v ? [...v] : []);
const slug = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Does this weapon qualify for the stance? A stance without a list qualifies nothing. */
export function qualifiesForStance(weapon, stance) {
  const q = stance?.flags?.n5e?.qualifies;
  if ( !weapon || !q ) return false;
  const sys = weapon.system ?? {};
  const groups = list(sys.groups);
  const props = Object.keys(sys.properties ?? {});
  const names = [slug(weapon.name), slug(sys.identifier)].filter(Boolean);
  return list(q.groups).some(g => groups.includes(g))
    || list(q.properties).some(p => props.includes(p))
    || list(q.items).some(i => names.includes(slug(i)));
}

/** The roll facts a weapon gives (an empty weapon is an unarmed strike). */
export function weaponFacts(weapon, stance = null) {
  if ( !weapon ) return ["weapon:unarmed"];
  const sys = weapon.system ?? {};
  const facts = ["weapon", ...list(sys.groups).map(g => `weapon:group:${g}`), ...Object.keys(sys.properties ?? {}).map(p => `weapon:property:${p}`)];
  if ( qualifiesForStance(weapon, stance) ) facts.push("weapon:stance");
  return facts;
}
