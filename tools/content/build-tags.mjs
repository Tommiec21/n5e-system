/**
 * Build the two sealing tags FIN2b automates (Chapter 5 "Sealing tools"): Counter Tag (D–A) and
 * Chakra Suppression Tag (C–A). One consumable per rank in a "Sealing Tools" folder. The effects they
 * place carry flags.n5e.state "counterTag:<rank>" / "suppressionTag:<rank>" (rules/jutsu-defense.mjs).
 * The other ninja tools come with the Items pass (STD6a). Run: node tools/content/build-tags.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");
const out = path.join(root, "packs/_source/equipment");
const id = key => crypto.createHash("sha256").update(`n5e.tags.${key}`).digest("hex").slice(0, 16);
const FOLDER = id("folder");
const SOURCE = { book: "Naruto 5e Core", page: "", version: "4.0", custom: "" };

const COUNTER = { D: 150, C: 300, B: 750, A: 1000 };
const SUPPRESSION = { C: [15, 250], B: [17, 1000], A: [19, 4000] };

function item(key, name, rank, price, description, activities) {
  const _id = id(key);
  return { _id, name, type: "consumable", img: "icons/sundries/scrolls/scroll-runed-brown-purple.webp",
    system: { identifier: key, description, source: SOURCE, quantity: 1, bulk: 1, price, rank, equipped: false, location: "carried",
      subtype: "tag", activities, destroyOnEmpty: true },
    _key: `!items!${_id}`, flags: { n5e: { generated: true } }, folder: FOLDER, sort: 0, ownership: { default: 0 }, effects: [] };
}

export function tagItems() {
  const items = [];
  for ( const [rank, price] of Object.entries(COUNTER) ) {
    items.push(item(`counter-tag-${rank.toLowerCase()}`, `Counter Tag (${rank}-Rank)`, rank, price,
      `<p>A reactive sealing tag that absorbs and nullifies an incoming jutsu before it can take effect. As a bonus action, affix a Counter Tag to a creature within reach or to any surface. When the next jutsu of ${rank}-Rank or lower that specifically targets the tagged creature or surface is cast, the Counter Tag absorbs it entirely, negating all of its effects. The tag then burns out. The Counter Tag does not activate against area effects that include the tagged target as one of multiple creatures. The placer can deactivate the tag as a bonus action within 30 feet.</p><p><em>Target the creature, then use Affix. The jutsu's card offers "Counter Tag absorbs this" to that creature's owner.</em></p>`,
      [{ id: "affix", type: "effect", label: "Affix Counter Tag", activation: "bonus",
        effect: { name: `Counter Tag (${rank}-Rank)`, target: "targets", state: `counterTag:${rank}`, seconds: 86400 } }]));
  }
  for ( const [rank, [dc, price]] of Object.entries(SUPPRESSION) ) {
    items.push(item(`chakra-suppression-tag-${rank.toLowerCase()}`, `Chakra Suppression Tag (${rank}-Rank)`, rank, price,
      `<p>Strips of sealing paper embedded with chakra-disrupting formulae designed to interfere with a target's ability to channel jutsu mid-combat.</p><p><strong>Applying the Tag.</strong> As an action, you can apply a Chakra Suppression Tag to a willing creature automatically. Against an unwilling creature, make an unarmed attack or a ranged weapon attack roll (range 20/60 ft). On a hit the tag adheres to the target and they must make a Charisma saving throw (DC ${dc}). On a failed save the suppression activates. On a successful save the tag is destroyed with no effect.</p><p><strong>Suppression Effect.</strong> While the tag is active the target cannot cast Ninjutsu or Genjutsu of any rank lower than ${rank}-Rank. This effect lasts for 1 minute.</p><p><strong>Removing the Tag.</strong> While suppressed, the target may spend an action to make a Charisma saving throw (DC ${dc}). On a success they break the seal's hold and the effect ends. Another creature within 5 feet may spend an action to remove the tag automatically, immediately ending the effect.</p><p><em>Roll the attack yourself, then use the save button; on a failure, target the creature and use Suppression activates. The cast dialog then refuses the blocked jutsu.</em></p>`,
      [{ id: "save", type: "save", label: "Chakra Suppression Tag", save: { abilities: ["cha"], dc: { source: "fixed", formula: String(dc) }, onSuccess: "none" } },
        { id: "suppress", type: "effect", label: "Suppression activates",
          effect: { name: `Chakra Suppression Tag (${rank}-Rank)`, target: "targets", state: `suppressionTag:${rank}`, seconds: 60 } }]));
  }
  return items;
}

if ( import.meta.url === `file://${process.argv[1]}` ) {
  const folder = { _id: FOLDER, name: "Sealing Tools", type: "Item", folder: null, sorting: "a", sort: 0, color: null, description: "",
    flags: { n5e: { generated: true } }, _key: `!folders!${FOLDER}` };
  fs.writeFileSync(path.join(out, `_folder-sealing-tools-${FOLDER}.json`), `${JSON.stringify(folder, null, 2)}\n`);
  const items = tagItems();
  for ( const doc of items ) fs.writeFileSync(path.join(out, `${doc.system.identifier}-${doc._id}.json`), `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`Built ${items.length} sealing tags.`);
}
