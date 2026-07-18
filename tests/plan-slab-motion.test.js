import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readCss() {
  return readFileSync(join(root, 'css/components.css'), 'utf8');
}

function keyframes(css, name) {
  const match = css.match(
    new RegExp(`@keyframes ${name}\\s*\\{[\\s\\S]*?\\n\\}`),
  );
  assert.ok(match, `${name} keyframes exist`);
  return match[0];
}

describe('plan-slab motion contract', () => {
  it('stays empty until awake — no scaleX, no seg stagger', () => {
    const css = readCss();
    const enter = keyframes(css, 'plan-slab-in');
    const sleep = keyframes(css, 'plan-slab-sleep');
    assert.match(enter, /opacity:\s*0/);
    assert.match(enter, /opacity:\s*1/);
    assert.equal(/\bscaleX\b/.test(enter), false);
    assert.match(sleep, /opacity:\s*0/);
    assert.equal(/\bscaleX\b/.test(sleep), false);

    // Stagger made taken-hatch appear alone → looked like a broken sleep.
    assert.equal(
      /\.plan-slab-seg:nth-child\([^)]+\)\s*\{[^}]*animation-delay/s.test(css),
      false,
    );

    const seg = css.match(/\.plan-slab-seg\s*\{([^}]*)\}/);
    assert.ok(seg);
    assert.match(seg[1], /opacity:\s*0/);
    assert.equal(/\btransform\s*:/.test(seg[1]), false);

    const caption = css.match(/\.plan-slab-caption\s*\{([^}]*)\}/);
    assert.ok(caption);
    assert.match(caption[1], /opacity:\s*0/);
  });

  it('intro path instant-awakes plan under the reveal veil', () => {
    const src = readFileSync(join(root, 'js/ui/radar.js'), 'utf8');
    assert.match(src, /data-awaken=["']plan["']/);
    assert.match(src, /awakenEl\(node,\s*\{\s*instant:\s*true\s*\}/);
  });
});

describe('awaken empty-shell contract', () => {
  it('chance + hist sleep/dormant end at true empty (no ghost opacity)', () => {
    const css = readCss();

    // Base rules only (not nested `.is-awake … .chance-fill`).
    const fillBase = css.match(/(?:^|\n)\.chance-fill\s*\{([^}]*)\}/);
    assert.ok(fillBase);
    assert.match(fillBase[1], /opacity:\s*0\b/);
    assert.equal(/opacity:\s*0\.5/.test(fillBase[1]), false);

    const fillSleep = keyframes(css, 'chance-fill-sleep');
    assert.match(fillSleep, /opacity:\s*0\b/);
    assert.equal(/opacity:\s*0\.5/.test(fillSleep), false);

    const fillIn = keyframes(css, 'chance-fill-in');
    assert.match(fillIn, /from\s*\{[^}]*opacity:\s*0\b/s);

    const barBase = css.match(/(?:^|\n)\.hist-col-fill\s*\{([^}]*)\}/);
    assert.ok(barBase);
    assert.match(barBase[1], /opacity:\s*0\b/);
    assert.equal(/opacity:\s*0\.45/.test(barBase[1]), false);

    const barSleep = keyframes(css, 'hist-bar-sleep');
    assert.match(barSleep, /opacity:\s*0\b/);
    assert.equal(/opacity:\s*0\.45/.test(barSleep), false);

    const barIn = keyframes(css, 'hist-bar-awaken');
    assert.match(barIn, /from\s*\{[^}]*opacity:\s*0\b/s);
  });
});
