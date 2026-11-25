/** Add one GM-only shortcut to the native journal directory without replacing its controls. */
export function addJournalDeskButton(app, html) {
  if (!game.user.isGM) return;
  const root = html?.querySelector ? html : html?.[0];
  const header = root?.querySelector(".directory-header");
  if (!header || root.querySelector(".n5e-journal-desk-open")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "n5e-journal-desk-open";
  button.innerHTML = '<i class="fa-solid fa-book-open" aria-hidden="true"></i> Journal Desk';
  button.addEventListener("click", () => game.n5e.api.journalDesk());
  header.append(button);
}
