/**
 * Registers every TypeDataModel with CONFIG. Types must match system.json documentTypes.
 *
 * A data model is the schema of one document type (what is stored) plus its prepare methods (what
 * is derived each time the document is prepared). Folder layout:
 *   actor/creature.mjs        shared by character and NPC: the whole derived-data pipeline
 *   actor/character.mjs       player characters (level from class items, XP, details)
 *   actor/npc.mjs             NPCs, summons, clones (stat-block overrides)
 *   item/*.mjs                one class per item type (templates.mjs holds the shared field groups)
 *   effect/effects.mjs        typed Active Effects (condition, state, amp...)
 *   fields/shared.mjs         field builders every model uses (S.int, S.activation(), S.activities()...)
 *
 * Adding a document type: write the model, add it to the matching map below, add the type to
 * system.json "documentTypes" (with its htmlFields), add its label to lang/en.json, then run
 * `npm run check`, which reports anything missing.
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

/** Called at init (n5e.mjs): tells Foundry which data model each document type uses. */
export function registerDataModels() {
  Object.assign(CONFIG.Actor.dataModels, actorModels);
  Object.assign(CONFIG.Item.dataModels, itemModels);
  Object.assign(CONFIG.ActiveEffect.dataModels, effectModels);
}
