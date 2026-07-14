import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterFacultySections } from '../scripts/scrape/normalize.mjs';
import { looksLikeFormk1 } from '../scripts/scrape/proxy.mjs';

describe('faculty section filter', () => {
  it('keeps only matching faculty blocks', () => {
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
    const out = filterFacultySections(html, ['Институт бизнеса']);
    assert.match(out, /бизнес-администрирование/);
    assert.doesNotMatch(out, /биология/);
    assert.doesNotMatch(out, /правоведение/);
  });
});

describe('formk1 probe', () => {
  it('rejects tiny shells', () => {
    assert.equal(looksLikeFormk1('ok'), false);
    assert.equal(looksLikeFormk1('x'.repeat(3000)), false);
  });

  it('accepts monitoring markers', () => {
    const ranges = Array.from(
      { length: 10 },
      (_, i) => `${400 - i * 5} - ${396 - i * 5}`,
    ).join(' ');
    const text = `Абитуриент monitoring ${ranges}${'y'.repeat(2000)}`;
    assert.equal(looksLikeFormk1(text), true);
    assert.equal(
      looksLikeFormk1(`prefix Abit_K11_TableResults ${'z'.repeat(2500)}`),
      true,
    );
  });
});
