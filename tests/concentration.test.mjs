/** CONC1: incapacitation ends concentration; readied jutsu are held by concentration. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { concentrationBreaker, lostReadied, readiedIds } from "../module/rules/concentration.mjs";
import { upkeepOptions } from "../module/rules/upkeep.mjs";

test("what breaks concentration", () => {
  assert.equal(concentrationBreaker({ statuses: new Set(["stunned"]) }), "Stunned");
  assert.equal(concentrationBreaker({ statuses: new Set(["unconscious", "prone"]) }), "Unconscious");
  assert.equal(concentrationBreaker({ statuses: new Set(), system: { conditionPenalties: { flags: { incapacitated: true } } } }), "Incapacitated");
  assert.equal(concentrationBreaker({ statuses: new Set(["prone", "grappled"]) }), null);
});

test("readied jutsu: lost when their concentration ends, and left out of upkeep", () => {
  const actor = { flags: { n5e: { readied: { a: { rank: "D", cost: 6 }, b: { rank: "C", cost: 10 } }, concentrationPaid: { a: 6, b: 10, c: 8 } } },
    system: { cp: { value: 20 }, combat: { concentrating: ["a", "c"] } },
    items: new Map([["a", { id: "a", name: "Held", system: {} }], ["c", { id: "c", name: "Mist", system: {} }]]) };
  assert.deepEqual(readiedIds(actor), ["a", "b"]);
  assert.deepEqual(lostReadied(actor), ["b"]);
  assert.deepEqual(upkeepOptions(actor).jutsu.map(j => j.name), ["Mist"], "a readied jutsu has no upkeep");
});

test("workflow: the active GM drops all concentration when incapacitated; readied jutsu go with it", async () => {
  const cards = [];
  globalThis.CONFIG = { ChatMessage: { documentClass: { getSpeaker: () => ({}), create: async d => { cards.push(d); return d; } } } };
  globalThis.game = { users: { activeGM: { isSelf: true } } };
  const actor = { uuid: "Actor.x", name: "Hero", statuses: new Set(["stunned"]),
    flags: { n5e: { readied: { a: { rank: "D", cost: 6 } }, concentrationPaid: { a: 6, c: 8 } } },
    system: { combat: { concentrating: ["a", "c"] } }, items: new Map([["a", { name: "Held" }], ["c", { name: "Mist" }]]),
    async update(u) {
      for ( const [k, v] of Object.entries(u) ) {
        if ( k.includes(".-=") ) { const [path, key] = k.split(".-="); delete path.split(".").reduce((o, p) => o[p], this)[key]; continue; }
        const parts = k.split("."); let o = this; for ( const p of parts.slice(0, -1) ) o = o[p] ??= {}; o[parts.at(-1)] = v;
      }
    } };
  const { checkConcentration } = await import("../module/workflow/concentration.mjs");
  await checkConcentration(actor);
  assert.deepEqual(actor.system.combat.concentrating, []);
  assert.deepEqual(actor.flags.n5e.readied, {});
  assert.match(cards[0].content, /loses concentration \(Stunned\): Held, Mist end/);
  assert.match(cards[1].content, /readied Held lost/);
});
