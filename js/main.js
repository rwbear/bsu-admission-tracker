import {
  state,
  loadPrefs,
  subscribe,
  setScore,
  setForm,
  setSelected,
  emit,
} from './state.js';
import { prepareSpecs } from './compute.js';
import { loadUniversity } from './load-data.js';
import { $, fmtAge } from './ui/dom.js';
import {
  renderOverviewList,
  renderDetailPanel,
  renderSummary,
  resolveSelection,
} from './ui/radar.js';

const UNI_ID = 'sb-bsu';
/** How often the client re-pulls data/*.json (Pages may lag the scraper). */
const POLL_MS = 60_000;
/** Re-render the relative "ago" stamp. */
const AGE_TICK_MS = 15_000;

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

let pollTimer = null;
let fetching = false;

function showOnly(which) {
  for (const node of [$loading, $empty, $error, $results]) {
    node.classList.add('hidden');
  }
  if (which === 'loading') $loading.classList.remove('hidden');
  if (which === 'empty') $empty.classList.remove('hidden');
  if (which === 'error') $error.classList.remove('hidden');
  if (which === 'results') $results.classList.remove('hidden');
}

function syncFormButtons() {
  document.querySelectorAll('.form-btn').forEach((btn) => {
    const id = btn.getAttribute('data-form');
    btn.classList.toggle('active', id === state.formId);
  });
  $sourceLink.href = `https://abit.bsu.by/formk1?id=${state.formId}`;
}

function currentSpecialties() {
  const all = state.uniData?.specialties || [];
  return all.filter((s) => String(s.facultyId) === String(state.formId));
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
    return; // subscribe will re-render
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
  );
}

function renderBoard() {
  syncFormButtons();
  tickClock();

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
 */
async function fetchData(opts = {}) {
  const silent = Boolean(opts.silent);
  if (fetching) return;
  fetching = true;

  if (!silent) {
    state.loading = true;
    state.error = null;
    emit();
  }

  try {
    const prev = state.uniData;
    const payload = await loadUniversity(UNI_ID, { bust: true });
    const changed = snapshotChanged(payload, prev);
    state.uniData = payload;
    state.error = null;
    applyBanner(payload);
    if (!silent || changed) emit();
    else tickClock();
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
}

function tickClock() {
  const age = fmtAge(state.uniData?.updatedAt);
  $commandTime.textContent = `LIVE · ${age}`;
  $commandTime.title = state.uniData?.updatedAt
    ? `Снимок: ${state.uniData.updatedAt}`
    : '';
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
  syncFormButtons();
  tickClock();
  setInterval(tickClock, AGE_TICK_MS);
  await fetchData({ silent: false });
  tickClock();
  startLivePolling();
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

document.querySelectorAll('.form-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = /** @type {'7' | '8'} */ (btn.getAttribute('data-form') || '7');
    setForm(id);
  });
});

$('#retry-btn').addEventListener('click', () => fetchData({ silent: false }));

subscribe(() => renderBoard());

bootstrap();
