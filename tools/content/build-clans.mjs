/** Batched, deterministic clan packages from the user's Tsunade source transcription. */
import fs from "node:fs";
import { migrateItemData1 } from "../../module/migration/data1.mjs";
import path from "node:path";
import crypto from "node:crypto";
import { skills, abilities } from "../../module/config/core.mjs";
import { keywords, affinities } from "../../module/config/jutsu.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const kb = process.argv[2] ?? process.env.N5E_KB;
const batch = Number(process.argv[3] ?? 1), batchSize = 8;
if ( !kb ) throw new Error("Pass the N5e-Rules-KB directory, then a batch number (1–6).");
const source = fs.readFileSync(path.join(kb, "_source/clans/tsunade-full.md"), "utf8").split(/\r?\n/);
const appendixAt = source.findIndex((s, i) => i > source.indexOf("# Clan Feats") && /^Latent [\p{L} ]+$/u.test(s));
const pack = path.join(root, "packs/_source/clans");
const out = path.join(root, "content/clans");
fs.mkdirSync(out, { recursive: true });
const norm = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const slug = s => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const id = s => crypto.createHash("sha256").update(`n5e.clans.${s}`).digest("hex").slice(0, 16);
const esc = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const html = lines => lines.filter(s => s.trim() && !/^\[\/?BOX\]$/.test(s.trim())).map(s => {
  const h = s.match(/^(#{3,6}) (.*)/);
  return h ? `<h${h[1].length}>${esc(h[2])}</h${h[1].length}>` : `<p>${esc(s).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
}).join("\n");
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
const records = new Map(walk(pack).filter(f => f.endsWith(".json")).map(file => { const data = JSON.parse(fs.readFileSync(file, "utf8")); return [data._id, { data, file }]; }));
// Remove previously imported clan feats; rebuilding must not restore retired content.
for ( const [key, record] of records ) if ( record.data.flags?.n5e?.clanPackage && record.data.system?.category === "clan" ) {
  records.delete(key);
  if ( record.file.startsWith(pack + path.sep) ) fs.unlinkSync(record.file);
}
function folder(chain) {
  let parent = null;
  chain.forEach((name, i) => {
    const key = id(`folder:${chain.slice(0, i + 1).join("/")}`);
    records.set(key, { data: { _id: key, _key: `!folders!${key}`, type: "Item", name, folder: parent, sorting: "a", sort: 0, color: null }, file: path.join(pack, "organized", ...chain.slice(0, i + 1).map(slug), "_folder.json") });
    parent = key;
  });
  return parent;
}
const block = (at, depth) => {
  let end = at + 1;
  while ( end < source.length && !new RegExp(`^#{1,${depth}} `).test(source[end]) ) end++;
  return { at, end, lines: source.slice(at + 1, end) };
};
const roster = [];
let nation = "Unaffiliated";
for ( let at = 0; at < source.length; at++ ) {
  if ( /^# (?:Land of|Minor Land)/.test(source[at]) ) nation = source[at].slice(2).replace(/ Clans?$/, "");
  if ( /^## (?:[\p{L} -]+ [Cc]lan|Non-Clan)$/u.test(source[at]) && at > 520 && at < source.indexOf("# Clan Feats") ) {
    roster.push({ name: source[at].slice(3).replace(/ [Cc]lan$/, ""), nation, line: at + 1, at });
  }
}
if ( roster.length !== 44 ) throw new Error(`Source roster changed: expected 44, found ${roster.length}. Review the book before continuing.`);
roster.forEach((c, i) => { c.end = roster[i + 1]?.at ?? source.indexOf("# Clan Feats"); c.batch = Math.floor(i / batchSize) + 1; });
const selected = roster.filter(c => c.batch === batch);
if ( !selected.length ) throw new Error(`No clans in batch ${batch}`);
const issues = [], summary = [];
const abilityKeys = Object.fromEntries(Object.entries(abilities).flatMap(([k, v]) => [[norm(v.label), k], [k, k]]));
const skillKeys = Object.fromEntries(Object.entries(skills).map(([k, v]) => [norm(v.label), k]));
const sourceRef = line => ({ book: "Tsunade's Studies Compendium", page: "", version: "4.0", custom: `Source Markdown line ${line}; contextual rules require adjudication.` });
const uri = d => `Compendium.n5e.clans.Item.${d._id}`;
function save(data, clan, section, role) {
  const existing = records.get(data._id);
  const file = existing?.file ?? path.join(pack, "organized", slug(clan.nation), slug(clan.name), slug(section), `${slug(role)}-${data._id}.json`);
  records.set(data._id, { data, file });
  return data;
}
function item(clan, type, name, section, lines, line, system = {}, role = name) {
  const key = id(`${slug(clan.name)}:${type}:${role}`);
  const previous = records.get(key)?.data;
  return save({ _id: key, _key: `!items!${key}`, type, name, img: previous?.img ?? "icons/sundries/scrolls/scroll-bound-brown.webp",
    folder: folder([clan.nation, clan.name, section.replaceAll("/", " · ")]), effects: previous?.effects ?? [], flags: { ...previous?.flags, n5e: { ...previous?.flags?.n5e,
      clanPackage: slug(clan.name), sourceLine: line } }, ownership: { default: 0 },
    system: { ...previous?.system, identifier: `${slug(clan.name)}-${slug(role)}`, description: html(lines), source: sourceRef(line), ...system } }, clan, section, role);
}
function feat(clan, name, lines, line, level, section = "Features", role = name) {
  const intro = lines.filter(s => !s.startsWith("|")).slice(0, 6).join(" ");
  const act = /as a bonus action/i.test(intro) ? "bonus" : /(?:as a|your) reaction/i.test(intro) ? "reaction" : /as an action/i.test(intro) ? "action" : "none";
  return item(clan, "feat", name, section, lines, line, { category: section === "Clan Feats" ? "clan" : section === "Options" ? "clanOption" : "clanFeature",
    requirement: { level, class: "", clan: slug(clan.name) }, featureType: act === "none" ? "passive" : "active",
    activation: { type: act, value: 1, unit: "", trigger: { event: "", text: "" } }, tags: section === "Options" ? ["clan-option"] : [],
    prerequisites: lines.slice(0, 5).filter(s => /Prerequis|Requirement/i.test(s)), advancement: [] }, role);
}
function grant(clanDoc, level, title, docs, type = "feature", count = 1, branch = "") {
  clanDoc.system.advancement.push({ id: id(`adv:${clanDoc.system.identifier}:${level}:${title}`), level, type, title, uuids: docs.map(d => typeof d === "string" ? d : uri(d)),
    count, key: type === "itemChoice" ? "clan-option" : "", branch, value: "", chosen: [] });
}
function parseSkills(clan, text) {
  const matches = Object.entries(skillKeys).filter(([name]) => norm(text).includes(name)).map(([, key]) => key);
  const count = /(?:any|choose|pick|select)\s+(?:any\s+)?(two|three|one|\d)/i.exec(text)?.[1];
  const number = { one: 1, two: 2, three: 3 }[count?.toLowerCase()] ?? Number(count || 0);
  if ( /Crafting/i.test(text) ) issues.push({ clan: clan.name, type: "retired-skill", text, resolution: "Crafting is retired in the engine; retain source text and offer a replacement proficiency." });
  if ( number ) {
    const before = text.split(/(?:choose|pick|select)/i)[0];
    const fixed = Object.entries(skillKeys).filter(([name]) => norm(before).includes(name)).map(([, key]) => key);
    return { fixed, choose: number, from: /any/i.test(text) ? Object.keys(skills) : matches.filter(k => !fixed.includes(k)), chosen: [] };
  }
  return { fixed: matches, choose: /Crafting/i.test(text) ? 1 : 0, from: /Crafting/i.test(text) ? Object.keys(skills) : [], chosen: [] };
}
function jutsu(clan, name, b, line) {
  const text = b.join("\n").replace(/\bKeyword(?:\(s\))?:/gi, "Keywords:");
  const labels = "Classification|Rank|Casting Time|Range|Duration|Components|Cost|Keywords|Description";
  const field = label => label === "Description" ? text.match(/Description:\s*([\s\S]*)/i)?.[1]?.trim() ?? ""
    : text.match(new RegExp(`${label}:\\s*([\\s\\S]*?)(?=(?:${labels}):|$)`, "i"))?.[1]?.trim() ?? "";
  const rank = field("Rank").match(/\b([EDCBAS])[- ]?Rank/i)?.[1]?.toUpperCase();
  if ( !rank ) { issues.push({ clan: clan.name, type: "jutsu-header", name, line }); return null; }
  const time = field("Casting Time"), range = field("Range"), duration = field("Duration"), cost = field("Cost"), rawKeywords = field("Keywords"), components = field("Components");
  const missing = ["Casting Time", "Range", "Duration", "Components", "Cost", "Keywords"].filter(label => !field(label));
  if ( missing.length ) issues.push({ clan: clan.name, type: "jutsu-fields", name, missing, line });
  const disc = /Bukijutsu/i.test(rawKeywords) ? "buki" : /Taijutsu/i.test(rawKeywords) ? "tai" : /Genjutsu/i.test(rawKeywords) ? "gen" : "nin";
  const known = Object.entries(keywords).filter(([, v]) => rawKeywords.toLowerCase().includes(v.label.toLowerCase())).map(([k]) => k);
  for ( const raw of rawKeywords.split(",").map(s => s.trim()).filter(Boolean) ) {
    if ( !Object.values(keywords).some(v => norm(v.label) === norm(raw)) ) known.push(slug(raw));
  }
  const branch = /Main Branch/i.test(rawKeywords) ? "main" : /Side Branch/i.test(rawKeywords) ? "side" : "";
  const activation = /bonus action/i.test(time) ? "bonus" : /reaction/i.test(time) ? "reaction" : /^1 action/i.test(time) ? "action" : /^special/i.test(time) ? "special" : "special";
  const dist = range.match(/(\d+)\s*(?:feet|foot)/i)?.[1];
  const shape = range.match(/(\d+)[- ]?(?:foot|feet)[- ]?(cone|cube|sphere|radius|line|cylinder)/i);
  const amount = cost.match(/^(\d+)\s*(?:Chakra|CP)\b/i)?.[1];
  const durationNumber = duration.match(/(?:up to\s+)?(\d+)\s*(round|minute|hour|day)/i);
  const description = field("Description");
  if ( !description ) issues.push({ clan: clan.name, type: "jutsu-description", name, line });
  const d = item(clan, "jutsu", name, `Hijutsu/${rank}-Rank`, description ? description.split("\n") : b, line, {
    rank, discipline: disc, section: "clan", keywords: [...new Set(["hijutsu", ...known])],
    activation: { type: activation, value: 1, unit: "", trigger: { event: "", text: /reaction/i.test(time) ? time : "" } },
    target: { range: { type: /^self/i.test(range) ? "self" : /^touch/i.test(range) ? "touch" : dist ? "feet" : "special", value: dist ? Number(dist) : null, long: null, text: range },
      area: { shape: shape?.[2] === "radius" ? "sphere" : shape?.[2] ?? "", size: shape ? Number(shape[1]) : null, width: null, height: null } },
    duration: { value: durationNumber ? Number(durationNumber[1]) : null, unit: durationNumber ? `${durationNumber[2].toLowerCase()}s` : /^instant/i.test(duration) ? "instant" : "special", concentration: /concentration/i.test(duration), text: duration },
    cost: { mode: amount ? "chakra" : /none|no cost/i.test(cost) ? "none" : "special", value: Number(amount ?? 0), text: cost },
    components: { hs: /\bHS\b/i.test(components), cm: /\bCM\b/i.test(components), cs: /\bCS\b/i.test(components), m: /\bM\b/i.test(components),
      weapon: { required: /\bW\b/.test(components), groups: [], any: /\bW\b/.test(components), range: "", count: 1, dualWield: false, text: components },
      tool: { required: /\bNT\b/.test(components), kit: "", charges: /\bNT\b/.test(components) ? 1 : 0, text: components } },
    hijutsu: { clan: slug(clan.name), branch }, upcast: { preset: /At Higher Ranks/i.test(description) ? "standard3" : "none",
      costPerRank: Number(description.match(/At Higher Ranks[\s\S]*?increase (?:the )?cost[^.\n]*?by (\d+)/i)?.[1]) || null,
      text: html(description.match(/At Higher Ranks[\s\S]*/i)?.[0].split("\n") ?? []) },
    learned: { mode: "known", grantedBy: "" }, activities: [], featureType: "active" }, name);
  d.flags.n5e.sourceHeader = { time, range, duration, cost, keywords: rawKeywords, components };
  return d;
}
for ( const clan of selected ) {
  const main = block(clan.at, 2);
  const traitsAt = source.findIndex((s, i) => i > clan.at && i < main.end && /^### .*Traits/.test(s));
  const traits = traitsAt >= 0 ? block(traitsAt, 3).lines : main.lines;
  const skillText = traits.join("\n").match(/Skill Proficienc(?:y|ies):\s*([^\n]*?)(?=\s*Passive Affinity:|\n|$)/i)?.[1]?.trim() ?? "";
  const recommended = traits.find(s => /Recommended Ability Score/i.test(s)) ?? "";
  const flex = traits.find(s => /Hijutsu Flexibility:/i.test(s)) ?? "";
  const abilityList = text => [...new Set(Object.entries(abilityKeys).filter(([name]) => new RegExp(`\\b${name}\\b`, "i").test(norm(text).replace(/(strength|dexterity|constitution|intelligence|wisdom|charisma)/g, " $1 "))).map(([, key]) => key))];
  const flexKeys = Object.entries(abilities).filter(([k, v]) => new RegExp(`\\b(?:${v.label}|${k})\\b`, "i").test(flex)).map(([k]) => k);
  const recommendation = Object.entries(abilities).filter(([k, v]) => new RegExp(`\\b(?:${v.label}|${k})\\b`, "i").test(recommended)).map(([k]) => k);
  void abilityList;
  const previous = [...records.values()].find(r => r.data.type === "clan" && norm(r.data.name) === norm(clan.name));
  const key = previous?.data._id ?? id(`clan:${slug(clan.name)}`);
  const doc = { _id: key, _key: `!items!${key}`, type: "clan", name: clan.name, img: previous?.data.img ?? "icons/sundries/scrolls/scroll-bound-brown.webp", folder: folder([clan.nation, clan.name]),
    effects: previous?.data.effects ?? [], ownership: { default: 0 }, flags: { ...previous?.data.flags, n5e: { ...previous?.data.flags?.n5e, clanPackage: slug(clan.name), sourceLine: clan.line, batch, sourceTraits: traits.join("\n") } },
    system: { ...previous?.data.system, identifier: slug(clan.name), description: html(main.lines), source: sourceRef(clan.line),
      asi: { mode: "choose", plus2: "", plus1: "", recommended: recommendation }, speed: Number(traits.find(s => /^Speed:/i.test(s))?.match(/\d+/)?.[0] ?? 30),
      skills: parseSkills(clan, skillText), affinities: { fixed: [], choose: 0, from: [], chosen: [] }, languages: traits.filter(s => /^Extra Language:/i.test(s)).map(s => s.split(":").slice(1).join(":").trim()),
      hijutsuAbilities: flexKeys, hijutsuChoice: "", branches: slug(clan.name) === "hyuga" ? ["main", "side"] : [], branch: "", keywords: [],
      resourcePools: previous?.data.system.resourcePools ?? [], conditions: (previous?.data.system.conditions ?? []).filter(c => !c.key.startsWith(`${slug(clan.name)}-`)), advancement: [], jutsuList: `Compendium.n5e.clans` } };
  if ( !skillText ) issues.push({ clan: clan.name, type: "skill-source", line: clan.line });
  const affinityLines = traits.filter(s => /Affinity:|Nature Release:|Release Affinit/i.test(s));
  for ( const [affinity, label] of Object.entries(affinities) ) if ( affinityLines.some(s => new RegExp(`(?:have|gain|possess|begin with) (?:the )?${label} Release affinity`, "i").test(s)) ) doc.system.affinities.fixed.push(affinity);
  if ( affinityLines.some(s => /choose|select|any one/i.test(s)) ) doc.system.affinities = { fixed: [], choose: 1, from: Object.keys(affinities), chosen: [] };
  if ( clan.name === "Namikaze" ) doc.system.affinities = { fixed: [], choose: 1, from: ["wind", "lightning"], chosen: [] };
  const featureIndex = [], optionIndex = [], jutsuIndex = [], mutationIndex = [], featIndex = [], stanceIds = new Set();
  const featuresAt = source.findIndex((s, i) => i > clan.at && i < main.end && /^### .*Features/.test(s));
  const featureRegion = featuresAt >= 0 ? block(featuresAt, 3) : { at: clan.at, end: main.end };
  let currentLevel = 1;
  for ( let at = featureRegion.at + 1; at < featureRegion.end; at++ ) {
    if ( !source[at].startsWith("#### ") ) continue;
    const name = source[at].slice(5).trim(), b = block(at, 4);
    const levelMatch = b.lines.slice(0, 4).join(" ").match(/(\d+)(?:st|nd|rd|th)[ -]+[Ll]evel(?: Clan Feature)?/);
    if ( !levelMatch ) {
      if ( /Armor Class|Hit Points/.test(b.lines.slice(0, 10).join(" ")) ) {
        feat(clan, name, b.lines, at + 1, currentLevel, "Companion Rules");
      } else issues.push({ clan: clan.name, type: "feature-level", name, line: at + 1 });
      continue;
    }
    currentLevel = Number(levelMatch[1]);
    const branch = /\[Main(?: Branch)?\]/i.test(name + b.lines.slice(0, 3).join(" ")) ? "main" : /\[Side(?: Branch)?\]/i.test(name + b.lines.slice(0, 3).join(" ")) ? "side" : "";
    const f = feat(clan, name, b.lines, at + 1, currentLevel);
    grant(doc, currentLevel, name, [f], "feature", 1, branch);
    featureIndex.push({ name, level: currentLevel, id: f._id, branch, line: at + 1 });
    // Standalone option labels are retained as individual reference records; the full menu also stays on the parent.
    const labels = b.lines.map((s, i) => ({ s: s.trim(), i })).filter(({ s }) => s.length >= 3 && s.length < 55 && /^[\p{L}][\p{L}\p{N} ’'–—-]+$/u.test(s) && !/Level|Clan Feature|Evolution|Stance|Classification|Description|Swarm types/i.test(s));
    if ( /select|choose|pick/i.test(b.lines.join(" ")) ) for ( let n = 0; n < labels.length; n++ ) {
      const label = labels[n], text = b.lines.slice(label.i + 1, labels[n + 1]?.i ?? b.lines.length);
      if ( !text.length ) continue;
      const o = feat(clan, `${name}: ${label.s}`, text, at + label.i + 2, currentLevel, "Options", `${name}:${label.s}`);
      optionIndex.push({ name: o.name, parent: f._id, id: o._id, line: at + label.i + 2 });
      o.flags.n5e.repeatable = /(?:select|choose|take) (?:this|the same)[^.]*?(?:again|second time|multiple|more than once)/i.test(text.join(" "));
    }
    const choices = optionIndex.filter(o => o.parent === f._id).map(o => records.get(o.id).data);
    if ( choices.length ) {
      const intro = b.lines.slice(0, labels[0]?.i ?? 6).join(" ");
      const knownMenus = { "Symbiotic Hive": [[1, 1], [7, 1], [11, 1], [15, 1]], "Bloodline of the Elite": [[3, 2], [11, 1]],
        "Will-O-Wisps": [[3, 2], [7, 1], [15, 1]], "Advanced Adaptation": [[1, 2], [7, 1], [15, 1]],
        "White Chakra": [[1, 1], [7, 1], [15, 1]], Onijutsu: [[1, 2], [7, 1], [15, 1]],
        "Blood of the Swift": [[1, 2], [7, 1], [15, 1]], "Legacy of the Past": [[1, 2], [7, 1], [15, 1]] };
      const menu = knownMenus[name];
      if ( menu ) for ( const [level, count] of menu ) grant(doc, level, `${name} choices`, choices, "itemChoice", count, branch);
      else {
        const countWord = intro.match(/(?:select|choose|pick)\s+(?:any )?(one|two|three|four|[1-9])\s+(?:of the following|from the following|such|[\p{L}’'-]+ options)/iu)?.[1]?.toLowerCase();
        const count = { one: 1, two: 2, three: 3, four: 4 }[countWord] ?? Number(countWord ?? 0);
        if ( count ) grant(doc, currentLevel, `${name} choices`, choices, "itemChoice", count, branch);
      }
    }
    const poolSpecs = { "Caloric Arts": ["calories", "Calories", "rest", false], "White Chakra": ["whiteChakra", "White Chakra", "rest", false],
      Onijutsu: ["oniCoils", "Oni-Coils", "rest", false], "Blood of the Swift": ["speedSeals", "Speed Seals", "rest", false],
      "Legacy of the Past": ["sarutobiWill", "Will", "rest", false] };
    const poolSpec = poolSpecs[name];
    if ( poolSpec ) {
      const [poolId, label, on, castsJutsu] = poolSpec;
      f.system.resourcePools = [{ id: poolId, label, max: "1 + @prof", die: poolId === "speedSeals" ? "d8" : "", recovery: [{ on, amount: "all", formula: "", requires: "" }], castsJutsu, countsAsChakraSpend: castsJutsu }];
    }
    if ( clan.name === "Hatake" && name === "Pack Leader" ) f.system.resourcePools = [{ id: "commandDice", label: "Command Dice",
      max: "max(0,@abilities.str.mod,@abilities.dex.mod,@abilities.con.mod,@abilities.int.mod,@abilities.wis.mod,@abilities.cha.mod)", die: "d20", recovery: [{ on: "lr", amount: "all", formula: "", requires: "" }] }];
    if ( /number of Inner Chi equal to 1\s*\+/i.test(b.lines.join(" ")) ) f.system.resourcePools = [{ id: "innerChi", label: "Inner Chi", max: "1 + @prof", die: "", recovery: [{ on: "rest", amount: "all", formula: "", requires: "" }] }];
    if ( /number of Stellar Charges equal to 1\s*\+/i.test(b.lines.join(" ")) ) f.system.resourcePools = [{ id: "stellarCharges", label: "Stellar Charges", max: "1 + @prof", die: "", recovery: [{ on: "event", amount: "all", formula: "", requires: "" }] }];
    // Explicit clan stances are separate usable records, while transformations stay on their feature.
    const stanceNames = [...b.lines.join(" ").matchAll(/(?:your|the|a|enter)\s+([A-Z][\p{L}’ -]{2,30}?)\s+(?:[Cc]hakra |[Tt]aijutsu |[Bb]ukijutsu )?[Ss]tance/gu)].map(m => m[1].trim());
    const curated = { "Symbiotic Hive": "Swarm Chakra", "Expansion Technique": "Expansion Technique", "Gentle Fist": "Gentle Fist", "Smoke Style": "Smoke Style", "Four-Legs Technique": "Four-Legs", "Shadow Arts": "Shadow Art", "Cross-Style": "Cross-Style" }[name];
    const names = curated ? [curated] : [...new Set(stanceNames)].filter(n => !/chosen|active|following|stance|this|new|clan|combat scroll|qualify|\bor\b|\band\b|\bexpert\b|fighting|^(?:Taijutsu|Bukijutsu|Chakra)$/i.test(n));
    for ( const stanceName of names ) {
      const categories = /Taijutsu|Expansion|Gentle Fist|Four-Legs/i.test(stanceName + b.lines.slice(0, 3).join(" ")) ? ["taijutsu"] : ["chakra"];
      if ( /Cross-Style/i.test(stanceName) ) categories.push("taijutsu", "bukijutsu");
      const stance = item(clan, "stance", stanceName, "Stances", b.lines, at + 1, { categories: [...new Set(categories)], requirement: `${clan.name} clan`, featureType: "passive" }, `stance:${stanceName}`);
      stanceIds.add(stance._id);
      const selectedOption = choices.find(o => norm(o.name.split(": ").at(-1)) === norm(stanceName));
      if ( selectedOption ) selectedOption.flags.n5e.grants = [uri(stance)];
      else if ( !doc.system.advancement.some(a => a.uuids.includes(uri(stance))) ) grant(doc, currentLevel, `${stanceName} stance`, [stance], "feature", 1, branch);
    }
  }
  for ( let at = main.end; at < clan.end; at++ ) {
    if ( !source[at].startsWith("#### ") ) continue;
    const b = block(at, 4), name = source[at].slice(5).trim();
    const heading = source.slice(main.end, at).filter(s => s.startsWith("## ")).at(-1) ?? source[main.end];
    if ( /Mutation/i.test(heading) ) {
      const level = Number(b.lines.slice(0, 3).join(" ").match(/(\d+)(?:st|nd|rd|th) Level/i)?.[1] ?? 1);
      const m = feat(clan, name, b.lines, at + 1, level, "Mutations", `mutation:${name}`);
      m.flags.n5e.mutation = { replaces: b.lines.filter(s => /^Mutated (?:Trait|Feature):/i.test(s)), manualReplacement: true };
      mutationIndex.push({ name, id: m._id, line: at + 1 });
    } else {
      const j = jutsu(clan, name, b.lines, at + 1);
      if ( j ) jutsuIndex.push({ name, id: j._id, rank: j.system.rank, line: at + 1 });
    }
  }
  // Companion and supplementary rules outside the main feature subsection remain explicitly accessible.
  for ( let at = clan.at + 1; at < main.end; at++ ) if ( /^### .*?(?:Nin-Dog|Companion|Dream Walker|Beast).*?(?:Traits|Statistics|Stat Block)/i.test(source[at]) ) {
    feat(clan, source[at].slice(4), block(at, 3).lines, at + 1, 1, "Companion Rules");
  }
  // Clan feats are intentionally excluded while their rules are being revised.
  if ( clan.name === "Non-Clan" ) {
    let group = "Latent Bloodlines";
    const latentByName = new Map(), latentIds = new Set();
    for ( let at = appendixAt; at < source.length; at++ ) {
      if ( /^Latent [\p{L} ]+$/u.test(source[at]) ) group = source[at].trim();
      const row = source[at].split("|").slice(1, -1).map(s => s.trim());
      if ( row.length < 3 || !/^\d/.test(row[1]) ) continue;
      const level = Number(row[2].match(/(?:Beginning|Starting|at)[, ]+(?:at )?(\d+)(?:st|nd|rd|th) level/i)?.[1] ?? 1);
      const key = `${group}:${row[0]}`, signature = norm(row.slice(1).join("|"));
      const variants = latentByName.get(key) ?? [];
      const duplicate = variants.find(v => v.signature === signature);
      if ( duplicate ) { duplicate.doc.flags.n5e.latent.sourceLines.push(at + 1); continue; }
      const variant = variants.length + 1;
      const displayName = `${group.replace(/^Latent /, "")}: ${row[0]}${variant > 1 ? ` (source variant ${variant})` : ""}`;
      const latent = feat(clan, displayName, [`Bloodline Point Cost: ${row[1]}`, row.slice(2).join(" | ")], at + 1, level, "Latent Bloodlines", `latent:${group}:${row[0]}:variant-${variant}`);
      latent.system.category = "clanOption";
      latent.flags.n5e.latent = { group, sourceName: row[0], cost: row[1], manualBudget: true, sourceLines: [at + 1], variant };
      latentIds.add(latent._id);
      variants.push({ signature, doc: latent }); latentByName.set(key, variants);
      if ( variant > 1 ) issues.push({ clan: clan.name, type: "latent-source-variant", group, name: row[0], line: at + 1,
        resolution: "Different source rows retained as separate variants; GM review required." });
    }
    for ( const [key, record] of records ) if ( record.data.flags?.n5e?.latent && record.data.flags.n5e.clanPackage === "non-clan" && !latentIds.has(key) ) {
      records.delete(key);
      if ( record.file.startsWith(pack + path.sep) && fs.existsSync(record.file) ) fs.unlinkSync(record.file);
    }
    const twoMastery = { id: id("non-clan-self-taught"), level: 1, type: "mastery", title: "Self-Taught Skills", uuids: [], count: 2, key: "", value: "", branch: "", chosen: [] };
    doc.system.advancement.push(twoMastery);
    for ( const level of [1, 7, 15] ) grant(doc, level, "Unrelenting Focus: feat", [], "featChoice", 1);
    doc.flags.n5e.nonClanASI = true;
  }
  // Source callouts defining clan-specific conditions; exact source text is retained for unmodelled riders.
  const callouts = source.slice(clan.at, clan.end).filter(s => s.startsWith("|") && /\[(?:Physical|Mental|Sensory|Elemental)\]|treated as (?:a |an )?(?:physical|mental|sensory|elemental) condition/i.test(s));
  for ( const text of callouts ) {
    const title = text.split("/")[0].replace(/^\|\s*#+\s*/, "").replace(/^\|/, "").trim();
    const label = title.split(/[–—]/).at(-1).trim();
    const existing = doc.system.conditions.find(c => norm(c.label) === norm(label));
    if ( existing ) continue;
    doc.system.conditions.push({ key: `${slug(clan.name)}-${slug(label)}`, label, tags: ["physical", "mental", "sensory", "elemental"].filter(t => text.toLowerCase().includes(t)),
      maxRanks: Number(text.match(/Max(?:imum)? Rank[s]?:?\s*(\d+)/i)?.[1]) || (/per rank|each rank|ranks of/i.test(text) ? 0 : null), persists: false, text, icon: "icons/svg/aura.svg",
      flat: { ac: 0, saveDC: 0, damageTaken: 0 }, perRank: { ac: 0, saveDC: 0, damageTaken: 0 } });
  }
  doc.flags.n5e.hijutsuUuids = jutsuIndex.map(j => `Compendium.n5e.clans.Item.${j.id}`);
  doc.system.keywords = [...new Set(jutsuIndex.flatMap(j => records.get(j.id).data.system.keywords).filter(k => !keywords[k]))];
  doc.flags.n5e.referenceOptions = optionIndex;
  for ( const [key, record] of records ) if ( record.data.type === "stance" && record.data.flags?.n5e?.clanPackage === slug(clan.name) && !stanceIds.has(key) ) {
    records.delete(key);
    if ( record.file.startsWith(pack + path.sep) && fs.existsSync(record.file) ) fs.unlinkSync(record.file);
  }
  doc.system.advancement.sort((a, b) => a.level - b.level);
  save(doc, clan, "", "clan");
  const clanFile = path.join(out, `${slug(clan.name)}.json`);
  const result = { name: clan.name, identifier: slug(clan.name), nation: clan.nation, batch, id: key, traits: traits.join("\n"), features: featureIndex, options: optionIndex,
    hijutsu: jutsuIndex, mutations: mutationIndex, feats: featIndex, conditions: doc.system.conditions.map(c => c.label) };
  fs.writeFileSync(clanFile, `${JSON.stringify(result, null, 2)}\n`);
  summary.push({ clan: clan.name, features: featureIndex.length, options: optionIndex.length, hijutsu: jutsuIndex.length, mutations: mutationIndex.length, feats: featIndex.length });
}
// Remove only empty folders made by this importer, including superseded rank-label folders.
let pruned;
do {
  pruned = false;
  const parents = new Set([...records.values()].map(r => r.data.folder).filter(Boolean));
  for ( const [key, record] of records ) if ( record.data._key.startsWith("!folders!") && !parents.has(key)
    && record.file.startsWith(path.join(pack, "organized") + path.sep) ) {
    records.delete(key);
    if ( fs.existsSync(record.file) ) fs.unlinkSync(record.file);
    pruned = true;
  }
} while ( pruned );
for ( const { data, file } of records.values() ) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(migrateItemData1(data) ?? data, null, 2)}\n`);
}
fs.writeFileSync(path.join(out, "roster.json"), `${JSON.stringify(roster.map(({ name, nation, line, batch }) => ({ name, nation, line, batch })), null, 2)}\n`);
fs.writeFileSync(path.join(out, `batch-${batch}.json`), `${JSON.stringify({ batch, summary, issues }, null, 2)}\n`);
console.log(JSON.stringify({ batch, summary, issues }, null, 2));
