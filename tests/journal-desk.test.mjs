import { test } from "node:test";
import assert from "node:assert/strict";
import { entryData, entryUpdate, isWorkspacePage, pageSnapshot, saveEntry } from "../module/applications/gm/workspace-store.mjs";

test("new entries are private and profiles do not create actors", () => {
  const data = entryData("character", "gm");
  assert.deepEqual(data.ownership, { default: 0, gm: 3 });
  assert.equal(data.pages[0].type, "text");
  assert.equal(data.pages[0].flags.n5e.preparation.kind, "character");
  assert.throws(() => entryData("unknown", "gm"));
});
test("existing missions and third-party or future pages cannot be rewritten", () => {
  const page = entryData("mission", "gm").pages[0];
  assert.equal(isWorkspacePage(page), true);
  assert.equal(isWorkspacePage({ ...page, flags: { n5e: { ...page.flags.n5e, mission: {} } } }), false);
  assert.equal(isWorkspacePage({ ...page, flags: { ...page.flags, "monks-enhanced-journal": { type: "quest" } } }), false);
  assert.equal(isWorkspacePage({ ...page, flags: { n5e: { preparation: { version: 2 } } } }), false);
  assert.equal(isWorkspacePage({ type: "text", flags: {} }), false);
});
test("updates cannot replace permissions or flags", () => {
  assert.deepEqual(entryUpdate({ name: "  Draft  ", content: "<p>Notes</p>", ownership: { default: 3 }, flags: {} }),
    { name: "Draft", "text.content": "<p>Notes</p>" });
});
test("stale and unauthorized saves do not write, valid saves preserve other fields", async () => {
  const oldGame = globalThis.game;
  globalThis.game = { user: { isGM: true } };
  let writes = 0;
  const page = { ...entryData("note", "gm").pages[0], testUserPermission: () => true,
    async update(data) { writes++; this.name = data.name; this.text.content = data["text.content"]; } };
  try {
    const draft = { name: "New title", content: "New text", base: pageSnapshot(page) };
    page.text.content = "Other GM changed this";
    await assert.rejects(saveEntry(page, draft), /changed elsewhere/);
    assert.equal(writes, 0);
    draft.base = pageSnapshot(page);
    globalThis.game.user.isGM = false;
    await assert.rejects(saveEntry(page, draft), /not editable/);
    assert.equal(writes, 0);
    globalThis.game.user.isGM = true;
    await saveEntry(page, draft);
    assert.equal(writes, 1);
    assert.equal(page.flags.n5e.preparation.version, 1);
  } finally { globalThis.game = oldGame; }
});
