import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { asciiBar, asciiChanceTrack, asciiHistogram, summarizeStatuses } from '../js/ui/ascii.js';
import { enrichSpec } from '../js/compute.js';

describe('ascii helpers', () => {
  it('builds proportional block bars', () => {
    assert.equal(asciiBar(0, 8), '░░░░░░░░');
    assert.equal(asciiBar(1, 8), '████████');
    assert.equal(asciiBar(0.5, 8), '████░░░░');
  });

  it('renders chance track with markers', () => {
    const row = enrichSpec(
      {
        ranges: ['400 - 390', '389 - 380', '379 и менее'],
        buckets: [5, 10, 20],
        plan: 10,
      },
      385,
    );
    const text = asciiChanceTrack(row);
    assert.match(text, /TRACK\s+\[.+\]/);
    assert.match(text, /▼/);
    assert.match(text, /\*/);
  });

  it('renders histogram lines with counts', () => {
    const row = enrichSpec(
      {
        ranges: ['320 - 316', '315 - 311'],
        buckets: [4, 2],
        plan: 5,
      },
      318,
    );
    const text = asciiHistogram(row, 318, 8);
    assert.match(text, /320 - 316\s+\|/);
    assert.match(text, /█|░/);
    assert.match(text, /\b4\b/);
  });

  it('summarizes statuses', () => {
    const c = summarizeStatuses([
      { status: 'safe' },
      { status: 'safe' },
      { status: 'risk' },
      { status: 'below' },
    ]);
    assert.deepEqual(c, { safe: 2, risk: 1, below: 1, neutral: 0 });
  });
});
