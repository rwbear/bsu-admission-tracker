import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  UNIFIED_CONTEST_NAME,
  UNIFIED_CONTEST_SLUG,
  isUnifiedContestFaculty,
  isUnifiedContestSpec,
  rangesAlign,
  buildUnifiedContestSpec,
  injectUnifiedContest,
} from '../js/unified-contest.js';
import {
  enrichSpec,
  prepareSpecs,
  calcPassing,
  buildChanceTrack,
  resolveSeatQuota,
} from '../js/compute.js';
import { DEFAULT_FACULTY_ID } from '../js/faculties.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = JSON.parse(
  readFileSync(join(root, 'data/sb-bsu.json'), 'utf8'),
);

function ibMembers(form = '7') {
  return (snapshot.specialties || []).filter(
    (s) =>
      s.facultyId === DEFAULT_FACULTY_ID && String(s.form) === String(form),
  );
}

describe('unified contest — Institute of Business', () => {
  it('recognizes only the IB faculty id', () => {
    assert.equal(isUnifiedContestFaculty(DEFAULT_FACULTY_ID), true);
    assert.equal(isUnifiedContestFaculty('мехмат-пми-си'), false);
    assert.equal(isUnifiedContestFaculty(''), false);
  });

  it('aligns published IB range grids and partitions the applicant pool', () => {
    const members = ibMembers();
    assert.ok(members.length >= 4, 'expected ≥4 IB specialties on form 7');
    assert.equal(rangesAlign(members), true);

    const bucketTotal = members[0].ranges.map((_, i) =>
      members.reduce((s, m) => s + (Number(m.buckets[i]) || 0), 0),
    );
    const sumBuckets = bucketTotal.reduce((a, b) => a + b, 0);
    const sumIc = members.reduce((s, m) => s + (Number(m.inCompetition) || 0), 0);
    assert.equal(sumBuckets, sumIc, 'bucket sum must equal inCompetition sum');
  });

  it('builds a synthetic Общий конкурс with summed seats and buckets', () => {
    const members = ibMembers();
    const unified = buildUnifiedContestSpec(members);
    assert.ok(unified);
    assert.equal(unified.specName, UNIFIED_CONTEST_NAME);
    assert.equal(unified.unifiedContest, true);
    assert.ok(String(unified.id).includes(UNIFIED_CONTEST_SLUG));
    assert.equal(unified.unifiedMemberCount, members.length);

    const sumPlan = members.reduce((s, m) => s + (Number(m.plan) || 0), 0);
    const sumOpen = members.reduce((s, m) => {
      const q = resolveSeatQuota(m);
      return s + q.openPlan;
    }, 0);
    const sumTaken = members.reduce((s, m) => {
      const q = resolveSeatQuota(m);
      return s + q.taken;
    }, 0);
    const sumIc = members.reduce((s, m) => s + (Number(m.inCompetition) || 0), 0);

    assert.equal(unified.plan, sumPlan);
    assert.equal(unified.openPlan, sumOpen);
    assert.equal(unified.taken, sumTaken);
    assert.equal(unified.inCompetition, sumIc);
    assert.equal(
      unified.buckets.reduce((a, b) => a + b, 0),
      sumIc,
    );
  });

  it('refuses to build when ranges disagree', () => {
    const members = ibMembers().map((m, i) =>
      i === 0
        ? m
        : {
            ...m,
            ranges: [...m.ranges.slice(0, -1), 'broken-label'],
          },
    );
    assert.equal(buildUnifiedContestSpec(members), null);
  });

  it('injects only for IB lists and is idempotent', () => {
    const members = ibMembers();
    const once = injectUnifiedContest(members);
    assert.equal(once.length, members.length + 1);
    assert.equal(once[0].specName, UNIFIED_CONTEST_NAME);
    assert.equal(isUnifiedContestSpec(once[0]), true);

    const twice = injectUnifiedContest(once);
    assert.equal(twice.length, once.length);
    assert.equal(twice.filter(isUnifiedContestSpec).length, 1);

    const other = injectUnifiedContest([
      { ...members[0], facultyId: 'физфак-рфкт-си', facultyName: 'Физфак' },
      { ...members[1], facultyId: 'физфак-рфкт-си', facultyName: 'Физфак' },
    ]);
    assert.equal(other.length, 2);
    assert.equal(other.some(isUnifiedContestSpec), false);
  });

  it('prepareSpecs pins Общий конкурс first, then IB display order', () => {
    const members = ibMembers();
    const rows = prepareSpecs(members, 320);
    assert.equal(rows[0].specName, UNIFIED_CONTEST_NAME);
    assert.equal(isUnifiedContestSpec(rows[0]), true);
    assert.deepEqual(
      rows.slice(1).map((r) => r.specName),
      [
        'бизнес-администрирование',
        'управление информационными ресурсами',
        'маркетинг',
        'логистика',
      ],
    );
  });

  it('does not inject when specialty names match IB but facultyId is missing', () => {
    const rows = prepareSpecs(
      [
        {
          id: 'a',
          specName: 'логистика',
          plan: 10,
          ranges: ['400-391', '390-381'],
          buckets: [1, 2],
          quotaParseOk: false,
        },
        {
          id: 'b',
          specName: 'маркетинг',
          plan: 10,
          ranges: ['400-391', '390-381'],
          buckets: [1, 2],
          quotaParseOk: false,
        },
      ],
      null,
    );
    assert.equal(rows.some(isUnifiedContestSpec), false);
  });

  it('enrich + charts stay coherent on the unified row', () => {
    const members = ibMembers();
    const unified = buildUnifiedContestSpec(members);
    const enriched = enrichSpec(unified, 320);
    assert.equal(enriched.plan, unified.openPlan);
    assert.equal(enriched.openPlan, unified.openPlan);
    assert.equal(enriched.bucketSum, unified.inCompetition);
    assert.equal(
      enriched.estimatedPassing,
      calcPassing(unified.ranges, unified.buckets, unified.openPlan),
    );

    const track = buildChanceTrack(
      {
        ranges: enriched.ranges,
        buckets: enriched.buckets,
        plan: enriched.plan,
        inCompetition: enriched.competition,
      },
      320,
    );
    assert.ok(track.seatCutRatio > 0 && track.seatCutRatio <= 1);
    assert.equal(track.plan, enriched.plan);
    assert.ok(Number.isFinite(track.peopleAbove));
    assert.ok(
      track.segments?.length > 0 || track.seatCutRatio != null,
      'chance track must produce usable geometry',
    );
  });

  it('keeps specialty-row math unchanged beside the unified row', () => {
    const members = ibMembers();
    const alone = enrichSpec(members[0], 300);
    const withUnified = prepareSpecs(members, 300);
    const same = withUnified.find((r) => r.id === members[0].id);
    assert.ok(same);
    assert.equal(same.plan, alone.plan);
    assert.equal(same.peopleAbove, alone.peopleAbove);
    assert.equal(same.estimatedPassing, alone.estimatedPassing);
    assert.equal(same.bucketSum, alone.bucketSum);
  });
});
