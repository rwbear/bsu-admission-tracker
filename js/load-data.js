import { CONFIG } from './config.js';

/**
 * @param {string} path
 * @param {{ bust?: boolean, headers?: Record<string, string> }} [opts]
 */
async function getJson(path, opts = {}) {
  const url = opts.bust
    ? `${path}${path.includes('?') ? '&' : '?'}_=${Date.now()}`
    : path;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json', ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`Не удалось загрузить ${path} (${res.status})`);
  return res.json();
}

/**
 * @param {unknown} payload
 * @returns {payload is object}
 */
function isUniPayload(payload) {
  return (
    payload != null &&
    typeof payload === 'object' &&
    Array.isArray(/** @type {{ specialties?: unknown }} */ (payload).specialties)
  );
}

/**
 * Prefer the snapshot with the newest updatedAt (last successful scrape).
 * @param {object[]} payloads
 */
export function pickNewest(payloads) {
  const ok = payloads.filter(isUniPayload);
  if (!ok.length) return null;
  ok.sort((a, b) => {
    const ta = Date.parse(a.updatedAt || '') || 0;
    const tb = Date.parse(b.updatedAt || '') || 0;
    if (tb !== ta) return tb - ta;
    const ca = a.specialtyCount ?? a.specialties?.length ?? 0;
    const cb = b.specialtyCount ?? b.specialties?.length ?? 0;
    return cb - ca;
  });
  return ok[0];
}

/**
 * @param {string | null | undefined} repo
 * @param {string | null | undefined} branch
 * @param {string} filePath
 * @returns {Promise<string | null>}
 */
async function latestCommitSha(repo, branch, filePath) {
  if (!repo || !branch) return null;
  const url =
    `https://api.github.com/repos/${repo}/commits` +
    `?sha=${encodeURIComponent(branch)}` +
    `&path=${encodeURIComponent(filePath)}` +
    `&per_page=1`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  const sha = Array.isArray(rows) && rows[0]?.sha ? String(rows[0].sha) : null;
  return sha && /^[0-9a-f]{7,40}$/i.test(sha) ? sha : null;
}

/**
 * Resolve repo/branch for remote snapshot pulls.
 * @param {object | null} index
 */
export function resolveOrigin(index) {
  const origin = index?.origin || {};
  return {
    repo: String(origin.repo || CONFIG.repo),
    branch: String(origin.branch || CONFIG.dataBranch),
  };
}

export async function loadIndex() {
  try {
    return await getJson('./data/index.json', { bust: true });
  } catch {
    const { repo, branch } = resolveOrigin(null);
    return getJson(
      `https://raw.githubusercontent.com/${repo}/${branch}/data/index.json`,
      { bust: true },
    );
  }
}

/**
 * Load candidates for university JSON.
 * Always tries same-origin Pages + raw branch; also raw-by-SHA so CDN lag
 * cannot hide a newer Actions scrape.
 *
 * @param {string} universityId
 * @param {{ repo: string, branch: string, bust: boolean }} opts
 */
async function loadSnapshotCandidates(universityId, opts) {
  const file = `data/${universityId}.json`;
  /** @type {Promise<object>[]} */
  const tasks = [
    getJson(`./${file}`, { bust: opts.bust }),
    getJson(
      `https://raw.githubusercontent.com/${opts.repo}/${opts.branch}/${file}`,
      { bust: true },
    ),
  ];

  const sha = await latestCommitSha(opts.repo, opts.branch, file);
  if (sha) {
    tasks.push(
      getJson(`https://raw.githubusercontent.com/${opts.repo}/${sha}/${file}`),
    );
  }

  const settled = await Promise.allSettled(tasks);
  return settled
    .filter((r) => r.status === 'fulfilled')
    .map((r) => /** @type {PromiseFulfilledResult<object>} */ (r).value);
}

/**
 * Load the newest committed university snapshot (Actions scrape).
 * Does not scrape abit.bsu.by in the browser — that path is unreliable.
 *
 * @param {string} universityId
 * @param {{ bust?: boolean }} [opts]
 */
export async function loadUniversity(universityId, opts = {}) {
  const bust = opts.bust !== false;

  let origin = { repo: CONFIG.repo, branch: CONFIG.dataBranch };
  try {
    const index = await getJson('./data/index.json', { bust: true });
    origin = resolveOrigin(index);
  } catch {
    /* defaults */
  }

  const snapshots = await loadSnapshotCandidates(universityId, {
    ...origin,
    bust,
  });
  const newest = pickNewest(snapshots);
  if (!newest) {
    throw new Error(`Не удалось загрузить data/${universityId}.json`);
  }
  if (!newest.specialties?.length) {
    throw new Error('Снимок пустой — подождите следующий сбор Actions');
  }
  return newest;
}
