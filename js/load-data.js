import { CONFIG } from './config.js';
import { fetchLiveUniversity, LIVE_BUDGET_MS } from './live-table.js';

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
 * Prefer the snapshot with the newest updatedAt (table truth time).
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
  } catch (err) {
    const { repo, branch } = resolveOrigin(null);
    return getJson(
      `https://raw.githubusercontent.com/${repo}/${branch}/data/index.json`,
      { bust: true },
    );
  }
}

function resolveLiveApiUrl() {
  try {
    if (typeof window !== 'undefined' && window.__PROHOD_LIVE_API__) {
      return String(window.__PROHOD_LIVE_API__).trim();
    }
  } catch {
    /* ignore */
  }
  return String(CONFIG.liveApiUrl || '').trim();
}

/**
 * @param {string} universityId
 * @param {{ repo: string, branch: string, forceRemote: boolean, bust: boolean }} opts
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

  if (opts.forceRemote) {
    const sha = await latestCommitSha(opts.repo, opts.branch, file);
    if (sha) {
      tasks.push(
        getJson(
          `https://raw.githubusercontent.com/${opts.repo}/${sha}/${file}`,
        ),
      );
    }
  }

  const settled = await Promise.allSettled(tasks);
  return settled
    .filter((r) => r.status === 'fulfilled')
    .map((r) => /** @type {PromiseFulfilledResult<object>} */ (r).value);
}

/**
 * Prefer ordered live sources when forceRemote: dedicated scrape API → CORS
 * HTML parse → newest committed JSON (Pages can lag).
 *
 * @param {string} universityId
 * @param {{ bust?: boolean, forceRemote?: boolean, tryLive?: boolean, liveBudgetMs?: number }} [opts]
 */
export async function loadUniversity(universityId, opts = {}) {
  const forceRemote = Boolean(opts.forceRemote);
  const tryLive = Boolean(opts.tryLive);
  const bust = opts.bust !== false;
  const liveBudgetMs = opts.liveBudgetMs ?? LIVE_BUDGET_MS;

  let origin = { repo: CONFIG.repo, branch: CONFIG.dataBranch };
  try {
    const index = await getJson('./data/index.json', { bust: true });
    origin = resolveOrigin(index);
  } catch {
    /* defaults */
  }

  const snapPromise = loadSnapshotCandidates(universityId, {
    ...origin,
    forceRemote,
    bust,
  });

  /** Start live work in parallel with snapshots, but only when asked. */
  /** @type {Promise<object | null>} */
  let livePromise = Promise.resolve(null);
  if (tryLive) {
    const apiUrl = resolveLiveApiUrl();
    const parts = [];
    if (apiUrl) {
      parts.push(getJson(apiUrl, { bust: true }).catch(() => null));
    }
    parts.push(
      fetchLiveUniversity({ budgetMs: liveBudgetMs }).catch(() => null),
    );
    livePromise = Promise.all(parts).then(
      (rows) => rows.find((p) => p?.specialties?.length) || null,
    );
  }

  const snapshots = await snapPromise;
  const newestSnap = pickNewest(snapshots);

  // Don't make the caller wait the full CORS budget if JSON is already fresh —
  // race live against a short grace after snapshots resolve.
  const live = tryLive
    ? await Promise.race([
        livePromise,
        new Promise((resolve) => {
          setTimeout(() => resolve(null), Math.min(liveBudgetMs, 8_000));
        }),
      ])
    : null;

  if (live?.specialties?.length) return live;
  if (newestSnap) return newestSnap;
  throw new Error(`Не удалось загрузить data/${universityId}.json`);
}
