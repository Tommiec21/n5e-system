import { test } from "node:test";
import assert from "node:assert/strict";
import { addJournalDeskButton } from "../module/applications/gm/journal-desk-entry.mjs";

test("Journal shortcut is GM-only, survives repeated renders once, and uses the existing API", () => {
  const buttons = [];
  let opens = 0;
  const header = { append: button => buttons.push(button) };
  const root = { querySelector: selector => selector === ".directory-header" ? header : buttons[0] };
  globalThis.game = { user: { isGM: false }, n5e: { api: { journalDesk: () => opens++ } } };
  globalThis.document = { createElement: () => ({ addEventListener(event, handler) { this.click = handler; } }) };
  addJournalDeskButton(null, root);
  assert.equal(buttons.length, 0);
  game.user.isGM = true;
  addJournalDeskButton(null, root);
  addJournalDeskButton(null, root);
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].type, "button");
  buttons[0].click();
  assert.equal(opens, 1);
  addJournalDeskButton(null, { querySelector: () => null });
  delete globalThis.document;
  delete globalThis.game;
});
