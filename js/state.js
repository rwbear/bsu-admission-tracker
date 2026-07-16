import { DEFAULT_FACULTY_ID } from './faculties.js';
import { DEFAULT_TABLE_ID } from './tables.js';

const KEYS = {
  score: 'prohod-sb-score',
  selected: 'prohod-sb-selected',
  faculty: 'prohod-sb-faculty',
  form: 'prohod-sb-form',
};

/** @type {{
 *  score: number | null,
 *  selectedId: string | null,
 *  facultyId: string | null,
 *  formId: string | null,
 *  uniData: object | null,
 *  loading: boolean,
 *  error: string | null,
 *  scoreSubmitted: boolean
 * }} */
export const state = {
  score: null,
  selectedId: null,
  facultyId: DEFAULT_FACULTY_ID,
  formId: DEFAULT_TABLE_ID,
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

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseStoredScore(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 500) return null;
  return n;
}

export function loadPrefs() {
  const score = parseStoredScore(localStorage.getItem(KEYS.score));
  if (score != null) {
    state.score = score;
    state.scoreSubmitted = true;
  } else {
    state.score = null;
    state.scoreSubmitted = false;
    localStorage.removeItem(KEYS.score);
  }

  state.selectedId = localStorage.getItem(KEYS.selected);
  const savedFaculty = localStorage.getItem(KEYS.faculty);
  state.facultyId = savedFaculty || DEFAULT_FACULTY_ID;
  const savedForm = localStorage.getItem(KEYS.form);
  state.formId = savedForm || DEFAULT_TABLE_ID;
}

export function setScore(value) {
  if (value == null || value === '') {
    state.score = null;
    state.scoreSubmitted = false;
    localStorage.removeItem(KEYS.score);
  } else {
    const n = parseStoredScore(value);
    if (n == null) {
      state.score = null;
      state.scoreSubmitted = false;
      localStorage.removeItem(KEYS.score);
    } else {
      state.score = n;
      state.scoreSubmitted = true;
      localStorage.setItem(KEYS.score, String(state.score));
    }
  }
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

/**
 * Repair selection without emitting — avoids nested renderBoard / aborted dissolves.
 * @param {string | null} id
 */
export function quietSetSelected(id) {
  state.selectedId = id;
  if (id) localStorage.setItem(KEYS.selected, id);
  else localStorage.removeItem(KEYS.selected);
}

/**
 * @param {string | null} id
 */
export function setFaculty(id) {
  state.facultyId = id;
  if (id) localStorage.setItem(KEYS.faculty, id);
  else localStorage.removeItem(KEYS.faculty);
  state.selectedId = null;
  localStorage.removeItem(KEYS.selected);
  emit();
}

/**
 * @param {string | null} id
 */
export function setForm(id) {
  state.formId = id;
  if (id) localStorage.setItem(KEYS.form, id);
  else localStorage.removeItem(KEYS.form);
  // Switching monitoring table resets faculty scope + selection.
  state.selectedId = null;
  localStorage.removeItem(KEYS.selected);
  emit();
}
