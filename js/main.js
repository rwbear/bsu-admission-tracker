import {
  state,
  loadPrefs,
  subscribe,
  setScore,
  setUniversity,
  setFaculty,
  setFilter,
  setQuery,
  toggleCompare,
  clearCompare,
  toggleTheme,
  emit,
} from './state.js';
import { loadIndex, loadUniversity } from './load-data.js';
import { prepareSpecs } from './compute.js';
import { $, fmtTime } from './ui/dom.js';
import { renderRadarList, renderCompareTray } from './ui/radar.js';

const $scoreInput = /** @type {HTMLInputElement} */ ($('#score-input'));
const $scoreForm = $('#score-form');
const $uniChips = $('#uni-chips');
const $facGroup = $('#faculty-group');
const $facChips = $('#faculty-chips');
const $board = $('#board');
const $toolbar = $('#toolbar');
const $search = /** @type {HTMLInputElement} */ ($('#search-input'));
const $updated = $('#updated-meta');
const $loading = $('#state-loading');
const $empty = $('#state-empty');
const $error = $('#state-error');
const $errorMsg = $('#error-msg');
const $results = $('#results');
const $compare = $('#compare-tray');
const $themeBtn = $('#theme-btn');
const $refreshBtn = $('#refresh-btn');
const $banner = $('#data-banner');

let lastRows = [];

function showOnly(which) {
  for (const el of [$loading, $empty, $error, $results, $toolbar]) {
    el.classList.add('hidden');
  }
  if (which === 'loading') $loading.classList.remove('hidden');
  if (which === 'empty') $empty.classList.remove('hidden');
  if (which === 'error') $error.classList.remove('hidden');
  if (which === 'results') {
    $toolbar.classList.remove('hidden');
    $results.classList.remove('hidden');
  }
}

function renderUniChips() {
  $uniChips.innerHTML = '';
  const unis = state.index?.universities || [];
  for (const uni of unis) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip${state.universityId === uni.id ? ' active' : ''}`;
    btn.innerHTML = `${uni.name}<span class="count">${uni.specialtyCount || 0}</span>`;
    btn.title = uni.fullName || uni.name;
    btn.addEventListener('click', async () => {
      setUniversity(uni.id);
      await fetchUniversity(uni.id);
      // auto-select first faculty with data
      const first = state.uniData?.faculties?.find((f) => f.specialtyCount > 0)
        || state.uniData?.faculties?.[0];
      if (first) setFaculty(first.id);
      else renderBoard();
    });
    $uniChips.append(btn);
  }
}

function renderFacultyChips() {
  const faculties = state.uniData?.faculties || [];
  if (!state.universityId || !faculties.length) {
    $facGroup.classList.add('hidden');
    return;
  }
  $facGroup.classList.remove('hidden');
  $facChips.innerHTML = '';
  for (const fac of faculties) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip${state.facultyId === fac.id ? ' active' : ''}`;
    btn.innerHTML = `${fac.name}<span class="count">${fac.specialtyCount || 0}</span>`;
    btn.addEventListener('click', () => setFaculty(fac.id));
    $facChips.append(btn);
  }
}

function currentSpecialties() {
  const all = state.uniData?.specialties || [];
  if (!state.facultyId) return [];
  return all.filter((s) => String(s.facultyId) === String(state.facultyId));
}

function renderBoard() {
  renderFacultyChips();
  $updated.textContent = state.uniData
    ? `Данные: ${fmtTime(state.uniData.updatedAt)}`
    : '';

  if (state.loading) {
    showOnly('loading');
    return;
  }
  if (state.error) {
    $errorMsg.textContent = state.error;
    showOnly('error');
    return;
  }
  if (!state.universityId || !state.facultyId) {
    showOnly('empty');
    $empty.querySelector('h3').textContent = 'Выбери университет и факультет';
    $empty.querySelector('p').textContent =
      'После ввода балла откроется радар: дорожка конкурса, сколько человек выше тебя и расчётный проходной.';
    renderCompareTray($compare, lastRows, state.compareIds, { onClear: clearCompare });
    return;
  }

  const specs = currentSpecialties();
  if (!specs.length) {
    showOnly('empty');
    $empty.querySelector('h3').textContent = 'Нет строк по этому факультету';
    $empty.querySelector('p').textContent =
      'Таблица могла быть пустой вне приёмной кампании, или парсер не нашёл распределение баллов.';
    return;
  }

  showOnly('results');
  lastRows = renderRadarList($results, specs, state.score, {
    filter: state.filter,
    query: state.query,
    compareIds: state.compareIds,
    onToggleCompare: (id) => toggleCompare(id),
  });

  // Keep compare tray based on currently enriched universe for selected faculty + pinned leftovers
  const enriched = prepareSpecs(specs, state.score).map((r) => ({ ...r, score: state.score }));
  renderCompareTray($compare, enriched, state.compareIds, { onClear: clearCompare });
}

async function fetchUniversity(id) {
  state.loading = true;
  state.error = null;
  emit();
  try {
    state.uniData = await loadUniversity(id);
    if (state.uniData?.scrapeMeta?.fixture) {
      $banner.classList.remove('hidden');
      $banner.textContent =
        'Показаны демонстрационные данные (кампания / источник временно без свежей таблицы). Обновление подтянется автоматически через GitHub Actions.';
    } else if (state.uniData?.scrapeMeta?.retainedPrevious) {
      $banner.classList.remove('hidden');
      $banner.textContent = 'Не удалось обновить источник — показан последний успешный снимок.';
    } else {
      $banner.classList.add('hidden');
    }
  } catch (err) {
    state.uniData = null;
    state.error = err.message || String(err);
  } finally {
    state.loading = false;
    emit();
  }
}

async function bootstrap() {
  loadPrefs();
  if (state.score != null) $scoreInput.value = String(state.score);
  $search.value = state.query || '';

  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === state.filter);
  });

  showOnly('loading');
  try {
    state.index = await loadIndex();
    renderUniChips();
    if (state.universityId) {
      await fetchUniversity(state.universityId);
      if (state.facultyId) renderBoard();
    } else {
      showOnly('empty');
    }
  } catch (err) {
    state.error = err.message || String(err);
    showOnly('error');
    $errorMsg.textContent = state.error;
  }
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
  document.getElementById('board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const filter = btn.getAttribute('data-filter') || 'all';
    setFilter(/** @type {any} */ (filter));
    document.querySelectorAll('.filter-btn').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
  });
});

$search.addEventListener('input', () => setQuery($search.value));

$themeBtn.addEventListener('click', () => toggleTheme());

$refreshBtn.addEventListener('click', async () => {
  $refreshBtn.classList.add('spin');
  try {
    state.index = await loadIndex();
    renderUniChips();
    if (state.universityId) await fetchUniversity(state.universityId);
    else emit();
  } finally {
    $refreshBtn.classList.remove('spin');
  }
});

$('#retry-btn').addEventListener('click', () => bootstrap());

subscribe(() => {
  renderUniChips();
  renderBoard();
});

bootstrap();
