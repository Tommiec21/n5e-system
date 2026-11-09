/** Pure clan setup choices and grant planning. No document writes. */
import { abilities, skills } from "../config/core.mjs";
import { affinities } from "../config/jutsu.mjs";

const list = value => Array.from(value ?? []);
export function clanSetupFields(actor, clan, documents) {
  const level = Math.max(1, actor.system.level ?? 1);
  const skillOptions = Object.keys(skills).filter(k => !actor.system.skills?.[k]?.isProficient);
  const fields = [];
  for ( const [i, key] of list(clan.system.skills.fixed).entries() ) {
    fields.push({ id: `fixed-${i}`, label: actor.system.skills?.[key]?.isProficient ? `Replace duplicate ${skills[key].label}` : skills[key].label,
      options: (actor.system.skills?.[key]?.isProficient ? skillOptions : [key]).map(value => ({ value, label: skills[value].label })), kind: "skill", count: 1 });
  }
  for ( let i = 0; i < clan.system.skills.choose; i++ ) {
    const from = list(clan.system.skills.from);
    fields.push({ id: `skill-${i}`, label: "Clan skill proficiency", options: (from.length ? from : Object.keys(skills)).map(value => ({ value, label: skills[value].label })), kind: "skill", count: 1 });
  }
  for ( let i = 0; i < clan.system.affinities.choose; i++ ) fields.push({ id: `affinity-${i}`, label: "Nature affinity",
    options: list(clan.system.affinities.from).map(value => ({ value, label: affinities[value] ?? value })), kind: "affinity", count: 1 });
  if ( clan.system.branches.size || clan.system.branches.length ) fields.push({ id: "branch", label: "Clan branch", options: list(clan.system.branches).map(value => ({ value, label: value === "main" ? "Main Branch" : "Side Branch" })), kind: "branch", count: 1 });
  for ( const adv of clan.system.advancement ) {
    if ( adv.level > level || !["itemChoice", "featChoice"].includes(adv.type) ) continue;
    const pool = adv.type === "featChoice" ? documents.filter(d => d.type === "feat" && !["classFeature", "classOption", "clanFeature", "clanOption", "backgroundFeature", "npcFeature"].includes(d.system.category)
      && (d.system.requirement?.level ?? 0) <= level && (!d.system.requirement?.clan || d.system.requirement.clan === clan.system.identifier)
      && !actor.items.some(i => i.type === "feat" && i.name === d.name)) : list(adv.uuids).map(uuid => documents.find(d => d.uuid === uuid)).filter(Boolean);
    fields.push({ id: adv.id, label: `${adv.title} (level ${adv.level})`, kind: "itemChoice", count: adv.count, level: adv.level, branch: adv.branch,
      options: pool.map(d => ({ value: d.uuid, label: d.name })) });
  }
  if ( clan.system.identifier === "non-clan" ) {
    fields.push({ id: "self-taught", label: "Self-Taught Skills: proficient skills only", kind: "mastery", count: 2, options: Object.entries(skills).map(([value, d]) => ({ value, label: d.label })) });
  }
  return fields;
}

export function clanSetupPlan(actor, clan, fields, selection, documents) {
  const errors = [], selectedSkills = [], selectedAffinities = [], grants = [], mastery = [];
  const branch = selection.choices.branch?.[0] ?? "";
  const seen = new Set();
  for ( const field of fields ) {
    if ( field.branch && field.branch !== branch ) continue;
    const values = selection.choices[field.id] ?? [];
    if ( values.length !== field.count || new Set(values).size !== values.length || values.some(v => !field.options.some(o => o.value === v)) ) {
      errors.push(`${field.label}: choose ${field.count} different permitted options.`); continue;
    }
    if ( field.kind === "skill" ) selectedSkills.push(...values);
    if ( field.kind === "affinity" ) selectedAffinities.push(...values);
    if ( field.kind === "mastery" ) mastery.push(...values.map(v => `skill.${v}`));
    if ( field.kind === "itemChoice" ) for ( const uuid of values ) {
      const doc = documents.find(d => d.uuid === uuid);
      if ( seen.has(uuid) && !doc?.flags?.n5e?.repeatable ) errors.push(`${doc?.name}: cannot select the same option again.`);
      seen.add(uuid); grants.push({ doc, level: field.level });
    }
  }
  if ( new Set(selectedSkills).size !== selectedSkills.length ) errors.push("Clan proficiencies must be different skills.");
  for ( const target of mastery ) {
    const key = target.split(".")[1];
    if ( !selectedSkills.includes(key) && !actor.system.skills?.[key]?.isProficient ) errors.push("Self-Taught Skills requires a proficient skill.");
  }
  const chosenAbilities = selection.mode === "three" ? selection.abilities.slice(0, 3) : selection.abilities.slice(0, 2);
  if ( chosenAbilities.length !== (selection.mode === "three" ? 3 : 2) || chosenAbilities.some(k => !abilities[k]) || new Set(chosenAbilities).size !== chosenAbilities.length ) errors.push("Choose different abilities for the clan increases.");
  if ( selection.mode === "three" && clan.system.identifier !== "non-clan" ) errors.push("Only Non-Clan offers the three-ability alternative.");
  const increments = Object.fromEntries(chosenAbilities.map((key, i) => [key, selection.mode === "three" ? 1 : i === 0 ? 2 : 1]));
  for ( const adv of clan.system.advancement ) {
    if ( adv.level > Math.max(1, actor.system.level ?? 1) || (adv.branch && adv.branch !== branch) || adv.type !== "feature" ) continue;
    for ( const uuid of adv.uuids ) {
      const doc = documents.find(d => d.uuid === uuid);
      if ( !doc ) errors.push(`Missing clan grant: ${uuid}`);
      else grants.push({ doc, level: adv.level });
    }
  }
  for ( const grant of [...grants] ) for ( const uuid of grant.doc?.flags?.n5e?.grants ?? [] ) {
    const doc = documents.find(d => d.uuid === uuid);
    if ( !doc ) errors.push(`Missing linked clan grant: ${uuid}`);
    else if ( !grants.some(g => g.doc.uuid === uuid) ) grants.push({ doc, level: grant.level });
  }
  return { errors, selectedSkills, selectedAffinities, branch, increments, grants, mastery };
}
