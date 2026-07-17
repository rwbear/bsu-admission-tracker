import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DISCLOSURE_TIMING } from '../js/ui/panel-disclosure.js';

describe('panel disclosure', () => {
  it('stays snappy — panel-swap select range, not reveal cascade', () => {
    assert.equal(DISCLOSURE_TIMING.openMs, 200);
    assert.equal(DISCLOSURE_TIMING.closeMs, 160);
    assert.ok(DISCLOSURE_TIMING.closeMs < DISCLOSURE_TIMING.openMs);
    assert.ok(DISCLOSURE_TIMING.openMs <= 220, 'open must not feel sticky');
    assert.match(DISCLOSURE_TIMING.easeOpen, /0\.16,\s*1,\s*0\.3,\s*1/);
    assert.match(DISCLOSURE_TIMING.easeClose, /0\.55,\s*0,\s*1,\s*1/);
  });

  it('does not ship child-stagger budgets (layout lag source)', () => {
    assert.equal('staggerMs' in DISCLOSURE_TIMING, false);
    assert.equal('childMs' in DISCLOSURE_TIMING, false);
    assert.equal('bodyFromY' in DISCLOSURE_TIMING, false);
  });
});
