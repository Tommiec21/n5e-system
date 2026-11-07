/**
 * Minimal stand-in for the parts of Foundry's data layer the N5e models use, so schemas and the
 * derived-data pipeline can be exercised in Node. It initializes source data from field initials and
 * turns SetFields into Sets, like Foundry does. It does not validate.
 */
class DataField {
  constructor(options = {}) { this.options = options; this.initial = options.initial; this.choices = options.choices; }
  getInitial() { return typeof this.initial === "function" ? this.initial() : structuredClone(this.initial); }
  initialize(value) { return value; }
}
class StringField extends DataField {
  getInitial() { return this.initial ?? ""; }
}
class NumberField extends DataField {
  getInitial() { return this.initial ?? null; }
}
class BooleanField extends DataField {
  getInitial() { return this.initial ?? false; }
}
class HTMLField extends StringField {}
class SchemaField extends DataField {
  constructor(fields, options) { super(options); this.fields = fields; }
  getInitial() {
    return Object.fromEntries(Object.entries(this.fields).map(([k, f]) => [k, f.getInitial()]));
  }
  initialize(value) {
    const out = {};
    for ( const [k, f] of Object.entries(this.fields) ) out[k] = f.initialize(value?.[k] ?? f.getInitial());
    return out;
  }
}
class ArrayField extends DataField {
  constructor(element, options) { super(options); this.element = element; }
  getInitial() { return []; }
  initialize(value) { return (value ?? []).map(v => this.element.initialize(v)); }
}
class SetField extends ArrayField {
  initialize(value) { return new Set((value ?? []).map(v => this.element.initialize(v))); }
}
class TypedObjectField extends DataField {
  constructor(element, options) { super(options); this.element = element; }
  getInitial() { return {}; }
  initialize(value) {
    return Object.fromEntries(Object.entries(value ?? {}).map(([k, v]) => [k, this.element.initialize(v)]));
  }
}
class TypeDataModel {
  constructor(source = {}, { parent } = {}) {
    this.parent = parent;
    const schema = this.constructor.schema;
    Object.assign(this, schema.initialize(this.constructor.migrateData(structuredClone(source))));
  }
  static get schema() { return new SchemaField(this.defineSchema()); }
  get schema() { return this.constructor.schema; }
  static migrateData(source) { return source; }
}

globalThis.foundry = {
  data: { fields: { DataField, StringField, NumberField, BooleanField, HTMLField, SchemaField, ArrayField, SetField,
    TypedObjectField } },
  abstract: { TypeDataModel }
};
