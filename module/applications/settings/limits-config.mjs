/**
 * Class & Clan limits (King 2026-11-21): every class, subclass and clan feature limit that comes back
 * on a rest (resource pools and Amp uses), with a choice of when it comes back. Everyone can open it
 * to see what's in play; only the GM can save. Choices live in the world setting `limitRecovery`
 * (rules/recovery-overrides.mjs); sheets and Amp cards pick them up straight away.
 */
import { POOL_RECOVERY, AMP_RECOVERY, poolLimitKey, ampLimitKey, recoveryText, limitSections } from "../../rules/recovery-overrides.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const AMP_WRITTEN = { sr: "Short Rest", lr: "Long Rest", fr: "Full Rest", day: "Each day", rest10m: "10 minutes of rest", rest: "any rest" };

export default class LimitsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "n5e-limits-config",
    tag: "form",
    classes: ["n5e", "n5e-v2", "n5e-rules-config", "n5e-limits-config"],
    window: { title: "N5e Class & Clan Limits", icon: "fa-solid fa-hourglass-half", resizable: true },
    position: { width: 720, height: 760 },
    form: { handler: LimitsConfig.#onSubmit, closeOnSubmit: true },
    actions: { reset: LimitsConfig.#onReset }
  };

  static PARTS = { form: { template: "systems/n5e/templates/apps/limits-config.hbs", scrollable: [".rule-groups"] } };

  /** @override */
  async _prepareContext() {
    const gm = game.user.isGM;
    const overrides = game.settings.get("n5e", "limitRecovery") ?? {};
    const rows = await gatherLimits();
    for ( const r of rows ) {
      r.choice = overrides[r.key] ?? "";
      const choices = r.amp ? Object.entries(AMP_RECOVERY) : Object.entries(POOL_RECOVERY).map(([k, v]) => [k, v.label]);
      r.options = [{ value: "", label: `As written (${r.written})`, selected: !r.choice },
        ...choices.map(([value, label]) => ({ value, label, selected: value === r.choice }))];
      r.changed = !!r.choice;
    }
    const groups = limitSections(rows);
    groups.forEach((g, i) => { g.firstOfKind = i === 0 || groups[i - 1].kind !== g.kind; });
    return { gm, groups, count: rows.length };
  }

  /** Save (GM only): only choices that differ from the text are stored. */
  static async #onSubmit(event, form, formData) {
    if ( !game.user.isGM ) return ui.notifications.warn("Only the GM can change Class & Clan limits.");
    const out = {};
    for ( const [key, value] of Object.entries(formData.object) ) if ( value ) out[key] = String(value);
    await game.settings.set("n5e", "limitRecovery", out);
    ui.notifications.info("Class & Clan limits saved.");
  }

  /** "As written": every limit back to its text (GM only). */
  static async #onReset() {
    if ( !game.user.isGM ) return;
    await game.settings.set("n5e", "limitRecovery", {});
    this.render();
  }
}

/**
 * Every limit in the classes, features, clans and Amp compendiums, with its class/subclass or clan.
 * Features: by their folder (Class › Subclass, or Class › Core features); clan features: by their
 * clan; Amp cards: by the feature or clan that grants them.
 */
export async function gatherLimits() {
  const docs = async name => (await game.packs.get(`n5e.${name}`)?.getDocuments?.()) ?? [];
  const [classes, features, clans, amps] = await Promise.all(["classes", "features", "clans", "amps"].map(docs));
  const className = Object.fromEntries(classes.filter(c => c.type === "class").map(c => [c.system.identifier, c.name]));
  const subclasses = Object.fromEntries(classes.filter(c => c.type === "subclass").map(c => [c.name.toLowerCase(), c]));
  const clanName = Object.fromEntries(clans.filter(c => c.type === "clan").map(c => [c.system.identifier, c.name]));
  const groupOf = new Map();

  const folderChain = doc => { const out = []; for ( let f = doc.folder; f; f = f.folder ) out.unshift(f.name); return out; };
  const featureGroup = doc => {
    const cls = doc.system?.requirement?.class;
    const [top, second] = folderChain(doc);
    const sub = second && subclasses[second.toLowerCase()] ? subclasses[second.toLowerCase()].name : "";
    return { kind: "class", name: className[cls] ?? top ?? "Other", sub };
  };
  const rows = [];
  const addPools = (doc, group) => {
    groupOf.set(doc.system?.identifier, group);
    for ( const pool of doc.system?.resourcePools ?? [] ) {
      if ( !pool.id ) continue;
      rows.push({ key: poolLimitKey(doc.system.identifier, pool.id), group, feature: doc.name, limit: `${pool.label || pool.id} (${pool.max || "—"})`, written: recoveryText(pool.recovery) });
    }
  };
  for ( const c of classes ) {
    if ( c.type === "class" ) addPools(c, { kind: "class", name: c.name, sub: "" });
    else if ( c.type === "subclass" ) addPools(c, { kind: "class", name: className[c.system.classIdentifier] ?? "Other", sub: c.name });
  }
  for ( const f of features ) {
    const group = featureGroup(f);
    groupOf.set(f.system?.identifier, group);
    addPools(f, group);
  }
  for ( const c of clans ) {
    const group = { kind: "clan", name: c.type === "clan" ? c.name : (clanName[c.system?.requirement?.clan] ?? "Other"), sub: "" };
    addPools(c, group);
  }
  for ( const a of amps ) {
    const per = a.system?.uses?.per;
    if ( !a.system?.uses?.max || !per ) continue;
    const owner = a.system.owner ?? {};
    let group;
    if ( owner.kind === "clan" ) group = { kind: "clan", name: clanName[owner.id] ?? "Other", sub: "" };
    else if ( owner.kind === "feat" ) group = groupOf.get(owner.id) ?? { kind: "class", name: "Other", sub: "" };
    else continue;
    rows.push({ key: ampLimitKey(a.system.identifier), group, feature: a.name, limit: `Amp uses (${a.system.uses.max})`, written: AMP_WRITTEN[per] ?? per, amp: true });
  }
  return rows;
}
