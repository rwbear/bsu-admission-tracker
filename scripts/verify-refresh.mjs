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

  // Wait until header shows data loaded (not "Загрузка")
  await page.waitForFunction(
    () => {
      const el = document.getElementById('command-age-value');
      const verb = document.getElementById('command-age-verb');
      return (
        el &&
        verb &&
        !verb.hidden &&
        el.textContent &&
        el.textContent !== 'Загрузка'
      );
    },
    { timeout: 30_000 },
  );

  const afterLoad = await page.evaluate(() => ({
    age: document.getElementById('command-age-value')?.textContent || '',
    suffix: document.getElementById('command-suffix')?.textContent || '',
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
  if (!afterLoad.age || afterLoad.age === 'Загрузка') {
    throw new Error(`Load stamp missing: ${afterLoad.age}`);
  }
  if (!afterLoad.isButton) {
    throw new Error('update-status must be a <button>');
  }
  if (
    !/ещё/.test(afterLoad.suffix) &&
    !/обновляю/.test(afterLoad.suffix) &&
    !/ждём свежий сбор/.test(afterLoad.suffix)
  ) {
    throw new Error(`Suffix missing after load: ${afterLoad.suffix}`);
  }

  const fetchesBeforeWait = fetches.length;

  // Wait past one poll window + buffer for network
  await new Promise((r) => setTimeout(r, POLL_MS + 2500));

  await page.waitForFunction(
    () => {
      const t = document.getElementById('command-suffix')?.textContent || '';
      // After refresh, countdown near a full interval again (or mid-flight)
      return (
        /ещё [1-9]/.test(t) ||
        /ещё 0:[1-9]/.test(t) ||
        /обновляю/.test(t)
      );
    },
    { timeout: 15_000 },
  );

  // Extra beat so a mid-flight refresh can finish
  await new Promise((r) => setTimeout(r, 1500));

  const afterRefresh = await page.evaluate(() => ({
    age: document.getElementById('command-age-value')?.textContent || '',
    suffix: document.getElementById('command-suffix')?.textContent || '',
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
  if (!afterRefresh.age || afterRefresh.age === 'Загрузка') {
    throw new Error(`Stamp lost after refresh: ${afterRefresh.age}`);
  }
  if (!/ещё/.test(afterRefresh.suffix) && !/обновляю/.test(afterRefresh.suffix)) {
    throw new Error(`Countdown missing after refresh: ${afterRefresh.suffix}`);
  }

  // Overlay opens from the timer button
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
