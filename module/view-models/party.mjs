/**
 * GM Party Overview rows (pure): HP, CP, conditions, concentration, Fury, open Gate, Amps.
 */
const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);
const pct = (v, m) => (m ? Math.max(0, Math.min(100, Math.round((v / m) * 100))) : 0);

/**
 * One Party Overview row: HP and CP (with bar percentages and temp), condition names with ranks,
 * states, concentrated jutsu names, and badges (Fury, open Gate, Amps, 0 HP).
 * @param {Actor} actor
 */
export function partyRowVM(actor) {
  const s = actor.system;
  const effects = list(actor.effects).filter(e => !e.disabled);
  const conditions = effects.filter(e => e.type === "condition")
    .map(e => e.rankedName ?? ((e.system?.ranks ?? 1) > 1 ? `${e.name} ${e.system.ranks}` : e.name));
  const states = effects.filter(e => e.type === "state").map(e => e.name);
  const conc = list(s.combat?.concentrating).map(id => list(actor.items).find(i => i.id === id)?.name).filter(Boolean);
  const gate = effects.find(e => e.flags?.n5e?.gates)?.flags.n5e.gates.n ?? 0;
  return {
    uuid: actor.uuid, id: actor.id, name: actor.name, img: actor.img,
    hp: { value: s.hp?.value ?? 0, max: s.hp?.max ?? 0, temp: s.hp?.temp ?? 0, pct: pct(s.hp?.value ?? 0, s.hp?.max ?? 0) },
    cp: { value: s.cp?.value ?? 0, max: s.cp?.max ?? 0, temp: s.cp?.temp ?? 0, pct: pct(s.cp?.value ?? 0, s.cp?.max ?? 0) },
    conditions, states, concentration: conc,
    badges: [
      s.combat?.fury ? `Fury ${s.combat.fury}` : "",
      gate ? `Gate ${gate}` : "",
      ...effects.filter(e => e.type === "amp").map(e => e.name),
      (s.hp?.value ?? 1) <= 0 ? "0 HP" : ""
    ].filter(Boolean)
  };
}
