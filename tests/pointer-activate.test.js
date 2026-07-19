import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { onPrimaryActivate } from '../js/ui/pointer-activate.js';
import { restoreFocus } from '../js/ui/overlay-scroll-lock.js';

describe('onPrimaryActivate', () => {
  it('exports a binder', () => {
    assert.equal(typeof onPrimaryActivate, 'function');
    onPrimaryActivate(null, () => {});
  });

  it('fires on pointerdown and ignores the trailing click', () => {
    if (typeof document === 'undefined') return;
    if (typeof PointerEvent === 'undefined') return;

    const btn = document.createElement('button');
    let count = 0;
    onPrimaryActivate(btn, () => {
      count += 1;
    });

    btn.dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        isPrimary: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    assert.equal(count, 1);
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    assert.equal(count, 1);
  });
});

describe('restoreFocus', () => {
  it('no-ops under pointer modality', () => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-input', 'pointer');
    const btn = document.createElement('button');
    document.body?.append?.(btn);
    restoreFocus(btn);
    assert.notEqual(document.activeElement, btn);
    btn.remove?.();
  });
});
