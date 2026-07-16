import { el } from './dom.js';
import {
  DEFAULT_FACULTY_ID,
  DEFAULT_FACULTY_NAME,
  filterFacultiesByName,
} from '../faculties.js';

const OVERLAY_ID = 'faculty-overlay-root';
const CLOSE_MS_FULL = 220;

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
  list.innerHTML = '';

  if (!model.faculties.length) {
    list.append(
      el('div', {
        className: 'faculty-empty',
        text: 'Список факультетов пока пуст',
      }),
    );
    return;
  }

  if (!model.filtered.length) {
    list.append(
      el('div', {
        className: 'faculty-empty',
        text: 'Ничего не нашлось',
      }),
    );
    return;
  }

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
    option.addEventListener('click', (e) => {
      e.stopPropagation();
      model.onSelect(fac.id);
    });
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
  const btn = mount.querySelector('#faculty-trigger');
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
    id: 'faculty-trigger',
    'aria-haspopup': 'dialog',
    'aria-expanded': open ? 'true' : 'false',
    'aria-controls': 'faculty-overlay',
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
  document.documentElement.classList.add('faculty-overlay-open');

  const backdrop = el('button', {
    className: 'faculty-overlay-backdrop',
    type: 'button',
    'aria-label': 'Закрыть',
  });
  backdrop.addEventListener('click', () => {
    const current = host._facultyOpts;
    if (current?.onClose) current.onClose();
  });

  const dialog = el('div', {
    className: 'faculty-overlay',
    id: 'faculty-overlay',
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
    placeholder: 'Поиск по названию',
    autocomplete: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
    'aria-label': 'Поиск факультета по названию',
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

  // Enter on next frames so the browser paints the initial (hidden) state first.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!host.contains(shell)) return;
      shell.classList.add('is-open');
    });
  });

  return { dialog, search, list, shell };
}

/**
 * Play exit motion, then tear down. Search field stays put until the end.
 * @param {HTMLElement} host
 */
function beginCloseOverlay(host) {
  const shell = host.querySelector('.faculty-overlay-shell');
  if (!shell) {
    document.documentElement.classList.remove('faculty-overlay-open');
    host.innerHTML = '';
    return;
  }
  if (host._facultyClosing) return;

  host._facultyClosing = true;
  shell.classList.remove('is-open');
  shell.classList.add('is-leaving');
  document.documentElement.classList.remove('faculty-overlay-open');

  const finish = () => {
    clearCloseTimer(host);
    if (host.contains(shell)) shell.remove();
    if (!host.querySelector('.faculty-overlay-shell')) host.innerHTML = '';
  };

  closeTimer = setTimeout(finish, closeDelayMs());
}

/**
 * Hero title button + centered popover.
 * Overlay is mounted once per open session; typing only refreshes the list
 * so the dialog does not blink, remount, or re-animate on each key.
 *
 * @param {HTMLElement} mount
 * @param {{
 *   faculties: { id: string, name: string, specialtyCount?: number }[],
 *   selectedId: string | null,
 *   open: boolean,
 *   query: string,
 *   onToggle: () => void,
 *   onSelect: (id: string) => void,
 *   onClose: () => void,
 *   onQuery: (q: string) => void,
 * }} opts
 */
export function renderFacultyPicker(mount, opts) {
  const faculties = opts.faculties || [];
  const filtered = filterFacultiesByName(faculties, opts.query);
  const selected = resolveSelected(faculties, opts.selectedId);
  const label = selected?.name || DEFAULT_FACULTY_NAME;
  const query = opts.query || '';
  const host = overlayHost();
  host._facultyOpts = opts;

  const btn = paintTrigger(mount, label, opts.open, opts.onToggle);
  const existing = host.querySelector('.faculty-overlay-shell');

  if (!opts.open) {
    beginCloseOverlay(host);
    return { button: btn, menu: null, search: null };
  }

  // Still animating out — cancel leave and treat as a fresh open.
  if (existing?.classList.contains('is-leaving')) {
    clearCloseTimer(host);
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
