import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { METHOD_SHEET } from '../js/ui/method-sheet.js';
import { METHOD_PARAGRAPHS } from '../js/ui/method-copy.js';

describe('method sheet', () => {
  it('reuses faculty close budget and stable ids', () => {
    assert.equal(METHOD_SHEET.closeMs, 220);
    assert.equal(METHOD_SHEET.overlayId, 'method-overlay');
    assert.equal(METHOD_SHEET.rootId, 'method-overlay-root');
    assert.equal(METHOD_SHEET.triggerId, 'method-sheet-trigger');
  });

  it('keeps four methodology paragraphs', () => {
    assert.equal(METHOD_PARAGRAPHS.length, 4);
    assert.match(METHOD_PARAGRAPHS[0], /места идут сверху/i);
    assert.match(METHOD_PARAGRAPHS[1], /БВИ/);
    assert.match(METHOD_PARAGRAPHS[2], /Над тобой/);
    assert.match(METHOD_PARAGRAPHS[3], /расчётный балл/i);
  });
});
