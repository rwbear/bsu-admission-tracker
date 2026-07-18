import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { onPrimaryActivate } from '../js/ui/pointer-activate.js';

describe('onPrimaryActivate', () => {
  it('exports a binder', () => {
    assert.equal(typeof onPrimaryActivate, 'function');
    onPrimaryActivate(null, () => {});
  });

  it('fires on pointerdown and ignores the trailing click', () => {
    if (typeof document === 'undefined') return;

    const btn = document.createElement('button');
    let count = 0;
    onPrimaryActivate(btn, () => {
      count += 1;
    });

    btn.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, isPrimary: true, bubbles: true }),
    );
    assert.equal(count, 1);
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assert.equal(count, 1);
  });
});
