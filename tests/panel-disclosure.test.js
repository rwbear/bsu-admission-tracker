import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DISCLOSURE_TIMING } from '../js/ui/panel-disclosure.js';

describe('panel disclosure', () => {
  it('stays snappy — compositor fade range, not reveal cascade', () => {
    assert.equal(DISCLOSURE_TIMING.openMs, 160);
    assert.equal(DISCLOSURE_TIMING.closeMs, 130);
    assert.ok(DISCLOSURE_TIMING.closeMs < DISCLOSURE_TIMING.openMs);
    assert.ok(DISCLOSURE_TIMING.openMs <= 180, 'open must not feel sticky');
    assert.match(DISCLOSURE_TIMING.easeOpen, /0\.16,\s*1,\s*0\.3,\s*1/);
    assert.match(DISCLOSURE_TIMING.easeClose, /0\.55,\s*0,\s*1,\s*1/);
  });

  it('does not ship layout-interpolated row budgets', () => {
    assert.equal('staggerMs' in DISCLOSURE_TIMING, false);
    assert.equal('childMs' in DISCLOSURE_TIMING, false);
    assert.equal('bodyFromY' in DISCLOSURE_TIMING, false);
    assert.ok(DISCLOSURE_TIMING.fromY);
    assert.ok(DISCLOSURE_TIMING.toY);
  });
});
