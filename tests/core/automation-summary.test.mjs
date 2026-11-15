/** STD5: the Automation tab's summaries and statuses. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { automationOf } from "../../module/rules/automation-summary.mjs";
import { summarizeElement } from "../../module/rules/action-effects.mjs";

const pack = (dir, part) => {
  const f = fs.readdirSync(`packs/_source/${dir}`).find(n => n.includes(part));
  return JSON.parse(fs.readFileSync(path.join(`packs/_source/${dir}`, f), "utf8"));
};

test("summaries read the data in plain words", () => {
  assert.equal(summarizeElement({ key: "disadvantage", selector: "save", direction: "imposed", targets: "one", uses: 1, scope: "action" }),
    "Disadvantage on one target's first save (on the action it is chosen for)");
  assert.equal(summarizeElement({ key: "resource", on: "damageDealt", pool: "fury", amount: 1, oncePerTurn: true }), "When it deals damage (once per turn): +1 fury");
  assert.equal(summarizeElement({ key: "inflict", on: "hit", condition: "prone", who: "target" }), "When it hits: The target gains prone");
});

test("statuses: automated, partial, notes only, nothing authored (with mechanic text flagged)", () => {
  const heightened = pack("features", "heightened-ninjutsu");
  const a = automationOf(heightened);
  assert.equal(a.status, "automated");
  assert.match(a.channels.find(c => c.kind === "Action effect").summary, /one target's first save/);
  assert.equal(automationOf(pack("features", "uncanny-dodge")).channels[0].kind, "Reaction");
  assert.equal(automationOf({ name: "X", flags: { n5e: { rules: [{ key: "advantage", selector: "attack" }, { key: "note", text: "GM" }] } } }).status, "partial");
  assert.equal(automationOf({ name: "X", flags: { n5e: { rules: [{ key: "note", text: "GM" }] } } }).status, "note");
  const bare = automationOf({ name: "X", system: { description: "<p>You have advantage on Stealth checks.</p>" } });
  assert.deepEqual([bare.status, bare.mentions], ["none", true]);
});
