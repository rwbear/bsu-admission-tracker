/**
 * Header status rotator: age and countdown share one slot.
 * Swap is sequential (out → gap → in), never a crossfade overlay.
 * Countdown stays visible longer than the last-update age.
 */

export const META_AGE_MS = 3_500;
export const META_COUNTDOWN_MS = 8_000;
export const META_CYCLE_MS = META_AGE_MS + META_COUNTDOWN_MS;

/** Single-leg fade duration (out or in). Keep in sync with CSS. */
export const META_FADE_MS = 720;

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

/**
 * Fade delay for one leg; 0 when reduced motion is preferred.
 * @param {boolean} [reducedMotion]
 */
export function metaFadeMs(reducedMotion = false) {
  return reducedMotion ? 0 : META_FADE_MS;
}
