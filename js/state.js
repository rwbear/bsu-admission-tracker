const KEYS = {
  score: 'prohod-sb-score',
  form: 'prohod-sb-form',
  selected: 'prohod-sb-selected',
};

/** @type {{
 *  score: number | null,
 *  formId: '7' | '8',
 *  selectedId: string | null,
 *  uniData: object | null,
 *  loading: boolean,
 *  error: string | null,
 *  scoreSubmitted: boolean
 * }} */
export const state = {
  score: null,
  formId: '7',
  selectedId: null,
  uniData: null,
  loading: false,
  error: null,
  scoreSubmitted: false,
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit() {
  listeners.forEach((fn) => fn(state));
}

export function loadPrefs() {
  const score = localStorage.getItem(KEYS.score);
  if (score != null && score !== '') {
    state.score = Number(score);
    state.scoreSubmitted = true;
  }

  const form = localStorage.getItem(KEYS.form);
  if (form === '7' || form === '8') state.formId = form;

  state.selectedId = localStorage.getItem(KEYS.selected);
}

export function setScore(value) {
  if (value == null || value === '') {
    state.score = null;
    state.scoreSubmitted = false;
    localStorage.removeItem(KEYS.score);
  } else {
    state.score = Number(value);
    state.scoreSubmitted = true;
    localStorage.setItem(KEYS.score, String(state.score));
  }
  emit();
}

/**
 * @param {'7' | '8'} formId
 */
export function setForm(formId) {
  state.formId = formId;
  state.selectedId = null;
  localStorage.setItem(KEYS.form, formId);
  localStorage.removeItem(KEYS.selected);
  emit();
}

/**
 * @param {string | null} id
 */
export function setSelected(id) {
  state.selectedId = id;
  if (id) localStorage.setItem(KEYS.selected, id);
  else localStorage.removeItem(KEYS.selected);
  emit();
}
