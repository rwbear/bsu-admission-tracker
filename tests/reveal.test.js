import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  REVEAL_TIMING,
  REVEAL_OPACITY,
  revealDurationMs,
  sortRevealSteps,
} from '../js/ui/reveal.js';

describe('reveal foundation', () => {
  it('keeps a readable cascade budget', () => {
    assert.ok(REVEAL_TIMING.durationMs >= 260 && REVEAL_TIMING.durationMs <= 400);
    assert.ok(REVEAL_TIMING.staggerMs >= 32 && REVEAL_TIMING.staggerMs <= 72);
    assert.ok(REVEAL_TIMING.fromY >= 0 && REVEAL_TIMING.fromY <= 10);
    const ten = revealDurationMs(10);
    assert.ok(ten > REVEAL_TIMING.durationMs);
    assert.equal(
      ten,
      REVEAL_TIMING.durationMs + REVEAL_TIMING.staggerMs * 9,
    );
    assert.equal(revealDurationMs(0), 0);
  });

  it('uses a non-linear opacity path', () => {
    assert.ok(REVEAL_OPACITY.length >= 3);
    assert.equal(REVEAL_OPACITY[0].opacity, 0);
    assert.equal(REVEAL_OPACITY[REVEAL_OPACITY.length - 1].opacity, 1);
    const early = REVEAL_OPACITY.find((k) => k.offset > 0 && k.offset <= 0.35);
    assert.ok(early);
    assert.ok(early.opacity < early.offset + 0.05);
  });

  it('sorts steps by data-reveal-step before document order', () => {
    const FOLLOWING = 4;
    const PRECEDING = 2;
    const make = (order, docIndex) => ({
      __doc: docIndex,
      getAttribute: (k) => (k === 'data-reveal-step' ? String(order) : null),
      compareDocumentPosition(other) {
        if (this.__doc < other.__doc) return FOLLOWING;
        if (this.__doc > other.__doc) return PRECEDING;
        return 0;
      },
    });
    const a = make(2, 0);
    const b = make(1, 1);
    const sorted = sortRevealSteps([a, b]);
    assert.equal(sorted[0], b);
    assert.equal(sorted[1], a);
  });
});
