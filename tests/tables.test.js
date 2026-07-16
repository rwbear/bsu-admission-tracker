import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TABLE_ID,
  facultiesForTable,
  filterTablesByQuery,
  groupTablesByTrack,
  listCatalogTables,
  resolveTableId,
  shortTableLabel,
  sourceUrlForTable,
  tableById,
} from '../js/tables.js';

describe('BSU monitoring tables', () => {
  it('catalogs all 13 hub tables with default id=7', () => {
    const tables = listCatalogTables();
    assert.equal(tables.length, 13);
    assert.equal(DEFAULT_TABLE_ID, '7');
    assert.ok(tables.some((t) => t.id === '7' && t.default));
    assert.deepEqual(
      tables.map((t) => t.id).sort((a, b) => Number(a) - Number(b)),
      ['2', '5', '6', '7', '8', '13', '16', '17', '21', '22', '29', '32', '34'],
    );
  });

  it('stays in sync with sources/bsu-tables.json ids', async () => {
    const { readFileSync } = await import('node:fs');
    const src = JSON.parse(
      readFileSync(new URL('../sources/bsu-tables.json', import.meta.url), 'utf8'),
    );
    const sourceIds = (src.tables || [])
      .map((t) => String(t.id))
      .sort((a, b) => Number(a) - Number(b));
    const clientIds = listCatalogTables()
      .map((t) => String(t.id))
      .sort((a, b) => Number(a) - Number(b));
    assert.deepEqual(clientIds, sourceIds);
  });

  it('resolves saved / default table ids', () => {
    const tables = listCatalogTables();
    assert.equal(resolveTableId(tables, '8'), '8');
    assert.equal(resolveTableId(tables, 'missing'), '7');
    assert.equal(resolveTableId([], null), '7');
  });

  it('builds compact labels and source urls', () => {
    const t = tableById('7');
    assert.match(shortTableLabel(t), /3 сертификата/i);
    assert.match(shortTableLabel(t), /платн/i);
    assert.equal(sourceUrlForTable('7'), 'https://abit.bsu.by/formk1?id=7');
  });

  it('groups by track and filters search', () => {
    const groups = groupTablesByTrack(listCatalogTables());
    assert.equal(groups.length, 3);
    assert.equal(groups[0].track.id, 'cert3');
    assert.ok(filterTablesByQuery(listCatalogTables(), 'скк').length >= 2);
    assert.ok(filterTablesByQuery(listCatalogTables(), 'бюджет').length >= 4);
  });

  it('lists faculties only for the selected monitoring table', () => {
    const specs = [
      { form: '7', facultyId: 'biz', facultyName: 'Бизнес' },
      { form: '7', facultyId: 'biz', facultyName: 'Бизнес' },
      { form: '8', facultyId: 'bio', facultyName: 'Био' },
    ];
    const fac7 = facultiesForTable(specs, '7');
    assert.equal(fac7.length, 1);
    assert.equal(fac7[0].id, 'biz');
    assert.equal(fac7[0].specialtyCount, 2);
    assert.equal(facultiesForTable(specs, '8')[0].id, 'bio');
  });
});
