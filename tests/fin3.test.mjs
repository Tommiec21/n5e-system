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

test("FIN3b: a concentrated jutsu clashes at its cast rank", async () => {
  const { clashRank } = await import("../module/workflow/clash.mjs");
  const item = { id: "j1", system: { rank: "B" } };
  const caster = conc => ({ system: { combat: { concentrating: conc } }, flags: { n5e: { concentrationRank: { j1: "S" } } } });
  assert.equal(clashRank(caster(["j1"]), item), "S");
  assert.equal(clashRank(caster([]), item), "B", "not concentrating: its own rank");
  assert.equal(clashRank({ system: { combat: { concentrating: ["j1"] } }, flags: {} }, item), "B");
});

test("FIN3b: the dispel intent is validated", async () => {
  const { validateIntent, INTENT_TYPES } = await import("../module/automation/owner-intents.mjs");
  assert.ok(INTENT_TYPES.includes("dispelJutsu"));
  assert.deepEqual(validateIntent("dispelJutsu", { itemId: "abc123", messageId: "msg1", side: "b" }), { itemId: "abc123", messageId: "msg1", side: "b" });
  assert.throws(() => validateIntent("dispelJutsu", { itemId: "abc123", messageId: "msg1", side: "c" }), /Invalid dispel/);
});

test("FIN5: the ryo transfer intent is validated", async () => {
  const { validateIntent } = await import("../module/automation/owner-intents.mjs");
  assert.deepEqual(validateIntent("transferRyo", { targetUuid: "Actor.abc123", amount: 50 }), { targetUuid: "Actor.abc123", amount: 50 });
  assert.throws(() => validateIntent("transferRyo", { targetUuid: "Actor.abc123", amount: 0 }), /Invalid ryo transfer/);
});

test("PRESTD1 A: NPC privacy: only NPCs no player owns; whisper only when the rule is on", async () => {
  const { privateNpc, gmWhisper, nameShownToAll, hideNameFor } = await import("../module/workflow/npc-privacy.mjs");
  const npc = { type: "npc", testUserPermission: () => false, prototypeToken: { displayName: 0 } };
  const allied = { type: "npc", testUserPermission: () => true };
  const pc = { type: "character", testUserPermission: () => true };
  const priorGame = globalThis.game;
  globalThis.game = { ...(priorGame ?? {}), users: [{ id: "gm", isGM: true }, { id: "p1", isGM: false }] };
  assert.equal(privateNpc(npc), true);
  assert.equal(privateNpc(allied), false);
  assert.equal(privateNpc(pc), false);
  assert.deepEqual(gmWhisper(npc, "hideNpcDamage"), {}, "rule off by default");
  assert.equal(nameShownToAll({ displayName: 50 }), true);
  assert.equal(nameShownToAll({ displayName: 40 }), false);
  assert.equal(hideNameFor({ isGM: false }, npc, null), false, "rule off by default");
  globalThis.game = priorGame;
});

test("PRESTD1 A: Stealth, Insight and identify checks start secret", async () => {
  const { secretByDefault } = await import("../module/dice/roll.mjs");
  assert.equal(secretByDefault({ type: "skill", key: "ste" }), true);
  assert.equal(secretByDefault({ type: "skill", key: "ath" }), false);
  assert.equal(secretByDefault({ type: "skill", key: "ill", label: "Identify Genjutsu" }), true);
});

test("PRESTD1 B: a cast from a scroll costs no chakra and ignores the rank cap", async () => {
  const { castBlockers } = await import("../module/rules/cast-checks.mjs");
  const actor = { statuses: new Set(), system: { level: 1, conditionPenalties: { flags: {} } }, flags: {}, effects: [] };
  const item = { system: { rank: "A", live: { meetsRequirement: false }, components: [] } };
  assert.ok(castBlockers(actor, item, { rank: "A" }).length >= 1);
  assert.deepEqual(castBlockers(actor, item, { rank: "A", scroll: true }), []);
});

test("PRESTD1 C: loot intents are validated", async () => {
  const { validateIntent } = await import("../module/automation/owner-intents.mjs");
  for ( const t of ["lootTake", "lootBuy", "lootSell"] ) {
    assert.deepEqual(validateIntent(t, { lootUuid: "Actor.pile1", itemId: "abc123", quantity: 2 }), { lootUuid: "Actor.pile1", itemId: "abc123", quantity: 2 });
    assert.throws(() => validateIntent(t, { lootUuid: "Actor.pile1", itemId: "abc123", quantity: 0 }), /Invalid loot request/);
  }
});
