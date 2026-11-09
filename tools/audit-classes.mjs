/** Read installed packs through workspace snapshots; never opens live LevelDB packs. */
import fs from "node:fs";
import path from "node:path";
import { extractPack } from "@foundryvtt/foundryvtt-cli";

const root = path.resolve(import.meta.dirname, "..");
const workspace = path.resolve(root, "../class-audit-restarted");
fs.mkdirSync(workspace, { recursive: true });
const installation = "C:/FoundryData/Data/systems/n5e";
const manifest = JSON.parse(fs.readFileSync(path.join(installation, "system.json"), "utf8"));
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
const docs = [];
for ( const pack of manifest.packs ) {
  const snapshot = path.join(workspace, "snapshot", pack.name);
  const destination = path.join(workspace, "extracted", pack.name);
  if ( !fs.existsSync(destination) ) {
    if ( fs.existsSync(snapshot) ) throw new Error("Incomplete snapshot; use a fresh audit directory.");
    fs.cpSync(path.join(installation, pack.path), snapshot, { recursive: true, filter: file => path.basename(file) !== "LOCK" });
    await extractPack(snapshot, destination, { log: false });
  }
  for ( const file of walk(destination).filter(f => f.endsWith(".json")) ) {
    const doc = JSON.parse(fs.readFileSync(file, "utf8"));
    if ( doc.type === "Item" || !doc.system ) continue;
    docs.push({ ...doc, pack: pack.name, uuid: `Compendium.n5e.${pack.name}.Item.${doc._id}` });
  }
}
const bookPath = "C:/Users/Tommi/OneDrive/Documents/ContextFile/N5e-Rules-KB/_source/classes/orochimaru-full.md";
const source = fs.readFileSync(bookPath, "utf8").split(/\r?\n/);
const names = ["Genjutsu Specialist", "Hunter-Nin", "Medical-Nin", "Ninjutsu Specialist", "Scout-Nin", "Taijutsu Specialist", "Weapon Specialist"];
const groups = { "Genjutsu Specialist": "Genjutsu Pledges", "Hunter-Nin": "Hunters Creeds", "Medical-Nin": "Tenets of Medicine", "Ninjutsu Specialist": "Ninjutsu Focus", "Scout-Nin": "Scouting Technique", "Taijutsu Specialist": "Taijutsu Style", "Weapon Specialist": "Combat Doctrines" };
const norm = s => s.toLowerCase().replace(/<[^>]*>/g, "").replace(/[^a-z0-9]/g, "");
const plain = s => s.replace(/<[^>]*>/g, " ").replace(/&[^;]+;/g, " ").replace(/\s+/g, " ").trim();
const section = (start, depth) => {
  let end = start + 1;
  while ( end < source.length && !(new RegExp(`^#{1,${depth}} `)).test(source[end]) ) end++;
  return { start, end, text: source.slice(start + 1, end).join("\n") };
};
const byUuid = new Map(docs.map(d => [d.uuid, d]));
const rows = [];
for ( const name of names ) {
  const cls = docs.find(d => d.type === "class" && d.name === name);
  if ( !cls ) { rows.push({ name, missingClass: true }); continue; }
  const start = source.indexOf(`## ${name}`);
  const coreEnd = section(start, 2).end;
  const owned = docs.filter(d => d.system.requirement?.class === cls.system.identifier);
  const normalized = new Map(owned.map(d => [norm(d.name), d]));
  const core = [];
  for ( let i = start + 1; i < coreEnd; i++ ) {
    if ( !source[i].startsWith("### ") ) continue;
    const heading = source[i].slice(4).trim();
    if ( /Maneuvers$|Moldings$/.test(heading) ) continue;
    if ( /^(Character Inspirations|Creating |Class Features|Ability Score Improvement)/.test(heading) ) continue;
    const block = section(i, 3);
    const text = block.text;
    const level = text.match(/(?:at|starting at|beginning at|beginning|starting|upon reaching|at your)\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)\s+level/i)?.[1] ?? null;
    const match = normalized.get(norm(heading)) ?? owned.find(d => norm(d.name.replace(/\s*\([^)]*\)$/, "")) === norm(heading));
    core.push({ heading, line: i + 1, level: level ? Number(level) : null, imported: match?.name ?? null,
      importedLevel: match?.system.requirement?.level ?? null, sourceCharacters: plain(text).length, importedCharacters: plain(match?.system.description ?? "").length });
  }
  const groupStart = source.indexOf(`## ${groups[name]}`, start);
  const groupEnd = section(groupStart, 2).end;
  const subclasses = [];
  for ( let i = groupStart + 1; i < groupEnd; i++ ) {
    if ( !source[i].startsWith("### ") ) continue;
    const heading = source[i].slice(4).trim();
    if ( /Maneuvers$|Moldings$/.test(heading) ) continue;
    const block = section(i, 3);
    const sc = docs.find(d => d.type === "subclass" && d.system.classIdentifier === cls.system.identifier && norm(d.name) === norm(heading));
    const features = [];
    for ( let j = i + 1; j < block.end; j++ ) {
      if ( !source[j].startsWith("#### ") ) continue;
      const featureName = source[j].slice(5).trim();
      const featureBlock = section(j, 4);
      const feature = normalized.get(norm(featureName)) ?? owned.find(d => norm(d.name.replace(/\s*\([^)]*\)$/, "")) === norm(featureName));
      const grant = sc?.system.advancement?.find(a => (a.uuids ?? []).includes(feature?.uuid));
      features.push({ name: featureName, line: j + 1, imported: feature?.name ?? null, linkedToSubclass: !!grant,
        grantLevel: grant?.level ?? null, source: featureBlock.text });
    }
    subclasses.push({ name: heading, line: i + 1, imported: !!sc, offeredByClass: !!sc && cls.system.subclasses.includes(sc.uuid), features });
  }
  const classOwners = [cls, ...docs.filter(d => d.type === "subclass" && d.system.classIdentifier === cls.system.identifier), ...owned];
  const brokenLinks = [];
  for ( const owner of classOwners ) for ( const adv of owner.system.advancement ?? [] ) for ( const uuid of adv.uuids ?? [] ) {
    if ( uuid.startsWith("Compendium.") && !byUuid.has(uuid) ) brokenLinks.push({ owner: owner.name, level: adv.level, uuid });
  }
  const levels = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [i + 1, (cls.system.advancement ?? []).filter(a => a.level === i + 1)
    .map(a => ({ type: a.type, title: a.title, count: a.count, key: a.key, grants: (a.uuids ?? []).map(u => byUuid.get(u)?.name ?? u) }))]));
  const sourceOptions = [];
  const optionRegions = {
    "Genjutsu Specialist": [["## Malleable Mirages", 4], ["## Genjutsu Inception", 3]],
    "Hunter-Nin": [["## Hunters Exploits", 4]], "Medical-Nin": [],
    "Ninjutsu Specialist": [["### Refined Focus - Moldings", 4]],
    "Scout-Nin": [["### Shinobi’s Path", 4], ["### Jack of all", 4], ...Array.from({ length: groupEnd - groupStart }, (_, i) => i + groupStart)
      .filter(i => /^### .*Maneuvers$/.test(source[i])).map(i => [source[i], 4])],
    "Taijutsu Specialist": [["## Martial Techniques", 4], ["### Student of Perfection", 4], ["### Moment of Stillness", 4]],
    "Weapon Specialist": [["## Kata", 4], ["### Augmentation", 4]]
  };
  for ( const [heading, depth] of optionRegions[name] ) {
    const at = source.indexOf(heading, start);
    const end = section(at, heading.match(/^#+/)[0].length).end;
    for ( let i = at + 1; i < end; i++ ) {
      if ( !source[i].startsWith(`${"#".repeat(depth)} `) ) continue;
      const label = source[i].slice(depth + 1).trim();
      const body = section(i, depth).text;
      const req = body.split("\n").slice(0, 4).join(" ").match(/(?:Prerequisites?|Requirements?)[:\s]+[^\n]*?(?:(\d+)(?:st|nd|rd|th)?\s*level|level\s*(\d+))/i);
      const match = normalized.get(norm(label));
      sourceOptions.push({ name: label, region: heading.replace(/^#+ /, ""), line: i + 1,
        minimumLevel: Number(req?.[1] ?? req?.[2] ?? 0), imported: match?.name ?? null });
    }
  }
  const tableHeader = source.findIndex((line, i) => i >= start - 35 && i < start + 30 && /^\| Level \| Proficiency Bonus \| Features/.test(line));
  const headers = tableHeader >= 0 ? source[tableHeader].split("|").slice(1, -1).map(s => s.trim()) : [];
  const table = [];
  for ( let i = tableHeader + 1; i < tableHeader + 25; i++ ) {
    const cells = source[i]?.split("|").slice(1, -1).map(s => s.trim()) ?? [];
    const level = cells[0]?.match(/^(\d+)(?:st|nd|rd|th)?$/)?.[1];
    if ( level ) table.push({ level: Number(level), values: cells, features: cells[2] });
  }
  const jutsuCol = headers.findIndex(h => /Jutsu Known/i.test(h) && !/Highest/i.test(h));
  const tableDifferences = table.filter(r => Number(r.values[jutsuCol]) !== Number(cls.system.jutsuKnown[r.level - 1]))
    .map(r => ({ level: r.level, field: "Jutsu Known", source: r.values[jutsuCol], imported: cls.system.jutsuKnown[r.level - 1] }));
  const rankColumn = headers.findIndex(h => /Highest Rank/i.test(h));
  for ( const row of table ) {
    const rank = row.values[rankColumn]?.match(/[DCBAS](?=-Rank)/i)?.[0].toUpperCase();
    if ( rank && rank !== cls.system.maxRank[row.level - 1] ) tableDifferences.push({ level: row.level, field: "Highest rank", source: rank, imported: cls.system.maxRank[row.level - 1] });
  }
  for ( const column of cls.system.columns ) {
    const index = headers.findIndex(h => norm(h) === norm(column.label));
    if ( index < 0 ) continue;
    for ( const row of table ) {
      const val = row.values[index];
      const numeric = val.match(/^(\d+)d\d+$/)?.[1] ?? val;
      const equivalent = Number(column.values[row.level - 1]) === Number(["", "-", "—"].includes(numeric) ? 0 : numeric);
      if ( !equivalent && String(column.values[row.level - 1]) !== val && String(column.values[row.level - 1]) !== numeric ) {
        tableDifferences.push({ level: row.level, field: column.label, source: val, imported: column.values[row.level - 1] });
      }
    }
  }
  rows.push({ name, identifier: cls.system.identifier, sourceLine: start + 1, core, subclasses, sourceOptions, table, tableDifferences, brokenLinks, levels,
    jutsuKnown: cls.system.jutsuKnown, columns: cls.system.columns, hitDie: cls.system.hitDie, chakraDie: cls.system.chakraDie,
    saves: cls.system.saves, skills: cls.system.skills, tools: cls.system.tools, optionCount: owned.filter(d => d.system.category === "classOption").length,
    options: owned.filter(d => d.system.category === "classOption").map(d => ({ name: d.name, level: d.system.requirement.level, tags: d.system.tags })),
    importedFeatures: owned.filter(d => d.system.category !== "classOption").map(d => ({ name: d.name, level: d.system.requirement.level })) });
}
fs.writeFileSync(path.join(workspace, "inventory.json"), JSON.stringify({ version: manifest.version, source: bookPath, classes: rows }, null, 2));
fs.writeFileSync(path.join(workspace, "installed-documents.json"), JSON.stringify(docs, null, 2));
console.log(JSON.stringify(rows.map(c => ({ name: c.name, coreMissing: c.core?.filter(f => !f.imported).map(f => f.heading),
  subclasses: c.subclasses?.map(s => ({ name: s.name, imported: s.imported, linked: s.offeredByClass, features: s.features.length, linkedFeatures: s.features.filter(f => f.linkedToSubclass).length })),
  brokenLinks: c.brokenLinks?.length, options: c.optionCount, highestClassAdvancement: Math.max(...Object.entries(c.levels ?? {}).filter(([, a]) => a.length).map(([l]) => Number(l))) })), null, 2));
