import {
  state,
  loadPrefs,
  subscribe,
  setScore,
  setSelected,
  setFaculty,
} from './state.js';
import { prepareSpecs } from './compute.js';
import { loadUniversity } from './load-data.js';
import { CONFIG } from './config.js';
import { resolveFacultyId } from './faculties.js';
import { $, fmtTime } from './ui/dom.js';
import {
  renderOverviewList,
  renderDetailPanel,
  renderSummary,
  resolveSelection,
} from './ui/radar.js';
import { renderFacultyPicker } from './ui/faculty-picker.js';
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
const $facultyMount = $('#faculty-picker-mount');

let tickTimer = null;
let nextRefreshAt = 0;
let refreshing = false;
/** Serialize refreshes so overlapping polls queue cleanly. */
let fetchChain = Promise.resolve();
let visibilityBound = false;
let onlineBound = false;
let facultyMenuOpen = false;
let facultySearchQuery = '';
let facultyOutsideBound = false;

function showOnly(which) {
  for (const node of [$loading, $empty, $error, $results]) {
    node.classList.add('hidden');
  }
  if (which === 'loading') $loading.classList.remove('hidden');
  if (which === 'empty') $empty.classList.remove('hidden');
  if (which === 'error') $error.classList.remove('hidden');
  if (which === 'results') $results.classList.remove('hidden');
}

function facultyList() {
  return state.uniData?.faculties || [];
}

function syncFacultySelection() {
  const next = resolveFacultyId(facultyList(), state.facultyId);
  if (next !== state.facultyId) {
    state.facultyId = next;
    if (next) localStorage.setItem('prohod-sb-faculty', next);
    else localStorage.removeItem('prohod-sb-faculty');
  }
}

function currentSpecialties() {
  const all = state.uniData?.specialties || [];
  if (!state.facultyId) return all;
  return all.filter((s) => s.facultyId === state.facultyId);
}

function closeFacultyMenu() {
  if (!facultyMenuOpen) return;
  facultyMenuOpen = false;
  facultySearchQuery = '';
  renderFacultyChrome();
  const trigger = document.getElementById('faculty-trigger');
  if (trigger instanceof HTMLElement) trigger.focus();
}

function openFacultyMenu() {
  facultyMenuOpen = true;
  facultySearchQuery = '';
  renderFacultyChrome();
  queueMicrotask(() => {
    const search = document.getElementById('faculty-search-input');
    if (search instanceof HTMLInputElement) {
      search.focus();
      search.select();
    }
  });
}

function toggleFacultyMenu() {
  if (facultyMenuOpen) closeFacultyMenu();
  else openFacultyMenu();
}

function onSelectFaculty(id) {
  facultyMenuOpen = false;
  facultySearchQuery = '';
  if (id !== state.facultyId) setFaculty(id);
  else renderFacultyChrome();
  const trigger = document.getElementById('faculty-trigger');
  if (trigger instanceof HTMLElement) trigger.focus();
}

function onFacultyQuery(q) {
  facultySearchQuery = q;
  const active = document.activeElement;
  const keepSearch =
    active instanceof HTMLInputElement && active.id === 'faculty-search-input';
  const caret = keepSearch ? active.selectionStart : null;
  renderFacultyChrome();
  if (keepSearch) {
    const search = document.getElementById('faculty-search-input');
    if (search instanceof HTMLInputElement) {
      search.focus();
      if (caret != null) search.setSelectionRange(caret, caret);
    }
  }
}

function renderFacultyChrome() {
  renderFacultyPicker($facultyMount, {
    faculties: facultyList(),
    selectedId: state.facultyId,
    open: facultyMenuOpen,
    query: facultySearchQuery,
    onToggle: toggleFacultyMenu,
    onSelect: onSelectFaculty,
    onClose: closeFacultyMenu,
    onQuery: onFacultyQuery,
  });
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
  syncFacultySelection();
  renderFacultyChrome();
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
    $empty.querySelector('h2').textContent = 'Введи балл';
    $empty.querySelector('p').textContent =
      'Сверху выбери факультет. Затем — обзор специальностей и детали.';
    return;
  }

  const specs = currentSpecialties();
  if (!specs.length) {
    showOnly('empty');
    $empty.querySelector('h2').textContent = 'Нет строк';
    $empty.querySelector('p').textContent =
      'На этом факультете пока нет данных — выбери другой или дождись обновления.';
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
      syncFacultySelection();
      state.error = null;
      applyBanner(payload);
      if (!silent || changed) emit();
      else {
        renderFacultyChrome();
        renderCommandMeta();
      }
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
  armNextRefresh();
  await fetchData({ silent: true, armSchedule: true });
}

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

function bindFacultyChrome() {
  if (facultyOutsideBound) return;
  facultyOutsideBound = true;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && facultyMenuOpen) {
      e.preventDefault();
      closeFacultyMenu();
      return;
    }

    if (!facultyMenuOpen) return;
    if (
      e.key !== 'ArrowDown' &&
      e.key !== 'ArrowUp' &&
      e.key !== 'Home' &&
      e.key !== 'End'
    ) {
      return;
    }

    const host = document.getElementById('faculty-overlay');
    if (!host) return;
    const options = [...host.querySelectorAll('.faculty-option')];
    if (!options.length) return;

    // Typing in search: only ArrowDown jumps into the list.
    const inSearch =
      document.activeElement instanceof HTMLInputElement &&
      document.activeElement.id === 'faculty-search-input';
    if (inSearch && e.key !== 'ArrowDown') return;

    e.preventDefault();
    const active = document.activeElement;
    let idx = options.findIndex((n) => n === active);
    if (e.key === 'Home') idx = 0;
    else if (e.key === 'End') idx = options.length - 1;
    else if (e.key === 'ArrowDown')
      idx = Math.min(options.length - 1, Math.max(0, idx) + 1);
    else if (e.key === 'ArrowUp') {
      if (idx <= 0) {
        const search = document.getElementById('faculty-search-input');
        if (search instanceof HTMLElement) search.focus();
        return;
      }
      idx -= 1;
    }
    const next = options[idx];
    if (next instanceof HTMLElement) next.focus();
  });
}

async function bootstrap() {
  loadPrefs();
  if (state.score != null) $scoreInput.value = String(state.score);
  $sourceLink.href = SOURCE_URL;
  bindFacultyChrome();
  renderFacultyChrome();
  renderCommandMeta();
  await fetchData({ silent: false, armSchedule: true });
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
