/** FIN3a: one save per effect on the card's buttons; offered effects remember their card. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeActor } from "./helpers/actor.mjs";
import { activityButtons } from "../module/workflow/activity-buttons.mjs";

test("each row's save and damage buttons carry the row's effect key", () => {
  const item = { _id: "fin3jutsu0000001", name: "Cherry Blossom Impact", type: "jutsu", system: { discipline: "tai", rank: "B",
    description: "<p>x</p>" } };
  const a = makeActor({ items: [item] });
  const j = a.items.find(i => i.id === item._id);
  j.system.prepareActorDerived?.(a);
  const html = activityButtons(a, j, [
    { id: "strike", type: "save", label: "Save", save: { abilities: ["con"], dc: { source: "fixed", formula: "15" }, onSuccess: "none" },
      damage: { parts: [{ formula: "4d12", type: "bludgeoning" }] }, inflicts: [{ key: "dazed", kind: "condition", ranks: 1, label: "Dazed" }] },
    { id: "finisher", type: "save", label: "Finisher", save: { abilities: ["dex"], dc: { source: "fixed", formula: "15" }, onSuccess: "half" },
      damage: { parts: [{ formula: "6d6", type: "bludgeoning" }] } }]);
  assert.match(html, /data-n5e-act="save" data-effect="0"/);
  assert.match(html, /data-n5e-act="save" data-effect="1"/);
  assert.match(html, /data-n5e-act="damage" data-effect="1"/);
});

test("an offer card made while an action card applies an effect remembers that card", async () => {
  const { withCardLink, effectApplicationCard } = await import("../module/workflow/effect-application.mjs");
  const created = [];
  const prior = CONFIG.ChatMessage;
  CONFIG.ChatMessage = { documentClass: { create: async data => { created.push(data); return data; }, getSpeaker: () => ({}) } };
  try {
    await withCardLink({ messageId: "card1", source: "act:0" }, () => effectApplicationCard(null, [{ name: "Slowed" }], { recipients: [] }));
    await effectApplicationCard(null, [{ name: "Slowed" }], { recipients: [] });
  } finally { CONFIG.ChatMessage = prior; }
  assert.deepEqual(created[0].flags.n5e.effectApplication.card, { messageId: "card1", source: "act:0" });
  assert.equal(created[1].flags.n5e.effectApplication.card, undefined, "the link ends with the card's click");
});
