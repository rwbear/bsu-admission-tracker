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
        title: `Мест в общем конкурсе: ${plan}`,
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
        text: `мест ${plan}`,
      }),
    );
  }

  const wrap = el(
    'div',
    { className: 'chance-track-wrap', 'data-awaken': 'chance' },
    [rail, axis, stats],
  );
  mount.append(wrap);
}

/**
 * @param {object} chance
 * @param {number | null} youPct
 * @param {number} seatPct
 */
function chanceAria(chance, youPct, seatPct) {
  const parts = [`Мест в общем конкурсе: ${chance.plan || 0}`];
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
 * Russian caption for the plan slab (E grammar).
 * @param {object} row
 * @returns {string}
 */
export function formatQuotaCaption(row) {
  const plan = Number(row.planOfficial ?? row.plan) || 0;
  const bvi = Number(row.admittedNoExam) || 0;
  const target = Math.max(
    Number(row.enrolledTargeted) || 0,
    Number(row.planTargeted) || 0,
  );
  const out = Number(row.admittedOutOfCompetition) || 0;
  const open = Number(row.openPlan ?? row.plan) || 0;
  return `План ${plan} − БВИ ${bvi} − целевые ${target} − вне ${out} = в общем ${open}`;
}

/**
 * Detail-note receipt (V1 prose).
 * @param {object} row
 * @returns {string}
 */
export function formatQuotaNote(row) {
  const plan = Number(row.planOfficial ?? row.plan) || 0;
  const bvi = Number(row.admittedNoExam) || 0;
  const target = Math.max(
    Number(row.enrolledTargeted) || 0,
    Number(row.planTargeted) || 0,
  );
  const out = Number(row.admittedOutOfCompetition) || 0;
  const open = Number(row.openPlan ?? row.plan) || 0;
  return `Из плана ${plan}: без вступительных ${bvi} · целевые ${target} · вне конкурса ${out} → в общем конкурсе ${open} ${ruSeatsWord(open)}`;
}

/**
 * @param {number} n
 * @returns {string}
 */
function ruSeatsWord(n) {
  const abs = Math.abs(Number(n) || 0) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return 'мест';
  if (d === 1) return 'место';
  if (d >= 2 && d <= 4) return 'места';
  return 'мест';
}

/**
 * Compact caption when many zeros (narrow / sparse).
 * @param {object} row
 * @returns {string}
 */
export function formatQuotaCaptionCompact(row) {
  const plan = Number(row.planOfficial ?? row.plan) || 0;
  const open = Number(row.openPlan ?? row.plan) || 0;
  const parts = [];
  const bvi = Number(row.admittedNoExam) || 0;
  const target = Math.max(
    Number(row.enrolledTargeted) || 0,
    Number(row.planTargeted) || 0,
  );
  const out = Number(row.admittedOutOfCompetition) || 0;
  if (bvi) parts.push(`БВИ ${bvi}`);
  if (target) parts.push(`целевые ${target}`);
  if (out) parts.push(`вне ${out}`);
  const lead = parts.length ? parts.join(' · ') : 'льготники';
  return `${lead} — в общем конкурсе ${open} из ${plan}`;
}

/**
 * Plan slab — seats story only. Never draws «ты» / people.
 * @param {HTMLElement} mount
 * @param {object} row
 */
export function renderPlanSlab(mount, row) {
  mount.innerHTML = '';
  if (!row?.showQuota) return;

  const plan = Number(row.planOfficial) || 0;
  if (plan <= 0) return;

  const bvi = Number(row.admittedNoExam) || 0;
  const target = Math.max(
    Number(row.enrolledTargeted) || 0,
    Number(row.planTargeted) || 0,
  );
  const out = Number(row.admittedOutOfCompetition) || 0;
  const open = Number(row.openPlan) || 0;

  /** @type {{ key: string, count: number, taken: boolean, label: string }[]} */
  const segments = [
    { key: 'bvi', count: bvi, taken: true, label: 'БВИ' },
    { key: 'target', count: target, taken: true, label: 'целевые' },
    { key: 'out', count: out, taken: true, label: 'вне' },
    { key: 'open', count: open, taken: false, label: 'в общем' },
  ].filter((s) => s.count > 0);

  const caption = el('div', { className: 'plan-slab-caption' }, [
    el('span', {
      text: `План ${plan} − БВИ ${bvi} − целевые ${target} − вне ${out} = `,
    }),
    el('span', { className: 'is-answer', text: `в общем ${open}` }),
  ]);

  const bar = el('div', {
    className: 'plan-slab-bar',
    role: 'img',
    'aria-label': `План ${plan} мест: ${formatQuotaCaptionCompact(row)}`,
  });

  for (const seg of segments) {
    const pct = (seg.count / plan) * 100;
    const node = el('div', {
      className: `plan-slab-seg${seg.taken ? ' is-taken' : ' is-open'}`,
      style: `flex-grow:${seg.count};flex-basis:0`,
      title: `${seg.label}: ${seg.count}`,
    });
    if (pct >= 12) {
      node.append(
        el('span', {
          className: 'plan-slab-seg-label',
          text: `${seg.label} ${seg.count}`,
        }),
      );
    }
    bar.append(node);
  }

  const wrap = el(
    'div',
    { className: 'plan-slab-wrap', 'data-awaken': 'plan' },
    [caption, bar],
  );
  mount.append(wrap);
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
 * Left edge % of the out zone (right edge of the seat-cut bucket).
 * @param {number} cutIdx
 * @param {number} bucketCount
 * @returns {number | null}
 */
export function histOutZoneLeftPct(cutIdx, bucketCount) {
  if (cutIdx < 0 || !bucketCount || bucketCount <= 0) return null;
  if (cutIdx >= bucketCount - 1) return null;
  return ((cutIdx + 1) / bucketCount) * 100;
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
 * Mobile-first histogram: solid full-width columns.
 * When the plan ends inside the band, a quiet vertical line splits the
 * panel — right of it is a whisper of hatch. No cut label on the axis;
 * the line is the only name the cut gets.
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
  const plan = row.plan || 0;
  const cutIdx = resolveHistCutIndex(buckets, plan);
  const outLeft = histOutZoneLeftPct(cutIdx, ranges.length);

  let mineIdx = -1;
  if (score != null && row.chance?.segments) {
    mineIdx = row.chance.segments.findIndex((s) => s.isMine);
  }

  const chart = el('div', {
    className: `hist-chart${outLeft != null ? ' has-out-zone' : ''}`,
    role: 'img',
    'data-awaken': 'hist',
    'aria-label':
      outLeft != null
        ? `Распределение по баллам: слева места по плану ${plan}, справа — вне набора`
        : 'Распределение по интервалам баллов',
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
        title: `Мест в общем конкурсе: ${plan}`,
      }),
    );
  }

  const bars = el('div', { className: 'hist-bars' });

  ranges.forEach((label, i) => {
    const count = buckets[i] || 0;
    const ratio = count / max;
    const mine = i === mineIdx;
    const col = el('div', {
      className: `hist-col${mine ? ' is-mine' : ''}`,
      title: `${String(label).replace(/\s+/g, ' ')}: ${count}`,
    });
    const barH = count > 0 ? Math.max(ratio * 100, 8) : 0;
    col.append(
      el('div', {
        className: 'hist-col-fill',
        // Height reserved via --bar-h; scaleY awakens without layout jump.
        style: `--bar-h:${barH.toFixed(1)}%;--bar-delay:${(i * 16).toFixed(0)}ms`,
      }),
    );
    bars.append(col);
  });

  const axis = el('div', { className: 'hist-axis' });
  const n = ranges.length;
  /** @type {{ i: number, text: string, kind: string }[]} */
  const ticks = [{ i: 0, text: shortRangeLabel(ranges[0]), kind: 'edge' }];
  if (mineIdx >= 0) {
    ticks.push({ i: mineIdx, text: 'ты', kind: 'you' });
  }
  ticks.push({
    i: n - 1,
    text: shortRangeLabel(ranges[n - 1]),
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
