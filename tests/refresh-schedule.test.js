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
    // Sub-second remainders floor down — never rounds up to next minute.
    assert.equal(formatCountdown(59.9), '0:59');
    assert.equal(formatCountdown(60.999), '1:00');
    // Long ranges keep mm:ss (no h:mm collapse) — countdown never exceeds pollMs.
    assert.equal(formatCountdown(3600), '60:00');
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
    // 15 minutes old — past the 12-minute stale window
    const stale = '2026-07-14T13:15:00.000Z';
    assert.equal(resolveEffectivePollMs(three, fresh, now), three);
    assert.equal(resolveEffectivePollMs(three, stale, now), STALE_POLL_MS);
    assert.equal(resolveEffectivePollMs(three, null, now), STALE_POLL_MS);
    assert.equal(isSnapshotStale(stale, now), true);
    assert.equal(isSnapshotStale(fresh, now), false);
    assert.ok(STALE_AFTER_MS > three);
    assert.ok(STALE_POLL_MS < STALE_AFTER_MS);
    assert.equal(STALE_AFTER_MS, 12 * 60_000);
  });

  it('resolveEffectivePollMs guards malformed updatedAt (chase, not idle)', () => {
    const three = 3 * 60_000;
    const now = Date.parse('2026-07-14T13:30:00.000Z');
    assert.equal(resolveEffectivePollMs(three, 'garbage', now), STALE_POLL_MS);
    assert.equal(resolveEffectivePollMs(three, '', now), STALE_POLL_MS);
    assert.equal(resolveEffectivePollMs(three, undefined, now), STALE_POLL_MS);
  });

  it('resolveEffectivePollMs never exceeds defaultMs (test-mode ?pollMs=1s)', () => {
    // In local test mode with a very short defaultMs, chase must not slow
    // the poll down to 30s — the developer's override wins.
    const short = 1_000;
    const now = Date.parse('2026-07-14T13:30:00.000Z');
    const stale = '2026-07-14T13:15:00.000Z';
    assert.equal(resolveEffectivePollMs(short, stale, now), short);
    assert.equal(resolveEffectivePollMs(short, null, now), short);
    assert.equal(resolveEffectivePollMs(short, 'garbage', now), short);
  });

  it('shouldRefreshNow guards all four inhibitors independently', () => {
    // Even at the boundary, nextRefreshAt=0 (unarmed) prevents fetch.
    assert.equal(shouldRefreshNow(999_999_999, 0, false, true), false);
    // Hidden tab never fetches even when overdue.
    assert.equal(shouldRefreshNow(999_999_999, 1000, false, false), false);
    // In-flight refresh is never re-triggered.
    assert.equal(shouldRefreshNow(999_999_999, 1000, true, true), false);
  });
});
