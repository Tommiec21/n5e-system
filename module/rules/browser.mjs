/**
 * Compendium browser (pure part): which tabs exist, what each row holds, the filter options, and the
 * filtering and sorting. The window is module/applications/browser/compendium-browser.mjs; it feeds
 * index entries from every Item compendium (and world items) through entryFrom().
 *
 * Tabs and their filters:
 *   jutsu      rank, discipline, section (Release), keywords (all must match), activation, cost range,
 *              concentration, has an area, source book
 *   features   (feat items: class features, class options, feats) category, class, option group
 *              (tags), max level, source
 *   stances    category, source
 *   equipment  item type, weapon category, weapon group, max price, source
 *   character  class, subclass, clan, background; source
 * Every tab: name search (optionally the rules text too) and a sort.
 *
 * To add a filter: add it to the tab's `filters` (field = an entry property; kind = multi | all |
 * range | max | bool), make entryFrom() fill that property, and the window shows it automatically.
 */

export const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];

/** Tabs: item types shown, filters (in display order), sorts. */
export const TABS = {
  jutsu: {
    label: "Jutsu", types: ["jutsu"],
    filters: [
      { field: "rank", label: "Rank", kind: "multi" },
      { field: "discipline", label: "Discipline", kind: "multi" },
      { field: "section", label: "Section", kind: "multi" },
      { field: "keywords", label: "Keywords (all)", kind: "all" },
      { field: "activation", label: "Activation", kind: "multi" },
      { field: "cost", label: "Chakra cost", kind: "range" },
      { field: "concentration", label: "Concentration", kind: "bool" },
      { field: "hasArea", label: "Has an area", kind: "bool" },
      { field: "book", label: "Source", kind: "multi" }
    ],
    sorts: ["rank", "name", "cost"]
  },
  features: {
    label: "Features & Feats", types: ["feat"],
    filters: [
      { field: "category", label: "Category", kind: "multi" },
      { field: "cls", label: "Class", kind: "multi" },
      { field: "tags", label: "Option group", kind: "multi" },
      { field: "level", label: "Level up to", kind: "max" },
      { field: "book", label: "Source", kind: "multi" }
    ],
    sorts: ["name", "level"]
  },
  stances: {
    label: "Stances", types: ["stance"],
    filters: [
      { field: "categories", label: "Category", kind: "multi" },
      { field: "book", label: "Source", kind: "multi" }
    ],
    sorts: ["name"]
  },
  equipment: {
    label: "Equipment", types: ["weapon", "armor", "consumable", "toolkit", "container", "loot"],
    filters: [
      { field: "type", label: "Type", kind: "multi" },
      { field: "category", label: "Category", kind: "multi" },
      { field: "groups", label: "Weapon group", kind: "multi" },
      { field: "price", label: "Price up to", kind: "max" },
      { field: "book", label: "Source", kind: "multi" }
    ],
    sorts: ["name", "price"]
  },
  character: {
    label: "Classes & Origins", types: ["class", "subclass", "clan", "background"],
    filters: [
      { field: "type", label: "Type", kind: "multi" },
      { field: "book", label: "Source", kind: "multi" }
    ],
    sorts: ["name"]
  }
};

/** The tab an item type belongs to. */
export function tabFor(type) {
  return Object.entries(TABS).find(([, t]) => t.types.includes(type))?.[0] ?? null;
}

const plain = html => String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const arr = v => (Array.isArray(v) ? v : v instanceof Set ? [...v] : v ? [v] : []);

/**
 * One browser row from a compendium index entry (or a world item's source data).
 * @param {object} e        { _id, uuid, name, img, type, system, folder }
 * @param {object} [o]
 * @param {string} [o.pack] pack label, shown on the row
 */
export function entryFrom(e, { pack = "" } = {}) {
  const s = e.system ?? {};
  const area = s.target?.area;
  return {
    uuid: e.uuid, name: e.name ?? "", img: e.img ?? "", type: e.type, pack,
    tab: tabFor(e.type),
    identifier: s.identifier || "",
    rank: s.rank || "",
    // Bukijutsu: a Taijutsu jutsu with the bukijutsu keyword (DATA1).
    discipline: arr(s.keywords).includes("bukijutsu") ? "buki" : s.discipline || "",
    section: s.section || "",
    keywords: arr(s.keywords),
    activation: s.activation?.type || "",
    cost: s.cost?.mode === "chakra" ? Number(s.cost.value) || 0 : null,
    concentration: !!s.duration?.concentration,
    hasArea: !!(area?.shape && area?.size) || /\d+\s*[- ]?(?:foot|feet|ft)[- ]+(?:cone|cube|line|sphere|radius|cylinder)/i.test(`${s.target?.range?.text ?? ""} ${plain(s.description)}`),
    category: s.category || s.weaponType || "",
    cls: s.requirement?.class || "",
    level: Number(s.requirement?.level) || 0,
    tags: arr(s.tags),
    categories: arr(s.categories),
    groups: arr(s.groups),
    price: Number(s.price) || 0,
    book: s.source?.book || "",
    text: plain(s.description).toLowerCase()
  };
}

/**
 * Filter options for a tab: every value present, with counts (values listed once, sorted; ranks in
 * rank order). Range/max/bool filters return their min and max instead.
 */
export function facetOptions(entries, tab) {
  const out = {};
  for ( const f of TABS[tab]?.filters ?? [] ) {
    if ( ["range", "max"].includes(f.kind) ) {
      const nums = entries.map(e => e[f.field]).filter(n => Number.isFinite(n));
      out[f.field] = { min: nums.length ? Math.min(...nums) : 0, max: nums.length ? Math.max(...nums) : 0 };
      continue;
    }
    if ( f.kind === "bool" ) continue;
    const counts = new Map();
    for ( const e of entries ) for ( const v of arr(e[f.field]) ) if ( v !== "" ) counts.set(v, (counts.get(v) ?? 0) + 1);
    const values = [...counts.keys()];
    values.sort(f.field === "rank" ? (a, b) => RANK_ORDER.indexOf(a) - RANK_ORDER.indexOf(b) : (a, b) => String(a).localeCompare(String(b)));
    out[f.field] = values.map(v => ({ value: v, count: counts.get(v) }));
  }
  return out;
}

/**
 * Apply filters.
 * @param {object[]} entries
 * @param {object} filters  { field: value }: multi → array (any), all → array (every), range →
 *                          {min, max}, max → number, bool → true | false | "" (any)
 * @param {object} [o]
 * @param {string} [o.search]     name (or text) contains, case-insensitive; several words must all match
 * @param {boolean} [o.inText]    search the rules text too
 * @param {string} [o.tab]        which tab's filter kinds to use
 */
export function filterEntries(entries, filters = {}, { search = "", inText = false, tab } = {}) {
  const defs = Object.fromEntries((TABS[tab]?.filters ?? []).map(f => [f.field, f]));
  const words = String(search).toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(e => {
    if ( tab && e.tab !== tab ) return false;
    if ( words.length ) {
      const hay = inText ? `${e.name.toLowerCase()} ${e.text}` : e.name.toLowerCase();
      if ( !words.every(w => hay.includes(w)) ) return false;
    }
    for ( const [field, want] of Object.entries(filters) ) {
      const kind = defs[field]?.kind ?? "multi";
      const have = e[field];
      if ( kind === "multi" ) {
        if ( !want?.length ) continue;
        if ( !arr(have).some(v => want.includes(v)) ) return false;
      } else if ( kind === "all" ) {
        if ( !want?.length ) continue;
        if ( !want.every(v => arr(have).includes(v)) ) return false;
      } else if ( kind === "range" ) {
        if ( want?.min == null && want?.max == null ) continue;
        if ( have == null ) return false;
        if ( want.min != null && want.min !== "" && have < Number(want.min) ) return false;
        if ( want.max != null && want.max !== "" && have > Number(want.max) ) return false;
      } else if ( kind === "max" ) {
        if ( want === "" || want == null ) continue;
        if ( (have ?? 0) > Number(want) ) return false;
      } else if ( kind === "bool" ) {
        if ( want === "" || want == null ) continue;
        if ( !!have !== (want === true || want === "true") ) return false;
      }
    }
    return true;
  });
}

/** Sort rows: rank (E → S, then name), name, cost (low first), level, price. */
export function sortEntries(entries, by = "name") {
  const name = (a, b) => a.name.localeCompare(b.name);
  const cmp = {
    rank: (a, b) => (RANK_ORDER.indexOf(a.rank) - RANK_ORDER.indexOf(b.rank)) || name(a, b),
    cost: (a, b) => ((a.cost ?? Infinity) - (b.cost ?? Infinity)) || name(a, b),
    level: (a, b) => (a.level - b.level) || name(a, b),
    price: (a, b) => (a.price - b.price) || name(a, b),
    name
  }[by] ?? name;
  return [...entries].sort(cmp);
}

/** The index fields the window asks each compendium for (everything entryFrom reads). */
export const INDEX_FIELDS = ["system.identifier", "system.rank", "system.discipline", "system.section", "system.keywords", "system.activation.type",
  "system.cost", "system.duration.concentration", "system.target", "system.category", "system.weaponType", "system.requirement",
  "system.tags", "system.categories", "system.groups", "system.price", "system.source.book", "system.description"];
