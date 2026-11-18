/** Retain unique tab references; drafts are never saved in user preferences. */
export function cleanSession(value = {}) {
  const tabs = [...new Set((Array.isArray(value.tabs) ? value.tabs : []).filter(u => typeof u === "string"))].slice(0, 30);
  return { tabs, active: tabs.includes(value.active) ? value.active : tabs[0] ?? null,
    campaign: typeof value.campaign === "string" ? value.campaign : "", ideas: value.ideas === true };
}

/** Visiting a new page after Back replaces the forward branch. */
export function visit(history, cursor, uuid) {
  if (history[cursor] === uuid) return { history, cursor };
  const next = [...history.slice(0, cursor + 1), uuid].slice(-50);
  return { history: next, cursor: next.length - 1 };
}

/** Templates supply editable headings only, never game rulings or automatic actors. */
export function starterText(kind) {
  const sections = { mission: ["Briefing", "Objectives", "People and places", "GM notes"],
    campaign: ["Premise", "Themes", "Open threads"], character: ["Description", "Motivation", "Connections"],
    session: ["Notes", "Possible encounters", "After the session"], location: ["Description", "People", "Secrets"] };
  return (sections[kind] ?? ["Notes", "Connections"]).map(s => `<h2>${s}</h2><p></p>`).join("");
}

/** Keep metadata edits within the workspace namespace. */
export function relationshipUpdate(draft) {
  const links = [...new Map((draft.links ?? []).filter(l => typeof l.uuid === "string" && l.uuid)
    .map(l => [l.uuid, { uuid: l.uuid, label: String(l.label ?? "Related") }])).values()];
  return { "flags.n5e.preparation.campaignUuid": String(draft.campaignUuid ?? ""),
    "flags.n5e.preparation.links": links };
}
