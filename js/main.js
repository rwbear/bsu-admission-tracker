import {
  state,
  loadPrefs,
  subscribe,
  emit,
  setScore,
  setSelected,
  quietSetSelected,
  setFaculty,
  setForm,
  writeFormPref,
  writeFacultyPref,
} from './state.js';
import { prepareSpecs } from './compute.js';
import { loadUniversity } from './load-data.js';
import { CONFIG } from './config.js';
import {
  matchSpecialtyIdBySearch,
  resolveFacultyId,
  sortFaculties,
} from './faculties.js';
import { normalizeUniversityPayload } from './spec-id.js';
import {
  DEFAULT_TABLE_ID,
  facultiesForTable,
  listCatalogTables,
  resolveTableId,
  sourceUrlForTable,
} from './tables.js';
import { $, fmtClock } from './ui/dom.js';
import {
  renderOverviewList,
  renderDetailPanel,
  renderSummary,
  resolveSelection,
  overviewListKey,
} from './ui/radar.js';
import { runPanelTransition } from './ui/panel-swap.js';
import { patchOptionSelection } from './ui/selection-list.js';
import { renderFacultyPicker } from './ui/faculty-picker.js';
import { renderTablePicker } from './ui/table-picker.js';
import {
  armMethodSheetChrome,
  closeMethodSheet,
  isMethodSheetOpen,
  METHOD_SHEET,
} from './ui/method-sheet.js';
import {
  armUpdatesSheetChrome,
  closeUpdatesSheet,
  isUpdatesSheetOpen,
  openUpdatesSheet,
  toggleUpdatesSheet,
  UPDATES_SHEET,
} from './ui/updates-sheet.js';
import { UPDATES_ARIA_LABELS } from './ui/updates-copy.js';
import {
  armCreatorSheetChrome,
  closeCreatorSheet,
  isCreatorSheetOpen,
  toggleCreatorSheet,
  CREATOR_SHEET,
} from './ui/creator-sheet.js';
import { focusNoScroll } from './ui/overlay-scroll-lock.js';
import {
  resolvePollMs,
  resolveEffectivePollMs,
  isSnapshotStale,
  nextDueAt,
  shouldRefreshNow,
  resolveLiveState,
} from './refresh-schedule.js';

const UNI_ID = CONFIG.universityId;
const POLL_MS = resolvePollMs(CONFIG.pollMs, globalThis.location?.search || '');

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
const $commandData = $('#command-data');
const $commandNext = $('#command-next');
const $updateStatus = /** @type {HTMLButtonElement} */ ($('#update-status'));
const $updateLiveRegion = $('#update-live-region');
const $tableMount = $('#table-picker-mount');
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
let tableMenuOpen = false;
/** @type {'idle' | 'fetching' | 'chase' | null} */
let previousLiveState = null;
/** True when the last completed fetch changed the snapshot. */
let lastFetchChanged = false;
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
    writeFormPref(next);
  } else if (next) {
    writeFormPref(next);
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
    writeFacultyPref(next);
  } else if (next) {
    writeFacultyPref(next);
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
  if (trigger instanceof HTMLElement) focusNoScroll(trigger);
}

function openTableMenu() {
  closeUpdatesSheet({ instant: true, restoreFocus: false });
  closeCreatorSheet({ instant: true, restoreFocus: false });
  closeMethodSheet({ restoreFocus: false });
  closeFacultyMenu();
  tableMenuOpen = true;
  tableSearchQuery = '';
  renderTableChrome();
  queueMicrotask(() => {
    const dialog = document.getElementById('table-overlay');
    if (dialog instanceof HTMLElement) focusNoScroll(dialog);
  });
}

function toggleTableMenu() {
  if (tableMenuOpen) closeTableMenu();
  else openTableMenu();
}

function onSelectTable(id) {
  tableSearchQuery = '';
  if (id === state.formId) {
    tableMenuOpen = false;
    renderHeroChrome();
    const trigger = document.getElementById('table-trigger');
    if (trigger instanceof HTMLElement) focusNoScroll(trigger);
    return;
  }

  // Keep the dialog open so the board dissolve runs under an opaque overlay
  // (closing at the same time as the dissolve is what read as a blink).
  setForm(id);
  const facultyBefore = state.facultyId;
  syncFacultySelection();
  // setForm emits once; if faculty was remapped for the new table, refresh again.
  if (state.facultyId !== facultyBefore) emit();

  // Cover the board dissolve briefly, then leave — short enough to feel
  // instant, long enough that empty chrome doesn't flash through the dialog.
  const closeAfter = prefersReducedMotion() ? 0 : 180;
  window.setTimeout(() => {
    tableMenuOpen = false;
    renderHeroChrome();
    const trigger = document.getElementById('table-trigger');
    if (trigger instanceof HTMLElement) focusNoScroll(trigger);
  }, closeAfter);
}

function onTableQuery(q) {
  tableSearchQuery = q;
  renderTableChrome();
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
    if (trigger instanceof HTMLElement) focusNoScroll(trigger);
  }, 280);
}

function openFacultyMenu() {
  closeUpdatesSheet({ instant: true, restoreFocus: false });
  closeCreatorSheet({ instant: true, restoreFocus: false });
  closeMethodSheet({ restoreFocus: false });
  closeTableMenu();
  facultyMenuOpen = true;
  facultySearchQuery = '';
  renderFacultyChrome();
  queueMicrotask(() => {
    const dialog = document.getElementById('faculty-overlay');
    if (dialog instanceof HTMLElement) focusNoScroll(dialog);
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

function tableSpecialties() {
  const formId = state.formId || DEFAULT_TABLE_ID;
  return (state.uniData?.specialties || []).filter(
    (s) => String(s.form) === String(formId),
  );
}

function closeFacultyMenuAfterSelect() {
  facultyMenuOpen = false;
  renderFacultyChrome();
  window.setTimeout(() => {
    if (facultyMenuOpen) return;
    const trigger = document.getElementById('faculty-trigger');
    if (trigger instanceof HTMLElement) focusNoScroll(trigger);
  }, 280);
}

function onSelectFaculty(id) {
  // Capture before clear — specialty-name search must drive selection.
  const q = facultySearchQuery;
  const matchedSpecId = matchSpecialtyIdBySearch(tableSpecialties(), id, q);
  facultySearchQuery = '';

  if (id === state.facultyId) {
    if (matchedSpecId && matchedSpecId !== state.selectedId) {
      setSelected(matchedSpecId);
    }
    closeFacultyMenuAfterSelect();
    return;
  }

  // Optimistic `.is-active` is already on the option. Update the board while
  // the overlay still covers it, then leave — never dissolve in the open.
  setFaculty(id, matchedSpecId);

  // Cover the board dissolve briefly, then leave — short enough to feel
  // instant, long enough that empty chrome doesn't flash through the dialog.
  const closeAfter = prefersReducedMotion() ? 0 : 180;
  window.setTimeout(() => {
    if (state.facultyId !== id) return;
    closeFacultyMenuAfterSelect();
  }, closeAfter);
}

function onFacultyQuery(q) {
  facultySearchQuery = q;
  // Overlay stays mounted — picker only repaints the option list.
  renderFacultyChrome();
}

function renderFacultyChrome() {
  renderFacultyPicker($facultyMount, {
    faculties: facultyList(),
    specialties: tableSpecialties(),
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
  // Optimistic highlight — master-detail paint is queued/async; without this
  // the selected row waits on the dissolve chain and the color pops late.
  if (id) patchOptionSelection($overview, '.overview-row', id, 'selected');
  setSelected(id);
}

/**
 * Panel transitions: coalesce to the latest job, abort the in-flight
 * dissolve so rapid specialty/faculty changes never stack full sequences.
 */
let masterDetailChain = Promise.resolve();
/** @type {{ specs: object[], score: number | null } | null} */
let masterDetailPending = null;
/** @type {AbortController | null} */
let masterDetailAbort = null;

function renderMasterDetail(specs, score) {
  masterDetailPending = { specs, score };
  masterDetailAbort?.abort();
  masterDetailChain = masterDetailChain
    .then(drainMasterDetailQueue)
    .catch((err) => {
      if (err?.name === 'AbortError') return;
      console.error('renderMasterDetail failed', err);
    });
}

async function drainMasterDetailQueue() {
  while (masterDetailPending) {
    const job = masterDetailPending;
    masterDetailPending = null;
    const ac = new AbortController();
    masterDetailAbort = ac;
    try {
      await paintMasterDetail(job.specs, job.score, ac.signal);
    } catch (err) {
      if (err?.name !== 'AbortError') throw err;
    } finally {
      if (masterDetailAbort === ac) masterDetailAbort = null;
    }
  }
}

/**
 * @param {object[]} specs
 * @param {number | null} score
 * @param {AbortSignal} [signal]
 */
async function paintMasterDetail(specs, score, signal) {
  const rows = prepareSpecs(specs, score);
  const selectedId = resolveSelection(rows, state.selectedId);
  // Auto-repair after faculty/table change — no nested emit/abort.
  if (selectedId !== state.selectedId) {
    quietSetSelected(selectedId);
  }

  const updatedAt = state.uniData?.updatedAt || null;
  const nextOverviewKey = overviewListKey(specs, score) || 'empty';
  const nextDetailKey = selectedId || 'empty';
  const prevOverviewKey = $overview.dataset.selectionKey || '';
  const prevDetailKey = $detail.dataset.selectionKey || '';

  // First paint (empty → content): no motion. Same keys: quiet refresh.
  // Treat the 'empty' sentinel like unset — otherwise empty→first specialty
  // falsely looks like a selection change and replays detail intro.
  const animateOverview =
    Boolean(prevOverviewKey) &&
    prevOverviewKey !== 'empty' &&
    prevOverviewKey !== nextOverviewKey;
  const animateDetail =
    Boolean(prevDetailKey) &&
    prevDetailKey !== 'empty' &&
    prevDetailKey !== nextDetailKey;

  renderSummary($summary, rows);

  const reduceMotion = prefersReducedMotion();

  await runPanelTransition({
    overviewEl: $overview,
    detailEl: $detail,
    paintOverview: () => {
      renderOverviewList($overview, specs, score, {
        selectedId,
        onSelect: onSelectSpecialty,
        intro: animateOverview && !reduceMotion,
        reduceMotion,
      });
    },
    paintDetail: () => {
      const scrapeMeta = state.uniData?.scrapeMeta || {};
      renderDetailPanel(
        $detail,
        rows.find((r) => r.id === selectedId) ?? null,
        score,
        {
          updatedAt,
          retainedPrevious: Boolean(scrapeMeta.retainedPrevious),
          retainedFormIds: scrapeMeta.retainedFormIds || [],
        },
        {
          intro: animateDetail && !reduceMotion,
          reduceMotion,
        },
      );
    },
    animateOverview,
    animateDetail,
    reduceMotion,
    signal,
  });
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
  if (next.specialtyCount !== prev.specialtyCount) return true;
  // Equal timestamp: compare id↔passing signature instead of dual JSON.stringify (~280KB).
  const sig = (payload) =>
    (payload.specialties || [])
      .map(
        (s) =>
          `${s.id}:${s.estimatedPassing ?? ''}:${s.inCompetition ?? ''}:${s.totalApps ?? ''}`,
      )
      .join('|');
  return sig(next) !== sig(prev);
}

/**
 * Edge-only SR announcements — never the countdown ticks.
 * @param {'idle' | 'fetching' | 'chase'} liveState
 * @param {boolean} dataChanged
 */
function maybeAnnounceStateEdge(liveState, dataChanged) {
  if (!$updateLiveRegion) return;
  if (previousLiveState === liveState && !(dataChanged && liveState === 'idle')) {
    previousLiveState = liveState;
    lastFetchChanged = false;
    return;
  }

  let phrase = '';
  if (dataChanged && liveState !== 'fetching') {
    phrase = 'Данные обновлены';
  } else if (liveState === 'fetching' && previousLiveState !== 'fetching') {
    phrase = 'Проверяю';
  } else if (liveState === 'chase' && previousLiveState !== 'chase') {
    phrase = 'Ждём свежий сбор';
  }

  previousLiveState = liveState;
  lastFetchChanged = false;
  if (phrase) $updateLiveRegion.textContent = phrase;
}

function renderCommandMeta(now = Date.now()) {
  const stamp = state.uniData?.updatedAt;
  const liveState = resolveLiveState({
    refreshing,
    updatedAt: stamp,
    now,
  });
  const dataClock = stamp ? fmtClock(stamp) : '—';
  const nextClock = nextRefreshAt ? fmtClock(nextRefreshAt) : '—';

  $updateStatus.dataset.liveState = liveState;
  $updateStatus.setAttribute(
    'aria-expanded',
    String(isUpdatesSheetOpen()),
  );

  $commandData.textContent = `данные ${dataClock}`;
  $commandNext.textContent = `след ${nextClock}`;

  if (!stamp) {
    $updateStatus.setAttribute('aria-label', UPDATES_ARIA_LABELS.loading);
    $updateStatus.title =
      'Загружаем данные · нажми, чтобы узнать подробнее';
  } else if (liveState === 'fetching') {
    $updateStatus.setAttribute(
      'aria-label',
      UPDATES_ARIA_LABELS.fetching(dataClock, nextClock),
    );
    $updateStatus.title = `Данные ${dataClock} · сейчас проверяем · след ${nextClock}`;
  } else if (liveState === 'chase') {
    $updateStatus.setAttribute(
      'aria-label',
      UPDATES_ARIA_LABELS.chase(dataClock, nextClock),
    );
    $updateStatus.title = `Данные ${dataClock} · снимок старше обычного · след ${nextClock}`;
  } else {
    $updateStatus.setAttribute(
      'aria-label',
      UPDATES_ARIA_LABELS.idle(dataClock, nextClock),
    );
    $updateStatus.title = `Данные ${dataClock} · след ${nextClock} · нажми, чтобы узнать подробнее`;
  }

  maybeAnnounceStateEdge(liveState, lastFetchChanged);
}

function armNextRefresh(fromMs = Date.now()) {
  const pollMs = resolveEffectivePollMs(
    POLL_MS,
    state.uniData?.updatedAt,
    fromMs,
  );
  nextRefreshAt = nextDueAt(fromMs, pollMs);
  if (state.uniData) applyBanner(state.uniData);
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
    /** True when we already emitted a board paint for this run. */
    let painted = false;
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
      if (!silent || changed) {
        // Drop loading before paint so finally doesn't need a second emit.
        state.loading = false;
        emit();
        painted = true;
      } else {
        renderHeroChrome();
        renderCommandMeta();
      }
      ok = true;
    } catch (err) {
      if (!state.uniData) {
        state.error = err.message || String(err);
        state.loading = false;
        emit();
        painted = true;
      } else {
        console.warn('snapshot refresh failed, keeping previous data', err);
        // Re-evaluate freshness even when the poll fails — otherwise a
        // snapshot that crossed the stale threshold stays silently chase-polling.
        applyBanner(state.uniData);
      }
    } finally {
      state.loading = false;
      refreshing = false;
      lastFetchChanged = Boolean(changed);
      if (armSchedule) armNextRefresh();
      else renderCommandMeta();
      // Avoid a second full board paint (was replaying detail awaken on load).
      if (!silent && !painted) emit();
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

function closeAllOverlaysExcept(keep) {
  if (keep !== 'updates' && isUpdatesSheetOpen()) {
    closeUpdatesSheet({ instant: true, restoreFocus: false });
  }
  if (keep !== 'creator' && isCreatorSheetOpen()) {
    closeCreatorSheet({ instant: true, restoreFocus: false });
  }
  if (keep !== 'method' && isMethodSheetOpen()) {
    closeMethodSheet({ instant: true, restoreFocus: false });
  }
  if (keep !== 'table' && tableMenuOpen) {
    tableMenuOpen = false;
    tableSearchQuery = '';
    renderTableChrome();
  }
  if (keep !== 'faculty' && facultyMenuOpen) {
    facultyMenuOpen = false;
    facultySearchQuery = '';
    renderFacultyChrome();
  }
}

function bindPickerChrome() {
  if (facultyOutsideBound) return;
  facultyOutsideBound = true;

  armMethodSheetChrome({
    beforeOpen: () => closeAllOverlaysExcept('method'),
  });
  armUpdatesSheetChrome({
    beforeOpen: () => closeAllOverlaysExcept('updates'),
  });
  armCreatorSheetChrome({
    beforeOpen: () => closeAllOverlaysExcept('creator'),
  });

  const $creatorTrigger = /** @type {HTMLButtonElement} */ (
    $('#creator-trigger')
  );
  const syncCreatorExpanded = () => {
    $creatorTrigger.setAttribute(
      'aria-expanded',
      isCreatorSheetOpen() ? 'true' : 'false',
    );
  };
  // pointerdown: kill focus only. Open on click — opening on pointerdown
  // mounted the backdrop under the finger and the same gesture closed it
  // (scroll-lock jump, no visible sheet).
  $creatorTrigger.addEventListener('pointerdown', (e) => {
    if (typeof e.button === 'number' && e.button !== 0) return;
    if (e.isPrimary === false) return;
    e.preventDefault();
  });
  $creatorTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCreatorSheet();
    syncCreatorExpanded();
  });

  $updateStatus.addEventListener('click', () => {
    toggleUpdatesSheet();
    renderCommandMeta();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isCreatorSheetOpen()) {
      e.preventDefault();
      closeCreatorSheet({ restoreFocus: true });
      syncCreatorExpanded();
      return;
    }
    if (e.key === 'Escape' && isUpdatesSheetOpen()) {
      e.preventDefault();
      closeUpdatesSheet({ restoreFocus: true });
      renderCommandMeta();
      return;
    }
    if (e.key === 'Escape' && isMethodSheetOpen()) {
      e.preventDefault();
      closeMethodSheet();
      return;
    }
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

    const overlayId = isCreatorSheetOpen()
      ? CREATOR_SHEET.overlayId
      : isUpdatesSheetOpen()
        ? UPDATES_SHEET.overlayId
        : isMethodSheetOpen()
          ? METHOD_SHEET.overlayId
          : facultyMenuOpen
            ? 'faculty-overlay'
            : tableMenuOpen
              ? 'table-overlay'
              : null;
    if (!overlayId) return;

    // Soft Tab trap inside the open dialog (search + options + close).
    if (e.key === 'Tab') {
      const host = document.getElementById(overlayId);
      if (!host) return;
      const focusables = [
        ...host.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((n) => n instanceof HTMLElement && !n.hasAttribute('disabled'));
      if (focusables.length < 2) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
        return;
      }
      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
        return;
      }
    }

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
  // First paint before any fetch — mark refreshing so liveState resolves to
  // 'fetching', not 'chase'. Otherwise the amber "ждём свежий сбор" flashes
  // for a frame before the fetch even starts and reads as a scraper problem.
  refreshing = true;
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
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'start',
  });
});

$('#retry-btn').addEventListener('click', () =>
  fetchData({ silent: false, armSchedule: true }),
);

subscribe(() => renderBoard());

bootstrap();
