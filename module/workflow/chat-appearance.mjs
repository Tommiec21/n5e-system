/**
 * CHATUI1 (King 2026-11-16): chat font sizes and fonts, set globally (rules/chat-appearance.mjs).
 *
 *   Settings     n5e.chatAppearance (world, the GM's default) and n5e.chatAppearanceMine (client:
 *                {use, ...}; a player's own copy when `use` is on).
 *   Applied      as CSS custom properties on the page root (styles/n5e.css reads --n5e-fs-* and
 *                --n5e-ff-*), on ready and whenever either setting changes.
 *   Messages     every N5e chat message gets the class n5e-msg when drawn (King Q-F3).
 */
import { cssVariables, effectiveAppearance } from "../rules/chat-appearance.mjs";

const get = key => { try { return globalThis.game?.settings?.get("n5e", key) ?? {}; } catch { return {}; } };

/** The appearance this client shows now. */
export const currentAppearance = () => effectiveAppearance(get("chatAppearance"), get("chatAppearanceMine"));

/** Write the CSS variables onto an element (the page root by default; the window's preview too). */
export function applyChatAppearance(appearance = currentAppearance(), el = globalThis.document?.documentElement) {
  if ( !el?.style ) return;
  for ( const [k, v] of Object.entries(cssVariables(appearance)) ) el.style.setProperty(k, v);
}

/** Is this an N5e chat message? Its flags, or N5e markup in what was drawn. */
export function isN5eMessage(message, html) {
  return !!message?.flags?.n5e || !!html?.querySelector?.('[class*="n5e-"], [data-n5e-roll], [data-n5e-act]');
}

/** renderChatMessageHTML: tag N5e messages so the chat styles reach them. */
export function tagN5eMessage(message, html) {
  if ( isN5eMessage(message, html) ) html.classList.add("n5e-msg");
}

/** The fonts Foundry has loaded (built-in, CONFIG.fontDefinitions, and the core Additional Fonts setting). */
export function availableFonts() {
  const names = new Set();
  try { for ( const f of foundry.applications.settings.menus.FontConfig.getAvailableFonts() ?? [] ) names.add(f); } catch { /* older API */ }
  for ( const f of Object.keys(globalThis.CONFIG?.fontDefinitions ?? {}) ) names.add(f);
  try { for ( const f of Object.keys(game.settings.get("core", "fonts") ?? {}) ) names.add(f); } catch { /* none */ }
  return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
}
