import {
  filterFacultySections,
  parseScoreBucketTables,
  dedupeSpecs,
} from '../scripts/scrape/normalize.mjs';
import { CONFIG } from './config.js';

const SOURCE_URL = CONFIG.sourceUrl;
/** Hard cap so LIVE / first paint never hangs on dead CORS relays. */
export const LIVE_BUDGET_MS = 10_000;

/**
 * Browser CORS relays — BSU often blocks cloud IPs, so many fail.
 * When one succeeds, LIVE can refresh straight from the official table.
 */
const CORS_PROXIES = [
  {
    name: 'allorigins-raw',
    build: (url) =>
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    extract: async (res) => res.text(),
  },
  {
    name: 'allorigins-json',
    build: (url) =>
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    extract: async (res) => {
      const json = await res.json();
      return String(json?.contents || '');
    },
  },
  {
    name: 'codetabs',
    build: (url) =>
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    extract: async (res) => res.text(),
  },
  {
    name: 'corsproxy-io',
    build: (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    extract: async (res) => res.text(),
  },
  {
    name: 'corsproxy-org',
    build: (url) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
    extract: async (res) => res.text(),
  },
];

/**
 * @param {string} text
 */
function looksLikeFormk1(text) {
  if (!text || text.length < 2000) return false;
  if (/Abit_K11_TableResults/i.test(text)) return true;
  if (/class="fl"/i.test(text) && /<table/i.test(text)) return true;
  const ranges = (text.match(/\d+\s*[-\u2013]\s*\d+/g) || []).length;
  return ranges >= 8 && /[А-Яа-яЁё]/.test(text);
}

/**
 * Race CORS relays in parallel; first valid formk1 HTML wins.
 * @param {string} url
 * @param {number} [budgetMs]
 * @returns {Promise<string | null>}
 */
async function fetchHtmlViaCors(url, budgetMs = LIVE_BUDGET_MS) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), budgetMs);

  try {
    const attempts = CORS_PROXIES.map(async (proxy) => {
      const res = await fetch(proxy.build(url), {
        cache: 'no-store',
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await proxy.extract(res);
      if (!looksLikeFormk1(text)) throw new Error('not formk1');
      return text;
    });

    return await Promise.any(attempts);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    try {
      ac.abort();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Pull + parse Институт бизнеса from the live BSU table (browser).
 * @param {{ budgetMs?: number }} [opts]
 * @returns {Promise<object | null>}
 */
export async function fetchLiveUniversity(opts = {}) {
  const html = await fetchHtmlViaCors(SOURCE_URL, opts.budgetMs ?? LIVE_BUDGET_MS);
  if (!html) return null;

  const filtered = filterFacultySections(html, ['Институт бизнеса']);
  if (!filtered) return null;

  const updatedAt = new Date().toISOString();
  const specs = dedupeSpecs(
    parseScoreBucketTables(filtered, {
      universityId: CONFIG.universityId,
      facultyId: '7',
      facultyName: 'Дневная',
      form: '7',
      formName: 'Дневная',
      sourceUrl: SOURCE_URL,
      updatedAt,
    }),
  );

  if (!specs.length) return null;

  return {
    universityId: CONFIG.universityId,
    name: 'Институт бизнеса БГУ',
    fullName:
      'Институт бизнеса Белорусского государственного университета',
    hubUrl: 'https://sb.bsu.by/',
    updatedAt,
    specialtyCount: specs.length,
    faculties: [
      { id: '7', name: 'Дневная', specialtyCount: specs.length },
    ],
    specialties: specs.map((s) => ({
      ...s,
      facultyName: 'Дневная',
      formName: 'Дневная',
    })),
    scrapeErrors: [],
    scrapeMeta: {
      liveClient: true,
      source: SOURCE_URL,
    },
  };
}
