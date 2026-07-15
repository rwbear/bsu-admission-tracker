import { fetchText, parseScoreBucketTables, cellText } from '../normalize.mjs';

/**
 * @param {object} uni
 * @param {{ limit?: number }} [opts]
 */
export async function scrapeBsuir(uni, opts = {}) {
  const updatedAt = new Date().toISOString();
  const forms = [...(uni.forms || [])];
  const list = opts.limit ? forms.slice(0, opts.limit) : forms;
  const specs = [];
  const errors = [];

  // Resolve group files from hub if present
  let formList = list;
  if (uni.hubUrl) {
    const hub = await fetchText(uni.hubUrl);
    if (hub.ok) {
      const files = [...hub.text.matchAll(/group\/([a-z0-9_]+\.html)/gi)].map((m) => m[1]);
      const unique = [...new Set(files)];
      if (unique.length) {
        const known = new Map(forms.map((f) => [f.file, f]));
        formList = unique.map((file) => {
          const id = file.replace(/\.html$/i, '');
          return known.get(file) || { id, name: id, file };
        });
        if (opts.limit) formList = formList.slice(0, opts.limit);
      }
    }
  }

  for (const form of formList) {
    const url = `${uni.baseUrl}${form.file || `${form.id}.html`}`;
    const res = await fetchText(url);
    if (!res.ok) {
      errors.push({ form: form.id, url, status: res.status, message: res.error || 'fetch failed' });
      continue;
    }
    if (/прием документов завершен|документов заверш/i.test(res.text) && !/<table/i.test(res.text)) {
      errors.push({ form: form.id, url, status: res.status, message: 'campaign closed / no table' });
      continue;
    }

    const parsed = parseScoreBucketTables(res.text, {
      universityId: uni.id,
      facultyId: form.id,
      facultyName: form.name,
      form: form.id,
      formName: form.name,
      sourceUrl: url,
      updatedAt,
    });

    // BSUIR tables use "Факультет / группа" as first col — treat as faculty grouping
    for (const row of parsed) {
      specs.push({
        ...row,
        facultyId: form.id,
        facultyName: form.name,
        groupName: row.groupName || row.facultyName || '',
      });
    }

    if (!parsed.length) {
      errors.push({ form: form.id, url, status: res.status, message: 'no score-bucket rows' });
    }
  }

  return { universityId: uni.id, updatedAt, specs, errors, meta: { forms: formList.length } };
}

export function previewBsuirTitle(html) {
  return cellText((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
}
