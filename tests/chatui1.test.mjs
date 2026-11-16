/** CHATUI1: chat font sizes and fonts (rules/chat-appearance.mjs). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHAT_FIELDS, defaultAppearance, cleanAppearance, effectiveAppearance, cssVariables } from "../module/rules/chat-appearance.mjs";

test("every field has a default inside its range", () => {
  for ( const f of CHAT_FIELDS ) assert.ok(f.default >= f.min && f.default <= f.max, f.key);
  assert.equal(new Set(CHAT_FIELDS.map(f => f.key)).size, CHAT_FIELDS.length);
});

test("stored values are made safe: clamped, defaults filled, fonts cleaned", () => {
  const a = cleanAppearance({ scale: 999, sizes: { body: 2, title: "16", bogus: 5 }, fonts: { head: "Signika; } body {", body: "Modesto Condensed" } });
  assert.equal(a.scale, 200);
  assert.equal(a.sizes.body, 8);
  assert.equal(a.sizes.title, 16);
  assert.equal(a.sizes.button, defaultAppearance().sizes.button);
  assert.ok(!("bogus" in a.sizes));
  assert.equal(a.fonts.head, "Signika  body");
  assert.equal(a.fonts.body, "Modesto Condensed");
});

test("the world's settings unless the player turned on their own (King Q-F1: both)", () => {
  const world = { sizes: { body: 16 } };
  assert.equal(effectiveAppearance(world, { use: false, sizes: { body: 10 } }).sizes.body, 16);
  assert.equal(effectiveAppearance(world, { use: true, sizes: { body: 10 } }).sizes.body, 10);
  assert.equal(effectiveAppearance({}, {}).sizes.body, 13);
});

test("CSS variables: sizes scaled, heading and body fonts", () => {
  const v = cssVariables({ scale: 150, sizes: { body: 12 }, fonts: { head: "Signika" } });
  assert.equal(v["--n5e-fs-body"], "18px");
  assert.equal(v["--n5e-fs-tileHead"], "15px");
  assert.equal(v["--n5e-ff-head"], '"Signika", var(--font-primary, sans-serif)');
  assert.equal(v["--n5e-ff-body"], "inherit");
});
