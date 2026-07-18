import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OVERLAY_LEAVE_MS,
  acquireOverlayScrollLock,
  releaseOverlayScrollLock,
  isOverlayScrollLocked,
  commitOverlayEnter,
  scrollOverlayOptionIntoView,
} from '../js/ui/overlay-scroll-lock.js';

describe('overlay scroll lock', () => {
  it('keeps leave budget past backdrop opacity fade', () => {
    assert.ok(OVERLAY_LEAVE_MS >= 240);
  });

  it('locks body once for nested holders and unlocks on last release', () => {
    // jsdom-less: exercise the Set / depth logic via side-effect-free checks.
    // DOM style writes are no-ops without document.body in node — still validate API.
    assert.equal(typeof acquireOverlayScrollLock, 'function');
    assert.equal(typeof releaseOverlayScrollLock, 'function');
    assert.equal(isOverlayScrollLocked(), false);

    if (typeof document === 'undefined' || !document.body) {
      return;
    }

    acquireOverlayScrollLock('faculty');
    assert.equal(isOverlayScrollLocked(), true);
    acquireOverlayScrollLock('method');
    assert.equal(isOverlayScrollLocked(), true);
    releaseOverlayScrollLock('faculty');
    assert.equal(isOverlayScrollLocked(), true);
    releaseOverlayScrollLock('method');
    assert.equal(isOverlayScrollLocked(), false);
  });
});

describe('commitOverlayEnter', () => {
  it('opens synchronously after a style flush (no rAF delay)', () => {
    assert.equal(typeof commitOverlayEnter, 'function');

    let called = 0;
    commitOverlayEnter(null, () => {
      called += 1;
    });
    assert.equal(called, 0);

    // Duck-typed shell: flush reads offsetWidth, then open runs in-turn.
    const shell = { offsetWidth: 320, classList: { add() {} } };
    commitOverlayEnter(shell, () => {
      called += 1;
    });
    assert.equal(called, 1);
  });
});

describe('scrollOverlayOptionIntoView', () => {
  it('scrolls the list port via scrollTop, not scrollIntoView', () => {
    assert.equal(typeof scrollOverlayOptionIntoView, 'function');

    scrollOverlayOptionIntoView(null, null);

    const active = {
      offsetTop: 200,
      offsetHeight: 40,
    };
    const list = {
      clientHeight: 100,
      scrollTop: 0,
      contains(node) {
        return node === active;
      },
    };

    scrollOverlayOptionIntoView(list, active);
    // Center active in the port: 200 - 50 + 20 = 170
    assert.equal(list.scrollTop, 170);
  });
});
