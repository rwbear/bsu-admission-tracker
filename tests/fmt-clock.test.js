import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fmtClock } from '../js/ui/dom.js';

describe('fmtClock', () => {
  it('formats absolute HH:MM in ru-RU 24h', () => {
    const text = fmtClock('2026-07-18T15:45:00.000Z');
    assert.match(text, /^\d{1,2}:\d{2}$/);
  });

  it('returns em dash for empty/invalid', () => {
    assert.equal(fmtClock(null), '—');
    assert.equal(fmtClock(''), '—');
    assert.equal(fmtClock('not-a-date'), '—');
  });

  it('accepts epoch ms', () => {
    assert.match(fmtClock(Date.parse('2026-07-18T15:45:00.000Z')), /^\d{1,2}:\d{2}$/);
  });
});
