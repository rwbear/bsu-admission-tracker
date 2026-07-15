import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeStatuses,
  resolveHistCutIndex,
  histOutZoneLeftPct,
  resolveHistDisplayWindow,
  histCubeLevels,
  histCubeFilled,
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

  it('places the out-zone at the right edge of the seat-cut bucket', () => {
    assert.equal(resolveHistCutIndex([5, 10, 20, 8], 12), 1);
    assert.equal(histOutZoneLeftPct(1, 4), 50);
    assert.equal(histOutZoneLeftPct(-1, 4), null);
    assert.equal(histOutZoneLeftPct(3, 4), null);
    assert.equal(resolveHistCutIndex([5, 10], 0), -1);
  });

  it('crops empty high+low bands; low edge = lowest apps − 60', () => {
    const ranges = [
      '396 и более',
      '350 - 346',
      '300 - 296',
      '235 - 231',
      '200 - 196',
      '175 - 171',
      '150 - 146',
      '125 - 121',
      '120.0 и менее',
    ];
    const buckets = [0, 0, 2, 1, 0, 0, 0, 0, 0];
    // Populated floor at 231 → target 171. Keep empty pads down to hi>=171.
    const win = resolveHistDisplayWindow(ranges, buckets, { padDown: 60 });
    assert.equal(win.appsFloor, 231);
    assert.equal(win.targetFloor, 171);
    assert.ok(win.start <= 2); // includes first populated (+ optional high pad)
    assert.equal(ranges[win.start + (2 - win.start)], '300 - 296');
    // 175-171 has hi 175 >= 171 → included; 150-146 hi 150 < 171 → stop
    assert.equal(ranges[win.end - 1], '175 - 171');
    assert.equal(win.clippedLow, true);
    assert.ok(!ranges.slice(win.start, win.end).includes('120.0 и менее'));
  });

  it('keeps seat-cut / score buckets inside the window', () => {
    const ranges = ['300 - 296', '250 - 246', '200 - 196', '120.0 и менее'];
    const buckets = [0, 5, 0, 0];
    const win = resolveHistDisplayWindow(ranges, buckets, {
      padDown: 60,
      mustInclude: [0], // force high pad / empty high band if cut/score there
    });
    assert.ok(win.start <= 0);
    assert.ok(win.end > 1);
  });

  it('keeps cube rows dense for small peaks and caps tall ones', () => {
    assert.equal(histCubeLevels(0), 16);
    assert.equal(histCubeLevels(3), 16);
    assert.equal(histCubeLevels(16), 16);
    assert.equal(histCubeLevels(20), 20);
    assert.equal(histCubeLevels(40), 28);
  });

  it('maps bucket counts onto cube fills from the bottom', () => {
    assert.equal(histCubeFilled(0, 3, 16), 0);
    assert.equal(histCubeFilled(3, 3, 16), 16);
    assert.equal(histCubeFilled(1, 3, 16), 5);
    assert.equal(histCubeFilled(10, 10, 10), 10);
    assert.equal(histCubeFilled(20, 40, 28), 14);
  });
});
