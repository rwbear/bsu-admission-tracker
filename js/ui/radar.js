import { prepareSpecs } from '../compute.js';
import { el, fmtNum, fmtTime } from './dom.js';

/**
 * @param {HTMLElement} trackEl
 * @param {object} row
 */
export function renderChanceTrack(trackEl, row) {
  const chance = row.chance;
  trackEl.innerHTML = '';
  const track = el('div', {
    className: 'chance-track',
    role: 'img',
    'aria-label': 'Дорожка конкурса',
  });

  const denom = Math.max(chance.totalInBuckets, chance.plan, 1);
  for (const seg of chance.segments) {
    const width = (seg.count / denom) * 100;
    const segEl = el('div', {
      className: `chance-seg${seg.count === 0 ? ' empty' : ''}${seg.isMine ? ' mine' : ''}`,
      title: `${seg.label}: ${seg.count}`,
      style: `width:${Math.max(width, seg.count > 0 ? 0.4 : 0)}%`,
    });
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
    document.createTextNode('Выше'),
    document.createTextNode('Ниже'),
  ]);

  trackEl.append(labels, track);
}

/**
 * @param {object} row
 * @param {{ score: number | null }} opts
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

  const statusEl =
    row.statusLabel
      ? el('span', { className: `status-word ${row.status}`, text: row.statusLabel })
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
  if (statusEl) metrics.append(statusEl);

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
      document.createTextNode(
        `Конкурс ${row.pressure == null ? '—' : `${row.pressure.toFixed(1)}×`}`,
      ),
      document.createTextNode(`${fmtNum(row.inCompetition || row.totalApps)} заявлений`),
    ]),
  );

  const main = el('div', { className: 'radar-main' }, [
    el('div', { className: 'radar-top' }, [
      el('div', { className: 'radar-title' }, [
        row.groupName ? el('div', { className: 'radar-tag', text: row.groupName }) : '',
        el('div', { className: 'radar-name', text: row.specName }),
        el('div', {
          className: 'radar-tag',
          text: row.facultyName || '',
        }),
      ].filter(Boolean)),
      metrics,
    ]),
    chanceBlock,
    pressure,
    el('div', {
      className: 'radar-hint',
      text: 'Нажми — распределение баллов',
    }),
  ]);

  const detail = el('div', { className: 'radar-detail' }, [
    el('div', {
      className: 'detail-note',
      text: 'Распределение заявлений по интервалам. Подсветка — твой интервал; светлая отметка — граница расчётного проходного.',
    }),
    buildHistogram(row, opts.score),
    el('p', {
      className: 'meta-line',
      text: `Источник · ${fmtTime(row.updatedAt)}`,
    }),
  ]);

  if (row.sourceUrl) {
    detail.append(
      el('a', {
        href: row.sourceUrl,
        target: '_blank',
        rel: 'noopener',
        text: 'Открыть таблицу abit.bsu.by',
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
    const fillClass = ['hist-fill', i === cutIdx ? 'cut' : '', mine ? 'mine' : '']
      .filter(Boolean)
      .join(' ');

    wrap.append(
      el('div', { className: `hist-row${mine ? ' my-row' : ''}` }, [
        el('div', { className: 'hist-lbl', text: label }),
        el('div', { className: 'hist-track' }, [
          el('div', {
            className: fillClass,
            style: `width:${Math.round((count / max) * 100)}%`,
          }),
        ]),
        el('div', { className: 'hist-count', text: String(count) }),
      ]),
    );
  });
  return wrap;
}

/**
 * @param {HTMLElement} container
 * @param {object[]} specialties
 * @param {number | null} score
 * @param {{ query: string }} opts
 */
export function renderRadarList(container, specialties, score, opts) {
  container.innerHTML = '';
  const rows = prepareSpecs(specialties, score, {
    filter: 'all',
    query: opts.query,
  }).map((row) => ({ ...row, score }));

  if (!rows.length) {
    container.append(
      el('div', { className: 'state-box frame' }, [
        el('h3', { text: 'Ничего не найдено' }),
        el('p', { text: 'Смени форму обучения или поисковый запрос.' }),
      ]),
    );
    return rows;
  }

  const list = el('div', { className: 'radar-list' });
  for (const row of rows) {
    list.append(buildRadarRow(row, { score }));
  }
  container.append(list);
  return rows;
}
