import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  optionListSignature,
  optionListMatches,
  patchOptionSelection,
} from '../js/ui/selection-list.js';

function fakeOption(id, active = false) {
  const classes = new Set(active ? ['is-active'] : []);
  const attrs = { 'data-id': id, 'aria-selected': active ? 'true' : 'false' };
  return {
    getAttribute: (k) => attrs[k] ?? null,
    setAttribute: (k, v) => {
      attrs[k] = v;
    },
    classList: {
      contains: (c) => classes.has(c),
      toggle: (c, on) => {
        if (on) classes.add(c);
        else classes.delete(c);
      },
    },
  };
}

describe('selection-list', () => {
  it('builds stable signatures', () => {
    assert.equal(
      optionListSignature([{ id: 'a' }, { id: 'b' }]),
      'a|b',
    );
  });

  it('optionListMatches requires same ordered ids', () => {
    const a = fakeOption('a', true);
    const b = fakeOption('b');
    const root = {
      querySelectorAll: () => [a, b],
    };
    assert.equal(
      optionListMatches(root, '.faculty-option', [{ id: 'a' }, { id: 'b' }]),
      true,
    );
    assert.equal(
      optionListMatches(root, '.faculty-option', [{ id: 'b' }, { id: 'a' }]),
      false,
    );
  });

  it('patchOptionSelection flips active without remounting', () => {
    const a = fakeOption('a', true);
    const b = fakeOption('b', false);
    const root = { querySelectorAll: () => [a, b] };
    patchOptionSelection(root, '.faculty-option', 'b', 'is-active');
    assert.equal(a.classList.contains('is-active'), false);
    assert.equal(b.classList.contains('is-active'), true);
    assert.equal(a.getAttribute('aria-selected'), 'false');
    assert.equal(b.getAttribute('aria-selected'), 'true');
  });
});
