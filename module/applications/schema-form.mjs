/**
 * Builds simple form rows from a data model schema, so the Phase 1 placeholder sheets show and edit
 * every stored field without hand-written templates. Phase 2 replaces these with dnd5e-style sheets.
 */

/**
 * @param {foundry.data.fields.SchemaField} schema
 * @param {object} source        the document's source system data (editable values)
 * @param {object} [options]
 * @param {string} [options.prefix="system"]
 * @param {Set<string>} [options.skip]   top-level keys rendered elsewhere
 * @returns {Array<{path, label, kind, value, choices?, depth}>}
 */
export function buildRows(schema, source, { prefix = "system", skip = new Set() } = {}) {
  const F = foundry.data.fields;
  const rows = [];
  const walk = (field, value, path, label, depth) => {
    if ( field instanceof F.SchemaField ) {
      rows.push({ kind: "heading", label, depth, path });
      for ( const [k, sub] of Object.entries(field.fields) ) walk(sub, value?.[k], `${path}.${k}`, k, depth + 1);
      return;
    }
    const base = { path, label, depth };
    if ( field instanceof F.HTMLField ) rows.push({ ...base, kind: "html", value: value ?? "" });
    else if ( field instanceof F.BooleanField ) rows.push({ ...base, kind: "checkbox", value: !!value });
    else if ( field instanceof F.NumberField ) rows.push({ ...base, kind: "number", value: value ?? "" });
    else if ( field instanceof F.StringField ) {
      const choices = field.choices ? (Array.isArray(field.choices) ? Object.fromEntries(field.choices.map(c => [c, c]))
        : (typeof field.choices === "function" ? field.choices() : field.choices)) : null;
      rows.push({ ...base, kind: choices ? "select" : "text", value: value ?? "", choices });
    } else if ( field instanceof F.SetField || field instanceof F.ArrayField ) {
      const primitive = !(field.element instanceof F.SchemaField);
      if ( primitive ) rows.push({ ...base, kind: "list", value: [...(value ?? [])].join(", ") });
      else rows.push({ ...base, kind: "json", value: JSON.stringify(value ?? [], null, 1), readonly: true });
    } else rows.push({ ...base, kind: "json", value: JSON.stringify(value ?? null), readonly: true });
  };
  for ( const [k, field] of Object.entries(schema.fields) ) {
    if ( skip.has(k) ) continue;
    walk(field, source?.[k], `${prefix}.${k}`, k, 0);
  }
  return rows;
}

/**
 * Comma-separated "list" inputs come back as strings; turn them into arrays before the update.
 * @param {object} submitData  flattened form data
 * @param {Array} rows
 */
export function coerceListInputs(submitData, rows) {
  for ( const row of rows ) {
    if ( row.kind !== "list" || !(row.path in submitData) ) continue;
    const raw = submitData[row.path];
    submitData[row.path] = String(raw ?? "").split(",").map(s => s.trim()).filter(Boolean);
  }
  return submitData;
}
