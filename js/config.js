/** Site + data origin for GitHub Pages. */
export const CONFIG = {
  universityId: 'sb-bsu',
  sourceUrl: 'https://abit.bsu.by/formk1?id=7',
  /** Fallback if data/index.json has no origin yet. */
  repo: 'rwbear/bsu-admission-tracker',
  dataBranch: 'cursor/admission-tracker-rebuild-be86',
  /** Client re-pull interval — match Actions scrape cadence (10 min). */
  pollMs: 10 * 60_000,
};
