/**
 * Creator / contacts sheet — method/updates chrome, bulletproof open/close.
 *
 * Scroll lock via shared overlay-scroll-lock (body position:fixed).
 * Opacity-first leave; teardown after backdrop transitionend.
 */

import { el } from './dom.js';
import {
  CREATOR_TITLE,
  CREATOR_GREETING,
  CREATOR_LEDE,
  CREATOR_PARAGRAPHS,
  CREATOR_CONTACTS,
} from './creator-copy.js';
import {
  acquireOverlayScrollLock,
  releaseOverlayScrollLock,
  focusNoScroll,
  OVERLAY_LEAVE_MS,
} from './overlay-scroll-lock.js';

const OVERLAY_ID = 'creator-overlay-root';
const DIALOG_ID = 'creator-overlay';
const TITLE_ID = 'creator-overlay-title';
const TRIGGER_ID = 'creator-trigger';
const LOCK_ID = 'creator';

/** @type {ReturnType<typeof setTimeout> | null} */
let closeTimer = null;
/** @type {string | null} */
let returnFocusId = null;
/** @type {null | (() => void)} */
let beforeOpenHook = null;
let open = false;

/**
 * Wire mutual exclusion with other overlays (from main.js).
 * @param {{ beforeOpen?: () => void }} hooks
 */
export function armCreatorSheetChrome(hooks = {}) {
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
  host._creatorClosing = false;
}

/**
 * @returns {boolean}
 */
export function isCreatorSheetOpen() {
  return open;
}

/**
 * @param {{ returnFocusId?: string | null }} [opts]
 */
export function openCreatorSheet(opts = {}) {
  const host = overlayHost();
  if (open && host.querySelector('.creator-shell') && !host._creatorClosing) {
    return;
  }

  beforeOpenHook?.();
  clearCloseTimer(host);
  host.innerHTML = '';
  open = true;
  returnFocusId =
    opts.returnFocusId != null ? opts.returnFocusId : TRIGGER_ID;

  acquireOverlayScrollLock(LOCK_ID);
  document.documentElement.classList.add('creator-overlay-open');
  const brand = document.getElementById(TRIGGER_ID);
  if (brand) brand.setAttribute('aria-expanded', 'true');

  const backdrop = el('div', {
    className: 'faculty-overlay-backdrop creator-shell-backdrop',
    role: 'button',
    'aria-label': 'Закрыть',
    tabindex: '-1',
  });
  backdrop.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeCreatorSheet({ restoreFocus: false });
  });

  const dialog = el('div', {
    className: 'faculty-overlay creator-overlay',
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
      text: CREATOR_TITLE,
    }),
    (() => {
      const close = el('button', {
        className: 'faculty-overlay-close',
        type: 'button',
        'aria-label': 'Закрыть',
        text: '×',
      });
      close.addEventListener('click', () =>
        closeCreatorSheet({ restoreFocus: false }),
      );
      return close;
    })(),
  );

  const body = el('div', {
    className: 'method-overlay-body creator-overlay-body',
    tabindex: '0',
  });

  body.append(
    el('p', { className: 'creator-greeting', text: CREATOR_GREETING }),
    el('p', { className: 'creator-lede', text: CREATOR_LEDE }),
  );

  for (const text of CREATOR_PARAGRAPHS) {
    body.append(el('p', { text }));
  }

  const contacts = el('div', { className: 'creator-contacts' });
  contacts.append(
    el('h3', {
      className: 'creator-contacts-title',
      text: 'Контакты',
    }),
  );

  const dl = el('dl', { className: 'updates-facts creator-contacts-list' });
  for (const item of CREATOR_CONTACTS) {
    dl.append(el('dt', { text: item.term }));
    const linkAttrs = {
      className: 'creator-contact-link',
      href: item.href,
      text: item.label,
    };
    if (item.external) {
      linkAttrs.target = '_blank';
      linkAttrs.rel = 'noopener noreferrer';
    }
    dl.append(el('dd', {}, [el('a', linkAttrs)]));
  }
  contacts.append(dl);
  body.append(contacts);

  dialog.append(header, body);
  dialog.addEventListener('click', (e) => e.stopPropagation());

  const shell = el('div', {
    className: 'faculty-overlay-shell is-motion creator-shell',
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
export function closeCreatorSheet(opts = {}) {
  const { instant = false, restoreFocus = false } = opts;
  const host = overlayHost();
  const shell = host.querySelector('.creator-shell');

  if (!open && !shell) {
    document.documentElement.classList.remove('creator-overlay-open');
    releaseOverlayScrollLock(LOCK_ID);
    return;
  }

  const focusId = returnFocusId;

  const finish = () => {
    clearCloseTimer(host);
    open = false;
    if (shell && host.contains(shell)) shell.remove();
    if (!host.querySelector('.creator-shell')) host.innerHTML = '';
    document.documentElement.classList.remove('creator-overlay-open');
    releaseOverlayScrollLock(LOCK_ID);
    returnFocusId = null;

    const brand = document.getElementById(TRIGGER_ID);
    if (brand) brand.setAttribute('aria-expanded', 'false');

    if (restoreFocus && focusId) {
      const trigger = document.getElementById(focusId);
      if (trigger instanceof HTMLElement) focusNoScroll(trigger);
    }
  };

  if (instant || !shell || prefersReducedMotion()) {
    finish();
    return;
  }

  if (host._creatorClosing) return;
  host._creatorClosing = true;

  const dialog = host.querySelector(`#${DIALOG_ID}`);
  if (dialog instanceof HTMLElement) focusNoScroll(dialog);

  shell.style.pointerEvents = 'none';
  shell.classList.remove('is-open');
  shell.classList.add('is-leaving');

  const backdrop = shell.querySelector('.creator-shell-backdrop');
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
 * Toggle from the brand badge.
 */
export function toggleCreatorSheet() {
  if (open) closeCreatorSheet({ restoreFocus: false });
  else openCreatorSheet();
}

export const CREATOR_SHEET = Object.freeze({
  overlayId: DIALOG_ID,
  rootId: OVERLAY_ID,
  triggerId: TRIGGER_ID,
  closeMs: OVERLAY_LEAVE_MS,
});
