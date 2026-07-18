/**
 * Faculty labels / keys / search shared by scraper and the site.
 */

/** Stable default — Институт бизнеса БГУ */
export const DEFAULT_FACULTY_ID = 'институт-бизнеса-бгу';
export const DEFAULT_FACULTY_NAME = 'Институт бизнеса БГУ';

/**
 * Spoken / campus abbreviations → facultyId.
 * Keys are stable scrape ids from facultyKey(shortFacultyLabel(...)).
 * Values are normalized at match time (lower, ё→е).
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const FACULTY_ALIASES = Object.freeze({
  'институт-бизнеса-бгу': Object.freeze([
    'иб',
    'иббгу',
    'институт бизнеса',
    'бизнес институт',
  ]),
  'институт-теологии': Object.freeze(['теология', 'теолог', 'ит']),
  'мгэи-им-сахарова': Object.freeze([
    'мгэи',
    'сахарова',
    'мгэи бгу',
    'институт сахарова',
  ]),
  'мехмат-пми-си': Object.freeze([
    'мехмат',
    'ммф',
    'пми',
    'фпми',
    'прикладная математика',
  ]),
  'физфак-рфкт-си': Object.freeze(['физфак', 'рфкт', 'фркт', 'радиофизика']),
  'си-бгу-дпу': Object.freeze(['си', 'си бгу', 'дпу', 'бгу-дпу', 'бгу дпу']),
  'факультет-международных-отношений': Object.freeze([
    'фмо',
    'мо',
    'международные отношения',
  ]),
  'факультет-социокультурных-коммуникаций': Object.freeze([
    'скк',
    'фскк',
    'фск',
    'социокультурных',
  ]),
  'факультет-философии-и-социальных-наук': Object.freeze([
    'ффсн',
    'философский',
    'философия',
  ]),
  'биологический-факультет': Object.freeze(['биофак', 'биол']),
  'военный-факультет': Object.freeze(['военфак', 'вф']),
  'исторический-факультет': Object.freeze(['истфак', 'ист']),
  'химический-факультет': Object.freeze(['химфак', 'хим']),
  'экономический-факультет': Object.freeze(['экономфак', 'эконом', 'эф']),
  'юридический-факультет': Object.freeze(['юрфак', 'юф', 'юрид']),
  'филологический-факультет': Object.freeze(['филфак', 'фил']),
  'факультет-журналистики': Object.freeze(['журфак', 'жур']),
  'факультет-географии-и-геоинформатики': Object.freeze([
    'геофак',
    'гео',
    'геоинформатики',
  ]),
});

/** Specialty-name search kicks in at this length (avoids 1–2 letter noise). */
export const FACULTY_SPEC_SEARCH_MIN = 3;

/**
 * Human short label for a BSU formk1 section title.
 * @param {string} raw
 */
export function shortFacultyLabel(raw) {
  let t = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return 'Факультет';

  if (/институт бизнеса/i.test(t)) return 'Институт бизнеса БГУ';
  if (/институт теологии/i.test(t)) return 'Институт теологии';
  if (/сахарова/i.test(t)) return 'МГЭИ им. Сахарова';
  if (/^совместный институт бгу-дпу/i.test(t) && !t.includes(',')) {
    return 'СИ БГУ–ДПУ';
  }
  if (/механико-математический/i.test(t) && /прикладной математики/i.test(t)) {
    return 'Мехмат / ПМИ / СИ';
  }
  if (/физический факультет/i.test(t) && /радиофизики/i.test(t)) {
    return 'Физфак / РФКТ / СИ';
  }

  t = t
    .replace(/\s*Белорусского государственного университета\s*/gi, ' БГУ')
    .replace(/\s+/g, ' ')
    .trim();

  if (t.includes(',')) {
    const first = t.split(',')[0].trim();
    if (first.length >= 8 && first.length <= 64) return `${first}…`;
  }

  if (t.length > 58) return `${t.slice(0, 55).trim()}…`;
  return t;
}

/**
 * Stable id for a faculty section (ASCII-ish slug).
 * @param {string} raw
 */
export function facultyKey(raw) {
  const label = shortFacultyLabel(raw);
  return (
    String(label)
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^a-z0-9а-я]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 56) || 'faculty'
  );
}

/**
 * Prefer Институт бизнеса when present.
 * @param {{ id: string, name?: string }[]} faculties
 * @param {string | null | undefined} savedId
 */
export function resolveFacultyId(faculties, savedId) {
  const list = Array.isArray(faculties) ? faculties : [];
  if (savedId && list.some((f) => f.id === savedId)) return savedId;

  const biz =
    list.find((f) => f.id === DEFAULT_FACULTY_ID) ||
    list.find((f) => /институт бизнеса/i.test(f.name || ''));
  if (biz) return biz.id;

  // Keep default even before the faculties list arrives so filtering
  // and the title aren't blank / all-specialties on first paint.
  if (!list.length) return savedId || DEFAULT_FACULTY_ID;
  return list[0].id;
}

/**
 * @param {{ id: string, name?: string, specialtyCount?: number }[]} faculties
 */
export function sortFaculties(faculties) {
  return [...(faculties || [])].sort((a, b) => {
    const aBiz = /институт бизнеса/i.test(a.name || '') ? 0 : 1;
    const bBiz = /институт бизнеса/i.test(b.name || '') ? 0 : 1;
    if (aBiz !== bBiz) return aBiz - bBiz;
    return String(a.name || '').localeCompare(String(b.name || ''), 'ru');
  });
}

/**
 * Normalize for search: case, ё, punctuation/hyphens → spaces.
 * @param {string} s
 */
export function normalizeFacultySearch(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[–—−]/g, '-')
    .replace(/[^a-z0-9а-я\s-]+/gi, ' ')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} facultyId
 * @returns {string[]}
 */
export function aliasesForFaculty(facultyId) {
  const list = FACULTY_ALIASES[facultyId];
  return list ? [...list] : [];
}

/**
 * @param {string} alias
 * @param {string} q normalized query
 */
function aliasMatches(alias, q) {
  const a = normalizeFacultySearch(alias);
  if (!a || !q) return false;
  if (a === q) return true;
  // «фм» → ФМО, «юр» → юрфак — not bare 1-letter noise
  if (q.length >= 2 && a.startsWith(q)) return true;
  if (q.length >= 3 && a.includes(q)) return true;
  return false;
}

/**
 * @param {string} name
 * @param {string} q
 */
function nameMatches(name, q) {
  const n = normalizeFacultySearch(name);
  return Boolean(n && q && n.includes(q));
}

/**
 * @param {string[]} specNames
 * @param {string} q
 */
function specialtyMatches(specNames, q) {
  if (q.length < FACULTY_SPEC_SEARCH_MIN) return false;
  for (const raw of specNames || []) {
    const s = normalizeFacultySearch(raw);
    if (s && s.includes(q)) return true;
  }
  return false;
}

/**
 * Faculty overlay search: name, campus abbreviations, specialty titles.
 * Specialties must already be scoped to the active monitoring table.
 *
 * @param {{ id: string, name?: string, specialtyCount?: number }[]} faculties
 * @param {string} [query]
 * @param {{ facultyId?: string, specName?: string }[]} [specialties]
 */
export function filterFacultiesByName(faculties, query, specialties = []) {
  const sorted = sortFaculties(faculties);
  const q = normalizeFacultySearch(query);
  if (!q) return sorted;

  /** @type {Map<string, string[]>} */
  const specsByFaculty = new Map();
  for (const s of specialties || []) {
    const id = s.facultyId;
    if (!id) continue;
    const name = s.specName;
    if (name == null || name === '') continue;
    if (!specsByFaculty.has(id)) specsByFaculty.set(id, []);
    specsByFaculty.get(id).push(String(name));
  }

  return sorted.filter((f) => {
    if (nameMatches(f.name || '', q)) return true;
    if (aliasesForFaculty(f.id).some((a) => aliasMatches(a, q))) return true;
    if (specialtyMatches(specsByFaculty.get(f.id) || [], q)) return true;
    return false;
  });
}
