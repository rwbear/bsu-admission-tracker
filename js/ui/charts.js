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
 * Always-on fact strip: every left-of-band number from formk1 we parsed.
 * Shown whenever quotaParseOk — including when taken === 0 (zeros are proof).
 * @param {HTMLElement} mount
 * @param {object} row
 */
export function renderTableFacts(mount, row) {
  mount.innerHTML = '';
  if (!row?.showFacts && !row?.quotaParseOk) return;

  const plan = Number(row.planOfficial ?? row.plan) || 0;
  const targetPlan = Number(row.planTargeted) || 0;
  const paidPlan = row.planPaid == null ? null : Number(row.planPaid) || 0;
  const totalApps = Number(row.totalApps) || 0;
  const enrolled = Number(row.enrolledTargeted) || 0;
  const bvi = Number(row.admittedNoExam) || 0;
  const out = Number(row.admittedOutOfCompetition) || 0;
  const contest = Number(row.inCompetition ?? row.competition) || 0;
  const open = Number(row.openPlan ?? row.plan) || 0;

  /** @type {{ label: string, value: number | string, strong?: boolean }[]} */
  const cells = [
    { label: 'План', value: plan, strong: true },
    { label: 'В т.ч. целевая', value: targetPlan },
  ];
  if (paidPlan != null) {
    cells.push({ label: 'План · оплата', value: paidPlan });
  }
  cells.push(
    { label: 'Подано всего', value: totalApps },
    { label: 'Целевые (зачисл.)', value: enrolled },
    { label: 'БВИ', value: bvi, strong: bvi > 0 },
    { label: 'Вне конкурса', value: out, strong: out > 0 },
    { label: 'По конкурсу', value: contest },
    { label: 'Мест в общем', value: open, strong: true },
  );

  const grid = el('div', {
    className: 'table-facts',
    role: 'group',
    'aria-label': 'Числа из таблицы мониторинга БГУ',
  });
  for (const cell of cells) {
    grid.append(
      el('div', {
        className: `table-fact${cell.strong ? ' is-strong' : ''}`,
      }, [
        el('div', { className: 'table-fact-val', text: String(cell.value) }),
        el('div', { className: 'table-fact-lbl', text: cell.label }),
      ]),
    );
  }
  mount.append(grid);
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
 * Open contest seats for the ridge cut. Uses `??` so openPlan=0 stays 0.
 * @param {object} row
 * @returns {number}
 */
export function histSeatBudget(row) {
  const v = row.openPlan;
  if (v != null && v !== '') return Number(v) || 0;
  return Number(row.plan) || 0;
}

/**
 * Cut line + microline only when quota parse is not known-failed.
 * @param {object} row
 */
export function shouldDrawHistCut(row) {
  return row.quotaParseOk !== false;
}

/**
 * People left/right of the seat cut (inclusive of the cut bucket on the left).
 * @param {number[]} buckets
 * @param {number} cutIdx
 * @returns {{ left: number, right: number, total: number } | null}
 */
export function histPeopleAroundCut(buckets, cutIdx) {
  if (cutIdx < 0 || !buckets?.length) return null;
  let left = 0;
  for (let i = 0; i <= cutIdx; i += 1) left += Number(buckets[i]) || 0;
  const total = buckets.reduce((a, b) => a + (Number(b) || 0), 0);
  return { left, right: total - left, total };
}

/**
 * Top tall bars for value caps — never mine, never below ~40% of max.
 * @param {number[]} buckets
 * @param {number} mineIdx
 * @returns {{ i: number, rank: number, count: number }[]}
 */
export function pickHistCapIndices(buckets, mineIdx) {
  if (!buckets?.length) return [];
  const max = Math.max(...buckets.map((c) => Number(c) || 0), 1);
  return buckets
    .map((c, i) => ({
      i,
      count: Number(c) || 0,
      ratio: (Number(c) || 0) / max,
    }))
    .filter((x) => x.count > 0 && x.i !== mineIdx && x.ratio >= 0.4)
    .sort((a, b) => b.count - a.count || a.i - b.i)
    .slice(0, 3)
    .map((x, rank) => ({ i: x.i, rank: rank + 1, count: x.count }));
}

/**
 * Panel caption for «Гряда конкурса».
 * @param {object} row
 * @param {number | null} [score]
 */
export function buildHistCaption(row, score = null) {
  const ranges = row.ranges || [];
  const buckets = row.buckets || [];
  if (!ranges.length) return 'Интервалы баллов';
  const n = buckets.reduce((a, b) => a + (Number(b) || 0), 0);
  let text = `Интервалы баллов — по конкурсу · ${n} чел.`;
  const mineIdx = resolveHistMineIndex(row, score);
  if (mineIdx >= 0 && ranges[mineIdx] != null) {
    text += ` · твой балл — в интервале ${String(ranges[mineIdx]).replace(/\s+/g, ' ')}`;
  }
  return text;
}

/**
 * @param {object} row
 * @param {number | null} score
 * @returns {number}
 */
function resolveHistMineIndex(row, score) {
  if (score == null || !row.chance?.segments) return -1;
  return row.chance.segments.findIndex((s) => s.isMine);
}

/**
 * @param {{
 *   total: number,
 *   left?: number | null,
 *   right?: number | null,
 *   openPlan?: number,
 *   cutDrawn?: boolean,
 *   mineLabel?: string | null,
 *   quotaOk?: boolean,
 * }} opts
 */
export function buildHistAriaLabel(opts) {
  const {
    total,
    left = null,
    right = null,
    openPlan = 0,
    cutDrawn = false,
    mineLabel = null,
    quotaOk = true,
  } = opts;
  if (!quotaOk || !cutDrawn || left == null || right == null) {
    let s = 'Распределение по интервалам баллов';
    if (mineLabel) s += `. Твой балл в интервале ${mineLabel}`;
    return s;
  }
  let s =
    `Распределение баллов по конкурсу: ${total} человек. ` +
    `Слева от черты — ${left}, в пределах ${openPlan} мест общего конкурса; ` +
    `справа — ${right}, за чертой. ` +
    'БВИ, целевые и вне конкурса не входят в это распределение — они показаны в плите плана выше.';
  if (mineLabel) s += ` Твой балл в интервале ${mineLabel}.`;
  return s;
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
 * «Гряда конкурса» — map of inCompetition cut against openPlan.
 * One ink weight, mine in full ink, cut unnamed on the axis.
 * @param {HTMLElement} mount
 * @param {object} row
 * @param {number | null} score
 */
export function renderHistogram(mount, row, score) {
  mount.innerHTML = '';
  const ranges = row.ranges || [];
  const buckets = row.buckets || [];
  if (!ranges.length) return;

  const max = Math.max(...buckets.map((c) => Number(c) || 0), 1);
  const quotaOk = shouldDrawHistCut(row);
  const openPlan = histSeatBudget(row);
  const cutIdx = quotaOk ? resolveHistCutIndex(buckets, openPlan) : -1;
  const outLeft = histOutZoneLeftPct(cutIdx, ranges.length);
  const around = histPeopleAroundCut(buckets, cutIdx);
  const mineIdx = resolveHistMineIndex(row, score);
  const caps = pickHistCapIndices(buckets, mineIdx);
  const capByIndex = new Map(caps.map((c) => [c.i, c]));
  const mineLabel =
    mineIdx >= 0 && ranges[mineIdx] != null
      ? String(ranges[mineIdx]).replace(/\s+/g, ' ')
      : null;
  const total = around?.total ?? buckets.reduce((a, b) => a + (Number(b) || 0), 0);

  const chart = el('div', {
    className: `hist-chart${outLeft != null ? ' has-out-zone' : ''}`,
    role: 'img',
    'data-awaken': 'hist',
    'aria-label': buildHistAriaLabel({
      total,
      left: around?.left,
      right: around?.right,
      openPlan,
      cutDrawn: outLeft != null,
      mineLabel,
      quotaOk,
    }),
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
        title: `Граница мест в общем конкурсе: ${openPlan}`,
      }),
    );
  }

  const bars = el('div', { className: 'hist-bars' });

  ranges.forEach((label, i) => {
    const count = Number(buckets[i]) || 0;
    const ratio = count / max;
    const mine = i === mineIdx;
    const empty = count === 0;
    const rangeText = String(label).replace(/\s+/g, ' ');
    let title = empty ? `${rangeText}: пусто` : `${rangeText}: ${count}`;
    if (mine && !empty) title += ' · твой интервал';

    const col = el('div', {
      className: `hist-col${mine ? ' is-mine' : ''}${empty ? ' is-empty' : ''}`,
      title,
      style: `--bar-delay:${(i * 16).toFixed(0)}ms`,
    });

    const cap = capByIndex.get(i);
    if (cap) {
      col.append(
        el('span', {
          className: 'hist-cap',
          'data-rank': String(cap.rank),
          'aria-hidden': 'true',
          text: String(cap.count),
        }),
      );
    }

    const barH = empty ? null : Math.max(ratio * 100, 8);
    col.append(
      el('div', {
        className: 'hist-col-fill',
        // Height via --bar-h; scaleY awakens without layout jump.
        style: empty
          ? '--bar-h:1px'
          : `--bar-h:${barH.toFixed(1)}%`,
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

  if (outLeft != null && around) {
    body.append(
      el('div', {
        className: 'hist-cut-meta',
        'aria-hidden': 'true',
        text: `слева от черты — ${around.left}, справа — ${around.right}`,
      }),
    );
  }

  chart.append(body);
  mount.append(chart);
}
