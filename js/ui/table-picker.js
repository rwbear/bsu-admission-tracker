import { el } from './dom.js';
import {
  DEFAULT_TABLE_ID,
  filterTablesByQuery,
  groupTablesByTrack,
  resolveTableId,
  shortTableLabel,
  tableById,
} from '../tables.js';
import { patchOptionSelection } from './selection-list.js';
import { bindOptionActivate } from './option-activate.js';
import { pinOverlayShell } from './overlay-viewport.js';
import {
  acquireOverlayScrollLock,
  releaseOverlayScrollLock,
  focusNoScroll,
  OVERLAY_LEAVE_MS,
} from './overlay-scroll-lock.js';

const OVERLAY_ID = 'table-overlay-root';
const DIALOG_ID = 'table-overlay';
const TRIGGER_ID = 'table-trigger';
const LOCK_ID = 'table';

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
 * @param {HTMLElement} host
 */
function disposeTableViewport(host) {
  host._tableViewport?.dispose?.();
  host._tableViewport = null;
}

/**
 * @param {HTMLElement} host
 */
function freezeTableViewport(host) {
  host._tableViewport?.freeze?.();
}

/**
 * @param {ParentNode | null} root
 */
function blurTableSearch(root) {
  const search = root?.querySelector?.('#table-search-input');
  if (search instanceof HTMLElement && document.activeElement === search) {
    search.blur();
  }
}

/**
 * @param {HTMLElement} shell
 * @param {HTMLElement} dialog
 */
function openShellMotion(shell, dialog) {
  if (prefersReducedMotion()) {
    shell.classList.add('is-open');
    focusNoScroll(dialog);
    return;
  }
  void shell.offsetWidth;
  shell.classList.add('is-open');
  focusNoScroll(dialog);
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
/**
 * @param {{ track: { name: string }, tables: { id: string }[] }[]} groups
 */
function tableGroupsSignature(groups) {
  return groups
    .map(
      (g) =>
        `${g.track.name}:${g.tables.map((t) => t.id).join(',')}`,
    )
    .join('|');
}

function paintTableList(list, model) {
  if (!model.tables.length) {
    list.dataset.listSig = 'empty';
    list.innerHTML = '';
    list.append(
      el('div', {
        className: 'faculty-empty',
        text: 'Таблицы ещё не загружены',
      }),
    );
    return;
  }

  if (!model.groups.length) {
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

  const nextSig = tableGroupsSignature(model.groups);
  if (
    list.dataset.listSig === nextSig &&
    list.querySelector('.faculty-option')
  ) {
    patchOptionSelection(
      list,
      '.faculty-option',
      model.selectedId,
      'is-active',
    );
    return;
  }

  list.dataset.listSig = nextSig;
  list.innerHTML = '';

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
      bindOptionActivate(
        option,
        () => {
          patchOptionSelection(list, '.faculty-option', table.id, 'is-active');
          const current = overlayHost()._tableOpts;
          if (current?.onSelect) current.onSelect(table.id);
        },
        { scrollParent: list },
      );
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
    className: `table-picker${open ? ' is-open' : ''}`,
  });
  const nextBtn = el('button', {
    className: 'table-trigger',
    type: 'button',
    id: TRIGGER_ID,
    'aria-haspopup': 'dialog',
    'aria-expanded': open ? 'true' : 'false',
    'aria-controls': DIALOG_ID,
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
  disposeTableViewport(host);
  host.innerHTML = '';
  acquireOverlayScrollLock(LOCK_ID);
  document.documentElement.classList.add('table-overlay-open');

  const backdrop = el('div', {
    className: 'faculty-overlay-backdrop',
    role: 'button',
    'aria-label': 'Закрыть',
    tabindex: '-1',
  });
  backdrop.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const current = host._tableOpts;
    if (current?.onClose) current.onClose();
  });

  const dialog = el('div', {
    className: 'faculty-overlay table-overlay',
    id: DIALOG_ID,
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
      if (first instanceof HTMLElement) focusNoScroll(first);
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

  search.addEventListener(
    'focus',
    () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch {
        window.scrollTo(0, 0);
      }
    },
    true,
  );

  const shell = el('div', {
    className: 'faculty-overlay-shell is-motion is-picker-shell',
  });
  shell.append(backdrop, dialog);
  host.append(shell);
  host._tableOpts = opts;
  disposeTableViewport(host);
  host._tableViewport = pinOverlayShell(shell);

  openShellMotion(shell, dialog);

  return { dialog, search, list, shell };
}

/**
 * Restore trigger focus + unlock in one synchronous turn.
 * @param {HTMLElement} host
 * @param {HTMLElement | null} shell
 * @param {boolean} restoreFocus
 */
function teardownTableOverlay(host, shell, restoreFocus) {
  clearCloseTimer(host);
  blurTableSearch(shell);
  disposeTableViewport(host);

  if (restoreFocus) {
    const trigger = document.getElementById(TRIGGER_ID);
    if (trigger instanceof HTMLElement) focusNoScroll(trigger);
  } else {
    const active = document.activeElement;
    if (active instanceof HTMLElement && shell?.contains(active)) active.blur();
  }

  document.documentElement.classList.remove('table-overlay-open');
  if (shell && host.contains(shell)) shell.remove();
  if (!host.querySelector('.faculty-overlay-shell')) host.innerHTML = '';
  releaseOverlayScrollLock(LOCK_ID);
  host._tableRestoreFocus = true;
}

/**
 * @param {HTMLElement} host
 * @param {{ restoreFocus?: boolean }} [opts]
 */
function beginCloseOverlay(host, opts = {}) {
  const shell = host.querySelector('.faculty-overlay-shell');
  if (!shell) {
    // Idle cleanup only — never focus the trigger on routine chrome paints.
    disposeTableViewport(host);
    document.documentElement.classList.remove('table-overlay-open');
    releaseOverlayScrollLock(LOCK_ID);
    return;
  }
  if (host._tableClosing) return;

  host._tableRestoreFocus = opts.restoreFocus !== false;
  host._tableClosing = true;
  shell.style.pointerEvents = 'none';
  freezeTableViewport(host);
  blurTableSearch(shell);
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
    teardownTableOverlay(host, shell, host._tableRestoreFocus !== false);
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
 *   restoreFocus?: boolean,
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
    beginCloseOverlay(host, { restoreFocus: opts.restoreFocus !== false });
    return { button: btn, menu: null, search: null };
  }

  if (existing?.classList.contains('is-leaving')) {
    clearCloseTimer(host);
    disposeTableViewport(host);
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
    acquireOverlayScrollLock(LOCK_ID);
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
