/** Structured class-option requirements. Unstructured source prerequisites remain visible to players. */
const list = value => Array.from(value ?? []);

export function itemChoiceAllowed(item, { actor, level, owned = actor.items, key = "" }) {
  const items = list(owned);
  const req = item.system.requirement;
  if ( (req?.level ?? 0) > level ) return false;
  const clan = items.find(i => i.type === "clan");
  if ( req?.clan && req.clan !== clan?.system.identifier ) return false;
  const required = item.flags?.n5e?.requiresItems ?? [];
  if ( required.some(id => !items.some(i => i.system.identifier === id)) ) return false;
  if ( key === "stance-new-type" ) {
    const knownTypes = new Set(items.filter(i => i.type === "stance").flatMap(i => list(i.system.categories)));
    if ( list(item.system.categories).some(c => knownTypes.has(c)) ) return false;
  }
  return true;
}

export function advancementAvailable(step, actor) {
  const owned = list(actor.items);
  return (step.requires ?? []).every(id => owned.some(i => i.system.identifier === id));
}

/** Apply-time guard as well as picker filtering: reject forged, stale, duplicate or premature picks. */
export async function validateItemChoices(actor, level, steps, selections, resolve = fromUuid) {
  const errors = [];
  const owned = [...actor.items];
  // Features granted at this level can satisfy requirements for a same-level choice.
  for ( const step of steps.filter(s => s.type === "feature") ) for ( const uuid of step.uuids ) {
    const doc = await resolve(uuid);
    if ( doc ) owned.push(doc);
  }
  const seen = new Set();
  for ( const step of steps.filter(s => ["itemChoice", "featChoice", "subclass"].includes(s.type)) ) {
    const picked = selections[step.id] ?? [];
    if ( new Set(picked).size !== picked.length || picked.length > step.count ) errors.push(`${step.title}: invalid choice count.`);
    for ( const uuid of picked ) {
      if ( step.type !== "featChoice" && !step.uuids.includes(uuid) ) { errors.push(`${step.title}: item is outside the permitted list.`); continue; }
      const doc = await resolve(uuid);
      if ( step.type === "featChoice" && (doc?.type !== "feat" || ["classFeature", "classOption", "clanFeature", "clanOption", "backgroundFeature", "npcFeature"].includes(doc.system.category)) ) {
        errors.push(`${step.title}: choose a feat, not a feature.`); continue;
      }
      if ( !doc || !itemChoiceAllowed(doc, { actor, level, owned, key: step.key }) ) { errors.push(`${step.title}: requirements are not met.`); continue; }
      if ( !doc.flags?.n5e?.repeatable && (seen.has(uuid) || actor.items.some(i => i.name.toLowerCase() === doc.name.toLowerCase())) ) {
        errors.push(`${step.title}: the item is already selected or owned.`);
      }
      seen.add(uuid);
    }
  }
  return errors;
}
