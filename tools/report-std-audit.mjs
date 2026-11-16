/**
 * STD0 audit (docs/STD_SPEC.md): what is still hard-coded or text-driven, and how much content carries
 * its mechanics as data. Writes docs/generated/std-audit.md.
 *   1. Content names in engine code (the gate's allowlist, tools/check-hardcoding.mjs).
 *   2. Other content-driven code: tests of item names or descriptions, state and condition checks
 *      named in engines, and the text fallback.
 *   3. Coverage per pack: documents with authored activities, Active Effects, rule elements, notes.
 */
import fs from "node:fs";
import path from "node:path";
import { findBranches } from "./check-hardcoding.mjs";
import { ampAuditOf, ampAuditCounts, AMP_AUDIT_STATUSES } from "../module/rules/amp-audit.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const rel = p => path.relative(root, p);

function files(dir, ext) {
  const out = [];
  for ( const e of fs.readdirSync(dir, { withFileTypes: true }) ) {
    const p = path.join(dir, e.name);
    if ( e.isDirectory() ) out.push(...files(p, ext));
    else if ( e.name.endsWith(ext) ) out.push(p);
  }
  return out;
}

const PATTERNS = [
  ["Name or description tests", /\.test\((?:i|item|it|f|s)\.(?:name|system\.description)|\.name\s*===\s*["']|description\)?\.(?:includes|match)\(/],
  ["State checks named in code", /(?:hasState|statuses\?*\.has)\(\s*(?:actor\s*,\s*)?["'](?:crash|flow|fury|furious|combatRival|helped|static|setUp|followUp)["']/],
  ["Condition mechanics named in engines", /["'](?:prone|restrained|blinded|invisible|dodging|squeezing|stunned|petrified|bruised|weakened)["']\s*(?:\)|:|\]|,)/],
  ["Text fallback (description parsed at play time)", /parseActivities\(|effectiveActivities\(/]
];

const hits = PATTERNS.map(([label, re]) => ({ label, rows: [] }));
for ( const f of files(path.join(root, "module"), ".mjs") ) {
  const lines = fs.readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    if ( /^\s*(\*|\/\/)/.test(line) ) return;
    PATTERNS.forEach(([, re], k) => { if ( re.test(line) ) hits[k].rows.push(`${rel(f)}:${i + 1}`); });
  });
}

const coverage = [];
for ( const dir of fs.readdirSync(path.join(root, "packs/_source"), { withFileTypes: true }).filter(d => d.isDirectory()) ) {
  const docs = files(path.join(root, "packs/_source", dir.name), ".json").map(p => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } })
    .filter(d => d && d.type && !d.type.startsWith?.("Folder") && d.system);
  const n = docs.length;
  const has = fn => docs.filter(fn).length;
  const rules = d => [...(d.flags?.n5e?.rules ?? []), ...(d.effects ?? []).flatMap(e => e.flags?.n5e?.rules ?? [])];
  coverage.push({ pack: dir.name, n,
    activities: has(d => (d.system.activities ?? []).length > 0),
    effects: has(d => (d.effects ?? []).length > 0),
    rules: has(d => rules(d).length > 0),
    notes: has(d => rules(d).some(r => r?.key === "note")),
    actionEffects: has(d => (d.effects ?? []).some(e => e.flags?.n5e?.applyTo === "action")) });
}

/**
 * AMP1b: the Amp audit (rules/amp-audit.mjs) over every pack: counts by status, then the candidates
 * still to review, by rank then name (King: document order). The GM dismisses in game; the report
 * shows the scan before dismissals.
 */
function ampSection() {
  const RANKS = ["E", "D", "C", "B", "A", "S"];
  const packs = [];
  for ( const dir of fs.readdirSync(path.join(root, "packs/_source"), { withFileTypes: true }).filter(d => d.isDirectory()) ) {
    const rows = files(path.join(root, "packs/_source", dir.name), ".json").filter(f => !path.basename(f).startsWith("_folder"))
      .map(f => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; } }).filter(d => d?.system)
      .map(d => ({ d, a: ampAuditOf(d) })).filter(x => x.a);
    if ( rows.length ) packs.push({ pack: dir.name, rows });
  }
  const all = packs.flatMap(p => p.rows.map(r => r.a));
  const total = ampAuditCounts(all);
  const statuses = Object.keys(AMP_AUDIT_STATUSES);
  return ["## 4. Amps (AMP1b)", "",
    "A scan for lasting bonuses (King: a bonus to a statistic, ability or action lasting longer than one round). It suggests; King decides in the Automation Audit's Amps view.", "",
    `| Pack | ${statuses.map(s => AMP_AUDIT_STATUSES[s]).join(" | ")} |`, `| --- |${statuses.map(() => " --- |").join("")}`,
    ...packs.map(p => { const c = ampAuditCounts(p.rows.map(r => r.a)); return `| ${p.pack} | ${statuses.map(s => c[s]).join(" | ")} |`; }),
    `| **Total** | ${statuses.map(s => `**${total[s]}**`).join(" | ")} |`, "",
    ...packs.flatMap(p => {
      const cands = p.rows.filter(r => r.a.status === "candidate")
        .sort((x, y) => (RANKS.indexOf(x.d.system.rank ?? "") - RANKS.indexOf(y.d.system.rank ?? ""))
          || String(x.d.folder ?? "").localeCompare(String(y.d.folder ?? "")) || ((x.d.sort ?? 0) - (y.d.sort ?? 0)) || x.d.name.localeCompare(y.d.name));
      return cands.length ? [`### ${p.pack}: ${cands.length} candidates`, "",
        ...cands.map(r => `- ${r.d.system.rank ? `${r.d.system.rank} · ` : ""}**${r.d.name}**: ${r.a.reason.replace(/\|/g, "/")}`), ""] : [];
    })];
}

const branches = findBranches();
const md = [`# STD audit (generated by tools/report-std-audit.mjs)`, "",
  "The contract: no content named in engine code; every mechanic is data a GM can open in game (docs/STD_SPEC.md).", "",
  "## 1. Content names in engine code (the gate's allowlist)", "",
  "| File | Content names |", "| --- | --- |",
  ...Object.entries(branches).map(([f, names]) => `| \`${f}\` | ${names.join(", ")} |`),
  "", `${Object.values(branches).flat().length} names in ${Object.keys(branches).length} files. \`npm run check\` fails on any new one.`, "",
  "## 2. Other content-driven code", "",
  ...hits.flatMap(h => [`### ${h.label} (${h.rows.length})`, "", ...(h.rows.length ? h.rows.map(r => `- \`${r}\``) : ["- none"]), ""]),
  "## 3. Coverage per pack", "",
  "| Pack | Documents | Activities | Active Effects | Rule elements | Notes | Action effects |", "| --- | --- | --- | --- | --- | --- | --- |",
  ...coverage.map(c => `| ${c.pack} | ${c.n} | ${c.activities} | ${c.effects} | ${c.rules} | ${c.notes} | ${c.actionEffects} |`), "",
  ...ampSection()];
fs.mkdirSync(path.join(root, "docs/generated"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/generated/std-audit.md"), md.join("\n"));
console.log(`std-audit.md: ${Object.values(branches).flat().length} content names, ${hits.map(h => `${h.label.split(" ")[0]} ${h.rows.length}`).join(", ")}`);
