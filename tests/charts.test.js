import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeStatuses,
  resolveHistCutIndex,
  isHistOutBucket,
} from '../js/ui/charts.js';
import { enrichSpec } from '../js/compute.js';

describe('chart helpers', () => {
  it('summarizes statuses', () => {
    const c = summarizeStatuses([
      { status: 'safe' },
      { status: 'safe' },
      { status: 'risk' },
      { status: 'below' },
    ]);
    assert.deepEqual(c, { safe: 2, risk: 1, below: 1, neutral: 0 });
  });

  it('builds chance data for visual track', () => {
    const row = enrichSpec(
      {
        ranges: ['400 - 390', '389 - 380', '379 и менее'],
        buckets: [5, 10, 20],
        plan: 10,
      },
      385,
    );
    assert.ok(row.chance);
    assert.ok(row.chance.segments.length >= 1);
    assert.equal(typeof row.chance.seatCutRatio, 'number');
  });

  it('marks buckets after the seat cut as out (hatched zone)', () => {
    // High → low: 5+10 cover plan 12 inside bucket 1; bucket 2+ are out.
    assert.equal(resolveHistCutIndex([5, 10, 20, 8], 12), 1);
    assert.equal(isHistOutBucket(0, 1), false);
    assert.equal(isHistOutBucket(1, 1), false);
    assert.equal(isHistOutBucket(2, 1), true);
    assert.equal(isHistOutBucket(3, 1), true);
    assert.equal(resolveHistCutIndex([5, 10], 0), -1);
    assert.equal(resolveHistCutIndex([5, 10], 100), -1);
    assert.equal(isHistOutBucket(2, -1), false);
  });
});
