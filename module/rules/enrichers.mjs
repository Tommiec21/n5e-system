/**
 * Shortcuts in text (pure parsing). Journal pages, item descriptions and chat cards can hold:
 *
 *   [[/save dex]]                    a Dexterity save button (no DC)
 *   [[/save dex dc=15]]              ... against DC 15
 *   [[/save wis dc=gen]]             ... against the source's Genjutsu save DC (nin | tai | gen)
 *   [[/save con dc=15 inflict=staggered,bruised:2]]   failure offers Apply buttons
 *   [[/check prc dc=12]]             a skill check (skill key or name; "check str" = ability check)
 *   [[/check tool=medicine dc=15]]   a toolkit check
 *   [[/damage 2d6 fire]]             damage (comma-separated parts: [[/damage 2d6 fire, 1d6 cold]])
 *   [[/heal 2d8 + 3]]                healing; add "temp" (temporary HP) or "cp" (chakra)
 *   @Condition[bruised]              a condition link: hover for its rules, click applies it
 *   @Condition[bleed 2]              ... with 2 ranks
 *   @State[prone]                    a State link
 *
 * Any of them can end with {Custom label}: [[/save dex dc=15]]{Dodge the falling rocks}.
 * Which numbers they use: a "dc=nin" save reads the source actor (the item's owner, or the actor the
 * text belongs to). Saves and checks roll for the clicking user's selected tokens (else their
 * character); damage and healing roll for the source (else the user's selected token or character).
 *
 * The Foundry side (registering the patterns, building the links, clicks) is
 * module/applications/enrichers.mjs. Tests: tests/enrichers.test.mjs.
 */

const lower = s => String(s ?? "").trim().toLowerCase();

/** Look up a key in a registry by key, label or abbreviation (case-insensitive). */
function findKey(registry, word) {
  const w = lower(word);
  if ( !w ) return null;
  for ( const [k, v] of Object.entries(registry ?? {}) ) {
    if ( lower(k) === w || lower(v?.label) === w || lower(v?.abbr) === w ) return k;
  }
  return null;
}

/** "dex dc=15 inflict=prone" → { words: ["dex"], opts: {dc: "15", inflict: "prone"} }. */
export function splitArgs(text) {
  const words = [];
  const opts = {};
  for ( const part of String(text ?? "").trim().split(/\s+/).filter(Boolean) ) {
    const m = part.match(/^([a-z]+)=(.*)$/i);
    if ( m ) opts[m[1].toLowerCase()] = m[2];
    else words.push(part);
  }
  return { words, opts };
}

/** "staggered,bruised:2" → [{key, kind, ranks, label}] (unknown keys are dropped). */
export function parseInflicts(text, ctx) {
  return String(text ?? "").split(",").map(s => s.trim()).filter(Boolean).map(s => {
    const [word, r] = s.split(":");
    const ck = findKey(ctx.conditions, word);
    const sk = ck ? null : findKey(ctx.states, word);
    const key = ck ?? sk;
    if ( !key ) return null;
    const def = (ck ? ctx.conditions : ctx.states)[key];
    return { key, kind: ck ? "condition" : "state", ranks: Math.max(1, Number(r) || 1), label: def.label ?? key };
  }).filter(Boolean);
}

/**
 * Parse a [[/kind args]] shortcut.
 * @param {string} kind   save | check | damage | heal
 * @param {string} args   the text after the command
 * @param {object} ctx    { abilities, skills, toolkits, damageTypes, conditions, states, disciplines,
 *                          dcFor(disc) → number|null (the source's DC for nin/tai/gen) }
 * @returns {object|null} { kind, ..., label } or null when it can't be read
 */
export function parseRollLink(kind, args, ctx) {
  const { words, opts } = splitArgs(args);
  switch ( lower(kind) ) {
    case "save": {
      const ability = findKey(ctx.abilities, words[0]);
      if ( !ability ) return null;
      const out = { kind: "save", ability, dc: null, dcSource: null, inflicts: parseInflicts(opts.inflict, ctx) };
      if ( opts.dc && /^\d+$/.test(opts.dc) ) out.dc = Number(opts.dc);
      else if ( opts.dc && ctx.disciplines?.[lower(opts.dc)] ) {
        out.dcSource = lower(opts.dc);
        out.dc = ctx.dcFor?.(out.dcSource) ?? null;
      }
      const abbr = ctx.abilities[ability]?.abbr ?? ability;
      const dcText = out.dc != null ? ` DC ${out.dc}` : out.dcSource ? ` (${ctx.disciplines[out.dcSource]?.label ?? out.dcSource} DC)` : "";
      out.label = `${abbr} save${dcText}`;
      return out;
    }
    case "check": {
      const dc = opts.dc && /^\d+$/.test(opts.dc) ? Number(opts.dc) : null;
      let type = null;
      let key = null;
      if ( opts.tool ) {
        key = findKey(ctx.toolkits, opts.tool);
        type = "tool";
      } else if ( opts.skill ) {
        key = findKey(ctx.skills, opts.skill);
        type = "skill";
      } else if ( words.length ) {
        // "prc", "Perception", "Animal Handling": try the skill (one or two words), then an ability.
        key = findKey(ctx.skills, words.join(" ")) ?? findKey(ctx.skills, words[0]);
        type = key ? "skill" : null;
        if ( !key && (key = findKey(ctx.abilities, words[0])) ) type = "ability";
      }
      if ( !key ) return null;
      const reg = { skill: ctx.skills, tool: ctx.toolkits, ability: ctx.abilities }[type];
      const name = reg[key]?.label ?? key;
      return { kind: "check", type, key, dc, label: `${name}${type === "ability" ? " check" : ""}${dc != null ? ` DC ${dc}` : ""}` };
    }
    case "damage": {
      const parts = String(args ?? "").split(",").map(s => s.trim()).filter(Boolean).map(s => {
        const tokens = s.split(/\s+/);
        const last = lower(tokens.at(-1));
        const type = ctx.damageTypes?.[last] ? last : "";
        const formula = (type ? tokens.slice(0, -1) : tokens).join(" ").trim();
        return formula ? { formula, type } : null;
      }).filter(Boolean);
      if ( !parts.length ) return null;
      const label = parts.map(p => `${p.formula}${p.type ? ` ${ctx.damageTypes[p.type]?.label ?? p.type}` : ""}`).join(" + ");
      return { kind: "damage", parts, label };
    }
    case "heal": {
      const tokens = String(args ?? "").trim().split(/\s+/).filter(Boolean);
      let pool = "hp";
      const last = lower(tokens.at(-1));
      if ( ["temp", "temphp"].includes(last) ) { pool = "tempHp"; tokens.pop(); }
      else if ( ["cp", "chakra"].includes(last) ) { pool = "cp"; tokens.pop(); }
      const formula = tokens.join(" ");
      if ( !formula ) return null;
      const what = { hp: "HP", tempHp: "temporary HP", cp: "CP" }[pool];
      return { kind: "heal", formula, pool, label: `${formula} ${what}` };
    }
    default:
      return null;
  }
}

/**
 * Parse a @Condition[...] / @State[...] link body: "bruised", "bleed 2", "Compelled: Charmed".
 * @returns {{key, kind: "condition"|"state", ranks, label, text, ends}|null}
 */
export function parseConditionLink(which, body, ctx) {
  const m = String(body ?? "").trim().match(/^(.*?)(?:\s+(\d+))?$/);
  const word = m?.[1]?.replace(/^compelled:\s*/i, "");
  const isState = lower(which) === "state";
  const reg = isState ? ctx.states : ctx.conditions;
  let key = findKey(reg, word);
  let kind = isState ? "state" : "condition";
  // Accept a State in @Condition[...] (people won't always remember which is which).
  if ( !key && !isState && (key = findKey(ctx.states, word)) ) kind = "state";
  if ( !key ) return null;
  const def = (kind === "state" ? ctx.states : ctx.conditions)[key];
  const ranks = Math.max(1, Number(m?.[2]) || 1);
  const info = ctx.conditionText?.[key] ?? {};
  return { key, kind, ranks, label: `${def.label ?? key}${ranks > 1 ? ` ${ranks}` : ""}`, text: info.text ?? "", ends: info.ends ?? "" };
}
