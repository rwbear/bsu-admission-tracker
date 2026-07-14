import { el } from './dom.js';
import { sortFaculties } from '../faculties.js';

/**
 * Faculty picker control (hero title → dropdown).
 * @param {HTMLElement} mount
 * @param {{
 *   faculties: { id: string, name: string, specialtyCount?: number }[],
 *   selectedId: string | null,
 *   open: boolean,
 *   onToggle: () => void,
 *   onSelect: (id: string) => void,
 *   onClose: () => void,
 * }} opts
 */
export function renderFacultyPicker(mount, opts) {
  const faculties = sortFaculties(opts.faculties || []);
  const selected =
    faculties.find((f) => f.id === opts.selectedId) || faculties[0] || null;
  const label = selected?.name || 'Выбери факультет';

  mount.innerHTML = '';

  const root = el('div', {
    className: `faculty-picker${opts.open ? ' is-open' : ''}`,
  });

  const btn = el('button', {
    className: 'faculty-trigger',
    type: 'button',
    id: 'faculty-trigger',
    'aria-haspopup': 'listbox',
    'aria-expanded': opts.open ? 'true' : 'false',
    'aria-controls': 'faculty-menu',
  });
  btn.append(
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

  const menu = el('div', {
    className: 'faculty-menu',
    id: 'faculty-menu',
    role: 'listbox',
    'aria-label': 'Факультеты',
    hidden: opts.open ? undefined : 'true',
  });

  // Prefer removeAttribute when open — hidden="" still hides in some browsers.
  if (opts.open) menu.removeAttribute('hidden');
  else menu.setAttribute('hidden', '');

  if (!faculties.length) {
    menu.append(
      el('div', {
        className: 'faculty-empty',
        text: 'Список факультетов пока пуст',
      }),
    );
  } else {
    for (const fac of faculties) {
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
      menu.append(option);
    }
  }

  root.append(btn, menu);
  mount.append(root);

  return { button: btn, menu };
}
