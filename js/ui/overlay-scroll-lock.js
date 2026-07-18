/**
 * Shared page scroll lock for body-portal overlays (faculty / table / method).
 *
 * Why not `html { overflow: hidden }` alone:
 * - Mobile browsers jump or reflow when it toggles.
 * - With `html { scroll-behavior: smooth }`, restoring scrollY can animate = blink.
 *
 * Contract:
 * - `acquireOverlayScrollLock(id)` freezes the page via `body { position: fixed }`.
 * - Nested / overlapping holders use a Set — unlock only when the last releases.
 * - `releaseOverlayScrollLock(id)` restores scrollY with behavior: 'auto'.
 * - `focusNoScroll` for return-focus after close.
 */

/** @type {Set<string>} */
const holders = new Set();
let lockY = 0;

/**
 * @param {string} id unique holder (e.g. 'faculty', 'table', 'method')
 */
export function acquireOverlayScrollLock(id) {
  const key = String(id || '');
  if (!key) return;
  if (holders.size === 0) {
    lockY = window.scrollY || window.pageYOffset || 0;
    const { body } = document;
    body.style.position = 'fixed';
    body.style.top = `-${lockY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
  }
  holders.add(key);
}

/**
 * @param {string} id
 */
export function releaseOverlayScrollLock(id) {
  const key = String(id || '');
  if (!key || !holders.has(key)) return;
  holders.delete(key);
  if (holders.size > 0) return;

  const { body } = document;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';

  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, lockY);
  root.style.scrollBehavior = prev;
}

/**
 * @returns {boolean}
 */
export function isOverlayScrollLocked() {
  return holders.size > 0;
}

/**
 * @param {HTMLElement} node
 */
export function focusNoScroll(node) {
  if (!(node instanceof HTMLElement)) return;
  try {
    node.focus({ preventScroll: true });
  } catch {
    node.focus();
  }
}

/** Leave budget — must be ≥ CSS backdrop opacity transition. */
export const OVERLAY_LEAVE_MS = 280;
