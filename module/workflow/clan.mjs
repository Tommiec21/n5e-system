/** Explicit clan setup; source dependencies resolve before replacing any old origin. */
import { abilities } from "../config/core.mjs";
import { clanSetupFields, clanSetupPlan } from "../advancement/clan.mjs";
import { esc } from "../view-models/common.mjs";
import { withActorLock } from "./commands.mjs";

export async function addClan(actor, item) {
  if ( !actor.isOwner ) return null;
  return withActorLock(actor, async () => {
    const old = actor.items.find(i => i.type === "clan");
    if ( old?.system.identifier === item.system.identifier && old.flags?.n5e?.clanSetup?.version ) { ui.notifications.info(`${actor.name} already has this clan configured.`); return null; }
    const pack = game.packs.get("n5e.clans");
    const docs = [...(pack ? await pack.getDocuments() : []), ...await game.packs.get("n5e.feats")?.getDocuments() ?? [], ...game.items.filter(i => i.type === "feat")];
    const fields = clanSetupFields(actor, item, docs);
    const select = (name, label, options) => `<label>${esc(label)}<select name="${esc(name)}"><option value="">Choose…</option>${options.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}</select></label>`;
    const abilityOptions = Object.entries(abilities).map(([value, d]) => ({ value, label: d.label }));
    const content = `<p>${old ? `Replaces ${esc(old.name)} and its linked grants. ` : ""}Choose the clan's traits and starting features. Mutation replacements and contextual rules require GM review.</p>`
      + `<label><input type="checkbox" name="applyASI" ${!old || Object.keys(old.flags?.n5e?.clanAbilityIncreases ?? {}).length ? "checked" : ""}> Apply ability increases now (uncheck if already included in your scores)</label>`
      + `<label>Ability increase pattern<select name="mode"><option value="choose">+2 to one, +1 to another</option>${item.system.identifier === "non-clan" ? '<option value="three">+1 to three different abilities</option>' : ""}</select></label>`
      + select("ability0", "+2 ability / first +1", abilityOptions) + select("ability1", "+1 ability / second +1", abilityOptions)
      + (item.system.identifier === "non-clan" ? select("ability2", "Third +1 (alternative only)", abilityOptions) : "")
      + fields.map(f => `<fieldset><legend>${esc(f.label)}${f.branch ? ` — ${esc(f.branch)} branch only` : ""}</legend>` + Array.from({ length: f.count }, (_, i) => select(`${f.id}-${i}`, f.count > 1 ? `Choice ${i + 1}` : "Choice", f.options)).join("") + "</fieldset>").join("");
    let selection, plan;
    while ( true ) {
      selection = await foundry.applications.api.DialogV2.wait({ window: { title: `${actor.name}: ${item.name} clan setup`, resizable: true }, position: { width: 700, height: 760 }, content,
        buttons: [{ action: "apply", label: old ? "Replace clan" : "Apply clan", default: true, callback: (event, button) => {
          const f = button.form.elements;
          return { mode: f.mode.value, applyASI: f.applyASI.checked, abilities: [f.ability0.value, f.ability1.value, f.ability2?.value].filter(Boolean),
            choices: Object.fromEntries(fields.map(field => [field.id, Array.from({ length: field.count }, (_, i) => f[`${field.id}-${i}`].value).filter(Boolean)])) };
        } }, { action: "cancel", label: "Cancel" }], rejectClose: false });
      if ( !selection || selection === "cancel" ) return null;
      plan = clanSetupPlan(actor, item, fields, selection, docs);
      if ( !plan.errors.length ) break;
      ui.notifications.warn(plan.errors[0]);
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
      if ( grantData.length ) created.push(...await actor.createEmbeddedDocuments("Item", grantData));
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
