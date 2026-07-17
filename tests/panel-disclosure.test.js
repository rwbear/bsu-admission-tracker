import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DISCLOSURE_TIMING } from '../js/ui/panel-disclosure.js';

describe('panel disclosure', () => {
  it('uses reveal/chance easing family and readable budgets', () => {
    assert.equal(DISCLOSURE_TIMING.openMs, 320);
    assert.equal(DISCLOSURE_TIMING.closeMs, 260);
    assert.equal(DISCLOSURE_TIMING.staggerMs, 48);
    assert.equal(DISCLOSURE_TIMING.bodyFromY, 6);
    assert.match(DISCLOSURE_TIMING.easeOpen, /0\.16,\s*1,\s*0\.3,\s*1/);
    assert.match(DISCLOSURE_TIMING.easeClose, /0\.55,\s*0,\s*1,\s*1/);
  });

  it('keeps close snappier than open; second child settles with shell', () => {
    assert.ok(DISCLOSURE_TIMING.closeMs < DISCLOSURE_TIMING.openMs);
    const secondChildEnd =
      DISCLOSURE_TIMING.openDelayMs +
      DISCLOSURE_TIMING.staggerMs +
      DISCLOSURE_TIMING.childMs;
    assert.ok(
      secondChildEnd <= DISCLOSURE_TIMING.openMs + 80,
      'two-row audit body should finish near the height open',
    );
  });
});
