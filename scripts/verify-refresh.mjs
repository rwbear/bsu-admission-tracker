/**
 * Integration check: load → countdown → auto refresh.
 * Usage: node scripts/verify-refresh.mjs
 */
import puppeteer from 'puppeteer-core';

const BASE = process.env.VERIFY_URL || 'http://127.0.0.1:8765';
const POLL_MS = 3000;
const CHROME =
  process.env.CHROME_PATH ||
  '/usr/bin/google-chrome-stable';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  const fetches = [];

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (
      url.includes('sb-bsu.json') ||
      (url.includes('/commits') && url.includes('sb-bsu.json'))
    ) {
      fetches.push({ t: Date.now(), url });
    }
    req.continue();
  });

  const url = `${BASE}/index.html?pollMs=${POLL_MS}`;
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60_000 });

  await page.waitForFunction(
    () => {
      const el = document.getElementById('command-data');
      return el && /^данные \d{1,2}:\d{2}$/.test(el.textContent || '');
    },
    { timeout: 30_000 },
  );

  const afterLoad = await page.evaluate(() => ({
    data: document.getElementById('command-data')?.textContent || '',
    next: document.getElementById('command-next')?.textContent || '',
    liveState:
      document.getElementById('update-status')?.dataset.liveState || '',
    isButton:
      document.getElementById('update-status')?.tagName === 'BUTTON',
  }));

  const jsonFetchesAfterLoad = fetches.filter((f) =>
    f.url.includes('sb-bsu.json'),
  ).length;
  if (jsonFetchesAfterLoad < 1) {
    throw new Error('Expected at least one sb-bsu.json fetch on load');
  }
  if (!/^данные \d{1,2}:\d{2}$/.test(afterLoad.data)) {
    throw new Error(`Load stamp missing: ${afterLoad.data}`);
  }
  if (!afterLoad.isButton) {
    throw new Error('update-status must be a <button>');
  }
  if (!/^след \d{1,2}:\d{2}$/.test(afterLoad.next)) {
    throw new Error(`Next clock missing after load: ${afterLoad.next}`);
  }

  const fetchesBeforeWait = fetches.length;

  await new Promise((r) => setTimeout(r, POLL_MS + 2500));

  await page.waitForFunction(
    () => {
      const t = document.getElementById('command-next')?.textContent || '';
      return /^след \d{1,2}:\d{2}$/.test(t);
    },
    { timeout: 15_000 },
  );

  await new Promise((r) => setTimeout(r, 1500));

  const afterRefresh = await page.evaluate(() => ({
    data: document.getElementById('command-data')?.textContent || '',
    next: document.getElementById('command-next')?.textContent || '',
    liveState:
      document.getElementById('update-status')?.dataset.liveState || '',
  }));

  const newFetches = fetches.length - fetchesBeforeWait;
  const newJson = fetches
    .slice(fetchesBeforeWait)
    .filter((f) => f.url.includes('sb-bsu.json')).length;

  if (newJson < 1) {
    throw new Error(
      `Expected a second sb-bsu.json fetch after ${POLL_MS}ms; got ${newJson} (total delta ${newFetches})`,
    );
  }
  if (!/^данные \d{1,2}:\d{2}$/.test(afterRefresh.data)) {
    throw new Error(`Stamp lost after refresh: ${afterRefresh.data}`);
  }
  if (!/^след \d{1,2}:\d{2}$/.test(afterRefresh.next)) {
    throw new Error(`Next clock missing after refresh: ${afterRefresh.next}`);
  }

  await page.click('#update-status');
  await page.waitForFunction(
    () => document.getElementById('updates-overlay'),
    { timeout: 5_000 },
  );
  const overlayTitle = await page.evaluate(
    () => document.getElementById('updates-overlay-title')?.textContent || '',
  );
  if (overlayTitle !== 'Как обновляются данные') {
    throw new Error(`Overlay title wrong: ${overlayTitle}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        pollMs: POLL_MS,
        afterLoad,
        afterRefresh,
        overlayTitle,
        jsonFetchesOnLoad: jsonFetchesAfterLoad,
        jsonFetchesOnRefresh: newJson,
      },
      null,
      2,
    ),
  );

  await browser.close();
}

main().catch(async (err) => {
  console.error('VERIFY_FAIL', err);
  process.exitCode = 1;
});
