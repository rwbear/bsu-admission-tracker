/**
 * Pure helpers for the auto-refresh countdown (load → wait → refresh).
 */

/** When the snapshot is older than this, chase raw/Pages for a newer scrape. */
export const STALE_AFTER_MS = 12 * 60_000;
/** Poll cadence while chasing a stale/missing snapshot. */
export const STALE_POLL_MS = 30_000;

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
 * Allow `?pollMs=3000` for local verification without waiting the full interval.
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
 * Use a short poll when the committed snapshot looks behind the scrape cadence.
 * @param {number} defaultMs
 * @param {string | null | undefined} updatedAt
 * @param {number} [now]
 * @param {number} [staleAfterMs]
 * @param {number} [stalePollMs]
 */
export function resolveEffectivePollMs(
  defaultMs,
  updatedAt,
  now = Date.now(),
  staleAfterMs = STALE_AFTER_MS,
  stalePollMs = STALE_POLL_MS,
) {
  if (!updatedAt) return Math.min(defaultMs, stalePollMs);
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t)) return Math.min(defaultMs, stalePollMs);
  if (now - t >= staleAfterMs) return Math.min(defaultMs, stalePollMs);
  return defaultMs;
}

/**
 * @param {string | null | undefined} updatedAt
 * @param {number} [now]
 * @param {number} [staleAfterMs]
 */
export function isSnapshotStale(
  updatedAt,
  now = Date.now(),
  staleAfterMs = STALE_AFTER_MS,
) {
  if (!updatedAt) return true;
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t)) return true;
  return now - t >= staleAfterMs;
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

/**
 * Header live-state for the update timer / live-dot.
 * Priority: fetching > chase > idle.
 * @param {{
 *   refreshing: boolean,
 *   updatedAt?: string | null,
 *   now?: number,
 *   staleAfterMs?: number,
 * }} opts
 * @returns {'idle' | 'fetching' | 'chase'}
 */
export function resolveLiveState(opts) {
  const {
    refreshing,
    updatedAt = null,
    now = Date.now(),
    staleAfterMs = STALE_AFTER_MS,
  } = opts;
  if (refreshing) return 'fetching';
  if (!updatedAt) return 'chase';
  if (isSnapshotStale(updatedAt, now, staleAfterMs)) return 'chase';
  return 'idle';
}
