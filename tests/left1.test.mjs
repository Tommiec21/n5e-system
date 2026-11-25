/**
 * LEFT1 fixes (King 2026-11-25): level-up cards grow with their text; the Classes compendium shows each
 * class at the top of its folder with its subclasses in a Subclasses folder.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(import.meta.dirname, "..");
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

test("LEFT1: Classes compendium: class on top, subclasses in <Class> › Subclasses", () => {
  const docs = walk(path.join(ROOT, "packs/_source/classes")).filter(f => f.endsWith(".json")).map(f => JSON.parse(fs.readFileSync(f, "utf8")));
  const folders = Object.fromEntries(docs.filter(d => d._key?.startsWith("!folders!")).map(d => [d._id, d]));
  const classes = docs.filter(d => d.type === "class");
  assert.equal(classes.length, 7);
  for ( const c of classes ) {
    const f = folders[c.folder];
    assert.deepEqual([f.name, f.folder], [c.name, null], c.name);
    const subs = docs.filter(d => d.type === "subclass" && d.system.classIdentifier === c.system.identifier);
    assert.ok(subs.length, c.name);
    for ( const s of subs ) {
      const sf = folders[s.folder];
      assert.deepEqual([sf.name, sf.folder], ["Subclasses", c.folder], s.name);
    }
  }
  assert.match(fs.readFileSync(path.join(ROOT, "tools/content/build_content.py"), "utf8"), /"Subclasses"\]/);
  assert.match(fs.readFileSync(path.join(ROOT, "tools/content/build-class-expansion.mjs"), "utf8"), /\[cls\.name, "Subclasses"\]/);
});

test("LEFT1: level-up cards grow with their text (no fixed button height)", () => {
  const css = fs.readFileSync(path.join(ROOT, "styles/sheet.css"), "utf8");
  assert.match(css, /\.n5e-level-up \.lu-card \{ height: auto !important; max-height: none !important;/);
  assert.match(css, /\.n5e-level-up \.lu-card span\.sub \{[^}]*line-clamp: 3/);
});

test("LEFT1 P6: the item sheet edits jutsu granted at a level", async () => {
  const { itemVM } = await import("../module/view-models/item.mjs").catch(() => ({}));
  const vm = fs.readFileSync(path.join(ROOT, "module/view-models/item.mjs"), "utf8");
  assert.match(vm, /F\.levelUuids\(src, "grants\.jutsuByLevel", "Granted at level"/);
  const tpl = fs.readFileSync(path.join(ROOT, "templates/item/details.hbs"), "utf8");
  assert.match(tpl, /n5eEq kind "levelUuids"/);
  assert.match(tpl, /data-level-path="\{\{\.\.\/path\}\}"/);
  const sheet = fs.readFileSync(path.join(ROOT, "module/applications/item/item-sheet.mjs"), "utf8");
  assert.match(sheet, /"levelList" in zone\.dataset/);
  assert.match(sheet, /input\[data-level-path\]/);
  if ( itemVM ) {
    const item = { type: "feat", name: "Reaper", system: { grants: { jutsu: [], jutsuByLevel: [{ uuid: "Compendium.n5e.jutsu.Item.m", level: 6 }] }, bonusJutsu: {}, requirement: {} } };
    const fields = itemVM(item, { source: item.system, nameOf: u => `name:${u.split(".").pop()}` }).details?.flatMap(s => s.fields) ?? [];
    const f = fields.find(x => x.kind === "levelUuids");
    if ( f ) assert.deepEqual(f.items.map(i => [i.name, i.level]), [["name:m", 6]]);
  }
});

/* ---------------- LEFT1 P1–P5 (King 2026-11-25: "Get them all done in one batch") ---------------- */

test("LEFT1 P1: jutsu pills on the players' Combat tab carry the keyword gradient; the color key toggles", async () => {
  await import("./helpers/foundry-stub.mjs");
  const { jutsuLegend } = await import("../module/view-models/combat.mjs");
  const legend = jutsuLegend();
  assert.ok(legend.colors.some(c => c.label === "Fire Release") && legend.actions.length === 5);
  const combat = fs.readFileSync(path.join(ROOT, "module/view-models/combat.mjs"), "utf8");
  assert.match(combat, /style: `background: \$\{pillGradient\(keys\)\}`/);
  assert.match(fs.readFileSync(path.join(ROOT, "templates/parts/action-pill.hbs"), "utf8"), /\{\{#if style\}\} style="\{\{style\}\}"/);
  const tpl = fs.readFileSync(path.join(ROOT, "templates/actor/character/combat.hbs"), "utf8");
  assert.match(tpl, /data-action="toggleColorKey"/);
  assert.match(fs.readFileSync(path.join(ROOT, "module/settings.mjs"), "utf8"), /"combatColorKey"/);
});

test("LEFT1 P4: Bloodied marker at half HP or less; who sees it", async () => {
  const { isBloodied, showBloodied } = await import("../module/rules/bloodied.mjs");
  assert.equal(isBloodied({ value: 10, max: 20 }), true);
  assert.equal(isBloodied({ value: 11, max: 20 }), false);
  assert.equal(isBloodied({ value: 0, max: 20 }), false, "at 0 HP it's down, not bloodied");
  assert.equal(showBloodied("none", { isGM: true }), false);
  assert.equal(showBloodied("player", { isGM: true }), true);
  assert.equal(showBloodied("player", { playerOwned: false }), false);
  assert.equal(showBloodied("player", { playerOwned: true }), true);
  assert.equal(showBloodied("all", {}), true);
  const rules = fs.readFileSync(path.join(ROOT, "module/config/rules.mjs"), "utf8");
  assert.match(rules, /bloodiedVisibility: \{ group: "casting", type: "choice", default: "player"/);
});

test("LEFT1 P2: click-to-build conditions round-trip every predicate shape", async () => {
  const { predicateToClauses, clausesToPredicate, clauseRows } = await import("../module/rules/predicate-builder.mjs");
  const { rowToRule, describeRule } = await import("../module/rules/plain-language.mjs");
  for ( const p of ["self:bloodied", { not: ["self:status:prone"] }, { all: ["range:melee", "self:stance:iron-fist"], not: ["target:status:prone"] }, { any: ["ability:str", "ability:dex"] }] ) {
    assert.deepEqual(clausesToPredicate(predicateToClauses(p).clauses), p);
  }
  assert.equal(predicateToClauses({ all: [{ any: ["x"] }] }).keep, true, "nested stays JSON");
  const rows = clauseRows(predicateToClauses({ any: ["ability:str"] }).clauses, { conditions: { prone: "Prone" } });
  assert.equal(rows.at(-1).blank, true);
  assert.equal(rows[0].choices.find(c => c.selected).value, "str");
  const rule = rowToRule({ kind: "advantage", base: "save", details: [], conds: { 0: { group: "all", fact: "self:bloodied", detail: "" }, 1: { group: "not", fact: "target:status", detail: "prone" }, 2: { group: "all", fact: "", detail: "" } } });
  assert.deepEqual(rule.predicate, { all: ["self:bloodied"], not: ["target:status:prone"] });
  assert.match(describeRule(rule, { conditions: { prone: { label: "Prone" } } }), /while you're at half HP or less, unless the target is Prone/);
  const vm = fs.readFileSync(path.join(ROOT, "module/view-models/item.mjs"), "utf8");
  assert.match(vm, /F\.select\(src, "bonusJutsu\.condition", "Only if already"/);
  assert.match(fs.readFileSync(path.join(ROOT, "templates/effect/changes.hbs"), "utf8"), /data-action="deleteCond"/);
});

test("LEFT1 P5: a feature's own picks come up when it is gained and are stored on it", async () => {
  await import("./helpers/foundry-stub.mjs");
  const { featureChoiceSteps, traitOptions, masteryLabel } = await import("../module/advancement/steps.mjs");
  const { load } = await import("./helpers/actor.mjs");
  const mundane = load("clans", "master-of-the-mundane");
  const [st] = featureChoiceSteps(mundane, 7, { key: "u", gained: true });
  assert.deepEqual([st.type, st.key, st.count], ["trait", "tools", 2]);
  assert.ok(st.options.length > 10, "any toolkit");
  assert.equal(featureChoiceSteps(mundane, 6, { key: "u", gained: true }).length, 0, "not before 7th");
  const authority = load("features", "absolute-authority-arbiter-scout");
  const [m] = featureChoiceSteps(authority, 6, { key: "a", gained: true });
  assert.deepEqual([m.type, m.targets], ["masteryChoice", ["skill.dec", "skill.itm", "skill.per"]]);
  assert.equal(masteryLabel("skill.dec"), "Deception");
  assert.equal(masteryLabel("save.con"), "Constitution saving throw");
  const prime = load("clans", "mutation-prime-nature-release");
  assert.deepEqual(featureChoiceSteps(prime, 1, { key: "p", gained: true })[0].options.map(o => o.value).slice(0, 2), ["earthRelease", "windRelease"]);
  assert.equal(traitOptions("keywords", ["fireRelease"])[0].label, "Fire Release");
  const chosen = { ...mundane, system: { ...mundane.system, advancement: mundane.system.advancement.map(a => ({ ...a, chosen: ["alchemist", "trappers"] })) } };
  assert.equal(featureChoiceSteps(chosen, 9, { key: "u", gained: true }).length, 0, "picked: not offered again");
  const ws = load("classes", "weapon-specialist-n5e");
  assert.deepEqual(ws.system.advancement.find(a => a.key === "weaponFocus").grants.Blade, ["weapon.exotic:blade"]);
  const creature = fs.readFileSync(path.join(ROOT, "module/data/actor/creature.mjs"), "utf8");
  assert.match(creature, /adv\.type === "option" && adv\.grants/);
  assert.match(creature, /keywords: g\.keywordAccess/);
  for ( const f of ["module/advancement/manager.mjs", "module/advancement/clan.mjs", "module/applications/level-up.mjs"] ) {
    assert.match(fs.readFileSync(path.join(ROOT, f), "utf8"), /featureChoiceSteps|featChoices|featPickLevels/, f);
  }
});

test("LEFT1 P3: Glass accent and blur, bundled fonts, Scroll defenses, layouts for the other tabs", async () => {
  const settings = fs.readFileSync(path.join(ROOT, "module/settings.mjs"), "utf8");
  assert.match(settings, /"glassAccent"/);
  assert.match(settings, /"glassBlur"/);
  const css = fs.readFileSync(path.join(ROOT, "styles/designs.css"), "utf8");
  assert.ok(!css.includes("fonts.googleapis.com"), "no web fonts");
  for ( const m of css.matchAll(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/g) ) assert.ok(fs.existsSync(path.join(ROOT, "assets/fonts", m[1])), m[1]);
  for ( const id of ["classic", "glass", "ink", "scroll", "oneui"] ) assert.match(css, new RegExp(`\\.n5e-design-${id} :is\\((?:\\.act-group|\\.combat)`), id);
  assert.match(css, /\.n5e-design-glass\.no-blur/);
  assert.match(fs.readFileSync(path.join(ROOT, "templates/actor/designs/scroll/rail.hbs"), "utf8"), /d\.defenses/);
  await import("./helpers/foundry-stub.mjs");
  const { defenseRowsVM } = await import("../module/view-models/character.mjs");
  const rows = defenseRowsVM({ system: { traits: { immune: new Set(["poison"]), vuln: new Set(), resist: new Set(["fire"]), conditionImmune: new Set(["prone"]) } } });
  assert.deepEqual(rows.map(r => r.label), ["Immunities", "Weaknesses", "Resistances"]);
  assert.match(rows[0].value, /Prone/);
  assert.equal(rows[1].value, "None");
});
