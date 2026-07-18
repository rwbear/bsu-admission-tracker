import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { OPTION_ACTIVATE } from '../js/ui/option-activate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('option activate (mobile search tap)', () => {
  it('keeps a tight tap vs scroll threshold', () => {
    assert.ok(OPTION_ACTIVATE.movePx <= 16);
    assert.ok(OPTION_ACTIVATE.dedupeMs >= 300);
  });

  it('prevents input blur mid-gesture and supports list pan', () => {
    const src = readFileSync(join(root, 'js/ui/option-activate.js'), 'utf8');
    assert.match(src, /preventDefault\(\)/);
    assert.match(src, /setPointerCapture/);
    assert.match(src, /scrollParent\.scrollTop/);
    assert.match(src, /pointerdown/);
    assert.match(src, /pointerup/);
    // Tap budget must gate cancel — not the 2px pan threshold.
    assert.match(src, /if \(dist > MOVE_PX\) dragged = true/);
  });

  it('faculty and table pickers wire scrollParent', () => {
    const faculty = readFileSync(join(root, 'js/ui/faculty-picker.js'), 'utf8');
    const table = readFileSync(join(root, 'js/ui/table-picker.js'), 'utf8');
    assert.match(faculty, /bindOptionActivate\(/);
    assert.match(table, /bindOptionActivate\(/);
    assert.match(faculty, /scrollParent:\s*list/);
    assert.match(table, /scrollParent:\s*list/);
  });
});
