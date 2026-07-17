import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldAutoOpenMoreDetails } from '../js/ui/detail-density.js';

describe('detail density', () => {
  it('stays closed on normal taken>0 (конфликтология)', () => {
    assert.equal(
      shouldAutoOpenMoreDetails({
        quotaParseOk: true,
        showQuota: true,
        taken: 8,
        planOfficial: 10,
        plan: 2,
      }),
      false,
    );
  });

  it('opens when quota parse failed and no slab', () => {
    assert.equal(
      shouldAutoOpenMoreDetails({ quotaParseOk: false, showQuota: false }),
      true,
    );
  });

  it('opens when taken exceeds plan', () => {
    assert.equal(
      shouldAutoOpenMoreDetails({
        quotaParseOk: true,
        showQuota: true,
        taken: 12,
        planOfficial: 10,
      }),
      true,
    );
  });

  it('opens on retained snapshot meta', () => {
    assert.equal(
      shouldAutoOpenMoreDetails(
        { quotaParseOk: true, showQuota: false, taken: 0, plan: 10 },
        { retainedPrevious: true },
      ),
      true,
    );
    assert.equal(
      shouldAutoOpenMoreDetails(
        { form: '32', quotaParseOk: true, showQuota: false, taken: 0 },
        { retainedFormIds: ['32'] },
      ),
      true,
    );
  });
});
