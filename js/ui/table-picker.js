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
 * Quiet channel picker above the faculty title.
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
  const filtered = filterTablesByQuery(tables.length ? tables : [selected].filter(Boolean), query);
  const groups = groupTablesByTrack(filtered);

  mount.innerHTML = '';

  const root = el('div', {
    className: `table-picker${opts.open ? ' is-open' : ''}`,
  });

  const btn = el('button', {
    className: 'table-trigger',
    type: 'button',
    id: 'table-trigger',
    'aria-haspopup': 'dialog',
    'aria-expanded': opts.open ? 'true' : 'false',
    'aria-controls': 'table-overlay',
  });
  btn.append(
    el('span', { className: 'table-trigger-label', text: label }),
    el('span', {
      className: 'table-trigger-chevron',
      'aria-hidden': 'true',
      text: '^',
    }),
  );
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    opts.onToggle();
  });

  root.append(btn);
  mount.append(root);

  const host = overlayHost();
  host.innerHTML = '';

  if (!opts.open) {
    document.documentElement.classList.remove('table-overlay-open');
    return { button: btn, menu: null, search: null };
  }

  document.documentElement.classList.add('table-overlay-open');

  const backdrop = el('button', {
    className: 'faculty-overlay-backdrop',
    type: 'button',
    'aria-label': 'Закрыть',
  });
  backdrop.addEventListener('click', () => opts.onClose());

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
      close.addEventListener('click', () => opts.onClose());
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
    value: query,
  });
  search.value = query;
  search.addEventListener('input', () => opts.onQuery(search.value));
  searchWrap.append(search);

  const list = el('div', {
    className: 'faculty-overlay-list',
    role: 'listbox',
    'aria-label': 'Таблицы мониторинга',
  });

  if (!tables.length) {
    list.append(
      el('div', {
        className: 'faculty-empty',
        text: 'Таблицы ещё не загружены',
      }),
    );
  } else if (!filtered.length) {
    list.append(
      el('div', {
        className: 'faculty-empty',
        text: 'Ничего не нашлось',
      }),
    );
  } else {
    for (const group of groups) {
      list.append(
        el('div', {
          className: 'table-group-label',
          text: group.track.name,
        }),
      );
      for (const table of group.tables) {
        const active = table.id === selectedId;
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
          opts.onSelect(table.id);
        });
        list.append(option);
      }
    }
  }

  dialog.append(header, searchWrap, list);
  dialog.addEventListener('click', (e) => e.stopPropagation());

  const shell = el('div', { className: 'faculty-overlay-shell' });
  shell.append(backdrop, dialog);
  host.append(shell);

  return { button: btn, menu: dialog, search };
}
