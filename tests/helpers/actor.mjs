/**
 * Build prepared actors from sample compendium sources, in Foundry's prepare order, for Node tests.
 */
import "./foundry-stub.mjs";
import fs from "node:fs";
import path from "node:path";
import N5E from "../../module/config/index.mjs";
import { actorModels, itemModels, effectModels } from "../../module/data/_index.mjs";

globalThis.CONFIG = { N5E };

const SRC = path.join(import.meta.dirname, "..", "..", "packs", "_source");

export function load(pack, idPart) {
  const dir = path.join(SRC, pack);
  const file = fs.readdirSync(dir).find(f => f.includes(idPart));
  return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
}

let counter = 0;
const id = () => `id${String(++counter).padStart(14, "0")}`;

/**
 * @param {object} [o]
 * @param {"character"|"npc"} [o.type]
 * @param {object} [o.system]
 * @param {object[]} [o.items]       item sources
 * @param {object[]} [o.conditions]  [{key, ranks}]
 * @param {object[]} [o.n5eChanges]
 * @param {string} [o.acCalc]       what an AC-override effect would set
 * @param {object} [o.flags]
 */
export function makeActor({ type = "character", name = "Test", system = {}, items = [], conditions = [], n5eChanges = [],
  acCalc, flags = {} } = {}) {
  const actor = { name, img: "icons/svg/mystery-man.svg", type, items: [], effects: [], appliedEffects: [],
    _n5eChanges: n5eChanges, flags: { n5e: flags } };
  actor.getFlag = (scope, key) => actor.flags?.[scope]?.[key];
  for ( const src of items ) {
    const item = { id: src._id ?? id(), name: src.name, img: src.img ?? "icons/svg/item-bag.svg", type: src.type, actor,
      flags: src.flags ?? {}, getFlag: () => null };
    item.system = new itemModels[src.type](src.system, { parent: item });
    actor.items.push(item);
  }
  for ( const c of conditions ) {
    const e = { id: id(), type: "condition", name: N5E.conditions[c.key]?.label ?? c.key, img: "", disabled: false };
    e.system = new effectModels.condition(c, { parent: e });
    actor.effects.push(e);
    actor.appliedEffects.push(e);
  }
  actor.system = new actorModels[type](system, { parent: actor });
  for ( const i of actor.items ) { i.system.prepareBaseData?.(); i.system.prepareDerivedData?.(); }
  for ( const e of actor.appliedEffects ) e.system.prepareDerivedData?.();
  actor.system.prepareBaseData();
  if ( acCalc ) actor.system.attributes.ac.calc = acCalc;
  actor.system.prepareDerivedData();
  return actor;
}

export const baseAbilities = { abilities: { str: { value: 16 }, dex: { value: 14 }, con: { value: 14 }, int: { value: 10 },
  wis: { value: 12 }, cha: { value: 8 } } };

export const taiSpec = (levels = 1) => {
  const c = load("classes", "TaiSpec");
  c.system.levels = levels;
  return c;
};
