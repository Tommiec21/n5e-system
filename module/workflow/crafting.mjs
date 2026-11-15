/**
 * Crafting (PRESTD1 Part D; King Q-PF4/Q-P7: PF2e emulation, numbers editable in the settings).
 * Pick an item from the Equipment compendium and a toolkit; roll the toolkit check against the
 * rank's DC. Success pays price × materials and makes the item after the rank's days (a critical
 * halves the days); failure makes no progress; a critical failure loses half the materials.
 * Rules: rules/pf2e-emulation.mjs.
 */
import { craftNumbers, craftOutcome, CRAFT_RANKS } from "../rules/pf2e-emulation.mjs";
import { rule } from "../rules-settings.mjs";
import { esc } from "../view-models/common.mjs";

export function craftSettings() {
  const s = { materials: rule("craftMaterials") };
  for ( const r of CRAFT_RANKS ) { s[`dc${r}`] = rule(`craftDC${r}`); s[`days${r}`] = rule(`craftDays${r}`); }
  return s;
}

const LABELS = { critical: "Critical success", success: "Success", failure: "Failure", criticalFailure: "Critical failure" };

/** Open the Craft dialog for an actor. */
export async function promptCraft(actor) {
  if ( !actor?.isOwner ) return null;
  const pack = game.packs.get("n5e.equipment");
  const index = pack ? await pack.getIndex({ fields: ["system.price", "system.rank"] }) : [];
  const items = Array.from(index).filter(i => i.type !== "Folder").sort((a, b) => a.name.localeCompare(b.name));
  if ( !items.length ) return ui.notifications.warn("The Equipment compendium has nothing to craft.");
  const tools = Object.entries(CONFIG.N5E.toolkits ?? {});
  const picked = await foundry.applications.api.DialogV2.prompt({ window: { title: `${actor.name}: craft` },
    content: `<label>Item <select name="item">${items.map(i => `<option value="${esc(i.uuid)}">${esc(i.name)} (${Number(i.system?.price) || 0} ryo)</option>`).join("")}</select></label>
      <label>Rank <select name="rank">${CRAFT_RANKS.map(r => `<option value="${r}">${r}</option>`).join("")}</select></label>
      <label>Toolkit <select name="tool">${tools.map(([k, t]) => `<option value="${esc(k)}">${esc(t.label ?? k)}</option>`).join("")}</select></label>
      <p class="hint">The DC, days and materials come from the crafting settings.</p>`,
    ok: { label: "Craft", callback: (event, button) => ({ uuid: button.form.elements.item.value, rank: button.form.elements.rank.value, tool: button.form.elements.tool.value }) },
    rejectClose: false });
  if ( !picked ) return null;
  return craft(actor, picked);
}

export async function craft(actor, { uuid, rank, tool }) {
  const source = await fromUuid(uuid);
  if ( !source ) return ui.notifications.warn("That item can't be found.");
  const at = CRAFT_RANKS.includes(source.system?.rank) ? source.system.rank : rank;
  const numbers = craftNumbers(at, craftSettings());
  const price = Number(source.system?.price) || 0;
  const [{ rollWithSpec }, { rollSpec }] = await Promise.all([import("../dice/roll.mjs"), import("../dice/d20.mjs")]);
  const spec = rollSpec(actor, "tool", tool);
  if ( !spec ) return ui.notifications.warn("Pick a toolkit.");
  let message = null;
  await rollWithSpec(actor, { ...spec, label: `Craft ${source.name} (${at}-Rank)` }, { dc: numbers.dc, onResult: r => { message = r.message; } });
  if ( !message ) return null;
  const total = Number(message.flags?.n5e?.roll?.total);
  const out = craftOutcome(total, numbers.dc, { price, materials: numbers.materials, days: numbers.days });
  let text = `${LABELS[out.degree]}: `;
  if ( out.made ) {
    const ryo = Number(actor.system.currency?.ryo) || 0;
    if ( ryo < out.cost ) text += `the materials cost ${out.cost} ryo and ${actor.name} has ${ryo}. Nothing is made.`;
    else {
      await actor.update({ "system.currency.ryo": ryo - out.cost });
      const data = source.toObject(); delete data._id;
      await actor.createEmbeddedDocuments("Item", [data]);
      text += `${source.name} is made in ${out.days} day${out.days === 1 ? "" : "s"} for ${out.cost} ryo of materials.`;
    }
  } else if ( out.degree === "criticalFailure" ) {
    const ryo = Number(actor.system.currency?.ryo) || 0;
    const lost = Math.min(ryo, out.cost);
    if ( lost ) await actor.update({ "system.currency.ryo": ryo - lost });
    text += `half the materials are lost (${lost} ryo). Nothing is made.`;
  } else text += "no progress; nothing is spent.";
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content: `<div class="n5e-roll-card"><div class="note">${esc(text)}</div></div>` });
  return out;
}
