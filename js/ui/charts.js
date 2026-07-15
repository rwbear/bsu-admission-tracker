import { el } from './dom.js';
import { bucketHigh, bucketLow } from '../compute.js';

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
 * Index of the bucket where cumulative applicants (high→low) first cover the plan.
 * That bucket is still “in”; the out zone starts at its right edge.
 * @param {number[]} buckets
 * @param {number} plan
 * @returns {number} cut index, or -1 when there is no seat cut
 */
export function resolveHistCutIndex(buckets, plan) {
  if (!plan || plan <= 0 || !buckets?.length) return -1;
  let cum = 0;
  for (let i = 0; i < buckets.length; i += 1) {
    cum += Number(buckets[i]) || 0;
    if (cum >= plan) return i;
  }
  return -1;
}

/**
 * Left edge % of the out zone (right edge of the seat-cut bucket),
 * in window-local indices.
 * @param {number} cutIdxLocal
 * @param {number} bucketCount
 * @returns {number | null}
 */
export function histOutZoneLeftPct(cutIdxLocal, bucketCount) {
  if (cutIdxLocal < 0 || !bucketCount || bucketCount <= 0) return null;
  if (cutIdxLocal >= bucketCount - 1) return null;
  return ((cutIdxLocal + 1) / bucketCount) * 100;
}

/**
 * Tangible low edge of applicants in a populated bucket.
 * @param {string} label
 */
function appsFloorInBucket(label) {
  const lo = bucketLow(label);
  const hi = bucketHigh(label);
  if (lo != null && lo > 0) return lo;
  if (hi != null && Number.isFinite(hi)) return hi;
  if (lo != null) return lo;
  return null;
}

/**
 * Crop the published high→low band to the data that actually exists.
 * Low edge = lowest occupied score − padDown (default 60), so the chart
 * no longer always dies at BSU’s fixed «120 и менее» dump bucket.
 *
 * @param {string[]} ranges
 * @param {number[]} buckets
 * @param {{
 *   padDown?: number,
 *   padHighBuckets?: number,
 *   mustInclude?: number[],
 * }} [opts]
 * @returns {{
 *   start: number,
 *   end: number,
 *   appsFloor: number | null,
 *   targetFloor: number | null,
 *   clippedLow: boolean,
 * }}
 */
export function resolveHistDisplayWindow(ranges, buckets, opts = {}) {
  const padDown = opts.padDown ?? 60;
  const padHighBuckets = opts.padHighBuckets ?? 1;
  const mustInclude = (opts.mustInclude || []).filter(
    (i) => Number.isFinite(i) && i >= 0,
  );
  const n = Math.min(ranges?.length || 0, buckets?.length || 0);
  if (!n) {
    return {
      start: 0,
      end: 0,
      appsFloor: null,
      targetFloor: null,
      clippedLow: false,
    };
  }

  let first = -1;
  let last = -1;
  for (let i = 0; i < n; i += 1) {
    if ((Number(buckets[i]) || 0) > 0) {
      if (first < 0) first = i;
      last = i;
    }
  }

  if (first < 0) {
    return {
      start: 0,
      end: n,
      appsFloor: null,
      targetFloor: null,
      clippedLow: false,
    };
  }

  for (const i of mustInclude) {
    if (i < n) {
      first = Math.min(first, i);
      last = Math.max(last, i);
    }
  }

  const appsFloor = appsFloorInBucket(ranges[last]);
  const targetFloor =
    appsFloor == null ? null : Math.max(0, Math.round(appsFloor - padDown));

  let start = Math.max(0, first - padHighBuckets);
  let end = last + 1;

  if (targetFloor != null) {
    for (let i = last + 1; i < n; i += 1) {
      const hi = bucketHigh(ranges[i]);
      if (hi == null) break;
      if (!Number.isFinite(hi)) break;
      if (hi >= targetFloor) end = i + 1;
      else break;
    }
  }

  for (const i of mustInclude) {
    if (i < n) end = Math.max(end, i + 1);
  }

  return {
    start,
    end,
    appsFloor,
    targetFloor,
    clippedLow: end < n,
  };
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
 * How many cube rows to draw for a given peak count.
 * Keeps cubes tiny when peeks are small; caps height when popular.
 * @param {number} maxCount
 */
export function histCubeLevels(maxCount) {
  const CAP = 28;
  const FLOOR = 16;
  const m = Math.max(0, Math.floor(Number(maxCount) || 0));
  if (m <= 0) return FLOOR;
  if (m >= CAP) return CAP;
  if (m >= FLOOR) return m;
  return FLOOR;
}

/**
 * Active cubes from the bottom for one score column.
 * @param {number} count
 * @param {number} maxCount
 * @param {number} levels
 */
export function histCubeFilled(count, maxCount, levels) {
  const c = Math.max(0, Number(count) || 0);
  const m = Math.max(1, Number(maxCount) || 1);
  const L = Math.max(1, Math.floor(Number(levels) || 1));
  if (c <= 0) return 0;
  if (L === m) return Math.min(L, Math.round(c));
  return Math.min(L, Math.round((c / m) * L));
}

/**
 * Mobile-first histogram as a dense cube table: a CSS grid of nearly
 * square cells with a visible gutter. Dark = applicants, light = empty.
 * Seat cut is a full-height line; out side is dimmed.
 * @param {HTMLElement} mount
 * @param {object} row
 * @param {number | null} score
 */
export function renderHistogram(mount, row, score) {
  mount.innerHTML = '';
  const rangesAll = row.ranges || [];
  const bucketsAll = row.buckets || [];
  if (!rangesAll.length) return;

  const plan = row.plan || 0;
  const cutIdxAll = resolveHistCutIndex(bucketsAll, plan);

  let mineIdxAll = -1;
  if (score != null && row.chance?.segments) {
    mineIdxAll = row.chance.segments.findIndex((s) => s.isMine);
  }

  const window = resolveHistDisplayWindow(rangesAll, bucketsAll, {
    padDown: 60,
    padHighBuckets: 1,
    mustInclude: [cutIdxAll, mineIdxAll].filter((i) => i >= 0),
  });

  const ranges = rangesAll.slice(window.start, window.end);
  const buckets = bucketsAll.slice(window.start, window.end);
  if (!ranges.length) return;

  const max = Math.max(...buckets, 1);
  const levels = histCubeLevels(max);
  const cutIdx =
    cutIdxAll >= window.start && cutIdxAll < window.end
      ? cutIdxAll - window.start
      : -1;
  const mineIdx =
    mineIdxAll >= window.start && mineIdxAll < window.end
      ? mineIdxAll - window.start
      : -1;
  const outLeft = histOutZoneLeftPct(cutIdx, ranges.length);

  const lowLabel =
    window.targetFloor != null
      ? `≤${window.targetFloor}`
      : shortRangeLabel(ranges[ranges.length - 1]);

  const chart = el('div', {
    className: `hist-chart${outLeft != null ? ' has-out-zone' : ''}`,
    role: 'img',
    'aria-label':
      outLeft != null
        ? `Распределение по баллам до ${lowLabel}: слева места по плану ${plan}, справа — вне набора`
        : `Распределение по интервалам баллов до ${lowLabel}`,
  });

  const body = el('div', { className: 'hist-chart-body' });

  if (outLeft != null) {
    body.append(
      el('div', {
        className: 'hist-out-region',
        'aria-hidden': 'true',
        style: `left:${outLeft.toFixed(3)}%`,
      }),
      el('div', {
        className: 'hist-cut-line',
        'aria-hidden': 'true',
        style: `left:${outLeft.toFixed(3)}%`,
        title: `План приёма: ${plan}`,
      }),
    );
  }

  // Flat column-major grid → real square cells (not stretched bar slices).
  const bars = el('div', {
    className: 'hist-bars',
    style: `--hist-cols:${ranges.length};--hist-rows:${levels}`,
  });

  ranges.forEach((label, i) => {
    const count = buckets[i] || 0;
    const filled = histCubeFilled(count, max, levels);
    const mine = i === mineIdx;
    const out = outLeft != null && cutIdx >= 0 && i > cutIdx;
    const tip = `${String(label).replace(/\s+/g, ' ')}: ${count}`;

    // Top → bottom within each column (grid-auto-flow: column).
    for (let r = levels - 1; r >= 0; r -= 1) {
      const on = r < filled;
      const cube = el('div', {
        className: `hist-cube${on ? ' is-on' : ' is-off'}${mine && on ? ' is-mine' : ''}${out ? ' is-out' : ''}`,
      });
      if (r === 0) cube.title = tip;
      bars.append(cube);
    }
  });

  const axis = el('div', { className: 'hist-axis' });
  const n = ranges.length;
  /** @type {{ i: number, text: string, kind: string }[]} */
  const ticks = [{ i: 0, text: shortRangeLabel(ranges[0]), kind: 'edge' }];
  if (mineIdx >= 0) {
    ticks.push({ i: mineIdx, text: 'ты', kind: 'you' });
  }
  if (cutIdx >= 0 && cutIdx !== mineIdx) {
    ticks.push({ i: cutIdx, text: 'мест', kind: 'cut' });
  }
  ticks.push({
    i: n - 1,
    text: lowLabel,
    kind: 'edge',
  });

  const placed = [];
  for (const tick of ticks) {
    if (
      placed.some(
        (p) => Math.abs(p.i - tick.i) < Math.max(2, Math.floor(n / 16)),
      )
    ) {
      if (tick.kind === 'edge') continue;
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

  body.append(bars, axis);
  chart.append(body);
  mount.append(chart);
}
