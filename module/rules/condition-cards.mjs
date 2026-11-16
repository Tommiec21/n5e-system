/**
 * Condition cards, pure rules (CCOND1; docs/CCOND1_SPEC.md). The Foundry side (registration at
 * start-up, applying, drag and drop, ending them with their applier) is workflow/condition-cards.mjs.
 *
 * Cards register into CONFIG.N5E.clanConditions, the registry for every condition that isn't core
 * (class and clan alike), so all the code that already looks conditions up there runs them.
 */

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const slug = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The registry key of a card: its identifier, or its name made into one. */
export const cardKey = card => card.system?.identifier || slug(card.name);

/**
 * The registry entry for a card (the shape of a core condition in config/conditions.mjs), plus who
 * owns it, the card's uuid and its summary.
 * @param {{name, img, uuid?, system, flags?}} card
 */
export function cardDefinition(card) {
  const s = card.system ?? {};
  const def = {
    label: card.name, icon: card.img || "icons/svg/aura.svg", scope: s.owner?.kind === "clan" ? "clan" : "class",
    owner: { kind: s.owner?.kind || "class", id: s.owner?.id ?? "", subclass: s.owner?.subclass ?? "" },
    card: card.uuid ?? null, summary: s.summary ?? "",
    tags: list(s.tags), maxRanks: s.maxRanks ?? null, persists: !!s.persists
  };
  if ( s.endsAt ) def.endsAt = s.endsAt;
  if ( s.initiativeShift ) def.initiativeShift = Number(s.initiativeShift);
  if ( s.decay?.when ) def.decay = { when: s.decay.when, amount: s.decay.amount ?? 1 };
  const removal = list(s.removal).map(r => r.text && !list(r.check).length ? { text: r.text }
    : { action: r.action || "action", check: list(r.check), dc: r.dc ?? null, ranks: /^\d+$/.test(String(r.ranks)) ? Number(r.ranks) : "all" });
  if ( removal.length ) def.removal = removal;
  if ( s.resave?.ability ) def.resave = { ability: s.resave.ability, source: s.resave.source ?? "", dc: s.resave.dc ?? null };
  if ( s.turnStartDamage?.die ) def.turnStartDamage = { ...s.turnStartDamage };
  for ( const k of ["perRank", "flat", "flags", "cast"] ) if ( s[k] && Object.keys(s[k]).length ) def[k] = structuredClone(s[k]);
  const rules = card.flags?.n5e?.rules;
  if ( Array.isArray(rules) && rules.length ) def.rules = structuredClone(rules);
  return def;
}

/**
 * Pending initiative changes to apply at the start of a round (pure): [{_id, initiative}] for each
 * combatant with flags.n5e.pendingInitiative and an initiative, and the ids to clear.
 */
export function pendingInitiative(combatants) {
  const updates = [];
  for ( const c of list(combatants) ) {
    const shift = Number(c.flags?.n5e?.pendingInitiative) || 0;
    if ( !shift ) continue;
    updates.push({ _id: c.id ?? c._id, ...(c.initiative == null ? {} : { initiative: c.initiative + shift }), "flags.n5e.-=pendingInitiative": null });
  }
  return updates;
}

/** Is this registry entry a card (class or clan condition)? */
export const isCard = def => !!def?.owner;

/** The identifiers an actor has: its classes, subclasses and clan. */
function identities(actor) {
  const ids = { class: new Set(), subclass: new Set(), clan: new Set() };
  for ( const i of list(actor?.items) ) if ( ids[i.type] && i.system?.identifier ) ids[i.type].add(i.system.identifier);
  return ids;
}

/**
 * Does the actor have the class (and subclass) or clan the card belongs to? King Q-CC2: any player or
 * the GM may still apply it (summons, clones and allies depend on the feature); this only warns.
 */
export function ownsCondition(actor, def) {
  if ( !isCard(def) ) return true;
  const ids = identities(actor);
  if ( def.owner.kind === "clan" ) return ids.clan.has(def.owner.id);
  return ids.class.has(def.owner.id) && (!def.owner.subclass || ids.subclass.has(def.owner.subclass));
}

/** The cards an actor can apply (for its Features tab): [{key, label, icon, summary, card, tags}]. */
export function conditionCardsFor(actor, registry = {}) {
  return Object.entries(registry).filter(([, def]) => isCard(def) && ownsCondition(actor, def))
    .map(([key, def]) => ({ key, label: def.label, icon: def.icon, summary: def.summary, card: def.card, tags: def.tags ?? [],
      ranks: def.maxRanks == null ? "" : def.maxRanks === 0 ? "ranks" : `max ${def.maxRanks}` }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * King Q-CC7: a GM setting decides whether players see a card's rules on creatures they don't own.
 * Returns the registry with those cards' summaries (and rules text) hidden when it says "name".
 */
export function visibleRegistry(registry, { details = "full", owner = true } = {}) {
  if ( details !== "name" || owner ) return registry;
  return Object.fromEntries(Object.entries(registry).map(([k, def]) => [k, isCard(def) ? { ...def, summary: "", hidden: true } : def]));
}

/**
 * The end-of-turn save a card's condition carries (flags.n5e.resave on the effect), or null.
 * @param {object} def           registry entry
 * @param {object|null} applier  the actor that applied it (its DC for the source discipline)
 */
export function cardResave(def, applier) {
  if ( !def?.resave?.ability ) return null;
  const dc = def.resave.dc ?? applier?.system?.disciplines?.[def.resave.source]?.dc ?? null;
  return dc == null ? null : { ability: def.resave.ability, dc: Number(dc), label: def.label };
}

/** Effects (condition cards) an applier put on an actor: [{effect, key}] (King Q-CC5: they end with it). */
export function appliedBy(actor, applierUuid) {
  return list(actor?.effects).filter(e => e.type === "condition" && e.flags?.n5e?.appliedBy === applierUuid)
    .map(effect => ({ effect, key: effect.system?.key }));
}
