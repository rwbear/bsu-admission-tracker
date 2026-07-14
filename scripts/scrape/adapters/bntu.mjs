import { fetchText, parseScoreBucketTables } from '../normalize.mjs';

/**
 * @param {object} uni
 * @param {{ limit?: number }} [opts]
 */
export async function scrapeBntu(uni, opts = {}) {
  const updatedAt = new Date().toISOString();
  const faculties = uni.faculties || [];
  const forms = uni.forms || [
    { id: 'day_budget', name: 'Дневная бюджет', forob: 1, budj: 1 },
  ];
  const specs = [];
  const errors = [];

  // Discover faculty links from hub
  let targets = [];
  if (uni.hubUrl) {
    const hub = await fetchText(uni.hubUrl);
    if (hub.ok) {
      const links = [...hub.text.matchAll(/view_\.php\?([^"'>\s]+)/gi)].map((m) => m[1]);
      const uniq = [...new Set(links.map((q) => q.replace(/&amp;/g, '&')))];
      for (const q of uniq) {
        const params = new URLSearchParams(q);
        const kf = params.get('kf');
        const forob = params.get('forob');
        const budj = params.get('budj');
        if (!kf) continue;
        const fac = faculties.find((f) => String(f.kf || f.id) === String(kf));
        const form = forms.find(
          (f) => String(f.forob) === String(forob) && String(f.budj) === String(budj),
        ) || {
          id: `f${forob}_b${budj}`,
          name: `Форма ${forob}/${budj}`,
          forob: Number(forob),
          budj: Number(budj),
        };
        targets.push({
          kf,
          facultyId: String(kf),
          facultyName: fac?.name || `Факультет ${kf}`,
          formId: form.id,
          formName: form.name,
          forob: form.forob,
          budj: form.budj,
        });
      }
    }
  }

  if (!targets.length) {
    for (const fac of faculties) {
      for (const form of forms) {
        targets.push({
          kf: fac.kf || fac.id,
          facultyId: String(fac.id),
          facultyName: fac.name,
          formId: form.id,
          formName: form.name,
          forob: form.forob,
          budj: form.budj,
        });
      }
    }
  }

  if (opts.limit) targets = targets.slice(0, opts.limit);

  for (const t of targets) {
    const url = `${uni.baseUrl}?kf=${t.kf}&forob=${t.forob}&budj=${t.budj}`;
    const res = await fetchText(url);
    if (!res.ok) {
      errors.push({ url, status: res.status, message: res.error || 'fetch failed' });
      continue;
    }
    const parsed = parseScoreBucketTables(res.text, {
      universityId: uni.id,
      facultyId: `${t.facultyId}:${t.formId}`,
      facultyName: `${t.facultyName} · ${t.formName}`,
      form: t.formId,
      formName: t.formName,
      sourceUrl: url,
      updatedAt,
    });
    specs.push(...parsed);
    if (!parsed.length) {
      errors.push({ url, status: res.status, message: 'no score-bucket rows' });
    }
  }

  return {
    universityId: uni.id,
    updatedAt,
    specs,
    errors,
    meta: { targets: targets.length },
  };
}
