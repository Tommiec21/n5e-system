/**
 * Applies and reverts one class level (Foundry side). Every item a level creates is stamped with
 * flags.n5e.advancement = {origin, level, step}, so lowering the level removes exactly what it added.
 * Choices are recorded on the class/subclass advancement entries (`chosen`) and ASIs in
 * flags.n5e.asi.<level> on the class.
 */
import { validateItemChoices } from "./eligibility.mjs";

const FLAG = "advancement";

/** Load documents by uuid and return creation data stamped with the advancement origin. */
async function itemData(uuids, stamp, seen = new Set()) {
  const out = [];
  for ( const uuid of uuids ) {
    if ( seen.has(uuid) ) continue;
    seen.add(uuid);
    const doc = await fromUuid(uuid);
    if ( !doc ) {
      ui.notifications.warn(`N5e | Missing compendium item ${uuid}`);
      continue;
    }
    const data = doc.toObject();
    delete data._id;
    foundry.utils.setProperty(data, "flags.core.sourceId", uuid);
    foundry.utils.setProperty(data, "_stats.compendiumSource", uuid);
    foundry.utils.setProperty(data, `flags.n5e.${FLAG}`, stamp);
    out.push(data);
    out.push(...await itemData(doc.flags?.n5e?.grants ?? [], stamp, seen));
  }
  return out;
}

/** Write `chosen` onto the matching advancement entries of an item. */
function recordChoices(item, level, byAdvId) {
  if ( !item || !Object.keys(byAdvId).length ) return null;
  const advancement = item.system.toObject().advancement.map(a =>
    (a.level === level && a.id in byAdvId ? { ...a, chosen: byAdvId[a.id] } : a));
  return item.update({ "system.advancement": advancement });
}

/**
 * Apply one level.
 * @param {Actor} actor
 * @param {Item} cls                  class item already on the actor
 * @param {number} level              the class level being gained
 * @param {object[]} steps            from stepsForLevel (+ subclassSteps)
 * @param {Record<string, any>} sel   selections keyed by step id
 */
export async function applyLevel(actor, cls, level, steps, sel) {
  const choiceErrors = await validateItemChoices(actor, level, steps, sel);
  if ( choiceErrors.length ) throw new Error(choiceErrors[0]);
  if ( (cls.system.levels ?? 0) < level ) await cls.update({ "system.levels": level });
  const create = [];
  const classChoices = {};
  const subChoices = {};
  const clanChoices = {};
  const clan = actor.items.find(i => i.type === "clan");
  let subclass = actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === cls.system.identifier);

  // Subclass first, so its features carry its id as their origin.
  const subStep = steps.find(s => s.type === "subclass");
  if ( subStep && sel[subStep.id]?.length ) {
    const [data] = await itemData(sel[subStep.id], { origin: cls.id, level, step: subStep.id });
    if ( data ) [subclass] = await actor.createEmbeddedDocuments("Item", [data]);
  }
  const originId = st => st.origin === "clan" ? clan?.id : st.origin === "subclass" ? subclass?.id : cls.id;
  const record = (st, value) => { (st.origin === "clan" ? clanChoices : st.origin === "subclass" ? subChoices : classChoices)[st.advId] = value; };

  const updates = {};
  for ( const st of steps ) {
    const stamp = { origin: originId(st), level, step: st.id };
    if ( st.origin === "clan" ) Object.assign(stamp, { classOrigin: cls.id, characterLevel: st.advLevel });
    const value = sel[st.id];
    switch ( st.type ) {
      case "feature":
        create.push(...await itemData(st.uuids, stamp));
        break;
      case "itemChoice":
      case "featChoice":
        create.push(...await itemData(value ?? [], stamp));
        record(st, value ?? []);
        break;
      case "option":
      case "masteryChoice":
        // Stored as the advancement's chosen values; the actor pipeline reads them (Mastery: creature.mjs).
        record(st, value ?? []);
        break;
      case "trait":
        if ( st.id === "class:skills" ) await cls.update({ "system.skills.chosen": value ?? [] });
        else if ( st.id === "class:tools" ) await cls.update({ "system.tools.chosen": value ?? [] });
        else record(st, value ?? []);
        break;
      case "jutsu":
        create.push(...await itemData(value ?? [], stamp));
        break;
      case "asi": {
        const { ability, feat, mastery } = value ?? {};
        if ( ability ) updates[`system.abilities.${ability}.value`] = actor._source.system.abilities[ability].value + 1;
        if ( mastery ) {
          updates["system.mastery.sources"] = [...actor._source.system.mastery.sources, { target: mastery, source: `ASI ${level}` }];
        }
        if ( feat ) create.push(...await itemData([feat], stamp));
        await cls.setFlag("n5e", `asi.${level}`, { ability: ability ?? "", feat: feat ?? "", mastery: mastery ?? "" });
        break;
      }
      default:
        break;
    }
  }
  if ( Object.keys(updates).length ) await actor.update(updates);
  // FIN1: applying a level twice must not add the same compendium item again.
  const have = new Set(actor.items.map(i => i.flags?.core?.sourceId ?? i._stats?.compendiumSource).filter(Boolean));
  const add = create.filter(d => !have.has(d.flags?.core?.sourceId) || d.flags?.n5e?.repeatable);
  if ( add.length ) await actor.createEmbeddedDocuments("Item", add);
  await recordChoices(cls, level, classChoices);
  await recordChoices(subclass, level, subChoices);
  await recordChoices(clan, steps.find(s => s.origin === "clan")?.advLevel ?? level, clanChoices);
  const clanLevel = steps.find(s => s.origin === "clan")?.advLevel;
  if ( clan && clanLevel ) await clan.setFlag("n5e", "clanAppliedLevels", [...new Set([...(clan.flags?.n5e?.clanAppliedLevels ?? []), clanLevel])]);
}

/**
 * Remove the highest level of a class: everything stamped with that level, its ASI, its choices.
 * At level 1 the class itself is removed too.
 */
export async function revertLevel(actor, cls) {
  const level = cls.system.levels ?? 1;
  const subclass = actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === cls.system.identifier);
  const origins = new Set([cls.id, subclass?.id].filter(Boolean));
  const clan = actor.items.find(i => i.type === "clan");
  const ids = actor.items.filter(i => {
    const f = i.getFlag("n5e", FLAG);
    return f && f.level === level && (origins.has(f.origin) || f.classOrigin === cls.id)
      || (clan && i.flags?.n5e?.clanOrigin === clan.id && i.flags?.n5e?.clanLevel > Math.max(1, (actor.system?.level ?? level) - 1));
  }).map(i => i.id);

  const asi = cls.getFlag("n5e", `asi.${level}`);
  if ( asi ) {
    const updates = {};
    if ( asi.ability ) updates[`system.abilities.${asi.ability}.value`] = actor._source.system.abilities[asi.ability].value - 1;
    if ( asi.mastery ) {
      const sources = [...actor._source.system.mastery.sources];
      const idx = sources.findIndex(s => s.target === asi.mastery && s.source === `ASI ${level}`);
      if ( idx >= 0 ) sources.splice(idx, 1);
      updates["system.mastery.sources"] = sources;
    }
    if ( Object.keys(updates).length ) await actor.update(updates);
    await cls.unsetFlag("n5e", `asi.${level}`);
  }

  const clear = item => item?.update({ "system.advancement": item.system.toObject().advancement
    .map(a => (a.level === level ? { ...a, chosen: [] } : a)) });
  if ( ids.length ) await actor.deleteEmbeddedDocuments("Item", ids);
  const sub = actor.items.get(subclass?.id);
  if ( sub ) await clear(sub);
  if ( clan ) {
    const characterLevel = actor.system.level ?? level;
    await clan.update({ "system.advancement": clan.system.toObject().advancement.map(a => a.level === characterLevel ? { ...a, chosen: [] } : a) });
    await clan.setFlag("n5e", "clanAppliedLevels", (clan.flags?.n5e?.clanAppliedLevels ?? []).filter(l => l !== characterLevel));
  }
  if ( level <= 1 ) return cls.delete();
  await clear(cls);
  return cls.update({ "system.levels": level - 1 });
}

/** Remove a class completely, level by level (used when replacing a class). */
export async function removeClass(actor, cls) {
  let current = cls;
  while ( current && actor.items.get(current.id) ) {
    await revertLevel(actor, current);
    current = actor.items.get(cls.id);
  }
}

/** Creation data for a class dropped on a character: level 1, no choices carried over. */
export function freshClassData(item) {
  const data = item.toObject();
  delete data._id;
  data.system.levels = 1;
  data.system.skills.chosen = [];
  data.system.tools.chosen = [];
  data.system.advancement = (data.system.advancement ?? []).map(a => ({ ...a, chosen: [] }));
  foundry.utils.setProperty(data, "_stats.compendiumSource", item.uuid);
  if ( data.flags?.n5e?.asi ) delete data.flags.n5e.asi;
  return data;
}
