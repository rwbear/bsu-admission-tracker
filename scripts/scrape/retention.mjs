/**
 * Retention helpers extracted from run.mjs so they can be unit-tested
 * without executing the full scrape pipeline.
 */

/**
 * Retention flags must publish even when specialty rows are unchanged —
 * otherwise the client never learns a form/table failed this run.
 * @param {object | null | undefined} next
 * @param {object | null | undefined} prev
 */
export function retentionStateChanged(next, prev) {
  const nextPrev = Boolean(next?.scrapeMeta?.retainedPrevious);
  const prevPrev = Boolean(prev?.scrapeMeta?.retainedPrevious);
  if (nextPrev !== prevPrev) return true;
  const a = JSON.stringify(
    [...(next?.scrapeMeta?.retainedFormIds || [])].map(String).sort(),
  );
  const b = JSON.stringify(
    [...(prev?.scrapeMeta?.retainedFormIds || [])].map(String).sort(),
  );
  return a !== b;
}
