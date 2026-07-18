import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeFormk1,
  allowPublicProxyDiscovery,
  assertCiProxyConfigured,
  buildProxyCandidates,
  configuredProxies,
  isCiEnvironment,
} from '../scripts/scrape/proxy.mjs';

describe('formk1 probe', () => {
  it('rejects tiny shells', () => {
    assert.equal(looksLikeFormk1('ok'), false);
    assert.equal(looksLikeFormk1('x'.repeat(3000)), false);
  });

  it('accepts monitoring markers', () => {
    const ranges = Array.from(
      { length: 10 },
      (_, i) => `${400 - i * 5} - ${396 - i * 5}`,
    ).join(' ');
    const text = `Абитуриент monitoring ${ranges}${'y'.repeat(2000)}`;
    assert.equal(looksLikeFormk1(text), true);
    assert.equal(
      looksLikeFormk1(`prefix Abit_K11_TableResults ${'z'.repeat(2500)}`),
      true,
    );
  });
});

describe('proxy policy', () => {
  it('detects CI from GITHUB_ACTIONS / CI', () => {
    assert.equal(isCiEnvironment({ GITHUB_ACTIONS: 'true' }), true);
    assert.equal(isCiEnvironment({ CI: 'true' }), true);
    assert.equal(isCiEnvironment({}), false);
  });

  it('reads configured proxies without duplicates', () => {
    assert.deepEqual(
      configuredProxies({
        SCRAPE_PROXY: 'http://a:1',
        HTTPS_PROXY: 'http://a:1',
        HTTP_PROXY: 'http://b:2',
      }),
      ['http://a:1', 'http://b:2'],
    );
  });

  it('disables public discovery when SCRAPE_PROXY is set', () => {
    assert.equal(
      allowPublicProxyDiscovery({ SCRAPE_PROXY: 'http://proxy:8080' }),
      false,
    );
  });

  it('allows public discovery in CI when SCRAPE_PROXY is missing', () => {
    // Fail-open for the scrape channel — secret was never set in prod and
    // hard-require froze the pipeline. Content gates still protect tables.
    assert.equal(allowPublicProxyDiscovery({ GITHUB_ACTIONS: 'true' }), true);
  });

  it('allows public discovery locally without trusted proxy', () => {
    assert.equal(allowPublicProxyDiscovery({}), true);
  });

  it('honors SCRAPE_ALLOW_PUBLIC_PROXIES override', () => {
    assert.equal(
      allowPublicProxyDiscovery({
        SCRAPE_PROXY: 'http://proxy:8080',
        SCRAPE_ALLOW_PUBLIC_PROXIES: '1',
      }),
      true,
    );
    assert.equal(
      allowPublicProxyDiscovery({ SCRAPE_ALLOW_PUBLIC_PROXIES: '0' }),
      false,
    );
  });

  it('assertCiProxyConfigured warns but does not throw without SCRAPE_PROXY', () => {
    assert.doesNotThrow(() =>
      assertCiProxyConfigured({ GITHUB_ACTIONS: 'true' }),
    );
    assert.doesNotThrow(() =>
      assertCiProxyConfigured({
        GITHUB_ACTIONS: 'true',
        SCRAPE_PROXY: 'http://proxy:8080',
      }),
    );
    assert.doesNotThrow(() => assertCiProxyConfigured({}));
  });

  it('buildProxyCandidates: trusted → public → optional direct', () => {
    const trusted = buildProxyCandidates({
      cached: 'http://cache:1',
      configured: ['http://trust:2'],
      discovered: ['http://public:3'],
      allowPublic: false,
      allowDirect: true,
    });
    assert.deepEqual(trusted, ['http://cache:1', 'http://trust:2', null]);

    const withPublic = buildProxyCandidates({
      configured: ['http://trust:2'],
      discovered: ['http://public:3'],
      allowPublic: true,
      allowDirect: true,
    });
    assert.deepEqual(withPublic, [
      'http://trust:2',
      'http://public:3',
      null,
    ]);

    const ciPublic = buildProxyCandidates({
      configured: [],
      discovered: ['http://public:3'],
      allowPublic: true,
      allowDirect: false,
    });
    assert.deepEqual(ciPublic, ['http://public:3']);
  });
});
