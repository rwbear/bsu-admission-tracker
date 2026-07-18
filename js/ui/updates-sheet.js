/**
 * «Как обновляются данные» — method-sheet chrome, bulletproof open/close.
 *
 * Scroll lock via shared overlay-scroll-lock (body position:fixed).
 * Opacity-first leave; teardown after backdrop transitionend.
 */

import { el } from './dom.js';
import {
  UPDATES_TITLE,
  UPDATES_LEDE,
  UPDATES_FACTS,
  UPDATES_FOOT,
} from './updates-copy.js';
import {
  acquireOverlayScrollLock,
  releaseOverlayScrollLock,
  focusNoScroll,
  commitOverlayEnter,
  OVERLAY_LEAVE_MS,
} from './overlay-scroll-lock.js';

const OVERLAY_ID = 'updates-overlay-root';
const DIALOG_ID = 'updates-overlay';
const TITLE_ID = 'updates-overlay-title';
const TRIGGER_ID = 'update-status';
const LOCK_ID = 'updates';

/** @type {ReturnType<typeof setTimeout> | null} */
let closeTimer = null;
/** @type {string | null} */
let returnFocusId = null;
/** @type {null | (() => void)} */
let beforeOpenHook = null;
let open = false;

/**
 * Wire mutual exclusion with faculty/table/method overlays (from main.js).
 * @param {{ beforeOpen?: () => void }} hooks
 */
export function armUpdatesSheetChrome(hooks = {}) {
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
  host._updatesClosing = false;
}

/**
 * @returns {boolean}
 */
export function isUpdatesSheetOpen() {
  return open;
}

/**
 * @param {{ returnFocusId?: string | null }} [opts]
 */
export function openUpdatesSheet(opts = {}) {
  const host = overlayHost();
  if (open && host.querySelector('.updates-shell') && !host._updatesClosing) {
    return;
  }

  beforeOpenHook?.();
  clearCloseTimer(host);
  host.innerHTML = '';
  open = true;
  returnFocusId =
    opts.returnFocusId != null ? opts.returnFocusId : TRIGGER_ID;

  acquireOverlayScrollLock(LOCK_ID);
  document.documentElement.classList.add('updates-overlay-open');

  const backdrop = el('div', {
    className: 'faculty-overlay-backdrop updates-shell-backdrop',
    role: 'button',
    'aria-label': 'Закрыть',
    tabindex: '-1',
  });
  backdrop.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeUpdatesSheet();
  });

  const dialog = el('div', {
    className: 'faculty-overlay updates-overlay',
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
      text: UPDATES_TITLE,
    }),
    (() => {
      const close = el('button', {
        className: 'faculty-overlay-close',
        type: 'button',
        'aria-label': 'Закрыть',
        text: '×',
      });
      close.addEventListener('click', () => closeUpdatesSheet());
      return close;
    })(),
  );

  const body = el('div', {
    className: 'method-overlay-body updates-overlay-body',
    tabindex: '0',
  });
  body.append(el('p', { className: 'updates-lede', text: UPDATES_LEDE }));

  const dl = el('dl', { className: 'updates-facts' });
  for (const fact of UPDATES_FACTS) {
    dl.append(
      el('dt', { text: fact.term }),
      el('dd', { text: fact.def }),
    );
  }
  body.append(dl);
  body.append(el('p', { className: 'updates-foot', text: UPDATES_FOOT }));

  dialog.append(header, body);
  dialog.addEventListener('click', (e) => e.stopPropagation());

  const shell = el('div', {
    className: 'faculty-overlay-shell is-motion updates-shell',
  });
  shell.append(backdrop, dialog);
  host.append(shell);

  const reveal = () => {
    shell.classList.add('is-open');
    focusNoScroll(dialog);
  };

  if (prefersReducedMotion()) {
    reveal();
    return;
  }

  commitOverlayEnter(shell, reveal);
}

/**
 * @param {{ instant?: boolean, restoreFocus?: boolean }} [opts]
 */
export function closeUpdatesSheet(opts = {}) {
  const { instant = false, restoreFocus = true } = opts;
  const host = overlayHost();
  const shell = host.querySelector('.updates-shell');

  if (!open && !shell) {
    document.documentElement.classList.remove('updates-overlay-open');
    releaseOverlayScrollLock(LOCK_ID);
    return;
  }

  const focusId = returnFocusId;

  const finish = () => {
    clearCloseTimer(host);
    open = false;
    if (shell && host.contains(shell)) shell.remove();
    if (!host.querySelector('.updates-shell')) host.innerHTML = '';
    document.documentElement.classList.remove('updates-overlay-open');
    releaseOverlayScrollLock(LOCK_ID);
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

  if (host._updatesClosing) return;
  host._updatesClosing = true;

  const dialog = host.querySelector(`#${DIALOG_ID}`);
  if (dialog instanceof HTMLElement) focusNoScroll(dialog);

  shell.style.pointerEvents = 'none';
  shell.classList.remove('is-open');
  shell.classList.add('is-leaving');

  const backdrop = shell.querySelector('.updates-shell-backdrop');
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
  closeTimer = setTimeout(settle, OVERLAY_LEAVE_MS);
}

/**
 * Toggle open/close from the header trigger.
 */
export function toggleUpdatesSheet() {
  if (open) closeUpdatesSheet();
  else openUpdatesSheet();
}

export const UPDATES_SHEET = Object.freeze({
  overlayId: DIALOG_ID,
  rootId: OVERLAY_ID,
  triggerId: TRIGGER_ID,
  closeMs: OVERLAY_LEAVE_MS,
});
