import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeFormk1 } from '../scripts/scrape/proxy.mjs';

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
