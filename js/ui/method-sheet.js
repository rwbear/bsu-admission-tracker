/**
 * Methodology sheet — faculty overlay chrome, bulletproof open/close.
 *
 * Why the old close blinked:
 * - `html { overflow: hidden }` is not a real scroll lock (esp. mobile).
 * - Unlock + DOM remove in one turn shifts the page under a fading dim.
 * - `html { scroll-behavior: smooth }` can animate scrollY restore → visible jump.
 * - Scale transform on leave paints a soft flicker on some GPUs.
 *
 * Contract now:
 * - Body `position: fixed` lock; restore scrollY with behavior: 'auto'.
 * - Opacity-first leave (no scale); teardown only after backdrop transitionend.
 * - Backdrop is a non-focusable div (pointerdown close).
 * - Focus restore uses preventScroll, after unlock.
 */

import { el } from './dom.js';
import { METHOD_PARAGRAPHS } from './method-copy.js';

const OVERLAY_ID = 'method-overlay-root';
const DIALOG_ID = 'method-overlay';
const TITLE_ID = 'method-overlay-title';
const TRIGGER_ID = 'method-sheet-trigger';
/** Fallback if transitionend never fires (must be ≥ CSS leave). */
const CLOSE_MS_FULL = 280;

/** @type {ReturnType<typeof setTimeout> | null} */
let closeTimer = null;
/** @type {string | null} */
let returnFocusId = null;
/** @type {null | (() => void)} */
let beforeOpenHook = null;
let open = false;
let scrollLocked = false;
let lockY = 0;

/**
 * Wire mutual exclusion with faculty/table menus (from main.js).
 * @param {{ beforeOpen?: () => void }} hooks
 */
export function armMethodSheetChrome(hooks = {}) {
  beforeOpenHook = hooks.beforeOpen || null;
}

function prefersReducedMotion() {
  try {
    return Boolean(
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    );
  } catch {
    return false;
  }
}

/**
 * @returns {HTMLElement}
 */
function overlayHost() {
  let host = document.getElementById(OVERLAY_ID);
  if (!host) {
    host = el('div', { id: OVERLAY_ID });
    document.body.append(host);
  }
  return host;
}

/**
 * @param {HTMLElement} host
 */
function clearCloseTimer(host) {
  if (closeTimer != null) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  host._methodClosing = false;
}

function lockPageScroll() {
  if (scrollLocked) return;
  lockY = window.scrollY || window.pageYOffset || 0;
  scrollLocked = true;
  const { body } = document;
  body.style.position = 'fixed';
  body.style.top = `-${lockY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  document.documentElement.classList.add('method-overlay-open');
}

function unlockPageScroll() {
  document.documentElement.classList.remove('method-overlay-open');
  if (!scrollLocked) return;
  scrollLocked = false;
  const { body } = document;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  // Must defeat html { scroll-behavior: smooth } or restore animates = blink.
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, lockY);
  root.style.scrollBehavior = prev;
}

/**
 * @param {HTMLElement} node
 */
function focusNoScroll(node) {
  try {
    node.focus({ preventScroll: true });
  } catch {
    node.focus();
  }
}

/**
 * @returns {boolean}
 */
export function isMethodSheetOpen() {
  return open;
}

/**
 * @param {{ returnFocusId?: string | null }} [opts]
 */
export function openMethodSheet(opts = {}) {
  const host = overlayHost();
  if (open && host.querySelector('.method-shell') && !host._methodClosing) {
    return;
  }

  beforeOpenHook?.();
  clearCloseTimer(host);
  host.innerHTML = '';
  open = true;
  returnFocusId =
    opts.returnFocusId != null ? opts.returnFocusId : TRIGGER_ID;

  lockPageScroll();

  const backdrop = el('div', {
    className: 'faculty-overlay-backdrop method-shell-backdrop',
    role: 'button',
    'aria-label': 'Закрыть',
    tabindex: '-1',
  });
  backdrop.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeMethodSheet();
  });

  const dialog = el('div', {
    className: 'faculty-overlay method-overlay',
    id: DIALOG_ID,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': TITLE_ID,
    tabindex: '-1',
  });

  const header = el('div', { className: 'faculty-overlay-header' });
  header.append(
    el('h2', {
      className: 'faculty-overlay-title',
      id: TITLE_ID,
      text: 'Как считается место',
    }),
    (() => {
      const close = el('button', {
        className: 'faculty-overlay-close',
        type: 'button',
        'aria-label': 'Закрыть',
        text: '×',
      });
      close.addEventListener('click', () => closeMethodSheet());
      return close;
    })(),
  );

  const body = el('div', {
    className: 'method-overlay-body',
    tabindex: '0',
  });
  for (const text of METHOD_PARAGRAPHS) {
    body.append(el('p', { text }));
  }

  dialog.append(header, body);
  dialog.addEventListener('click', (e) => e.stopPropagation());

  const shell = el('div', {
    className: 'faculty-overlay-shell is-motion method-shell',
  });
  shell.append(backdrop, dialog);
  host.append(shell);

  if (prefersReducedMotion()) {
    shell.classList.add('is-open');
    focusNoScroll(dialog);
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!host.contains(shell)) return;
      shell.classList.add('is-open');
      focusNoScroll(dialog);
    });
  });
}

/**
 * @param {{ instant?: boolean, restoreFocus?: boolean }} [opts]
 */
export function closeMethodSheet(opts = {}) {
  const { instant = false, restoreFocus = true } = opts;
  const host = overlayHost();
  const shell = host.querySelector('.method-shell');

  if (!open && !shell) {
    unlockPageScroll();
    return;
  }

  const focusId = returnFocusId;

  const finish = () => {
    clearCloseTimer(host);
    open = false;
    if (shell && host.contains(shell)) shell.remove();
    if (!host.querySelector('.method-shell')) host.innerHTML = '';
    unlockPageScroll();
    returnFocusId = null;

    if (restoreFocus && focusId) {
      const trigger = document.getElementById(focusId);
      if (trigger instanceof HTMLElement) focusNoScroll(trigger);
    }
  };

  if (instant || !shell || prefersReducedMotion()) {
    finish();
    return;
  }

  if (host._methodClosing) return;
  host._methodClosing = true;

  const dialog = host.querySelector(`#${DIALOG_ID}`);
  if (dialog instanceof HTMLElement) focusNoScroll(dialog);

  shell.style.pointerEvents = 'none';
  shell.classList.remove('is-open');
  shell.classList.add('is-leaving');

  const backdrop = shell.querySelector('.method-shell-backdrop');
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    if (backdrop) backdrop.removeEventListener('transitionend', onEnd);
    finish();
  };

  const onEnd = (ev) => {
    if (ev.target !== backdrop) return;
    if (ev.propertyName !== 'opacity') return;
    settle();
  };

  if (backdrop) backdrop.addEventListener('transitionend', onEnd);
  closeTimer = setTimeout(settle, CLOSE_MS_FULL);
}

export const METHOD_SHEET = Object.freeze({
  overlayId: DIALOG_ID,
  rootId: OVERLAY_ID,
  triggerId: TRIGGER_ID,
  closeMs: CLOSE_MS_FULL,
});
