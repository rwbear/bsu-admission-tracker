import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shortFacultyLabel,
  facultyKey,
  resolveFacultyId,
  sortFaculties,
  filterFacultiesByName,
  matchSpecialtyIdBySearch,
  normalizeFacultySearch,
  FACULTY_ALIASES,
  DEFAULT_FACULTY_ID,
} from '../js/faculties.js';
import {
  filterFacultySections,
  splitFacultySections,
} from '../scripts/scrape/normalize.mjs';

describe('faculty labels', () => {
  it('shortens Institute of Business title', () => {
    assert.equal(
      shortFacultyLabel(
        'Институт бизнеса Белорусского государственного университета',
      ),
      'Институт бизнеса БГУ',
    );
  });

  it('builds stable keys', () => {
    assert.equal(
      facultyKey('Институт бизнеса Белорусского государственного университета'),
      'институт-бизнеса-бгу',
    );
  });

  it('defaults to Institute of Business when present', () => {
    const faculties = [
      { id: 'a', name: 'Биологический факультет' },
      { id: 'b', name: 'Институт бизнеса БГУ' },
    ];
    assert.equal(resolveFacultyId(faculties, null), 'b');
    assert.equal(resolveFacultyId(faculties, 'a'), 'a');
    assert.equal(resolveFacultyId(faculties, 'missing'), 'b');
  });

  it('keeps Institute of Business as start default with empty list', () => {
    assert.equal(resolveFacultyId([], null), DEFAULT_FACULTY_ID);
    assert.equal(resolveFacultyId(null, null), DEFAULT_FACULTY_ID);
  });

  it('prefers default id when present in list', () => {
    const faculties = [
      { id: 'a', name: 'Биологический факультет' },
      { id: DEFAULT_FACULTY_ID, name: 'Институт бизнеса БГУ' },
    ];
    assert.equal(resolveFacultyId(faculties, null), DEFAULT_FACULTY_ID);
  });

  it('sorts Institute of Business first', () => {
    const sorted = sortFaculties([
      { id: 'y', name: 'Юридический факультет' },
      { id: 'b', name: 'Институт бизнеса БГУ' },
      { id: 'a', name: 'Биологический факультет' },
    ]);
    assert.equal(sorted[0].id, 'b');
  });

  it('filters faculties by name (silence search)', () => {
    const list = [
      { id: 'юридический-факультет', name: 'Юридический факультет' },
      { id: 'институт-бизнеса-бгу', name: 'Институт бизнеса БГУ' },
      { id: 'биологический-факультет', name: 'Биологический факультет' },
    ];
    const hit = filterFacultiesByName(list, 'био');
    assert.equal(hit.length, 1);
    assert.equal(hit[0].id, 'биологический-факультет');
    assert.equal(filterFacultiesByName(list, 'xyz').length, 0);
    assert.equal(filterFacultiesByName(list, '').length, 3);
  });

  it('finds faculties by campus abbreviations (ФМО, СКК, юрфак)', () => {
    const list = [
      {
        id: 'факультет-международных-отношений',
        name: 'Факультет международных отношений',
      },
      {
        id: 'факультет-социокультурных-коммуникаций',
        name: 'Факультет социокультурных коммуникаций',
      },
      { id: 'юридический-факультет', name: 'Юридический факультет' },
      { id: 'мехмат-пми-си', name: 'Мехмат / ПМИ / СИ' },
    ];
    assert.equal(filterFacultiesByName(list, 'фмо')[0]?.id, list[0].id);
    assert.equal(filterFacultiesByName(list, 'ФМО')[0]?.id, list[0].id);
    assert.equal(filterFacultiesByName(list, 'скк')[0]?.id, list[1].id);
    assert.equal(filterFacultiesByName(list, 'юрфак')[0]?.id, list[2].id);
    assert.equal(filterFacultiesByName(list, 'пми')[0]?.id, list[3].id);
    assert.ok(FACULTY_ALIASES['факультет-международных-отношений'].includes('фмо'));
  });

  it('finds faculty by specialty name (table-scoped)', () => {
    const list = [
      { id: 'институт-бизнеса-бгу', name: 'Институт бизнеса БГУ' },
      { id: 'юридический-факультет', name: 'Юридический факультет' },
      {
        id: 'факультет-международных-отношений',
        name: 'Факультет международных отношений',
      },
    ];
    const specs = [
      {
        facultyId: 'институт-бизнеса-бгу',
        specName: 'бизнес-администрирование',
      },
      { facultyId: 'юридический-факультет', specName: 'правоведение' },
      {
        facultyId: 'факультет-международных-отношений',
        specName: 'международная конфликтология',
      },
    ];
    const hit = filterFacultiesByName(list, 'Бизнес-администрирование', specs);
    assert.equal(hit.length, 1);
    assert.equal(hit[0].id, 'институт-бизнеса-бгу');

    // Hyphen / space / ё normalization
    assert.equal(
      filterFacultiesByName(list, 'бизнес администрирование', specs)[0]?.id,
      'институт-бизнеса-бгу',
    );
    assert.equal(
      filterFacultiesByName(list, 'конфликтология', specs)[0]?.id,
      'факультет-международных-отношений',
    );

    // Without specialty index, specialty query must not invent hits
    assert.equal(
      filterFacultiesByName(list, 'бизнес-администрирование', []).length,
      0,
    );
  });

  it('resolves specialty id from search query under a faculty', () => {
    const specs = [
      {
        id: 'biz-admin',
        facultyId: 'институт-бизнеса-бгу',
        specName: 'бизнес-администрирование',
      },
      {
        id: 'biz-info',
        facultyId: 'институт-бизнеса-бгу',
        specName: 'информационные ресурсы',
      },
      {
        id: 'law',
        facultyId: 'юридический-факультет',
        specName: 'правоведение',
      },
    ];
    assert.equal(
      matchSpecialtyIdBySearch(specs, 'институт-бизнеса-бгу', 'бизнес'),
      'biz-admin',
    );
    assert.equal(
      matchSpecialtyIdBySearch(specs, 'институт-бизнеса-бгу', 'информационные'),
      'biz-info',
    );
    // Wrong faculty → no match
    assert.equal(
      matchSpecialtyIdBySearch(specs, 'юридический-факультет', 'бизнес'),
      null,
    );
    // Too short for specialty search
    assert.equal(
      matchSpecialtyIdBySearch(specs, 'институт-бизнеса-бгу', 'би'),
      null,
    );
  });

  it('normalizes search punctuation and ё', () => {
    assert.equal(
      normalizeFacultySearch('Бизнес-администрирование'),
      'бизнес администрирование',
    );
    assert.equal(normalizeFacultySearch('ёлка'), 'елка');
  });
});

describe('faculty section filter', () => {
  const html = `
      <table>
        <tr><td class="fl" colspan="65"><font>Биологический факультет</font></td></tr>
        <tr><td>биология</td><td>10</td><td>1</td></tr>
        <tr><td class="fl" colspan="65"><font>Институт бизнеса Белорусского государственного университета</font></td></tr>
        <tr><td>бизнес-администрирование</td><td>75</td><td>28</td></tr>
        <tr><td class="fl" colspan="65"><font>Юридический факультет</font></td></tr>
        <tr><td>правоведение</td><td>110</td><td>27</td></tr>
      </table>
    `;

  it('keeps only matching faculty blocks', () => {
    const out = filterFacultySections(html, ['Институт бизнеса']);
    assert.match(out, /бизнес-администрирование/);
    assert.doesNotMatch(out, /биология/);
    assert.doesNotMatch(out, /правоведение/);
  });

  it('splits all faculty sections', () => {
    const sections = splitFacultySections(html);
    assert.equal(sections.length, 3);
    assert.match(sections[0].title, /Биологический/);
    assert.match(sections[1].title, /Институт бизнеса/);
    assert.match(sections[2].title, /Юридический/);
  });
});
