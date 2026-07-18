import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  armInputModality,
  inputModality,
  setInputModality,
} from '../js/ui/input-modality.js';

describe('input modality', () => {
  it('exports helpers', () => {
    assert.equal(typeof armInputModality, 'function');
    assert.equal(typeof setInputModality, 'function');
    assert.equal(typeof inputModality, 'function');
  });

  it('defaults to pointer and flips on set', () => {
    if (typeof document === 'undefined') return;
    setInputModality('pointer');
    assert.equal(inputModality(), 'pointer');
    setInputModality('keyboard');
    assert.equal(inputModality(), 'keyboard');
    setInputModality('pointer');
    assert.equal(inputModality(), 'pointer');
  });
});
