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
      const el = document.getElementById('command-time');
      return el && el.textContent && el.textContent.startsWith('Обновлено');
    },
    { timeout: 30_000 },
  );

  const afterLoad = await page.evaluate(() => ({
    command: document.getElementById('command-time')?.textContent || '',
    next: document.getElementById('next-update')?.textContent || '',
  }));

  const jsonFetchesAfterLoad = fetches.filter((f) =>
    f.url.includes('sb-bsu.json'),
  ).length;
  if (jsonFetchesAfterLoad < 1) {
    throw new Error('Expected at least one sb-bsu.json fetch on load');
  }
  if (!afterLoad.command.startsWith('Обновлено')) {
    throw new Error(`Load stamp missing: ${afterLoad.command}`);
  }
  if (!/следующее через/.test(afterLoad.next)) {
    throw new Error(`Countdown missing after load: ${afterLoad.next}`);
  }

  const fetchesBeforeWait = fetches.length;

  // Wait past one poll window + buffer for network
  await new Promise((r) => setTimeout(r, POLL_MS + 2500));

  await page.waitForFunction(
    () => {
      const el = document.getElementById('next-update');
      const t = el?.textContent || '';
      // After refresh, countdown should be near a full interval again (not stuck on 0:00)
      return /следующее через [1-9]/.test(t) || /следующее через 0:[1-9]/.test(t) || /обновляю/.test(t);
    },
    { timeout: 15_000 },
  );

  // Extra beat so a mid-flight refresh can finish
  await new Promise((r) => setTimeout(r, 1500));

  const afterRefresh = await page.evaluate(() => ({
    command: document.getElementById('command-time')?.textContent || '',
    next: document.getElementById('next-update')?.textContent || '',
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
  if (!afterRefresh.command.startsWith('Обновлено')) {
    throw new Error(`Stamp lost after refresh: ${afterRefresh.command}`);
  }
  if (!/следующее через/.test(afterRefresh.next)) {
    throw new Error(`Countdown missing after refresh: ${afterRefresh.next}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        pollMs: POLL_MS,
        afterLoad,
        afterRefresh,
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
