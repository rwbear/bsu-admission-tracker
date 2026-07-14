/** Site + data origin for GitHub Pages. */
export const CONFIG = {
  universityId: 'sb-bsu',
  sourceUrl: 'https://abit.bsu.by/formk1?id=7',
  /** Fallback if data/index.json has no origin yet. */
  repo: 'rwbear/bsu-admission-tracker',
  dataBranch: 'cursor/admission-tracker-rebuild-be86',
  /** Client re-pull — Actions aim for ~5 min; stay ahead of Pages CDN lag. */
  pollMs: 3 * 60_000,
};
