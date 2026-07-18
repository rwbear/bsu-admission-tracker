/**
 * Activate an option on a real tap without losing the gesture to keyboard blur.
 *
 * On iOS, tapping a list row while a search input is focused often:
 * 1) blurs the input → keyboard starts closing → visual viewport expands
 * 2) the finger's click lands on a shifted coordinate → miss / no select
 *
 * `pointerdown` + preventDefault keeps the input focused through the gesture.
 * Because that also cancels native list panning, we manually scroll
 * `scrollParent` while the pointer moves past the tap threshold.
 */

const MOVE_PX = 12;
const DEDUPE_MS = 400;

/**
 * @param {HTMLElement} option
 * @param {() => void} onActivate
 * @param {{ scrollParent?: HTMLElement | null }} [opts]
 */
export function bindOptionActivate(option, onActivate, opts = {}) {
  if (!(option instanceof HTMLElement) || typeof onActivate !== 'function') {
    return;
  }

  const scrollParent = opts.scrollParent ?? null;
  let tracking = false;
  let dragged = false;
  let startX = 0;
  let startY = 0;
  let listScroll0 = 0;
  let lastFire = 0;
  /** @type {number | null} */
  let pointerId = null;

  const fire = () => {
    const now = Date.now();
    if (now - lastFire < DEDUPE_MS) return;
    lastFire = now;
    onActivate();
  };

  option.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    tracking = true;
    dragged = false;
    startX = e.clientX;
    startY = e.clientY;
    listScroll0 = scrollParent ? scrollParent.scrollTop : 0;
    pointerId = e.pointerId;
    // Keep search focused — no keyboard dismiss / viewport jump mid-gesture.
    e.preventDefault();
    try {
      option.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  });

  option.addEventListener('pointermove', (e) => {
    if (!tracking || pointerId !== e.pointerId) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.hypot(dx, dy) <= 2) return;
    dragged = true;
    if (scrollParent) {
      scrollParent.scrollTop = listScroll0 - dy;
    }
  });

  option.addEventListener('pointerup', (e) => {
    if (!tracking || pointerId !== e.pointerId) return;
    tracking = false;
    pointerId = null;
    try {
      option.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (dragged || Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_PX) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    fire();
  });

  option.addEventListener('pointercancel', (e) => {
    if (pointerId !== e.pointerId) return;
    tracking = false;
    pointerId = null;
  });

  // Enter / Space on a focused option (and mouse click fallback).
  option.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fire();
  });
}

export const OPTION_ACTIVATE = Object.freeze({
  movePx: MOVE_PX,
  dedupeMs: DEDUPE_MS,
});
