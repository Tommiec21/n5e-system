import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { starterEntry, importStarter } from "../module/applications/gm/workspace-starter.mjs";
const bundle = JSON.parse(fs.readFileSync(new URL("../content/world/part-one-starter.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
test("starter records have unique provenance and private editable entries", () => {
  assert.equal(new Set(bundle.records.map(r => r.id)).size, bundle.records.length);
  for (const record of bundle.records) {
    const entry = starterEntry(record, "gm");
    assert.equal(entry.ownership.default, 0);
    assert.equal(entry.pages[0].flags.n5e.preparation.starterId, record.id);
    if (record.provenance === "canon summary") assert.match(record.source, /^https:\/\/naruto-official.com\//);
  }
});
test("reimport skips edited existing records without writing them", async () => {
  const created = [];
  globalThis.game = { user: { isGM: true, id: "gm" }, journal: { contents: [{ pages: { contents: [{ name: "GM edited", flags: { n5e: { preparation: { starterId: bundle.records[0].id } } } }] } }] } };
  globalThis.fetch = async () => ({ ok: true, json: async () => bundle });
  globalThis.foundry = { applications: { api: { DialogV2: { confirm: async () => true } } } };
  globalThis.CONFIG = { JournalEntry: { documentClass: { create: async d => created.push(d) } } };
  globalThis.ui = { notifications: { info() {} } };
  await importStarter();
  assert.equal(created.length, bundle.records.length - 1);
  assert.ok(created.every(d => d.pages[0].flags.n5e.preparation.starterId !== bundle.records[0].id));
  assert.equal(game.journal.contents[0].pages.contents[0].name, "GM edited");
});
