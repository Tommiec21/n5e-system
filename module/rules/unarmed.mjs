/**
 * Unarmed damage (pure). Base: 1 + Str bludgeoning. A Taijutsu stance (or a stance that sets it)
 * makes the die its unarmedDie (most: d6) and may change the type; some upgrade the die with an item
 * (Iron Fist: d8 with Combat Bracers if Str is your Taijutsu ability; Silent Killing: d8 with Iron
 * Claws). Effects add dice (n5e.unarmed.dice, e.g. the Inner Gates).
 */
/** True for the built-in Unarmed Strike item (DATA2). */
export const isUnarmedStrike = item => item?.type === "weapon" && (item.system?.identifier === "unarmedStrike" || !!item.flags?.n5e?.unarmedStrike);

/** Equipped weapons other than the Unarmed Strike item. */
export const equippedWeapons = actor => [...(actor?.items ?? [])].filter(i => i.type === "weapon" && i.system?.equipped && !isUnarmedStrike(i));

const list = v => (Array.isArray(v) ? v : [...(v ?? [])]);

/** The actor's active stance item (system.combat.activeStance holds its id), or null. */
export function activeStance(actor) {
  const id = actor.system.combat?.activeStance;
  return id ? (actor.items.get?.(id) ?? list(actor.items).find(i => i.id === id) ?? null) : null;
}

/** @returns {{die: string, type: string, extra: string[], mod: number, ability: string, formula: string, source: string}} */
export function unarmedSpec(actor) {
  const sys = actor.system;
  const stance = activeStance(actor);
  const st = stance?.system ?? {};
  const cats = st.categories instanceof Set ? st.categories : new Set(st.categories ?? []);
  let die = st.unarmedDie || (cats.has("taijutsu") ? "1d6" : "1");
  const alt = st.unarmedAlt ?? {};
  if ( alt.die && alt.item ) {
    const has = list(actor.items).some(i => i.system?.equipped !== false && i.name.toLowerCase().includes(alt.item.toLowerCase())
      && ["weapon", "equipment", "armor", "gear"].includes(i.type));
    const abilityOk = !alt.ability || sys.disciplines?.tai?.ability === alt.ability;
    if ( has && abilityOk ) die = alt.die;
  }
  const type = st.unarmedType || "bludgeoning";
  const extra = [...(sys.modifiers?.unarmedDice ?? [])];
  const mod = sys.abilities?.str?.mod ?? 0;
  const formula = `${die}${extra.map(d => ` + ${d}`).join("")}${mod ? ` ${mod < 0 ? "-" : "+"} ${Math.abs(mod)}` : ""}`;
  return { die, type, extra, mod, ability: "str", formula, source: stance && die !== "1" ? stance.name : "" };
}

/** Die ladder for stepping: d4 > d6 > d8 > d10 > d12 (capped at both ends). */
const STEPS = [4, 6, 8, 10, 12];
/** Step a die ("1d6" +1 -> "1d8"); flat "1" steps up to d4. Keeps the dice count. */
export function stepDie(die, steps = 0) {
  if ( !steps ) return die;
  const m = String(die).match(/^(\d*)d(\d+)$/);
  if ( !m ) return steps > 0 ? stepDie("1d4", steps - 1) : die;
  const i = STEPS.indexOf(Number(m[2]));
  const j = Math.max(0, Math.min(STEPS.length - 1, (i < 0 ? 0 : i) + steps));
  return `${m[1] || 1}d${STEPS[j]}`;
}

/**
 * Level-scaled values in formulas: lvl(1:1d8,5:2d8,11:3d8) picks the entry for the actor's level.
 * Also resolves @level. Leaves everything else for Roll.
 */
export function resolveFormula(formula, actor) {
  const level = actor?.system?.level ?? 1;
  return String(formula ?? "").replace(/lvl\(([^)]*)\)/g, (m, body) => {
    let pick = "0";
    for ( const part of body.split(",") ) {
      const [l, v] = part.split(":").map(s => s.trim());
      if ( level >= Number(l) ) pick = v;
    }
    return pick;
  }).replace(/@level\b/g, String(level));
}
