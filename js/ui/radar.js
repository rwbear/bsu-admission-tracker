import { prepareSpecs } from '../compute.js';
import { el, fmtNum, fmtTime } from './dom.js';
import {
  renderChanceTrack,
  renderHistogram,
  summarizeStatuses,
} from './charts.js?v=20260715av';

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
 * @param {object[]} rows
 * @param {string | null} selectedId
 * @param {(id: string) => void} onSelect
 */
function buildOverviewList(rows, selectedId, onSelect) {
  const list = el('div', { className: 'overview-list', role: 'listbox' });

  for (const row of rows) {
    const selected = selectedId === row.id;
    const btn = el('button', {
      className: `overview-row${selected ? ' selected' : ''}`,
      type: 'button',
      role: 'option',
      'aria-selected': selected ? 'true' : 'false',
      'data-id': row.id,
    });

    const peopleText =
      row.peopleAbove == null
        ? '—'
        : `${fmtNum(row.peopleAbove)}/${fmtNum(row.plan)}`;

    const mark = el('span', {
      className: `ov-mark ${statusClass(row)}`.trim(),
      'aria-hidden': 'true',
    });

    const ariaBits = [
      row.specName,
      row.statusLabel,
      row.peopleAbove == null
        ? null
        : `над тобой ${fmtNum(row.peopleAbove)} при плане ${fmtNum(row.plan)}`,
      row.delta == null ? null : `дельта ${deltaText(row)}`,
    ].filter(Boolean);
    btn.setAttribute('aria-label', ariaBits.join(', '));

    btn.append(
      mark,
      el('span', { className: 'ov-name', text: row.specName }),
      el('span', { className: 'ov-ratio', text: peopleText }),
      el('span', { className: 'ov-delta', text: deltaText(row) }),
    );

    btn.addEventListener('click', () => onSelect(row.id));
    list.append(btn);
  }

  return list;
}

/**
 * Peek list signature without painting (for transition orchestration).
 * @param {object[]} specialties
 * @param {number | null} score
 */
export function overviewListKey(specialties, score) {
  return prepareSpecs(specialties, score)
    .map((r) => r.id)
    .join('|');
}

/**
 * Compact overview rows (master). Sync paint — motion is orchestrated outside.
 * When the row id set is unchanged, only patch selection — keep focus.
 * @param {HTMLElement} container
 * @param {object[]} specialties
 * @param {number | null} score
 * @param {{ selectedId: string | null, onSelect: (id: string) => void }} opts
 * @returns {object[]} enriched sorted rows
 */
export function renderOverviewList(container, specialties, score, opts) {
  const rows = prepareSpecs(specialties, score);
  const existing = container.querySelector('.overview-list');
  const existingIds = existing
    ? [...existing.querySelectorAll('.overview-row')].map((n) =>
        n.getAttribute('data-id'),
      )
    : [];
  const nextIds = rows.map((r) => r.id);
  const sameShape =
    existing instanceof HTMLElement &&
    existingIds.length === nextIds.length &&
    existingIds.every((id, i) => id === nextIds[i]);

  const listKey = nextIds.join('|') || 'empty';

  if (sameShape) {
    for (const btn of existing.querySelectorAll('.overview-row')) {
      if (!(btn instanceof HTMLElement)) continue;
      const selected = opts.selectedId === btn.getAttribute('data-id');
      btn.classList.toggle('selected', selected);
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    }
    container.dataset.selectionKey = listKey;
    return rows;
  }

  container.innerHTML = '';
  container.dataset.selectionKey = listKey;

  if (!rows.length) {
    container.append(
      el('div', {
        className: 'detail-empty overview-empty',
        text: 'Нет специальностей',
      }),
    );
    return rows;
  }

  container.append(buildOverviewList(rows, opts.selectedId, opts.onSelect));
  return rows;
}

/**
 * @param {object} row
 * @param {number | null} score
 * @param {{ updatedAt?: string | null }} meta
 */
function buildDetailInner(row, score, meta) {
  const people =
    score == null
      ? '—'
      : `${fmtNum(row.peopleAbove)} / ${fmtNum(row.plan)}`;

  const pass = row.estimatedPassing == null ? '—' : fmtNum(row.estimatedPassing);
  const pressure =
    row.pressure == null ? '—' : `${row.pressure.toFixed(1)}×`;

  const updatedAt = meta.updatedAt || row.updatedAt;
  const plan = Number(row.plan) || 0;
  const competition =
    row.competition != null
      ? Number(row.competition)
      : Math.max(
          Number(row.inCompetition ?? row.totalApps) || 0,
          (row.buckets || []).reduce((a, b) => a + (Number(b) || 0), 0),
        );
  let note =
    row.estimatedPassing == null && plan > 0 && competition < plan
      ? `Обновлено ${fmtTime(updatedAt)} · заявлений меньше мест — расчётный балл набора ещё не сложился`
      : `Обновлено ${fmtTime(updatedAt)} · расчётный балл — оценка по таблице`;
  if (
    score != null &&
    row.peopleAbove != null &&
    plan > 0 &&
    row.peopleAbove >= plan &&
    row.status === 'risk' &&
    row.estimatedPassing != null
  ) {
    note +=
      ' · место по интервалам уже за чертой мест, статус — по расчётному баллу';
  }

  const trackMount = el('div');
  const histMount = el('div');
  const statusBits = [row.statusLabel, row.facultyName].filter(Boolean);

  const inner = el('div', { className: 'detail-inner' }, [
    el('h3', {
      className: 'detail-title',
      text: row.specName,
    }),
    el('div', {
      className: 'detail-status',
      text: statusBits.join(' · ') || '—',
    }),
    el('div', { className: 'metric-grid' }, [
      metric('Над тобой / мест', people, 'is-primary'),
      metric('Расчётный балл', pass, 'is-primary'),
      metric('Дельта', deltaText(row), 'is-secondary'),
      metric('Конкурс', pressure, 'is-secondary'),
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

  return inner;
}

/**
 * Detail panel for the selected specialty. Sync paint — motion outside.
 * @param {HTMLElement} container
 * @param {object | null} row
 * @param {number | null} score
 * @param {{ updatedAt?: string | null }} [meta]
 */
export function renderDetailPanel(container, row, score, meta = {}) {
  const selectionKey = row?.id || 'empty';
  container.dataset.selectionKey = selectionKey;
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

  container.append(buildDetailInner(row, score, meta));
}

/**
 * @param {HTMLElement} elSummary
 * @param {object[]} enrichedRows
 */
export function renderSummary(elSummary, enrichedRows) {
  const c = summarizeStatuses(enrichedRows);
  elSummary.textContent = `В зоне ${c.safe}  ·  На грани ${c.risk}  ·  Ниже ${c.below}`;
}

function metric(label, value, tone = 'is-primary') {
  return el('div', { className: `metric-cell ${tone}`.trim() }, [
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
