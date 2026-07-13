import { fetchText, parseScoreBucketTables, cellText, extractTables, isRangeHeader } from '../normalize.mjs';

/**
 * Scrape formk1-style monitoring pages for one university config.
 * @param {object} uni
 * @param {{ limit?: number }} [opts]
 */
export async function scrapeFormk1(uni, opts = {}) {
  const updatedAt = new Date().toISOString();
  const faculties = [...(uni.faculties || [])];
  const specs = [];
  const errors = [];
  const discovered = [];

  if (uni.discoverFromHub && uni.hubUrl) {
    try {
      const hub = await fetchText(uni.hubUrl);
      if (hub.ok) {
        const ids = [...hub.text.matchAll(/formk1\?id=(\d+)/gi)].map((m) => m[1]);
        const unique = [...new Set(ids)];
        for (const id of unique) {
          if (!faculties.some((f) => String(f.id) === String(id))) {
            faculties.push({ id: String(id), name: `Форма / факультет ${id}` });
            discovered.push(id);
          }
        }
      }
    } catch (err) {
      errors.push({ stage: 'hub', message: String(err.message || err) });
    }
  }

  const list = opts.limit ? faculties.slice(0, opts.limit) : faculties;

  for (const fac of list) {
    const url = `${uni.baseUrl}${fac.id}`;
    const res = await fetchText(url);
    if (!res.ok) {
      errors.push({ facultyId: fac.id, url, status: res.status, message: res.error || 'fetch failed' });
      continue;
    }

    const facultyName = detectFacultyName(res.text) || fac.name;
    const parsed = parseScoreBucketTables(res.text, {
      universityId: uni.id,
      facultyId: String(fac.id),
      facultyName,
      form: '',
      formName: '',
      sourceUrl: url,
      updatedAt,
    });

    if (!parsed.length) {
      // Keep faculty even if empty during off-season
      errors.push({ facultyId: fac.id, url, status: res.status, message: 'no score-bucket rows' });
    }
    specs.push(...parsed.map((s) => ({ ...s, facultyName })));
  }

  return {
    universityId: uni.id,
    updatedAt,
    specs,
    errors,
    meta: { discoveredFacultyIds: discovered, fetchedFaculties: list.length },
  };
}

function detectFacultyName(html) {
  const tables = extractTables(html);
  for (const rows of tables.slice(0, 1)) {
    for (const row of rows.slice(0, 4)) {
      const texts = row.map(cellText).filter(Boolean);
      for (const t of texts) {
        if (isRangeHeader(t)) continue;
        if (/факультет|институт|академи|колледж/i.test(t) && t.length < 120) return t;
      }
    }
  }
  // title fallback
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) {
    const t = cellText(title[1]);
    if (t && t.length < 120) return t;
  }
  return '';
}
