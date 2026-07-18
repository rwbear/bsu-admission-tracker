import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('faculty select stays open', () => {
  it('does not auto-close the overlay after onSelectFaculty', () => {
    const main = readFileSync(join(root, 'js/main.js'), 'utf8');
    const fn = main.match(
      /function onSelectFaculty\([\s\S]*?\n\}/,
    )?.[0];
    assert.ok(fn, 'onSelectFaculty must exist');
    assert.match(fn, /setFaculty\(id\)/);
    assert.doesNotMatch(fn, /closeFacultyMenu/);
    assert.doesNotMatch(fn, /setTimeout/);
  });
});
