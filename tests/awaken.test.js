import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { awakenEl, allAwake, disposeScrollAwaken } from '../js/ui/awaken.js';

function fakeEl(awake = false) {
  const classes = new Set(awake ? ['is-awake'] : []);
  return {
    isConnected: true,
    classList: {
      contains: (c) => classes.has(c),
      add: (c) => {
        classes.add(c);
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

  it('awakenEl no-ops when disconnected', () => {
    const el = fakeEl();
    el.isConnected = false;
    awakenEl(/** @type {any} */ (el));
    assert.equal(el.classList.contains('is-awake'), false);
  });

  it('allAwake requires every data-awaken node', () => {
    const scope = fakeEl();
    const a = fakeEl(false);
    const b = fakeEl(true);
    scope._kids = [a, b];
    assert.equal(allAwake(/** @type {any} */ (scope)), false);
    a.classList.add('is-awake');
    assert.equal(allAwake(/** @type {any} */ (scope)), true);
  });

  it('disposeScrollAwaken is safe on unknown scopes', () => {
    disposeScrollAwaken(/** @type {any} */ (fakeEl()));
  });
});
