import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcPassing } from '../js/compute.js';

const data = JSON.parse(readFileSync(new URL('../data/sb-bsu.json', import.meta.url), 'utf8'));

describe('published snapshot invariants', () => {
  it('has specialties and unique ids', () => {
    assert.ok((data.specialties || []).length > 0);
    const ids = data.specialties.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('keeps ranges aligned with buckets and recomputes passing', () => {
    for (const s of data.specialties) {
      assert.equal(
        (s.ranges || []).length,
        (s.buckets || []).length,
        s.id,
      );
      const plan = Number(s.plan) || 0;
      const recomputed = calcPassing(s.ranges || [], s.buckets || [], plan);
      assert.equal(recomputed, s.estimatedPassing ?? null, s.id);
    }
  });

  it('does not publish totalApps below inCompetition when both positive', () => {
    const bad = data.specialties.filter((s) => {
      const ta = Number(s.totalApps) || 0;
      const ic = Number(s.inCompetition) || 0;
      return ta > 0 && ic > 0 && ta < ic;
    });
    assert.deepEqual(
      bad.map((s) => ({ id: s.id, ta: s.totalApps, ic: s.inCompetition })),
      [],
    );
  });

  it('keeps inCompetition near bucket sum when bands exist', () => {
    const bad = [];
    for (const s of data.specialties) {
      const buckets = s.buckets || [];
      if (!buckets.length) continue;
      const bsum = buckets.reduce((a, b) => a + (Number(b) || 0), 0);
      if (bsum < 3) continue;
      const ic = Number(s.inCompetition) || 0;
      const tol = Math.max(2, Math.floor(bsum * 0.35));
      if (Math.abs(ic - bsum) > tol) {
        bad.push({ id: s.id, ic, bsum, tol });
      }
    }
    assert.deepEqual(bad, []);
  });
});
