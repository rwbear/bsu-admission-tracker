import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PANEL_SWAP_TIMING,
  EXIT_OPACITY,
  ENTER_OPACITY,
  panelSwapDurationMs,
} from '../js/ui/panel-swap.js';

describe('panel-swap foundation', () => {
  it('keeps a snappy but multi-stage budget', () => {
    const t = PANEL_SWAP_TIMING;
    assert.ok(t.outMs < t.inMs || t.outMs <= 100, 'exit should stay decisive');
    assert.ok(t.gapMs >= 24 && t.gapMs <= 48, 'gap should breathe without dragging');
    assert.ok(t.enterAfterHeightMs < t.heightMs, 'enter starts during height settle');
    const wall = panelSwapDurationMs(t, { heightChanges: true });
    assert.ok(wall <= 520, `wall-clock should stay under 520ms, got ${wall}`);
    assert.ok(wall >= 320, `wall-clock should not feel clipped, got ${wall}`);
  });

  it('skips height budget when size is unchanged', () => {
    const withH = panelSwapDurationMs(PANEL_SWAP_TIMING, { heightChanges: true });
    const noH = panelSwapDurationMs(PANEL_SWAP_TIMING, { heightChanges: false });
    assert.ok(noH < withH);
    assert.equal(
      noH,
      PANEL_SWAP_TIMING.outMs + PANEL_SWAP_TIMING.gapMs + PANEL_SWAP_TIMING.inMs,
    );
  });

  it('defines non-linear opacity paths (not 0→1 linear stops only)', () => {
    for (const frames of [EXIT_OPACITY, ENTER_OPACITY]) {
      assert.ok(frames.length >= 3, 'need mid stops for a curve');
      assert.equal(frames[0].offset, 0);
      assert.equal(frames[frames.length - 1].offset, 1);
      for (let i = 1; i < frames.length; i++) {
        assert.ok(frames[i].offset > frames[i - 1].offset);
      }
    }
    // Exit should accelerate away (mid opacity below linear diagonal).
    const mid = EXIT_OPACITY.find((k) => k.offset >= 0.5);
    assert.ok(mid, 'exit has a mid stop');
    assert.ok(
      mid.opacity < 1 - mid.offset + 0.05,
      'exit mid should sit under the linear diagonal',
    );
    // Enter should stay darker early (ease into presence).
    const early = ENTER_OPACITY.find((k) => k.offset > 0 && k.offset <= 0.35);
    assert.ok(early, 'enter has an early stop');
    assert.ok(
      early.opacity < early.offset + 0.05,
      'enter early stop should lag a linear ramp',
    );
  });

  it('opacity keyframes stay in unit range', () => {
    for (const frames of [EXIT_OPACITY, ENTER_OPACITY]) {
      for (const k of frames) {
        assert.ok(k.opacity >= 0 && k.opacity <= 1);
      }
    }
    assert.equal(EXIT_OPACITY[0].opacity, 1);
    assert.equal(EXIT_OPACITY[EXIT_OPACITY.length - 1].opacity, 0);
    assert.equal(ENTER_OPACITY[0].opacity, 0);
    assert.equal(ENTER_OPACITY[ENTER_OPACITY.length - 1].opacity, 1);
  });
});
