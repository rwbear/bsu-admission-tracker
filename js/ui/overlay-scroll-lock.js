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

/**
 * Open an overlay shell with CSS enter transitions in the same turn as mount.
 *
 * Double-rAF (paint closed → wait → paint open) felt like tap lag on mobile:
 * the shell sat at opacity 0 for two frames after the click. A single forced
 * style flush (`offsetWidth`) commits the pre-open styles, then `.is-open` can
 * be added synchronously — the opacity/transform transition still runs, and
 * the first paint already includes the enter, with no blank waiting frame.
 *
 * @param {HTMLElement} shell
 * @param {() => void} open add `.is-open`, focus, list scroll, etc.
 */
export function commitOverlayEnter(shell, open) {
  if (!shell || typeof open !== 'function') return;
  if (typeof shell.offsetWidth !== 'number') return;
  void shell.offsetWidth;
  open();
}

/**
 * Scroll an option into view inside an overlay list port.
 * Prefer this over `scrollIntoView` — under `body { position: fixed }` that
 * API can thrash the page scrollport and delay the first open paint.
 *
 * @param {HTMLElement} list
 * @param {Element | null} active
 */
export function scrollOverlayOptionIntoView(list, active) {
  if (!list || !active || typeof list.contains !== 'function') return;
  if (!list.contains(active)) return;
  const top =
    active.offsetTop - list.clientHeight / 2 + active.offsetHeight / 2;
  list.scrollTop = Math.max(0, top);
}

/** Leave budget — must be ≥ CSS backdrop opacity transition. */
export const OVERLAY_LEAVE_MS = 280;
