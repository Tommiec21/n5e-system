import { entryData } from "./workspace-store.mjs";
import { esc } from "../../view-models/common.mjs";

/** Convert reviewed source text into an ordinary editable private journal entry. */
export function starterEntry(record, userId) {
  const data = entryData(record.kind, userId);
  data.name = record.name;
  const page = data.pages[0];
  page.name = record.name;
  page.text.content = `<p>${esc(record.text)}</p><p><b>Part I:</b> ${esc(record.milestone)}</p><p>${esc(record.provenance)}</p>`
    + (record.source ? `<p>Source: <a href="${esc(record.source)}">Naruto official site</a></p>` : "");
  Object.assign(page.flags.n5e.preparation, { starterId: record.id, era: "Part I", source: record.source,
    provenance: record.provenance, milestone: record.milestone });
  return data;
}

let importing = false;
/** Import missing starter records only; existing entries and GM edits are never updated. */
export async function importStarter() {
  if (!game.user.isGM || importing) return;
  importing = true;
  try {
    const response = await fetch("systems/n5e/content/world/part-one-starter.json");
    if (!response.ok) throw new Error("The starter library could not be loaded.");
    const bundle = await response.json();
    const existing = new Set(game.journal.contents.flatMap(j => j.pages.contents.map(p => p.flags?.n5e?.preparation?.starterId)).filter(Boolean));
    const missing = bundle.records.filter(r => !existing.has(r.id));
    if (!missing.length) return ui.notifications.info("These starter entries are already in your library. Your edits were preserved.");
    const accepted = await foundry.applications.api.DialogV2.confirm({ window: { title: "Import Part I starter entries?" },
      content: `<p>Add ${missing.length} private journal entries? Includes Land of Waves characters, time-sensitive Hokage notes and original ideas. Existing entries will not be replaced.</p>` });
    if (!accepted) return;
    for (const record of missing) await CONFIG.JournalEntry.documentClass.create(starterEntry(record, game.user.id));
    ui.notifications.info(`Added ${missing.length} starter entries.`);
  } finally { importing = false; }
}
