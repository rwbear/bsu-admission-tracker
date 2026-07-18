import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const UA =
  'Mozilla/5.0 (compatible; RwbAdmissionBot/2.0; +https://github.com/rwbear/bsu-admission-tracker)';

/** @type {string | null} */
let cachedProxy = null;

/** @type {string[] | null} */
let cachedDiscovery = null;

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function isCiEnvironment(env = process.env) {
  return env.GITHUB_ACTIONS === 'true' || env.CI === 'true';
}

/**
 * Env override: SCRAPE_PROXY / HTTPS_PROXY / HTTP_PROXY.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string[]}
 */
export function configuredProxies(env = process.env) {
  const raw = [
    env.SCRAPE_PROXY,
    env.HTTPS_PROXY,
    env.HTTP_PROXY,
    env.https_proxy,
    env.http_proxy,
  ]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter(Boolean);
  return [...new Set(raw)];
}

/**
 * Public ProxyScrape lists are a fallback when no trusted SCRAPE_PROXY is set.
 * When a trusted proxy IS set, stay on that channel only — junk public
 * proxies can return truncated HTML. Content probes (minBytes + formk1)
 * still reject empty shells either way.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function allowPublicProxyDiscovery(env = process.env) {
  const flag = String(env.SCRAPE_ALLOW_PUBLIC_PROXIES || '').trim();
  if (flag === '1' || flag.toLowerCase() === 'true') return true;
  if (flag === '0' || flag.toLowerCase() === 'false') return false;
  // Trusted channel present → never mix in public lists.
  if (configuredProxies(env).length > 0) return false;
  // CI without a secret must still scrape — direct TLS to abit.bsu.by resets.
  return true;
}

/**
 * Prefer SCRAPE_PROXY in CI. Missing secret is a warning, not a hard stop —
 * public discovery (with formk1/minBytes gates) keeps the pipeline alive.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function assertCiProxyConfigured(env = process.env) {
  if (!isCiEnvironment(env)) return;
  const trusted = String(env.SCRAPE_PROXY || '').trim();
  if (trusted) return;
  console.warn(
    '[proxy] SCRAPE_PROXY secret is not set — using public proxy discovery ' +
      'with strict formk1/minBytes checks. Set SCRAPE_PROXY=http://user:pass@host:port ' +
      'for a stable channel.',
  );
}

/**
 * Public HTTP proxies near Belarus — cloud/GitHub IPs cannot TLS to abit.bsu.by.
 * @returns {Promise<string[]>}
 */
export async function discoverHttpProxies() {
  if (cachedDiscovery) return cachedDiscovery;
  const endpoint =
    'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=7000&country=by,ru,ua,pl,lt,lv,de,kz&ssl=all&anonymity=all';
  try {
    const res = await fetch(endpoint, {
      headers: { 'User-Agent': UA, Accept: 'text/plain' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      cachedDiscovery = [];
      return cachedDiscovery;
    }
    const text = await res.text();
    cachedDiscovery = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(l))
      .slice(0, 60)
      .map((host) => `http://${host}`);
    return cachedDiscovery;
  } catch {
    cachedDiscovery = [];
    return cachedDiscovery;
  }
}

/**
 * curl fetch (HTTP CONNECT proxies work; Node fetch does not reliably).
 * @param {string} url
 * @param {{ proxy?: string | null, timeoutSec?: number }} [opts]
 */
export function curlFetch(url, opts = {}) {
  const timeoutSec = opts.timeoutSec ?? 30;
  const dir = mkdtempSync(join(tmpdir(), 'rwb-fetch-'));
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
 * Build proxy candidates for one fetch.
 * Order: cached → configured (SCRAPE_PROXY…) → optional public → optional direct.
 * Direct is last and off in CI — GitHub IPs always TLS-reset to abit.bsu.by.
 * @param {{
 *   cached?: string | null,
 *   configured?: string[],
 *   discovered?: string[],
 *   allowPublic?: boolean,
 *   allowDirect?: boolean,
 *   maxAttempts?: number,
 * }} [opts]
 * @returns {(string | null)[]}
 */
export function buildProxyCandidates(opts = {}) {
  const maxAttempts = opts.maxAttempts ?? 64;
  const allowDirect = opts.allowDirect !== false;
  /** @type {(string | null)[]} */
  const candidates = [];
  if (opts.cached) candidates.push(opts.cached);
  for (const p of opts.configured || []) {
    if (!candidates.includes(p)) candidates.push(p);
  }
  if (opts.allowPublic) {
    for (const p of opts.discovered || []) {
      if (!candidates.includes(p)) candidates.push(p);
    }
  }
  // Direct only when useful (local). Never burn CI timeouts on a known wall.
  if (allowDirect && !candidates.includes(null)) candidates.push(null);
  return candidates.slice(0, Math.max(1, maxAttempts));
}

/**
 * Trusted/configured proxies first. Public discovery only when allowed.
 * @param {string} url
 * @param {{ timeoutMs?: number, requireFormk1?: boolean, minBytes?: number, maxAttempts?: number }} [opts]
 */
export async function fetchTextResilient(url, opts = {}) {
  assertCiProxyConfigured();

  const timeoutSec = Math.ceil((opts.timeoutMs ?? 25000) / 1000);
  const requireFormk1 = opts.requireFormk1 !== false;
  const minBytes = opts.minBytes ?? (requireFormk1 ? 2000 : 500);
  const maxAttempts = opts.maxAttempts ?? 64;
  const allowPublic = allowPublicProxyDiscovery();
  const configured = configuredProxies();
  // Cloud runners cannot TLS to abit.bsu.by — skip direct there.
  const allowDirect = !isCiEnvironment();

  const discovered = allowPublic ? await discoverHttpProxies() : [];
  if (!allowPublic && configured.length) {
    console.log(
      `[fetch] trusted proxy only (${configured.length} configured) — public discovery off`,
    );
  } else if (allowPublic && !configured.length) {
    console.log(
      `[fetch] public proxy discovery on (${discovered.length} candidates) — set SCRAPE_PROXY for a stable channel`,
    );
  }

  const limited = buildProxyCandidates({
    cached: cachedProxy,
    configured,
    discovered,
    allowPublic,
    allowDirect,
    maxAttempts,
  });

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
    // Trusted proxy returned junk/truncated — do not keep it cached.
    if (proxy && proxy === cachedProxy) cachedProxy = null;
    await sleep(80);
  }

  console.warn(
    `[fetch] fail ${url}: ${last.error || 'unknown'} (tried ${limited.length} routes` +
      (allowPublic ? '' : ', public discovery off') +
      ')',
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
