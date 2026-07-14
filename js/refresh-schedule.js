/**
 * Pure helpers for the auto-refresh countdown (load → wait → refresh).
 */

/**
 * @param {number} totalSec
 */
export function formatCountdown(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Allow `?pollMs=3000` for local verification without waiting 5 minutes.
 * Clamped so a typo cannot hammer GitHub's API.
 * @param {number} defaultMs
 * @param {string} search
 */
export function resolvePollMs(defaultMs, search = '') {
  try {
    const raw = new URLSearchParams(search).get('pollMs');
    if (raw == null || raw === '') return defaultMs;
    const n = Number(raw);
    if (!Number.isFinite(n)) return defaultMs;
    return Math.min(Math.max(1_000, Math.floor(n)), defaultMs);
  } catch {
    return defaultMs;
  }
}

/**
 * @param {number} fromMs
 * @param {number} pollMs
 */
export function nextDueAt(fromMs, pollMs) {
  return fromMs + pollMs;
}

/**
 * Whether the schedule says we should refresh now.
 * @param {number} now
 * @param {number} nextRefreshAt
 * @param {boolean} refreshing
 * @param {boolean} pageVisible
 */
export function shouldRefreshNow(now, nextRefreshAt, refreshing, pageVisible) {
  if (refreshing) return false;
  if (!pageVisible) return false;
  if (!nextRefreshAt) return false;
  return now >= nextRefreshAt;
}
