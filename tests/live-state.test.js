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

  it('boundary: one ms younger than STALE_AFTER_MS → idle', () => {
    const justFresh = new Date(now - STALE_AFTER_MS + 1).toISOString();
    assert.equal(isSnapshotStale(justFresh, now), false);
    assert.equal(
      resolveLiveState({ refreshing: false, updatedAt: justFresh, now }),
      'idle',
    );
  });

  it('malformed updatedAt → chase (never lies "idle")', () => {
    assert.equal(isSnapshotStale('not-a-date', now), true);
    assert.equal(
      resolveLiveState({ refreshing: false, updatedAt: 'not-a-date', now }),
      'chase',
    );
    assert.equal(
      resolveLiveState({ refreshing: false, updatedAt: '', now }),
      'chase',
    );
  });

  it('future updatedAt → idle (clock skew tolerated, not stale)', () => {
    const future = new Date(now + 60_000).toISOString();
    assert.equal(isSnapshotStale(future, now), false);
    assert.equal(
      resolveLiveState({ refreshing: false, updatedAt: future, now }),
      'idle',
    );
  });

  it('fetching wins even with malformed updatedAt', () => {
    assert.equal(
      resolveLiveState({ refreshing: true, updatedAt: 'garbage', now }),
      'fetching',
    );
  });

  it('respects a caller-supplied staleAfterMs override', () => {
    const oneMinuteOld = new Date(now - 60_000).toISOString();
    assert.equal(
      resolveLiveState({
        refreshing: false,
        updatedAt: oneMinuteOld,
        now,
        staleAfterMs: 30_000,
      }),
      'chase',
    );
    assert.equal(
      resolveLiveState({
        refreshing: false,
        updatedAt: oneMinuteOld,
        now,
        staleAfterMs: 120_000,
      }),
      'idle',
    );
  });
});
