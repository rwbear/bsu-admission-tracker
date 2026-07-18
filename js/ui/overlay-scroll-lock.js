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
 * - `releaseOverlayScrollLock(id)` restores scrollY with behavior: 'instant'/'auto'.
 * - `focusNoScroll` for return-focus after close.
 * - Callers must restore focus in the SAME synchronous turn as unlock
 *   (before the browser can paint with focus on <body> after dialog removal).
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
    const root = document.documentElement;
    body.style.position = 'fixed';
    body.style.top = `-${lockY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    // Belt: block overscroll chaining without the overflow:hidden unlock blink.
    // Do NOT set touch-action on body — it would kill list scrolling inside overlays.
    root.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
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
  const root = document.documentElement;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  body.style.overscrollBehavior = '';
  root.style.overscrollBehavior = '';

  // Defeat html { scroll-behavior: smooth } — animated restore = visible blink.
  const y = lockY;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  try {
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
  } catch {
    window.scrollTo(0, y);
  }
  // Second paint: some mobile WebKits apply the unlock layout one frame late.
  // Skip if another overlay locked again before the frame (handoff race).
  requestAnimationFrame(() => {
    if (holders.size > 0) return;
    try {
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, y);
    }
  });
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

/** Leave budget — must be ≥ CSS backdrop opacity transition (180ms). */
export const OVERLAY_LEAVE_MS = 260;
