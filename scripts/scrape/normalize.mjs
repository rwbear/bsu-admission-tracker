import { calcPassing } from '../../js/compute.js';

/**
 * Fetch HTML. Direct cloud fetches to abit.bsu.by usually die on TLS reset;
 * resilient path tries env proxies then regional HTTP proxies (Node only).
 * @param {string} url
 * @param {{ timeoutMs?: number, retries?: number }} [opts]
 * @returns {Promise<{ ok: boolean, status: number, text: string, url: string, error?: string, via?: string }>}
 */
export async function fetchText(url, opts = {}) {
  const { fetchTextResilient } = await import('./proxy.mjs');
  return fetchTextResilient(url, opts);
}

/**
 * Keep only faculty blocks whose section title matches any needle.
 * BSU formk1 pages often mix many faculties.
 * @param {string} html
 * @param {string[]} needles
 */
export function filterFacultySections(html, needles) {
  const terms = (needles || [])
    .map((n) => String(n || '').trim().toLowerCase())
    .filter(Boolean);
  if (!terms.length) return html;

  const sections = splitFacultySections(html);
  if (!sections.length) return html;

  const chunks = sections
    .filter((s) => {
      const heading = s.title.toLowerCase();
      return terms.some((t) => heading.includes(t));
    })
    .map((s) => s.html);

  if (!chunks.length) return '';
  return `<table>${chunks.join('')}</table>`;
}

/**
 * Split a formk1 page into faculty blocks by `td.fl` section headers.
 * @param {string} html
 * @returns {{ title: string, html: string }[]}
 */
export function splitFacultySections(html) {
  const re = /<tr>\s*<td class="fl"[^>]*>[\s\S]*?<\/tr>/gi;
  const hits = [...String(html || '').matchAll(re)];
  if (!hits.length) return [];

  /** @type {{ title: string, html: string }[]} */
  const sections = [];
  for (let i = 0; i < hits.length; i += 1) {
    const start = hits[i].index ?? 0;
    const end = i + 1 < hits.length ? hits[i + 1].index ?? html.length : html.length;
    const title = cellText(hits[i][0]);
    if (!title) continue;
    sections.push({
      title,
      html: html.slice(start, end),
    });
  }
  return sections;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Strip tags / collapse whitespace.
 * @param {string} html
 */
export function cellText(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect score-range header cells (supports "400- 396", "391 и более").
 * @param {string} text
 */
export function isRangeHeader(text) {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t || t.length > 40) return false;
  return (
    /^\d+\s*(и более|и выше)\.?$/i.test(t) ||
    /^\d+(?:\.\d+)?\s*и менее\.?$/i.test(t) ||
    /^\d+\s*[-\u2013]\s*\d+\.?$/.test(t)
  );
}

/**
 * Parse numeric cell (spaces as thousand separators).
 * @param {string} text
 */
export function parseCount(text) {
  const cleaned = String(text).replace(/\s+/g, '').replace(',', '.');
  if (!cleaned || cleaned === '—' || cleaned === '-' || cleaned === '–') return 0;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * HTML table extractor → rows of cell HTML strings.
 * Expands colspan and rowspan into a rectangular grid (standard table model).
 * @param {string} html
 * @returns {string[][][]}
 */
export function extractTables(html) {
  const tables = [];
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = tableRe.exec(html))) {
    const body = m[1];
    /** @type {number[]} */
    let spanLeft = [];
    /** @type {string[]} */
    let spanHtml = [];
    const rows = [];
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm;
    while ((rm = rowRe.exec(body))) {
      /** @type {string[]} */
      const row = [];
      let col = 0;
      const cellRe = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
      let cm;

      const placeCarry = () => {
        while (col < spanLeft.length && spanLeft[col] > 0) {
          while (row.length <= col) row.push('');
          row[col] = spanHtml[col] ?? '';
          spanLeft[col] -= 1;
          col += 1;
        }
      };

      while ((cm = cellRe.exec(rm[1]))) {
        placeCarry();
        const attrs = cm[2];
        const colspan = Math.max(
          1,
          Number((attrs.match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || 1),
        );
        const rowspan = Math.max(
          1,
          Number((attrs.match(/rowspan\s*=\s*["']?(\d+)/i) || [])[1] || 1),
        );
        const content = cm[3];
        for (let i = 0; i < colspan; i += 1) {
          while (row.length <= col) row.push('');
          row[col] = i === 0 ? content : '';
          while (spanLeft.length <= col) {
            spanLeft.push(0);
            spanHtml.push('');
          }
          if (rowspan > 1) {
            spanLeft[col] = rowspan - 1;
            spanHtml[col] = i === 0 ? content : '';
          } else {
            spanLeft[col] = 0;
            spanHtml[col] = '';
          }
          col += 1;
        }
      }
      placeCarry();
      while (col < spanLeft.length) {
        if (spanLeft[col] > 0) {
          while (row.length <= col) row.push('');
          row[col] = spanHtml[col] ?? '';
          spanLeft[col] -= 1;
        }
        col += 1;
      }
      if (row.length) rows.push(row);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

/**
 * Map formk1 left-of-bucket header labels → column indices.
 * Uses the leaf header row (labels carried into the range-header row).
 * @param {string[]} leftHeaderTexts
 * @returns {{
 *   plan: number | null,
 *   planTargeted: number | null,
 *   totalApps: number | null,
 *   enrolledTargeted: number | null,
 *   admittedNoExam: number | null,
 *   admittedOutOfCompetition: number | null,
 *   inCompetition: number | null,
 * }}
 */
export function mapFormk1LeftColumns(leftHeaderTexts) {
  /** @type {Record<string, number | null>} */
  const map = {
    plan: null,
    planTargeted: null,
    planPaid: null,
    totalApps: null,
    enrolledTargeted: null,
    admittedNoExam: null,
    admittedOutOfCompetition: null,
    inCompetition: null,
  };

  for (let i = 0; i < leftHeaderTexts.length; i += 1) {
    const t = String(leftHeaderTexts[i] || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!t) continue;

    if (/^по конкурсу$/i.test(t)) {
      map.inCompetition = i;
      continue;
    }
    if (/^вне конкурса$/i.test(t)) {
      map.admittedOutOfCompetition = i;
      continue;
    }
    if (/без вступительных/i.test(t)) {
      map.admittedNoExam = i;
      continue;
    }
    if (/на условиях целевой подготовки/i.test(t)) {
      map.enrolledTargeted = i;
      continue;
    }
    if (/на целевую контрактную/i.test(t)) {
      map.planTargeted = i;
      continue;
    }
    // Paid-track plan label (form id=7 etc.) — before generic «Всего».
    if (/план приема на условиях оплаты/i.test(t)) {
      map.plan = i;
      continue;
    }
    // Budget page: separate paid-plan column under «План приема».
    if (/^на условиях оплаты$/i.test(t)) {
      map.planPaid = i;
      continue;
    }
    // Budget plan «всего» then apps «Всего»; or apps alone after paid plan.
    if (/^всего$/i.test(t)) {
      if (map.plan == null) map.plan = i;
      else if (map.totalApps == null) map.totalApps = i;
    }
  }

  return map;
}

/**
 * Read a numeric cell; empty → 0. Missing column → null.
 * @param {string[]} texts
 * @param {number | null | undefined} idx
 * @returns {number | null}
 */
export function readMappedCount(texts, idx) {
  if (idx == null || idx < 0 || idx >= texts.length) return null;
  const raw = String(texts[idx] || '').trim();
  if (!raw || raw === '—' || raw === '-' || raw === '–' || raw === '−') return 0;
  if (!isBareNumber(raw) && !/^\d/.test(raw.replace(/\s/g, ''))) return null;
  return parseCount(raw);
}

/**
 * Infer plan / Всего / в конкурсе from numerics left of score buckets.
 * Positional [2]/last are wrong on real formk1 colspan headers; use
 * bucket-sum awareness instead of falsy fallbacks that steal «целевое».
 * @param {number[]} afterSpecNums
 * @param {number} bucketSum
 * @returns {{ plan: number, totalApps: number, inCompetition: number }}
 */
export function resolvePlanApps(afterSpecNums, bucketSum) {
  const nums = (afterSpecNums || []).map((n) => Number(n) || 0);
  if (!nums.length) {
    return {
      plan: 0,
      totalApps: bucketSum,
      inCompetition: bucketSum,
    };
  }

  const plan = nums[0];
  const rest = nums.slice(1);
  if (!rest.length) {
    return { plan, totalApps: bucketSum, inCompetition: bucketSum };
  }

  if (rest.length === 1) {
    const only = rest[0];
    const inCompetition = bucketSum > 0 ? bucketSum : only;
    const totalApps = Math.max(only, inCompetition);
    return { plan, totalApps, inCompetition };
  }

  let totalApps = 0;
  let inCompetition = 0;

  if (bucketSum > 0) {
    const atLeastBuckets = rest.filter((n) => n >= bucketSum);
    totalApps = atLeastBuckets.length
      ? Math.max(...atLeastBuckets)
      : Math.max(bucketSum, ...rest);
    const last = rest[rest.length - 1];
    const tol = Math.max(1, Math.floor(bucketSum * 0.25));
    inCompetition =
      Math.abs(last - bucketSum) <= tol ? last : bucketSum;
  } else {
    // Empty bands: do not treat «целевое» (early column) as applications.
    totalApps = rest[rest.length - 1];
    inCompetition = totalApps;
  }

  if (totalApps < inCompetition) totalApps = inCompetition;
  return { plan, totalApps, inCompetition };
}

/**
 * Parse Belarus competition tables that use score-range columns.
 * Range headers are often in a rowspan-shifted row that only contains buckets;
 * data rows are wider — we align ranges to the RIGHT edge of each data row.
 * @param {string} html
 * @param {{ universityId: string, facultyId?: string, facultyName?: string, form?: string, formName?: string, sourceUrl: string, updatedAt: string }} meta
 */
export function parseScoreBucketTables(html, meta) {
  const tables = extractTables(html);
  const results = [];

  for (const rows of tables) {
    if (rows.length < 2) continue;

    let headerIdx = -1;
    let ranges = [];

    // Search whole table for the densest range-header row (not only first 8 —
    // BNTU puts ranges around row 10).
    for (let r = 0; r < rows.length; r += 1) {
      const texts = rows[r].map(cellText);
      const rangeTexts = texts.filter(isRangeHeader);
      // Prefer rows that are mostly ranges
      if (rangeTexts.length >= 5 && rangeTexts.length > ranges.length) {
        headerIdx = r;
        ranges = rangeTexts.map((t) => t.replace(/\s+/g, ' ').trim());
      }
    }

    if (headerIdx < 0 || ranges.length < 5) continue;
    const rangeCount = ranges.length;
    const headerLeft = rows[headerIdx]
      .map(cellText)
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .slice(0, Math.max(0, rows[headerIdx].length - rangeCount));
    const colMap = mapFormk1LeftColumns(headerLeft);
    // Target columns exist on budget tables; paid tables often omit them.
    // БВИ + вне конкурса are the minimum for an honest openPlan.
    const quotaMapped =
      colMap.admittedNoExam != null &&
      colMap.admittedOutOfCompetition != null &&
      colMap.plan != null;

    for (let r = headerIdx + 1; r < rows.length; r += 1) {
      const texts = rows[r].map(cellText).map((t) => t.replace(/\s+/g, ' ').trim());
      if (texts.length < rangeCount + 1) continue;

      // Skip section titles / repeated headers
      if (texts.filter(isRangeHeader).length >= Math.min(5, rangeCount)) continue;
      if (texts.some((t) => /^группа специальностей/i.test(t))) continue;
      if (texts.length === 1) continue;

      const buckets = texts.slice(-rangeCount).map((v) => {
        if (!v || v === '—' || v === '-' || v === '–' || v === '−') return 0;
        return parseCount(v);
      });
      const before = texts.slice(0, texts.length - rangeCount);

      const named = before.filter(
        (t) =>
          t &&
          t !== '-' &&
          t !== '—' &&
          t !== '–' &&
          t !== '−' &&
          !isBareNumber(t) &&
          !isRangeHeader(t) &&
          /[А-Яа-яA-Za-z]/.test(t),
      );
      const nums = before.filter(isBareNumber).map(parseCount);

      let groupName = '';
      let specName = '';
      if (named.length >= 2) {
        // Prefer the longest text blob as specialty (codes + titles)
        const sorted = [...named].sort((a, b) => b.length - a.length);
        specName = sorted[0];
        groupName = named.find((n) => n !== specName) || '';
      } else if (named.length === 1) {
        specName = named[0];
      } else {
        continue;
      }

      if (isRangeHeader(specName)) continue;
      if (specName.length < 3) continue;
      if (/^(план приема|подано|всего|в том числе|без вступ|выделение специальностей)/i.test(specName)) {
        continue;
      }
      if (/факультет|институт|академи/i.test(specName) && named.length === 1 && nums.length === 0) {
        continue;
      }

      // Plan / apps: label map when headers are formk1; else bucket-aware fallback.
      const bucketSum = buckets.reduce((a, b) => a + b, 0);
      let plan = 0;
      let totalApps = 0;
      let inCompetition = 0;
      /** @type {number | null} */
      let planTargeted = null;
      /** @type {number | null} */
      let planPaid = null;
      /** @type {number | null} */
      let enrolledTargeted = null;
      /** @type {number | null} */
      let admittedNoExam = null;
      /** @type {number | null} */
      let admittedOutOfCompetition = null;
      let quotaParseOk = false;

      const mappedPlan = readMappedCount(before, colMap.plan);
      const mappedApps = readMappedCount(before, colMap.totalApps);
      const mappedContest = readMappedCount(before, colMap.inCompetition);

      if (quotaMapped) {
        planTargeted =
          colMap.planTargeted != null
            ? readMappedCount(before, colMap.planTargeted)
            : 0;
        planPaid =
          colMap.planPaid != null ? readMappedCount(before, colMap.planPaid) : 0;
        enrolledTargeted =
          colMap.enrolledTargeted != null
            ? readMappedCount(before, colMap.enrolledTargeted)
            : 0;
        admittedNoExam = readMappedCount(before, colMap.admittedNoExam);
        admittedOutOfCompetition = readMappedCount(
          before,
          colMap.admittedOutOfCompetition,
        );
        quotaParseOk =
          planTargeted != null &&
          enrolledTargeted != null &&
          admittedNoExam != null &&
          admittedOutOfCompetition != null;
      }

      if (mappedPlan != null || mappedApps != null || mappedContest != null) {
        plan = mappedPlan != null ? mappedPlan : 0;
        if (mappedApps != null) totalApps = mappedApps;
        if (mappedContest != null) {
          inCompetition = mappedContest;
        } else if (bucketSum > 0) {
          inCompetition = bucketSum;
        }
        if (!totalApps && bucketSum > 0) totalApps = Math.max(bucketSum, inCompetition);
        if (totalApps < inCompetition) totalApps = inCompetition;
      } else {
        const specIdx = before.findIndex((t) => t === specName);
        const afterSpecNums = before
          .slice(Math.max(0, specIdx + 1))
          .filter(isBareNumber)
          .map(parseCount);

        if (afterSpecNums.length >= 1) {
          ({ plan, totalApps, inCompetition } = resolvePlanApps(
            afterSpecNums,
            bucketSum,
          ));
        } else if (nums.length >= 1) {
          // Numbers before name are often faculty group totals — use trailing nums if any
          plan = nums[nums.length - 1] || nums[0];
          totalApps = bucketSum;
          inCompetition = bucketSum;
        }
      }

      if (plan === 0 && buckets.every((v) => v === 0)) continue;
      if (plan === 0 && totalApps === 0 && bucketSum === 0) continue;

      const taken = quotaParseOk
        ? Math.max(enrolledTargeted || 0, planTargeted || 0) +
          (admittedNoExam || 0) +
          (admittedOutOfCompetition || 0)
        : 0;
      const openPlan = quotaParseOk ? Math.max(0, plan - taken) : plan;
      const estimatedPassing = calcPassing(ranges, buckets, openPlan || 0);
      const facultyPart = meta.facultyId || meta.form || 'main';
      const safeSpec = slug(specName).slice(0, 48);
      const form = meta.form || '';
      // Include form so budget/paid (and military) rows never share an id.
      const id = `${meta.universityId}:${form || 'x'}:${facultyPart}:${safeSpec}:${plan}`;

      results.push({
        id,
        universityId: meta.universityId,
        facultyId: meta.facultyId || meta.form || '',
        facultyName: meta.facultyName || meta.formName || '',
        form,
        formName: meta.formName || '',
        groupName: groupName !== specName ? groupName : '',
        specName: cleanSpecName(specName),
        plan,
        planTargeted,
        planPaid,
        enrolledTargeted,
        admittedNoExam,
        admittedOutOfCompetition,
        quotaParseOk,
        taken: quotaParseOk ? taken : null,
        openPlan: quotaParseOk ? openPlan : null,
        totalApps,
        inCompetition,
        ranges,
        buckets,
        estimatedPassing,
        sourceUrl: meta.sourceUrl,
        updatedAt: meta.updatedAt,
      });
    }
  }

  return results;
}

/**
 * Parse simpler monitoring tables without score-range buckets
 * (specialty | plan | applications).
 * @param {string} html
 * @param {{ universityId: string, facultyId?: string, facultyName?: string, form?: string, formName?: string, sourceUrl: string, updatedAt: string }} meta
 */
export function parseSimpleCompetitionTables(html, meta) {
  const tables = extractTables(html);
  const results = [];

  for (const rows of tables) {
    for (let r = 0; r < rows.length; r += 1) {
      const texts = rows[r].map(cellText).map((t) => t.replace(/\s+/g, ' ').trim());
      if (texts.length < 2) continue;
      if (texts.some((t) => /^специальность$/i.test(t))) continue;
      if (texts.some((t) => /^план приема/i.test(t))) continue;
      if (texts.filter(isRangeHeader).length >= 5) continue;

      const named = texts.filter(
        (t) =>
          t &&
          /[А-Яа-яA-Za-z]/.test(t) &&
          !isBareNumber(t) &&
          !/^факультет|институт/i.test(t),
      );
      const nums = texts.filter(isBareNumber).map(parseCount);
      if (!named.length || nums.length < 1) continue;

      const sorted = [...named].sort((a, b) => b.length - a.length);
      const specName = cleanSpecName(sorted[0]);
      if (specName.length < 3) continue;
      if (/^(план|подано|всего)/i.test(specName)) continue;

      const plan = nums[0] || 0;
      const totalApps = nums[1] ?? nums[0] ?? 0;
      if (plan === 0 && totalApps === 0) continue;

      const facultyPart = meta.facultyId || meta.form || 'main';
      const safeSpec = slug(specName).slice(0, 48);
      const form = meta.form || '';
      const id = `${meta.universityId}:${form || 'x'}:${facultyPart}:${safeSpec}:${plan}`;
      results.push({
        id,
        universityId: meta.universityId,
        facultyId: meta.facultyId || meta.form || '',
        facultyName: meta.facultyName || meta.formName || '',
        form,
        formName: meta.formName || '',
        groupName: '',
        specName,
        plan,
        totalApps,
        inCompetition: totalApps,
        ranges: [],
        buckets: [],
        estimatedPassing: null,
        sourceUrl: meta.sourceUrl,
        updatedAt: meta.updatedAt,
        tableKind: 'simple',
      });
    }
  }

  return results;
}

function isBareNumber(text) {
  const t = String(text).replace(/\s+/g, '').trim();
  return /^\d+$/.test(t);
}

function cleanSpecName(name) {
  return String(name)
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\s*$/, '')
    .trim();
}

export function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Deduplicate specialties preferring rows with more bucket signal.
 * @param {object[]} specs
 */
export function dedupeSpecs(specs) {
  const map = new Map();
  for (const s of specs) {
    const key = `${s.universityId}|${s.facultyId}|${s.form}|${s.specName}|${s.plan}`;
    const prev = map.get(key);
    const score = (s.buckets || []).reduce((a, b) => a + b, 0);
    if (!prev) {
      map.set(key, s);
      continue;
    }
    const prevScore = (prev.buckets || []).reduce((a, b) => a + b, 0);
    if (score >= prevScore) map.set(key, s);
  }
  return [...map.values()];
}
