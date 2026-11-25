/** Explicit clan setup; source dependencies resolve before replacing any old origin. */
import { existingCopy } from "../rules/item-audit.mjs";
import { abilities } from "../config/core.mjs";
import { clanSetupFields, clanSetupPlan } from "../advancement/clan.mjs";
import { withActorLock } from "./commands.mjs";
import { grantFeatureJutsu } from "./learn-jutsu.mjs";

export async function addClan(actor, item, { ask = null } = {}) {
  if ( !actor.isOwner ) return null;
  return withActorLock(actor, async () => {
    const old = actor.items.find(i => i.type === "clan");
    if ( old?.system.identifier === item.system.identifier && old.flags?.n5e?.clanSetup?.version ) { ui.notifications.info(`${actor.name} already has this clan configured.`); return null; }
    const pack = game.packs.get("n5e.clans");
    const docs = [...(pack ? await pack.getDocuments() : []), ...await game.packs.get("n5e.feats")?.getDocuments() ?? [], ...game.items.filter(i => i.type === "feat")];
    const fields = clanSetupFields(actor, item, docs);
    // CREATE1 C3: the score before this clan's increases (an old clan's applied increases taken off).
    const oldInc = old?.flags?.n5e?.clanAbilityIncreases ?? {};
    const baseScore = k => (actor._source?.system?.abilities?.[k]?.value ?? actor.system?.abilities?.[k]?.value ?? 10) - (Number(oldInc[k]) || 0);
    // King 2026-11-25: the clan setup is a window in the level-up's style (applications/clan-setup.mjs).
    const askFn = ask ?? (async (...args) => (await import("../applications/clan-setup.mjs")).default.wait(...args));
    let selection, plan, error = "";
    while ( true ) {
      selection = await askFn({ actor, clan: item, old, fields, docs, baseScore, error, threeOption: item.system.identifier === "non-clan" });
      if ( !selection || selection === "cancel" ) return null;
      plan = clanSetupPlan(actor, item, fields, selection, docs);
      if ( !plan.errors.length ) break;
      error = plan.errors[0];
      ui.notifications.warn(error);
    }
    const oldIncreases = old?.flags?.n5e?.clanAbilityIncreases ?? {};
    const updates = {}, rollback = {};
    if ( selection.applyASI ) for ( const key of Object.keys(abilities) ) {
      const before = actor._source.system.abilities[key].value;
      const next = before - (oldIncreases[key] ?? 0) + (plan.increments[key] ?? 0);
      if ( next < 0 || (next > 20 && next > before) ) throw new Error("Clan increases would put an ability outside 0–20. Review the scores or uncheck applying increases.");
      if ( next !== before ) { updates[`system.abilities.${key}.value`] = next; rollback[`system.abilities.${key}.value`] = before; }
    }
    const data = item.toObject(); delete data._id; delete data._key; data.folder = null;
    data.system.skills = { fixed: plan.selectedSkills, choose: 0, from: [], chosen: [] };
    data.system.affinities.chosen = plan.selectedAffinities;
    data.system.branch = plan.branch;
    data.system.asi = { ...data.system.asi, mode: selection.mode, plus2: selection.abilities[0], plus1: selection.abilities[1] };
    data.flags.n5e.clanAbilityIncreases = selection.applyASI ? plan.increments : {};
    data.flags.n5e.clanSetup = { version: 1, choices: selection.choices };
    data.flags.n5e.clanAppliedLevels = [...new Set(data.system.advancement.filter(a => a.level <= Math.max(1, actor.system.level ?? 1)).map(a => a.level))];
    for ( const adv of data.system.advancement ) if ( selection.choices[adv.id] ) adv.chosen = selection.choices[adv.id];
    if ( plan.mastery.length ) {
      const mastery = data.system.advancement.find(a => a.title === "Self-Taught Skills");
      if ( mastery ) mastery.chosen = plan.mastery;
    }
    const created = [];
    const oldItems = old ? actor.items.filter(i => i.id === old.id || i.flags?.n5e?.clanOrigin === old.id || i.flags?.n5e?.advancement?.origin === old.id).map(i => i.toObject()) : [];
    let appliedScores = false;
    try {
      const [clan] = await actor.createEmbeddedDocuments("Item", [data]); created.push(clan);
      const grantData = plan.grants.map(({ doc, level }) => {
        const d = doc.toObject(); delete d._id; delete d._key; d.folder = null;
        d.flags ??= {}; d.flags.n5e = { ...d.flags.n5e, clanOrigin: clan.id, clanLevel: level };
        return d;
      });
      // FIN1: never grant a second copy of something the actor already has (the old clan's items are leaving).
      const leaving = new Set(oldItems.map(d => d._id));
      const owned = actor.items.filter(i => !leaving.has(i.id) && i.id !== clan.id);
      const fresh = grantData.filter(d => !existingCopy(owned, d));
      if ( fresh.length < grantData.length ) console.info(`n5e | ${actor.name} already had ${grantData.length - fresh.length} of ${clan.name}'s grants; not added again.`);
      if ( fresh.length ) created.push(...await actor.createEmbeddedDocuments("Item", fresh));
      // NT1: clan traits that name jutsu grant them outright (Bonus Jutsu, removed with the clan).
      created.push(...await grantFeatureJutsu(actor, created));
      if ( Object.keys(updates).length ) { await actor.update(updates); appliedScores = true; }
      if ( old ) {
        const remove = actor.items.filter(i => i.id === old.id || i.flags?.n5e?.clanOrigin === old.id || i.flags?.n5e?.advancement?.origin === old.id).map(i => i.id);
        await actor.deleteEmbeddedDocuments("Item", remove);
      }
      return clan;
    } catch (error) {
      if ( appliedScores ) await actor.update(rollback);
      const remove = created.map(d => d.id).filter(id => actor.items.get(id));
      if ( remove.length ) await actor.deleteEmbeddedDocuments("Item", remove);
      const restore = oldItems.filter(d => !actor.items.get(d._id));
      if ( restore.length ) await actor.createEmbeddedDocuments("Item", restore, { keepId: true });
      throw error;
    }
  });
}
