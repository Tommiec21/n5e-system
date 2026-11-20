import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { starterEntry, starterLinks, mergeStarterLinks, importStarter } from "../module/applications/gm/workspace-starter.mjs";
const bundle = JSON.parse(fs.readFileSync(new URL("../content/world/part-one-starter.json", import.meta.url), "utf8").replace(/^\uFEFF/, ""));
test("starter records have unique provenance and private editable entries", () => {
  assert.equal(new Set(bundle.records.map(r => r.id)).size, bundle.records.length);
  for (const record of bundle.records) {
    const entry = starterEntry(record, "gm");
    assert.equal(entry.ownership.default, 0);
    assert.equal(entry.pages[0].flags.n5e.preparation.starterId, record.id);
    if (record.provenance === "canon summary") assert.match(record.source, /^https:\/\/(naruto-official.com|naruto.fandom.com)\//);
  }
});
test("reimport skips edited existing records without writing them", async () => {
  const created = [];
  globalThis.game = { user: { isGM: true, id: "gm" }, journal: { contents: [{ pages: { contents: [{ name: "GM edited", flags: { n5e: { preparation: { starterId: bundle.records[0].id } } } }] } }] } };
  globalThis.fetch = async () => ({ ok: true, json: async () => bundle });
  let id = 0;
  globalThis.foundry = { utils: { randomID: () => `test${++id}` }, applications: { api: { DialogV2: { prompt: async () => ({ ids: bundle.records.map(r => r.id), reconcile: false }) } } } };
  globalThis.CONFIG = { JournalEntry: { documentClass: { create: async d => created.push(d) } } };
  globalThis.ui = { notifications: { info() {} } };
  await importStarter();
  assert.equal(created.length, bundle.records.length - 1);
  assert.ok(created.every(d => d.pages[0].flags.n5e.preparation.starterId !== bundle.records[0].id));
  assert.equal(game.journal.contents[0].pages.contents[0].name, "GM edited");
});
test("link reconciliation preserves custom labels and does not mutate the original list", () => {
  const current = [{ uuid: "a", label: "GM label" }];
  assert.deepEqual(mergeStarterLinks(current, [{ uuid: "a", label: "Source label" }, { uuid: "b", label: "Village" }]),
    [{ uuid: "a", label: "GM label" }, { uuid: "b", label: "Village" }]);
  assert.equal(current.length, 1);
});
test("cancelled and single-record selection do not import unrelated entries", async () => {
  const created = [];
  game.journal.contents = [];
  CONFIG.JournalEntry.documentClass.create = async data => created.push(data);
  foundry.applications.api.DialogV2.prompt = async () => null;
  await importStarter();
  assert.equal(created.length, 0);
  foundry.applications.api.DialogV2.prompt = async () => ({ ids: ["ame"], reconcile: false });
  await importStarter();
  assert.equal(created.length, 1);
  assert.equal(created[0].pages[0].flags.n5e.preparation.starterId, "ame");
});
test("major countries have resolvable village links and no dangling source references", () => {
  const ids = new Set(bundle.records.map(r => r.id));
  for (const id of ["fire", "wind", "water", "earth", "lightning"]) {
    const country = bundle.records.find(r => r.id === id);
    assert.equal(country.kind, "country");
    assert.equal(bundle.records.find(r => r.id === country.related[0].id).kind, "village");
  }
  for (const record of bundle.records) for (const link of record.related ?? []) assert.ok(ids.has(link.id));
  assert.deepEqual(starterLinks({ related: [{ id: "known", label: "Village" }, { id: "missing" }] }, new Map([["known", "JournalEntry.a.JournalEntryPage.b"]])),
    [{ uuid: "JournalEntry.a.JournalEntryPage.b", label: "Village" }]);
});
