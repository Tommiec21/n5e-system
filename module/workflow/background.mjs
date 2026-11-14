import { existingCopy } from "../rules/item-audit.mjs";
import { isFeatItem, featGroups } from "../rules/keywords.mjs";
/** Set up a background before replacing any existing origin; grants stay linked for replacement. */
import { skills, toolkits } from "../config/core.mjs";
import { backgroundPacks, backgroundSkillSlots, validateBackgroundSelection } from "../rules/backgrounds.mjs";
import { esc } from "../view-models/common.mjs";
import { withActorLock } from "./commands.mjs";

export async function addBackground(actor, item) {
  if ( !actor.isOwner ) return null;
  return withActorLock(actor, async () => {
    const config = item.flags?.n5e?.background;
    if ( !config ) throw new Error("This background has no setup definition.");
    const old = actor.items.find(i => i.type === "background");
    if ( old?.system.identifier === item.system.identifier ) {
      ui.notifications.info(`${actor.name} already has ${item.name}.`);
      return null;
    }
    const owned = [...actor.items];
    const oldIds = new Set(old ? [old.id, ...owned.filter(i => i.flags?.n5e?.backgroundOrigin === old.id).map(i => i.id)] : []);
    const proficient = new Set(Object.entries(actor.system.skills).filter(([, s]) => s.isProficient).map(([k]) => k));
    const proficientTools = new Set(Object.entries(actor.system.tools).filter(([, s]) => s.isProficient).map(([k]) => k));
    const slots = backgroundSkillSlots(item, proficient);
    const pack = game.packs.get("n5e.feats");
    const feats = [...(pack ? await pack.getDocuments() : []), ...game.items].filter(f => f.type === "feat"
      && isFeatItem(f) && featGroups(f).some(g => ["general", "skill"].includes(g)) && (f.system.requirement?.level ?? 0) <= actor.system.level
      && !owned.some(i => !oldIds.has(i.id) && i.system.identifier && i.system.identifier === f.system.identifier));
    const select = (name, label, options) => `<label>${esc(label)}<select name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select></label>`;
    const originalTools = item.system.tool ? [item.system.tool] : config.toolChoices;
    const toolOptions = originalTools.some(k => proficientTools.has(k))
      ? Object.keys(toolkits).filter(k => !proficientTools.has(k)) : originalTools;
    const toolkitPairs = keys => keys.map(k => [k, toolkits[k].label]);
    const content = `<p>${old ? `Replaces ${esc(old.name)} and items granted by it. ` : ""}Two skills, one toolkit proficiency, equipment and one General or Skill feat. No ability-score increase.</p>`
      + slots.map((s, i) => select(`skill${i}`, s.label, s.options.map(k => [k, skills[k].label]))).join("")
      + select("tool", "Toolkit proficiency", toolkitPairs(toolOptions))
      + select("pack", "Starting equipment pack", config.equipmentPacks.map(k => [k, backgroundPacks[k].label]))
      + `<fieldset><legend>Pack toolkit choices (used only for the relevant pack)</legend>`
      + select("infiltrator", "Infiltrator toolkit", toolkitPairs(["hackers", "security", "disguise"]))
      + [0, 1, 2].map(i => select(`crafter${i}`, `Crafter toolkit ${i + 1}`, toolkitPairs(Object.keys(toolkits)))).join("") + "</fieldset>"
      + select("feat", "Free feat (check its prerequisites)", [["", "Choose later"], ...feats.map(f => [f.uuid, f.name])])
      + `<p>${esc(config.recommendation)}. Recommendations do not restrict your choice. If choosing later, the background’s feat benefit remains as a reminder.</p>`
      + `<p>Equipment is recorded as manifests with full contents. Individual equipment statistics and story-dependent benefits require GM adjudication.</p>`;
    let selection;
    while ( true ) {
      selection = await foundry.applications.api.DialogV2.wait({ window: { title: `${actor.name}: ${item.name}` }, content,
        buttons: [{ action: "apply", label: "Apply background", default: true, callback: (event, button) => {
          const f = button.form.elements;
          const packKey = f.pack.value;
          return { skills: slots.map((s, i) => f[`skill${i}`].value), tool: f.tool.value, pack: packKey, feat: f.feat.value,
            packTools: packKey === "infiltrator" ? [f.infiltrator.value] : packKey === "crafter" ? [0, 1, 2].map(i => f[`crafter${i}`].value) : [] };
        } }, { action: "cancel", label: "Cancel" }], rejectClose: false });
      if ( !selection || selection === "cancel" ) return null;
      const error = validateBackgroundSelection(item, slots, selection, proficientTools, proficient);
      if ( !error ) break;
      ui.notifications.warn(error);
    }
    // Resolve every dependency before writing. A missing compendium cannot delete an old background.
    const featureDocs = await Promise.all(config.featureUuids.map(uuid => fromUuid(uuid)));
    const equipment = await fromUuid(config.equipmentUuid);
    const feat = selection.feat ? feats.find(f => f.uuid === selection.feat) : null;
    if ( featureDocs.some(d => !d) || !equipment || (selection.feat && !feat) ) throw new Error("Background grant source is missing.");
    const fresh = doc => {
      const data = doc.toObject();
      delete data._id;
      delete data._key;
      data.folder = null;
      return data;
    };
    const backgroundData = fresh(item);
    backgroundData.system.skills = selection.skills;
    backgroundData.system.tool = selection.tool;
    backgroundData.system.feat = selection.feat;
    backgroundData.flags.n5e.backgroundSelection = selection;
    const created = [];
    try {
      const [bg] = await actor.createEmbeddedDocuments("Item", [backgroundData]);
      created.push(bg);
      const grantData = [...featureDocs, equipment, ...(feat ? [feat] : [])].map(doc => {
        const data = fresh(doc);
        data.flags ??= {};
        data.flags.n5e = { ...data.flags.n5e, backgroundOrigin: bg.id };
        return data;
      });
      const selectedPack = backgroundPacks[selection.pack];
      grantData.push({ name: selectedPack.label, type: "loot", img: item.img,
        system: { identifier: `background-${item.system.identifier}-pack`, description: `<p>${esc(selectedPack.contents)}</p>`
          + (selection.packTools.length ? `<p>Selected toolkits: ${selection.packTools.map(k => esc(toolkits[k].label)).join(", ")}.</p>` : "")
          + "<p>Equipment manifest: resolve individual item statistics from Chapter 5. All pack contents are sealed in a Ninja Tool scroll.</p>", quantity: 1, bulk: 0, price: 0,
        source: { book: "Naruto 5e — Full Document", page: "Chapter 5: Equipment Packs", version: "4.0", custom: "" } },
        flags: { n5e: { backgroundOrigin: bg.id } } });
      // FIN1: never grant a second copy of something the actor already has (the old background's items are leaving).
      const owned = actor.items.filter(i => !oldIds.has(i.id) && i.id !== bg.id);
      const toAdd = grantData.filter(d => !existingCopy(owned, d));
      if ( toAdd.length ) created.push(...await actor.createEmbeddedDocuments("Item", toAdd));
      if ( oldIds.size ) await actor.deleteEmbeddedDocuments("Item", [...oldIds]);
      return bg;
    } catch (error) {
      const ids = created.map(i => i.id).filter(id => actor.items.get(id));
      if ( ids.length ) await actor.deleteEmbeddedDocuments("Item", ids);
      throw error;
    }
  });
}
