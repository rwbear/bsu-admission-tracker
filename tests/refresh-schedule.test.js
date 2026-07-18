import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCountdown,
  resolvePollMs,
  resolveEffectivePollMs,
  isSnapshotStale,
  nextDueAt,
  shouldRefreshNow,
  STALE_AFTER_MS,
  STALE_POLL_MS,
} from '../js/refresh-schedule.js';

describe('refresh schedule', () => {
  it('formats countdown mm:ss', () => {
    assert.equal(formatCountdown(600), '10:00');
    assert.equal(formatCountdown(59), '0:59');
    assert.equal(formatCountdown(0), '0:00');
    assert.equal(formatCountdown(-3), '0:00');
  });

  it('defaults poll to 3 minutes and allows shorter ?pollMs= for tests', () => {
    const three = 3 * 60_000;
    assert.equal(resolvePollMs(three, ''), three);
    assert.equal(resolvePollMs(three, '?pollMs=3000'), 3000);
    assert.equal(resolvePollMs(three, '?pollMs=999'), 1000);
    assert.equal(resolvePollMs(three, '?pollMs=999999'), three);
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

  it('chases Pages every 30s when the snapshot is stale', () => {
    const three = 3 * 60_000;
    const now = Date.parse('2026-07-14T13:30:00.000Z');
    const fresh = '2026-07-14T13:28:00.000Z';
    const stale = '2026-07-14T13:20:00.000Z';
    assert.equal(resolveEffectivePollMs(three, fresh, now), three);
    assert.equal(resolveEffectivePollMs(three, stale, now), STALE_POLL_MS);
    assert.equal(resolveEffectivePollMs(three, null, now), STALE_POLL_MS);
    assert.equal(isSnapshotStale(stale, now), true);
    assert.equal(isSnapshotStale(fresh, now), false);
    assert.ok(STALE_AFTER_MS > three);
    assert.ok(STALE_POLL_MS < STALE_AFTER_MS);
  });
});
