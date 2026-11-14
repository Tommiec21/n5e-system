/** TURN1: forward-only turn events, combat recovery periods, upkeep decision cycle. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { combatRecoveryPlan, COMBAT_PERIODS } from "../module/rules/recovery.mjs";

const actor = () => ({
  system: { resources: {
    martial: { label: "Martial Dice", value: 0, maxValue: 2, recovery: [{ on: "turn" }] },
    wave: { label: "Wave", value: 1, maxValue: 3, recovery: [{ on: "round" }] },
    gate: { label: "Gate", value: 0, maxValue: 1, recovery: [{ on: "encounter", requires: "missing-feature" }] },
    full: { label: "Full", value: 2, maxValue: 2, recovery: [{ on: "turn" }] }
  } },
  items: [
    { id: "i1", name: "Once a turn", system: { uses: { per: "turn", spent: 1 } } },
    { id: "i2", name: "Once a round", system: { uses: { per: "round", spent: 1 } } },
    { id: "i3", name: "Once an encounter", system: { uses: { per: "encounter", spent: 2 } } },
    { id: "i4", name: "Long rest", system: { uses: { per: "lr", spent: 1 } } },
    { id: "i5", name: "Unspent", system: { uses: { per: "turn", spent: 0 } } }
  ]
});

test("combat recovery: each period resets only its own uses and pools; feature requirements apply", () => {
  assert.deepEqual(COMBAT_PERIODS, ["turn", "round", "encounter"]);
  const turn = combatRecoveryPlan(actor(), ["turn"]);
  assert.deepEqual(turn.update, { "system.resources.martial.value": 2 });
  assert.deepEqual(turn.itemUpdates, [{ _id: "i1", "system.uses.spent": 0 }]);
  assert.deepEqual(turn.recovered, ["Martial Dice", "Once a turn"]);
  const round = combatRecoveryPlan(actor(), ["round"]);
  assert.deepEqual(round.update, { "system.resources.wave.value": 3 });
  assert.deepEqual(round.itemUpdates.map(u => u._id), ["i2"]);
  const encounter = combatRecoveryPlan(actor(), ["encounter"]);
  assert.deepEqual(encounter.update, {}, "Gate needs a feature the actor lacks");
  assert.deepEqual(encounter.itemUpdates.map(u => u._id), ["i3"]);
  assert.deepEqual(combatRecoveryPlan(actor(), ["lr"]).itemUpdates, [], "rests are not combat periods");
});

test("N5eCombat runs turn automation from Foundry's forward-only turn methods", async () => {
  const calls = [];
  globalThis.foundry = { ...(globalThis.foundry ?? {}), documents: { ...(globalThis.foundry?.documents ?? {}), Combat: class {
    async startCombat() { calls.push("super.start"); return this; }
    async _onStartRound() { calls.push("super.round"); }
    async _onStartTurn() { calls.push("super.turnStart"); }
    async _onEndTurn() { calls.push("super.turnEnd"); }
    _onDelete() { calls.push("super.delete"); }
  } } };
  globalThis.game = { users: { activeGM: { isSelf: false } } };
  const { default: N5eCombat } = await import("../module/documents/combat.mjs");
  const combat = new N5eCombat();
  combat.combatants = [];
  await combat.startCombat();
  await combat._onStartRound({});
  await combat._onEndTurn({ actor: null }, {});
  await combat._onStartTurn({ actor: null }, {});
  combat._onDelete({}, "u");
  assert.deepEqual(calls, ["super.start", "super.round", "super.turnEnd", "super.turnStart", "super.delete"]);
  // Rewinds: Foundry does not call these methods when the turn or round goes backward; N5e registers
  // no combatTurnChange/combatStart hooks that could re-run automation.
  const { readFileSync } = await import("node:fs");
  for ( const file of ["../module/workflow/turn.mjs", "../module/automation/effect-services.mjs"] ) {
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), "utf8"), /Hooks\.on\("combat(TurnChange|Start)"|Hooks\.on\("deleteCombat"/);
  }
});

test("upkeep decision: begin opens it for the owner, the owner pays, an unanswered one ends at turn end", async () => {
  const settings = { concentrationUpkeep: true, npcUpkeep: "auto" };
  const owner = { id: "p", isGM: false };
  const items = new Map([["a", { id: "a", name: "Mist", system: { keywords: [] } }], ["b", { id: "b", name: "Veil", system: { keywords: [] } }]]);
  const pc = { uuid: "Actor.pc", type: "character", items, isOwner: true,
    system: { cp: { value: 10 }, combat: { concentrating: ["a", "b"] } },
    flags: { n5e: { concentrationPaid: { a: 8, b: 6 } } },
    testUserPermission: u => u.id === "p",
    async update(u) {
      for ( const [k, v] of Object.entries(u) ) {
        if ( k === "flags.n5e.-=upkeepPending" ) { delete this.flags.n5e.upkeepPending; continue; }
        if ( k.startsWith("flags.n5e.concentrationPaid.-=") ) { delete this.flags.n5e.concentrationPaid[k.split("-=")[1]]; continue; }
        const parts = k.split("."); let o = this; for ( const p of parts.slice(0, -1) ) o = o[p] ??= {}; o[parts.at(-1)] = v;
      }
    } };
  globalThis.game = { user: { id: "gm", isGM: true }, users: { activeGM: { isSelf: true } }, settings: { get: (s, k) => settings[k] } };
  const { beginUpkeep, resolveUpkeep, finishUpkeep } = await import("../module/workflow/upkeep.mjs");
  const lines = await beginUpkeep(pc, { id: "c", round: 1, turn: 0 });
  assert.match(lines[0], /data-n5e-upkeep/);
  assert.deepEqual(pc.flags.n5e.upkeepPending.ids, ["a", "b"]);
  globalThis.game.user = owner;
  pc.system.cp.value = 5;
  await assert.rejects(resolveUpkeep(pc, ["a", "b"]), /Not enough chakra/);
  await resolveUpkeep(pc, ["b"]);
  assert.deepEqual(pc.system.combat.concentrating, ["b"]);
  assert.equal(pc.system.cp.value, 2);
  assert.equal(pc.flags.n5e.upkeepPending, undefined);
  assert.equal(pc.flags.n5e.concentrationPaid.a, undefined);
  // Unanswered: ends at turn end.
  globalThis.game.user = { id: "gm", isGM: true };
  pc.system.cp.value = 10;
  await beginUpkeep(pc, { id: "c", round: 2, turn: 0 });
  assert.deepEqual(await finishUpkeep(pc), ["b"]);
  assert.deepEqual(pc.system.combat.concentrating, []);
  // Chakra for none: all end at turn start.
  pc.system.combat.concentrating = ["a"]; pc.flags.n5e.concentrationPaid = { a: 8 }; pc.system.cp.value = 1;
  const none = await beginUpkeep(pc, { id: "c", round: 3, turn: 0 });
  assert.match(none[0], /Not enough chakra/);
  assert.deepEqual(pc.system.combat.concentrating, []);
});
