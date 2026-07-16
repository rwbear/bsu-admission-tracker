import { el } from './dom.js';
import {
  DEFAULT_TABLE_ID,
  filterTablesByQuery,
  groupTablesByTrack,
  resolveTableId,
  shortTableLabel,
  tableById,
} from '../tables.js';

const OVERLAY_ID = 'table-overlay-root';
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
  host._tableClosing = false;
}

/**
 * Rebuild only the option list — never the dialog shell or search field.
 * @param {HTMLElement} list
 * @param {{
 *   tables: object[],
 *   groups: { track: { name: string }, tables: object[] }[],
 *   selectedId: string | null,
 * }} model
 */
function paintTableList(list, model) {
  list.innerHTML = '';

  if (!model.tables.length) {
    list.append(
      el('div', {
        className: 'faculty-empty',
        text: 'Таблицы ещё не загружены',
      }),
    );
    return;
  }

  if (!model.groups.length) {
    list.append(
      el('div', {
        className: 'faculty-empty',
        text: 'Ничего не нашлось',
      }),
    );
    return;
  }

  for (const group of model.groups) {
    list.append(
      el('div', {
        className: 'table-group-label',
        text: group.track.name,
      }),
    );
    for (const table of group.tables) {
      const active = table.id === model.selectedId;
      const option = el('button', {
        className: `faculty-option${active ? ' is-active' : ''}`,
        type: 'button',
        role: 'option',
        'aria-selected': active ? 'true' : 'false',
        'data-id': table.id,
      });
      option.append(
        el('span', {
          className: 'faculty-option-name',
          text: table.shortName || table.name,
        }),
        el('span', {
          className: 'faculty-option-count',
          text: String(table.specialtyCount ?? 0),
        }),
      );
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const current = overlayHost()._tableOpts;
        if (current?.onSelect) current.onSelect(table.id);
      });
      list.append(option);
    }
  }
}

/**
 * @param {HTMLElement} mount
 * @param {string} label
 * @param {boolean} open
 * @param {() => void} onToggle
 */
function paintTrigger(mount, label, open, onToggle) {
  const root = mount.querySelector('.table-picker');
  const labelEl = mount.querySelector('.table-trigger-label');
  const btn = mount.querySelector('#table-trigger');
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
    className: `table-picker${open ? ' is-open' : ''}`,
  });
  const nextBtn = el('button', {
    className: 'table-trigger',
    type: 'button',
    id: 'table-trigger',
    'aria-haspopup': 'dialog',
    'aria-expanded': open ? 'true' : 'false',
    'aria-controls': 'table-overlay',
  });
  nextBtn.append(
    el('span', { className: 'table-trigger-label', text: label }),
    el('span', {
      className: 'table-trigger-chevron',
      'aria-hidden': 'true',
      text: '^',
    }),
  );
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const host = overlayHost();
    const current = host._tableOpts;
    if (current?.onToggle) current.onToggle();
    else onToggle();
  });
  nextRoot.append(nextBtn);
  mount.append(nextRoot);
  return nextBtn;
}

/**
 * @param {HTMLElement} host
 * @param {object} opts
 * @param {object[]} tables
 * @param {{ track: { name: string }, tables: object[] }[]} groups
 * @param {string} query
 * @param {string} selectedId
 */
function mountOverlay(host, opts, tables, groups, query, selectedId) {
  clearCloseTimer(host);
  host.innerHTML = '';
  document.documentElement.classList.add('table-overlay-open');

  const backdrop = el('button', {
    className: 'faculty-overlay-backdrop',
    type: 'button',
    'aria-label': 'Закрыть',
  });
  backdrop.addEventListener('click', () => {
    const current = host._tableOpts;
    if (current?.onClose) current.onClose();
  });

  const dialog = el('div', {
    className: 'faculty-overlay table-overlay',
    id: 'table-overlay',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'table-overlay-title',
    tabindex: '-1',
  });

  const header = el('div', { className: 'faculty-overlay-header' });
  header.append(
    el('h2', {
      className: 'faculty-overlay-title',
      id: 'table-overlay-title',
      text: 'Таблица конкурса',
    }),
    (() => {
      const close = el('button', {
        className: 'faculty-overlay-close',
        type: 'button',
        'aria-label': 'Закрыть',
        text: '×',
      });
      close.addEventListener('click', () => {
        const current = host._tableOpts;
        if (current?.onClose) current.onClose();
      });
      return close;
    })(),
  );

  const searchWrap = el('div', { className: 'faculty-search' });
  const search = el('input', {
    className: 'faculty-search-input',
    id: 'table-search-input',
    type: 'search',
    role: 'searchbox',
    placeholder: 'Поиск: бюджет, заочная, СКК…',
    autocomplete: 'off',
    spellcheck: 'false',
    enterkeyhint: 'search',
    'aria-label': 'Поиск таблицы конкурса',
  });
  search.value = query;
  search.addEventListener('input', () => {
    const current = host._tableOpts;
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
    'aria-label': 'Таблицы мониторинга',
  });
  paintTableList(list, { tables, groups, selectedId });

  dialog.append(header, searchWrap, list);
  dialog.addEventListener('click', (e) => e.stopPropagation());

  const shell = el('div', { className: 'faculty-overlay-shell is-motion' });
  shell.append(backdrop, dialog);
  host.append(shell);
  host._tableOpts = opts;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!host.contains(shell)) return;
      shell.classList.add('is-open');
    });
  });

  return { dialog, search, list, shell };
}

/**
 * @param {HTMLElement} host
 */
function beginCloseOverlay(host) {
  const shell = host.querySelector('.faculty-overlay-shell');
  if (!shell) {
    document.documentElement.classList.remove('table-overlay-open');
    host.innerHTML = '';
    return;
  }
  if (host._tableClosing) return;

  host._tableClosing = true;
  shell.classList.remove('is-open');
  shell.classList.add('is-leaving');
  document.documentElement.classList.remove('table-overlay-open');

  const finish = () => {
    clearCloseTimer(host);
    if (host.contains(shell)) shell.remove();
    if (!host.querySelector('.faculty-overlay-shell')) host.innerHTML = '';
  };

  closeTimer = setTimeout(finish, closeDelayMs());
}

/**
 * Quiet channel picker above the faculty title.
 * Overlay mounts once per open; typing only refreshes the list.
 *
 * @param {HTMLElement} mount
 * @param {{
 *   tables: object[],
 *   selectedId: string | null,
 *   open: boolean,
 *   query: string,
 *   onToggle: () => void,
 *   onSelect: (id: string) => void,
 *   onClose: () => void,
 *   onQuery: (q: string) => void,
 * }} opts
 */
export function renderTablePicker(mount, opts) {
  const tables = opts.tables || [];
  const selectedId = resolveTableId(tables, opts.selectedId);
  const selected =
    tables.find((t) => t.id === selectedId) ||
    tableById(selectedId) ||
    tableById(DEFAULT_TABLE_ID);
  const label = shortTableLabel(selected);
  const query = opts.query || '';
  const filtered = filterTablesByQuery(
    tables.length ? tables : [selected].filter(Boolean),
    query,
  );
  const groups = groupTablesByTrack(filtered);
  const host = overlayHost();
  host._tableOpts = opts;

  const btn = paintTrigger(mount, label, opts.open, opts.onToggle);
  const existing = host.querySelector('.faculty-overlay-shell');

  if (!opts.open) {
    beginCloseOverlay(host);
    return { button: btn, menu: null, search: null };
  }

  if (existing?.classList.contains('is-leaving')) {
    clearCloseTimer(host);
    existing.remove();
  }

  const live = host.querySelector('.faculty-overlay-shell');
  if (live && !live.classList.contains('is-leaving')) {
    const list = live.querySelector('.faculty-overlay-list');
    if (list instanceof HTMLElement) {
      paintTableList(list, {
        tables,
        groups,
        selectedId,
      });
    }
    live.classList.add('is-open');
    document.documentElement.classList.add('table-overlay-open');
    const dialog = live.querySelector('.faculty-overlay');
    const search = live.querySelector('#table-search-input');
    return {
      button: btn,
      menu: dialog instanceof HTMLElement ? dialog : null,
      search: search instanceof HTMLInputElement ? search : null,
    };
  }

  const mounted = mountOverlay(host, opts, tables, groups, query, selectedId);
  return {
    button: btn,
    menu: mounted.dialog,
    search: mounted.search,
  };
}
