import { prepareSpecs } from '../compute.js';
import { el, fmtNum, fmtTime } from './dom.js';
import {
  renderChanceTrack,
  renderHistogram,
  renderPlanSlab,
  renderTableFacts,
  formatQuotaNote,
  buildHistCaption,
  summarizeStatuses,
} from './charts.js?v=20260718fs';
import { primeReveal, finalizeReveal } from './reveal.js';
import { armScrollAwaken, disposeScrollAwaken } from './awaken.js';
import { armPanelDisclosures, disposePanelDisclosures } from './panel-disclosure.js';
import { shouldAutoOpenMoreDetails } from './detail-density.js';
import {
  openMethodSheet,
  closeMethodSheet,
  METHOD_SHEET,
} from './method-sheet.js';

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
 * @param {HTMLElement} node
 * @param {number} order
 */
function revealStep(node, order) {
  node.setAttribute('data-reveal-step', String(order));
  return node;
}

/**
 * @param {object[]} rows
 * @param {string | null} selectedId
 * @param {(id: string) => void} onSelect
 */
function buildOverviewList(rows, selectedId, onSelect) {
  const list = el('div', {
    className: 'overview-list',
    role: 'listbox',
    'data-reveal-root': '',
  });

  rows.forEach((row, index) => {
    const selected = selectedId === row.id;
    const btn = el('button', {
      className: `overview-row${selected ? ' selected' : ''}`,
      type: 'button',
      role: 'option',
      'aria-selected': selected ? 'true' : 'false',
      'data-id': row.id,
      'data-reveal-step': String(index),
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
  });

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
 * @param {{
 *   selectedId: string | null,
 *   onSelect: (id: string) => void,
 *   intro?: boolean,
 *   reduceMotion?: boolean,
 * }} opts
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
  const intro = Boolean(opts.intro) && !opts.reduceMotion;

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

  const list = buildOverviewList(rows, opts.selectedId, opts.onSelect);
  container.append(list);
  if (intro) primeReveal(list);
  else finalizeReveal(list);
  return rows;
}

/**
 * @param {object} row
 * @param {number | null} score
 * @param {{
 *   updatedAt?: string | null,
 *   retainedPrevious?: boolean,
 *   retainedFormIds?: string[],
 * }} meta
 */
function buildDetailInner(row, score, meta) {
  const seatPlan = Number(row.openPlan ?? row.plan) || 0;
  const planOfficial = Number(row.planOfficial ?? row.plan) || 0;
  const people =
    score == null
      ? '—'
      : `${fmtNum(row.peopleAbove)} / ${fmtNum(seatPlan)}`;

  const pass = row.estimatedPassing == null ? '—' : fmtNum(row.estimatedPassing);
  const contestApps =
    row.inCompetition != null
      ? fmtNum(row.inCompetition)
      : row.competition != null
        ? fmtNum(row.competition)
        : '—';
  const planMetric =
    row.quotaParseOk && planOfficial !== seatPlan
      ? `${fmtNum(planOfficial)} → ${fmtNum(seatPlan)}`
      : fmtNum(planOfficial || seatPlan);
  const pressure =
    row.pressure == null ? '—' : `${row.pressure.toFixed(1)}×`;

  const updatedAt = meta.updatedAt || row.updatedAt;
  const plan = seatPlan;
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

  // Always-visible prose channel against silence — only when seats were taken.
  if (row.showQuota) {
    note += ` · ${formatQuotaNote(row)}`;
  } else if (
    row.quotaParseOk === false &&
    Number(row.totalApps) > Number(row.inCompetition) &&
    Number(row.inCompetition) >= 0
  ) {
    note += ` · часть мест уже занята льготниками (БВИ, целевые, вне конкурса) — в общем конкурсе ${fmtNum(plan)} из ${fmtNum(planOfficial)}`;
  }

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

  const factsMount = el('div');
  const planMount = el('div');
  const trackMount = el('div');
  const histMount = el('div');
  const statusBits = [row.statusLabel, row.facultyName].filter(Boolean);

  let step = 0;
  const title = revealStep(
    el('h3', { className: 'detail-title', text: row.specName }),
    step++,
  );
  const status = revealStep(
    el('div', {
      className: 'detail-status',
      text: statusBits.join(' · ') || '—',
    }),
    step++,
  );

  // No «План мест» chrome label — the slab equation is the name.
  // Omit entirely when taken===0; never leave an empty caption in the stack.
  const planBlock = revealStep(
    el('div', { className: 'chart-block plan-slab-block' }, [planMount]),
    step++,
  );
  if (!row.showQuota) planBlock.hidden = true;

  const chanceBlock = revealStep(
    el('div', { className: 'chart-block' }, [
      el('div', { className: 'chart-caption', text: 'Дорожка конкурса' }),
      trackMount,
    ]),
    step++,
  );

  const histBlock = revealStep(
    el('div', { className: 'chart-block hist-ridge-block' }, [
      el('div', {
        className: 'chart-caption',
        text: buildHistCaption(row, score),
      }),
      histMount,
    ]),
    step++,
  );
  if (!(row.ranges || []).length) histBlock.hidden = true;

  const primaryMetrics = revealStep(
    el('div', { className: 'metric-grid' }, [
      metric('Над тобой / мест конкурса', people, 'is-primary'),
      metric('Расчётный балл', pass, 'is-primary'),
    ]),
    step++,
  );

  const noteEl = revealStep(
    el('p', { className: 'detail-note', text: note }),
    step++,
  );

  const factsBlock = el('div', { className: 'chart-block table-facts-block' }, [
    el('div', { className: 'chart-caption', text: 'Как в таблице БГУ' }),
    factsMount,
  ]);
  if (!(row.showFacts || row.quotaParseOk)) factsBlock.hidden = true;

  const secondaryMetrics = el('div', { className: 'metric-grid is-secondary-grid' }, [
    metric('План → общий', planMetric, 'is-secondary'),
    metric('По конкурсу', contestApps, 'is-secondary'),
    metric('Дельта', deltaText(row), 'is-secondary'),
    metric('Конкурс', pressure, 'is-secondary'),
  ]);

  const moreBody = el('div', { className: 'panel-details-body' }, [
    el('div', { className: 'panel-details-inner' }, [
      factsBlock,
      secondaryMetrics,
    ]),
  ]);

  const moreOpen = shouldAutoOpenMoreDetails(row, meta);
  const moreDetails = revealStep(
    el('details', { className: 'panel-details more-details' }, [
      el('summary', { text: 'Подробные данные' }),
      moreBody,
    ]),
    step++,
  );
  if (moreOpen) moreDetails.setAttribute('open', '');

  const methodTrigger = el('button', {
    className: 'detail-method-trigger',
    id: METHOD_SHEET.triggerId,
    type: 'button',
    'aria-haspopup': 'dialog',
    'aria-controls': METHOD_SHEET.overlayId,
    text: 'Как считается место',
  });
  methodTrigger.addEventListener('click', () => {
    openMethodSheet({ returnFocusId: METHOD_SHEET.triggerId });
  });

  /** @type {Node[]} */
  const footerKids = [methodTrigger];
  if (row.sourceUrl) {
    footerKids.push(
      el('a', {
        className: 'detail-link',
        href: row.sourceUrl,
        target: '_blank',
        rel: 'noopener',
        text: 'Открыть источник →',
      }),
    );
  }

  const footer = revealStep(
    el('div', { className: 'detail-footer' }, footerKids),
    step++,
  );

  const inner = el('div', { className: 'detail-inner', 'data-reveal-root': '' }, [
    title,
    status,
    planBlock,
    chanceBlock,
    histBlock,
    primaryMetrics,
    noteEl,
    moreDetails,
    footer,
  ]);

  renderTableFacts(factsMount, row);
  renderPlanSlab(planMount, row);
  renderChanceTrack(trackMount, { ...row, score });
  renderHistogram(histMount, { ...row, score }, score);

  return inner;
}

/**
 * Detail panel for the selected specialty. Sync paint — motion outside.
 * @param {HTMLElement} container
 * @param {object | null} row
 * @param {number | null} score
 * @param {{ updatedAt?: string | null }} [meta]
 * @param {{ intro?: boolean, reduceMotion?: boolean }} [motion]
 */
export function renderDetailPanel(container, row, score, meta = {}, motion = {}) {
  const selectionKey = row?.id || 'empty';
  container.dataset.selectionKey = selectionKey;
  disposeScrollAwaken(container);
  disposePanelDisclosures(container);
  // Trigger dies with the panel — never leave a sheet open over a new specialty.
  closeMethodSheet({ instant: true, restoreFocus: false });
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

  const intro = Boolean(motion.intro) && !motion.reduceMotion;
  const reduceMotion = Boolean(motion.reduceMotion);
  const inner = buildDetailInner(row, score, meta);
  container.append(inner);

  // Auto-open audit: animate after reveal step, not before (intro cascade).
  if (intro && inner.querySelector('.more-details[open]')) {
    const more = inner.querySelector('.more-details');
    if (more instanceof HTMLDetailsElement) {
      more.removeAttribute('open');
      more.dataset.disclosurePendingOpen = 'true';
    }
  }

  armPanelDisclosures(container, { reduceMotion });

  if (intro) {
    primeReveal(inner);
    armScrollAwaken(container, { immediate: false, reduceMotion: false });
  } else {
    finalizeReveal(inner);
    armScrollAwaken(container, {
      immediate: true,
      reduceMotion,
    });
  }
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
