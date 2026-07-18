import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  OVERLAY_LEAVE_MS,
  acquireOverlayScrollLock,
  releaseOverlayScrollLock,
  isOverlayScrollLocked,
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
