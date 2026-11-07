/**
 * Level-up steps against the imported content: Scout-Nin (Assault Scout) and Ninjutsu Specialist
 * (Blaze Walker), levels 1-5. Choices are applied the way the manager does it, then the actor is
 * rebuilt to check what the character ends up with.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeActor, baseAbilities } from "./helpers/actor.mjs";
import { stepsForLevel, subclassSteps, learnableJutsu, eligibleFeats, masteryTargets, validate } from "../module/advancement/steps.mjs";
import N5E from "../module/config/index.mjs";

const SRC = path.join(import.meta.dirname, "..", "packs", "_source");
const all = {};
for ( const pack of fs.readdirSync(SRC) ) {
  for ( const f of fs.readdirSync(path.join(SRC, pack)) ) {
    const d = JSON.parse(fs.readFileSync(path.join(SRC, pack, f), "utf8"));
    all[`Compendium.n5e.${pack}.Item.${d._id}`] = { ...d, uuid: `Compendium.n5e.${pack}.Item.${d._id}` };
  }
}
const byName = n => Object.values(all).find(d => d.name === n);
const clone = d => structuredClone(d);

/** Play levels 1..n of a class, picking the first options each time. Returns {actor, log}. */
function play(className, upTo, pick = {}) {
  const cls = clone(byName(className));
  cls.system.levels = 1;
  const sources = [cls];
  const extra = { mastery: { sources: [] }, abilities: structuredClone(baseAbilities.abilities) };
  const log = {};
  const build = () => makeActor({ name: "Tester", system: { ...extra }, items: sources });
  for ( let level = 1; level <= upTo; level++ ) {
    cls.system.levels = level;
    let actor = build();
    const sub = sources.find(s => s.type === "subclass");
    const subDoc = sub ? actor.items.find(i => i.type === "subclass") : null;
    const clsDoc = actor.items.find(i => i.type === "class");
    let steps = stepsForLevel({ actor, cls: clsDoc, subclass: subDoc, level });
    const sel = {};
    for ( const st of steps ) {
      if ( st.type === "subclass" ) {
        sel[st.id] = [st.uuids[0]];
        const sc = clone(all[st.uuids[0]]);
        sources.push(sc);
        actor = build();
        steps = [...steps, ...subclassSteps(actor.items.find(i => i.type === "subclass"), level)];
      }
    }
    const owned = new Set(sources.map(s => s.name.toLowerCase()));
    for ( const st of steps ) {
      if ( st.type === "itemChoice" ) {
        const options = st.uuids.filter(u => !owned.has(all[u].name.toLowerCase()));
        const wanted = pick[st.key] ?? [];
        sel[st.id] = [...wanted.map(n => options.find(u => all[u].name === n)).filter(Boolean), ...options].slice(0, st.count);
        sel[st.id] = [...new Set(sel[st.id])].slice(0, st.count);
      } else if ( st.type === "option" || st.type === "trait" ) {
        sel[st.id] = st.options.slice(0, st.count).map(o => o.value);
      } else if ( st.type === "jutsu" ) {
        const affinities = new Set(actor.system.grants.affinities);
        for ( const g of steps ) if ( g.type === "grant" && g.key === "affinity" ) g.values.forEach(v => affinities.add(v));
        const learn = learnableJutsu(Object.values(all).filter(d => d.type === "jutsu"),
          { maxRank: st.maxRank, affinities, known: new Set(sources.filter(s => s.type === "jutsu").map(s => s.name.toLowerCase())), keywords: N5E.keywords });
        sel[st.id] = learn.slice(0, st.count).map(j => j.uuid);
      } else if ( st.type === "asi" ) {
        const feats = eligibleFeats(Object.values(all).filter(d => d.type === "feat"), { level, owned });
        sel[st.id] = { ability: "int", feat: feats[0]?.uuid, mastery: masteryTargets(actor)[0]?.value };
      }
    }
    const pool = {};
    for ( const st of steps ) {
      if ( st.type === "itemChoice" ) pool[st.id] = st.uuids.filter(u => !owned.has(all[u].name.toLowerCase())).length;
      if ( st.type === "jutsu" ) pool[st.id] = sel[st.id].length;
    }
    log[level] = { steps, sel, problems: validate(steps, sel, pool) };
    // Apply (same semantics as module/advancement/manager.mjs).
    for ( const st of steps ) {
      const v = sel[st.id];
      if ( st.type === "feature" ) sources.push(...st.uuids.map(u => clone(all[u])));
      if ( st.type === "itemChoice" || st.type === "jutsu" ) sources.push(...v.map(u => clone(all[u])));
      if ( st.type === "trait" && st.id === "class:skills" ) cls.system.skills.chosen = v;
      if ( st.type === "trait" && st.id === "class:tools" ) cls.system.tools.chosen = v;
      if ( st.type === "option" || st.type === "itemChoice" ) {
        const owner = st.origin === "subclass" ? sources.find(s => s.type === "subclass") : cls;
        owner.system.advancement.find(a => a.id === st.advId).chosen = v;
      }
      if ( st.type === "asi" ) {
        extra.abilities[v.ability].value += 1;
        if ( v.mastery ) extra.mastery.sources.push({ target: v.mastery, source: `ASI ${level}` });
        if ( v.feat ) sources.push(clone(all[v.feat]));
      }
    }
  }
  return { actor: build(), log, sources };
}

test("content: both classes, subclasses, options, stances, feats, jutsu imported", () => {
  const types = Object.values(all).reduce((m, d) => ({ ...m, [d.type]: (m[d.type] ?? 0) + 1 }), {});
  assert.ok(types.stance >= 24);
  assert.ok(Object.values(all).filter(d => d.system.tags?.includes?.("nin-molding")).length === 15);
  assert.ok(Object.values(all).filter(d => d.system.tags?.includes?.("assault-maneuver")).length >= 10);
  assert.equal(Object.values(all).filter(d => d.system.tags?.includes?.("scout-path")).length, 6);
  assert.equal(Object.values(all).filter(d => d.type === "feat" && ["general", "skill", "ninjutsu", "taijutsu", "genjutsu"].includes(d.system.category)).length, 4);
  const gen = Object.values(all).filter(d => d.flags?.n5e?.generated && d.type === "jutsu");
  assert.deepEqual(["nin", "tai", "gen"].map(k => gen.filter(j => j.system.discipline === k).length), [4, 3, 3]);
  for ( const d of Object.values(all) ) {
    for ( const a of d.system.advancement ?? [] ) {
      for ( const u of a.uuids ) if ( u.startsWith("Compendium.") ) assert.ok(all[u], `${d.name}: ${a.title} -> ${u} exists`);
    }
    for ( const u of d.system.subclasses ?? [] ) assert.ok(all[u], `${d.name} subclass ${u}`);
  }
});

test("Scout-Nin 1-5 with Assault Scout", () => {
  const { actor, log } = play("Scout-Nin", 5, { "scout-path": ["Path of the Swift"], stance: ["Iron Fist Stance"] });
  for ( const [lvl, l] of Object.entries(log) ) assert.deepEqual(l.problems, [], `level ${lvl}`);
  const t = l => log[l].steps.map(s => s.type);
  assert.deepEqual(t(1), ["pools", "trait", "trait", "feature", "itemChoice", "itemChoice", "jutsu"]);
  assert.equal(log[1].steps.find(s => s.id === "class:skills").count, 4);
  assert.equal(log[1].steps.find(s => s.type === "jutsu").count, 6);
  assert.ok(t(2).includes("option"), "Switch Hitter primary");
  assert.ok(t(3).includes("subclass"));
  assert.equal(log[3].steps.find(s => s.title === "Assault Maneuvers").count, 2);
  assert.ok(t(4).includes("asi"));
  assert.equal(log[5].steps.find(s => s.title === "Assault Maneuvers").count, 1);
  assert.equal(log[1].steps[0].hp, 10 + 8 + 2, "10 + d8 max + Con at 1st");
  assert.equal(log[2].steps[0].hp, 8 + 2);
  const sys = actor.system;
  assert.equal(sys.level, 5);
  assert.equal(sys.hp.max, 10 + 5 * (8 + 2));
  assert.ok(actor.items.some(i => i.name === "Path of the Swift"));
  assert.ok(actor.items.some(i => i.name === "Iron Fist Stance"));
  assert.ok(actor.items.some(i => i.name === "Superior Assault"));
  assert.equal(actor.items.filter(i => i.system.tags?.has?.("assault-maneuver")).length, 3);
  assert.equal(sys.resources.superiorityDice.maxValue, 4, "Superiority Dice column at 5th");
  assert.equal(sys.resources.superiorityDice.value, 4);
  assert.equal(sys.abilities.int.value, 11, "ASI +1");
  assert.equal(actor.items.filter(i => i.type === "skill" || (i.type === "feat" && ["general", "skill", "ninjutsu", "taijutsu", "genjutsu"].includes(i.system.category))).length, 1, "ASI feat");
  assert.equal([...sys.grants.skills].length, 4);
  assert.equal(actor.items.filter(i => i.type === "jutsu").length, 9, "Jutsu Known 9 at 5th (pool permitting)");
});

test("Ninjutsu Specialist 1-5 with Blaze Walker", () => {
  const { actor, log } = play("Ninjutsu Specialist", 5);
  for ( const [lvl, l] of Object.entries(log) ) assert.deepEqual(l.problems, [], `level ${lvl}`);
  assert.equal(log[1].steps.find(s => s.title === "Moldings").count, 2);
  assert.equal(log[1].steps.find(s => s.title === "Chakra Stance").uuids.length, 7);
  assert.ok(log[2].steps.some(s => s.type === "subclass"));
  assert.ok(log[2].steps.some(s => s.type === "grant" && s.key === "affinity" && s.values[0] === "fire"));
  assert.equal(log[4].steps.find(s => s.title === "Moldings").count, 1);
  const sys = actor.system;
  assert.ok(sys.grants.affinities.has("fire"), "Blaze Walker grants Fire Release");
  assert.equal(sys.resources.focus.maxValue, 1 + sys.prof);
  assert.equal(sys.resources.pyroclasm.maxValue, 3);
  assert.equal(sys.resources.pyroclasm.value, 0, "Pyroclasm starts empty");
  assert.equal(sys.skills.nin.mastery, 1, "Scholar: Ninshou Mastery");
  assert.equal(actor.items.filter(i => i.system.tags?.has?.("nin-molding")).length, 3);
  assert.ok(actor.items.some(i => i.type === "stance" && i.system.categories.has("chakra")));
  const jutsu = actor.items.filter(i => i.type === "jutsu");
  assert.ok(jutsu.some(j => j.system.keywords.has("fireRelease")), "fire jutsu learnable after Blaze Walker");
  assert.equal(sys.hp.max, 10 + 5 * (6 + 2));
  assert.equal(sys.cp.max, 10 + 5 * (12 + 2));
});

test("jutsu pool: rank cap and affinity gate", () => {
  const jutsu = Object.values(all).filter(d => d.type === "jutsu");
  const noFire = learnableJutsu(jutsu, { maxRank: "D", affinities: new Set(), known: new Set(), keywords: N5E.keywords });
  assert.ok(!noFire.some(j => j.system.keywords.includes("fireRelease")));
  const eOnly = learnableJutsu(jutsu, { maxRank: "E", affinities: new Set(["fire"]), known: new Set(), keywords: N5E.keywords });
  assert.ok(eOnly.every(j => j.system.rank === "E"));
});
