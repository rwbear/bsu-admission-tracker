import { fetchText, parseScoreBucketTables, extractTables, cellText, isRangeHeader } from '../normalize.mjs';

/**
 * GrSU monitoring: university.php?v=DF|DP|...
 * @param {object} uni
 * @param {{ limit?: number }} [opts]
 */
export async function scrapeGrsu(uni, opts = {}) {
  const updatedAt = new Date().toISOString();
  const forms = [...(uni.forms || [])];
  const list = opts.limit ? forms.slice(0, opts.limit) : forms;
  const specs = [];
  const errors = [];

  for (const form of list) {
    const url = `${uni.baseUrl}${form.id}`;
    const res = await fetchText(url);
    if (!res.ok) {
      errors.push({ form: form.id, url, status: res.status, message: res.error || 'fetch failed' });
      continue;
    }

    let parsed = parseScoreBucketTables(res.text, {
      universityId: uni.id,
      facultyId: form.id,
      facultyName: form.name,
      form: form.id,
      formName: form.name,
      sourceUrl: url,
      updatedAt,
    });

    // Fallback: some GrSU pages nest faculty headings without classic headers
    if (!parsed.length) {
      parsed = parseLooseFacultyBlocks(res.text, {
        universityId: uni.id,
        facultyId: form.id,
        facultyName: form.name,
        form: form.id,
        formName: form.name,
        sourceUrl: url,
        updatedAt,
      });
    }

    specs.push(...parsed);
    if (!parsed.length) {
      errors.push({ form: form.id, url, status: res.status, message: 'no score-bucket rows' });
    }
  }

  return { universityId: uni.id, updatedAt, specs, errors, meta: { forms: list.length } };
}

function parseLooseFacultyBlocks(html, meta) {
  // Reuse table parser path only — if pages lack ranges, return empty.
  const tables = extractTables(html);
  for (const rows of tables) {
    const flat = rows.flatMap((r) => r.map(cellText));
    if (flat.some(isRangeHeader)) {
      return parseScoreBucketTables(html, meta);
    }
  }
  return [];
}
