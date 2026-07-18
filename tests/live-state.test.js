import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveLiveState,
  isSnapshotStale,
  STALE_AFTER_MS,
} from '../js/refresh-schedule.js';

describe('resolveLiveState', () => {
  const now = Date.parse('2026-07-18T16:00:00.000Z');
  const fresh = '2026-07-18T15:58:00.000Z';
  const stale = '2026-07-18T15:50:00.000Z';

  it('fetching wins over stale and idle', () => {
    assert.equal(
      resolveLiveState({ refreshing: true, updatedAt: stale, now }),
      'fetching',
    );
    assert.equal(
      resolveLiveState({ refreshing: true, updatedAt: fresh, now }),
      'fetching',
    );
    assert.equal(
      resolveLiveState({ refreshing: true, updatedAt: null, now }),
      'fetching',
    );
  });

  it('chase when no updatedAt', () => {
    assert.equal(
      resolveLiveState({ refreshing: false, updatedAt: null, now }),
      'chase',
    );
    assert.equal(
      resolveLiveState({ refreshing: false, updatedAt: undefined, now }),
      'chase',
    );
  });

  it('chase when snapshot older than STALE_AFTER_MS', () => {
    assert.equal(
      resolveLiveState({ refreshing: false, updatedAt: stale, now }),
      'chase',
    );
    assert.equal(isSnapshotStale(stale, now), true);
  });

  it('idle when fresh and not refreshing', () => {
    assert.equal(
      resolveLiveState({ refreshing: false, updatedAt: fresh, now }),
      'idle',
    );
  });

  it('boundary: exactly STALE_AFTER_MS old → chase', () => {
    const edge = new Date(now - STALE_AFTER_MS).toISOString();
    assert.equal(isSnapshotStale(edge, now), true);
    assert.equal(
      resolveLiveState({ refreshing: false, updatedAt: edge, now }),
      'chase',
    );
  });
});
