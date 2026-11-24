import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Handlebars from "handlebars";

globalThis.foundry = { applications: { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: Base => Base,
  DialogV2: { confirm: async () => false } }, apps: {} } };
globalThis.game = { user: { isGM: true } };
globalThis.ui = { notifications: { warn: () => {} } };
const { default: Desk } = await import("../module/applications/gm/journal-desk.mjs");

test("access cannot open permission controls for dirty or cancelled entries", async () => {
  let resolved = 0;
  globalThis.fromUuid = async () => { resolved++; };
  const context = { capture() {}, drafts: new Map([["page", {}]]), active: "page", dirty: () => true };
  await Desk.onAccess.call(context);
  context.dirty = () => false;
  await Desk.onAccess.call(context);
  assert.equal(resolved, 0);
});

test("confirmed access opens native controls for the page without updating permissions", async () => {
  const page = { type: "text", flags: { n5e: { preparation: { version: 1 } } } };
  globalThis.fromUuid = async () => page;
  foundry.applications.api.DialogV2.confirm = async () => true;
  let opened;
  foundry.applications.apps.DocumentOwnershipConfig = class {
    constructor(options) { opened = options.document; }
    render() {}
  };
  await Desk.onAccess.call({ capture() {}, drafts: new Map([["page", {}]]), active: "page", dirty: () => false });
  assert.equal(opened, page);
});

test("desk template renders collapsed navigation and escapes character titles", () => {
  const render = Handlebars.compile(readFileSync(new URL("../templates/apps/journal-desk.hbs", import.meta.url), "utf8"));
  const html = render({ showLibrary: false, showIdeas: true, isCharacter: true,
    draft: { name: '<script>alert(1)</script>', kind: "character" }, linked: [] });
  assert.ok(html.includes("without-library"));
  assert.ok(!html.includes('class="jd-library"'));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("Append character profile headings"));
  assert.ok(html.includes('data-action="access"'));
});
