/** Complete the seven supported class trees without replacing existing IDs or automation. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");
const kb = process.argv[2] ?? process.env.N5E_KB;
if ( !kb ) throw new Error("Pass the N5e-Rules-KB directory.");
const source = fs.readFileSync(path.join(kb, "_source/classes/orochimaru-full.md"), "utf8").split(/\r?\n/);
const packRoot = path.join(root, "packs/_source");
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
const records = new Map();
for ( const pack of ["classes", "features", "stances", "jutsu"] ) for ( const file of walk(path.join(packRoot, pack)) ) {
  if ( file.endsWith(".json") ) { const data = JSON.parse(fs.readFileSync(file, "utf8")); records.set(`${pack}:${data._id}`, { data, pack, file }); }
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const slug = s => s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const id = s => crypto.createHash("sha256").update(`n5e.class-expansion.${s}`).digest("hex").slice(0, 16);
const esc = s => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const all = () => [...records.values()].map(r => r.data);
const uri = (pack, d) => `Compendium.n5e.${pack}.Item.${d._id}`;
const block = (at, depth) => {
  let end = at + 1;
  while ( end < source.length && !new RegExp(`^#{1,${depth}} `).test(source[end]) ) end++;
  return { at, end, lines: source.slice(at + 1, end) };
};
function html(lines) {
  return lines.filter(s => s.trim() && !/^\[\/?BOX\]$/.test(s.trim())).map(s => {
    const h = s.match(/^(#{3,6}) (.*)/);
    if ( h ) return `<h${Math.min(6, h[1].length)}>${esc(h[2])}</h${Math.min(6, h[1].length)}>`;
    return `<p>${esc(s).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
  }).join("\n");
}
function folder(pack, chain) {
  let parent = null;
  for ( let i = 1; i <= chain.length; i++ ) {
    const name = chain[i - 1];
    const existing = [...records.values()].find(r => r.pack === pack && r.data._key.startsWith("!folders!") && r.data.name === name && (r.data.folder ?? null) === parent);
    if ( existing ) { parent = existing.data._id; continue; }
    const key = id(`folder:${pack}:${chain.slice(0, i).join("/")}`);
    const data = { _id: key, _key: `!folders!${key}`, name, type: "Item", folder: parent, sorting: "a", sort: 0, color: null, flags: { n5e: { classExpansion: true } } };
    records.set(`${pack}:${key}`, { data, pack, file: path.join(packRoot, pack, "expanded", ...chain.slice(0, i).map(slug), "_folder.json") });
    parent = key;
  }
  return parent;
}
const generated = [];
const unresolved = [];
function feature(cls, heading, lines, level, { subclass = null, category = "classFeature", tag = "", label = heading, role = "feature" } = {}) {
  const baseName = d => d.name.replace(/\s*\([^)]*\)$/, "");
  const existing = all().find(d => d.type === "feat" && d.system.requirement?.class === cls.system.identifier
    && norm(baseName(d)) === norm(heading) && (!subclass || (d.folder === folder("features", [cls.name, subclass.name]))));
  // Existing documents keep authored activities, effects, identifiers and exact IDs.
  if ( existing ) {
    if ( existing.flags?.n5e?.classExpansion ) {
      existing.system.description = html(lines);
      existing.system.requirement.level = level;
    }
    return existing;
  }
  const key = id(`${cls.system.identifier}:${subclass?.system.identifier ?? "core"}:${role}:${heading}`);
  const already = records.get(`features:${key}`)?.data;
  if ( already ) { already.system.description = html(lines); already.system.requirement.level = level; return already; }
  const name = subclass ? `${label} (${subclass.name})` : label;
  const intro = lines.filter(s => !s.startsWith("|" )).slice(0, 5).join(" ");
  const action = /as a bonus action/i.test(intro) ? "bonus" : /(?:as|your) (?:a )?reaction/i.test(intro) ? "reaction" : /as an action/i.test(intro) ? "action" : "none";
  const prereqs = lines.slice(0, 6).filter(s => /^(?:Prerequisites?|Requirements?)\s*:/i.test(s)).map(s => s.replace(/^[^:]+:\s*/, ""));
  const data = { _id: key, _key: `!items!${key}`, name, type: "feat", img: "icons/svg/upgrade.svg", folder: folder("features", [cls.name, ...(subclass ? [subclass.name] : [category === "classOption" ? "Options" : "Core features"]), ...(tag ? [tag] : [])]),
    system: { identifier: slug(name), description: html(lines), source: { book: "Orochimaru's Observation Compendium", page: "", version: "4.0", custom: "Imported full source rules; contextual benefits require adjudication." },
      category, requirement: { level, class: cls.system.identifier, clan: "" }, prerequisites: prereqs, featureType: action === "none" ? "passive" : "active",
      activation: { type: action, value: 1, unit: "", trigger: { event: "", text: "" } }, tags: tag ? [tag] : [], resourcePools: [], advancement: [] },
    effects: [], flags: { n5e: { generated: true, classExpansion: true } }, ownership: { default: 0 } };
  const file = path.join(packRoot, "features", "expanded", cls.system.identifier, subclass?.system.identifier ?? (tag || "core"), `${slug(name)}-${key}.json`);
  records.set(`features:${key}`, { data, file, pack: "features" });
  generated.push(data.name);
  return data;
}
function advancement(owner, level, type, title, docs = [], count = 1, key = "", options = {}) {
  const advId = `expanded-${slug(title)}-${level}`;
  const a = { id: advId, level, type, title, uuids: docs.map(d => typeof d === "string" ? d : uri(d.type === "stance" ? "stances" : "features", d)), count, key, value: "", branch: "", chosen: [] };
  const old = owner.system.advancement.find(a => a.id === advId);
  if ( old ) Object.assign(old, a, { chosen: old.chosen ?? [] });
  else owner.system.advancement.push(a);
  if ( options.requires ) {
    owner.flags.n5e.advancementRequirements ??= {};
    owner.flags.n5e.advancementRequirements[advId] = options.requires;
  }
  return a;
}
const classes = {
  "Genjutsu Specialist": { group: "Genjutsu Pledges", late: { "Master of Illusion": 9, "The Prestige": 20 }, options: [["## Malleable Mirages", 4, "gen-mirage", "malleableMirages", 2], ["## Genjutsu Inception", 3, "gen-inception"]], mastery: [[7, "skill.ill"], [13, "skill.ill"]] },
  "Hunter-Nin": { group: "Hunters Creeds", late: { "Hunted Target": 7, "Defensive Tactics": 11, "Elusive": 13, "Assassinate": 20 }, options: [["## Hunters Exploits", 4, "hunter-exploit", "exploits", 2]], mastery: [[10, ""], [15, ""]] },
  "Medical-Nin": { group: "Tenets of Medicine", late: { "Never on the Front Lines": 7, "Advanced Medical Research": 9, "Until their Heart Stops": 13, "Medical Perfection: Supreme Medic": 20 }, options: [], mastery: [[8, "skill.med"], [12, "skill.med"]] },
  "Ninjutsu Specialist": { group: "Ninjutsu Focus", late: { "Counter Seal": 7, "Perfected Surge": 9, "Ninjutsu Master": 20 }, options: [["### Refined Focus - Moldings", 4, "nin-molding", "moldingsKnown", 1]], mastery: [[7, "skill.nin"], [13, "skill.nin"]] },
  "Scout-Nin": { group: "Scouting Technique", late: { "Signature Jutsu": 7, "Signature Path": 9, "Multifaceted": 11, "Signature Switch": 13, "Superior Scout": 20 }, options: [] },
  "Taijutsu Specialist": { group: "Taijutsu Style", late: { "Iron Body": 7, "Agile": 7, "Iron will": 9, "Expert of The Fist": 11, "Persistence": 13, "Mastery of Self": 20 }, options: [["## Martial Techniques", 4, "tai-technique", "martialTechniques", 1], ["### Student of Perfection", 4, "tai-perfection"], ["### Moment of Stillness", 4, "tai-stillness"]] },
  "Weapon Specialist": { group: "Combat Doctrines", late: { "Chaining Adept": 7, "Inspiring Words": 7, "Superior Discipline": 9, "Flurry Attack": 11, "Chakra Sunder": 13, "Dauntless": 20 }, options: [["## Kata", 4, "weapon-kata", "katasKnown", 2], ["### Augmentation", 4, "weapon-augmentation"]] }
};
function region(heading, start) {
  const at = source.indexOf(heading, start);
  if ( at < 0 ) throw new Error(`Missing source heading: ${heading}`);
  return block(at, heading.match(/^#+/)[0].length);
}
function optionsFrom(cls, heading, depth, tag, start, owner = cls) {
  const r = region(heading, start), docs = [];
  for ( let at = r.at + 1; at < r.end; at++ ) {
    if ( !source[at].startsWith(`${"#".repeat(depth)} `) ) continue;
    const name = source[at].slice(depth + 1).trim(), b = block(at, depth);
    const prereq = b.lines.slice(0, 6).filter(s => /^(?:Prerequisites?|Requirements?)\s*:/i.test(s)).join(" ");
    const level = prereq.match(/(\d+)(?:st|nd|rd|th)?\s*level|level\s*(\d+)/i);
    const firstLevel = { "gen-inception": 3, "gen-mirage": 2, "hunter-exploit": 2, "tai-perfection": 2, "tai-stillness": 5,
      "weapon-kata": 2, "weapon-augmentation": 2, "scout-signature": 7, "scout-signature-path": 9, "nin-evolution": 9 }[tag] ?? (tag.endsWith("maneuver") ? 3 : 1);
    const minimum = Number(level?.[1] ?? level?.[2] ?? firstLevel);
    const doc = feature(cls, name, b.lines, minimum, { category: "classOption", tag });
    doc.system.requirement.level = minimum;
    doc.system.prerequisites = b.lines.slice(0, 6).filter(s => /^(?:Prerequisites?|Requirements?)\s*:/i.test(s)).map(s => s.replace(/^[^:]+:\s*/, ""));
    docs.push(doc);
  }
  // Preserve existing choice IDs while expanding their pools.
  for ( const adv of owner.system.advancement ) if ( adv.type === "itemChoice" && adv.key === tag ) adv.uuids = docs.map(d => uri("features", d));
  return docs;
}
const summary = [];
for ( const [name, config] of Object.entries(classes) ) {
  const cls = all().find(d => d.type === "class" && d.name === name);
  if ( !cls ) throw new Error(`Missing base class ${name}; run the base content import first.`);
  const start = source.indexOf(`## ${name}`);
  cls.flags.n5e.contentScope = "levels-1-20";
  for ( const [heading, level] of Object.entries(config.late) ) {
    const r = region(`### ${heading}`, start);
    const f = feature(cls, heading, r.lines, level);
    advancement(cls, level, "feature", heading, [f]);
  }
  for ( const [level, target] of config.mastery ?? [] ) advancement(cls, level, "mastery", target ? `Mastery: ${target}` : "Mastery (Hunter-Nin)", [], 1, target);
  for ( const [heading, depth, tag, columnKey, first] of config.options ) {
    const opts = optionsFrom(cls, heading, depth, tag, start);
    if ( columnKey ) {
      const values = cls.system.columns.find(c => c.key === columnKey).values.map(Number);
      for ( let level = first; level <= 20; level++ ) {
        if ( level <= 5 ) continue;
        const gain = values[level - 1] - (values[level - 2] ?? 0);
        if ( gain > 0 ) advancement(cls, level, "itemChoice", heading.replace(/^#+ /, ""), opts, gain, tag);
      }
    }
  }
  const subRegion = region(`## ${config.group}`, start);
  const subclasses = [];
  for ( let at = subRegion.at + 1; at < subRegion.end; at++ ) {
    if ( !source[at].startsWith("### ") || /Maneuvers$|Moldings$/.test(source[at]) ) continue;
    const subName = source[at].slice(4).trim();
    let sc = all().find(d => d.type === "subclass" && d.system.classIdentifier === cls.system.identifier && norm(d.name) === norm(subName));
    const r = block(at, 3);
    if ( !sc ) {
      const key = id(`subclass:${cls.system.identifier}:${subName}`);
      sc = { _id: key, _key: `!items!${key}`, name: subName, type: "subclass", img: "icons/svg/upgrade.svg", folder: folder("classes", [cls.name]),
        system: { identifier: slug(subName), description: html(r.lines.slice(0, r.lines.findIndex(s => s.startsWith("#### ")))),
          source: { book: "Orochimaru's Observation Compendium", page: "", version: "4.0", custom: "" }, classIdentifier: cls.system.identifier, resourcePools: [], advancement: [] },
        effects: [], flags: { n5e: { generated: true, classExpansion: true } }, ownership: { default: 0 } };
      records.set(`classes:${key}`, { data: sc, pack: "classes", file: path.join(packRoot, "classes", "expanded", cls.system.identifier, `${slug(subName)}-${key}.json`) });
    }
    sc.flags.n5e.contentScope = "levels-1-20";
    const release = { "Lightning Breaker": "lightning", "Stone Crusher": "earth", "Storm Terror": "wind", Tsunami: "water" }[sc.name];
    if ( name === "Ninjutsu Specialist" && release ) advancement(sc, 2, "trait", `${release} Release affinity`, [release], 0, "affinity");
    const featuresByLevel = new Map();
    let inferredLevel = cls.system.subclassLevel;
    for ( let i = at + 1; i < r.end; i++ ) {
      if ( !source[i].startsWith("#### ") ) continue;
      const featureName = source[i].slice(5).trim(), b = block(i, 4);
      const intro = b.lines.filter(s => s.trim() && !s.startsWith("|") && !s.startsWith("[BOX]")).slice(0, 3).join(" ");
      const stated = intro.match(/(?:at|reaching|reach|Beginning|Starting)[,\s]+(?:the\s+)?(\d+)(?:st|nd|rd|th)[ -]+level/i);
      if ( stated ) inferredLevel = Number(stated[1]);
      else if ( !all().some(d => d.type === "feat" && norm(d.name.replace(/\s*\([^)]*\)$/, "")) === norm(featureName) && d.system.requirement?.class === cls.system.identifier) ) {
        unresolved.push({ class: name, subclass: subName, feature: featureName, level: inferredLevel, sourceLine: i + 1 });
      }
      const f = feature(cls, featureName, b.lines, inferredLevel, { subclass: sc });
      const linked = sc.system.advancement.some(a => a.type === "feature" && (a.uuids ?? []).includes(uri("features", f)));
      if ( !linked ) {
        if ( !featuresByLevel.has(inferredLevel) ) featuresByLevel.set(inferredLevel, []);
        featuresByLevel.get(inferredLevel).push(f);
      }
    }
    for ( const [level, features] of featuresByLevel ) advancement(sc, level, "feature", `${sc.name} features`, features);
    // Scout maneuvers belong to their technique, not a global unrestricted list.
    if ( name === "Scout-Nin" ) {
      const maneuversAt = source.findIndex((s, i) => i > at && i < subRegion.end && /^### .*Maneuvers$/.test(s));
      const nextSubclass = source.findIndex((s, i) => i > at && i < subRegion.end && /^### /.test(s) && !/Maneuvers$/.test(s));
      if ( maneuversAt > 0 && (nextSubclass < 0 || maneuversAt < nextSubclass) ) {
        const tag = sc.name === "Assault Scout" ? "assault-maneuver" : `${sc.system.identifier}-maneuver`;
        const opts = optionsFrom(cls, source[maneuversAt], 4, tag, start, sc);
        opts.forEach(d => { d.system.tags = [...new Set([...(d.system.tags ?? []), "scout-maneuver"])]; });
        const values = cls.system.columns.find(c => c.key === "maneuversKnown").values.map(Number);
        for ( let level = 3; level <= 20; level++ ) {
          const gain = values[level - 1] - (values[level - 2] ?? 0);
          if ( gain > 0 && !sc.system.advancement.some(a => a.type === "itemChoice" && a.level === level && a.key === tag) ) advancement(sc, level, "itemChoice", source[maneuversAt].slice(4), opts, gain, tag);
        }
      }
    }
    subclasses.push(uri("classes", sc));
  }
  cls.system.subclasses = subclasses;
  const stancePool = category => all().filter(d => d.type === "stance" && (d.system.categories ?? []).includes(category));
  if ( name === "Scout-Nin" ) {
    const paths = optionsFrom(cls, "### Shinobi’s Path", 4, "scout-path", start);
    advancement(cls, 11, "itemChoice", "Additional Shinobi Path", paths, 1, "scout-path");
    for ( const level of [7, 11] ) advancement(cls, level, "itemChoice", "Additional Fighting Stance (new type)", all().filter(d => d.type === "stance"), 1, "stance-new-type");
    const signatures = optionsFrom(cls, "### Signature Jutsu", 4, "scout-signature", start);
    for ( const level of [7, 15] ) advancement(cls, level, "itemChoice", "Signature Modification", signatures, 1, "scout-signature");
    const pathUpgrades = optionsFrom(cls, "### Signature Path", 4, "scout-signature-path", start);
    pathUpgrades.forEach((d, i) => { d.flags.n5e.requiresItems = [paths[i].system.identifier]; });
    for ( const level of [9, 18] ) advancement(cls, level, "itemChoice", "Signature Path benefit (chosen path)", pathUpgrades, 1, "scout-signature-path");
  }
  if ( name === "Ninjutsu Specialist" ) {
    const opts = optionsFrom(cls, "### Perfected Surge", 4, "nin-evolution", start);
    const state = d => d.name === "Union" ? "neutral" : ["Overdrive", "Breach"].includes(d.name) ? "crash" : "flow";
    advancement(cls, 9, "itemChoice", "Crash Evolution", opts.filter(d => ["crash", "neutral"].includes(state(d))), 1, "nin-evolution");
    advancement(cls, 9, "itemChoice", "Flow Evolution", opts.filter(d => ["flow", "neutral"].includes(state(d))), 1, "nin-evolution");
    const upgrades = opts.map(d => feature(cls, `${d.name} (15th-level benefit)`, ["Only the 15th-level benefit is granted by this selection.", ...region(`#### ${d.name}`, start).lines], 15,
      { category: "classOption", tag: "nin-evolution-15", role: "upgrade" }));
    advancement(cls, 15, "itemChoice", "Additional Evolution (15th-level benefit only)", upgrades, 1, "nin-evolution-15");
  }
  if ( name === "Weapon Specialist" ) {
    const augments = optionsFrom(cls, "### Augmentation", 4, "weapon-augmentation", start);
    for ( const level of [9, 15] ) advancement(cls, level, "itemChoice", "Additional Augmentation", augments, 1, "weapon-augmentation");
    const benefits = region("### Superior Discipline", start).lines.filter(s => /^(Redirect|Warden|Persistence|Impulse|Stimulus|Blitz|Assault|Raid)\./.test(s));
    const opts = benefits.map(line => feature(cls, `Superior Discipline: ${line.split(".")[0]}`, [line], 9, { category: "classOption", tag: "weapon-superior" }));
    for ( const [level, count] of [[9, 2], [13, 1], [18, 1]] ) advancement(cls, level, "itemChoice", "Superior Discipline benefits", opts, count, "weapon-superior");
  }
  if ( name === "Taijutsu Specialist" ) {
    // Expertise is a chosen stance's upgrade, not a second copy of the base stance.
    const opts = stancePool("taijutsu").map(stance => feature(cls, `Expertise: ${stance.name}`, ["Apply only the Expertise benefit of this known stance.", stance.system.description], 11,
      { category: "classOption", tag: "tai-expertise", role: "expertise" }));
    opts.forEach((d, i) => { d.flags.n5e.requiresItems = [stancePool("taijutsu")[i].system.identifier]; });
    opts.forEach((d, i) => { d.system.description = "<p>Apply only the Expertise benefit of this known stance.</p>" + stancePool("taijutsu")[i].system.description; });
    advancement(cls, 11, "itemChoice", "Known Taijutsu Stance Expertise", opts, 1, "tai-expertise");
  }
  cls.system.advancement.sort((a, b) => a.level - b.level);
  summary.push({ class: name, subclasses: subclasses.length, advancementEntries: cls.system.advancement.length });
}
// Conditional 7th-level choices granted by specific Genjutsu Inceptions.
const gen = all().find(d => d.type === "class" && d.name === "Genjutsu Specialist");
for ( const [ownerName, choices] of [["Hallucinatory Instrument", ["Words of Affirmation", "Words of Detriment"]], ["Temporal Stopwatch", ["Rewind", "Fast Forward"]]] ) {
  const at = region(`### ${ownerName}`, source.indexOf("## Genjutsu Inception"));
  const docs = choices.map(name => {
    const text = at.lines.find(s => s.startsWith(`${name}.`));
    if ( !text ) throw new Error(`Missing Inception benefit ${name}`);
    return feature(gen, name, [text], 7, { category: "classOption", tag: "gen-inception-upgrade" });
  });
  advancement(gen, 7, "itemChoice", `${ownerName}: 7th-level ability`, docs, 1, "gen-inception-upgrade", { requires: [slug(ownerName)] });
}
// Retain source prerequisites and explicit references when a requirement names an imported item.
for ( const data of all().filter(d => d.type === "feat" && d.system.requirement?.class) ) {
  const prerequisites = data.system.prerequisites ?? [];
  const candidates = all().filter(d => ["feat", "jutsu"].includes(d.type) && d._id !== data._id);
  const refs = prerequisites.flatMap(text => candidates.filter(d => norm(text.replace(/Genjutsu|Ninjutsu|Taijutsu/gi, "")) === norm(d.name)).map(d => d.system.identifier)).filter(Boolean);
  if ( refs.length ) data.flags.n5e.requiresItems = [...new Set([...(data.flags.n5e.requiresItems ?? []), ...refs])];
}
for ( const { data, file, pack } of records.values() ) {
  if ( !["classes", "features"].includes(pack) ) continue;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}
fs.mkdirSync(path.join(root, "content/classes"), { recursive: true });
fs.writeFileSync(path.join(root, "content/classes/import-summary.json"), `${JSON.stringify({ summary, generated: generated.length,
  expandedFeatures: all().filter(d => d.type === "feat" && d.flags?.n5e?.classExpansion).length, unresolved }, null, 2)}\n`);
console.log(JSON.stringify({ summary, generated: generated.length, unresolved }, null, 2));
