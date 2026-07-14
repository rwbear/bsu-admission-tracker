/**
 * Optional on-demand scrape HTTP endpoint (Node 20+).
 * Run: node scripts/live-server.mjs
 * Deploy anywhere Node can reach regional HTTP proxies (same as Actions scrape).
 * Point the site at it via window.__PROHOD_LIVE_API__ = 'https://your.host/live'
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrapeFormk1 } from './scrape/adapters/formk1.mjs';
import { dedupeSpecs } from './scrape/normalize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const uni = JSON.parse(
  readFileSync(join(root, 'sources/universities.json'), 'utf8'),
).find((u) => u.id === 'sb-bsu');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';

/** @type {{ at: number, payload: object } | null} */
let cache = null;
const CACHE_MS = Number(process.env.LIVE_CACHE_MS || 30_000);
let inflight = null;

async function scrapeFresh() {
  if (!uni) throw new Error('sb-bsu missing from sources');
  const result = await scrapeFormk1(uni);
  const specs = dedupeSpecs(result.specs || []);
  if (!specs.length) {
    throw new Error(
      result.errors?.[0]?.message || 'empty scrape from abit.bsu.by',
    );
  }
  return {
    universityId: uni.id,
    name: uni.name,
    fullName: uni.fullName,
    hubUrl: uni.hubUrl || null,
    updatedAt: result.updatedAt,
    specialtyCount: specs.length,
    faculties: [
      {
        id: '7',
        name: 'Дневная',
        specialtyCount: specs.length,
      },
    ],
    specialties: specs,
    scrapeErrors: result.errors || [],
    scrapeMeta: {
      ...(result.meta || {}),
      liveServer: true,
    },
  };
}

async function getPayload() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.payload;
  if (inflight) return inflight;
  inflight = (async () => {
    const payload = await scrapeFresh();
    cache = { at: Date.now(), payload };
    return payload;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

function sendJson(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(raw);
}

const server = createServer(async (req, res) => {
  const path = (req.url || '/').split('?')[0];
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }
  if (req.method === 'GET' && (path === '/live' || path === '/')) {
    try {
      const payload = await getPayload();
      sendJson(res, 200, payload);
    } catch (err) {
      sendJson(res, 502, {
        error: String(err?.message || err),
      });
    }
    return;
  }
  if (req.method === 'GET' && path === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }
  sendJson(res, 404, { error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[live-server] http://${HOST}:${PORT}/live`);
});
