/**
 * Header status rotator: age and countdown share one slot (fade between).
 * Countdown stays visible longer than the last-update age.
 */

export const META_AGE_MS = 3_500;
export const META_COUNTDOWN_MS = 8_000;
export const META_CYCLE_MS = META_AGE_MS + META_COUNTDOWN_MS;

/**
 * Which line should be active in the shared slot.
 * @param {number} elapsedMs time since rotator epoch
 * @param {{ hasCountdown?: boolean, refreshing?: boolean, ageMs?: number, countdownMs?: number }} [opts]
 * @returns {'age' | 'countdown'}
 */
export function metaRotatorPhase(elapsedMs, opts = {}) {
  if (opts.refreshing) return 'countdown';
  if (opts.hasCountdown === false) return 'age';

  const ageMs = opts.ageMs ?? META_AGE_MS;
  const countdownMs = opts.countdownMs ?? META_COUNTDOWN_MS;
  const cycle = ageMs + countdownMs;
  if (cycle <= 0) return 'age';

  const t = ((elapsedMs % cycle) + cycle) % cycle;
  return t < ageMs ? 'age' : 'countdown';
}
