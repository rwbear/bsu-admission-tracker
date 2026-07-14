import { DEFAULT_FACULTY_ID } from './faculties.js';

const KEYS = {
  score: 'prohod-sb-score',
  selected: 'prohod-sb-selected',
  faculty: 'prohod-sb-faculty',
};

/** @type {{
 *  score: number | null,
 *  selectedId: string | null,
 *  facultyId: string | null,
 *  uniData: object | null,
 *  loading: boolean,
 *  error: string | null,
 *  scoreSubmitted: boolean
 * }} */
export const state = {
  score: null,
  selectedId: null,
  facultyId: DEFAULT_FACULTY_ID,
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

  state.selectedId = localStorage.getItem(KEYS.selected);
  const savedFaculty = localStorage.getItem(KEYS.faculty);
  state.facultyId = savedFaculty || DEFAULT_FACULTY_ID;
  // Drop obsolete day/zaoch pref if present
  localStorage.removeItem('prohod-sb-form');
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
 * @param {string | null} id
 */
export function setSelected(id) {
  state.selectedId = id;
  if (id) localStorage.setItem(KEYS.selected, id);
  else localStorage.removeItem(KEYS.selected);
  emit();
}

/**
 * @param {string | null} id
 */
export function setFaculty(id) {
  state.facultyId = id;
  if (id) localStorage.setItem(KEYS.faculty, id);
  else localStorage.removeItem(KEYS.faculty);
  // Specialty selection is faculty-scoped — clear so resolveSelection picks anew.
  state.selectedId = null;
  localStorage.removeItem(KEYS.selected);
  emit();
}
