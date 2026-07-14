/**
 * Faculty labels / keys shared by scraper and the site.
 */

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
  return String(label)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || 'faculty';
}

/**
 * Prefer Институт бизнеса when present.
 * @param {{ id: string, name?: string }[]} faculties
 * @param {string | null | undefined} savedId
 */
export function resolveFacultyId(faculties, savedId) {
  const list = Array.isArray(faculties) ? faculties : [];
  if (!list.length) return null;
  if (savedId && list.some((f) => f.id === savedId)) return savedId;
  const biz = list.find((f) => /институт бизнеса/i.test(f.name || ''));
  if (biz) return biz.id;
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
 * Silence filter for the faculty overlay list (search by name).
 * @param {{ id: string, name?: string, specialtyCount?: number }[]} faculties
 * @param {string} [query]
 */
export function filterFacultiesByName(faculties, query) {
  const sorted = sortFaculties(faculties);
  const q = String(query || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
  if (!q) return sorted;
  return sorted.filter((f) =>
    String(f.name || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .includes(q),
  );
}
