/**
 * BSU monitoring-table catalog (hub channels).
 * Keep in sync with sources/bsu-tables.json (scraper reads the JSON file).
 */

export const BSU_HUB_URL =
  'https://abiturient.bsu.by/priemnaia-kampaniia/monitoring-podachi-zaiavlenii';
export const BSU_BASE_URL = 'https://abit.bsu.by/formk1?id=';
export const DEFAULT_TABLE_ID = '7';

/** @typedef {{ id: string, name: string, shortName?: string }} Track */
/** @typedef {{
 *   id: string,
 *   trackId: string,
 *   name: string,
 *   shortName?: string,
 *   schedule?: string,
 *   finance?: string,
 *   default?: boolean,
 *   specialtyCount?: number,
 *   sourceUrl?: string,
 * }} TableDef
 */

const TRACKS = [
  {
    id: 'cert3',
    name: '3 сертификата ЦТ или ЦЭ',
    shortName: '3 сертификата',
  },
  {
    id: 'cert2',
    name: '2 сертификата ЦТ или ЦЭ',
    shortName: '2 сертификата',
  },
  {
    id: 'nocert',
    name: 'Без сертификатов ЦТ или ЦЭ',
    shortName: 'Без сертификатов',
  },
];

/** @type {TableDef[]} */
const TABLES = [
  {
    id: '32',
    trackId: 'cert3',
    name: 'Дневная форма. Бюджет',
    shortName: 'Дневная · бюджет',
    schedule: 'day',
    finance: 'budget',
  },
  {
    id: '29',
    trackId: 'cert3',
    name: 'Военный факультет. Дневная форма. Бюджет',
    shortName: 'Военный · дневная · бюджет',
    schedule: 'day',
    finance: 'budget',
  },
  {
    id: '2',
    trackId: 'cert3',
    name: 'Заочная форма. Бюджет',
    shortName: 'Заочная · бюджет',
    schedule: 'zaoch',
    finance: 'budget',
  },
  {
    id: '7',
    trackId: 'cert3',
    name: 'Дневная платная форма',
    shortName: 'Дневная · платная',
    schedule: 'day',
    finance: 'paid',
    default: true,
  },
  {
    id: '8',
    trackId: 'cert3',
    name: 'Заочная платная форма',
    shortName: 'Заочная · платная',
    schedule: 'zaoch',
    finance: 'paid',
  },
  {
    id: '34',
    trackId: 'cert2',
    name: 'Дневная форма. Бюджет',
    shortName: 'Дневная · бюджет',
    schedule: 'day',
    finance: 'budget',
  },
  {
    id: '21',
    trackId: 'cert2',
    name: 'Дневная форма. Бюджет. Факультет социокультурных коммуникаций',
    shortName: 'Дневная · бюджет · СКК',
    schedule: 'day',
    finance: 'budget',
  },
  {
    id: '22',
    trackId: 'cert2',
    name: 'Дневная платная форма. Факультет социокультурных коммуникаций',
    shortName: 'Дневная · платная · СКК',
    schedule: 'day',
    finance: 'paid',
  },
  {
    id: '5',
    trackId: 'nocert',
    name: 'Дневная форма. Бюджет',
    shortName: 'Дневная · бюджет',
    schedule: 'day',
    finance: 'budget',
  },
  {
    id: '6',
    trackId: 'nocert',
    name: 'Заочная форма. Бюджет',
    shortName: 'Заочная · бюджет',
    schedule: 'zaoch',
    finance: 'budget',
  },
  {
    id: '16',
    trackId: 'nocert',
    name: 'Дневная платная форма',
    shortName: 'Дневная · платная',
    schedule: 'day',
    finance: 'paid',
  },
  {
    id: '17',
    trackId: 'nocert',
    name: 'Заочная платная форма',
    shortName: 'Заочная · платная',
    schedule: 'zaoch',
    finance: 'paid',
  },
  {
    id: '13',
    trackId: 'nocert',
    name: 'Заочная платная форма получения второго высшего образования',
    shortName: 'Заочная · платная · 2-е ВО',
    schedule: 'zaoch',
    finance: 'paid',
  },
];

/** @returns {Track[]} */
export function listTracks() {
  return TRACKS.map((t) => ({ ...t }));
}

/** @returns {TableDef[]} */
export function listCatalogTables() {
  return TABLES.map((t) => ({ ...t }));
}

/**
 * @param {string} trackId
 */
export function trackById(trackId) {
  return TRACKS.find((t) => t.id === trackId) || null;
}

/**
 * @param {string | null | undefined} id
 */
export function tableById(id) {
  if (id == null || id === '') return null;
  return TABLES.find((t) => t.id === String(id)) || null;
}

/**
 * Compact trigger label: "3 сертификата · Дневная · платная"
 * @param {TableDef | null | undefined} table
 */
export function shortTableLabel(table) {
  if (!table) return 'Таблица';
  const track = trackById(table.trackId);
  const trackBit = track?.shortName || track?.name || '';
  const formBit = table.shortName || table.name || `id ${table.id}`;
  return trackBit ? `${trackBit} · ${formBit}` : formBit;
}

/**
 * Prefer saved id, else catalog default, else first known.
 * @param {TableDef[]} tables
 * @param {string | null | undefined} savedId
 */
export function resolveTableId(tables, savedId) {
  const list =
    Array.isArray(tables) && tables.length ? tables : listCatalogTables();
  if (savedId && list.some((t) => t.id === String(savedId))) {
    return String(savedId);
  }
  const marked =
    list.find((t) => t.default) ||
    list.find((t) => t.id === DEFAULT_TABLE_ID);
  if (marked) return marked.id;
  return list[0]?.id || DEFAULT_TABLE_ID;
}

/**
 * @param {TableDef[]} tables
 * @param {string} [query]
 */
export function filterTablesByQuery(tables, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
  const list = [...(tables || [])];
  if (!q) return list;
  return list.filter((t) => {
    const track = trackById(t.trackId);
    const hay = [t.name, t.shortName, track?.name, track?.shortName, t.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .replace(/ё/g, 'е');
    return hay.includes(q);
  });
}

/**
 * Group tables under track headings (hub order).
 * @param {TableDef[]} tables
 */
export function groupTablesByTrack(tables) {
  const byTrack = new Map();
  for (const track of TRACKS) byTrack.set(track.id, []);
  for (const table of tables || []) {
    if (!byTrack.has(table.trackId)) byTrack.set(table.trackId, []);
    byTrack.get(table.trackId).push(table);
  }
  return TRACKS.map((track) => ({
    track,
    tables: byTrack.get(track.id) || [],
  })).filter((g) => g.tables.length);
}

/**
 * Faculty rows visible for one monitoring table.
 * @param {object[]} specialties
 * @param {string} formId
 */
export function facultiesForTable(specialties, formId) {
  const map = new Map();
  const fid = String(formId);
  for (const s of specialties || []) {
    if (String(s.form) !== fid) continue;
    const id = s.facultyId || 'main';
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: s.facultyName || id,
        specialtyCount: 0,
      });
    }
    map.get(id).specialtyCount += 1;
  }
  return [...map.values()];
}

export function sourceUrlForTable(tableId) {
  return `${BSU_BASE_URL}${tableId}`;
}
