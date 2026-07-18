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
  it('track stays empty until fill clip opens — no seg opacity ghosts', () => {
    const css = readCss();
    const fillBase = css.match(/(?:^|\n)\.plan-slab-fill\s*\{([^}]*)\}/);
    assert.ok(fillBase, 'plan-slab-fill layer exists');
    assert.match(fillBase[1], /clip-path:\s*inset\(0\s+100%\s+0\s+0\)/);

    const enter = keyframes(css, 'plan-slab-fill-in');
    const sleep = keyframes(css, 'plan-slab-fill-sleep');
    assert.match(enter, /inset\(0\s+100%\s+0\s+0\)/);
    assert.match(enter, /inset\(0\s+0%\s+0\s+0\)/);
    assert.match(sleep, /inset\(0\s+100%\s+0\s+0\)/);
    // scaleX squashes labels mid-wipe — clip-path only.
    assert.equal(/\bscaleX\b/.test(enter), false);
    assert.equal(/\bscaleX\b/.test(sleep), false);

    assert.equal(
      /\.plan-slab-seg:nth-child\([^)]+\)\s*\{[^}]*animation-delay/s.test(css),
      false,
    );

    const seg = css.match(/(?:^|\n)\.plan-slab-seg\s*\{([^}]*)\}/);
    assert.ok(seg);
    assert.equal(/opacity:\s*0/.test(seg[1]), false);

    const caption = css.match(/(?:^|\n)\.plan-slab-caption\s*\{([^}]*)\}/);
    assert.ok(caption);
    assert.match(caption[1], /opacity:\s*0/);
  });

  it('builds a fill layer and wakes after reveal (not instant on intro)', () => {
    const charts = readFileSync(join(root, 'js/ui/charts.js'), 'utf8');
    assert.match(charts, /plan-slab-fill/);

    const radar = readFileSync(join(root, 'js/ui/radar.js'), 'utf8');
    assert.match(radar, /armScrollAwaken\(container,\s*\{\s*immediate:\s*false/);
    assert.equal(
      /data-awaken=["']plan["'][\s\S]{0,200}awakenEl\([^)]*instant:\s*true/.test(
        radar,
      ),
      false,
    );
  });
});

describe('awaken empty-shell contract', () => {
  it('chance + hist sleep/dormant end at true empty (no ghost opacity)', () => {
    const css = readCss();

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
