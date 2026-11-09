/** Background selection rules, independent of Foundry dialogs and document writes. */
import { skills, toolkits } from "../config/core.mjs";

export const backgroundPacks = {
  captain: { label: "Captain’s Pack", contents: "Radio Link and 5 receivers, Compass, Recording Scroll, Blank Map Scroll, Empty Book, writing utensils, Commoner’s clothes, Shinobi Waist Bag." },
  explorer: { label: "Explorer’s Pack", contents: "Shinobi Backpack, Grappling Hook, 50 feet of Rope (sealed inside Item Scroll), Recording Scroll, 5 Glow Rods, 3 Heating Pads, Commoners Clothes, Bedroll (Sealed inside Item Scroll)." },
  infiltrator: { label: "Infiltrator’s Pack", contents: "1 Hacker, Security Kit or Disguise Kit (pick one), 1 Blank Keycards, 1 Blank Data Scroll, Shinobi Waist Bag." },
  crafter: { label: "Crafter’s Pack", contents: "3 Toolkits (pick three)." },
  medic: { label: "Field Medic Pack", contents: "Medicine Kit, First Aid kit, Bedroll (Sealed inside Item Scroll), Shinobi Belt Pouch, Shinobi Leg Pouch, Commoners clothes." },
  battler: { label: "Battlers Pack", contents: "3 Explosive Tags, 2 Flash Tags, 2 Smoke Bombs, 1 Shinobi Leg Pouch, Bedroll, Caltrops, Commoner clothes." },
  traveler: { label: "Traveler’s Pack", contents: "Referenced by Chapter 3, but not defined in Chapter 5’s Equipment Packs list. Ask the GM to define its contents; none are invented here." }
};

export function backgroundSkillSlots(background, proficient = new Set()) {
  const config = background.flags.n5e.background;
  const available = Object.keys(skills).filter(k => !proficient.has(k));
  return [
    ...[...(background.system.skills ?? [])].map(k => ({ label: proficient.has(k) ? `Replace duplicate ${skills[k].label}` : skills[k].label,
      options: proficient.has(k) ? available : [k] })),
    ...Array.from({ length: config.skillChoices.count }, () => ({ label: "Choose a skill (replace duplicates if needed)",
      options: config.skillChoices.from.some(k => proficient.has(k)) ? available : config.skillChoices.from }))
  ];
}

export function validateBackgroundSelection(background, slots, selection, proficientTools = new Set(), proficientSkills = new Set()) {
  const config = background.flags.n5e.background;
  if ( selection.skills.length !== 2 || new Set(selection.skills).size !== 2
    || slots.some((s, i) => !s.options.includes(selection.skills[i])) ) return "Choose two different permitted skills.";
  const chosen = selection.skills.slice([...(background.system.skills ?? [])].length);
  const replacements = config.skillChoices.from.filter(k => proficientSkills.has(k)).length;
  if ( chosen.filter(k => !config.skillChoices.from.includes(k)).length > replacements ) return "Only duplicate skill proficiencies may be replaced.";
  const originalTools = background.system.tool ? [background.system.tool] : config.toolChoices;
  const duplicate = originalTools.some(k => proficientTools.has(k));
  const allowedTools = duplicate ? Object.keys(toolkits).filter(k => !proficientTools.has(k)) : originalTools;
  if ( !allowedTools.includes(selection.tool) ) return "Choose a permitted toolkit proficiency.";
  if ( !config.equipmentPacks.includes(selection.pack) ) return "Choose one of this background’s equipment packs.";
  if ( selection.pack === "infiltrator" && !["hackers", "security", "disguise"].includes(selection.packTools[0]) ) return "Choose an Infiltrator toolkit.";
  if ( selection.pack === "crafter" && (selection.packTools.length !== 3 || selection.packTools.some(k => !toolkits[k])) ) return "Choose three Crafter toolkits.";
  return null;
}
