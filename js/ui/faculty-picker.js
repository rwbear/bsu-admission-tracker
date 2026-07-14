import { el } from './dom.js';
import { filterFacultiesByName } from '../faculties.js';

const OVERLAY_ID = 'faculty-overlay-root';

/**
 * Ensure a body-level portal so the overlay escapes list clipping.
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
 * Faculty silence control: button in the stream + searchable overlay.
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
  const selected =
    faculties.find((f) => f.id === opts.selectedId) || faculties[0] || null;
  const label = selected?.name || 'Выбери факультет';
  const query = opts.query || '';

  mount.innerHTML = '';

  const root = el('div', {
    className: `faculty-silence${opts.open ? ' is-open' : ''}`,
  });

  const btn = el('button', {
    className: 'faculty-trigger',
    type: 'button',
    id: 'faculty-trigger',
    'aria-haspopup': 'dialog',
    'aria-expanded': opts.open ? 'true' : 'false',
    'aria-controls': 'faculty-overlay',
  });
  btn.append(
    el('span', { className: 'faculty-trigger-kicker', text: 'Факультет' }),
    el('span', { className: 'faculty-trigger-label', text: label }),
    el('span', {
      className: 'faculty-trigger-chevron',
      'aria-hidden': 'true',
      text: '▾',
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
    document.documentElement.classList.remove('faculty-overlay-open');
    return { button: btn, menu: null, search: null };
  }

  document.documentElement.classList.add('faculty-overlay-open');

  const backdrop = el('button', {
    className: 'faculty-overlay-backdrop',
    type: 'button',
    'aria-label': 'Закрыть',
  });
  backdrop.addEventListener('click', () => opts.onClose());

  const dialog = el('div', {
    className: 'faculty-overlay',
    id: 'faculty-overlay',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'faculty-overlay-title',
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
      close.addEventListener('click', () => opts.onClose());
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
    value: query,
  });
  // value via setAttribute may not stick for input — set property
  search.value = query;
  search.addEventListener('input', () => {
    opts.onQuery(search.value);
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

  if (!faculties.length) {
    list.append(
      el('div', {
        className: 'faculty-empty',
        text: 'Список факультетов пока пуст',
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
    for (const fac of filtered) {
      const active = selected && fac.id === selected.id;
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
        opts.onSelect(fac.id);
      });
      list.append(option);
    }
  }

  dialog.append(header, searchWrap, list);
  // stop clicks inside dialog from hitting backdrop logic elsewhere
  dialog.addEventListener('click', (e) => e.stopPropagation());

  const shell = el('div', { className: 'faculty-overlay-shell' });
  shell.append(backdrop, dialog);
  host.append(shell);

  return { button: btn, menu: dialog, search };
}
