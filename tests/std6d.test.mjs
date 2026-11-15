/** STD6d: class automation on prepared actors (Medical Release's Wisdom on Medical jutsu). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeActor, load, taiSpec } from "./helpers/actor.mjs";

test("Medical Release: Medical jutsu use Wisdom when it is higher; others keep the discipline's ability", () => {
  const abilities = { abilities: { str: { value: 10 }, dex: { value: 10 }, con: { value: 14 }, int: { value: 12 }, wis: { value: 18 }, cha: { value: 10 } } };
  const medical = load("jutsu", "medical-release-acid-armor");
  const plain = load("jutsu", "medical-release-acid-armor");
  plain.system.keywords = ["ninjutsu"];
  const with_ = makeActor({ system: abilities, items: [taiSpec(1), medical, plain], n5eChanges: [{ key: "n5e.keywordAbility.medical", value: "wis" }] });
  const [m, p] = with_.items.filter(i => i.type === "jutsu").map(i => i.system.live);
  assert.equal(m.ability, "wis");
  assert.equal(m.dc - p.dc, 4 - 1, "Wis +4 instead of Int +1");
  const without = makeActor({ system: abilities, items: [taiSpec(1), load("jutsu", "medical-release-acid-armor")] });
  assert.notEqual(without.items.find(i => i.type === "jutsu").system.live.ability, "wis");
});
