import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCountdown,
  resolvePollMs,
  nextDueAt,
  shouldRefreshNow,
} from '../js/refresh-schedule.js';

describe('refresh schedule', () => {
  it('formats countdown mm:ss', () => {
    assert.equal(formatCountdown(300), '5:00');
    assert.equal(formatCountdown(59), '0:59');
    assert.equal(formatCountdown(0), '0:00');
    assert.equal(formatCountdown(-3), '0:00');
  });

  it('defaults poll to 5 minutes and allows shorter ?pollMs= for tests', () => {
    const five = 5 * 60_000;
    assert.equal(resolvePollMs(five, ''), five);
    assert.equal(resolvePollMs(five, '?pollMs=3000'), 3000);
    assert.equal(resolvePollMs(five, '?pollMs=999'), 1000);
    assert.equal(resolvePollMs(five, '?pollMs=999999'), five);
  });

  it('arms next due exactly pollMs after a completed load', () => {
    assert.equal(nextDueAt(1_000_000, 300_000), 1_300_000);
  });

  it('refreshes only when due, idle, and visible', () => {
    assert.equal(shouldRefreshNow(100, 100, false, true), true);
    assert.equal(shouldRefreshNow(99, 100, false, true), false);
    assert.equal(shouldRefreshNow(100, 100, true, true), false);
    assert.equal(shouldRefreshNow(100, 100, false, false), false);
    assert.equal(shouldRefreshNow(100, 0, false, true), false);
  });
});
