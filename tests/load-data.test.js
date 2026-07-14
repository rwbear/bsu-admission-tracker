import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickNewest, resolveOrigin } from '../js/load-data.js';

describe('pickNewest', () => {
  it('prefers newer updatedAt', () => {
    const a = {
      updatedAt: '2026-07-14T10:00:00.000Z',
      specialties: [{ id: '1' }],
      specialtyCount: 1,
    };
    const b = {
      updatedAt: '2026-07-14T11:00:00.000Z',
      specialties: [{ id: '2' }, { id: '3' }],
      specialtyCount: 2,
    };
    assert.equal(pickNewest([a, b]), b);
    assert.equal(pickNewest([b, a]), b);
  });

  it('ignores invalid payloads', () => {
    const ok = {
      updatedAt: '2026-07-14T11:00:00.000Z',
      specialties: [],
    };
    assert.equal(pickNewest([null, { foo: 1 }, ok]), ok);
  });
});

describe('resolveOrigin', () => {
  it('reads origin from index with CONFIG fallback', () => {
    const o = resolveOrigin({
      origin: { repo: 'a/b', branch: 'main' },
    });
    assert.equal(o.repo, 'a/b');
    assert.equal(o.branch, 'main');
  });
});
