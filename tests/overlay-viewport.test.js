import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('overlay visualViewport pin', () => {
  it('pins shell to visualViewport offset/size', () => {
    const src = readFileSync(join(root, 'js/ui/overlay-viewport.js'), 'utf8');
    assert.match(src, /visualViewport/);
    assert.match(src, /offsetTop/);
    assert.match(src, /vv\?\.height/);
    assert.match(src, /followOverlayViewport/);
  });

  it('faculty and table mount a pin and dispose on teardown', () => {
    const faculty = readFileSync(join(root, 'js/ui/faculty-picker.js'), 'utf8');
    const table = readFileSync(join(root, 'js/ui/table-picker.js'), 'utf8');
    assert.match(faculty, /pinOverlayShell\(shell\)/);
    assert.match(table, /pinOverlayShell\(shell\)/);
    assert.match(faculty, /disposeFacultyViewport/);
    assert.match(table, /disposeTableViewport/);
    assert.match(faculty, /blurFacultySearch/);
    assert.match(table, /blurTableSearch/);
  });
});
