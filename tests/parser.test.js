import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseScoreBucketTables,
  resolvePlanApps,
  extractTables,
  isRangeHeader,
  dedupeSpecs,
  mapFormk1LeftColumns,
} from '../scripts/scrape/normalize.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) =>
  readFileSync(join(here, 'fixtures', 'formk1', name), 'utf8');

const sampleHtml = `
<table>
  <tr>
    <td>Группа</td><td>Специальность</td><td>План</td><td>Подано</td>
    <td>391 и более</td><td>390 - 386</td><td>385 - 381</td><td>380 - 376</td><td>375 - 371</td><td>370 и менее</td>
  </tr>
  <tr>
    <td></td><td>биохимия</td><td>10</td><td>12</td>
    <td>0</td><td>1</td><td>2</td><td>4</td><td>3</td><td>2</td>
  </tr>
  <tr>
    <td>группа А</td><td>микробиология</td><td>20</td><td>21</td>
    <td>1</td><td>2</td><td>3</td><td>5</td><td>4</td><td>4</td>
  </tr>
</table>
`;

describe('parseScoreBucketTables', () => {
  it('detects range headers', () => {
    assert.equal(isRangeHeader('391 и более'), true);
    assert.equal(isRangeHeader('390 - 386'), true);
    assert.equal(isRangeHeader('400- 396'), true);
    assert.equal(isRangeHeader('Специальность'), false);
  });

  it('parses specialties and passing', () => {
    const rows = parseScoreBucketTables(sampleHtml, {
      universityId: 'demo',
      facultyId: '7',
      facultyName: 'Биологический',
      sourceUrl: 'https://example.test',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    assert.equal(rows.length, 2);
    assert.equal(rows[0].specName, 'биохимия');
    assert.equal(rows[0].plan, 10);
    assert.equal(rows[0].estimatedPassing, 371);
    assert.equal(rows[1].groupName, 'группа А');
    assert.equal(rows[1].buckets.reduce((a, b) => a + b, 0), 19);
  });

  it('dedupes preferring richer buckets', () => {
    const a = {
      universityId: 'x', facultyId: '1', form: '', specName: 'a', plan: 10,
      buckets: [1, 0, 0],
    };
    const b = { ...a, buckets: [1, 2, 3] };
    const out = dedupeSpecs([a, b]);
    assert.equal(out.length, 1);
    assert.deepEqual(out[0].buckets, [1, 2, 3]);
  });
});

describe('mapFormk1LeftColumns', () => {
  it('maps form 32 leaf headers including по конкурсу', () => {
    const map = mapFormk1LeftColumns([
      'план приема',
      'подано',
      'Специальность',
      'всего',
      'В т.ч. на целевую контрактную подготовку',
      'на условиях оплаты',
      'Всего',
      'на условиях целевой подготовки (зачислены)',
      'без вступительных испытаний',
      'вне конкурса',
      'по конкурсу',
    ]);
    assert.equal(map.plan, 3);
    assert.equal(map.planTargeted, 4);
    assert.equal(map.totalApps, 6);
    assert.equal(map.enrolledTargeted, 7);
    assert.equal(map.admittedNoExam, 8);
    assert.equal(map.admittedOutOfCompetition, 9);
    assert.equal(map.inCompetition, 10);
  });

  it('maps paid-track plan label (form 7 style)', () => {
    const map = mapFormk1LeftColumns([
      'план приема',
      'подано заявлений от абитуриентов',
      'Специальность',
      'План приема на условиях оплаты',
      'Всего',
      'без вступительных испытаний',
      'вне конкурса',
      'по конкурсу',
    ]);
    assert.equal(map.plan, 3);
    assert.equal(map.totalApps, 4);
    assert.equal(map.admittedNoExam, 5);
    assert.equal(map.admittedOutOfCompetition, 6);
    assert.equal(map.inCompetition, 7);
    assert.equal(map.planTargeted, null);
    assert.equal(map.enrolledTargeted, null);
  });
});

describe('resolvePlanApps', () => {
  it('uses Всего (≥ bucket sum) and aligns inCompetition to bands', () => {
    // form2 биология left nums: plan, target, ?, Всего, … mid junk
    const out = resolvePlanApps([9, 0, 5, 11, 1, 1], 10);
    assert.equal(out.plan, 9);
    assert.equal(out.totalApps, 11);
    assert.equal(out.inCompetition, 10);
  });

  it('does not steal целевое when apps are honestly zero', () => {
    const out = resolvePlanApps([10, 5, 0, 0], 0);
    assert.equal(out.plan, 10);
    assert.equal(out.totalApps, 0);
    assert.equal(out.inCompetition, 0);
  });
});

describe('extractTables rowspan', () => {
  it('keeps rowspan cells occupying subsequent rows', () => {
    const html = `
      <table>
        <tr><td rowspan="2">Spec</td><td>A</td><td>B</td></tr>
        <tr><td>1</td><td>2</td></tr>
      </table>`;
    const [rows] = extractTables(html);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].length, 3);
    assert.equal(rows[1].length, 3);
    assert.match(rows[0][0], /Spec/);
    assert.match(rows[1][0], /Spec/);
    assert.match(rows[1][1], /1/);
  });
});

describe('formk1 golden slices', () => {
  it('form 2 биология: Всего / band sum', () => {
    const rows = parseScoreBucketTables(fixture('slice-2-biology.html'), {
      universityId: 'sb-bsu',
      form: '2',
      sourceUrl: 'https://abit.bsu.by/formk1?id=2',
      updatedAt: '2026-07-15T00:00:00.000Z',
    });
    const bio = rows.find((r) => r.specName === 'биология');
    assert.ok(bio);
    assert.equal(bio.plan, 9);
    assert.equal(bio.totalApps, 11);
    const bsum = bio.buckets.reduce((a, b) => a + b, 0);
    assert.equal(bio.inCompetition, bsum);
    assert.ok(bio.totalApps >= bio.inCompetition);
    assert.equal(bio.quotaParseOk, true);
    assert.equal(bio.admittedNoExam, 1);
    assert.equal(bio.admittedOutOfCompetition, 0);
    assert.equal(bio.taken, 1);
    assert.equal(bio.openPlan, 8);
  });

  it('form 32 биология: Всего 37 / по конкурсу ≈ bands + quotas', () => {
    const rows = parseScoreBucketTables(fixture('slice-32-biology.html'), {
      universityId: 'sb-bsu',
      form: '32',
      sourceUrl: 'https://abit.bsu.by/formk1?id=32',
      updatedAt: '2026-07-15T00:00:00.000Z',
    });
    const bio = rows.find((r) => r.specName === 'биология');
    assert.ok(bio);
    assert.equal(bio.plan, 55);
    assert.equal(bio.totalApps, 37);
    const bsum = bio.buckets.reduce((a, b) => a + b, 0);
    assert.equal(bio.inCompetition, bsum);
    assert.equal(bsum, 18);
    assert.equal(bio.quotaParseOk, true);
    assert.equal(bio.planTargeted, 2);
    assert.equal(bio.enrolledTargeted, 2);
    assert.equal(bio.admittedNoExam, 17);
    assert.equal(bio.admittedOutOfCompetition, 0);
    assert.equal(bio.taken, 19);
    assert.equal(bio.openPlan, 36);
  });

  it('form 32 биоинженерия: openPlan 24 flips underfilled lie', () => {
    const rows = parseScoreBucketTables(fixture('slice-32-biology.html'), {
      universityId: 'sb-bsu',
      form: '32',
      sourceUrl: 'https://abit.bsu.by/formk1?id=32',
      updatedAt: '2026-07-15T00:00:00.000Z',
    });
    const row = rows.find((r) => /биоинженерия/i.test(r.specName));
    assert.ok(row);
    assert.equal(row.plan, 32);
    assert.equal(row.admittedNoExam, 8);
    assert.equal(row.admittedOutOfCompetition, 0);
    assert.equal(row.inCompetition, 31);
    assert.equal(row.taken, 8);
    assert.equal(row.openPlan, 24);
    assert.ok(row.estimatedPassing != null);
  });

  it('form 32 FMO конфликтология: 8 БВИ → 2 места в общем', () => {
    const rows = parseScoreBucketTables(fixture('slice-32-fmo-conflict.html'), {
      universityId: 'sb-bsu',
      form: '32',
      facultyName: 'Факультет международных отношений',
      sourceUrl: 'https://abit.bsu.by/formk1?id=32',
      updatedAt: '2026-07-17T00:00:00.000Z',
    });
    const row = rows.find((r) => /конфликтолог/i.test(r.specName));
    assert.ok(row, 'expected международная конфликтология');
    assert.equal(row.plan, 10);
    assert.equal(row.planPaid, 10);
    assert.equal(row.admittedNoExam, 8);
    assert.equal(row.admittedOutOfCompetition, 0);
    assert.equal(row.inCompetition, 4);
    assert.equal(row.taken, 8);
    assert.equal(row.openPlan, 2);
    assert.equal(row.quotaParseOk, true);
    assert.ok(row.estimatedPassing != null);
  });

  it('form 29 правоведение (м): Всего 19 / bands 14', () => {
    const rows = parseScoreBucketTables(fixture('slice-29-military.html'), {
      universityId: 'sb-bsu',
      form: '29',
      sourceUrl: 'https://abit.bsu.by/formk1?id=29',
      updatedAt: '2026-07-15T00:00:00.000Z',
    });
    const law = rows.find((r) =>
      /правоведение/i.test(r.specName) && /\(м\)/i.test(r.specName),
    );
    assert.ok(law, 'expected male правоведение row');
    assert.equal(law.plan, 10);
    assert.equal(law.totalApps, 19);
    const bsum = law.buckets.reduce((a, b) => a + b, 0);
    assert.equal(law.inCompetition, bsum);
    assert.equal(bsum, 14);
    assert.equal(law.quotaParseOk, true);
    assert.equal(law.admittedNoExam, 5);
    assert.equal(law.openPlan, 5);
  });
});
