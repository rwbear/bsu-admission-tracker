import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  awakenEl,
  sleepEl,
  allAwake,
  allAsleep,
  disposeScrollAwaken,
  shouldDeferSleep,
  isUnderPanelSwap,
  AWAKEN_WAKE_RATIO,
  AWAKEN_SLEEP_RATIO,
  AWAKEN_SLEEP_MS,
  AWAKEN_SLEEP_GRACE_MS,
} from '../js/ui/awaken.js';

function fakeEl(awake = false) {
  const classes = new Set(awake ? ['is-awake'] : []);
  return {
    isConnected: true,
    offsetWidth: 1,
    classList: {
      contains: (c) => classes.has(c),
      add: (...cs) => {
        for (const c of cs) classes.add(c);
      },
      remove: (...cs) => {
        for (const c of cs) classes.delete(c);
      },
    },
    dispatchEvent() {
      return true;
    },
    querySelectorAll(sel) {
      if (sel === '[data-awaken]') return this._kids || [];
      return [];
    },
    _kids: /** @type {ReturnType<typeof fakeEl>[]} */ ([]),
  };
}

describe('awaken foundation', () => {
  it('keeps wake/sleep hysteresis', () => {
    assert.ok(AWAKEN_SLEEP_RATIO < AWAKEN_WAKE_RATIO);
    assert.ok(AWAKEN_SLEEP_RATIO > 0);
    assert.ok(AWAKEN_SLEEP_MS >= 300 && AWAKEN_SLEEP_MS <= 560);
  });

  it('awakenEl is idempotent and sets is-awake', () => {
    const el = fakeEl();
    awakenEl(/** @type {any} */ (el));
    assert.equal(el.classList.contains('is-awake'), true);
    awakenEl(/** @type {any} */ (el));
    assert.equal(el.classList.contains('is-awake'), true);
  });

  it('awakenEl can mark instant (no intro replay)', () => {
    const el = fakeEl();
    awakenEl(/** @type {any} */ (el), { instant: true });
    assert.equal(el.classList.contains('is-awake'), true);
    assert.equal(el.classList.contains('is-instant'), true);
  });

  it('sleepEl reverses to dormant after settle', async () => {
    const el = fakeEl(true);
    let settled = false;
    sleepEl(/** @type {any} */ (el), {
      settleMs: 20,
      onSettled: () => {
        settled = true;
      },
    });
    assert.equal(el.classList.contains('is-sleeping'), true);
    assert.equal(el.classList.contains('is-awake'), true);
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(settled, true);
    assert.equal(el.classList.contains('is-awake'), false);
    assert.equal(el.classList.contains('is-sleeping'), false);
  });

  it('sleepEl instant drops awake immediately', () => {
    const el = fakeEl(true);
    el.classList.add('is-instant');
    sleepEl(/** @type {any} */ (el), { instant: true });
    assert.equal(el.classList.contains('is-awake'), false);
    assert.equal(el.classList.contains('is-sleeping'), false);
    assert.equal(el.classList.contains('is-instant'), false);
  });

  it('awaken during sleep cancels sleeping and restarts', () => {
    const el = fakeEl(true);
    sleepEl(/** @type {any} */ (el), { settleMs: 500 });
    assert.equal(el.classList.contains('is-sleeping'), true);
    awakenEl(/** @type {any} */ (el));
    assert.equal(el.classList.contains('is-sleeping'), false);
    assert.equal(el.classList.contains('is-awake'), true);
  });

  it('awakenEl no-ops when disconnected', () => {
    const el = fakeEl();
    el.isConnected = false;
    awakenEl(/** @type {any} */ (el));
    assert.equal(el.classList.contains('is-awake'), false);
  });

  it('allAwake / allAsleep track scope state', () => {
    const scope = fakeEl();
    const a = fakeEl(false);
    const b = fakeEl(true);
    scope._kids = [a, b];
    assert.equal(allAwake(/** @type {any} */ (scope)), false);
    assert.equal(allAsleep(/** @type {any} */ (scope)), false);
    a.classList.add('is-awake');
    assert.equal(allAwake(/** @type {any} */ (scope)), true);
    sleepEl(/** @type {any} */ (a), { instant: true });
    sleepEl(/** @type {any} */ (b), { instant: true });
    assert.equal(allAsleep(/** @type {any} */ (scope)), true);
  });

  it('disposeScrollAwaken is safe on unknown scopes', () => {
    disposeScrollAwaken(/** @type {any} */ (fakeEl()));
  });

  it('defers sleep right after awaken (IO flicker grace)', () => {
    assert.ok(AWAKEN_SLEEP_GRACE_MS > AWAKEN_SLEEP_MS);
    const el = fakeEl();
    awakenEl(/** @type {any} */ (el));
    assert.equal(shouldDeferSleep(/** @type {any} */ (el)), true);
    assert.equal(
      shouldDeferSleep(/** @type {any} */ (el), performance.now() + AWAKEN_SLEEP_GRACE_MS + 1),
      false,
    );
  });

  it('detects panel-swap height lock ancestors', () => {
    const panel = {
      classList: { contains: (c) => c === 'is-panel-swapping' },
      closest(sel) {
        return sel === '.is-panel-swapping' ? this : null;
      },
    };
    const child = {
      closest(sel) {
        return sel === '.is-panel-swapping' ? panel : null;
      },
    };
    assert.equal(isUnderPanelSwap(/** @type {any} */ (child)), true);
    assert.equal(isUnderPanelSwap(/** @type {any} */ ({ closest: () => null })), false);
  });
});
