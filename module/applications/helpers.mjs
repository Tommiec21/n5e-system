/**
 * Handlebars helpers used by N5e templates (registered by the system so templates don't depend on
 * which helpers core happens to ship).
 * Only these two exist on purpose: view models do the logic, templates just print. There is no
 * "and"/"or" helper; nest {{#if}} blocks instead. A new helper goes in HELPERS (and into the template
 * render test, which registers the same list).
 */
export const HELPERS = {
  n5eEq: (a, b) => a === b,
  n5eGt: (a, b) => Number(a) > Number(b)
};

export function registerHelpers(hbs = globalThis.Handlebars) {
  for ( const [name, fn] of Object.entries(HELPERS) ) hbs.registerHelper(name, fn);
}
