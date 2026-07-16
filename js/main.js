import {
  state,
  loadPrefs,
  subscribe,
  emit,
  setScore,
  setSelected,
  setFaculty,
  setForm,
} from './state.js';
import { prepareSpecs } from './compute.js';
import { loadUniversity } from './load-data.js';
import { CONFIG } from './config.js';
import { resolveFacultyId, sortFaculties } from './faculties.js';
import { normalizeUniversityPayload } from './spec-id.js';
import {
  DEFAULT_TABLE_ID,
  facultiesForTable,
  listCatalogTables,
  resolveTableId,
  sourceUrlForTable,
} from './tables.js';
import { $, fmtTime, fmtAge } from './ui/dom.js';
import {
  renderOverviewList,
  renderDetailPanel,
  renderSummary,
  resolveSelection,
} from './ui/radar.js';
import { renderFacultyPicker } from './ui/faculty-picker.js';
import { renderTablePicker } from './ui/table-picker.js';
import {
  formatCountdown,
  resolvePollMs,
  resolveEffectivePollMs,
  isSnapshotStale,
  nextDueAt,
  shouldRefreshNow,
} from './refresh-schedule.js';
import { metaRotatorPhase, metaFadeMs } from './command-meta.js';

const UNI_ID = CONFIG.universityId;
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
const $tableMount = $('#table-picker-mount');
const $facultyMount = $('#faculty-picker-mount');

let tickTimer = null;
let nextRefreshAt = 0;
let refreshing = false;
/** Epoch for age ↔ countdown fade in the shared header slot. */
let metaRotateEpoch = Date.now();
/** Currently fully-shown (or mid-transition target) meta line. */
let metaShownPhase = 'age';
/** True while hiding the old line before revealing the new one. */
let metaSwapBusy = false;
/** Latest desired phase if a swap was requested mid-transition. */
let metaSwapPending = null;
let metaSwapTimer = 0;
/** Serialize refreshes so overlapping polls queue cleanly. */
let fetchChain = Promise.resolve();
let visibilityBound = false;
let onlineBound = false;
let facultyMenuOpen = false;
let facultySearchQuery = '';
let facultyOutsideBound = false;
let tableMenuOpen = false;
let tableSearchQuery = '';

function showOnly(which) {
  for (const node of [$loading, $empty, $error, $results]) {
    node.classList.add('hidden');
  }
  if (which === 'loading') $loading.classList.remove('hidden');
  if (which === 'empty') $empty.classList.remove('hidden');
  if (which === 'error') $error.classList.remove('hidden');
  if (which === 'results') $results.classList.remove('hidden');
}

function tableList() {
  const fromData = state.uniData?.tables;
  if (Array.isArray(fromData) && fromData.length) return fromData;
  return listCatalogTables();
}

function syncTableSelection() {
  const next = resolveTableId(tableList(), state.formId);
  if (next !== state.formId) {
    state.formId = next;
    localStorage.setItem('prohod-sb-form', next);
  } else if (next) {
    localStorage.setItem('prohod-sb-form', next);
  }
}

function facultyList() {
  const formId = state.formId || DEFAULT_TABLE_ID;
  const fromSpecs = facultiesForTable(
    state.uniData?.specialties || [],
    formId,
  );
  if (fromSpecs.length) return sortFaculties(fromSpecs);
  return sortFaculties(state.uniData?.faculties || []);
}

function syncFacultySelection() {
  const next = resolveFacultyId(facultyList(), state.facultyId);
  if (next !== state.facultyId) {
    state.facultyId = next;
    if (next) localStorage.setItem('prohod-sb-faculty', next);
    else localStorage.removeItem('prohod-sb-faculty');
  } else if (next) {
    localStorage.setItem('prohod-sb-faculty', next);
  }
}

function currentSpecialties() {
  const all = state.uniData?.specialties || [];
  const formId = state.formId || DEFAULT_TABLE_ID;
  const inTable = all.filter((s) => String(s.form) === String(formId));
  if (!state.facultyId) return inTable;
  return inTable.filter((s) => s.facultyId === state.facultyId);
}

function closeTableMenu() {
  if (!tableMenuOpen) return;
  tableMenuOpen = false;
  tableSearchQuery = '';
  renderTableChrome();
  const trigger = document.getElementById('table-trigger');
  if (trigger instanceof HTMLElement) trigger.focus();
}

function openTableMenu() {
  closeFacultyMenu();
  tableMenuOpen = true;
  tableSearchQuery = '';
  renderTableChrome();
  queueMicrotask(() => {
    const dialog = document.getElementById('table-overlay');
    if (dialog instanceof HTMLElement) dialog.focus();
  });
}

function toggleTableMenu() {
  if (tableMenuOpen) closeTableMenu();
  else openTableMenu();
}

function onSelectTable(id) {
  tableMenuOpen = false;
  tableSearchQuery = '';
  if (id !== state.formId) setForm(id);
  else renderHeroChrome();
  // After table change, re-resolve faculty defaults for that table.
  syncFacultySelection();
  const trigger = document.getElementById('table-trigger');
  if (trigger instanceof HTMLElement) trigger.focus();
}

function onTableQuery(q) {
  tableSearchQuery = q;
  const active = document.activeElement;
  const keepSearch =
    active instanceof HTMLInputElement && active.id === 'table-search-input';
  const caret = keepSearch ? active.selectionStart : null;
  renderTableChrome();
  if (keepSearch) {
    const search = document.getElementById('table-search-input');
    if (search instanceof HTMLInputElement) {
      search.focus();
      if (caret != null) search.setSelectionRange(caret, caret);
    }
  }
}

function renderTableChrome() {
  if (!$tableMount) return;
  renderTablePicker($tableMount, {
    tables: tableList(),
    selectedId: state.formId,
    open: tableMenuOpen,
    query: tableSearchQuery,
    onToggle: toggleTableMenu,
    onSelect: onSelectTable,
    onClose: closeTableMenu,
    onQuery: onTableQuery,
  });
}

function closeFacultyMenu() {
  if (!facultyMenuOpen) return;
  facultyMenuOpen = false;
  facultySearchQuery = '';
  renderFacultyChrome();
  window.setTimeout(() => {
    if (facultyMenuOpen) return;
    const trigger = document.getElementById('faculty-trigger');
    if (trigger instanceof HTMLElement) trigger.focus();
  }, 220);
}

function openFacultyMenu() {
  closeTableMenu();
  facultyMenuOpen = true;
  facultySearchQuery = '';
  renderFacultyChrome();
  queueMicrotask(() => {
    const dialog = document.getElementById('faculty-overlay');
    if (dialog instanceof HTMLElement) dialog.focus();
    const active = dialog?.querySelector('.faculty-option.is-active');
    if (active instanceof HTMLElement) {
      active.scrollIntoView({ block: 'nearest' });
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
  window.setTimeout(() => {
    if (facultyMenuOpen) return;
    const trigger = document.getElementById('faculty-trigger');
    if (trigger instanceof HTMLElement) trigger.focus();
  }, 220);
}

function onFacultyQuery(q) {
  facultySearchQuery = q;
  // Overlay stays mounted — picker only repaints the option list.
  renderFacultyChrome();
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

function renderHeroChrome() {
  renderTableChrome();
  renderFacultyChrome();
}

function onSelectSpecialty(id) {
  setSelected(id);
  if (window.matchMedia('(max-width: 767px)').matches) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    $detail.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'nearest',
    });
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
  try {
    syncTableSelection();
    syncFacultySelection();
    renderHeroChrome();
    renderCommandMeta();
    $sourceLink.href = sourceUrlForTable(state.formId || DEFAULT_TABLE_ID);

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
      const h2 = $empty.querySelector('h2');
      const p = $empty.querySelector('p');
      if (h2) h2.textContent = 'Введи балл';
      if (p) {
        p.textContent =
          'Сверху — таблица мониторинга и факультет. Дальше — обзор и детали.';
      }
      return;
    }

    const specs = currentSpecialties();
    if (!specs.length) {
      showOnly('empty');
      const h2 = $empty.querySelector('h2');
      const p = $empty.querySelector('p');
      if (h2) h2.textContent = 'Нет строк';
      if (p) {
        p.textContent =
          'На этом факультете пока нет данных — выбери другой или дождись обновления.';
      }
      return;
    }

    showOnly('results');
    renderMasterDetail(specs, state.score);
  } catch (err) {
    console.error('renderBoard failed', err);
    $errorMsg.textContent = err?.message || String(err);
    showOnly('error');
  }
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
  } else if (payload?.scrapeMeta?.retainedFormIds?.length) {
    $banner.classList.remove('hidden');
    $banner.textContent =
      'Часть таблиц не обновилась — для них показан предыдущий снимок; остальные свежие.';
  } else if (isSnapshotStale(payload?.updatedAt)) {
    $banner.classList.remove('hidden');
    $banner.textContent =
      'Снимок старше обычного интервала — ждём следующий сбор Actions и опрашиваем чаще.';
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

function prefersReducedMotion() {
  try {
    return Boolean(
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    );
  } catch {
    return false;
  }
}

function applyMetaClasses(phase) {
  const showAge = phase === 'age';
  $commandTime.classList.toggle('is-active', showAge);
  $nextUpdate.classList.toggle('is-active', !showAge);
  $commandTime.setAttribute('aria-hidden', showAge ? 'false' : 'true');
  $nextUpdate.setAttribute('aria-hidden', showAge ? 'true' : 'false');
}

/**
 * Sequential swap: previous fades out fully, then the next fades in.
 * Never crossfades (no overlay of both texts).
 * @param {'age' | 'countdown'} phase
 */
function setMetaActive(phase) {
  if (metaSwapBusy) {
    metaSwapPending = phase;
    return;
  }

  if (phase === metaShownPhase) {
    applyMetaClasses(phase);
    return;
  }

  metaSwapBusy = true;
  metaSwapPending = null;

  // 1) Hide whatever is showing — slot goes empty.
  $commandTime.classList.remove('is-active');
  $nextUpdate.classList.remove('is-active');
  $commandTime.setAttribute('aria-hidden', 'true');
  $nextUpdate.setAttribute('aria-hidden', 'true');

  const delay = metaFadeMs(prefersReducedMotion());
  if (metaSwapTimer) clearTimeout(metaSwapTimer);
  metaSwapTimer = globalThis.setTimeout(() => {
    metaSwapTimer = 0;
    metaShownPhase = phase;
    // 2) After hide completes, reveal the new line alone.
    applyMetaClasses(phase);
    metaSwapBusy = false;
    if (metaSwapPending && metaSwapPending !== metaShownPhase) {
      const next = metaSwapPending;
      metaSwapPending = null;
      setMetaActive(next);
    } else {
      metaSwapPending = null;
    }
  }, delay);
}

function renderCommandMeta(now = Date.now()) {
  const stamp = state.uniData?.updatedAt;
  $commandTime.textContent = stamp
    ? `Обновлено ${fmtAge(stamp)}`
    : 'Загрузка';

  const baseTitle = `Автообновление каждые ${POLL_MINUTES} мин`;
  $updateStatus.title = stamp
    ? `Данные от ${fmtTime(stamp)} · ${baseTitle}`
    : baseTitle;

  let hasCountdown = false;
  if (refreshing) {
    $nextUpdate.textContent = 'обновляю…';
    hasCountdown = true;
  } else if (nextRefreshAt) {
    const leftMs = Math.max(0, nextRefreshAt - now);
    $nextUpdate.textContent = `следующее через ${formatCountdown(leftMs / 1000)}`;
    hasCountdown = true;
  } else {
    $nextUpdate.textContent = '';
  }

  setMetaActive(
    metaRotatorPhase(now - metaRotateEpoch, {
      hasCountdown,
      refreshing,
    }),
  );
}

function armNextRefresh(fromMs = Date.now()) {
  const pollMs = resolveEffectivePollMs(
    POLL_MS,
    state.uniData?.updatedAt,
    fromMs,
  );
  nextRefreshAt = nextDueAt(fromMs, pollMs);
  metaRotateEpoch = fromMs;
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
      const payload = normalizeUniversityPayload(
        await loadUniversity(UNI_ID, { bust: true }),
      );
      changed = snapshotChanged(payload, prev);
      state.uniData = payload;
      syncTableSelection();
      syncFacultySelection();
      state.error = null;
      applyBanner(payload);
      if (!silent || changed) emit();
      else {
        renderHeroChrome();
        renderCommandMeta();
      }
      ok = true;
    } catch (err) {
      if (!state.uniData) {
        state.error = err.message || String(err);
        emit();
      } else {
        console.warn('snapshot refresh failed, keeping previous data', err);
        // Re-evaluate freshness even when the poll fails — otherwise a
        // snapshot that crossed the stale threshold stays silently chase-polling.
        applyBanner(state.uniData);
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

function bindPickerChrome() {
  if (facultyOutsideBound) return;
  facultyOutsideBound = true;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tableMenuOpen) {
      e.preventDefault();
      closeTableMenu();
      return;
    }
    if (e.key === 'Escape' && facultyMenuOpen) {
      e.preventDefault();
      closeFacultyMenu();
      return;
    }

    const overlayId = facultyMenuOpen
      ? 'faculty-overlay'
      : tableMenuOpen
        ? 'table-overlay'
        : null;
    if (!overlayId) return;
    if (
      e.key !== 'ArrowDown' &&
      e.key !== 'ArrowUp' &&
      e.key !== 'Home' &&
      e.key !== 'End'
    ) {
      return;
    }

    const host = document.getElementById(overlayId);
    if (!host) return;
    const options = [...host.querySelectorAll('.faculty-option')];
    if (!options.length) return;

    const searchId = facultyMenuOpen
      ? 'faculty-search-input'
      : 'table-search-input';
    const inSearch =
      document.activeElement instanceof HTMLInputElement &&
      document.activeElement.id === searchId;
    if (inSearch && e.key !== 'ArrowDown') return;

    e.preventDefault();
    const active = document.activeElement;
    let idx = options.findIndex((n) => n === active);
    if (e.key === 'Home') idx = 0;
    else if (e.key === 'End') idx = options.length - 1;
    else if (e.key === 'ArrowDown') {
      if (idx < 0) {
        const selected = options.findIndex((n) =>
          n.classList.contains('is-active'),
        );
        idx = selected >= 0 ? selected : 0;
      } else {
        idx = Math.min(options.length - 1, idx + 1);
      }
    } else if (e.key === 'ArrowUp') {
      if (idx < 0) {
        const selected = options.findIndex((n) =>
          n.classList.contains('is-active'),
        );
        idx = selected >= 0 ? selected : 0;
      } else if (idx <= 0) {
        const search = document.getElementById(searchId);
        if (search instanceof HTMLElement) search.focus();
        return;
      } else {
        idx -= 1;
      }
    }
    const next = options[idx];
    if (next instanceof HTMLElement) next.focus();
  });
}

async function bootstrap() {
  loadPrefs();
  if (state.score != null) $scoreInput.value = String(state.score);
  $sourceLink.href = sourceUrlForTable(state.formId || DEFAULT_TABLE_ID);
  bindPickerChrome();
  state.loading = true;
  renderBoard();
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
