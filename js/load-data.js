/**
 * @param {string} path
 */
async function getJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Не удалось загрузить ${path} (${res.status})`);
  return res.json();
}

export async function loadIndex() {
  return getJson('./data/index.json');
}

/**
 * @param {string} universityId
 */
export async function loadUniversity(universityId) {
  return getJson(`./data/${universityId}.json`);
}
