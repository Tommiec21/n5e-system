/** Inspect authored data against the same field definitions used by Foundry. Build-time only;
 * flags and derived fields are deliberately excluded. Unknown activity fields are errors.
 */
export function unknownActivityFields(value, fields, path = "activity") {
  const issues = [];
  for ( const [key, data] of Object.entries(value ?? {}) ) {
    const field = fields[key];
    const at = `${path}.${key}`;
    if ( !field ) { issues.push(at); continue; }
    if ( field.fields ) issues.push(...unknownActivityFields(data, field.fields, at));
    if ( field.element?.fields && Array.isArray(data) ) data.forEach((v, i) => issues.push(...unknownActivityFields(v, field.element.fields, `${at}[${i}]`)));
  }
  return issues;
}
