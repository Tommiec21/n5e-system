import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Handlebars from "handlebars";
import { rules, ruleGroups } from "../module/config/rules.mjs";

// Only the application shell is stubbed; use the panel's real context builder and real template.
globalThis.foundry = { applications: { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: Base => Base } } };
const { default: RulesConfig } = await import("../module/applications/settings/rules-config.mjs");
const template = Handlebars.compile(fs.readFileSync(new URL("../templates/apps/rules-config.hbs", import.meta.url), "utf8"));

for ( const gm of [true, false] ) {
  test(`rules settings render all groups in a single ApplicationV2 root (${gm ? "GM" : "player"})`, async () => {
    globalThis.game = { user: { isGM: gm }, settings: { get: (namespace, key) => rules[key].default } };
    const context = await new RulesConfig()._prepareContext();
    const html = template(context).trim();
    // Previously the header, group list and GM footer were separate roots, which Foundry rejects.
    assert.match(html, /^<section class="rules-panel">[\s\S]*<\/section>$/);
    assert.equal((html.match(/<section\b/g) ?? []).length, 1);
    assert.equal((html.match(/<\/section>/g) ?? []).length, 1);
    assert.equal(context.groups.length, Object.keys(ruleGroups).length);
    assert.equal(context.groups.flatMap(g => g.rules).length, Object.keys(rules).length);
    for ( const key of Object.keys(rules) ) assert.ok(html.includes(`name="${key}"`), `Missing control: ${key}`);
    assert.equal(html.includes('type="submit"'), gm);
    assert.equal(html.includes('data-action="reset"'), gm);
    if ( !gm ) {
      assert.match(html, /Only the GM can change these/);
      for ( const control of html.matchAll(/<(?:input|select)\b[^>]*>/g) ) assert.match(control[0], /disabled/);
    }
  });
}
