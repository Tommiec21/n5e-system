import { entryData } from "./workspace-store.mjs";
import { esc } from "../../view-models/common.mjs";

/** Convert reviewed source text into an ordinary editable private journal entry. */
export function starterEntry(record, userId) {
  const data = entryData(record.kind, userId);
  data.name = record.name;
  const page = data.pages[0];
  page.name = record.name;
  page.text.content = `<p>${esc(record.text)}</p><p><b>Part I:</b> ${esc(record.milestone)}</p><p>${esc(record.provenance)}</p>`
    + (record.source ? `<p>Source: <a href="${esc(record.source)}">${esc(record.sourceLabel ?? "Naruto official site")}</a></p>` : "");
  Object.assign(page.flags.n5e.preparation, { starterId: record.id, era: "Part I", source: record.source,
    provenance: record.provenance, milestone: record.milestone });
  return data;
}

let importing = false;
/** Resolve curated relationships only into a newly imported page, never an existing GM entry. */
export function starterLinks(record, references) {
  return (record.related ?? []).filter(r => references.has(r.id))
    .map(r => ({ uuid: references.get(r.id), label: r.label }));
}

/** Add missing curated links without replacing labels or removing GM-authored relationships. */
export function mergeStarterLinks(current, suggested) {
  const merged = structuredClone(current ?? []);
  for (const link of suggested) if (!merged.some(l => l.uuid === link.uuid)) merged.push(link);
  return merged;
}

/** Import missing starter records only; existing entries and GM edits are never updated. */
export async function importStarter() {
  if (!game.user.isGM || importing) return;
  importing = true;
  try {
    const response = await fetch("systems/n5e/content/world/part-one-starter.json");
    if (!response.ok) throw new Error("The starter library could not be loaded.");
    const bundle = await response.json();
    const references = new Map(game.journal.contents.flatMap(j => j.pages.contents
      .filter(p => p.flags?.n5e?.preparation?.starterId)
      .map(p => [p.flags.n5e.preparation.starterId, p.uuid])));
    const existing = new Set(references.keys());
    const groups = [...new Set(bundle.records.map(r => r.kind))];
    const selected = await foundry.applications.api.DialogV2.prompt({ window: { title: "Choose Part I starter entries" }, position: { width: 600 },
      content: `<p>Select entries to add. Existing text is never replaced. Links to unselected, unimported entries are omitted.</p><div style="max-height:380px;overflow:auto">`
        + groups.map(kind => `<fieldset><legend>${esc(kind)}</legend>${bundle.records.map((r, i) => r.kind === kind
          ? `<label style="display:block"><input type="checkbox" name="record${i}"> ${esc(r.name)}${existing.has(r.id) ? " (already imported)" : ""}</label>` : "").join("")}</fieldset>`).join("")
        + `</div><label><input type="checkbox" name="reconcile"> Add missing starter links to selected existing entries</label><p>This preserves your text and existing links. It does not delete broken links.</p>`,
      ok: { label: "Apply selection", callback: (event, button) => ({ ids: bundle.records.filter((r, i) => button.form.elements[`record${i}`].checked).map(r => r.id), reconcile: button.form.elements.reconcile.checked }) }, rejectClose: false });
    if (!selected?.ids?.length) return;
    const chosen = bundle.records.filter(r => selected.ids.includes(r.id));
    const missing = chosen.filter(r => !existing.has(r.id));
    const plans = missing.map(record => {
      const data = starterEntry(record, game.user.id);
      data._id = foundry.utils.randomID();
      data.pages[0]._id = foundry.utils.randomID();
      references.set(record.id, `JournalEntry.${data._id}.JournalEntryPage.${data.pages[0]._id}`);
      return { record, data };
    });
    for (const { record, data } of plans) {
      data.pages[0].flags.n5e.preparation.links = starterLinks(record, references);
      await CONFIG.JournalEntry.documentClass.create(data, { keepId: true });
    }
    if (selected.reconcile) for (const record of chosen.filter(r => existing.has(r.id))) {
      const page = await fromUuid(references.get(record.id));
      if (!page?.testUserPermission(game.user, "OWNER")) continue;
      const current = page.flags?.n5e?.preparation?.links ?? [];
      const links = mergeStarterLinks(current, starterLinks(record, references));
      if (links.length !== current.length) await page.update({ "flags.n5e.preparation.links": links });
    }
    ui.notifications.info(`Added ${missing.length} starter entries.`);
  } finally { importing = false; }
}
