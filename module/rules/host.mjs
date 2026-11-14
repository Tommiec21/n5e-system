/**
 * Host hooks for the shared core (SHARED1). The core never reads Foundry globals: a host (the N5e
 * System, the dnd5e Module) registers what it provides with setHost(), and the core asks through
 * these getters. Without a host, the static config (module/config) is used.
 *
 *   config   () => the live N5E registry (System: CONFIG.N5E, which includes entries registered at
 *            runtime such as clan conditions); falls back to the static config.
 */
import N5E from "../config/index.mjs";

let current = {};

/** Register host hooks: {config: () => object}. Later calls replace the hooks they name. */
export function setHost(hooks = {}) {
  current = { ...current, ...hooks };
}

/** The N5E registry the core should read: the host's live one, else the static config. */
export function n5eConfig() {
  let live;
  try { live = current.config?.(); } catch { live = undefined; }
  return live ?? N5E;
}
