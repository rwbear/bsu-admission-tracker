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
 * Visual chance track: applicants ordered high→low, seats fill from the left.
 * Your score is a pin; the seat cut is a single vertical mark — no bucket stripes.
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
    peopleAbove: null,
  };

  const plan = chance.plan || 0;
  const seatPct = Math.min(100, Math.max(0, (chance.seatCutRatio || 0) * 100));
  const youPct =
    chance.myMarkerRatio == null
      ? null
      : Math.min(100, Math.max(0, chance.myMarkerRatio * 100));

  const rail = el('div', {
    className: 'chance-rail',
    role: 'img',
    'aria-label': chanceAria(chance, youPct, seatPct),
  });

  // Seats zone fills from the left (stronger scores claim places first).
  const fillRadius =
    seatPct >= 99.5 ? '999px' : seatPct <= 0.5 ? '0' : '999px 0 0 999px';
  rail.append(
    el('div', {
      className: 'chance-fill',
      style: `width:${seatPct.toFixed(2)}%;border-radius:${fillRadius}`,
    }),
  );

  if (plan > 0) {
    rail.append(
      el('div', {
        className: 'chance-cut',
        title: `План приёма: ${plan}`,
        style: `left:${seatPct.toFixed(2)}%`,
      }),
    );
  }

  if (youPct != null) {
    rail.append(
      el('div', {
        className: 'chance-you',
        title: 'Твой балл',
        style: `left:${youPct.toFixed(2)}%`,
      }),
    );
  }

  const axis = el('div', { className: 'chance-axis' });
  /** Nudge overlapping labels so "ты" and "мест" stay readable. */
  let cutLabelPct = seatPct;
  let youLabelPct = youPct;
  if (youPct != null && plan > 0 && Math.abs(youPct - seatPct) < 14) {
    if (youPct <= seatPct) {
      youLabelPct = Math.max(0, seatPct - 14);
      cutLabelPct = Math.min(100, seatPct + 2);
    } else {
      cutLabelPct = Math.max(0, seatPct - 2);
      youLabelPct = Math.min(100, seatPct + 14);
    }
  }

  if (plan > 0) {
    axis.append(
      el('span', {
        className: 'chance-axis-cut',
        text: `мест ${plan}`,
        style: `left:${cutLabelPct.toFixed(2)}%`,
      }),
    );
  }
  if (youLabelPct != null) {
    axis.append(
      el('span', {
        className: 'chance-axis-you',
        text: 'ты',
        style: `left:${youLabelPct.toFixed(2)}%`,
      }),
    );
  }

  const above =
    chance.peopleAbove == null ? null : Number(chance.peopleAbove);
  const stats = el('div', { className: 'chance-stats' });
  if (above != null) {
    stats.append(
      el('span', {
        className: 'chance-stat',
        text:
          above === 0
            ? 'Никого выше тебя'
            : above === 1
              ? '1 выше тебя'
              : `${above} выше тебя`,
      }),
    );
  } else {
    stats.append(
      el('span', {
        className: 'chance-stat is-muted',
        text: 'Введи балл — увидишь своё место',
      }),
    );
  }
  if (plan > 0) {
    stats.append(
      el('span', {
        className: 'chance-stat is-muted',
        text: `план ${plan}`,
      }),
    );
  }

  mount.append(
    el('div', { className: 'chance-track-wrap' }, [rail, axis, stats]),
  );
}

/**
 * @param {object} chance
 * @param {number | null} youPct
 * @param {number} seatPct
 */
function chanceAria(chance, youPct, seatPct) {
  const parts = [`План ${chance.plan || 0} мест`];
  if (chance.peopleAbove != null) {
    parts.push(`${chance.peopleAbove} выше тебя`);
  }
  if (youPct != null) {
    parts.push(`ты на ${youPct.toFixed(0)}% дорожки`);
  }
  parts.push(`отсечение мест на ${seatPct.toFixed(0)}%`);
  return parts.join(', ');
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
