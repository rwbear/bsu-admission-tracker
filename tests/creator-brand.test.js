import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

describe('creator brand markup', () => {
  it('uses a button trigger — never <a href="#top"> (that scrolls main)', () => {
    assert.match(
      html,
      /<button[^>]*\bid="creator-trigger"[^>]*>/,
      'brand must be button#creator-trigger',
    );
    assert.match(
      html,
      /class="command-brand"/,
      'brand keeps command-brand class',
    );
    assert.doesNotMatch(
      html,
      /<a[^>]*class="command-brand"[^>]*href="#top"/,
      'legacy #top brand scroll link must not ship',
    );
    assert.doesNotMatch(
      html,
      /<<<<<<|======|>>>>>>/,
      'index.html must not contain merge conflict markers',
    );
  });

  it('wires creator dialog a11y on the brand', () => {
    assert.match(html, /aria-haspopup="dialog"/);
    assert.match(html, /aria-controls="creator-overlay"/);
    assert.match(html, /aria-expanded="false"/);
  });
});
