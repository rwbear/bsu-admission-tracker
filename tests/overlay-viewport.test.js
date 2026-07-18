import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('overlay visualViewport pin', () => {
  it('counters pan without thrashing height every frame', () => {
    const src = readFileSync(join(root, 'js/ui/overlay-viewport.js'), 'utf8');
    assert.match(src, /visualViewport/);
    assert.match(src, /offsetTop/);
    assert.match(src, /translate\(/);
    assert.match(src, /freeze/);
    // Continuous rAF follow was the search-focus thrash — must stay gone.
    assert.match(src, /intentionally empty/);
    assert.doesNotMatch(src, /requestAnimationFrame\(step\)/);
  });

  it('faculty and table freeze viewport before leave', () => {
    const faculty = readFileSync(join(root, 'js/ui/faculty-picker.js'), 'utf8');
    const table = readFileSync(join(root, 'js/ui/table-picker.js'), 'utf8');
    assert.match(faculty, /freezeFacultyViewport/);
    assert.match(table, /freezeTableViewport/);
    assert.match(faculty, /openShellMotion/);
    assert.match(table, /openShellMotion/);
    assert.doesNotMatch(faculty, /requestAnimationFrame\(\s*\(\)\s*=>\s*\{\s*requestAnimationFrame/);
  });
});
