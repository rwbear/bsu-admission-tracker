import { prepareSpecs } from '../compute.js';
import { el, fmtNum, fmtTime } from './dom.js';
import {
  renderChanceTrack,
  renderHistogram,
  summarizeStatuses,
} from './charts.js?v=20260715i';

/**
 * @param {object} row
 */
function statusClass(row) {
  if (row.status === 'safe') return 'is-safe';
  if (row.status === 'risk') return 'is-risk';
  if (row.status === 'below') return 'is-below';
  return '';
}

/**
 * @param {object} row
 */
function deltaText(row) {
  if (row.delta == null) return '—';
  return row.delta >= 0 ? `+${fmtNum(row.delta)}` : fmtNum(row.delta);
}

/**
 * Compact overview rows (master).
 * @param {HTMLElement} container
 * @param {object[]} specialties
 * @param {number | null} score
 * @param {{ selectedId: string | null, onSelect: (id: string) => void }} opts
 * @returns {object[]} enriched sorted rows
 */
export function renderOverviewList(container, specialties, score, opts) {
  const rows = prepareSpecs(specialties, score);
  container.innerHTML = '';
  const list = el('div', { className: 'overview-list', role: 'listbox' });

  if (!rows.length) {
    container.append(
      el('div', { className: 'detail-empty', text: 'Нет специальностей' }),
    );
    return rows;
  }

  for (const row of rows) {
    const selected = opts.selectedId === row.id;
    const btn = el('button', {
      className: `overview-row${selected ? ' selected' : ''}`,
      type: 'button',
      role: 'option',
      'aria-selected': selected ? 'true' : 'false',
      'data-id': row.id,
    });

    const people =
      score == null
        ? '—'
        : `${fmtNum(row.peopleAbove)}/${fmtNum(row.plan)}`;

    const mark = el('span', {
      className: `ov-mark ${statusClass(row)}`.trim(),
      'aria-hidden': 'true',
    });

    btn.append(
      mark,
      el('span', { className: 'ov-name', text: row.specName }),
      el('span', { className: 'ov-ratio', text: people }),
      el('span', { className: 'ov-delta', text: deltaText(row) }),
    );

    btn.addEventListener('click', () => opts.onSelect(row.id));
    list.append(btn);
  }

  container.append(list);
  return rows;
}

/**
 * Detail panel for the selected specialty.
 * @param {HTMLElement} container
 * @param {object | null} row
 * @param {number | null} score
 * @param {{ updatedAt?: string | null }} [meta]
 */
export function renderDetailPanel(container, row, score, meta = {}) {
  container.innerHTML = '';

  if (!row) {
    container.append(
      el('div', {
        className: 'detail-empty',
        text: 'Выбери специальность в обзоре',
      }),
    );
    return;
  }

  const people =
    score == null
      ? '—'
      : `${fmtNum(row.peopleAbove)} / ${fmtNum(row.plan)}`;

  const pass = row.estimatedPassing == null ? '—' : fmtNum(row.estimatedPassing);
  const pressure =
    row.pressure == null ? '—' : `${row.pressure.toFixed(1)}×`;

  const updatedAt = meta.updatedAt || row.updatedAt;
  const note = `Обновлено ${fmtTime(updatedAt)} · расчётный проходной — оценка по таблице`;

  const trackMount = el('div');
  const histMount = el('div');

  const inner = el('div', { className: 'detail-inner' }, [
    el('h3', {
      className: 'detail-title',
      text: row.specName,
    }),
    el('div', {
      className: 'detail-status',
      text: `${row.statusLabel || '—'} · ${row.facultyName || ''}`.trim(),
    }),
    el('div', { className: 'metric-grid' }, [
      metric('Над тобой / мест', people),
      metric('Расчётный', pass),
      metric('Дельта', deltaText(row)),
      metric('Конкурс', pressure),
    ]),
    el('div', { className: 'chart-block' }, [
      el('div', { className: 'chart-caption', text: 'Дорожка конкурса' }),
      trackMount,
    ]),
    el('div', { className: 'chart-block' }, [
      el('div', { className: 'chart-caption', text: 'Интервалы баллов' }),
      histMount,
    ]),
    el('p', {
      className: 'detail-note',
      text: note,
    }),
  ]);

  renderChanceTrack(trackMount, { ...row, score });
  renderHistogram(histMount, { ...row, score }, score);

  if (row.sourceUrl) {
    inner.append(
      el('a', {
        className: 'detail-link',
        href: row.sourceUrl,
        target: '_blank',
        rel: 'noopener',
        text: 'Открыть источник →',
      }),
    );
  }

  container.append(inner);
}

/**
 * @param {HTMLElement} elSummary
 * @param {object[]} enrichedRows
 */
export function renderSummary(elSummary, enrichedRows) {
  const c = summarizeStatuses(enrichedRows);
  elSummary.textContent = `В зоне ${c.safe}  ·  На грани ${c.risk}  ·  Ниже ${c.below}`;
}

function metric(label, value) {
  return el('div', { className: 'metric-cell' }, [
    el('div', { className: 'metric-val', text: value }),
    el('div', { className: 'metric-lbl', text: label }),
  ]);
}

/**
 * Keep current selection if still present, else best sortKey.
 * @param {object[]} enrichedRows
 * @param {string | null} selectedId
 */
export function resolveSelection(enrichedRows, selectedId) {
  if (selectedId && enrichedRows.some((r) => r.id === selectedId)) {
    return selectedId;
  }
  return enrichedRows[0]?.id || null;
}
