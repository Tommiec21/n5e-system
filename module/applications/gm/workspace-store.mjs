export const ENTRY_KINDS = ["note", "campaign", "session", "mission", "character", "faction", "country", "village", "location", "idea"];

/** Only workspace text pages are editable here; other journal types retain their own editors. */
export function isWorkspacePage(page) {
  return page?.type === "text" && page.flags?.n5e?.preparation?.version === 1
    && !page.flags?.n5e?.mission && !page.flags?.["monks-enhanced-journal"]?.type;
}

/** Capture the fields this editor owns for comparison before saving. */
export function pageSnapshot(page) {
  return JSON.stringify([page.name, page.text?.content ?? "", page.flags?.n5e?.preparation]);
}

/** Limit updates to title and text; preserve permissions, links and every unrelated flag. */
export function entryUpdate(draft) {
  return { name: String(draft.name).trim() || "Untitled", "text.content": String(draft.content ?? "") };
}

/** Create a private journal per entry so later sharing cannot expose sibling entries. */
export function entryData(kind, userId) {
  if (!ENTRY_KINDS.includes(kind)) throw new Error("Unknown entry type.");
  return { name: `New ${kind}`, ownership: { default: 0, [userId]: 3 },
    flags: { n5e: { workspace: true } }, pages: [{ name: `New ${kind}`, type: "text",
      text: { content: "", format: 1 }, flags: { n5e: { preparation: { version: 1, kind, links: [], tags: [] } } } }] };
}

/** Native document APIs enforce ownership as well as this GM-only entry point. */
export async function createEntry(kind) {
  if (!game.user.isGM) throw new Error("Only a GM can create workspace entries.");
  const journal = await CONFIG.JournalEntry.documentClass.create(entryData(kind, game.user.id));
  return journal.pages.contents[0];
}

/** Refuse stale saves instead of silently overwriting another GM's changes. */
export async function saveEntry(page, draft) {
  if (!game.user.isGM || !page.testUserPermission(game.user, "OWNER")) throw new Error("This entry is not editable.");
  if (!isWorkspacePage(page)) throw new Error("Open this entry in its original journal editor.");
  if (pageSnapshot(page) !== draft.base) throw new Error("This entry changed elsewhere. Keep your draft, or reload the saved entry before editing again.");
  await page.update(entryUpdate(draft));
  return pageSnapshot(page);
}
