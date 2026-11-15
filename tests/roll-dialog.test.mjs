/** ROLL1: every roll goes through the roll dialog (Foundry side, with the dialog stood in for). */
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { makeActor, baseAbilities } from "./helpers/actor.mjs";
import { dialogs, d20DialogHTML, diceDialogHTML } from "../module/dice/roll-dialog.mjs";
import { d20Parts } from "../module/rules/roll-math.mjs";

const saved = { game: globalThis.game, CONFIG: globalThis.CONFIG, Roll: globalThis.Roll };
afterEach(() => { Object.assign(globalThis, saved); dialogs.enabled = null; dialogs.d20 = original.d20; dialogs.dice = original.dice; });
const original = { d20: dialogs.d20, dice: dialogs.dice };

/** A tiny Roll stand-in: "1d20" faces come from a queue; numbers and @bonus add up. */
function stubRolls(faces) {
  const queue = [...faces];
  globalThis.Roll = class {
    constructor(formula, data = {}) { this.formula = String(formula).replace(/@bonus/g, String(data.bonus ?? 0)); this.data = data; this.dice = []; }
    async evaluate() {
      let total = 0;
      for ( const term of this.formula.replace(/\s+/g, "").replace(/-/g, "+-").split("+").filter(Boolean) ) {
        const m = term.match(/^(-?)(\d*)d(\d+)(kh|kl)?$/);
        if ( m ) {
          const n = Number(m[2] || 1); const results = Array.from({ length: n }, () => ({ result: queue.shift() ?? 10, active: true }));
          if ( m[4] ) { const keep = m[4] === "kh" ? Math.max(...results.map(r => r.result)) : Math.min(...results.map(r => r.result)); results.forEach(r => { r.active = r.result === keep; }); }
          this.dice.push({ faces: Number(m[3]), results });
          total += (m[1] ? -1 : 1) * results.filter(r => r.active).reduce((a, r) => a + r.result, 0);
        } else total += Number(term.replace(/[()]/g, "")) || 0;
      }
      this.total = total;
      return this;
    }
    async toMessage(data) { return posted.push({ ...data, roll: this }) && { id: `m${posted.length}`, ...data }; }
  };
}
let posted = [];
function world() {
  posted = [];
  globalThis.CONFIG = { ...saved.CONFIG, ChatMessage: { documentClass: { getSpeaker: () => ({}), create: async d => posted.push(d) && d } } };
  globalThis.game = { ...(saved.game ?? {}), user: { isGM: false, targets: new Set() }, users: [], combat: null, settings: saved.game?.settings };
}
const actor = () => { const a = makeActor({ system: structuredClone(baseAbilities) }); a.uuid = "Actor.a"; a.isOwner = true; a.update = async () => {}; return a; };

test("a d20 roll opens the dialog with every part; unticked and added parts reach the roll and the card", async () => {
  world(); stubRolls([12]);
  dialogs.enabled = true;
  let seen = null;
  dialogs.d20 = async o => { seen = o; return { off: ["p0"], on: [], added: [{ label: "Bless", value: "1d4" }, { label: "Aid", value: "1" }], mode: "advantage" }; };
  const { rollWithSpec } = await import("../module/dice/roll.mjs");
  const { rollSpec } = await import("../module/dice/d20.mjs");
  const a = actor();
  const spec = rollSpec(a, "save", "str");
  await rollWithSpec(a, spec, { dc: 15 });
  assert.deepEqual(seen.parts.map(p => p.label), spec.breakdown.parts.map(p => p.label));
  assert.equal(seen.mode, "normal");
  const sent = posted.at(-1);
  const strMod = a.system.abilities.str.mod;
  assert.equal(sent.flags.n5e.roll.bonus, spec.bonus - strMod + 1, "Str unticked, +1 added");
  assert.equal(sent.flags.n5e.roll.extra, "1d4");
  assert.equal(sent.flags.n5e.roll.mode, "advantage");
  assert.match(sent.flavor, /<s>Str<\/s>/);
  assert.match(sent.flavor, /Bless \(1d4\) <em>\(added\)<\/em>/);
  assert.match(sent.flavor, /Roll breakdown \(edited\)/);
});

test("closing the dialog rolls nothing; with the dialog off the roll goes straight through", async () => {
  world(); stubRolls([10, 10]);
  const { rollWithSpec } = await import("../module/dice/roll.mjs");
  const { rollSpec } = await import("../module/dice/d20.mjs");
  const a = actor();
  dialogs.enabled = true;
  dialogs.d20 = async () => null;
  assert.equal(await rollWithSpec(a, rollSpec(a, "skill", "ath")), null);
  assert.equal(posted.length, 0);
  dialogs.enabled = false;
  dialogs.d20 = async () => { throw new Error("should not open"); };
  await rollWithSpec(a, rollSpec(a, "skill", "ath"));
  assert.equal(posted.length, 1);
  assert.doesNotMatch(posted[0].flavor, /edited/);
});

test("a group: one dialog, its choice applied to each creature by label (King Q-R2)", async () => {
  world(); stubRolls([10, 10, 10]);
  const { rollWithSpec, groupRollChoice } = await import("../module/dice/roll.mjs");
  const { rollSpec } = await import("../module/dice/d20.mjs");
  const [a, b] = [actor(), makeActor({ system: { abilities: { str: { value: 8 } } } })];
  Object.assign(b, { uuid: "Actor.b", isOwner: true, update: async () => {} });
  dialogs.enabled = true;
  let calls = 0;
  dialogs.d20 = async o => { calls++; assert.deepEqual(o.group.length, 2); return { off: [o.parts.find(p => p.label === "Str").id], added: [{ value: "2" }], mode: "own" }; };
  const entries = [a, b].map(x => ({ actor: x, spec: rollSpec(x, "save", "str") }));
  const prepared = await groupRollChoice(entries, "Str save");
  assert.deepEqual(prepared.offLabels, ["Str"]);
  for ( const e of entries ) await rollWithSpec(e.actor, e.spec, { prepared });
  assert.equal(calls, 1);
  entries.forEach((e, i) => assert.equal(posted[i].flags.n5e.roll.bonus, e.spec.bonus - e.actor.system.abilities.str.mod + 2));
  assert.equal(await groupRollChoice(entries.slice(0, 1), "x"), undefined, "one creature: its own dialog");
});

test("Will of Fire rerolls repeat the edited math without a dialog", async () => {
  world(); stubRolls([4, 15]);
  const { rollWithSpec, spendWillOfFire } = await import("../module/dice/roll.mjs");
  const { rollSpec } = await import("../module/dice/d20.mjs");
  const a = actor();
  a.system.willOfFire.value = 1;
  dialogs.enabled = true;
  dialogs.d20 = async () => ({ off: [], added: [{ value: "1d4" }], mode: "normal" });
  await rollWithSpec(a, rollSpec(a, "skill", "ath"));
  const data = posted[0].flags.n5e.roll;
  dialogs.d20 = async () => { throw new Error("no dialog on a reroll"); };
  globalThis.fromUuid = async () => a;
  await spendWillOfFire({ getFlag: () => data, flags: {}, id: "m1" }, "reroll");
  assert.match(posted[1].roll.formula, /\+ 1d4$/);
});

test("dialog HTML: parts with ticks, situational unticked, group values, mode preselected, sources", () => {
  const parts = [...d20Parts({ bonus: 5, breakdown: { parts: [{ label: "Dex", value: 3, base: true }, { label: "Half proficiency", value: 2 }] } }),
    { id: "s0", label: "Forest (in forests)", value: 2, situational: true }];
  const html = d20DialogHTML({ parts, mode: "advantage", sources: { advantage: ["Target Prone"], disadvantage: [] }, stake: "vs DC 14" });
  assert.match(html, /name="on_p0" checked/);
  assert.match(html, /name="on_s0" >/);
  assert.match(html, /value="advantage" checked/);
  assert.match(html, /Advantage: Target Prone/);
  assert.match(html, /vs DC 14/);
  assert.match(html, /name="addValue_0"/);
  const group = d20DialogHTML({ parts: [{ id: "g0", label: "Str", value: 4, same: false }], mode: "own", group: ["A", "B"] });
  assert.match(group, /varies/);
  assert.match(group, /value="own" checked/);
  const dice = diceDialogHTML({ parts: [{ id: "d0", label: "1d8 slashing", formula: "1d8", type: "slashing" }], showCrit: true, crit: true,
    types: { slashing: { label: "Slashing" }, fire: { label: "Fire" } } });
  assert.match(dice, /name="crit" checked/);
  assert.match(dice, /<select name="addType_0"/);
  assert.match(dice, /As worked out/);
});

test("the build check finds no key combinations", async () => {
  const { execFileSync } = await import("node:child_process");
  const out = execFileSync(process.execPath, [new URL("../tools/check-keys.mjs", import.meta.url).pathname], { encoding: "utf8" });
  assert.match(out, /no key combinations/);
});
