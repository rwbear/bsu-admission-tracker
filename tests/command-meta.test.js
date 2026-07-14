import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  metaRotatorPhase,
  META_AGE_MS,
  META_COUNTDOWN_MS,
  META_CYCLE_MS,
  META_FADE_MS,
  metaFadeMs,
} from '../js/command-meta.js';

describe('command meta rotator', () => {
  it('shows age first, then countdown for longer', () => {
    assert.equal(metaRotatorPhase(0), 'age');
    assert.equal(metaRotatorPhase(META_AGE_MS - 1), 'age');
    assert.equal(metaRotatorPhase(META_AGE_MS), 'countdown');
    assert.equal(metaRotatorPhase(META_AGE_MS + META_COUNTDOWN_MS - 1), 'countdown');
    assert.equal(metaRotatorPhase(META_CYCLE_MS), 'age');
  });

  it('keeps countdown visible longer than age', () => {
    assert.ok(META_COUNTDOWN_MS > META_AGE_MS);
  });

  it('stays on age when there is no countdown', () => {
    assert.equal(metaRotatorPhase(10_000, { hasCountdown: false }), 'age');
  });

  it('forces countdown line while refreshing', () => {
    assert.equal(metaRotatorPhase(100, { refreshing: true }), 'countdown');
  });

  it('uses a deliberate fade, skipped under reduced motion', () => {
    assert.ok(META_FADE_MS >= 600);
    assert.equal(metaFadeMs(false), META_FADE_MS);
    assert.equal(metaFadeMs(true), 0);
  });
});
