/**
 * Институт бизнеса БГУ — общий конкурс по группе специальностей.
 *
 * Official rule (Порядок приёма БГУ): one contest across BA / УИР / маркетинг /
 * логистика; specialty rows are the allocation targets, not independent pools.
 *
 * formk1 still publishes four specialty histograms. Counts partition the pool
 * (bucket sums == inCompetition sums) — element-wise sum is the group contest.
 * Never invent a unified row when ranges disagree or the faculty is not IB.
 */

import { DEFAULT_FACULTY_ID } from './faculties.js';

export const UNIFIED_CONTEST_NAME = 'Общий конкурс';
export const UNIFIED_CONTEST_SLUG = '__общий-конкурс__';

/**
 * @param {string | null | undefined} facultyId
 */
export function isUnifiedContestFaculty(facultyId) {
  return String(facultyId || '') === DEFAULT_FACULTY_ID;
}

/**
 * @param {object} spec
 */
export function isUnifiedContestSpec(spec) {
  return Boolean(spec && spec.unifiedContest === true);
}

/**
 * @param {object[]} members
 * @returns {boolean}
 */
export function rangesAlign(members) {
  if (!Array.isArray(members) || members.length < 2) return false;
  const base = members[0]?.ranges;
  if (!Array.isArray(base) || !base.length) return false;
  return members.every((m) => {
    const ranges = m?.ranges;
    const buckets = m?.buckets;
    if (!Array.isArray(ranges) || !Array.isArray(buckets)) return false;
    if (ranges.length !== base.length || buckets.length !== base.length) {
      return false;
    }
    return ranges.every((label, i) => String(label) === String(base[i]));
  });
}

/**
 * Per-member open seats — same formula as resolveSeatQuota (kept local to
 * avoid a compute ↔ unified circular import).
 * @param {object} spec
 */
function memberSeatQuota(spec) {
  const planOfficial = Number(spec.plan) || 0;
  const quotaParseOk = spec.quotaParseOk === true;
  if (!quotaParseOk) {
    return {
      planOfficial,
      planTargeted: null,
      planPaid: null,
      enrolledTargeted: null,
      admittedNoExam: null,
      admittedOutOfCompetition: null,
      quotaParseOk: false,
      taken: 0,
      openPlan: planOfficial,
    };
  }
  const planTargeted = Number(spec.planTargeted) || 0;
  const enrolledTargeted = Number(spec.enrolledTargeted) || 0;
  const admittedNoExam = Number(spec.admittedNoExam) || 0;
  const admittedOutOfCompetition = Number(spec.admittedOutOfCompetition) || 0;
  const planPaid =
    spec.planPaid == null || spec.planPaid === ''
      ? null
      : Number(spec.planPaid) || 0;
  const taken =
    Math.max(enrolledTargeted, planTargeted) +
    admittedNoExam +
    admittedOutOfCompetition;
  return {
    planOfficial,
    planTargeted,
    planPaid,
    enrolledTargeted,
    admittedNoExam,
    admittedOutOfCompetition,
    quotaParseOk: true,
    taken,
    openPlan: Math.max(0, planOfficial - taken),
  };
}

/**
 * @param {object[]} members IB specialty rows for one monitoring table
 * @returns {object | null}
 */
export function buildUnifiedContestSpec(members) {
  const list = (Array.isArray(members) ? members : []).filter(
    (m) => m && !isUnifiedContestSpec(m),
  );
  if (list.length < 2) return null;
  if (!isUnifiedContestFaculty(list[0].facultyId)) return null;
  if (!list.every((m) => isUnifiedContestFaculty(m.facultyId))) return null;
  if (!rangesAlign(list)) return null;

  const form = String(list[0].form ?? '');
  if (!list.every((m) => String(m.form ?? '') === form)) return null;

  const ranges = list[0].ranges.map(String);
  const buckets = ranges.map((_, i) =>
    list.reduce((sum, m) => sum + (Number(m.buckets[i]) || 0), 0),
  );

  const quotas = list.map(memberSeatQuota);
  const planOfficial = quotas.reduce((s, q) => s + q.planOfficial, 0);
  const taken = quotas.reduce((s, q) => s + q.taken, 0);
  const openPlan = quotas.reduce((s, q) => s + q.openPlan, 0);
  const quotaParseOk = quotas.every((q) => q.quotaParseOk);

  const sumNullable = (pick) => {
    if (!quotaParseOk) return null;
    return quotas.reduce((s, q) => s + (Number(pick(q)) || 0), 0);
  };

  const inCompetition = list.reduce(
    (s, m) => s + (Number(m.inCompetition) || 0),
    0,
  );
  const totalApps = list.reduce((s, m) => s + (Number(m.totalApps) || 0), 0);

  const uni = String(list[0].universityId || 'sb-bsu');
  const facultyId = DEFAULT_FACULTY_ID;
  const id = `${uni}:${form}:${facultyId}:${UNIFIED_CONTEST_SLUG}`;

  const updatedAt = list
    .map((m) => m.updatedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    id,
    universityId: uni,
    facultyId,
    facultyName: list[0].facultyName || 'Институт бизнеса БГУ',
    form,
    formName: list[0].formName || '',
    groupName: 'Общий конкурс по группе специальностей',
    specName: UNIFIED_CONTEST_NAME,
    plan: planOfficial,
    planTargeted: sumNullable((q) => q.planTargeted),
    planPaid: sumNullable((q) => q.planPaid),
    enrolledTargeted: sumNullable((q) => q.enrolledTargeted),
    admittedNoExam: sumNullable((q) => q.admittedNoExam),
    admittedOutOfCompetition: sumNullable((q) => q.admittedOutOfCompetition),
    quotaParseOk,
    taken,
    openPlan,
    totalApps,
    inCompetition,
    ranges,
    buckets,
    estimatedPassing: null,
    sourceUrl: list[0].sourceUrl || '',
    updatedAt: updatedAt || list[0].updatedAt || null,
    sectionTitle: list[0].sectionTitle || '',
    trackId: list[0].trackId,
    trackName: list[0].trackName,
    schedule: list[0].schedule,
    finance: list[0].finance,
    /** Synthetic group-contest row — not a formk1 specialty line. */
    unifiedContest: true,
    unifiedMemberIds: list.map((m) => m.id).filter(Boolean),
    unifiedMemberCount: list.length,
  };
}

/**
 * Prepend «Общий конкурс» when the list is IB specialties for one table.
 * Idempotent; no-op for other faculties or mismatched range grids.
 * @param {object[]} specs
 * @returns {object[]}
 */
export function injectUnifiedContest(specs) {
  const list = Array.isArray(specs) ? specs.filter(Boolean) : [];
  if (!list.length) return list;
  if (list.some(isUnifiedContestSpec)) return list;
  if (!list.every((s) => isUnifiedContestFaculty(s.facultyId))) return list;

  const unified = buildUnifiedContestSpec(list);
  if (!unified) return list;
  return [unified, ...list];
}
