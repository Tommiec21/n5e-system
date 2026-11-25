/**
 * Applies and reverts one class level (Foundry side). Every item a level creates is stamped with
 * flags.n5e.advancement = {origin, level, step}, so lowering the level removes exactly what it added.
 * Choices are recorded on the class/subclass advancement entries (`chosen`) and ASIs in
 * flags.n5e.asi.<level> on the class.
 */
import { validateItemChoices } from "./eligibility.mjs";
import { learningData, alertLearning, grantFeatureJutsu } from "../workflow/learn-jutsu.mjs";
import { jutsuSlots, learnBlock, learnedMode, conditionHolds } from "../rules/jutsu-slots.mjs";
import { levelRefund } from "../rules/leveling.mjs";

/**
 * LVL1 L2: remove items switched out at this level (jutsu swaps, option swaps), recording them on the
 * class (flags.n5e.levelSwaps.<level>: {removed: [item data], chosen: {ownerId: {advId: chosen}}}) so
 * Remove level puts them back. An option switched out also leaves its advancement entry's `chosen`.
 */
async function swapOutItems(actor, cls, level, ids) {
  const removed = [];
  const chosen = {};
  for ( const id of new Set(ids) ) {
    const item = actor.items.get(id);
    if ( !item ) continue;
    removed.push(item.toObject());
    const stamp = item.flags?.n5e?.advancement;
    const owner = stamp && actor.items.get(stamp.origin);
    const advId = stamp?.step?.split(":").slice(1).join(":");
    const src = item._stats?.compendiumSource ?? item.flags?.core?.sourceId;
    if ( owner && advId && src ) {
      const adv = owner.system.toObject().advancement;
      const a = adv.find(x => x.id === advId);
      if ( a?.chosen?.includes(src) ) {
        chosen[owner.id] ??= {};
        chosen[owner.id][advId] ??= [...a.chosen];
        a.chosen = a.chosen.filter(u => u !== src);
        await owner.update({ "system.advancement": adv });
      }
    }
  }
  if ( !removed.length ) return;
  await cls.setFlag("n5e", `levelSwaps.${level}`, { removed, chosen });
  await actor.deleteEmbeddedDocuments("Item", removed.map(d => d._id));
}

/** LVL1 L2: Remove level puts back what that level switched out. */
async function restoreSwaps(actor, cls, level) {
  const rec = cls.getFlag("n5e", `levelSwaps.${level}`);
  if ( !rec ) return;
  const back = (rec.removed ?? []).filter(d => !actor.items.get(d._id));
  if ( back.length ) await actor.createEmbeddedDocuments("Item", back, { keepId: true });
  for ( const [ownerId, byAdv] of Object.entries(rec.chosen ?? {}) ) {
    const owner = actor.items.get(ownerId);
    if ( !owner ) continue;
    await owner.update({ "system.advancement": owner.system.toObject().advancement.map(a => (a.id in byAdv ? { ...a, chosen: byAdv[a.id] } : a)) });
  }
  await cls.unsetFlag("n5e", `levelSwaps.${level}`);
}

/** The actor's abilities after this level's ASI (+1), for the jutsu ability requirement (LVL1 L1). */
function probeAfterAsi(actor, steps, sel) {
  const asi = steps.find(s => s.type === "asi");
  const up = asi ? sel[asi.id]?.ability : "";
  if ( !up ) return actor;
  const sys = actor.system;
  return { name: actor.name, items: actor.items, system: { ...sys, abilities: { ...sys.abilities, [up]: { ...sys.abilities[up], value: (sys.abilities[up]?.value ?? 10) + 1 } } } };
}

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
  // LVL1 L3: what the character had before this level, for conditional grants ("if you already have...").
  const sys0 = actor.system ?? {};
  const before = { name: actor.name, system: { grants: { affinities: [...(sys0.grants?.affinities ?? [])] },
    skills: structuredClone(sys0.skills ?? {}), tools: structuredClone(sys0.tools ?? {}), saves: structuredClone(sys0.saves ?? {}) } };
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
  // LEFT1 P5: a feature's own picks ("feat:<item id or uuid>") are written onto that feature after creation.
  const featChoices = {};
  const record = (st, value) => {
    if ( String(st.origin).startsWith("feat:") ) { (featChoices[st.origin.slice(5)] ??= {})[st.advId] = value; return; }
    (st.origin === "clan" ? clanChoices : st.origin === "subclass" ? subChoices : classChoices)[st.advId] = value;
  };

  const updates = {};
  const learnAlerts = [];
  const swapOut = [];
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
        // LVL1 L2: earlier picks switched out leave (restored by Remove level).
        for ( const id of st.replace ?? [] ) swapOut.push(id);
        break;
      case "swapJutsu": {
        // LVL1 L2: forget the known jutsu only when a replacement was dropped.
        const uuid = (value ?? [])[0];
        const old = actor.items.get(st.forget);
        const doc = uuid ? await fromUuid(uuid) : null;
        if ( !doc || !old ) break;
        const block = learnBlock(probeAfterAsi(actor, steps, sel), doc);
        if ( block ) { ui.notifications?.error(block); break; }
        const { data, problems } = learningData(actor, doc, { slot: { mode: learnedMode(old), source: old.system.learned?.source ?? "", grantedBy: old.system.learned?.grantedBy ?? "", filter: st.filter },
          stamp: { ...stamp, step: st.id }, maxRank: st.maxRank ?? "" });
        create.push(data);
        if ( problems.length ) learnAlerts.push([doc.name, problems]);
        swapOut.push(old.id);
        break;
      }
      case "option":
      case "masteryChoice":
        // Stored as the advancement's chosen values; the actor pipeline reads them (Mastery: creature.mjs).
        record(st, value ?? []);
        break;
      case "trait":
        if ( st.id === "class:skills" ) await cls.update({ "system.skills.chosen": [...(value ?? []), ...(sel["class:skills:dup"] ?? [])] });
        else if ( st.id === "class:tools" ) await cls.update({ "system.tools.chosen": [...(value ?? []), ...(sel["class:tools:dup"] ?? [])] });
        // LVL1 L3: a replacement for a duplicate fixed proficiency (merged above when the class also has a pick).
        else if ( st.id === "class:skills:dup" ) { if ( !steps.some(x => x.id === "class:skills") ) await cls.update({ "system.skills.chosen": value ?? [] }); }
        else if ( st.id === "class:tools:dup" ) { if ( !steps.some(x => x.id === "class:tools") ) await cls.update({ "system.tools.chosen": value ?? [] }); }
        else record(st, value ?? []);
        break;
      case "jutsu":
      case "bonusJutsu": {
        // NT1: jutsu dropped into the level-up window. Class slots count toward Jutsu Known; bonus slots
        // belong to the feature that gives them. Over the slot count or breaking a rule only alerts.
        const slots = jutsuSlots(actor);
        for ( const [n, uuid] of (value ?? []).entries() ) {
          const doc = await fromUuid(uuid);
          if ( !doc ) continue;
          const slot = st.type === "bonusJutsu"
            ? { mode: "bonus", source: st.sourceUuid, grantedBy: st.sourceName, filter: st.filter }
            : { mode: "class", source: "", grantedBy: "", filter: null, overLimit: n >= (st.count ?? 0) };
          const { data, problems } = learningData(actor, doc, { slot, stamp: { ...stamp, step: st.id }, slots, maxRank: st.maxRank ?? "" });
          const block = learnBlock(probeAfterAsi(actor, steps, sel), doc);
          // LVL1 L1: below the ability requirement it isn't learned (the window already refused it).
          if ( block ) { ui.notifications?.error(block); continue; }
          create.push(data);
          if ( problems.length ) learnAlerts.push([doc.name, problems]);
        }
        break;
      }
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
  for ( const d of add ) {
    const cond = d.type === "feat" ? d.system?.bonusJutsu?.condition : "";
    if ( cond ) foundry.utils.setProperty(d, "flags.n5e.conditionMet", conditionHolds(before, cond));
  }
  const created = add.length ? await actor.createEmbeddedDocuments("Item", add) : [];
  if ( swapOut.length ) await swapOutItems(actor, cls, level, swapOut);
  // NT1: features gained this level that name specific jutsu grant them now (Bonus Jutsu); feature sweep:
  // features already had that grant jutsu at this level (Reaper's Expanded jutsu) grant those too.
  await grantFeatureJutsu(actor, created, { level });
  const had = actor.items.filter(i => i.type === "feat" && !created.some(c => c.id === i.id) && (i.system.grants?.jutsuByLevel ?? []).some(g => g.level === level));
  if ( had.length ) await grantFeatureJutsu(actor, had, { level, onlyLevel: level });
  for ( const [name, problems] of learnAlerts ) await alertLearning(actor, name, problems);
  for ( const [key, byAdv] of Object.entries(featChoices) ) {
    const item = actor.items.get(key) ?? actor.items.find(i => (i._stats?.compendiumSource ?? i.flags?.core?.sourceId) === key);
    if ( !item ) continue;
    const picked = { ...(item.flags?.n5e?.featPickLevels ?? {}), ...Object.fromEntries(Object.keys(byAdv).map(id => [id, level])) };
    await item.update({ "system.advancement": item.system.toObject().advancement.map(a => (a.id in byAdv ? { ...a, chosen: byAdv[a.id] } : a)),
      "flags.n5e.featPickLevels": picked });
  }
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
  // LEFT1 P5: a kept feature's picks made at this level up are cleared (offered again next time).
  for ( const f of actor.items.filter(i => i.type === "feat" && Object.values(i.flags?.n5e?.featPickLevels ?? {}).includes(level)) ) {
    const at = f.flags.n5e.featPickLevels;
    await f.update({ "system.advancement": f.system.toObject().advancement.map(a => (at[a.id] === level ? { ...a, chosen: [] } : a)),
      "flags.n5e.featPickLevels": Object.fromEntries(Object.entries(at).filter(([, l]) => l !== level)) });
  }
  await restoreSwaps(actor, cls, level);
  const sub = actor.items.get(subclass?.id);
  if ( sub ) await clear(sub);
  if ( clan ) {
    const characterLevel = actor.system.level ?? level;
    await clan.update({ "system.advancement": clan.system.toObject().advancement.map(a => a.level === characterLevel ? { ...a, chosen: [] } : a) });
    await clan.setFlag("n5e", "clanAppliedLevels", (clan.flags?.n5e?.clanAppliedLevels ?? []).filter(l => l !== characterLevel));
  }
  // King 2026-11-25: Remove level refunds what the level spent (its XP, or its granted level).
  const spent = cls.getFlag("n5e", `levelSpent.${level}`);
  if ( spent ) {
    const refund = levelRefund(spent, { xp: actor._source?.system?.details?.xp ?? actor.system?.details?.xp ?? 0, granted: actor.flags?.n5e?.levelsGranted ?? 0 });
    if ( Object.keys(refund).length ) await actor.update(refund);
    if ( level > 1 ) await cls.unsetFlag("n5e", `levelSpent.${level}`);
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

/** LVL1 L5: the choice steps a past level can change (not subclass, features, HP/CP or jutsu). */
export const EDITABLE_STEPS = new Set(["itemChoice", "featChoice", "option", "trait", "masteryChoice", "asi"]);

/**
 * LVL1 L5 (King Q10): what a past level chose, as level-up selections (to prefill the window).
 * @returns {object} selections keyed by step id
 */
export function levelSelections(actor, cls, level, steps) {
  const clan = actor.items.find(i => i.type === "clan");
  const subclass = actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === cls.system.identifier);
  const owner = st => (st.origin === "clan" ? clan : st.origin === "subclass" ? subclass : cls);
  const sel = {};
  for ( const st of steps ) {
    if ( st.id === "class:skills" ) sel[st.id] = [...(cls.system.skills?.chosen ?? [])];
    else if ( st.id === "class:tools" ) sel[st.id] = [...(cls.system.tools?.chosen ?? [])];
    else if ( st.type === "asi" ) sel[st.id] = { ...(cls.getFlag?.("n5e", `asi.${level}`) ?? {}) };
    else if ( st.advId ) sel[st.id] = [...(owner(st)?.system.advancement.find(a => a.id === st.advId)?.chosen ?? [])];
  }
  return sel;
}

/**
 * LVL1 L5 (King Q10): change a past level's choices. Items the old picks created (stamped with that level
 * and step) leave, the new picks arrive with the same stamp, recorded choices are rewritten, and an ASI's
 * ability, feat and Mastery move. The GM and the owners are alerted with what changed.
 * @returns {string[]} lines describing the changes
 */
export async function editLevel(actor, cls, level, steps, sel) {
  const old = levelSelections(actor, cls, level, steps);
  const clan = actor.items.find(i => i.type === "clan");
  const subclass = actor.items.find(i => i.type === "subclass" && i.system.classIdentifier === cls.system.identifier);
  const ownerOf = st => (st.origin === "clan" ? clan : st.origin === "subclass" ? subclass : cls);
  const stampedAt = st => actor.items.filter(i => i.flags?.n5e?.advancement?.level === level && i.flags.n5e.advancement.step === st.id);
  const src = i => i._stats?.compendiumSource ?? i.flags?.core?.sourceId;
  const names = async uuids => (await Promise.all(uuids.map(u => fromUuid(u)))).map((d, n) => d?.name ?? uuids[n]);
  const create = [];
  const remove = [];
  const updates = {};
  const changes = [];
  const byOwner = new Map();
  for ( const st of steps ) {
    const now = sel[st.id];
    const was = old[st.id];
    if ( st.type === "asi" ) {
      const a = was ?? {};
      const b = now ?? {};
      if ( a.ability !== b.ability ) {
        if ( a.ability ) updates[`system.abilities.${a.ability}.value`] = (updates[`system.abilities.${a.ability}.value`] ?? actor._source.system.abilities[a.ability].value) - 1;
        if ( b.ability ) updates[`system.abilities.${b.ability}.value`] = (updates[`system.abilities.${b.ability}.value`] ?? actor._source.system.abilities[b.ability].value) + 1;
        changes.push(`ASI ability: ${a.ability || "none"} → ${b.ability || "none"}`);
      }
      if ( a.mastery !== b.mastery ) {
        const sources = actor._source.system.mastery.sources.filter(m => m.source !== `ASI ${level}`);
        if ( b.mastery ) sources.push({ target: b.mastery, source: `ASI ${level}` });
        updates["system.mastery.sources"] = sources;
        changes.push(`ASI Mastery: ${a.mastery || "none"} → ${b.mastery || "none"}`);
      }
      if ( a.feat !== b.feat ) {
        remove.push(...stampedAt(st).filter(i => !a.feat || src(i) === a.feat).map(i => i.id));
        if ( b.feat ) create.push(...await itemData([b.feat], { origin: cls.id, level, step: st.id }));
        changes.push(`ASI feat: ${(a.feat ? (await names([a.feat]))[0] : "none")} → ${(b.feat ? (await names([b.feat]))[0] : "none")}`);
      }
      await cls.setFlag("n5e", `asi.${level}`, { ability: b.ability ?? "", feat: b.feat ?? "", mastery: b.mastery ?? "" });
      continue;
    }
    const A = [...(was ?? [])];
    const B = [...(now ?? [])];
    if ( A.length === B.length && A.every(v => B.includes(v)) ) continue;
    if ( st.type === "itemChoice" || st.type === "featChoice" ) {
      const gone = A.filter(u => !B.includes(u));
      const added = B.filter(u => !A.includes(u));
      remove.push(...stampedAt(st).filter(i => gone.includes(src(i))).map(i => i.id));
      create.push(...await itemData(added, { origin: ownerOf(st)?.id ?? cls.id, level, step: st.id }));
      changes.push(`${st.title}: ${(await names(gone)).join(", ") || "none"} → ${(await names(added)).join(", ") || "none"}`);
    } else changes.push(`${st.title}: ${A.join(", ") || "none"} → ${B.join(", ") || "none"}`);
    if ( st.id === "class:skills" ) updates.__clsSkills = B;
    else if ( st.id === "class:tools" ) updates.__clsTools = B;
    else if ( st.advId ) {
      const o = ownerOf(st);
      if ( o ) byOwner.set(o, { ...(byOwner.get(o) ?? {}), [st.advId]: B });
    }
  }
  if ( updates.__clsSkills ) await cls.update({ "system.skills.chosen": updates.__clsSkills });
  if ( updates.__clsTools ) await cls.update({ "system.tools.chosen": updates.__clsTools });
  delete updates.__clsSkills; delete updates.__clsTools;
  for ( const [o, byAdv] of byOwner ) await o.update({ "system.advancement": o.system.toObject().advancement.map(a => (a.id in byAdv ? { ...a, chosen: byAdv[a.id] } : a)) });
  if ( remove.length ) await actor.deleteEmbeddedDocuments("Item", [...new Set(remove)]);
  const created = create.length ? await actor.createEmbeddedDocuments("Item", create) : [];
  await grantFeatureJutsu(actor, created);
  if ( Object.keys(updates).length ) await actor.update(updates);
  if ( changes.length ) await alertLearning(actor, `level ${level}`, [changes.join("; ") + "."], "changed the choices of");
  return changes;
}
