import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickNewest, resolveOrigin, withTimeout } from '../js/load-data.js';

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
      origin: { repo: 'a/b', branch: 'cursor/admission-tracker-rebuild-be86' },
    });
    assert.equal(o.repo, 'a/b');
    assert.equal(o.branch, 'cursor/admission-tracker-rebuild-be86');
  });

  it('ignores main/master origin branch and uses Pages branch', () => {
    const o = resolveOrigin({
      origin: { repo: 'rwbear/bsu-admission-tracker', branch: 'main' },
    });
    assert.equal(o.branch, 'cursor/admission-tracker-rebuild-be86');
  });
});

describe('withTimeout', () => {
  it('returns fallback when promise is slow', async () => {
    const v = await withTimeout(
      new Promise((r) => setTimeout(() => r('late'), 200)),
      30,
      'fallback',
    );
    assert.equal(v, 'fallback');
  });

  it('returns value when promise is fast', async () => {
    const v = await withTimeout(Promise.resolve('ok'), 200, 'fallback');
    assert.equal(v, 'ok');
  });

  it('returns fallback on rejection', async () => {
    const v = await withTimeout(Promise.reject(new Error('x')), 200, null);
    assert.equal(v, null);
  });
});
