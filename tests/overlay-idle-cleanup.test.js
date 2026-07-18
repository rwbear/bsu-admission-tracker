import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('overlay idle cleanup + handoff', () => {
  it('closed chrome re-render must not focus triggers', () => {
    const faculty = readFileSync(join(root, 'js/ui/faculty-picker.js'), 'utf8');
    const table = readFileSync(join(root, 'js/ui/table-picker.js'), 'utf8');

    // The no-shell branch must be idle cleanup, not teardown-with-focus.
    assert.match(faculty, /Idle cleanup only/);
    assert.match(table, /Idle cleanup only/);
    assert.doesNotMatch(
      faculty,
      /if \(!shell\) \{[\s\S]*?teardownFacultyOverlay\(host, null/,
    );
    assert.doesNotMatch(
      table,
      /if \(!shell\) \{[\s\S]*?teardownTableOverlay\(host, null/,
    );
  });

  it('preserves restoreFocus from the close that started leave', () => {
    const faculty = readFileSync(join(root, 'js/ui/faculty-picker.js'), 'utf8');
    // _facultyClosing guard must come before overwriting _facultyRestoreFocus.
    const closingIdx = faculty.indexOf('if (host._facultyClosing) return;');
    const restoreIdx = faculty.indexOf('host._facultyRestoreFocus = opts.restoreFocus');
    assert.ok(closingIdx > 0 && restoreIdx > 0);
    assert.ok(
      closingIdx < restoreIdx,
      'must bail on in-flight leave before overwriting restoreFocus',
    );
  });

  it('unlock rAF re-assert skips when another overlay re-locked', () => {
    const lock = readFileSync(join(root, 'js/ui/overlay-scroll-lock.js'), 'utf8');
    assert.match(lock, /if \(holders\.size > 0\) return;/);
  });

  it('method leave drops open flag so Escape hands off immediately', () => {
    const method = readFileSync(join(root, 'js/ui/method-sheet.js'), 'utf8');
    assert.match(
      method,
      /host\._methodClosing = true;[\s\S]{0,200}?open = false;/,
    );
  });
});
