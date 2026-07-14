import {
  fetchText,
  parseScoreBucketTables,
  filterFacultySections,
  splitFacultySections,
  cellText,
  extractTables,
  isRangeHeader,
} from '../normalize.mjs';
import {
  shortFacultyLabel,
  facultyKey,
} from '../../../js/faculties.js';

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
  const fetchVia = [];

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
    if (res.via) fetchVia.push({ facultyId: fac.id, via: res.via });
    if (!res.ok) {
      errors.push({
        facultyId: fac.id,
        url,
        status: res.status,
        message: res.error || 'fetch failed',
        via: res.via,
      });
      continue;
    }

    const parseAll =
      fac.parseAllSections === true || uni.parseAllSections === true;
    const sectionNeedles =
      fac.sectionIncludes || uni.sectionIncludes || null;

    if (parseAll) {
      const sections = splitFacultySections(res.text);
      if (!sections.length) {
        errors.push({
          facultyId: fac.id,
          url,
          status: res.status,
          message: 'no faculty sections (td.fl) found',
          via: res.via,
        });
        continue;
      }

      for (const section of sections) {
        const label = shortFacultyLabel(section.title);
        const key = facultyKey(section.title);
        const parsed = parseScoreBucketTables(`<table>${section.html}</table>`, {
          universityId: uni.id,
          facultyId: key,
          facultyName: label,
          form: String(fac.id),
          formName: fac.name || 'Дневная',
          sourceUrl: url,
          updatedAt,
        });

        if (!parsed.length) {
          errors.push({
            facultyId: key,
            url,
            status: res.status,
            message: `no score-bucket rows for ${label}`,
            via: res.via,
          });
          continue;
        }

        specs.push(
          ...parsed.map((s) => ({
            ...s,
            facultyId: key,
            facultyName: label,
            formName: fac.name || s.formName || 'Дневная',
            sectionTitle: section.title,
          })),
        );
      }
      continue;
    }

    const html = sectionNeedles
      ? filterFacultySections(res.text, sectionNeedles)
      : res.text;

    if (sectionNeedles && !html) {
      errors.push({
        facultyId: fac.id,
        url,
        status: res.status,
        message: `no faculty section matching: ${sectionNeedles.join(' | ')}`,
        via: res.via,
      });
      continue;
    }

    const facultyName = detectFacultyName(html) || fac.name;
    const label = shortFacultyLabel(facultyName);
    const key = facultyKey(facultyName);
    const parsed = parseScoreBucketTables(html, {
      universityId: uni.id,
      facultyId: key,
      facultyName: label,
      form: String(fac.id),
      formName: fac.name || '',
      sourceUrl: url,
      updatedAt,
    });

    if (!parsed.length) {
      errors.push({
        facultyId: key,
        url,
        status: res.status,
        message: 'no score-bucket rows',
        via: res.via,
      });
    }
    specs.push(
      ...parsed.map((s) => ({
        ...s,
        facultyId: key,
        facultyName: label,
        formName: fac.name || s.formName,
      })),
    );
  }

  return {
    universityId: uni.id,
    updatedAt,
    specs,
    errors,
    meta: {
      discoveredFacultyIds: discovered,
      fetchedFaculties: list.length,
      fetchVia,
    },
  };
}

function detectFacultyName(html) {
  const tables = extractTables(html);
  for (const rows of tables.slice(0, 1)) {
    for (const row of rows.slice(0, 4)) {
      const texts = row.map(cellText).filter(Boolean);
      for (const t of texts) {
        if (isRangeHeader(t)) continue;
        if (/факультет|институт|академи|колледж/i.test(t) && t.length < 120) {
          return t;
        }
      }
    }
  }
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) {
    const t = cellText(title[1]);
    if (t && t.length < 120) return t;
  }
  return '';
}
