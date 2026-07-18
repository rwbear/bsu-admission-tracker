import { el } from './dom.js';
import {
  DEFAULT_FACULTY_ID,
  DEFAULT_FACULTY_NAME,
  filterFacultiesByName,
} from '../faculties.js';
import {
  optionListMatches,
  patchOptionSelection,
} from './selection-list.js';
import { bindOptionActivate } from './option-activate.js';
import {
  followOverlayViewport,
  pinOverlayShell,
} from './overlay-viewport.js';
import {
  acquireOverlayScrollLock,
  releaseOverlayScrollLock,
  focusNoScroll,
  OVERLAY_LEAVE_MS,
} from './overlay-scroll-lock.js';

const OVERLAY_ID = 'faculty-overlay-root';
const DIALOG_ID = 'faculty-overlay';
const TRIGGER_ID = 'faculty-trigger';
const LOCK_ID = 'faculty';

function prefersReducedMotion() {
  try {
    return Boolean(
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    );
  } catch {
    return false;
  }
}

/** @type {ReturnType<typeof setTimeout> | null} */
let closeTimer = null;

/**
 * Body-level portal so the overlay isn't clipped by hero layout.
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
  host._facultyClosing = false;
}

/**
 * @param {HTMLElement} host
 */
function disposeFacultyViewport(host) {
  host._facultyViewport?.dispose?.();
  host._facultyViewport = null;
}

/**
 * Blur search before leave so the keyboard starts dismissing with the fade,
 * not after unlock (which reads as a second layout jump on mobile).
 * @param {ParentNode | null} root
 */
function blurFacultySearch(root) {
  const search = root?.querySelector?.('#faculty-search-input');
  if (search instanceof HTMLElement && document.activeElement === search) {
    search.blur();
  }
}

/**
 * Resolve label + selection model for the trigger / active row.
 * @param {{ id: string, name: string, specialtyCount?: number }[]} faculties
 * @param {string | null} selectedId
 */
function resolveSelected(faculties, selectedId) {
  return (
    faculties.find((f) => f.id === selectedId) ||
    (selectedId === DEFAULT_FACULTY_ID
      ? { id: DEFAULT_FACULTY_ID, name: DEFAULT_FACULTY_NAME }
      : null) ||
    faculties[0] || {
      id: DEFAULT_FACULTY_ID,
      name: DEFAULT_FACULTY_NAME,
    }
  );
}

/**
 * Rebuild only the option list — never the dialog shell or search field.
 * @param {HTMLElement} list
 * @param {{
 *   faculties: { id: string, name: string, specialtyCount?: number }[],
 *   filtered: { id: string, name: string, specialtyCount?: number }[],
 *   selectedId: string | null,
 *   onSelect: (id: string) => void,
 * }} model
 */
function paintFacultyList(list, model) {
  if (!model.faculties.length) {
    list.dataset.listSig = 'empty';
    list.innerHTML = '';
    list.append(
      el('div', {
        className: 'faculty-empty',
        text: 'Список факультетов пока пуст',
      }),
    );
    return;
  }

  if (!model.filtered.length) {
    list.dataset.listSig = 'empty-filter';
    list.innerHTML = '';
    list.append(
      el('div', {
        className: 'faculty-empty',
        text: 'Ничего не нашлось',
      }),
    );
    return;
  }

  // Same ordered ids → patch selection only (keeps background transitions alive).
  if (optionListMatches(list, '.faculty-option', model.filtered)) {
    patchOptionSelection(
      list,
      '.faculty-option',
      model.selectedId,
      'is-active',
    );
    return;
  }

  list.dataset.listSig = model.filtered.map((f) => f.id).join('|');
  list.innerHTML = '';

  for (const fac of model.filtered) {
    const active = model.selectedId != null && fac.id === model.selectedId;
    const option = el('button', {
      className: `faculty-option${active ? ' is-active' : ''}`,
      type: 'button',
      role: 'option',
      'aria-selected': active ? 'true' : 'false',
      'data-id': fac.id,
    });
    option.append(
      el('span', { className: 'faculty-option-name', text: fac.name }),
      el('span', {
        className: 'faculty-option-count',
        text: String(fac.specialtyCount ?? 0),
      }),
    );
    bindOptionActivate(
      option,
      () => {
        // Optimistic highlight on this frame so the color can ease before close.
        patchOptionSelection(list, '.faculty-option', fac.id, 'is-active');
        model.onSelect(fac.id);
      },
      { scrollParent: list },
    );
    list.append(option);
  }
}

/**
 * @param {HTMLElement} mount
 * @param {string} label
 * @param {boolean} open
 * @param {() => void} onToggle
 */
function paintTrigger(mount, label, open, onToggle) {
  const root = mount.querySelector('.faculty-picker');
  const labelEl = mount.querySelector('.faculty-trigger-label');
  const btn = mount.querySelector(`#${TRIGGER_ID}`);
  if (
    root instanceof HTMLElement &&
    labelEl instanceof HTMLElement &&
    btn instanceof HTMLButtonElement
  ) {
    labelEl.textContent = label;
    root.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    return btn;
  }

  mount.innerHTML = '';
  const nextRoot = el('div', {
    className: `faculty-picker${open ? ' is-open' : ''}`,
  });
  const nextBtn = el('button', {
    className: 'faculty-trigger',
    type: 'button',
    id: TRIGGER_ID,
    'aria-haspopup': 'dialog',
    'aria-expanded': open ? 'true' : 'false',
    'aria-controls': DIALOG_ID,
  });
  nextBtn.append(
    el('span', { className: 'faculty-trigger-label', text: label }),
    el('span', {
      className: 'faculty-trigger-chevron',
      'aria-hidden': 'true',
      text: '^',
    }),
  );
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const host = overlayHost();
    const current = host._facultyOpts;
    if (current?.onToggle) current.onToggle();
    else onToggle();
  });
  nextRoot.append(nextBtn);
  mount.append(nextRoot);
  return nextBtn;
}

/**
 * Mount a fresh overlay shell once; later updates only patch the list.
 * @param {HTMLElement} host
 * @param {object} opts
 * @param {{ id: string, name: string, specialtyCount?: number }[]} faculties
 * @param {{ id: string, name: string, specialtyCount?: number }[]} filtered
 * @param {string} query
 * @param {{ id: string, name: string } | null} selected
 */
function mountOverlay(host, opts, faculties, filtered, query, selected) {
  clearCloseTimer(host);
  host.innerHTML = '';
  acquireOverlayScrollLock(LOCK_ID);
  document.documentElement.classList.add('faculty-overlay-open');

  const backdrop = el('div', {
    className: 'faculty-overlay-backdrop',
    role: 'button',
    'aria-label': 'Закрыть',
    tabindex: '-1',
  });
  // pointerdown + preventDefault: don't steal focus onto the backdrop
  // (focus→trigger with smooth scroll was a close blink).
  backdrop.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const current = host._facultyOpts;
    if (current?.onClose) current.onClose();
  });

  const dialog = el('div', {
    className: 'faculty-overlay',
    id: DIALOG_ID,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'faculty-overlay-title',
    tabindex: '-1',
  });

  const header = el('div', { className: 'faculty-overlay-header' });
  header.append(
    el('h2', {
      className: 'faculty-overlay-title',
      id: 'faculty-overlay-title',
      text: 'Факультет',
    }),
    (() => {
      const close = el('button', {
        className: 'faculty-overlay-close',
        type: 'button',
        'aria-label': 'Закрыть',
        text: '×',
      });
      close.addEventListener('click', () => {
        const current = host._facultyOpts;
        if (current?.onClose) current.onClose();
      });
      return close;
    })(),
  );

  const searchWrap = el('div', { className: 'faculty-search' });
  const search = el('input', {
    className: 'faculty-search-input',
    id: 'faculty-search-input',
    type: 'search',
    role: 'searchbox',
    placeholder: 'Факультет, ФМО, специальность…',
    autocomplete: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
    'aria-label': 'Поиск факультета по названию, сокращению или специальности',
  });
  search.value = query;
  // Keep the input node alive across keystrokes — query updates patch the list only.
  search.addEventListener('input', () => {
    const current = host._facultyOpts;
    if (current?.onQuery) current.onQuery(search.value);
  });
  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const first = dialog.querySelector('.faculty-option');
      if (first instanceof HTMLElement) first.focus();
    }
  });
  searchWrap.append(search);

  const list = el('div', {
    className: 'faculty-overlay-list',
    role: 'listbox',
    'aria-label': 'Факультеты',
  });
  paintFacultyList(list, {
    faculties,
    filtered,
    selectedId: selected?.id ?? null,
    onSelect: (id) => {
      const current = host._facultyOpts;
      if (current?.onSelect) current.onSelect(id);
    },
  });

  dialog.append(header, searchWrap, list);
  dialog.addEventListener('click', (e) => e.stopPropagation());

  const shell = el('div', { className: 'faculty-overlay-shell is-motion' });
  shell.append(backdrop, dialog);
  host.append(shell);
  host._facultyOpts = opts;
  disposeFacultyViewport(host);
  host._facultyViewport = pinOverlayShell(shell);

  // visualViewport events lag the keyboard on iOS — sync on focus/blur too.
  search.addEventListener('focus', () => {
    host._facultyViewport?.sync?.();
    followOverlayViewport(
      host._facultyViewport,
      () =>
        host.contains(shell) &&
        document.activeElement === search &&
        !host._facultyClosing,
    );
  });
  search.addEventListener('blur', () => {
    host._facultyViewport?.sync?.();
    followOverlayViewport(
      host._facultyViewport,
      () => host.contains(shell) && !host._facultyClosing,
    );
  });

  if (prefersReducedMotion()) {
    shell.classList.add('is-open');
    focusNoScroll(dialog);
    return { dialog, search, list, shell };
  }

  // Enter on next frames so the browser paints the initial (hidden) state first.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!host.contains(shell)) return;
      shell.classList.add('is-open');
      focusNoScroll(dialog);
    });
  });

  return { dialog, search, list, shell };
}

/**
 * Restore trigger focus + unlock in one synchronous turn.
 * A separate timer for focus (old main.js path) painted a frame with
 * focus on <body> after dialog removal — same blink as the method sheet.
 * @param {HTMLElement} host
 * @param {HTMLElement | null} shell
 * @param {boolean} restoreFocus
 */
function teardownFacultyOverlay(host, shell, restoreFocus) {
  clearCloseTimer(host);
  blurFacultySearch(shell);
  disposeFacultyViewport(host);

  // Focus BEFORE remove so tearing down the dialog never drops focus to <body>.
  if (restoreFocus) {
    const trigger = document.getElementById(TRIGGER_ID);
    if (trigger instanceof HTMLElement) focusNoScroll(trigger);
  } else {
    const active = document.activeElement;
    if (active instanceof HTMLElement && shell?.contains(active)) active.blur();
  }

  document.documentElement.classList.remove('faculty-overlay-open');
  if (shell && host.contains(shell)) shell.remove();
  if (!host.querySelector('.faculty-overlay-shell')) host.innerHTML = '';
  releaseOverlayScrollLock(LOCK_ID);
  host._facultyRestoreFocus = true;
}

/**
 * Play exit motion, then tear down after the backdrop fade settles.
 * @param {HTMLElement} host
 * @param {{ restoreFocus?: boolean }} [opts]
 */
function beginCloseOverlay(host, opts = {}) {
  const restoreFocus = opts.restoreFocus !== false;
  host._facultyRestoreFocus = restoreFocus;

  const shell = host.querySelector('.faculty-overlay-shell');
  if (!shell) {
    teardownFacultyOverlay(host, null, restoreFocus);
    return;
  }
  if (host._facultyClosing) return;

  host._facultyClosing = true;
  shell.style.pointerEvents = 'none';
  // Dismiss keyboard with the leave motion — not after unlock.
  blurFacultySearch(shell);
  const dialog = shell.querySelector(`#${DIALOG_ID}`);
  if (dialog instanceof HTMLElement) focusNoScroll(dialog);

  shell.classList.remove('is-open');
  shell.classList.add('is-leaving');

  const backdrop = shell.querySelector('.faculty-overlay-backdrop');
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    if (backdrop) backdrop.removeEventListener('transitionend', onEnd);
    teardownFacultyOverlay(host, shell, host._facultyRestoreFocus !== false);
  };

  const onEnd = (ev) => {
    if (ev.target !== backdrop) return;
    if (ev.propertyName !== 'opacity') return;
    finish();
  };

  if (prefersReducedMotion()) {
    finish();
    return;
  }

  if (backdrop) backdrop.addEventListener('transitionend', onEnd);
  closeTimer = setTimeout(finish, OVERLAY_LEAVE_MS);
}

/**
 * Hero title button + centered popover.
 * Overlay is mounted once per open session; typing only refreshes the list
 * so the dialog does not blink, remount, or re-animate on each key.
 *
 * @param {HTMLElement} mount
 * @param {{
 *   faculties: { id: string, name: string, specialtyCount?: number }[],
 *   specialties?: { facultyId?: string, specName?: string }[],
 *   selectedId: string | null,
 *   open: boolean,
 *   query: string,
 *   onToggle: () => void,
 *   onSelect: (id: string) => void,
 *   onClose: () => void,
 *   onQuery: (q: string) => void,
 *   restoreFocus?: boolean,
 * }} opts
 */
export function renderFacultyPicker(mount, opts) {
  const faculties = opts.faculties || [];
  const filtered = filterFacultiesByName(
    faculties,
    opts.query,
    opts.specialties || [],
  );
  const selected = resolveSelected(faculties, opts.selectedId);
  const label = selected?.name || DEFAULT_FACULTY_NAME;
  const query = opts.query || '';
  const host = overlayHost();
  host._facultyOpts = opts;

  const btn = paintTrigger(mount, label, opts.open, opts.onToggle);
  const existing = host.querySelector('.faculty-overlay-shell');

  if (!opts.open) {
    beginCloseOverlay(host, { restoreFocus: opts.restoreFocus !== false });
    return { button: btn, menu: null, search: null };
  }

  // Still animating out — cancel leave and treat as a fresh open.
  if (existing?.classList.contains('is-leaving')) {
    clearCloseTimer(host);
    disposeFacultyViewport(host);
    existing.remove();
  }

  const live = host.querySelector('.faculty-overlay-shell');
  if (live && !live.classList.contains('is-leaving')) {
    const list = live.querySelector('.faculty-overlay-list');
    if (list instanceof HTMLElement) {
      paintFacultyList(list, {
        faculties,
        filtered,
        selectedId: selected?.id ?? null,
        onSelect: (id) => {
          const current = host._facultyOpts;
          if (current?.onSelect) current.onSelect(id);
        },
      });
    }
    live.classList.add('is-open');
    acquireOverlayScrollLock(LOCK_ID);
    document.documentElement.classList.add('faculty-overlay-open');
    const dialog = live.querySelector('.faculty-overlay');
    const search = live.querySelector('#faculty-search-input');
    return {
      button: btn,
      menu: dialog instanceof HTMLElement ? dialog : null,
      search: search instanceof HTMLInputElement ? search : null,
    };
  }

  const mounted = mountOverlay(
    host,
    opts,
    faculties,
    filtered,
    query,
    selected,
  );
  return {
    button: btn,
    menu: mounted.dialog,
    search: mounted.search,
  };
}
