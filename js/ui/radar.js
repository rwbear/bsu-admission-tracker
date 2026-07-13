import { prepareSpecs } from '../compute.js';
import { el, fmtNum, fmtTime } from './dom.js';

/**
 * @param {HTMLElement} trackEl
 * @param {import('../compute.js').enrichSpec extends Function ? any : never} row
 */
export function renderChanceTrack(trackEl, row) {
  const chance = row.chance;
  trackEl.innerHTML = '';
  const track = el('div', { className: 'chance-track', role: 'img', 'aria-label': 'Дорожка конкурса' });

  const denom = Math.max(chance.totalInBuckets, chance.plan, 1);
  for (const seg of chance.segments) {
    const width = (seg.count / denom) * 100;
    const segEl = el('div', {
      className: `chance-seg${seg.count === 0 ? ' empty' : ''}${seg.isMine ? ' mine' : ''}`,
      title: `${seg.label}: ${seg.count}`,
      style: `width:${Math.max(width, seg.count > 0 ? 0.4 : 0)}%`,
    });
    // mark segments fully above user
    if (row.score != null && seg.lo != null && seg.lo > row.score) {
      segEl.classList.add('above-me');
    }
    track.append(segEl);
  }

  if (chance.plan > 0) {
    track.append(
      el('div', {
        className: 'seat-marker',
        title: `Мест: ${chance.plan}`,
        style: `left:${(chance.seatCutRatio * 100).toFixed(2)}%`,
      }),
    );
  }

  if (chance.myMarkerRatio != null) {
    track.append(
      el('div', {
        className: 'me-marker',
        title: 'Твой балл',
        style: `left:${(chance.myMarkerRatio * 100).toFixed(2)}%`,
      }),
    );
  }

  const labels = el('div', { className: 'chance-labels' }, [
    document.createTextNode('Выше баллы'),
    document.createTextNode('Ниже баллы'),
  ]);

  trackEl.append(labels, track);
}

/**
 * @param {object} row
 * @param {{ compared: boolean, onToggle: () => void, score: number | null }} opts
 */
export function buildRadarRow(row, opts) {
  const article = el('article', {
    className: `radar-row ${row.status !== 'neutral' ? row.status : ''}`,
    'data-id': row.id,
  });

  const peopleVal =
    opts.score == null
      ? '—'
      : `${fmtNum(row.peopleAbove)} / ${fmtNum(row.plan)}`;

  const passVal = row.estimatedPassing == null ? '—' : fmtNum(row.estimatedPassing);
  const deltaText =
    row.delta == null
      ? ''
      : row.delta >= 0
        ? `+${fmtNum(row.delta)}`
        : fmtNum(row.delta);

  const badge =
    row.statusLabel
      ? el('span', { className: `badge ${row.status}`, text: row.statusLabel })
      : null;

  const metrics = el('div', { className: 'radar-metrics' }, [
    el('div', { className: 'metric' }, [
      el('div', { className: 'metric-val', text: peopleVal }),
      el('div', { className: 'metric-lbl', text: 'Над тобой / мест' }),
    ]),
    el('div', { className: 'metric' }, [
      el('div', { className: 'metric-val', text: passVal }),
      el('div', {
        className: 'metric-lbl',
        text: deltaText ? `Расчётный (${deltaText})` : 'Расчётный проходной',
      }),
    ]),
  ]);
  if (badge) metrics.append(badge);

  const chanceBlock = el('div', { className: 'chance-block' });
  renderChanceTrack(chanceBlock, { ...row, score: opts.score });

  const pressure = el('div', { className: 'pressure' });
  const ratio = row.pressure == null ? 0 : Math.min(row.pressure / 3, 1);
  pressure.append(
    el('div', { className: 'pressure-bar' }, [
      el('div', {
        className: 'pressure-fill',
        style: `width:${(ratio * 100).toFixed(1)}%`,
      }),
    ]),
    el('div', { className: 'pressure-meta' }, [
      document.createTextNode(`Конкурс ${row.pressure == null ? '—' : `${row.pressure.toFixed(1)}×`}`),
      document.createTextNode(`${fmtNum(row.inCompetition || row.totalApps)} заявлений`),
    ]),
  );

  const pinBtn = el('button', {
    className: `btn-ghost${opts.compared ? ' active' : ''}`,
    type: 'button',
    text: opts.compared ? 'В сравнении' : 'Сравнить',
  });
  pinBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    opts.onToggle();
  });

  const main = el('div', { className: 'radar-main' }, [
    el('div', { className: 'radar-top' }, [
      el('div', { className: 'radar-title' }, [
        row.groupName ? el('div', { className: 'radar-tag', text: row.groupName }) : '',
        el('div', { className: 'radar-name', text: row.specName }),
        el('div', { className: 'radar-tag', text: row.facultyName || '' }),
      ].filter(Boolean)),
      metrics,
    ]),
    chanceBlock,
    pressure,
    el('div', { className: 'radar-actions' }, [
      pinBtn,
      el('span', {
        className: 'meta-line',
        text: 'Нажми строку — распределение баллов',
      }),
    ]),
  ]);

  const detail = el('div', { className: 'radar-detail' }, [
    el('div', { className: 'detail-note', text: 'Распределение заявлений по интервалам баллов. Подсветка — твой интервал; тёмная отметка — граница расчётного проходного.' }),
    buildHistogram(row, opts.score),
    el('p', {
      className: 'meta-line',
      text: `Источник обновлён: ${fmtTime(row.updatedAt)} · расчётный проходной — оценка по текущей таблице, не официальный приказ`,
    }),
  ]);
  if (row.sourceUrl) {
    detail.append(
      el('a', {
        href: row.sourceUrl,
        target: '_blank',
        rel: 'noopener',
        text: 'Открыть исходную таблицу',
      }),
    );
  }

  main.addEventListener('click', () => {
    article.classList.toggle('open');
  });

  article.append(main, detail);
  return article;
}

/**
 * @param {object} row
 * @param {number | null} score
 */
function buildHistogram(row, score) {
  const wrap = el('div', { className: 'hist' });
  const max = Math.max(...(row.buckets || [0]), 1);
  let cum = 0;
  let cutIdx = -1;
  const plan = row.plan || 0;
  for (let i = 0; i < (row.buckets || []).length; i += 1) {
    cum += row.buckets[i] || 0;
    if (cutIdx === -1 && plan > 0 && cum >= plan) cutIdx = i;
  }

  (row.ranges || []).forEach((label, i) => {
    const count = row.buckets[i] || 0;
    const mine = score != null && row.chance?.segments?.[i]?.isMine;
    const fillClass = [
      'hist-fill',
      i === cutIdx ? 'cut' : '',
      mine ? 'mine' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const rowEl = el('div', { className: `hist-row${mine ? ' my-row' : ''}` }, [
      el('div', { className: 'hist-lbl', text: label }),
      el('div', { className: 'hist-track' }, [
        el('div', {
          className: fillClass,
          style: `width:${Math.round((count / max) * 100)}%`,
        }),
      ]),
      el('div', { className: 'hist-count', text: String(count) }),
    ]);
    wrap.append(rowEl);
  });
  return wrap;
}

/**
 * @param {object[]} specialties
 * @param {number | null} score
 * @param {{ filter: string, query: string, compareIds: string[], onToggleCompare: (id: string) => void }} opts
 */
export function renderRadarList(container, specialties, score, opts) {
  container.innerHTML = '';
  const rows = prepareSpecs(specialties, score, {
    filter: opts.filter,
    query: opts.query,
  }).map((row) => ({ ...row, score }));

  if (!rows.length) {
    container.append(
      el('div', { className: 'state-box panel' }, [
        el('h3', { text: 'Ничего не найдено' }),
        el('p', { text: 'Попробуй сменить факультет, фильтр или поисковый запрос.' }),
      ]),
    );
    return rows;
  }

  const list = el('div', { className: 'radar-list' });
  for (const row of rows) {
    list.append(
      buildRadarRow(row, {
        score,
        compared: opts.compareIds.includes(row.id),
        onToggle: () => opts.onToggleCompare(row.id),
      }),
    );
  }
  container.append(list);
  return rows;
}

/**
 * @param {HTMLElement} root
 * @param {object[]} enrichedRows
 * @param {string[]} compareIds
 * @param {{ onClear: () => void }} handlers
 */
export function renderCompareTray(root, enrichedRows, compareIds, handlers) {
  if (!compareIds.length) {
    root.classList.add('hidden');
    root.innerHTML = '';
    return;
  }
  root.classList.remove('hidden');
  const picked = compareIds
    .map((id) => enrichedRows.find((r) => r.id === id))
    .filter(Boolean);

  const grid = el('div', { className: 'compare-grid' });
  for (const row of picked) {
    const card = el('div', { className: 'compare-card' }, [
      el('h4', { text: row.specName }),
      el('div', {
        className: 'metric-val',
        text: row.peopleAbove == null ? '—' : `${fmtNum(row.peopleAbove)} / ${fmtNum(row.plan)}`,
      }),
      el('div', { className: 'metric-lbl', text: 'Над тобой / мест' }),
    ]);
    const track = el('div', { className: 'chance-block' });
    renderChanceTrack(track, row);
    card.append(track);
    if (row.statusLabel) {
      card.append(el('span', { className: `badge ${row.status}`, text: row.statusLabel }));
    }
    grid.append(card);
  }

  root.innerHTML = '';
  const inner = el('div', { className: 'compare-inner wrap' }, [
    el('div', { className: 'compare-head' }, [
      el('strong', { text: `Сравнение · ${picked.length}/3` }),
      el('button', { className: 'btn-ghost', type: 'button', text: 'Очистить' }),
    ]),
    grid,
  ]);
  inner.querySelector('button')?.addEventListener('click', handlers.onClear);
  root.append(inner);
}
