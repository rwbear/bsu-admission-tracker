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
 * Short label for axis ticks.
 * @param {string} label
 */
function shortRangeLabel(label) {
  const t = String(label).replace(/\s+/g, ' ').trim();
  const more = t.match(/^(\d+(?:\.\d+)?)\s*и более/i);
  if (more) return `${more[1]}+`;
  const less = t.match(/^(\d+(?:\.\d+)?)\s*и менее/i);
  if (less) return `≤${Math.round(Number(less[1]))}`;
  const range = t.match(/(\d+(?:\.\d+)?)\s*[-\u2013]\s*(\d+(?:\.\d+)?)/);
  if (range) return range[1];
  return t.slice(0, 6);
}

/**
 * Mobile-first histogram: full-width column strip, no horizontal scroll.
 * @param {HTMLElement} mount
 * @param {object} row
 * @param {number | null} score
 */
export function renderHistogram(mount, row, score) {
  mount.innerHTML = '';
  const ranges = row.ranges || [];
  const buckets = row.buckets || [];
  if (!ranges.length) return;

  const max = Math.max(...buckets, 1);

  let cum = 0;
  let cutIdx = -1;
  const plan = row.plan || 0;
  for (let i = 0; i < buckets.length; i += 1) {
    cum += buckets[i] || 0;
    if (cutIdx === -1 && plan > 0 && cum >= plan) cutIdx = i;
  }

  let mineIdx = -1;
  if (score != null && row.chance?.segments) {
    mineIdx = row.chance.segments.findIndex((s) => s.isMine);
  }

  const chart = el('div', {
    className: 'hist-chart',
    role: 'img',
    'aria-label': 'Распределение по интервалам баллов',
  });

  const bars = el('div', { className: 'hist-bars' });

  ranges.forEach((label, i) => {
    const count = buckets[i] || 0;
    const ratio = count / max;
    const mine = i === mineIdx;
    const cut = i === cutIdx;
    const col = el('div', {
      className: `hist-col${mine ? ' is-mine' : ''}${cut ? ' is-cut' : ''}`,
      title: `${String(label).replace(/\s+/g, ' ')}: ${count}`,
    });
    const barH = count > 0 ? Math.max(ratio * 100, 8) : 0;
    col.append(
      el('div', {
        className: 'hist-col-fill',
        style: `height:${barH.toFixed(1)}%`,
      }),
    );
    bars.append(col);
  });

  const axis = el('div', { className: 'hist-axis' });
  const n = ranges.length;
  /** @type {{ i: number, text: string, kind: string }[]} */
  const ticks = [
    { i: 0, text: shortRangeLabel(ranges[0]), kind: 'edge' },
  ];
  if (mineIdx >= 0) {
    ticks.push({ i: mineIdx, text: 'ты', kind: 'you' });
  }
  if (cutIdx >= 0 && cutIdx !== mineIdx) {
    ticks.push({ i: cutIdx, text: 'мест', kind: 'cut' });
  }
  ticks.push({
    i: n - 1,
    text: shortRangeLabel(ranges[n - 1]),
    kind: 'edge',
  });

  // Drop near-duplicates so ticks don't pile up on tiny screens
  const placed = [];
  for (const tick of ticks) {
    if (placed.some((p) => Math.abs(p.i - tick.i) < Math.max(2, Math.floor(n / 16)))) {
      if (tick.kind === 'edge') continue;
      // keep you/cut over a nearby edge
      const near = placed.findIndex(
        (p) => Math.abs(p.i - tick.i) < Math.max(2, Math.floor(n / 16)),
      );
      if (near >= 0 && placed[near].kind === 'edge') placed.splice(near, 1);
      else if (near >= 0) continue;
    }
    placed.push(tick);
  }

  for (const tick of placed) {
    const pct = n === 1 ? 50 : (tick.i / (n - 1)) * 100;
    axis.append(
      el('span', {
        className: `hist-tick is-${tick.kind}`,
        text: tick.text,
        style: `left:${pct.toFixed(2)}%`,
      }),
    );
  }

  chart.append(bars, axis);
  mount.append(chart);
}
