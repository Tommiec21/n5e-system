import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeActor } from "./helpers/actor.mjs";
import { backgroundSkillSlots, validateBackgroundSelection } from "../module/rules/backgrounds.mjs";
import { eligibleFeats } from "../module/advancement/steps.mjs";
import { addBackground } from "../module/workflow/background.mjs";

const root = path.resolve(import.meta.dirname, "../packs/_source/backgrounds");
const docs = fs.readdirSync(root, { recursive: true }).filter(f => f.endsWith(".json"))
  .map(f => JSON.parse(fs.readFileSync(path.join(root, f), "utf8")));
const backgrounds = docs.filter(d => d.type === "background");
const byName = name => backgrounds.find(d => d.name === name);

test("all 16 backgrounds have unique IDs, nested folders and resolvable grants", () => {
  assert.equal(backgrounds.length, 16);
  assert.equal(new Set(docs.map(d => d._id)).size, docs.length);
  const folders = new Map(docs.filter(d => d._key.startsWith("!folders!")).map(d => [d._id, d]));
  for ( const bg of backgrounds ) {
    assert.equal(folders.get(bg.folder).name, bg.name);
    assert.equal(folders.get(folders.get(bg.folder).folder).name, "Backgrounds");
    assert.ok(bg.system.description.includes("Equipment"));
    assert.ok(bg.system.feature.length > 100);
    assert.equal(bg.system.advancement.some(a => a.type === "asi"), false);
    const config = bg.flags.n5e.background;
    assert.equal(config.featureUuids.length, 2);
    for ( const uuid of [...config.featureUuids, config.equipmentUuid] ) {
      const doc = docs.find(d => d._id === uuid.split(".").at(-1));
      assert.ok(doc, uuid);
      assert.equal(folders.get(doc.folder).folder, bg.folder);
    }
  }
});

test("fixed background grants apply through the actor schema; no ASI or mastery is added", () => {
  const actor = makeActor({ items: [byName("Advisor")] });
  assert.equal(actor.system.skills.per.isProficient, true);
  assert.equal(actor.system.skills.his.isProficient, true);
  assert.equal(actor.system.tools.forensics.isProficient, true);
  assert.equal(actor.system.skills.per.mastery, 0);
});

test("Genius and duplicate proficiencies validate choices without granting extra skills", () => {
  const bg = byName("Genius");
  const selection = { skills: ["nin", "mar"], tool: "forensics", pack: "captain", packTools: [] };
  assert.equal(validateBackgroundSelection(bg, backgroundSkillSlots(bg), selection), null);
  assert.ok(validateBackgroundSelection(bg, backgroundSkillSlots(bg), { ...selection, skills: ["nin", "nin"] }));
  const proficient = new Set(["nin"]);
  assert.equal(validateBackgroundSelection(bg, backgroundSkillSlots(bg, proficient), { ...selection, skills: ["ste", "mar"] }, new Set(), proficient), null);
  assert.ok(validateBackgroundSelection(bg, backgroundSkillSlots(bg, proficient), { ...selection, skills: ["ste", "acr"] }, new Set(), proficient));
  const advisor = byName("Advisor");
  assert.ok(backgroundSkillSlots(advisor, new Set(["per"]))[0].options.includes("ste"));
});

test("background features cannot be selected as ordinary level-up feats", () => {
  const features = docs.filter(d => d.type === "feat");
  assert.equal(eligibleFeats(features, { level: 20, owned: new Set() }).length, 0);
});

test("cancelling setup never writes or removes an existing background", async () => {
  const previous = globalThis.game;
  const previousUi = globalThis.ui;
  const previousDialog = foundry.applications;
  globalThis.game = { packs: new Map(), items: [] };
  globalThis.ui = { notifications: { info() {}, warn() {} } };
  foundry.applications = { api: { DialogV2: { wait: async () => "cancel" } } };
  let writes = 0;
  try {
    const actor = { isOwner: true, items: [], system: { skills: {}, tools: {}, level: 1 },
      createEmbeddedDocuments: async () => { writes++; }, deleteEmbeddedDocuments: async () => { writes++; } };
    assert.equal(await addBackground(actor, byName("Advisor")), null);
    assert.equal(writes, 0);
  } finally { globalThis.game = previous; globalThis.ui = previousUi; foundry.applications = previousDialog; }
});
