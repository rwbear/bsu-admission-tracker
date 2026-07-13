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
    // Overlapping bucket: estimate fraction of applicants above mid-split is unclear;
    // count full bucket only when the entire interval is above score.
    // If score is inside the bucket, people still "above" within the same band
    // are unknown — treat as 0 from this band (conservative for the student).
  }
  return above;
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
 * Left = stronger scores. Seat cut at `plan`. Marker at user's score.
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
    let before = 0;
    for (const seg of segments) {
      if (seg.isMine) {
        myMarkerRatio = (before + seg.count / 2) / denom;
        break;
      }
      before += seg.count;
    }
    if (myMarkerRatio === null && above != null) {
      myMarkerRatio = Math.min(1, above / denom);
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
 * Enrich a specialty for the UI given a user score.
 * @param {object} spec
 * @param {number | null} score
 */
export function enrichSpec(spec, score) {
  const plan = Number(spec.plan) || 0;
  const ranges = spec.ranges || [];
  const buckets = spec.buckets || [];
  const estimatedPassing =
    spec.estimatedPassing ?? calcPassing(ranges, buckets, plan);
  const above = score != null ? peopleAbove(ranges, buckets, score) : null;
  const atOrAbove = score != null ? peopleAtOrAbove(ranges, buckets, score) : null;
  const status = getStatus(score, estimatedPassing);
  const apps = Number(spec.inCompetition ?? spec.totalApps) || 0;
  const pressure = contestRatio(apps, plan);
  const chance = buildChanceTrack(
    { ranges, buckets, plan, inCompetition: apps },
    score,
  );

  const delta = score != null && estimatedPassing != null
    ? score - estimatedPassing
    : null;

  // Lower sort key = better chance for the student
  let sortKey = 5000;
  if (score != null && above != null && plan > 0) {
    sortKey = above / plan;
  } else if (delta != null) {
    sortKey = -delta;
  }

  return {
    ...spec,
    estimatedPassing,
    peopleAbove: above,
    peopleAtOrAbove: atOrAbove,
    status,
    statusLabel: statusLabel(status),
    pressure,
    delta,
    sortKey,
    chance,
  };
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
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    return String(a.specName || '').localeCompare(String(b.specName || ''), 'ru');
  });

  return rows;
}
