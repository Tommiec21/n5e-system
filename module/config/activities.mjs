/** Activity capabilities are explicit. Manual kinds display instructions, never silently execute. */
export const activityKinds = {
  attack: "execute", save: "execute", damage: "execute", heal: "execute", effect: "execute",
  roll: "execute", check: "execute", summon: "execute",
  movement: "manual", condition: "manual", utility: "manual"
};
