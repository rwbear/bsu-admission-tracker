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
const $nextUpdate = $('#next-update');

let pollTimer = null;
let countdownTimer = null;
let nextRefreshAt = 0;
let refreshing = false;
/** Serialize refreshes so overlapping polls queue cleanly. */
let fetchChain = Promise.resolve();

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
  renderCommandMeta();
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
 * @param {number} totalSec
 */
function formatCountdown(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function renderCommandMeta() {
  const stamp = state.uniData?.updatedAt;
  $commandTime.textContent = stamp ? `Обновлено ${fmtTime(stamp)}` : 'Загрузка';

  if (refreshing) {
    $nextUpdate.textContent = 'обновляю…';
    $nextUpdate.title = 'Тянем свежий снимок';
    return;
  }

  if (!nextRefreshAt) {
    $nextUpdate.textContent = '';
    $nextUpdate.title = '';
    return;
  }

  const leftMs = nextRefreshAt - Date.now();
  const label = formatCountdown(leftMs / 1000);
  $nextUpdate.textContent = `следующее через ${label}`;
  $nextUpdate.title = stamp
    ? `Данные от ${fmtTime(stamp)} · автообновление каждые 5 мин`
    : 'Автообновление каждые 5 мин';
}

function scheduleNextRefresh(fromMs = Date.now()) {
  nextRefreshAt = fromMs + POLL_MS;
  renderCommandMeta();
}

/**
 * @param {{ silent?: boolean, forceRemote?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, changed: boolean }>}
 */
function fetchData(opts = {}) {
  const silent = Boolean(opts.silent);
  const forceRemote = opts.forceRemote !== false;

  const run = async () => {
    refreshing = true;
    renderCommandMeta();

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
        tryLive: false,
      });
      changed = snapshotChanged(payload, prev);
      state.uniData = payload;
      state.error = null;
      applyBanner(payload);
      if (!silent || changed) emit();
      else renderCommandMeta();
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
      refreshing = false;
      scheduleNextRefresh();
      if (!silent) emit();
      else renderCommandMeta();
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

async function runScheduledRefresh() {
  if (document.visibilityState === 'hidden') {
    // Keep the clock honest: push the next attempt forward until visible.
    scheduleNextRefresh();
    return;
  }
  await fetchData({ silent: true, forceRemote: true });
}

function startAutoRefresh() {
  if (pollTimer) clearInterval(pollTimer);
  if (countdownTimer) clearInterval(countdownTimer);

  scheduleNextRefresh();

  pollTimer = setInterval(() => {
    runScheduledRefresh();
  }, POLL_MS);

  countdownTimer = setInterval(() => {
    renderCommandMeta();
  }, 1000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Refresh immediately when returning if the slot already passed.
      if (Date.now() >= nextRefreshAt) {
        runScheduledRefresh();
      } else {
        renderCommandMeta();
      }
    }
  });

  window.addEventListener('online', () => {
    runScheduledRefresh();
  });
}

async function bootstrap() {
  loadPrefs();
  if (state.score != null) $scoreInput.value = String(state.score);
  $sourceLink.href = SOURCE_URL;
  renderCommandMeta();
  await fetchData({ silent: false, forceRemote: true });
  startAutoRefresh();
}

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
  fetchData({ silent: false, forceRemote: true }),
);

subscribe(() => renderBoard());

bootstrap();
