/** Reproducible whole-book import. No gameplay engine; emits the existing Jutsu/Activity schema. */
import fs from "node:fs";
import { migrateItemData1, migrateItemData1b } from "../../module/migration/data1.mjs";
const migrateAll = d => migrateItemData1b(migrateItemData1(d) ?? d) ?? migrateItemData1(d);
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { keywords, jutsuSections, stimuli } from "../../module/config/jutsu.mjs";
import { parseActivities } from "../../module/rules/activity-parse.mjs";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SOURCE = path.join(ROOT, "tools/content/sources/jiraiya-jutsu.json");
const PACK = path.join(ROOT, "packs/_source/jutsu");
export const DISCIPLINES = { Ninjutsu: "nin", Genjutsu: "gen", Taijutsu: "tai", Bukijutsu: "buki" };
const RANKS = ["E", "D", "C", "B", "A", "S"];
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
const slug = s => String(s).normalize("NFKD").replace(/[’']/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const id = value => crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const escape = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const html = text => String(text).split(/\n+/).filter(s => s.trim() && !/^\[\/?BOX\]$/.test(s.trim())).map(s => /^#{1,6} /.test(s)
  ? `<h4>${escape(s.replace(/^#+\s*/, ""))}</h4>` : `<p>${escape(s)}</p>`).join("\n");

export function parseJutsuBook(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/), headers = [];
  let discipline = "", section = "";
  for ( let at = 0; at < lines.length; at++ ) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(lines[at]);
    if ( heading?.[1].length === 1 ) { discipline = DISCIPLINES[heading[2]] ? heading[2] : ""; section = discipline === "Taijutsu" ? "Taijutsu" : ""; }
    else if ( heading?.[1].length === 2 && discipline ) section = heading[2];
    if ( !discipline || !/^Rank\s*:/i.test(lines[at]) ) continue;
    let start = at - 1;
    while ( start > 0 && (!lines[start].trim() || /^\[\/?BOX\]$/.test(lines[start].trim()) || /^\|/.test(lines[start].trim())) ) start--;
    const name = lines[start].replace(/^#{1,6}\s*/, "").trim();
    if ( !name || /^\[/.test(name) ) throw new Error(`Unrecognized jutsu name at line ${start + 1}`);
    headers.push({ name, line: start + 1, at, start, discipline, section });
  }
  const corrections = [];
  const entries = headers.map((entry, index) => {
    let end = headers[index + 1]?.start ?? lines.length;
    for ( let at = entry.at + 1; at < end; at++ ) if ( /^#{1,3}\s/.test(lines[at]) ) { end = at; break; }
    const prelude = lines.slice(entry.start + 1, entry.at).join("\n").trim();
    const metadataBody = lines.slice(entry.at, end).join("\n").trim();
    const raw = [prelude, metadataBody].filter(Boolean).join("\n");
    let normalized = metadataBody;
    // Recorded typographical repairs only; never change the original source retained on the item.
    if ( entry.name === "Fire Release: Sunbeam" ) {
      normalized = normalized.replace(/(Keywords:[^\n]*?)\s+Keywords:\s*/, "$1 Description: ");
      corrections.push({ name: entry.name, line: entry.line, issue: "Second Keywords label is the Description label" });
    }
    const descriptionStart = normalized.search(/\bDescription\s*:/i);
    const headerText = descriptionStart < 0 ? normalized : normalized.slice(0, descriptionStart);
    normalized = headerText.replace(/^(Casting Time|Range|Keywords)\s+(?!:)/gm, (match, label) => {
      corrections.push({ name: entry.name, line: entry.line, issue: `Missing colon after ${label}` }); return `${label}: `;
    }) + (descriptionStart < 0 ? "" : normalized.slice(descriptionStart));
    const split = normalized.search(/\bDescription\s*:/i);
    if ( split < 0 ) throw new Error(`Missing Description: ${entry.name} at line ${entry.line}`);
    const header = normalized.slice(0, split), description = [prelude, normalized.slice(split).replace(/^Description\s*:\s*/i, "").trim()].filter(Boolean).join("\n");
    const labels = "Classification|Rank|Casting Time|Range|Duration|Components|Cost|Keywords?";
    const field = name => header.match(new RegExp(`\\b${name}\\s*:\\s*([\\s\\S]*?)(?=\\b(?:${labels})\\s*:|$)`, "i"))?.[1]?.trim() ?? "";
    const result = { ...entry, raw, sourceHash: hash(raw), rank: field("Rank").match(/\b([EDCBAS])[- ]?Rank/i)?.[1]?.toUpperCase(),
      time: field("Casting Time"), range: field("Range"), duration: field("Duration"), components: field("Components"), cost: field("Cost"), keywords: field("Keywords?"), description };
    for ( const key of ["rank", "time", "range", "duration", "components", "cost", "keywords", "description"] ) if ( !result[key] ) throw new Error(`Missing ${key}: ${entry.name} line ${entry.line}`);
    delete result.at; delete result.start;
    return result;
  });
  return { version: 1, book: "Jiraiya’s Jutsu Compendium", sourceHash: hash(text), corrections, entries };
}

export function parseKeywords(text) {
  const found = [], senses = [], labels = [...Object.entries(keywords).map(([key, value]) => ({ key, label: value.label })),
    ...Object.entries(stimuli).map(([key, value]) => ({ key, label: value.label, stimulus: true })), { key: "inhaled", label: "Inhale", stimulus: true }, { key: "unaware", label: "Unaware", unaware: true }]
    .sort((a, b) => b.label.length - a.label.length);
  let remaining = text;
  let unaware = false;
  for ( const item of labels ) {
    const pattern = new RegExp(`\\b${item.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    if ( pattern.test(remaining) ) {
      if ( item.stimulus ) senses.push(item.key); else if ( item.unaware ) unaware = true; else found.push(item.key);
      remaining = remaining.replace(pattern, " ");
    }
  }
  const unknown = remaining.replace(/[,;().\s]/g, "");
  if ( unknown ) throw new Error(`Unmapped keyword text: ${text} -> ${unknown}`);
  return { keywords: [...new Set(found)], stimuli: [...new Set(senses)], unaware };
}

export function splitJutsuText(text) {
  const blocks = { main: [], finisher: [], overcharge: [], upcast: [], chain: { 1: [], 2: [], 3: [] } };
  let target = blocks.main;
  for ( const line of text.replace(/([^\n])\s+(?=(?:At Higher[- ]?Ranks?|Finisher|Overcharge|Chain\s*[123])\s*[:.])/gi, "$1\n").split("\n") ) {
    const marker = /^(?:\*\*)?(At Higher[- ]?Ranks?|Finisher|Overcharge|Chain\s*([123]))\s*[:.]/i.exec(line.trim());
    if ( marker ) target = marker[2] ? blocks.chain[marker[2]] : /^At/i.test(marker[1]) ? blocks.upcast : blocks[marker[1].toLowerCase()];
    target.push(line);
  }
  return Object.fromEntries(Object.entries(blocks).map(([key, value]) => [key, key === "chain" ? Object.fromEntries(Object.entries(value).map(([rank, body]) => [rank, body.join("\n")])) : value.join("\n")]));
}

export function expressionCatalog(text) {
  return [...text.matchAll(/\[(?:Unarmed|Weapons?)(?:\s+damage)?(?:\s+die)?\]|\b\d*d\d+(?:(?:\s*[+−-]\s*\d+)(?!\s*d))?|\b\d+(?=\s+(?:bludgeoning|piercing|slashing|acid|cold|earth|fire|lightning|poison|wind|chakra|force|necrotic|psychic)\s+damage)/gi)].map(match => {
    const start = Math.max(text.lastIndexOf("\n", match.index), text.lastIndexOf(". ", match.index)) + 1;
    let end = text.indexOf("\n", match.index); if ( end < 0 ) end = text.length;
    const context = text.slice(start, end).trim();
    const prefix = text.slice(0, match.index);
    const lastRider = [...prefix.matchAll(/^(At Higher[- ]?Ranks?|Finisher|Overcharge|Chain\s*[123])\s*[:.]/gim)].at(-1)?.[1] ?? "Base";
    return { expression: match[0], offset: match.index, context, section: lastRider };
  });
}

function rangeData(text) {
  const area = { shape: "", size: null, width: null, height: null };
  const shape = /(\d+)[- ]?(?:foot|feet|ft)[- ]?(cone|cube|sphere|radius|line|cylinder)/i.exec(text);
  if ( shape ) { area.shape = shape[2].toLowerCase() === "radius" ? "sphere" : shape[2].toLowerCase(); area.size = Number(shape[1]); }
  const width = /(\d+)[- ]?(?:foot|feet|ft)[- ]?wide/i.exec(text); if ( width ) area.width = Number(width[1]);
  const distance = /^(\d+)\s*(?:feet|foot|ft|mile)/i.exec(text);
  return { range: { type: /^self/i.test(text) ? "self" : /^touch/i.test(text) ? "touch" : distance ? /mile/i.test(text) ? "miles" : "feet" : "special",
    value: distance ? Number(distance[1]) : null, long: null, text }, area };
}
function activation(text) {
  const type = /reaction/i.test(text) ? "reaction" : /bonus/i.test(text) ? "bonus" : /full.*turn/i.test(text) ? "fullTurn" : /action/i.test(text) ? "action" : /minute|hour/i.test(text) ? "long" : "special";
  return { type, value: Number(text.match(/\b(\d+)/)?.[1] ?? 1), unit: text.match(/\b(minute|hour)s?/i)?.[1]?.toLowerCase() ?? "", trigger: { event: "", text: type === "reaction" ? text : "" } };
}
function durationData(text) {
  const number = /(\d+)\s*(round|turn|minute|hour|day)/i.exec(text);
  return { value: number ? Number(number[1]) : null, unit: number?.[2]?.toLowerCase() ?? (/instant/i.test(text) ? "instant" : "special"), concentration: /concentration/i.test(text), text };
}
function costData(text) {
  const number = /\b(\d+)\s*(?:Chakras?|CP)\b/i.exec(text);
  const ordinary = number && /^\s*\d+\s*(?:Chakras?|CP)\s*[.,]?$/i.test(text);
  return { mode: /^(?:none|no cost)\.?$/i.test(text) ? "none" : ordinary ? "chakra" : "special", value: Number(number?.[1] ?? 0), text };
}
function componentsData(text) {
  const w = /\bW\b\s*(?:\(([^)]+)\))?/i.exec(text), tool = /\bNT\b\s*(?:\(([^)]+)\))?/i.exec(text);
  return { hs: /\bHS\b/i.test(text), cm: /\bCM\b/i.test(text), cs: /\bCS\b/i.test(text), m: /\bM\b/i.test(text),
    weapon: { required: !!w, any: /any/i.test(w?.[1] ?? ""), groups: [], range: /ranged|thrown/i.test(w?.[1] ?? "") ? "ranged" : /melee/i.test(w?.[1] ?? "") ? "melee" : "", count: 1, dualWield: /dual|two weapons/i.test(text), text: w?.[1] ?? "" },
    tool: { required: !!tool, kit: "", charges: 0, text: tool?.[1] ?? "" } };
}

/** Preserve context; never turn all conditional/outcome expressions into cumulative base damage. */
export function jutsuActivities(entry, blocks) {
  const discipline = DISCIPLINES[entry.discipline], manual = [], base = blocks.main;
  const parseText = text => text.replace(/\bmake\s+(?:one|two|three|four|five|six|\d+)\s+((?:(?:melee|ranged)\s+)?(?:ninjutsu|taijutsu|genjutsu|bukijutsu|weapon|unarmed))\s+attacks?/gi, "make a $1 attack");
  const parsed = parseActivities(html(parseText(base)), { discipline });
  const expressions = expressionCatalog(entry.description);
  const alternatives = /\b(?:choose|either|instead|critical failure|critical success|on a (?:successful|failed) save|if |when |whenever|at the (?:start|end|beginning)|begins? (?:its|their)|enters? (?:the|this)|each turn|once per casting|for every|per creature)\b/i.test(base)
    && parsed.some(a => (a.damage?.parts?.length ?? 0) > 1);
  // The existing parser's cumulative damage scan is unsafe for alternatives/recurring paragraphs.
  const typed = parsed.filter(a => a.damage?.parts?.length);
  if ( alternatives && typed.length ) {
    for ( const a of parsed ) if ( a.damage ) a.damage.parts = [];
    manual.push("Conditional/alternative damage: use individually labeled source rolls; do not add them together automatically.");
  }
  const weapon = /\[weapons?\s+damage\]/i.exec(base), unarmed = /\[unarmed\s+damage\]/i.exec(base);
  if ( (weapon || unarmed) && parsed.some(a => a.type === "attack") && !alternatives ) {
    const match = weapon ?? unarmed;
    const after = base.slice(match.index + match[0].length);
    const extra = /^\s*\+\s*(\d+d\d+(?:\s*[+-]\s*\d+)?)/i.exec(after)?.[1]?.replace(/\s+/g, "") ?? "";
    const attack = parsed.find(a => a.type === "attack");
    attack.strike = { kind: weapon ? "weapon" : "unarmed", extraDice: extra, dieSteps: 0, pierce: 0, maximize: false, attacks: "1" };
    attack.damage = { parts: [] };
  }
  if ( /\[weapons?\s+damage\s+die\]/i.test(base) ) manual.push("Weapon-die-only expression is retained; no full weapon/modifier substitution is assumed.");
  for ( const [label, text] of [["Finisher", blocks.finisher], ...Object.entries(blocks.chain).map(([rank, body]) => [`Chain ${rank}`, body]), ["Overcharge", blocks.overcharge]] ) {
    if ( !text ) continue;
    const riders = parseActivities(html(parseText(text)), { discipline });
    for ( const a of riders ) {
      a.id = `${slug(label)}-${a.id}`; a.label = `${label}: ${a.label}`;
      if ( (a.damage?.parts?.length ?? 0) > 1 ) a.damage.parts = [];
      parsed.push(a);
    }
  }
  // Add source-exact auxiliary dice where no safe existing typed activity represents them.
  const represented = new Set(parsed.flatMap(a => [...a.damage?.parts?.map(p => p.formula.replace(/\s/g, "")) ?? [], a.heal?.formula, a.strike?.extraDice].filter(Boolean)));
  for ( const formula of [...represented] ) for ( const match of formula.matchAll(/\b\d+d\d+(?:[+-]\d+)?/g) ) represented.add(match[0]);
  for ( const [index, expression] of expressions.entries() ) {
    if ( /^\[/.test(expression.expression) || /^At Higher/i.test(expression.section) ) continue;
    const formula = expression.expression.replace(/\s/g, "").replaceAll("−", "-");
    if ( represented.has(formula) ) continue;
    represented.add(formula);
    parsed.push({ id: `sourceRoll${index + 1}`, type: "roll", label: `${expression.section === "Base" ? "" : expression.section + ": "}${expression.expression}`, roll: { formula, note: expression.context } });
  }
  if ( !parsed.length ) parsed.push({ id: "sourceUtility", type: "utility", label: "Jutsu", text: "Resolve the jutsu’s source instructions." });
  if ( blocks.finisher || blocks.overcharge || blocks.upcast || Object.values(blocks.chain).some(Boolean) ) manual.push("Conditional rider instructions are preserved; choose the applicable source activity manually.");
  return { activities: parsed, expressions, manual };
}

function scaledActivities(activities, blocks, baseRank) {
  const first = blocks.upcast.split(/\.\s|\n/)[0];
  const growth = /(?:the\s+)?damage(?:\s+(?:dealt|done))?\s+by\s+\+?(\d+d\d+(?:\s*\+\s*\d+)?|\d+)\b/i.exec(first)?.[1];
  if ( !growth || !/for (?:each|every) rank/i.test(first) || /\bor\s+\d+d|\band\s+\d+d/i.test(first) ) return {};
  const baseDamage = activities.filter(a => !/^(?:finisher|chain|overcharge)-/.test(a.id)).flatMap(a => [
    ...a.damage?.parts?.map(part => ({ kind: "part", owner: a.id, part })) ?? [], ...(a.strike ? [{ kind: "strike", owner: a.id }] : [])]);
  if ( baseDamage.length !== 1 ) return {};
  if ( activities.some(a => /^(?:finisher|chain|overcharge)-/.test(a.id) && ((a.damage?.parts?.length ?? 0) > 0 || a.strike)) ) return {};
  const map = {};
  for ( let rank = RANKS.indexOf(baseRank) + 1; rank < RANKS.length; rank++ ) {
    const delta = rank - RANKS.indexOf(baseRank), m = /^(\d+)d(\d+)(?:\s*\+\s*(\d+))?$/.exec(growth.trim());
    const increment = m ? `${Number(m[1]) * delta}d${m[2]}${m[3] ? `+${Number(m[3]) * delta}` : ""}` : String(Number(growth) * delta);
    const scaled = structuredClone(activities), target = scaled.find(a => a.id === baseDamage[0].owner);
    if ( baseDamage[0].kind === "part" ) target.damage.parts[0].formula = `(${target.damage.parts[0].formula}) + (${increment})`;
    else target.strike.extraDice = target.strike.extraDice ? `(${target.strike.extraDice}) + (${increment})` : increment;
    map[RANKS[rank]] = scaled;
  }
  return map;
}

export function buildJutsuDocument(entry, previous = null) {
  const section = Object.entries(jutsuSections).find(([, v]) => norm(v.label) === norm(entry.section) && v.discipline === DISCIPLINES[entry.discipline])?.[0]
    ?? (entry.section === "Medical Release" ? "medical" : null);
  if ( !section ) throw new Error(`Unmapped section ${entry.discipline}/${entry.section}`);
  const tags = parseKeywords(entry.keywords), blocks = splitJutsuText(entry.description), automation = jutsuActivities(entry, blocks);
  // Source-reviewed existing authoring retained without reintroducing the old starter-only builder.
  if ( entry.name === "Beast Fist: Forceful Bull" ) automation.activities = [
    { id: "forcefulBull", type: "effect", label: "Forceful Bull", effect: { name: "Forceful Bull", target: "self", changes: [{ key: "system.abilities.str.value", value: "18", mode: 4 }], seconds: 60, tempHp: "8" } },
    { id: "refreshBull", type: "heal", label: "Refresh temporary HP", activation: "bonus", heal: { formula: "8", pool: "tempHp" } }];
  if ( entry.name === "Fire Release: Fox Fire" ) automation.activities.push({ id: "foxGlow", type: "effect", label: "Glowing", effect: { name: "Glowing (Fox Fire)", target: "targets", changes: [], expires: "nextTurnEnd", seconds: 0 } });
  if ( entry.name === "Glamor Tongue" ) automation.activities = [{ id: "glamorTongue", type: "effect", label: "Glamor Tongue", effect: { name: "Glamor Tongue", target: "targets", changes: [], seconds: 600 } }];
  const costPerRank = blocks.upcast.match(/(?:cost|chakra)[^.\n]{0,100}?\bby\s+\+?(\d+)/i)?.[1];
  const key = previous?._id ?? id(`jutsu:${entry.discipline}:${entry.section}:${entry.name}`);
  const base = { ...previous?.system, identifier: previous?.system?.identifier || slug(entry.name), description: html(entry.description),
    source: { book: "Jiraiya’s Jutsu Compendium", page: `source line ${entry.line}`, version: "4.0 Final Update", custom: "" },
    rank: entry.rank, discipline: DISCIPLINES[entry.discipline], section, ...tags,
    activation: activation(entry.time), target: rangeData(entry.range), duration: durationData(entry.duration), cost: costData(entry.cost), components: componentsData(entry.components),
    uses: previous?.system?.uses ?? { max: "", spent: 0, per: "", staminaEligible: false },
    activities: automation.activities, featureType: "active", ability: previous?.system?.ability ?? "",
    upcast: { preset: costPerRank ? "custom" : "none", costPerRank: costPerRank ? Number(costPerRank) : null, perRank: [], thresholds: { B: "", A: "", S: "" }, text: html(blocks.upcast) },
    chainEffects: Object.fromEntries(Object.entries(blocks.chain).map(([k, v]) => [k, html(v)])),
    finisher: { only: /can only be cast as (?:an? )?(?:Taijutsu )?Finisher/i.test(blocks.main), text: html(blocks.finisher) }, overcharge: { text: html(blocks.overcharge) }, riders: [],
    hijutsu: previous?.system?.hijutsu ?? { clan: "", branch: "" }, learned: previous?.system?.learned ?? { mode: "known", grantedBy: "" } };
  return { _id: key, _key: `!items!${key}`, name: entry.name, type: "jutsu", img: previous?.img ?? "icons/svg/book.svg", system: base,
    effects: previous?.effects ?? [], ownership: previous?.ownership ?? { default: 0 }, flags: { ...previous?.flags, n5e: { ...previous?.flags?.n5e,
      jutsuBookImport: { version: 1, sourceLine: entry.line, sourceHash: entry.sourceHash, discipline: entry.discipline, group: entry.section,
        header: { rank: entry.rank, time: entry.time, range: entry.range, duration: entry.duration, cost: entry.cost, components: entry.components, keywords: entry.keywords },
        sourceText: entry.raw, expressions: automation.expressions, manual: automation.manual,
        activitiesByRank: scaledActivities(automation.activities, blocks, entry.rank),
        manualCost: base.cost.mode === "special" && (!base.cost.value || !/^Special\b/i.test(entry.cost)) } } } };
}

const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(directory, d.name)) : d.name.endsWith(".json") ? [path.join(directory, d.name)] : []);
export function buildJutsuPack(book, { write = true } = {}) {
  const old = walk(PACK).map(file => ({ file, data: JSON.parse(fs.readFileSync(file, "utf8")) }));
  const oldItems = old.filter(r => r.data.type === "jutsu"), records = [], used = new Set(), folders = new Map();
  const oldFolders = new Map(old.filter(r => r.data._key.startsWith("!folders!")).map(r => [r.data._id, r.data]));
  const folderPath = d => d ? [...folderPath(oldFolders.get(d.folder)), d.name] : [];
  const pathIds = new Map([...oldFolders.values()].map(d => [folderPath(d).join("/"), d._id]));
  const repeatedNames = new Set(book.entries.filter((entry, index) => book.entries.findIndex(e => e.name === entry.name) !== index).map(e => e.name));
  function folder(chain) {
    let parent = null;
    for ( let depth = 1; depth <= chain.length; depth++ ) {
      const current = chain.slice(0, depth), name = current.at(-1), tag = current.join("/");
      const key = pathIds.get(tag) ?? id(`jutsu-folder:${tag}`);
      if ( !folders.has(tag) ) folders.set(tag, { file: path.join(PACK, "organized", ...current.map(slug), "_folder.json"),
        data: { _id: key, _key: `!folders!${key}`, name, type: "Item", folder: parent, sorting: depth === 3 ? "a" : "m", sort: depth === 3 ? (RANKS.indexOf(name[0]) + 1) * 1000 : 0, color: null } });
      parent = key;
    }
    return parent;
  }
  for ( const entry of book.entries ) {
    const section = entry.section === "Taijutsu" ? "General" : entry.section;
    const previous = oldItems.find(r => r.data.name === entry.name && r.data.system.discipline === DISCIPLINES[entry.discipline]
      && (norm(jutsuSections[r.data.system.section]?.label) === norm(entry.section) || entry.section === "Medical Release" && r.data.system.section === "medical"))?.data;
    const doc = buildJutsuDocument(entry, previous);
    if ( repeatedNames.has(entry.name) ) doc.system.identifier = `${slug(entry.section)}-${slug(entry.name)}`;
    if ( used.has(doc._id) ) throw new Error(`Duplicate jutsu identity: ${entry.name}`);
    used.add(doc._id);
    const chain = [entry.discipline, section, `${entry.rank}-Rank`]; doc.folder = folder(chain);
    records.push({ data: doc, file: path.join(PACK, "organized", ...chain.map(slug), `${slug(doc.name)}-${doc._id}.json`) });
  }
  // Preserve starter/homebrew entries outside this book; never delete unrelated content.
  for ( const row of oldItems.filter(r => !used.has(r.data._id)) ) {
    if ( row.data.flags?.n5e?.jutsuBookImport ) throw new Error(`Previously imported entry missing from book: ${row.data.name}`);
    const doc = structuredClone(row.data), discipline = Object.entries(DISCIPLINES).find(([, k]) => k === doc.system.discipline)?.[0] ?? "Other";
    const group = doc.system.discipline === "tai" ? "General" : jutsuSections[doc.system.section]?.label ?? "Other";
    const chain = [discipline, group, `${doc.system.rank}-Rank`]; doc.folder = folder(chain);
    records.push({ data: doc, file: path.join(PACK, "organized", ...chain.map(slug), `${slug(doc.name)}-${doc._id}.json`) });
  }
  const all = [...folders.values(), ...records];
  const ids = new Set(); for ( const record of all ) { if ( ids.has(record.data._id) ) throw new Error("Duplicate output ID"); ids.add(record.data._id); }
  if ( write ) {
    for ( const record of all ) { fs.mkdirSync(path.dirname(record.file), { recursive: true }); fs.writeFileSync(record.file, JSON.stringify(migrateAll(record.data) ?? record.data, null, 2) + "\n"); }
    const destinations = new Set(all.map(r => r.file));
    for ( const row of old ) if ( !destinations.has(row.file) && path.resolve(row.file).startsWith(PACK + path.sep) ) fs.unlinkSync(row.file);
  }
  return { documents: records.map(r => r.data), folders: folders.size, corrections: book.corrections, sourceHash: book.sourceHash };
}

if ( process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) ) {
  const sourceAt = process.argv.indexOf("--source");
  const book = sourceAt >= 0 ? parseJutsuBook(fs.readFileSync(process.argv[sourceAt + 1], "utf8")) : JSON.parse(fs.readFileSync(SOURCE, "utf8"));
  if ( book.entries.length !== 968 ) throw new Error(`Book coverage changed (${book.entries.length}, expected 968); inspect the source before importing.`);
  if ( sourceAt >= 0 ) { fs.mkdirSync(path.dirname(SOURCE), { recursive: true }); fs.writeFileSync(SOURCE, JSON.stringify(book, null, 2) + "\n"); }
  const report = buildJutsuPack(book);
  const summary = { sourceHash: report.sourceHash, imported: book.entries.length, total: report.documents.length, folders: report.folders,
    disciplines: Object.fromEntries(Object.entries(DISCIPLINES).map(([name, key]) => [name, report.documents.filter(d => d.system.discipline === key).length])),
    corrections: report.corrections, manual: report.documents.filter(d => d.flags?.n5e?.jutsuBookImport?.manual.length).map(d => ({ id: d._id, name: d.name, notes: d.flags.n5e.jutsuBookImport.manual })),
    expressions: report.documents.reduce((sum, d) => sum + (d.flags?.n5e?.jutsuBookImport?.expressions.length ?? 0), 0),
    automaticRankScaling: report.documents.filter(d => Object.keys(d.flags?.n5e?.jutsuBookImport?.activitiesByRank ?? {}).length).length,
    manualCosts: report.documents.filter(d => d.flags?.n5e?.jutsuBookImport?.manualCost).map(d => ({ id: d._id, name: d.name, cost: d.system.cost.text })) };
  fs.mkdirSync(path.join(ROOT, "docs/generated"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "docs/generated/jutsu-import.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify({ imported: summary.imported, total: summary.total, folders: summary.folders, disciplines: summary.disciplines, expressions: summary.expressions, corrections: summary.corrections.length, manual: summary.manual.length }));
}
