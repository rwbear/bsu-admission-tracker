/**
 * Whether «Подробные данные» should open itself (structural anomalies only).
 * @param {object} row
 * @param {{ retainedPrevious?: boolean, retainedFormIds?: string[] }} [meta]
 */
export function shouldAutoOpenMoreDetails(row, meta = {}) {
  if (!row) return false;
  const planOfficial = Number(row.planOfficial ?? row.plan) || 0;
  const taken = Number(row.taken) || 0;
  if (row.quotaParseOk === false && !row.showQuota) return true;
  if (row.quotaParseOk === true && taken > planOfficial) return true;
  if (meta.retainedPrevious) return true;
  const form = String(row.form || '');
  if (form && Array.isArray(meta.retainedFormIds) && meta.retainedFormIds.includes(form)) {
    return true;
  }
  return false;
}
