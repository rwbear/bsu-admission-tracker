import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const UA =
  'Mozilla/5.0 (compatible; ProhodAdmissionBot/2.0; +https://github.com/rwbear/bsu-admission-tracker)';

/** @type {string | null} */
let cachedProxy = null;

/**
 * Env override: SCRAPE_PROXY / HTTPS_PROXY / HTTP_PROXY.
 * @returns {string[]}
 */
export function configuredProxies() {
  const raw = [
    process.env.SCRAPE_PROXY,
    process.env.HTTPS_PROXY,
    process.env.HTTP_PROXY,
    process.env.https_proxy,
    process.env.http_proxy,
  ]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter(Boolean);
  return [...new Set(raw)];
}

/**
 * Public HTTP proxies near Belarus — cloud/GitHub IPs cannot TLS to abit.bsu.by.
 * @returns {Promise<string[]>}
 */
export async function discoverHttpProxies() {
  const endpoint =
    'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=7000&country=by,ru,ua,pl,lt,lv,de,kz&ssl=all&anonymity=all';
  try {
    const res = await fetch(endpoint, {
      headers: { 'User-Agent': UA, Accept: 'text/plain' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return [];
    const text = await res.text();
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(l))
      .slice(0, 60)
      .map((host) => `http://${host}`);
  } catch {
    return [];
  }
}

/**
 * curl fetch (HTTP CONNECT proxies work; Node fetch does not reliably).
 * @param {string} url
 * @param {{ proxy?: string | null, timeoutSec?: number }} [opts]
 */
export function curlFetch(url, opts = {}) {
  const timeoutSec = opts.timeoutSec ?? 30;
  const dir = mkdtempSync(join(tmpdir(), 'prohod-fetch-'));
  const out = join(dir, 'body');
  try {
    const args = [
      '-sS',
      '-L',
      '--connect-timeout',
      '8',
      '--max-time',
      String(timeoutSec),
      '-A',
      UA,
      '-H',
      'Accept: text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      '-H',
      'Accept-Language: ru-RU,ru;q=0.9,en;q=0.8',
      '-o',
      out,
      '-w',
      '%{http_code}',
    ];
    if (opts.proxy) args.push('-x', opts.proxy);
    args.push(url);

    const result = spawnSync('curl', args, { encoding: 'utf8' });
    if (result.error) {
      return {
        ok: false,
        status: 0,
        text: '',
        url,
        error: String(result.error.message || result.error),
        via: opts.proxy || 'direct',
      };
    }
    const status = Number.parseInt(String(result.stdout || '').trim(), 10) || 0;
    let text = '';
    try {
      text = decodeFetched(readFileSync(out));
    } catch {
      text = '';
    }
    const ok = status >= 200 && status < 400 && text.length > 0;
    return {
      ok,
      status,
      text,
      url,
      error: ok
        ? undefined
        : String(result.stderr || '').trim() || `HTTP ${status}`,
      via: opts.proxy || 'direct',
    };
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {Buffer} buf
 */
function decodeFetched(buf) {
  const utf8 = buf.toString('utf8');
  const utf8Ok = !utf8.includes('�') && /[А-Яа-яЁё]/.test(utf8);
  if (utf8Ok) return utf8;
  try {
    const cp1251 = new TextDecoder('windows-1251').decode(buf);
    if (/[А-Яа-яЁё]/.test(cp1251)) return cp1251;
  } catch {
    /* ignore */
  }
  return utf8;
}

/**
 * @param {string} text
 */
export function looksLikeFormk1(text) {
  if (!text || text.length < 2000) return false;
  if (/Abit_K11_TableResults/i.test(text)) return true;
  const ranges = (text.match(/\d+\s*[-\u2013]\s*\d+/g) || []).length;
  return ranges >= 8 && /[А-Яа-яЁё]/.test(text);
}

/**
 * Direct → env proxies → discovered regional proxies.
 * @param {string} url
 * @param {{ timeoutMs?: number, requireFormk1?: boolean, minBytes?: number, maxAttempts?: number }} [opts]
 */
export async function fetchTextResilient(url, opts = {}) {
  const timeoutSec = Math.ceil((opts.timeoutMs ?? 25000) / 1000);
  const requireFormk1 = opts.requireFormk1 !== false;
  const minBytes = opts.minBytes ?? (requireFormk1 ? 2000 : 500);
  const maxAttempts = opts.maxAttempts ?? 64;

  /** @type {(string | null)[]} */
  const candidates = [];
  if (cachedProxy) candidates.push(cachedProxy);
  for (const p of configuredProxies()) {
    if (!candidates.includes(p)) candidates.push(p);
  }
  candidates.push(null);

  const discovered = await discoverHttpProxies();
  for (const p of discovered) {
    if (!candidates.includes(p)) candidates.push(p);
  }

  const limited = candidates.slice(0, Math.max(1, maxAttempts));

  let last = {
    ok: false,
    status: 0,
    text: '',
    url,
    error: 'no attempts',
    via: 'none',
  };

  for (const proxy of limited) {
    const res = curlFetch(url, { proxy, timeoutSec });
    last = res;
    const contentOk =
      res.ok &&
      res.text.length >= minBytes &&
      (!requireFormk1 || looksLikeFormk1(res.text));
    if (contentOk) {
      if (proxy) cachedProxy = proxy;
      console.log(
        `[fetch] ok via ${res.via} (${res.text.length} bytes) ← ${url}`,
      );
      return { ...res, error: undefined };
    }
    await sleep(80);
  }

  console.warn(
    `[fetch] fail ${url}: ${last.error || 'unknown'} (tried ${limited.length} routes)`,
  );
  return {
    ok: false,
    status: last.status || 0,
    text: '',
    url,
    error: last.error || 'fetch failed',
    via: last.via,
  };
}

export function getCachedProxy() {
  return cachedProxy;
}

export function setCachedProxy(proxy) {
  cachedProxy = proxy;
}
