/**
 * Hostile Terrain region behaviour (ENV1, KB 06). The GM draws a Region and adds this behaviour with
 * the terrain type and rank. At the start of each creature's turn inside it, the active GM's turn
 * pipeline posts its Direct Exposure card (workflow/environment.mjs).
 */
const RegionBehaviorType = globalThis.foundry?.data?.regionBehaviors?.RegionBehaviorType
  ?? class { static defineSchema() { return {}; } };

export default class HostileTerrainBehavior extends RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["N5E.HostileTerrain"];

  static defineSchema() {
    const f = globalThis.foundry?.data?.fields;
    if ( !f ) return {};
    return {
      terrain: new f.StringField({ required: true, initial: "extremeHeat", label: "Terrain",
        choices: { extremeHeat: "Extreme Heat", extremeCold: "Extreme Cold", toxic: "Toxic Environment", chakraResistant: "Chakra Resistant" } }),
      rank: new f.StringField({ required: true, initial: "C", label: "Rank", choices: { D: "D", C: "C", B: "B", A: "A", S: "S" } })
    };
  }
}
