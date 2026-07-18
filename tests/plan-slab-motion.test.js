import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('plan-slab motion contract', () => {
  it('fades segments in — never scaleX (loader look on faculty select)', () => {
    const css = readFileSync(join(root, 'css/components.css'), 'utf8');
    const match = css.match(
      /@keyframes plan-slab-in\s*\{[\s\S]*?\n\}/,
    );
    assert.ok(match, 'plan-slab-in keyframes exist');
    const block = match[0];
    assert.match(block, /opacity:\s*0/);
    assert.match(block, /opacity:\s*1/);
    assert.equal(/\bscaleX\b/.test(block), false);
    // Dormant segs must not pre-scale — that fought the old intro.
    const dormant = css.match(/\.plan-slab-seg\s*\{([^}]*)\}/);
    assert.ok(dormant);
    assert.equal(/\btransform\s*:/.test(dormant[1]), false);
  });

  it('intro path instant-awakes plan under the reveal veil', () => {
    const src = readFileSync(join(root, 'js/ui/radar.js'), 'utf8');
    assert.match(src, /data-awaken=["']plan["']/);
    assert.match(src, /awakenEl\(node,\s*\{\s*instant:\s*true\s*\}/);
  });
});
