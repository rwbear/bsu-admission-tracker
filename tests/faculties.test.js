import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shortFacultyLabel,
  facultyKey,
  resolveFacultyId,
  sortFaculties,
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

  it('sorts Institute of Business first', () => {
    const sorted = sortFaculties([
      { id: 'y', name: 'Юридический факультет' },
      { id: 'b', name: 'Институт бизнеса БГУ' },
      { id: 'a', name: 'Биологический факультет' },
    ]);
    assert.equal(sorted[0].id, 'b');
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
