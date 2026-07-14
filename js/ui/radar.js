import { prepareSpecs } from '../compute.js';
import { el, fmtNum, fmtTime } from './dom.js';
import { asciiChanceTrack, asciiHistogram, summarizeStatuses } from './ascii.js';

/**
 * @param {object} row
 */
function statusGlyph(row) {
  if (row.status === 'safe') return '●';
  if (row.status === 'risk') return '◐';
  if (row.status === 'below') return '○';
  return '·';
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
      el('div', { className: 'detail-empty', text: 'НЕТ СПЕЦИАЛЬНОСТЕЙ' }),
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

    btn.append(
      el('span', { className: 'ov-mark', text: statusGlyph(row) }),
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
 */
export function renderDetailPanel(container, row, score) {
  container.innerHTML = '';

  if (!row) {
    container.append(
      el('div', {
        className: 'detail-empty',
        text: 'ВЫБЕРИ СПЕЦИАЛЬНОСТЬ В ОБЗОРЕ',
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

  const inner = el('div', { className: 'detail-inner' }, [
    el('h3', {
      className: 'detail-title',
      text: `ДЕТАЛИ · ${row.specName}`,
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
    el('div', {}, [
      el('div', { className: 'ascii-caption', text: 'ДОРОЖКА КОНКУРСА' }),
      el('pre', {
        className: 'ascii-block ascii-track',
        text: asciiChanceTrack({ ...row, score }),
      }),
    ]),
    el('div', {}, [
      el('div', { className: 'ascii-caption', text: 'ИНТЕРВАЛЫ БАЛЛОВ' }),
      el('pre', {
        className: 'ascii-block ascii-hist',
        text: asciiHistogram({ ...row, score }, score),
      }),
    ]),
    el('p', {
      className: 'detail-note',
      text: `Обновлено ${fmtTime(row.updatedAt)} · расчётный проходной — оценка по таблице`,
    }),
  ]);

  if (row.sourceUrl) {
    inner.append(
      el('a', {
        href: row.sourceUrl,
        target: '_blank',
        rel: 'noopener',
        text: 'ОТКРЫТЬ ИСТОЧНИК →',
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
  elSummary.textContent = `В ЗОНЕ ${c.safe}  ·  НА ГРАНИ ${c.risk}  ·  НИЖЕ ${c.below}`;
}

function metric(label, value) {
  return el('div', { className: 'metric-cell' }, [
    el('div', { className: 'metric-val', text: value }),
    el('div', { className: 'metric-lbl', text: label }),
  ]);
}

/**
 * Keep current selection if still present, else best sortKey (first after prepareSpecs).
 * @param {object[]} enrichedRows
 * @param {string | null} selectedId
 */
export function resolveSelection(enrichedRows, selectedId) {
  if (selectedId && enrichedRows.some((r) => r.id === selectedId)) {
    return selectedId;
  }
  return enrichedRows[0]?.id || null;
}
