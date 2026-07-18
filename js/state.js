import { DEFAULT_FACULTY_ID } from './faculties.js';
import { DEFAULT_TABLE_ID } from './tables.js';

/** Current prefs namespace — never expose legacy product nickname in storage keys. */
const KEYS = {
  score: 'rwb-sb-score',
  selected: 'rwb-sb-selected',
  faculty: 'rwb-sb-faculty',
  form: 'rwb-sb-form',
};

/** Pre-rename keys — read once, then migrate. */
const LEGACY_KEYS = {
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

/**
 * Read current key, falling back to legacy once and migrating.
 * @param {keyof typeof KEYS} name
 */
function readPref(name) {
  const cur = localStorage.getItem(KEYS[name]);
  if (cur != null) return cur;
  const legacy = localStorage.getItem(LEGACY_KEYS[name]);
  if (legacy == null) return null;
  localStorage.setItem(KEYS[name], legacy);
  localStorage.removeItem(LEGACY_KEYS[name]);
  return legacy;
}

/**
 * @param {keyof typeof KEYS} name
 * @param {string | null} value
 */
function writePref(name, value) {
  if (value) localStorage.setItem(KEYS[name], value);
  else localStorage.removeItem(KEYS[name]);
  localStorage.removeItem(LEGACY_KEYS[name]);
}

export function loadPrefs() {
  const score = parseStoredScore(readPref('score'));
  if (score != null) {
    state.score = score;
    state.scoreSubmitted = true;
  } else {
    state.score = null;
    state.scoreSubmitted = false;
    writePref('score', null);
  }

  state.selectedId = readPref('selected');
  const savedFaculty = readPref('faculty');
  state.facultyId = savedFaculty || DEFAULT_FACULTY_ID;
  const savedForm = readPref('form');
  state.formId = savedForm || DEFAULT_TABLE_ID;
}

export function setScore(value) {
  if (value == null || value === '') {
    state.score = null;
    state.scoreSubmitted = false;
    writePref('score', null);
  } else {
    const n = parseStoredScore(value);
    if (n == null) {
      state.score = null;
      state.scoreSubmitted = false;
      writePref('score', null);
    } else {
      state.score = n;
      state.scoreSubmitted = true;
      writePref('score', String(state.score));
    }
  }
  emit();
}

/**
 * @param {string | null} id
 */
export function setSelected(id) {
  state.selectedId = id;
  writePref('selected', id);
  emit();
}

/**
 * Repair selection without emitting — avoids nested renderBoard / aborted dissolves.
 * @param {string | null} id
 */
export function quietSetSelected(id) {
  state.selectedId = id;
  writePref('selected', id);
}

/**
 * @param {string | null} id
 * @param {string | null} [preferredSelectedId] specialty to keep after faculty change
 */
export function setFaculty(id, preferredSelectedId = null) {
  state.facultyId = id;
  writePref('faculty', id);
  if (preferredSelectedId) {
    state.selectedId = preferredSelectedId;
    writePref('selected', preferredSelectedId);
  } else {
    state.selectedId = null;
    writePref('selected', null);
  }
  emit();
}

/**
 * @param {string | null} id
 */
export function setForm(id) {
  state.formId = id;
  writePref('form', id);
  // Switching monitoring table resets faculty scope + selection.
  state.selectedId = null;
  writePref('selected', null);
  emit();
}

/** Pref key helpers for sync paths that write without going through setters. */
export const prefKeys = KEYS;

export function writeFormPref(id) {
  writePref('form', id);
}

export function writeFacultyPref(id) {
  writePref('faculty', id);
}
