/**
 * Methodology sheet — reuses the faculty overlay shell (same motion / lock).
 *
 * Contract:
 * - Body portal `#method-overlay-root` (not clipped by detail panel).
 * - CSS: `.faculty-overlay-shell.is-motion` + `.faculty-overlay.method-overlay`.
 * - Enter: paint hidden → double-rAF → `.is-open` (same as faculty).
 * - Leave: `.is-leaving` then teardown after CLOSE_MS_FULL; scroll-lock until end.
 * - Escape / Tab trap wired from main.js `bindPickerChrome`.
 * - Mutual exclusion: callers close faculty/table before opening; those openers
 *   call `closeMethodSheet({ restoreFocus: false })`.
 * - Detail remount: `closeMethodSheet({ instant: true, restoreFocus: false })`.
 */

import { el } from './dom.js';
import { METHOD_PARAGRAPHS } from './method-copy.js';

const OVERLAY_ID = 'method-overlay-root';
const DIALOG_ID = 'method-overlay';
const TITLE_ID = 'method-overlay-title';
const TRIGGER_ID = 'method-sheet-trigger';
const CLOSE_MS_FULL = 220;

/** @type {ReturnType<typeof setTimeout> | null} */
let closeTimer = null;
/** @type {string | null} */
let returnFocusId = null;
/** @type {null | (() => void)} */
let beforeOpenHook = null;
let open = false;

/**
 * Wire mutual exclusion with faculty/table menus (from main.js).
 * @param {{ beforeOpen?: () => void }} hooks
 */
export function armMethodSheetChrome(hooks = {}) {
  beforeOpenHook = hooks.beforeOpen || null;
}

function closeDelayMs() {
  try {
    if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      return 0;
    }
  } catch {
    /* ignore */
  }
  return CLOSE_MS_FULL;
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
  if (open && host.querySelector('.faculty-overlay-shell') && !host._methodClosing) {
    return;
  }

  beforeOpenHook?.();

  clearCloseTimer(host);
  host.innerHTML = '';
  open = true;
  returnFocusId =
    opts.returnFocusId != null ? opts.returnFocusId : TRIGGER_ID;
  document.documentElement.classList.add('method-overlay-open');

  const backdrop = el('button', {
    className: 'faculty-overlay-backdrop',
    type: 'button',
    'aria-label': 'Закрыть',
    tabindex: '-1',
  });
  // pointerdown + preventDefault: don't move focus onto the backdrop.
  // Focus→trigger with smooth scroll was the page blink on outside-tap close.
  backdrop.addEventListener('pointerdown', (e) => {
    e.preventDefault();
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

  const shell = el('div', { className: 'faculty-overlay-shell is-motion' });
  shell.append(backdrop, dialog);
  host.append(shell);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!host.contains(shell)) return;
      shell.classList.add('is-open');
      dialog.focus({ preventScroll: true });
    });
  });
}

/**
 * @param {HTMLElement} el
 */
function focusNoScroll(el) {
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
}

/**
 * @param {{ instant?: boolean, restoreFocus?: boolean }} [opts]
 */
export function closeMethodSheet(opts = {}) {
  const { instant = false, restoreFocus = true } = opts;
  const host = overlayHost();
  const shell = host.querySelector('.faculty-overlay-shell');

  if (!open && !shell) return;

  const focusId = returnFocusId;

  const finish = () => {
    clearCloseTimer(host);
    open = false;
    document.documentElement.classList.remove('method-overlay-open');
    if (shell && host.contains(shell)) shell.remove();
    if (!host.querySelector('.faculty-overlay-shell')) host.innerHTML = '';
    returnFocusId = null;

    if (restoreFocus && focusId) {
      const trigger = document.getElementById(focusId);
      if (trigger instanceof HTMLElement) focusNoScroll(trigger);
    }
  };

  if (instant || !shell) {
    finish();
    return;
  }

  if (host._methodClosing) return;
  host._methodClosing = true;
  // Park focus on the dialog (not the backdrop) so teardown doesn't scroll.
  const dialog = host.querySelector(`#${DIALOG_ID}`);
  if (dialog instanceof HTMLElement) focusNoScroll(dialog);
  shell.classList.remove('is-open');
  shell.classList.add('is-leaving');
  closeTimer = setTimeout(finish, closeDelayMs());
}

export const METHOD_SHEET = Object.freeze({
  overlayId: DIALOG_ID,
  rootId: OVERLAY_ID,
  triggerId: TRIGGER_ID,
  closeMs: CLOSE_MS_FULL,
});
