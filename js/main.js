import {
  state,
  loadPrefs,
  subscribe,
  setScore,
  setSelected,
  emit,
} from './state.js';
import { prepareSpecs } from './compute.js';
import { loadUniversity } from './load-data.js';
import { CONFIG } from './config.js';
import { $, fmtTime } from './ui/dom.js';
import {
  renderOverviewList,
  renderDetailPanel,
  renderSummary,
  resolveSelection,
} from './ui/radar.js';

const UNI_ID = CONFIG.universityId;
const SOURCE_URL = CONFIG.sourceUrl;
const POLL_MS = CONFIG.pollMs;

const $scoreInput = /** @type {HTMLInputElement} */ ($('#score-input'));
const $scoreForm = $('#score-form');
const $loading = $('#state-loading');
const $empty = $('#state-empty');
const $error = $('#state-error');
const $errorMsg = $('#error-msg');
const $results = $('#results');
const $banner = $('#data-banner');
const $sourceLink = /** @type {HTMLAnchorElement} */ ($('#source-link'));
const $overview = $('#overview-list');
const $detail = $('#detail-panel');
const $summary = $('#summary-strip');
const $commandTime = $('#command-time');
const $liveRefresh = /** @type {HTMLButtonElement} */ ($('#live-refresh'));

let pollTimer = null;
/** Serialize refreshes so LIVE click never no-ops while a poll runs. */
let fetchChain = Promise.resolve();
let liveBusy = false;

function showOnly(which) {
  for (const node of [$loading, $empty, $error, $results]) {
    node.classList.add('hidden');
  }
  if (which === 'loading') $loading.classList.remove('hidden');
  if (which === 'empty') $empty.classList.remove('hidden');
  if (which === 'error') $error.classList.remove('hidden');
  if (which === 'results') $results.classList.remove('hidden');
}

function currentSpecialties() {
  return state.uniData?.specialties || [];
}

function onSelectSpecialty(id) {
  setSelected(id);
  if (window.matchMedia('(max-width: 767px)').matches) {
    $detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function renderMasterDetail(specs, score) {
  const rows = prepareSpecs(specs, score);
  const selectedId = resolveSelection(rows, state.selectedId);
  if (selectedId !== state.selectedId) {
    setSelected(selectedId);
    return;
  }

  const updatedAt = state.uniData?.updatedAt || null;
  renderSummary($summary, rows);
  renderOverviewList($overview, specs, score, {
    selectedId,
    onSelect: onSelectSpecialty,
  });
  renderDetailPanel(
    $detail,
    rows.find((r) => r.id === selectedId) ?? null,
    score,
    { updatedAt },
  );
}

function renderBoard() {
  tickClock();
  $sourceLink.href = SOURCE_URL;

  if (state.loading && !state.uniData) {
    showOnly('loading');
    return;
  }

  if (state.error && !state.uniData) {
    $errorMsg.textContent = state.error;
    showOnly('error');
    return;
  }

  if (!state.scoreSubmitted || state.score == null) {
    showOnly('empty');
    return;
  }

  const specs = currentSpecialties();
  if (!specs.length) {
    showOnly('empty');
    $empty.querySelector('h2').textContent = 'Нет строк';
    $empty.querySelector('p').textContent =
      'Таблица могла быть пустой вне кампании, или снимок ещё не обновился.';
    return;
  }

  showOnly('results');
  renderMasterDetail(specs, state.score);
}

function applyBanner(payload) {
  if (payload?.scrapeMeta?.fixture) {
    $banner.classList.remove('hidden');
    $banner.textContent =
      'Демо-снимок: live-таблица БГУ сейчас недоступна сборщику. После успешного Actions данные подтянутся сами.';
  } else if (payload?.scrapeMeta?.retainedPrevious) {
    $banner.classList.remove('hidden');
    $banner.textContent =
      'Не удалось обновить источник — показан последний успешный снимок.';
  } else {
    $banner.classList.add('hidden');
  }
}

/**
 * @param {object | null} next
 * @param {object | null} prev
 */
function snapshotChanged(next, prev) {
  if (!next) return false;
  if (!prev) return true;
  if (next.updatedAt !== prev.updatedAt) return true;
  return JSON.stringify(next.specialties) !== JSON.stringify(prev.specialties);
}

/**
 * @param {{ silent?: boolean, forceRemote?: boolean, tryLive?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, changed: boolean }>}
 */
function fetchData(opts = {}) {
  const silent = Boolean(opts.silent);
  const forceRemote = Boolean(opts.forceRemote);
  const tryLive = Boolean(opts.tryLive);

  const run = async () => {
    if (!silent) {
      state.loading = true;
      state.error = null;
      emit();
    }

    let ok = false;
    let changed = false;
    try {
      const prev = state.uniData;
      const payload = await loadUniversity(UNI_ID, {
        bust: true,
        forceRemote,
        tryLive,
      });
      changed = snapshotChanged(payload, prev);
      state.uniData = payload;
      state.error = null;
      applyBanner(payload);
      if (!silent || changed) emit();
      else tickClock();
      ok = true;
    } catch (err) {
      if (!state.uniData) {
        state.error = err.message || String(err);
        emit();
      } else {
        console.warn('snapshot refresh failed, keeping previous data', err);
      }
    } finally {
      state.loading = false;
      if (!silent) emit();
    }
    return { ok, changed };
  };

  const queued = fetchChain.then(run, run);
  fetchChain = queued.then(
    () => undefined,
    () => undefined,
  );
  return queued;
}

function tickClock(extra = '') {
  const stamp = state.uniData?.updatedAt;
  const base = stamp ? `LIVE · ${fmtTime(stamp)}` : 'LIVE';
  $commandTime.textContent = extra ? `${base}${extra}` : base;
  $liveRefresh.title = stamp
    ? `Обновлено ${fmtTime(stamp)} · нажми, чтобы обновить`
    : 'Нажми, чтобы обновить';
}

async function refreshLive() {
  if (liveBusy) return;
  liveBusy = true;
  $commandTime.textContent = 'LIVE · обновляю…';
  $liveRefresh.classList.add('is-refreshing');
  $liveRefresh.disabled = true;

  try {
    const prev = state.uniData;
    const { ok, changed } = await fetchData({
      silent: true,
      forceRemote: true,
      tryLive: true,
    });
    tickClock();
    if (ok && !changed && prev) {
      $commandTime.textContent = `LIVE · ${fmtTime(prev.updatedAt)} · актуально`;
      $liveRefresh.title = `Снимок уже свежий · ${fmtTime(prev.updatedAt)}`;
    }
  } finally {
    $liveRefresh.classList.remove('is-refreshing');
    $liveRefresh.disabled = false;
    liveBusy = false;
  }
}

function startLivePolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    if (liveBusy) return;
    fetchData({ silent: true, forceRemote: false, tryLive: false });
  }, POLL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchData({ silent: true, forceRemote: true, tryLive: false });
    }
  });

  window.addEventListener('online', () =>
    fetchData({ silent: true, forceRemote: true, tryLive: false }),
  );
}

async function bootstrap() {
  loadPrefs();
  if (state.score != null) $scoreInput.value = String(state.score);
  $sourceLink.href = SOURCE_URL;
  tickClock();
  // Newest committed scrape on first paint (bypass Pages CDN lag).
  await fetchData({ silent: false, forceRemote: true, tryLive: false });
  startLivePolling();
}

$liveRefresh.addEventListener('click', () => {
  refreshLive();
});

$scoreForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const raw = $scoreInput.value.trim();
  const n = Number(raw);
  if (!raw || Number.isNaN(n) || n < 0 || n > 500) {
    $scoreInput.focus();
    return;
  }
  setScore(n);
  document.getElementById('board')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
});

$('#retry-btn').addEventListener('click', () =>
  fetchData({ silent: false, forceRemote: true, tryLive: true }),
);

subscribe(() => renderBoard());

bootstrap();
