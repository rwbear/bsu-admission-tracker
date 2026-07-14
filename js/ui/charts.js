import { el } from './dom.js';

/**
 * Status counters for the summary strip.
 * @param {object[]} enrichedRows
 */
export function summarizeStatuses(enrichedRows) {
  const counts = { safe: 0, risk: 0, below: 0, neutral: 0 };
  for (const row of enrichedRows) {
    counts[row.status] = (counts[row.status] || 0) + 1;
  }
  return counts;
}

/**
 * Visual chance track (segmented bar + seat / you markers).
 * @param {HTMLElement} mount
 * @param {object} row
 */
export function renderChanceTrack(mount, row) {
  mount.innerHTML = '';
  const chance = row.chance || {
    segments: [],
    totalInBuckets: 0,
    plan: 0,
    seatCutRatio: 0,
    myMarkerRatio: null,
  };
  const denom = Math.max(chance.totalInBuckets, chance.plan, 1);

  const track = el('div', {
    className: 'chance-track',
    role: 'img',
    'aria-label': 'Дорожка конкурса',
  });

  for (const seg of chance.segments || []) {
    const width = (seg.count / denom) * 100;
    track.append(
      el('div', {
        className: `chance-seg${seg.count === 0 ? ' empty' : ''}${seg.isMine ? ' mine' : ''}`,
        title: `${seg.label}: ${seg.count}`,
        style: `width:${Math.max(width, seg.count > 0 ? 0.5 : 0)}%`,
      }),
    );
  }

  if (chance.plan > 0) {
    track.append(
      el('div', {
        className: 'chance-marker seat',
        title: `Мест: ${chance.plan}`,
        style: `left:${((chance.seatCutRatio || 0) * 100).toFixed(2)}%`,
      }),
    );
  }

  if (chance.myMarkerRatio != null) {
    track.append(
      el('div', {
        className: 'chance-marker you',
        title: 'Твой балл',
        style: `left:${(chance.myMarkerRatio * 100).toFixed(2)}%`,
      }),
    );
  }

  const wrap = el('div', { className: 'chance-track-wrap' }, [
    track,
    el('div', { className: 'chance-legend' }, [
      el('span', { text: 'Выше' }),
      el('span', { text: `Мест ${chance.plan || 0}` }),
      el('span', { text: 'Ниже' }),
    ]),
  ]);

  mount.append(wrap);
}

/**
 * Score-bucket histogram as labeled bars.
 * @param {HTMLElement} mount
 * @param {object} row
 * @param {number | null} score
 */
export function renderHistogram(mount, row, score) {
  mount.innerHTML = '';
  const ranges = row.ranges || [];
  const buckets = row.buckets || [];
  const max = Math.max(...buckets, 1);

  let cum = 0;
  let cutIdx = -1;
  const plan = row.plan || 0;
  for (let i = 0; i < buckets.length; i += 1) {
    cum += buckets[i] || 0;
    if (cutIdx === -1 && plan > 0 && cum >= plan) cutIdx = i;
  }

  const list = el('div', { className: 'hist-list' });

  ranges.forEach((label, i) => {
    const count = buckets[i] || 0;
    const ratio = count / max;
    const mine = score != null && row.chance?.segments?.[i]?.isMine;
    const cut = i === cutIdx;
    const rowEl = el('div', {
      className: `hist-row${mine ? ' is-mine' : ''}${cut ? ' is-cut' : ''}`,
    });
    rowEl.append(
      el('div', {
        className: 'hist-label',
        text: String(label).replace(/\s+/g, ' '),
        title: String(label),
      }),
      el('div', { className: 'hist-bar-track' }, [
        el('div', {
          className: 'hist-bar-fill',
          style: `width:${(ratio * 100).toFixed(1)}%`,
        }),
      ]),
      el('div', { className: 'hist-count', text: String(count) }),
    );
    list.append(rowEl);
  });

  mount.append(list);
}
