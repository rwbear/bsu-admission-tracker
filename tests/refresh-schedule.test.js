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
    assert.equal(formatCountdown(600), '10:00');
    assert.equal(formatCountdown(59), '0:59');
    assert.equal(formatCountdown(0), '0:00');
    assert.equal(formatCountdown(-3), '0:00');
  });

  it('defaults poll to 10 minutes and allows shorter ?pollMs= for tests', () => {
    const ten = 10 * 60_000;
    assert.equal(resolvePollMs(ten, ''), ten);
    assert.equal(resolvePollMs(ten, '?pollMs=3000'), 3000);
    assert.equal(resolvePollMs(ten, '?pollMs=999'), 1000);
    assert.equal(resolvePollMs(ten, '?pollMs=999999'), ten);
  });

  it('arms next due exactly pollMs after a completed load', () => {
    assert.equal(nextDueAt(1_000_000, 600_000), 1_600_000);
  });

  it('refreshes only when due, idle, and visible', () => {
    assert.equal(shouldRefreshNow(100, 100, false, true), true);
    assert.equal(shouldRefreshNow(99, 100, false, true), false);
    assert.equal(shouldRefreshNow(100, 100, true, true), false);
    assert.equal(shouldRefreshNow(100, 100, false, false), false);
    assert.equal(shouldRefreshNow(100, 0, false, true), false);
  });
});
