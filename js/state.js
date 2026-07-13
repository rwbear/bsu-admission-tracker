const KEYS = {
  score: 'prohod-score',
  uni: 'prohod-uni',
  faculty: 'prohod-faculty',
  theme: 'prohod-theme',
  compare: 'prohod-compare',
  filter: 'prohod-filter',
};

/** @type {{
 *  score: number | null,
 *  universityId: string | null,
 *  facultyId: string | null,
 *  filter: 'all' | 'safe' | 'risk' | 'below',
 *  query: string,
 *  compareIds: string[],
 *  index: object | null,
 *  uniData: object | null,
 *  loading: boolean,
 *  error: string | null
 * }} */
export const state = {
  score: null,
  universityId: null,
  facultyId: null,
  filter: 'all',
  query: '',
  compareIds: [],
  index: null,
  uniData: null,
  loading: false,
  error: null,
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
  if (score != null && score !== '') state.score = Number(score);

  state.universityId = localStorage.getItem(KEYS.uni);
  state.facultyId = localStorage.getItem(KEYS.faculty);

  const filter = localStorage.getItem(KEYS.filter);
  if (filter === 'all' || filter === 'safe' || filter === 'risk' || filter === 'below') {
    state.filter = filter;
  }

  try {
    state.compareIds = JSON.parse(localStorage.getItem(KEYS.compare) || '[]');
  } catch {
    state.compareIds = [];
  }

  const theme = localStorage.getItem(KEYS.theme);
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function setScore(value) {
  if (value == null || value === '') {
    state.score = null;
    localStorage.removeItem(KEYS.score);
  } else {
    state.score = Number(value);
    localStorage.setItem(KEYS.score, String(state.score));
  }
  emit();
}

export function setUniversity(id) {
  state.universityId = id;
  state.facultyId = null;
  localStorage.setItem(KEYS.uni, id || '');
  localStorage.removeItem(KEYS.faculty);
  emit();
}

export function setFaculty(id) {
  state.facultyId = id;
  if (id) localStorage.setItem(KEYS.faculty, id);
  else localStorage.removeItem(KEYS.faculty);
  emit();
}

export function setFilter(filter) {
  state.filter = filter;
  localStorage.setItem(KEYS.filter, filter);
  emit();
}

export function setQuery(query) {
  state.query = query;
  emit();
}

export function toggleCompare(id) {
  if (state.compareIds.includes(id)) {
    state.compareIds = state.compareIds.filter((x) => x !== id);
  } else if (state.compareIds.length < 3) {
    state.compareIds = [...state.compareIds, id];
  }
  localStorage.setItem(KEYS.compare, JSON.stringify(state.compareIds));
  emit();
}

export function clearCompare() {
  state.compareIds = [];
  localStorage.removeItem(KEYS.compare);
  emit();
}

export function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = cur === 'dark' || (!cur && prefersDark);
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(KEYS.theme, next);
}
