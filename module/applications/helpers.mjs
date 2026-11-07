/**
 * Handlebars helpers used by N5e templates (registered by the system so templates don't depend on
 * which helpers core happens to ship).
 */
export const HELPERS = {
  n5eEq: (a, b) => a === b,
  n5eGt: (a, b) => Number(a) > Number(b)
};

export function registerHelpers(hbs = globalThis.Handlebars) {
  for ( const [name, fn] of Object.entries(HELPERS) ) hbs.registerHelper(name, fn);
}
