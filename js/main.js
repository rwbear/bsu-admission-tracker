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
import {
  formatCountdown,
  resolvePollMs,
  nextDueAt,
  shouldRefreshNow,
} from './refresh-schedule.js';

const UNI_ID = CONFIG.universityId;
const SOURCE_URL = CONFIG.sourceUrl;
const POLL_MS = resolvePollMs(CONFIG.pollMs, globalThis.location?.search || '');
const POLL_MINUTES = Math.max(1, Math.round(POLL_MS / 60_000));

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
const $updateStatus = $('#update-status');

let tickTimer = null;
let nextRefreshAt = 0;
let refreshing = false;
/** Serialize refreshes so overlapping polls queue cleanly. */
let fetchChain = Promise.resolve();
let visibilityBound = false;
let onlineBound = false;

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

function renderCommandMeta(now = Date.now()) {
  const stamp = state.uniData?.updatedAt;
  $commandTime.textContent = stamp ? `Обновлено ${fmtTime(stamp)}` : 'Загрузка';

  const baseTitle = `Автообновление каждые ${POLL_MINUTES} мин`;
  $updateStatus.title = stamp
    ? `Данные от ${fmtTime(stamp)} · ${baseTitle}`
    : baseTitle;

  if (refreshing) {
    $nextUpdate.textContent = 'обновляю…';
    return;
  }

  if (!nextRefreshAt) {
    $nextUpdate.textContent = '';
    return;
  }

  const leftMs = Math.max(0, nextRefreshAt - now);
  $nextUpdate.textContent = `следующее через ${formatCountdown(leftMs / 1000)}`;
}

function armNextRefresh(fromMs = Date.now()) {
  nextRefreshAt = nextDueAt(fromMs, POLL_MS);
  renderCommandMeta(fromMs);
}

/**
 * @param {{ silent?: boolean, armSchedule?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, changed: boolean }>}
 */
function fetchData(opts = {}) {
  const silent = Boolean(opts.silent);
  const armSchedule = opts.armSchedule !== false;

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
      const payload = await loadUniversity(UNI_ID, { bust: true });
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
      if (armSchedule) armNextRefresh();
      else renderCommandMeta();
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
  if (refreshing) return;
  if (document.visibilityState === 'hidden') return;
  // Claim the slot immediately so the 1s ticker cannot start a second pull
  // before fetchData sets `refreshing` inside the async queue.
  armNextRefresh();
  await fetchData({ silent: true, armSchedule: true });
}

/**
 * Single timer drives both countdown UI and the due pull.
 */
function onScheduleTick() {
  const now = Date.now();
  renderCommandMeta(now);
  if (
    !shouldRefreshNow(
      now,
      nextRefreshAt,
      refreshing,
      document.visibilityState === 'visible',
    )
  ) {
    return;
  }
  runScheduledRefresh();
}

function startAutoRefresh() {
  if (tickTimer) clearInterval(tickTimer);
  if (!nextRefreshAt) armNextRefresh();

  tickTimer = setInterval(onScheduleTick, 1000);

  if (!visibilityBound) {
    visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (nextRefreshAt && now >= nextRefreshAt) {
        runScheduledRefresh();
      } else {
        renderCommandMeta(now);
      }
    });
  }

  if (!onlineBound) {
    onlineBound = true;
    window.addEventListener('online', () => {
      runScheduledRefresh();
    });
  }
}

async function bootstrap() {
  loadPrefs();
  if (state.score != null) $scoreInput.value = String(state.score);
  $sourceLink.href = SOURCE_URL;
  renderCommandMeta();
  // 1) Newest committed scrape on open.
  await fetchData({ silent: false, armSchedule: true });
  // 2) Countdown → refresh every POLL_MS.
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
  fetchData({ silent: false, armSchedule: true }),
);

subscribe(() => renderBoard());

bootstrap();
