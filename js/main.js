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
import { $, fmtTime } from './ui/dom.js';
import {
  renderOverviewList,
  renderDetailPanel,
  renderSummary,
  resolveSelection,
} from './ui/radar.js';

const UNI_ID = 'sb-bsu';
const SOURCE_URL = 'https://abit.bsu.by/formk1?id=7';
/** How often the client re-pulls data/*.json (Pages may lag the scraper). */
const POLL_MS = 60_000;

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
let fetching = false;
/** ISO time of the last successful client pull (what LIVE displays). */
let lastCheckedAt = null;

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

function freshnessMeta() {
  return {
    snapshotAt: state.uniData?.updatedAt || null,
    checkedAt: lastCheckedAt,
  };
}

function renderMasterDetail(specs, score) {
  const rows = prepareSpecs(specs, score);
  const selectedId = resolveSelection(rows, state.selectedId);
  if (selectedId !== state.selectedId) {
    setSelected(selectedId);
    return;
  }

  renderSummary($summary, rows);
  renderOverviewList($overview, specs, score, {
    selectedId,
    onSelect: onSelectSpecialty,
  });
  renderDetailPanel(
    $detail,
    rows.find((r) => r.id === selectedId) ?? null,
    score,
    freshnessMeta(),
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
 * @param {{ silent?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
async function fetchData(opts = {}) {
  const silent = Boolean(opts.silent);
  if (fetching) return false;
  fetching = true;

  if (!silent) {
    state.loading = true;
    state.error = null;
    emit();
  }

  let ok = false;
  try {
    const prev = state.uniData;
    const payload = await loadUniversity(UNI_ID, { bust: true });
    const changed = snapshotChanged(payload, prev);
    state.uniData = payload;
    state.error = null;
    lastCheckedAt = new Date().toISOString();
    applyBanner(payload);
    emit();
    if (!changed && silent) tickClock();
    ok = true;
  } catch (err) {
    if (!state.uniData) {
      state.error = err.message || String(err);
      emit();
    } else {
      console.warn('live refresh failed, keeping previous snapshot', err);
    }
  } finally {
    state.loading = false;
    fetching = false;
    if (!silent) emit();
  }
  return ok;
}

function tickClock() {
  const stamp = lastCheckedAt || state.uniData?.updatedAt;
  $commandTime.textContent = stamp ? `LIVE · ${fmtTime(stamp)}` : 'LIVE';
  const snap = state.uniData?.updatedAt
    ? `Снимок: ${fmtTime(state.uniData.updatedAt)}`
    : 'Нет снимка';
  $liveRefresh.title = `${snap} · нажми, чтобы проверить сейчас`;
}

async function refreshLive() {
  if (fetching) return;
  $commandTime.textContent = 'LIVE · обновляю…';
  $liveRefresh.classList.add('is-refreshing');
  $liveRefresh.disabled = true;

  await fetchData({ silent: true });
  tickClock();

  $liveRefresh.classList.remove('is-refreshing');
  $liveRefresh.disabled = false;
}

function startLivePolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    fetchData({ silent: true });
  }, POLL_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      fetchData({ silent: true });
    }
  });

  window.addEventListener('online', () => fetchData({ silent: true }));
}

async function bootstrap() {
  loadPrefs();
  if (state.score != null) $scoreInput.value = String(state.score);
  $sourceLink.href = SOURCE_URL;
  tickClock();
  await fetchData({ silent: false });
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

$('#retry-btn').addEventListener('click', () => fetchData({ silent: false }));

subscribe(() => renderBoard());

bootstrap();
