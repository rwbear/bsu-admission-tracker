import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { OVERLAY_LEAVE_MS } from '../js/ui/overlay-scroll-lock.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('faculty / table overlay close contract', () => {
  it('keeps leave budget past backdrop opacity fade', () => {
    assert.ok(OVERLAY_LEAVE_MS >= 240);
  });

  it('restores focus inside picker teardown — not a separate main.js timer', () => {
    const faculty = readFileSync(join(root, 'js/ui/faculty-picker.js'), 'utf8');
    const table = readFileSync(join(root, 'js/ui/table-picker.js'), 'utf8');
    const main = readFileSync(join(root, 'js/main.js'), 'utf8');

    // Teardown must focus trigger before unlock (same sync turn).
    assert.match(faculty, /function teardownFacultyOverlay/);
    assert.match(table, /function teardownTableOverlay/);
    assert.match(
      faculty,
      /focusNoScroll\(trigger\)[\s\S]*releaseOverlayScrollLock/,
    );
    assert.match(
      table,
      /focusNoScroll\(trigger\)[\s\S]*releaseOverlayScrollLock/,
    );

    // The race that blinked: focusNoScroll(faculty-trigger) on a lone setTimeout.
    assert.doesNotMatch(
      main,
      /setTimeout\(\s*\(\)\s*=>\s*\{[^}]*faculty-trigger[\s\S]*?\},\s*280\s*\)/,
    );
    assert.doesNotMatch(
      main,
      /setTimeout\(\s*\(\)\s*=>\s*\{[^}]*table-trigger[\s\S]*?\},\s*280\s*\)/,
    );
  });

  it('accepts restoreFocus:false for mutual exclusion handoff', () => {
    const faculty = readFileSync(join(root, 'js/ui/faculty-picker.js'), 'utf8');
    const main = readFileSync(join(root, 'js/main.js'), 'utf8');
    assert.match(faculty, /restoreFocus:\s*opts\.restoreFocus !== false/);
    assert.match(main, /closeFacultyMenu\(\{\s*restoreFocus:\s*false\s*\}\)/);
    assert.match(main, /closeTableMenu\(\{\s*restoreFocus:\s*false\s*\}\)/);
  });
});
