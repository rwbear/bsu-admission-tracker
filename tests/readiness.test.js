import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { withFormScopedId, normalizeUniversityPayload } from '../js/spec-id.js';
import { enrichSpec } from '../js/compute.js';
import { parseStoredScore } from '../js/state.js';

describe('form-scoped specialty ids', () => {
  it('injects form after university on legacy ids', () => {
    const scoped = withFormScopedId({
      id: 'sb-bsu:военный-факультет:правоведение:10',
      universityId: 'sb-bsu',
      form: '29',
    });
    assert.equal(
      scoped.id,
      'sb-bsu:29:военный-факультет:правоведение:10',
    );
  });

  it('is idempotent when form is already in the id', () => {
    const id = 'sb-bsu:7:институт-бизнеса-бгу:маркетинг:70';
    const scoped = withFormScopedId({
      id,
      universityId: 'sb-bsu',
      form: '7',
    });
    assert.equal(scoped.id, id);
  });

  it('separates budget vs paid collisions in a snapshot', () => {
    const payload = normalizeUniversityPayload({
      specialties: [
        {
          id: 'sb-bsu:эконом:финансы-и-кредит:10',
          universityId: 'sb-bsu',
          form: '32',
        },
        {
          id: 'sb-bsu:эконом:финансы-и-кредит:10',
          universityId: 'sb-bsu',
          form: '7',
        },
      ],
    });
    const ids = payload.specialties.map((s) => s.id);
    assert.equal(new Set(ids).size, 2);
    assert.ok(ids[0].includes(':32:'));
    assert.ok(ids[1].includes(':7:'));
  });
});

describe('underfilled specialties', () => {
  it('marks score as safe when applications are below plan', () => {
    const row = enrichSpec(
      {
        id: 'demo',
        specName: 'бизнес-администрирование',
        plan: 75,
        totalApps: 37,
        inCompetition: 37,
        ranges: ['400-391', '390-381', '320-316', '120 и менее'],
        buckets: [2, 5, 3, 1],
        estimatedPassing: null,
      },
      320,
    );
    assert.equal(row.estimatedPassing, null);
    assert.equal(row.status, 'safe');
    assert.equal(row.statusLabel, 'В зоне');
  });

  it('never leaves blank status when score is set and seats are full', () => {
    const simple = enrichSpec(
      {
        id: 'simple',
        specName: 'психология',
        plan: 25,
        totalApps: 26,
        inCompetition: 26,
        ranges: [],
        buckets: [],
        estimatedPassing: null,
      },
      350,
    );
    assert.notEqual(simple.status, 'neutral');
    assert.equal(simple.status, 'risk');

    const mismatched = enrichSpec(
      {
        id: 'phys',
        specName: 'прикладная физика',
        plan: 20,
        totalApps: 23,
        inCompetition: 23,
        ranges: ['400-391', '390-381', '320-316', '120 и менее'],
        buckets: [2, 5, 3, 1], // bsum 11 < plan, but apps ≥ plan → no passing
        estimatedPassing: null,
      },
      350,
    );
    assert.notEqual(mismatched.status, 'neutral');
  });

  it('uses max(apps, bucketSum) for contest pressure', () => {
    const row = enrichSpec(
      {
        id: 'bio',
        specName: 'биология',
        plan: 9,
        totalApps: 5,
        inCompetition: 1,
        ranges: ['400-391', '390-381', '320-316', '120 и менее'],
        buckets: [2, 5, 3, 0],
        estimatedPassing: 381,
      },
      300,
    );
    assert.equal(row.competition, 10);
    assert.ok(Math.abs(row.pressure - 10 / 9) < 1e-9);
  });
});

describe('stored score prefs', () => {
  it('rejects NaN and out-of-range scores', () => {
    assert.equal(parseStoredScore('abc'), null);
    assert.equal(parseStoredScore(''), null);
    assert.equal(parseStoredScore('-1'), null);
    assert.equal(parseStoredScore('501'), null);
    assert.equal(parseStoredScore('320'), 320);
  });
});
