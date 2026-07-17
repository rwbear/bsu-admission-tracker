import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeStatuses,
  resolveHistCutIndex,
  histOutZoneLeftPct,
  formatQuotaCaption,
  formatQuotaCaptionCompact,
  formatQuotaNote,
} from '../js/ui/charts.js';
import { enrichSpec } from '../js/compute.js';

describe('chart helpers', () => {
  it('summarizes statuses', () => {
    const c = summarizeStatuses([
      { status: 'safe' },
      { status: 'safe' },
      { status: 'risk' },
      { status: 'below' },
    ]);
    assert.deepEqual(c, { safe: 2, risk: 1, below: 1, neutral: 0 });
  });

  it('builds chance data for visual track', () => {
    const row = enrichSpec(
      {
        ranges: ['400 - 390', '389 - 380', '379 и менее'],
        buckets: [5, 10, 20],
        plan: 10,
      },
      385,
    );
    assert.ok(row.chance);
    assert.ok(row.chance.segments.length >= 1);
    assert.equal(typeof row.chance.seatCutRatio, 'number');
  });

  it('places the out-zone at the right edge of the seat-cut bucket', () => {
    assert.equal(resolveHistCutIndex([5, 10, 20, 8], 12), 1);
    assert.equal(histOutZoneLeftPct(1, 4), 50);
    assert.equal(histOutZoneLeftPct(-1, 4), null);
    assert.equal(histOutZoneLeftPct(3, 4), null);
    assert.equal(resolveHistCutIndex([5, 10], 0), -1);
  });

  it('formats quota caption with БВИ / целевые / вне', () => {
    const text = formatQuotaCaption({
      planOfficial: 32,
      admittedNoExam: 8,
      enrolledTargeted: 0,
      planTargeted: 0,
      admittedOutOfCompetition: 0,
      openPlan: 24,
    });
    assert.match(text, /План 32/);
    assert.match(text, /БВИ 8/);
    assert.match(text, /в общем 24/);
    assert.equal(
      formatQuotaNote({
        planOfficial: 32,
        admittedNoExam: 8,
        enrolledTargeted: 0,
        planTargeted: 0,
        admittedOutOfCompetition: 0,
        openPlan: 24,
      }),
      'Из плана 32: без вступительных 8 · целевые 0 · вне конкурса 0 → в общем конкурсе 24 места',
    );
    assert.match(
      formatQuotaCaptionCompact({
        planOfficial: 32,
        admittedNoExam: 8,
        enrolledTargeted: 0,
        planTargeted: 0,
        admittedOutOfCompetition: 0,
        openPlan: 24,
      }),
      /БВИ 8 — в общем конкурсе 24 из 32/,
    );
  });
});
