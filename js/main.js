import {
  state,
  loadPrefs,
  subscribe,
  setScore,
  setForm,
  setQuery,
  emit,
} from './state.js';
import { loadUniversity } from './load-data.js';
import { $, fmtTime } from './ui/dom.js';
import { renderRadarList } from './ui/radar.js';

const UNI_ID = 'sb-bsu';

const $scoreInput = /** @type {HTMLInputElement} */ ($('#score-input'));
const $scoreForm = $('#score-form');
const $search = /** @type {HTMLInputElement} */ ($('#search-input'));
const $updated = $('#updated-meta');
const $loading = $('#state-loading');
const $empty = $('#state-empty');
const $error = $('#state-error');
const $errorMsg = $('#error-msg');
const $results = $('#results');
const $banner = $('#data-banner');
const $sourceLink = /** @type {HTMLAnchorElement} */ ($('#source-link'));
const $tickerUpdated = $('#ticker-updated');
const $tickerUpdatedDup = $('#ticker-updated-dup');

function showOnly(which) {
  for (const node of [$loading, $empty, $error, $results, $search]) {
    node.classList.add('hidden');
  }
  if (which === 'loading') $loading.classList.remove('hidden');
  if (which === 'empty') $empty.classList.remove('hidden');
  if (which === 'error') $error.classList.remove('hidden');
  if (which === 'results') {
    $search.classList.remove('hidden');
    $results.classList.remove('hidden');
  }
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

function updateTicker(count) {
  const formName = state.formId === '8' ? 'Заочная' : 'Дневная';
  const stamp = state.uniData ? fmtTime(state.uniData.updatedAt) : 'нет данных';
  const text = `Обновлено ${stamp} · ${formName} · ${count} спец.`;
  $tickerUpdated.textContent = text;
  $tickerUpdatedDup.textContent = text;
  $updated.textContent = text;
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
    $empty.querySelector('h3').textContent = 'Введи балл выше';
    $empty.querySelector('p').textContent =
      'После этого появится радар по специальностям выбранной формы обучения.';
    updateTicker(currentSpecialties().length);
    return;
  }

  const specs = currentSpecialties();
  updateTicker(specs.length);

  if (!specs.length) {
    showOnly('empty');
    $empty.querySelector('h3').textContent = 'Нет строк по этой форме';
    $empty.querySelector('p').textContent =
      'Таблица могла быть пустой вне кампании, или снимок ещё не обновился.';
    return;
  }

  showOnly('results');
  renderRadarList($results, specs, state.score, { query: state.query });
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
  syncFormButtons();
  await fetchData();
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

document.querySelectorAll('.form-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = /** @type {'7' | '8'} */ (btn.getAttribute('data-form') || '7');
    setForm(id);
  });
});

$search.addEventListener('input', () => setQuery($search.value));

$('#retry-btn').addEventListener('click', () => fetchData());

subscribe(() => renderBoard());

bootstrap();
