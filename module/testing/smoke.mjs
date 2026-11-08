/** Optional live Foundry v13 smoke check. Uses an unsaved Actor and local update overrides:
 * no world actors/items/settings are created, changed or deleted. The rules window opens briefly.
 * Run after ready as GM: await game.n5e.api.runSmokeTests()
 */
import RulesConfig from "../applications/settings/rules-config.mjs";
import { onActivityClick } from "../workflow/activity-buttons.mjs";
import { applyHealing } from "../workflow/health.mjs";

export async function runSmokeTests() {
  if ( !game.ready || !game.user.isGM ) throw new Error("Run the N5e smoke check after the world is ready, as GM.");
  const checks = [];
  const assert = (ok, label) => { if ( !ok ) throw new Error(`N5e smoke check failed: ${label}`); checks.push(label); };
  const app = new RulesConfig();
  try {
    await app.render({ force: true });
    assert(!!app.element?.querySelector(".rule-groups input"), "Rules window opens and contains controls");
  } finally { await app.close(); }
  const source = {
    _id: foundry.utils.randomID(), name: "N5e unsaved smoke actor", type: "npc",
    system: { hpMax: 20, cpMax: 10, hp: { value: 0 }, cp: { value: 5 },
      resources: { focus: { label: "Focus", max: "5", value: 2 } } },
    items: [{ _id: foundry.utils.randomID(), name: "Smoke resource", type: "feat",
      system: { activities: [{ id: "counter", type: "roll", label: "Gain Focus", cost: { pool: "focus", amount: 1, gain: true, choose: false }, oncePerTurn: true }] } }],
    effects: [{ _id: foundry.utils.randomID(), name: "Envenomed", type: "condition", system: { key: "envenomed", ranks: 1 } }]
  };
  const ActorClass = CONFIG.Actor.documentClass;
  const actor = new ActorClass(source);
  actor.prepareData();
  // Updates stay on this detached document. The ordinary Actor.update would contact the server.
  actor.update = async changes => { actor.updateSource(changes); actor.prepareData(); return actor; };
  const statuses = [];
  actor.toggleStatusEffect = async (key, options) => { statuses.push([key, options.active]); };
  assert(actor.items.contents[0].system.activities[0].cost.gain === true, "Real item model retains resource-gain flag");
  const restored = new ActorClass(JSON.parse(JSON.stringify(actor.toObject())));
  restored.prepareData();
  assert(restored.items.contents[0].system.activities[0].cost.gain === true, "Item flags survive serialization and reload");
  const blocked = await applyHealing(actor, 5);
  assert(!!blocked.blocked && actor.system.hp.value === 0, "Envenomed blocks the shared healing service");
  actor.updateSource({ effects: [] }); actor.prepareData();
  await applyHealing(actor, 5);
  assert(actor.system.hp.value === 5 && statuses.some(([key]) => key === "dying"), "Shared healing restores HP and performs revival cleanup");
  const item = actor.items.contents[0];
  const activity = item.system.activities[0];
  const message = { speakerActor: actor, getFlag: () => null };
  const button = { dataset: { n5eAct: "roll", item: item.id, activity: activity.id, cost: JSON.stringify(activity.cost) } };
  await onActivityClick(message, button, {});
  assert(actor.system.resources.focus.value === 3, "Activity executor gains a resource on a real detached actor");
  console.table(checks.map(check => ({ check, result: "passed" })));
  return checks;
}
