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
    const missing = bundle.records.filter(r => !existing.has(r.id));
    if (!missing.length) return ui.notifications.info("These starter entries are already in your library. Your edits were preserved.");
    const accepted = await foundry.applications.api.DialogV2.confirm({ window: { title: "Import Part I starter entries?" },
      content: `<p>Add ${missing.length} private journal entries? Includes the five major countries and villages, Part I figures and original ideas. Existing entries and their relationships will not be replaced.</p>` });
    if (!accepted) return;
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
    ui.notifications.info(`Added ${missing.length} starter entries.`);
  } finally { importing = false; }
}
