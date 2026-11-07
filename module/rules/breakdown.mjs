/**
 * Statistic breakdowns (the PF2e idea: every derived number knows the parts it was built from).
 * The derived-data pipeline builds each number through a Breakdown; sheets show the parts on hover.
 */
export class Breakdown {
  /** @param {string} label  what the number is ("Armor Class", "Athletics") */
  constructor(label) {
    this.label = label;
    /** @type {Array<{label: string, value: number, base?: boolean}>} */
    this.parts = [];
  }

  /** A starting value that is always shown, even when 0 ("Base 10", "Dex"). */
  base(label, value) {
    this.parts.push({ label, value: Number(value) || 0, base: true });
    return this;
  }

  /** A modifier; zero values are skipped so tooltips stay short. */
  add(label, value) {
    const v = Number(value) || 0;
    if ( v ) this.parts.push({ label, value: v });
    return this;
  }

  /** Add several {label, value} parts. */
  addAll(parts = []) {
    for ( const p of parts ) this.add(p.label, p.value);
    return this;
  }

  get total() {
    return this.parts.reduce((sum, p) => sum + p.value, 0);
  }

  /** Plain object for templates and tests. */
  toJSON() {
    return { label: this.label, total: this.total, parts: this.parts.map(p => ({ ...p })) };
  }
}

/** Format a signed modifier: 3 -> "+3", -2 -> "−2" (true minus sign), 0 -> "+0". */
export function signed(n) {
  const v = Number(n) || 0;
  return v < 0 ? `−${Math.abs(v)}` : `+${v}`;
}
