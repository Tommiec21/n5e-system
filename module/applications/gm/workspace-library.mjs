/** Group filtered references for display without changing records or campaign relationships. */
export function libraryGroups(entries) {
  const groups = [
    ["Favorites", "fa-star", e => e.favorite],
    ["Campaigns", "fa-book-open", e => e.kind === "campaign"],
    ["Missions & sessions", "fa-scroll", e => ["mission", "session"].includes(e.kind)],
    ["Characters", "fa-user", e => e.kind === "character"],
    ["World", "fa-mountain-sun", e => ["country", "village", "location", "faction"].includes(e.kind)],
    ["Notes & ideas", "fa-feather-pointed", e => ["note", "idea"].includes(e.kind)]
  ];
  return groups.map(([name, icon, include]) => ({ name, icon, entries: entries.filter(include) })).filter(g => g.entries.length);
}
