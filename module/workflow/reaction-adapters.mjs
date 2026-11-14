import { createReactionDispatcher } from "./reaction-dispatch.mjs";
import { openReactionWindow, waitForReactionWindow, askReactionLocally } from "./reactions.mjs";
import { deflectionOffer } from "../rules/deflection.mjs";
import { uncannyDodgeOffer } from "../rules/uncanny-dodge.mjs";
import { damageSourceVisibility } from "../canvas/visibility.mjs";
import { createN5eRoll } from "../dice/n5e-roll.mjs";
import { rule } from "../rules-settings.mjs";
import { authoredReactionOffers } from "../rules/authored-reactions.mjs";
import { createReactionChain } from "./reaction-chain.mjs";

const combatStamp = () => game.combat?.started ? `${game.combat.id}:${game.combat.round}:${game.combat.turn}` : null;
/**
 * Whoever applies the damage resolves reactions (dnd5e parity: the GM for NPCs, owners for their
 * characters). An owner applying to their own creature is asked directly; the GM applying to a
 * player's creature opens a whispered window for that player.
 */
const askOwner = (actor, item, options) => {
  const playerOwned = game.users.some(u => !u.isGM && u.active && actor.testUserPermission(u, "OWNER"));
  if ( game.user.isGM && game.users.activeGM?.isSelf && playerOwned ) return openReactionWindow(actor, item, options);
  return { local: askReactionLocally(actor, item, options) };
};
const dispatcher = createReactionDispatcher({
  authority: () => true,
  stamp: combatStamp, open: askOwner, wait: window => window.local ?? waitForReactionWindow(window)
});

dispatcher.register("uncanny-dodge", {
  events: ["beforeDamage"], priority: 100,
  offer(actor, { data, message }) {
    const offer = uncannyDodgeOffer(actor, { combat: !!combatStamp(), instances: data.instances,
      visibility: actor.items.some(i => i.system?.identifier === "uncanny-dodge") ? damageSourceVisibility(actor, message) : null });
    return offer && { ...offer, label: "Uncanny Dodge", trigger: "The source creature is automatically visible. Use your reaction to halve this damage?", terms: { multiplier: 0.5 } };
  },
  prepare() { return { multiplier: 0.5, update: { "flags.n5e.economy.reaction": true } }; }
});
dispatcher.register("deflection", {
  events: ["beforeDamage"], priority: 0,
  offer(actor, { data }) {
    const offer = deflectionOffer(actor, { combat: !!combatStamp(), ...data });
    return offer && { ...offer, label: "Deflection", trigger: "Use your reaction and 1 Discipline to reduce this damage?",
      terms: { cost: offer.cost, dice: offer.dice, die: offer.die } };
  },
  async prepare(actor, offer) {
    const roll = await createN5eRoll(`${offer.dice}${offer.die}`).evaluate();
    return { flatReduction: roll.total, update: { "system.resources.discipline.value": actor.system.resources.discipline.value - offer.cost,
      "flags.n5e.economy.reaction": true }, roll, label: "Deflection" };
  }
});

dispatcher.register("authored-damage", {
  events: ["beforeDamage"], priority: 50,
  offer(actor, { data, message }) {
    return authoredReactionOffers(actor, { combat: !!combatStamp(), instances: data.instances,
      visibility: () => damageSourceVisibility(actor, message) });
  },
  async prepare(actor, { terms, label }) {
    const roll = terms.reduction ? await createN5eRoll(terms.reduction, actor.getRollData?.() ?? {}).evaluate() : null;
    if ( roll && (!Number.isFinite(roll.total) || roll.total < 0) ) throw new Error("Reaction reduction must be a finite nonnegative number.");
    const update = {};
    if ( terms.cost ) update[`system.resources.${terms.pool}.value`] = actor.system.resources[terms.pool].value - terms.cost;
    if ( terms.spendReaction ) update["flags.n5e.economy.reaction"] = true;
    return { flatReduction: roll?.total ?? 0, multiplier: terms.multiplier, update, roll, label };
  }
});

export const registerReaction = (id, adapter) => dispatcher.register(id, adapter);
export const listReactions = () => dispatcher.list();
export async function chooseReaction(actor, event, context) {
  if ( !["beforeDamage", "successfulHit"].includes(event) ) throw new Error("This reaction timing is manual. Automation supports successful hits and rolled damage only.");
  if ( !rule("reactionWindows") ) return null;
  // Surprised: no Reactions until the end of its first turn (POS1).
  if ( actor?.statuses?.has("surprised") && !actor.flags?.n5e?.surpriseDone ) return null;
  return dispatcher.choose(actor, event, context);
}
export const resolveReactionChain = createReactionChain({ choose: chooseReaction, authority: () => !!game.users.activeGM?.isSelf });
