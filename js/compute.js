/**
 * Pure admission math: passing estimate, people above, status, sort.
 * Used by the site and by scrapers (via relative import).
 */

/** @typedef {{ ranges: string[], buckets: number[], plan: number, inCompetition?: number }} SpecBuckets */

/**
 * Parse the low end of a score-range header.
 * @param {string} label
 * @returns {number | null}
 */
export function bucketLow(label) {
  const text = String(label).replace(/\s+/g, ' ').trim();
  const more = text.match(/^(\d+)\s*(и более|и выше)/i);
  if (more) return Number(more[1]);
  const less = text.match(/^(\d+(?:\.\d+)?)\s*(и менее)/i);
  if (less) return 0;
  const range = text.match(/(\d+)\s*[-\u2013]\s*(\d+)/);
  if (range) return Math.min(Number(range[1]), Number(range[2]));
  const single = text.match(/^(\d+)$/);
  if (single) return Number(single[1]);
  return null;
}

/**
 * Parse the high end of a score-range header (inclusive).
 * @param {string} label
 * @returns {number | null}
 */
export function bucketHigh(label) {
  const text = String(label).replace(/\s+/g, ' ').trim();
  const more = text.match(/^(\d+)\s*(и более|и выше)/i);
  if (more) return Number.POSITIVE_INFINITY;
  const less = text.match(/^(\d+(?:\.\d+)?)\s*(и менее)/i);
  if (less) return Number(less[1]);
  const range = text.match(/(\d+)\s*[-\u2013]\s*(\d+)/);
  if (range) return Math.max(Number(range[1]), Number(range[2]));
  const single = text.match(/^(\d+)$/);
  if (single) return Number(single[1]);
  return null;
}

/**
 * Whether a score falls inside a range label.
 * @param {number} score
 * @param {string} label
 * @returns {boolean}
 */
export function scoreInBucket(score, label) {
  const lo = bucketLow(label);
  const hi = bucketHigh(label);
  if (lo === null || hi === null) return false;
  return score >= lo && score <= hi;
}

/**
 * Estimated passing score: walk buckets from high to low until cumulative >= plan.
 * Ranges are assumed sorted high → low (as published by universities).
 * @param {string[]} ranges
 * @param {number[]} buckets
 * @param {number} plan
 * @returns {number | null}
 */
export function calcPassing(ranges, buckets, plan) {
  if (!plan || plan <= 0 || !ranges?.length || !buckets?.length) return null;
  let cum = 0;
  const n = Math.min(ranges.length, buckets.length);
  for (let i = 0; i < n; i += 1) {
    cum += Number(buckets[i]) || 0;
    if (cum >= plan) return bucketLow(ranges[i]);
  }
  return null;
}

/**
 * Count of applicants with scores strictly above the given score.
 * Higher bands count in full. Inside the own band, assume a uniform spread
 * over integer scores so a bottom-of-band pin (e.g. 391 in «395–391») is not
 * falsely treated as «inside plan» while «на грани» says otherwise.
 * Open-ended top bands («N и более») stay unknown within-band → 0 extra.
 * @param {string[]} ranges
 * @param {number[]} buckets
 * @param {number} score
 * @returns {number | null}
 */
export function peopleAbove(ranges, buckets, score) {
  if (score == null || Number.isNaN(score) || !ranges?.length) return null;
  let above = 0;
  const n = Math.min(ranges.length, buckets.length);
  for (let i = 0; i < n; i += 1) {
    const lo = bucketLow(ranges[i]);
    const hi = bucketHigh(ranges[i]);
    const count = Number(buckets[i]) || 0;
    if (lo === null || hi === null) continue;
    if (lo > score) {
      above += count;
      continue;
    }
    if (hi < score) continue;
    // Own band: uniform over integer scores in [lo, hi].
    if (Number.isFinite(hi) && hi >= lo) {
      const span = hi - lo + 1;
      if (span > 0) above += ((hi - score) / span) * count;
    }
  }
  return Math.round(above);
}

/**
 * Applicants at or above score (includes own bucket and higher).
 * Useful for "am I inside the seat window?" relative to plan.
 * @param {string[]} ranges
 * @param {number[]} buckets
 * @param {number} score
 * @returns {number | null}
 */
export function peopleAtOrAbove(ranges, buckets, score) {
  if (score == null || Number.isNaN(score) || !ranges?.length) return null;
  let total = 0;
  const n = Math.min(ranges.length, buckets.length);
  for (let i = 0; i < n; i += 1) {
    const hi = bucketHigh(ranges[i]);
    if (hi === null) continue;
    if (hi >= score) total += Number(buckets[i]) || 0;
  }
  return total;
}

/**
 * Build segments for the chance track visualization.
 * Left = stronger scores. Seat cut at `plan`. Marker ≈ peopleAbove + you
 * (aligned with «над тобой / мест», not the mid-point of the score band).
 * @param {SpecBuckets} spec
 * @param {number | null} score
 * @returns {{
 *   segments: { label: string, count: number, lo: number | null, hi: number | null, isMine: boolean }[],
 *   totalInBuckets: number,
 *   plan: number,
 *   peopleAbove: number | null,
 *   peopleAtOrAbove: number | null,
 *   estimatedPassing: number | null,
 *   seatCutRatio: number,
 *   myMarkerRatio: number | null
 * }}
 */
export function buildChanceTrack(spec, score) {
  const plan = Number(spec.plan) || 0;
  const ranges = spec.ranges || [];
  const buckets = spec.buckets || [];
  const segments = [];
  let totalInBuckets = 0;
  const n = Math.min(ranges.length, buckets.length);

  for (let i = 0; i < n; i += 1) {
    const count = Number(buckets[i]) || 0;
    totalInBuckets += count;
    segments.push({
      label: ranges[i],
      count,
      lo: bucketLow(ranges[i]),
      hi: bucketHigh(ranges[i]),
      isMine: score != null && scoreInBucket(score, ranges[i]),
    });
  }

  const above = score != null ? peopleAbove(ranges, buckets, score) : null;
  const atOrAbove = score != null ? peopleAtOrAbove(ranges, buckets, score) : null;
  const estimatedPassing = calcPassing(ranges, buckets, plan);
  const denom = Math.max(totalInBuckets, plan, 1);
  const seatCutRatio = Math.min(1, plan / denom);

  let myMarkerRatio = null;
  if (score != null && totalInBuckets > 0) {
    /*
     * Pin must match «над тобой / мест»: place ≈ peopleAbove + you.
     * Mid-band width alone is not the source of truth — peopleAbove already
     * estimates within-band competition when score sits inside a closed range.
     */
    if (above != null) {
      myMarkerRatio = Math.min(1, (above + 0.5) / denom);
    } else {
      let before = 0;
      for (const seg of segments) {
        if (seg.isMine) {
          myMarkerRatio = Math.min(1, (before + 0.5) / denom);
          break;
        }
        before += seg.count;
      }
    }
  }

  return {
    segments,
    totalInBuckets,
    plan,
    peopleAbove: above,
    peopleAtOrAbove: atOrAbove,
    estimatedPassing,
    seatCutRatio,
    myMarkerRatio,
  };
}

/**
 * @param {number | null} score
 * @param {number | null} passing
 * @returns {'safe' | 'risk' | 'below' | 'neutral'}
 */
export function getStatus(score, passing) {
  if (score == null || passing == null) return 'neutral';
  const delta = score - passing;
  if (delta >= 10) return 'safe';
  if (delta >= 0) return 'risk';
  return 'below';
}

/**
 * @param {'safe' | 'risk' | 'below' | 'neutral'} status
 * @returns {string}
 */
export function statusLabel(status) {
  return {
    safe: 'В зоне',
    risk: 'На грани',
    below: 'Ниже',
    neutral: '',
  }[status] || '';
}

/**
 * Contest pressure: applications / plan.
 * @param {number} apps
 * @param {number} plan
 * @returns {number | null}
 */
export function contestRatio(apps, plan) {
  if (!plan || plan <= 0) return null;
  return apps / plan;
}

/**
 * Seats already claimed before general contest (БВИ / целевые / вне конкурса).
 * Campaign-safer target rule: max(enrolled, reserved plan share).
 * @param {object} spec
 * @returns {{
 *   planOfficial: number,
 *   planTargeted: number | null,
 *   enrolledTargeted: number | null,
 *   admittedNoExam: number | null,
 *   admittedOutOfCompetition: number | null,
 *   quotaParseOk: boolean,
 *   taken: number,
 *   openPlan: number,
 *   showQuota: boolean,
 * }}
 */
export function resolveSeatQuota(spec) {
  const planOfficial = Number(spec.plan) || 0;
  const quotaParseOk = spec.quotaParseOk === true;
  const planTargeted = quotaParseOk ? Number(spec.planTargeted) || 0 : null;
  const enrolledTargeted = quotaParseOk
    ? Number(spec.enrolledTargeted) || 0
    : null;
  const admittedNoExam = quotaParseOk ? Number(spec.admittedNoExam) || 0 : null;
  const admittedOutOfCompetition = quotaParseOk
    ? Number(spec.admittedOutOfCompetition) || 0
    : null;

  let taken = 0;
  let openPlan = planOfficial;
  if (quotaParseOk) {
    taken =
      Math.max(enrolledTargeted || 0, planTargeted || 0) +
      (admittedNoExam || 0) +
      (admittedOutOfCompetition || 0);
    openPlan = Math.max(0, planOfficial - taken);
  }

  return {
    planOfficial,
    planTargeted,
    enrolledTargeted,
    admittedNoExam,
    admittedOutOfCompetition,
    quotaParseOk,
    taken,
    openPlan,
    showQuota: quotaParseOk && taken > 0,
  };
}

/**
 * Enrich a specialty for the UI given a user score.
 * @param {object} spec
 * @param {number | null} score
 */
export function enrichSpec(spec, score) {
  const quota = resolveSeatQuota(spec);
  const planOfficial = quota.planOfficial;
  const plan = quota.openPlan;
  const ranges = spec.ranges || [];
  const buckets = spec.buckets || [];
  const estimatedPassing = calcPassing(ranges, buckets, plan);
  const scoreOk = score != null && Number.isFinite(Number(score));
  const above = scoreOk ? peopleAbove(ranges, buckets, Number(score)) : null;
  const atOrAbove = scoreOk
    ? peopleAtOrAbove(ranges, buckets, Number(score))
    : null;
  let status = getStatus(scoreOk ? Number(score) : null, estimatedPassing);
  const apps = Number(spec.inCompetition ?? spec.totalApps) || 0;
  const bucketSum = buckets.reduce((a, b) => a + (Number(b) || 0), 0);
  const competition = Math.max(apps, bucketSum);
  // Seats still open: no passing score has formed — every applicant is in.
  if (status === 'neutral' && scoreOk && plan > 0 && competition < plan) {
    status = 'safe';
  } else if (status === 'neutral' && scoreOk && plan > 0) {
    // Score entered but no расчётный yet while the seat pool is already full.
    // Never leave a blank mark — use bands when present, else oversubscribed risk.
    if (above != null && ranges.length) {
      status = above < plan ? 'risk' : 'below';
    } else {
      status = 'risk';
    }
  }
  // No general-contest seats left (quotas ate the plan) — honesty forces «Ниже».
  if (scoreOk && quota.quotaParseOk && planOfficial > 0 && plan === 0) {
    status = 'below';
  }
  const pressure = contestRatio(competition, plan);
  const chance = buildChanceTrack(
    { ranges, buckets, plan, inCompetition: competition },
    scoreOk ? Number(score) : null,
  );

  const delta =
    scoreOk && estimatedPassing != null
      ? Number(score) - estimatedPassing
      : null;

  // Lower sort key = better chance for the student
  let sortKey = 5000;
  if (scoreOk && above != null && plan > 0) {
    sortKey = above / plan;
  } else if (delta != null) {
    sortKey = -delta;
  }

  return {
    ...spec,
    planOfficial,
    plan,
    planTargeted: quota.planTargeted,
    enrolledTargeted: quota.enrolledTargeted,
    admittedNoExam: quota.admittedNoExam,
    admittedOutOfCompetition: quota.admittedOutOfCompetition,
    quotaParseOk: quota.quotaParseOk,
    taken: quota.taken,
    openPlan: quota.openPlan,
    showQuota: quota.showQuota,
    estimatedPassing,
    peopleAbove: above,
    peopleAtOrAbove: atOrAbove,
    status,
    statusLabel: statusLabel(status),
    pressure,
    competition,
    bucketSum,
    delta,
    sortKey,
    chance,
  };
}

/**
 * Display order for Институт бизнеса specialties (overview list).
 * @type {string[]}
 */
export const SPEC_DISPLAY_ORDER = [
  'бизнес-администрирование',
  'управление информационными ресурсами',
  'маркетинг',
  'логистика',
];

/**
 * @param {string | null | undefined} name
 */
export function specOrderIndex(name) {
  const key = String(name || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim();
  const idx = SPEC_DISPLAY_ORDER.indexOf(key);
  return idx === -1 ? SPEC_DISPLAY_ORDER.length + 1 : idx;
}

/**
 * @param {object[]} specs
 * @param {number | null} score
 * @param {{ filter?: 'all' | 'safe' | 'risk' | 'below', query?: string }} [opts]
 */
export function prepareSpecs(specs, score, opts = {}) {
  const filter = opts.filter || 'all';
  const query = (opts.query || '').trim().toLowerCase();

  let rows = specs.map((s) => enrichSpec(s, score));

  if (query) {
    rows = rows.filter((s) => {
      const hay = `${s.specName || ''} ${s.groupName || ''} ${s.facultyName || ''}`.toLowerCase();
      return hay.includes(query);
    });
  }

  if (filter !== 'all') {
    rows = rows.filter((s) => s.status === filter);
  }

  rows.sort((a, b) => {
    const oa = specOrderIndex(a.specName);
    const ob = specOrderIndex(b.specName);
    if (oa !== ob) return oa - ob;
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return String(a.specName || '').localeCompare(String(b.specName || ''), 'ru');
  });

  return rows;
}
