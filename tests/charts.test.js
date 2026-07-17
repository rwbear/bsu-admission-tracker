import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  summarizeStatuses,
  resolveHistCutIndex,
  histOutZoneLeftPct,
  histSeatBudget,
  shouldDrawHistCut,
  histPeopleAroundCut,
  pickHistCapIndices,
  buildHistCaption,
  buildHistAriaLabel,
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

  it('hist cut uses openPlan, not official plan', () => {
    // биоинженерия-style: plan 32, openPlan 24
    assert.equal(histSeatBudget({ plan: 32, openPlan: 24 }), 24);
    assert.equal(histSeatBudget({ plan: 32, openPlan: 0 }), 0);
    assert.equal(histSeatBudget({ plan: 10 }), 10);
    assert.equal(shouldDrawHistCut({ quotaParseOk: true }), true);
    assert.equal(shouldDrawHistCut({}), true);
    assert.equal(shouldDrawHistCut({ quotaParseOk: false }), false);

    const buckets = [8, 8, 8, 8, 20];
    assert.equal(resolveHistCutIndex(buckets, 24), 2);
    assert.equal(resolveHistCutIndex(buckets, 32), 3);
    const around = histPeopleAroundCut(buckets, 2);
    assert.deepEqual(around, { left: 24, right: 28, total: 52 });
  });

  it('picks tall-bar caps excluding mine and short bars', () => {
    const caps = pickHistCapIndices([50, 40, 30, 5, 45], 4);
    assert.deepEqual(
      caps.map((c) => c.i),
      [0, 1, 2],
    );
    assert.equal(caps[0].rank, 1);
    assert.equal(caps[0].count, 50);
    // mine at 0 → skip peak
    assert.deepEqual(
      pickHistCapIndices([50, 40, 30], 0).map((c) => c.i),
      [1, 2],
    );
    // below 40% of max → out
    assert.deepEqual(pickHistCapIndices([100, 30, 20], -1).map((c) => c.i), [0]);
  });

  it('builds ridge caption and aria', () => {
    const row = {
      ranges: ['400 - 390', '389 - 380', '379 и менее'],
      buckets: [5, 10, 20],
      chance: {
        segments: [{ isMine: false }, { isMine: true }, { isMine: false }],
      },
    };
    assert.match(buildHistCaption(row, 385), /по конкурсу · 35 чел/);
    assert.match(buildHistCaption(row, 385), /твой балл — в интервале 389 - 380/);
    assert.match(
      buildHistAriaLabel({
        total: 35,
        left: 15,
        right: 20,
        openPlan: 12,
        cutDrawn: true,
        mineLabel: '389 - 380',
        quotaOk: true,
      }),
      /в пределах 12 мест/,
    );
    assert.match(
      buildHistAriaLabel({ total: 35, quotaOk: false, cutDrawn: false }),
      /^Распределение по интервалам баллов$/,
    );
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
