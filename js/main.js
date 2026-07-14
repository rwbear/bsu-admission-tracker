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
import { $, fmtTime } from './ui/dom.js';
import {
  renderOverviewList,
  renderDetailPanel,
  renderSummary,
  resolveSelection,
} from './ui/radar.js';

const UNI_ID = 'sb-bsu';

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

  if (state.loading) {
    showOnly('loading');
    return;
  }

  if (state.error) {
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
    $empty.querySelector('h2').textContent = 'НЕТ СТРОК';
    $empty.querySelector('p').textContent =
      'Таблица могла быть пустой вне кампании, или снимок ещё не обновился.';
    return;
  }

  showOnly('results');
  renderMasterDetail(specs, state.score);
}

async function fetchData() {
  state.loading = true;
  state.error = null;
  emit();
  try {
    state.uniData = await loadUniversity(UNI_ID);
    if (state.uniData?.scrapeMeta?.fixture) {
      $banner.classList.remove('hidden');
      $banner.textContent =
        'Демо-снимок: live-таблица БГУ сейчас недоступна сборщику. После успешного Actions данные подтянутся сами.';
    } else if (state.uniData?.scrapeMeta?.retainedPrevious) {
      $banner.classList.remove('hidden');
      $banner.textContent =
        'Не удалось обновить источник — показан последний успешный снимок.';
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

function tickClock() {
  const now = new Date();
  const stamp = state.uniData?.updatedAt
    ? fmtTime(state.uniData.updatedAt)
    : now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  $commandTime.textContent = `LIVE · ${stamp}`;
}

async function bootstrap() {
  loadPrefs();
  if (state.score != null) $scoreInput.value = String(state.score);
  syncFormButtons();
  tickClock();
  setInterval(tickClock, 30_000);
  await fetchData();
  tickClock();
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

$('#retry-btn').addEventListener('click', () => fetchData());

subscribe(() => renderBoard());

bootstrap();
