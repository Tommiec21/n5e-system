import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanSession, visit, starterText, relationshipUpdate } from "../module/applications/gm/workspace-navigation.mjs";

test("remembered tabs exclude drafts, deduplicate and recover a missing active tab", () => {
  assert.deepEqual(cleanSession({ tabs: ["a", "a", null, "b"], active: "gone", content: "secret draft" }),
    { tabs: ["a", "b"], active: "a", campaign: "", ideas: false });
  assert.equal(cleanSession({ tabs: Array.from({ length: 90 }, (_, i) => String(i)) }).tabs.length, 30);
});
test("navigation branches after Back and avoids duplicate consecutive visits", () => {
  let state = visit([], -1, "a");
  state = visit(state.history, state.cursor, "b");
  state = visit(state.history, 0, "c");
  assert.deepEqual(state, { history: ["a", "c"], cursor: 1 });
  assert.deepEqual(visit(state.history, 1, "c"), state);
});
test("relationship updates preserve unrelated fields and collapse duplicate targets", () => {
  assert.deepEqual(relationshipUpdate({ campaignUuid: "campaign", links: [{ uuid: "actor", label: "Client" }, { uuid: "actor", label: "Ally" }], tags: ["keep"] }),
    { "flags.n5e.preparation.campaignUuid": "campaign", "flags.n5e.preparation.links": [{ uuid: "actor", label: "Ally" }] });
});
test("starter headings contain no mechanics and safely fall back for unknown kinds", () => {
  assert.match(starterText("mission"), /Objectives/);
  assert.equal(starterText("<script>"), "<h2>Notes</h2><p></p><h2>Connections</h2><p></p>");
});
test("returning to an open tab keeps unsaved text and relationship edits", async () => {
  globalThis.foundry = { applications: { api: { ApplicationV2: class { async render() { return this; } }, HandlebarsApplicationMixin: base => base } } };
  globalThis.game = { user: { setFlag: async () => {} } };
  const { default: Desk } = await import("../module/applications/gm/journal-desk.mjs");
  const desk = new Desk();
  desk.drafts.set("a", { name: "A", content: "unsaved", savedName: "A", savedContent: "old", links: [], campaignUuid: "", savedRelationships: '["",[]]' });
  desk.drafts.set("b", { name: "B", content: "", savedName: "B", savedContent: "", links: [], campaignUuid: "", savedRelationships: '["",[]]' });
  await desk.openPage("a");
  await desk.openPage("b");
  await desk.navigate(-1);
  assert.equal(desk.active, "a");
  assert.equal(desk.drafts.get("a").content, "unsaved");
  assert.equal(desk.dirty(desk.drafts.get("a")), true);
  desk.drafts.get("b").campaignUuid = "campaign";
  assert.equal(desk.dirty(desk.drafts.get("b")), true);
});
