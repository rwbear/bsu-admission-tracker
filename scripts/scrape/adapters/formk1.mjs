import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fetchText,
  parseScoreBucketTables,
  parseSimpleCompetitionTables,
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
import { setCachedProxy } from '../proxy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../../..');

/**
 * @param {string | undefined} catalogPath
 */
function loadTablesCatalog(catalogPath) {
  const path = join(root, catalogPath || 'sources/bsu-tables.json');
  if (!existsSync(path)) return { tracks: [], tables: [] };
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { tracks: [], tables: [] };
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Scrape formk1-style monitoring pages for one university config.
 * @param {object} uni
 * @param {{ limit?: number }} [opts]
 */
export async function scrapeFormk1(uni, opts = {}) {
  const updatedAt = new Date().toISOString();
  const catalog = loadTablesCatalog(uni.tablesCatalog);
  const byId = new Map(
    (catalog.tables || []).map((t) => [String(t.id), t]),
  );
  const trackById = new Map(
    (catalog.tracks || []).map((t) => [t.id, t]),
  );

  const faculties = [...(uni.faculties || [])].map((f) => ({
    ...f,
    id: String(f.id),
  }));
  const specs = [];
  const errors = [];
  const discovered = [];
  const fetchVia = [];
  /** @type {string[]} */
  const failedFormIds = [];
  /** @type {string[]} */
  const okFormIds = [];

  if (uni.discoverFromHub && uni.hubUrl) {
    try {
      const hub = await fetchText(uni.hubUrl, {
        requireFormk1: false,
        minBytes: 1000,
        timeoutMs: 15000,
        maxAttempts: 8,
      });
      if (hub.ok) {
        const ids = [...hub.text.matchAll(/formk1\?id=(\d+)/gi)].map(
          (m) => m[1],
        );
        const unique = [...new Set(ids)];
        for (const id of unique) {
          if (!faculties.some((f) => String(f.id) === String(id))) {
            const known = byId.get(String(id));
            faculties.push({
              id: String(id),
              name: known?.name || `Таблица ${id}`,
              parseAllSections: true,
            });
            discovered.push(id);
          }
        }
      } else {
        errors.push({
          stage: 'hub',
          message: hub.error || `hub HTTP ${hub.status}`,
          via: hub.via,
        });
      }
    } catch (err) {
      errors.push({ stage: 'hub', message: String(err.message || err) });
    }
  }

  const list = opts.limit ? faculties.slice(0, opts.limit) : faculties;

  for (let i = 0; i < list.length; i += 1) {
    const fac = list[i];
    if (i > 0) await sleep(400);

    const url = `${uni.baseUrl}${fac.id}`;
    const meta = byId.get(String(fac.id));
    const track = meta ? trackById.get(meta.trackId) : null;
    const formName = meta?.name || fac.name || `Таблица ${fac.id}`;
    const trackId = meta?.trackId || null;
    const trackName = track?.name || null;
    const minBytes = Number(meta?.minBytes || fac.minBytes || 0) || 0;
    const minSections = Number(meta?.minSections || fac.minSections || 0) || 0;

    let res = await fetchText(url);
    if (res.via) fetchVia.push({ facultyId: fac.id, via: res.via });

    // Truncated / wrong mirror HTML often still "looks like" formk1 — reject by size.
    if (res.ok && minBytes && res.text.length < minBytes) {
      errors.push({
        facultyId: fac.id,
        formId: String(fac.id),
        url,
        status: res.status,
        message: `response too small (${res.text.length} < ${minBytes}); retrying`,
        via: res.via,
      });
      setCachedProxy(null);
      res = await fetchText(url);
      if (res.via) fetchVia.push({ facultyId: fac.id, via: res.via, retry: true });
    }

    if (res.ok && minBytes && res.text.length < minBytes) {
      failedFormIds.push(String(fac.id));
      errors.push({
        facultyId: fac.id,
        formId: String(fac.id),
        url,
        status: res.status,
        message: `response too small after retry (${res.text.length} < ${minBytes})`,
        via: res.via,
      });
      continue;
    }

    if (!res.ok) {
      failedFormIds.push(String(fac.id));
      errors.push({
        facultyId: fac.id,
        formId: String(fac.id),
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

    const decorate = (row) => ({
      ...row,
      form: String(fac.id),
      formName,
      trackId,
      trackName,
      schedule: meta?.schedule || null,
      finance: meta?.finance || null,
      sourceUrl: url,
    });

    if (parseAll) {
      const sections = splitFacultySections(res.text);
      if (!sections.length) {
        // Legitimate empty monitoring shell (e.g. no applicants yet).
        okFormIds.push(String(fac.id));
        errors.push({
          facultyId: fac.id,
          formId: String(fac.id),
          url,
          status: res.status,
          message: 'empty monitoring table (no faculty sections)',
          via: res.via,
          empty: true,
        });
        continue;
      }

      if (minSections && sections.length < minSections) {
        failedFormIds.push(String(fac.id));
        errors.push({
          facultyId: fac.id,
          formId: String(fac.id),
          url,
          status: res.status,
          message: `too few faculty sections (${sections.length} < ${minSections}) — likely truncated HTML`,
          via: res.via,
        });
        continue;
      }

      let added = 0;
      for (const section of sections) {
        const label = shortFacultyLabel(section.title);
        const key = facultyKey(section.title);
        let parsed = parseScoreBucketTables(`<table>${section.html}</table>`, {
          universityId: uni.id,
          facultyId: key,
          facultyName: label,
          form: String(fac.id),
          formName,
          sourceUrl: url,
          updatedAt,
        });
        if (!parsed.length) {
          parsed = parseSimpleCompetitionTables(`<table>${section.html}</table>`, {
            universityId: uni.id,
            facultyId: key,
            facultyName: label,
            form: String(fac.id),
            formName,
            sourceUrl: url,
            updatedAt,
          });
        }

        if (!parsed.length) {
          errors.push({
            facultyId: key,
            formId: String(fac.id),
            url,
            status: res.status,
            message: `no competition rows for ${label}`,
            via: res.via,
          });
          continue;
        }

        specs.push(
          ...parsed.map((s) =>
            decorate({
              ...s,
              facultyId: key,
              facultyName: label,
              sectionTitle: section.title,
            }),
          ),
        );
        added += parsed.length;
      }

      if (!added) {
        // Header-only sections (rare). Count as empty success, not hard fail.
        okFormIds.push(String(fac.id));
        errors.push({
          facultyId: fac.id,
          formId: String(fac.id),
          url,
          message: 'faculty sections present but no parseable specialty rows',
          empty: true,
        });
      } else {
        okFormIds.push(String(fac.id));
      }
      continue;
    }

    const html = sectionNeedles
      ? filterFacultySections(res.text, sectionNeedles)
      : res.text;

    if (sectionNeedles && !html) {
      failedFormIds.push(String(fac.id));
      errors.push({
        facultyId: fac.id,
        formId: String(fac.id),
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
      formName,
      sourceUrl: url,
      updatedAt,
    });

    if (!parsed.length) {
      failedFormIds.push(String(fac.id));
      errors.push({
        facultyId: key,
        formId: String(fac.id),
        url,
        status: res.status,
        message: 'no score-bucket rows',
        via: res.via,
      });
      continue;
    }

    specs.push(
      ...parsed.map((s) =>
        decorate({
          ...s,
          facultyId: key,
          facultyName: label,
        }),
      ),
    );
    okFormIds.push(String(fac.id));
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
      okFormIds,
      failedFormIds,
      hubUrl: uni.hubUrl || null,
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
