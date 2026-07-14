/** Site + data origin for GitHub Pages. */
export const CONFIG = {
  universityId: 'sb-bsu',
  sourceUrl: 'https://abit.bsu.by/formk1?id=7',
  /** Fallback if data/index.json has no origin yet. */
  repo: 'rwbear/bsu-admission-tracker',
  dataBranch: 'cursor/admission-tracker-rebuild-be86',
  /** Client auto-refresh interval (match Actions scrape cadence). */
  pollMs: 5 * 60_000,
  /**
   * Optional Node live-scrape API (`scripts/live-server.mjs`).
   * Override at runtime: window.__PROHOD_LIVE_API__ = 'https://host/live'
   */
  liveApiUrl: '',
};
