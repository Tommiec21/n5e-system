/**
 * Registers every TypeDataModel with CONFIG. Types must match system.json documentTypes.
 */
import CharacterData from "./actor/character.mjs";
import NPCData from "./actor/npc.mjs";
import JutsuData from "./item/jutsu.mjs";
import { WeaponData, ArmorData, ConsumableData, ToolkitData, ContainerData, LootData } from "./item/equipment.mjs";
import { ClassData, SubclassData, ClanData, BackgroundData, FeatData, StanceData } from "./item/character-options.mjs";
import {
  ConditionEffectData, StateEffectData, AmpEffectData, StanceEffectData, ConcentrationEffectData, GenericEffectData
} from "./effect/effects.mjs";

export const actorModels = { character: CharacterData, npc: NPCData };

export const itemModels = {
  jutsu: JutsuData,
  weapon: WeaponData,
  armor: ArmorData,
  consumable: ConsumableData,
  toolkit: ToolkitData,
  container: ContainerData,
  loot: LootData,
  class: ClassData,
  subclass: SubclassData,
  clan: ClanData,
  background: BackgroundData,
  feat: FeatData,
  stance: StanceData
};

export const effectModels = {
  condition: ConditionEffectData,
  state: StateEffectData,
  amp: AmpEffectData,
  stance: StanceEffectData,
  concentration: ConcentrationEffectData,
  generic: GenericEffectData
};

export function registerDataModels() {
  Object.assign(CONFIG.Actor.dataModels, actorModels);
  Object.assign(CONFIG.Item.dataModels, itemModels);
  Object.assign(CONFIG.ActiveEffect.dataModels, effectModels);
}
