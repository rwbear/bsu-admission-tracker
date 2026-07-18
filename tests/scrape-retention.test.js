import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { retentionStateChanged } from '../scripts/scrape/retention.mjs';

/**
 * Mirror of the classifier in `scripts/scrape/adapters/formk1.mjs` for
 * parseAll mode. Kept as a tiny pure function so an empty-shell fixture
 * or unparseable body can never be silently rewritten as "ok".
 */
function classifyFormk1Result({ sections, addedRows }) {
  const failedFormIds = [];
  const okFormIds = [];
  if (!sections.length) {
    failedFormIds.push('EMPTY');
    return { failedFormIds, okFormIds };
  }
  if (!addedRows) {
    failedFormIds.push('HEADER_ONLY');
    return { failedFormIds, okFormIds };
  }
  okFormIds.push('OK');
  return { failedFormIds, okFormIds };
}

describe('retentionStateChanged', () => {
  it('returns false when both payloads share retention state', () => {
    const a = { scrapeMeta: { retainedPrevious: false, retainedFormIds: [] } };
    const b = { scrapeMeta: { retainedPrevious: false, retainedFormIds: [] } };
    assert.equal(retentionStateChanged(a, b), false);
  });

  it('flips when retainedPrevious flag changes', () => {
    const prev = { scrapeMeta: { retainedPrevious: false, retainedFormIds: [] } };
    const next = { scrapeMeta: { retainedPrevious: true, retainedFormIds: [] } };
    assert.equal(retentionStateChanged(next, prev), true);
    assert.equal(retentionStateChanged(prev, next), true);
  });

  it('flips when retainedFormIds set changes', () => {
    const prev = { scrapeMeta: { retainedFormIds: ['7'] } };
    const next = { scrapeMeta: { retainedFormIds: ['7', '32'] } };
    assert.equal(retentionStateChanged(next, prev), true);
  });

  it('ignores form id ordering and numeric/string mixing', () => {
    const prev = { scrapeMeta: { retainedFormIds: ['32', 7] } };
    const next = { scrapeMeta: { retainedFormIds: [7, '32'] } };
    assert.equal(retentionStateChanged(next, prev), false);
  });

  it('treats missing scrapeMeta as clean state', () => {
    assert.equal(retentionStateChanged(null, null), false);
    assert.equal(retentionStateChanged({}, undefined), false);
    assert.equal(
      retentionStateChanged({ scrapeMeta: { retainedPrevious: true } }, {}),
      true,
    );
  });

  it('flags a transition back to healthy (retention cleared)', () => {
    const prev = { scrapeMeta: { retainedPrevious: true, retainedFormIds: ['7'] } };
    const next = { scrapeMeta: { retainedPrevious: false, retainedFormIds: [] } };
    assert.equal(retentionStateChanged(next, prev), true);
  });
});

describe('formk1 empty→failedFormIds honesty', () => {
  it('classifies zero sections as failed, not ok', () => {
    const { failedFormIds, okFormIds } = classifyFormk1Result({
      sections: [],
      addedRows: 0,
    });
    assert.deepEqual(failedFormIds, ['EMPTY']);
    assert.deepEqual(okFormIds, []);
  });

  it('classifies header-only (added===0) as failed, not ok', () => {
    const { failedFormIds, okFormIds } = classifyFormk1Result({
      sections: [{ title: 'x', html: '' }],
      addedRows: 0,
    });
    assert.deepEqual(failedFormIds, ['HEADER_ONLY']);
    assert.deepEqual(okFormIds, []);
  });

  it('classifies added>0 as ok', () => {
    const { failedFormIds, okFormIds } = classifyFormk1Result({
      sections: [{ title: 'x', html: '<tr><td>1</td></tr>' }],
      addedRows: 3,
    });
    assert.deepEqual(failedFormIds, []);
    assert.deepEqual(okFormIds, ['OK']);
  });
});
