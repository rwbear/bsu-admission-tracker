import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseScoreBucketTables, isRangeHeader, dedupeSpecs } from '../scripts/scrape/normalize.mjs';

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
