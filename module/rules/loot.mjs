/**
 * PRESTD1 Part C: loot piles, merchants and the party stash (pure; King Q-F2, Q-P5).
 */
export const LOOT_MODES = Object.freeze({ pile: "Loot pile", merchant: "Merchant", stash: "Party stash" });

/** The price of `quantity` of an item at a rate, rounded down. */
export const priceOf = (unit, quantity = 1, rate = 1) => Math.max(0, Math.floor((Number(unit) || 0) * Math.max(1, Math.floor(Number(quantity) || 1)) * (Number(rate) || 0)));

/** May a user take items from a loot actor of this mode (pile and stash yes; merchant no: buy). */
export const canTake = mode => mode === "pile" || mode === "stash";

/** A purchase: the price, and whether the buyer can pay. */
export function purchase({ unitPrice, quantity = 1, buyRate = 1, ryo = 0 }) {
  const price = priceOf(unitPrice, quantity, buyRate);
  if ( price > (Number(ryo) || 0) ) return { price, error: `That costs ${price} ryo (you have ${Number(ryo) || 0}).` };
  return { price, buyerLeft: (Number(ryo) || 0) - price };
}

/** A sale: what the merchant pays. */
export const saleValue = ({ unitPrice, quantity = 1, sellRate = 0.5 }) => priceOf(unitPrice, quantity, sellRate);
