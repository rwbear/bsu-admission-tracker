import { CONFIG } from './config.js';

/** @param {number} ms */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {T} fallback
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, fallback) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      resolve(value);
    };
    Promise.resolve(promise).then(finish, () => finish(fallback));
    sleep(ms).then(() => finish(fallback));
  });
}

/**
 * @param {string} path
 * @param {{ bust?: boolean, headers?: Record<string, string>, timeoutMs?: number }} [opts]
 */
async function getJson(path, opts = {}) {
  const url = opts.bust
    ? `${path}${path.includes('?') ? '&' : '?'}_=${Date.now()}`
    : path;
  const timeoutMs = opts.timeoutMs ?? 12_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { Accept: 'application/json', ...(opts.headers || {}) },
    });
    if (!res.ok) throw new Error(`Не удалось загрузить ${path} (${res.status})`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Wrap so sync fetch() throws become rejections for allSettled siblings.
 * @param {string} path
 * @param {{ bust?: boolean, timeoutMs?: number }} [opts]
 */
function getJsonSettled(path, opts = {}) {
  return Promise.resolve().then(() => getJson(path, opts));
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
  try {
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
  } catch {
    return null;
  }
}

/**
 * Resolve repo/branch for remote snapshot pulls.
 * @param {object | null} index
 */
export function resolveOrigin(index) {
  const origin = index?.origin || {};
  let branch = String(origin.branch || CONFIG.dataBranch).trim();
  if (!branch || branch === 'main' || branch === 'master') {
    branch = CONFIG.dataBranch;
  }
  return {
    repo: String(origin.repo || CONFIG.repo),
    branch,
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
 * Snapshot candidates. Prefer raw.githubusercontent.com (near-instant after
 * Actions push) over GitHub Pages CDN (often cached up to ~10 minutes).
 *
 * @param {string} universityId
 * @param {{ repo: string, branch: string, bust: boolean }} opts
 */
async function loadSnapshotCandidates(universityId, opts) {
  const file = `data/${universityId}.json`;
  const rawBase = `https://raw.githubusercontent.com/${opts.repo}/${opts.branch}`;

  const shaPromise = withTimeout(
    latestCommitSha(opts.repo, opts.branch, file),
    1_500,
    null,
  );

  /** Primary: raw tip (freshest) + same-origin Pages, in parallel. */
  const primary = [
    getJsonSettled(`${rawBase}/${file}`, { bust: true, timeoutMs: 8_000 }),
    getJsonSettled(`./${file}`, { bust: opts.bust, timeoutMs: 8_000 }),
  ];

  const [primarySettled, sha] = await Promise.all([
    Promise.allSettled(primary),
    shaPromise,
  ]);

  /** @type {object[]} */
  const payloads = [];
  for (const r of primarySettled) {
    if (r.status === 'fulfilled' && isUniPayload(r.value)) {
      payloads.push(r.value);
    }
  }

  // SHA-pinned raw bypasses every CDN. Only worth it when we have a sha.
  if (sha) {
    const shaUrl = `https://raw.githubusercontent.com/${opts.repo}/${sha}/${file}`;
    const shaSettled = await Promise.allSettled([
      getJsonSettled(shaUrl, { timeoutMs: 6_000 }),
    ]);
    for (const r of shaSettled) {
      if (r.status === 'fulfilled' && isUniPayload(r.value)) {
        payloads.push(r.value);
      }
    }
  }

  return payloads;
}

/**
 * Load the newest committed university snapshot.
 * Origin comes from CONFIG immediately — never wait on index.json first
 * (that serial wait was making the board look "late" on every visit).
 *
 * @param {string} universityId
 * @param {{ bust?: boolean }} [opts]
 */
export async function loadUniversity(universityId, opts = {}) {
  const bust = opts.bust !== false;
  const origin = { repo: CONFIG.repo, branch: CONFIG.dataBranch };

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
