import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  bucketLow,
  bucketHigh,
  calcPassing,
  peopleAbove,
  peopleAtOrAbove,
  getStatus,
  statusLabel,
  enrichSpec,
  prepareSpecs,
  buildChanceTrack,
  contestRatio,
  scoreInBucket,
} from '../js/compute.js';

describe('bucket parsing', () => {
  it('parses high-open and ranges', () => {
    assert.equal(bucketLow('391 и более'), 391);
    assert.equal(bucketHigh('391 и более'), Number.POSITIVE_INFINITY);
    assert.equal(bucketLow('390 - 386'), 386);
    assert.equal(bucketHigh('390 - 386'), 390);
    assert.equal(bucketLow('120.0 и менее'), 0);
    assert.equal(bucketHigh('120.0 и менее'), 120);
    assert.equal(scoreInBucket(388, '390 - 386'), true);
    assert.equal(scoreInBucket(400, '391 и более'), true);
  });
});

describe('calcPassing', () => {
  const ranges = ['400-391', '390-381', '380-371', '370-361'];
  const buckets = [2, 5, 8, 10];

  it('returns low of bucket where cumulative reaches plan', () => {
    // cum: 2, 7, 15 — plan 6 → second bucket → 381
    assert.equal(calcPassing(ranges, buckets, 6), 381);
  });

  it('returns null when plan is empty or unmet', () => {
    assert.equal(calcPassing(ranges, buckets, 0), null);
    assert.equal(calcPassing(ranges, buckets, 100), null);
  });
});

describe('peopleAbove / atOrAbove', () => {
  const ranges = ['400-391', '390-381', '380-371', '370-361'];
  const buckets = [2, 5, 8, 10];

  it('counts higher bands plus a uniform share of the own band', () => {
    // hi=390, lo=381, span=10, score=385 → (390-385)/10 * 5 = 2.5 → round 2+2.5 = 5
    assert.equal(peopleAbove(ranges, buckets, 385), 5);
    assert.equal(peopleAtOrAbove(ranges, buckets, 385), 2 + 5);
  });

  it('adds no own-band share at the top of a closed band', () => {
    assert.equal(peopleAbove(ranges, buckets, 390), 2);
  });

  it('returns null without score', () => {
    assert.equal(peopleAbove(ranges, buckets, null), null);
  });
});

describe('status', () => {
  it('maps delta bands', () => {
    assert.equal(getStatus(320, 300), 'safe');
    assert.equal(getStatus(305, 300), 'risk');
    assert.equal(getStatus(290, 300), 'below');
    assert.equal(getStatus(null, 300), 'neutral');
    assert.equal(statusLabel('safe'), 'В зоне');
  });
});

describe('enrich + prepare', () => {
  const base = {
    id: 'demo-1',
    specName: 'Биология',
    groupName: '',
    plan: 10,
    totalApps: 20,
    inCompetition: 18,
    ranges: ['400-391', '390-381', '380-371', '370-361', '360-351'],
    buckets: [1, 3, 6, 5, 3],
  };

  it('enriches with track and status', () => {
    const row = enrichSpec(base, 375);
    assert.equal(row.estimatedPassing, 371);
    assert.equal(row.status, 'risk');
    assert.ok(row.chance.segments.length === 5);
    assert.equal(contestRatio(18, 10), 1.8);
  });

  it('filters and sorts by chance', () => {
    const harder = {
      ...base,
      id: 'demo-2',
      specName: 'Биоинженерия',
      plan: 5,
      buckets: [4, 8, 6, 2, 1],
    };
    const rows = prepareSpecs([base, harder], 375, { filter: 'all' });
    assert.equal(rows.length, 2);
    assert.ok(rows[0].sortKey <= rows[1].sortKey);

    const safeOnly = prepareSpecs([base, harder], 400, { filter: 'safe' });
    assert.ok(safeOnly.every((r) => r.status === 'safe'));

    const q = prepareSpecs([base, harder], 375, { query: 'инжен' });
    assert.equal(q.length, 1);
    assert.equal(q[0].specName, 'Биоинженерия');
  });

  it('orders Institute of Business specialties as requested', () => {
    const mk = (name) => ({
      ...base,
      id: name,
      specName: name,
    });
    const rows = prepareSpecs(
      [
        mk('логистика'),
        mk('маркетинг'),
        mk('бизнес-администрирование'),
        mk('управление информационными ресурсами'),
      ],
      null,
    );
    assert.deepEqual(
      rows.map((r) => r.specName),
      [
        'бизнес-администрирование',
        'управление информационными ресурсами',
        'маркетинг',
        'логистика',
      ],
    );
  });

  it('builds chance track seat cut', () => {
    const track = buildChanceTrack(base, 375);
    assert.ok(track.seatCutRatio > 0 && track.seatCutRatio <= 1);
    assert.equal(track.plan, 10);
  });

  it('pins «ты» left of seat cut when estimated peopleAbove < plan', () => {
    // Top of own band → almost no within-band competition above you.
    const ranges = ['420-500', '400-419', '380-399', '300-379'];
    const buckets = [3, 3, 15, 8];
    const plan = 10;
    const score = 399;
    const track = buildChanceTrack({ ranges, buckets, plan }, score);
    assert.equal(track.peopleAbove, 6);
    assert.ok(track.peopleAbove < plan);
    assert.ok(
      track.myMarkerRatio < track.seatCutRatio,
      `expected pin ${track.myMarkerRatio} left of cut ${track.seatCutRatio}`,
    );
  });

  it('MO-style bottom-of-cut-band: metric, pin and «на грани» agree you’re past seats', () => {
    // Real FMO shape: 6 above at 396+, 10 in 395–391, plan 10, score=passing=391.
    // Strict higher-bands only said 6/10 (inside); uniform own-band says past the cut.
    const ranges = ['396 и более', '395 - 391', '390 - 386', '385 - 381'];
    const buckets = [6, 10, 3, 3];
    const plan = 10;
    const score = 391;
    assert.equal(calcPassing(ranges, buckets, plan), 391);
    const track = buildChanceTrack({ ranges, buckets, plan }, score);
    assert.equal(track.peopleAbove, 14);
    assert.ok(track.peopleAbove >= plan);
    assert.ok(
      track.myMarkerRatio > track.seatCutRatio,
      `expected pin ${track.myMarkerRatio} right of cut ${track.seatCutRatio}`,
    );
    const row = enrichSpec(
      {
        id: 'mo',
        specName: 'международные отношения',
        plan,
        ranges,
        buckets,
        inCompetition: 29,
      },
      score,
    );
    assert.equal(row.status, 'risk');
    assert.equal(row.delta, 0);
    assert.equal(row.peopleAbove, 14);
    assert.ok(row.chance.myMarkerRatio > row.chance.seatCutRatio);
  });

  it('keeps «ты» right of seat cut when peopleAbove ≥ plan', () => {
    const ranges = ['420-500', '400-419', '380-399', '300-379'];
    const buckets = [6, 6, 5, 8];
    const plan = 10;
    const score = 385;
    const track = buildChanceTrack({ ranges, buckets, plan }, score);
    assert.ok(track.peopleAbove >= plan);
    assert.ok(track.myMarkerRatio > track.seatCutRatio);
  });

  it('openPlan: биоинженерия-style quotas flip soft underfill into real contest', () => {
    const ranges = ['400-391', '390-381', '380-371', '370-361', '360-351'];
    const buckets = [4, 8, 10, 6, 3]; // 31
    const spec = {
      id: 'bioeng',
      specName: 'биоинженерия',
      plan: 32,
      planTargeted: 0,
      enrolledTargeted: 0,
      admittedNoExam: 8,
      admittedOutOfCompetition: 0,
      quotaParseOk: true,
      inCompetition: 31,
      ranges,
      buckets,
    };
    // Without openPlan, competition 31 < plan 32 → soft «В зоне» for any score.
    const naive = enrichSpec({ ...spec, quotaParseOk: false }, 355);
    assert.equal(naive.status, 'safe');

    const row = enrichSpec(spec, 355);
    assert.equal(row.planOfficial, 32);
    assert.equal(row.openPlan, 24);
    assert.equal(row.plan, 24);
    assert.equal(row.taken, 8);
    assert.equal(row.showQuota, true);
    assert.ok(row.estimatedPassing != null);
    assert.equal(row.status, 'below');
    assert.equal(row.chance.plan, 24);
  });

  it('hides quota story when taken is zero', () => {
    const row = enrichSpec(
      {
        ...base,
        planTargeted: 0,
        enrolledTargeted: 0,
        admittedNoExam: 0,
        admittedOutOfCompetition: 0,
        quotaParseOk: true,
      },
      375,
    );
    assert.equal(row.showQuota, false);
    assert.equal(row.showFacts, true);
    assert.equal(row.openPlan, 10);
    assert.equal(row.plan, 10);
  });

  it('конфликтология: 10 plan / 8 БВИ → openPlan 2 and facts on', () => {
    const row = enrichSpec(
      {
        id: 'conflict',
        specName: 'международная конфликтология',
        plan: 10,
        planTargeted: 0,
        planPaid: 10,
        enrolledTargeted: 0,
        admittedNoExam: 8,
        admittedOutOfCompetition: 0,
        quotaParseOk: true,
        inCompetition: 4,
        totalApps: 12,
        ranges: ['396 и более', '395 - 391', '390 - 386', '385 - 381', '380 - 376', '375 - 371'],
        buckets: [0, 0, 1, 1, 1, 1],
      },
      380,
    );
    assert.equal(row.showFacts, true);
    assert.equal(row.showQuota, true);
    assert.equal(row.planOfficial, 10);
    assert.equal(row.openPlan, 2);
    assert.equal(row.plan, 2);
    assert.equal(row.taken, 8);
    assert.equal(row.admittedNoExam, 8);
    assert.ok(row.estimatedPassing != null);
    assert.notEqual(row.status, 'safe');
  });
});
