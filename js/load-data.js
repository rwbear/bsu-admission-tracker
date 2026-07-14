/**
 * @param {string} path
 * @param {{ bust?: boolean }} [opts]
 */
async function getJson(path, opts = {}) {
  const url = opts.bust
    ? `${path}${path.includes('?') ? '&' : '?'}_=${Date.now()}`
    : path;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Не удалось загрузить ${path} (${res.status})`);
  return res.json();
}

export async function loadIndex() {
  return getJson('./data/index.json', { bust: true });
}

/**
 * @param {string} universityId
 * @param {{ bust?: boolean }} [opts]
 */
export async function loadUniversity(universityId, opts = {}) {
  return getJson(`./data/${universityId}.json`, { bust: opts.bust !== false });
}
