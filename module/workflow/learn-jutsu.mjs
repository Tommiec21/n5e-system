/**
 * NT1 (King 2026-11-24): learning a jutsu onto a character (sheet drop, the Jutsu Browser's Add, the
 * level-up window). It takes a slot (rules/jutsu-slots.mjs assignSlot), is stamped with the level and the
 * class it was learned at (so Remove level takes it back), and is never blocked: a rule it breaks, or no
 * open slot, is an alert to the player and the GM (King Q3, Q4).
 */
import { assignSlot, jutsuSlots, learnProblems } from "../rules/jutsu-slots.mjs";

/** Warn the user here and whisper the GMs and the actor's owners. */
export async function alertLearning(actor, jutsuName, problems) {
  if ( !problems.length ) return;
  const text = `${actor.name} learned ${jutsuName}: ${problems.join(" ")}`;
  ui.notifications?.warn(text);
  const whisper = game.users?.filter(u => u.isGM || actor.testUserPermission?.(u, "OWNER")).map(u => u.id) ?? [];
  await ChatMessage.implementation?.create({
    speaker: ChatMessage.getSpeaker?.({ actor }), whisper,
    content: `<div class="n5e-learn-alert"><strong><i class="fa-solid fa-triangle-exclamation"></i> Jutsu learning</strong><p>${foundry.utils.escapeHTML?.(text) ?? text}</p></div>`
  });
}

/**
 * The creation data for learning `doc`, its slot and the problems to alert. Pure apart from reading CONFIG.
 * @param {Actor} actor
 * @param {Item} doc            the jutsu (compendium or world)
 * @param {object} [o]
 * @param {object} [o.slot]     a forced slot {mode, source, grantedBy, filter} (level-up picks)
 * @param {object|false} [o.stamp]  flags.n5e.advancement stamp; default: the class at its current level; false: none
 * @param {object} [o.slots]    jutsuSlots(actor), when several are learned in a row
 */
export function learningData(actor, doc, { slot = null, stamp = null, slots = null, maxRank = "" } = {}) {
  const s = slots ?? jutsuSlots(actor);
  const pick = slot ?? assignSlot(actor, doc, s);
  const problems = learnProblems(actor, doc, { maxRank, filter: pick.filter, keywords: CONFIG.N5E?.keywords ?? {} });
  if ( pick.overLimit ) problems.push(slot ? "No open jutsu slot: it is over this level's Jutsu Known limit."
    : `No open jutsu slot: it is over the Jutsu Known limit (Class ${s.class.used}/${s.class.max ?? "–"}, Bonus ${s.bonus.used}/${s.bonus.max}).`);
  const data = doc.toObject();
  delete data._id;
  foundry.utils.setProperty(data, "system.learned", { mode: pick.mode, source: pick.source ?? "", grantedBy: pick.grantedBy ?? "" });
  if ( doc.pack || doc.uuid?.startsWith("Compendium.") ) {
    foundry.utils.setProperty(data, "flags.core.sourceId", doc.uuid);
    foundry.utils.setProperty(data, "_stats.compendiumSource", doc.uuid);
  }
  const cls = actor.items.find(i => i.type === "class");
  const st = stamp === false ? null : stamp ?? (cls ? { origin: cls.id, level: cls.system.levels ?? 1, step: "jutsu" } : null);
  if ( st ) foundry.utils.setProperty(data, "flags.n5e.advancement", st);
  return { data, slot: pick, problems };
}

/** Learn one jutsu now: create it, then alert anything it breaks. */
export async function learnJutsu(actor, doc, options = {}) {
  const { data, problems } = learningData(actor, doc, options);
  const [created] = await actor.createEmbeddedDocuments("Item", [data]);
  await alertLearning(actor, doc.name, problems);
  return created;
}

/**
 * NT1: a feature, feat or trait that names specific jutsu (`system.grants.jutsu`, uuids) grants them
 * outright as Bonus Jutsu from that item. Call after the items are created (level-up, clan, a sheet drop).
 * Each jutsu carries the item's own stamp (flags.n5e.advancement / clanOrigin) so removing what granted
 * the item removes the jutsu too. Jutsu already known are skipped.
 * @param {Actor} actor
 * @param {Item[]} granted   items just created on the actor
 */
export async function grantFeatureJutsu(actor, granted) {
  const create = [];
  const known = new Set(actor.items.filter(i => i.type === "jutsu").flatMap(i => [i.system.identifier || i.name, i._stats?.compendiumSource ?? i.flags?.core?.sourceId]).filter(Boolean));
  for ( const item of granted ?? [] ) {
    const uuids = item?.type === "feat" ? [...(item.system.grants?.jutsu ?? [])] : [];
    for ( const uuid of uuids ) {
      if ( known.has(uuid) ) continue;
      const doc = await fromUuid(uuid);
      if ( !doc || doc.type !== "jutsu" || known.has(doc.system.identifier || doc.name) ) {
        if ( !doc ) ui.notifications?.warn(`N5e | ${item.name}: missing granted jutsu ${uuid}`);
        continue;
      }
      known.add(uuid); known.add(doc.system.identifier || doc.name);
      const source = item._stats?.compendiumSource ?? item.flags?.core?.sourceId ?? item.id;
      const { data } = learningData(actor, doc, { slot: { mode: "bonus", source, grantedBy: item.name, filter: null }, stamp: item.flags?.n5e?.advancement ?? false });
      for ( const k of ["clanOrigin", "clanLevel"] ) if ( item.flags?.n5e?.[k] != null ) foundry.utils.setProperty(data, `flags.n5e.${k}`, item.flags.n5e[k]);
      create.push(data);
    }
  }
  return create.length ? actor.createEmbeddedDocuments("Item", create) : [];
}
