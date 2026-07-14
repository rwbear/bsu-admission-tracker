import { calcPassing } from '../../js/compute.js';
import { fetchTextResilient } from './proxy.mjs';

/**
 * Fetch HTML. Direct cloud fetches to abit.bsu.by usually die on TLS reset;
 * resilient path tries env proxies then regional HTTP proxies.
 * @param {string} url
 * @param {{ timeoutMs?: number, retries?: number }} [opts]
 * @returns {Promise<{ ok: boolean, status: number, text: string, url: string, error?: string, via?: string }>}
 */
export async function fetchText(url, opts = {}) {
  return fetchTextResilient(url, opts);
}

/**
 * Keep only faculty blocks whose section title matches any needle.
 * BSU formk1 pages often mix many faculties; Проход wants Институт бизнеса only.
 * @param {string} html
 * @param {string[]} needles
 */
export function filterFacultySections(html, needles) {
  const terms = (needles || [])
    .map((n) => String(n || '').trim().toLowerCase())
    .filter(Boolean);
  if (!terms.length) return html;

  const re = /<tr>\s*<td class="fl"[^>]*>[\s\S]*?<\/tr>/gi;
  const hits = [...html.matchAll(re)];
  if (!hits.length) return html;

  const chunks = [];
  for (let i = 0; i < hits.length; i += 1) {
    const start = hits[i].index ?? 0;
    const end = i + 1 < hits.length ? hits[i + 1].index ?? html.length : html.length;
    const heading = cellText(hits[i][0]).toLowerCase();
    if (terms.some((t) => heading.includes(t))) {
      chunks.push(html.slice(start, end));
    }
  }

  if (!chunks.length) return '';
  return `<table>${chunks.join('')}</table>`;
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
 * Very small HTML table extractor → rows of cell HTML strings.
 * Handles rowspan/colspan by expanding naively where possible.
 * @param {string} html
 * @returns {string[][][]}
 */
export function extractTables(html) {
  const tables = [];
  const tableRe = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let m;
  while ((m = tableRe.exec(html))) {
    const body = m[1];
    const rows = [];
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rm;
    while ((rm = rowRe.exec(body))) {
      const cells = [];
      const cellRe = /<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
      let cm;
      while ((cm = cellRe.exec(rm[1]))) {
        const attrs = cm[2];
        const colspan = Number((attrs.match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || 1);
        const content = cm[3];
        for (let i = 0; i < colspan; i += 1) cells.push(i === 0 ? content : '');
      }
      if (cells.length) rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
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

      // Plan is usually the first number after the specialty cell.
      let plan = 0;
      let totalApps = 0;
      let inCompetition = 0;

      const specIdx = before.findIndex((t) => t === specName);
      const afterSpecNums = before.slice(Math.max(0, specIdx + 1)).filter(isBareNumber).map(parseCount);

      if (afterSpecNums.length >= 1) {
        plan = afterSpecNums[0];
        // Typical: plan, target, totalApps, noExam, outOfComp, inCompetition
        if (afterSpecNums.length >= 2) totalApps = afterSpecNums[2] ?? afterSpecNums[1];
        if (afterSpecNums.length >= 3) {
          inCompetition = afterSpecNums[afterSpecNums.length - 1];
        } else if (afterSpecNums.length === 2) {
          inCompetition = afterSpecNums[1];
        }
      } else if (nums.length >= 1) {
        // Numbers before name are often faculty group totals — use trailing nums if any
        plan = nums[nums.length - 1] || nums[0];
      }

      if (!inCompetition && afterSpecNums.length >= 4) {
        inCompetition = afterSpecNums[afterSpecNums.length - 1];
      }
      if (!totalApps && afterSpecNums.length >= 2) {
        totalApps = afterSpecNums[1];
      }

      if (plan === 0 && buckets.every((v) => v === 0)) continue;
      if (plan === 0 && totalApps === 0 && buckets.reduce((a, b) => a + b, 0) === 0) continue;

      const estimatedPassing = calcPassing(ranges, buckets, plan || 0);
      const facultyPart = meta.facultyId || meta.form || 'main';
      const safeSpec = slug(specName).slice(0, 48);
      const id = `${meta.universityId}:${facultyPart}:${safeSpec}:${plan}`;

      results.push({
        id,
        universityId: meta.universityId,
        facultyId: meta.facultyId || meta.form || '',
        facultyName: meta.facultyName || meta.formName || '',
        form: meta.form || '',
        formName: meta.formName || '',
        groupName: groupName !== specName ? groupName : '',
        specName: cleanSpecName(specName),
        plan,
        totalApps,
        inCompetition: inCompetition || totalApps,
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
