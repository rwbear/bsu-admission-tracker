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

  it('counts only fully higher buckets', () => {
    assert.equal(peopleAbove(ranges, buckets, 385), 2);
    assert.equal(peopleAtOrAbove(ranges, buckets, 385), 2 + 5);
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

  it('builds chance track seat cut', () => {
    const track = buildChanceTrack(base, 375);
    assert.ok(track.seatCutRatio > 0 && track.seatCutRatio <= 1);
    assert.equal(track.plan, 10);
  });
});
