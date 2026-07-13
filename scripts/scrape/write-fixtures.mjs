/**
 * Fixture for Институт бизнеса БГУ (formk1 ids 7 = дневная, 8 = заочная).
 * Used when abit.bsu.by is unreachable.
 */
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calcPassing } from '../../js/compute.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = join(root, 'data');
mkdirSync(dataDir, { recursive: true });

const ranges = [
  '391 и более',
  '390 - 386',
  '385 - 381',
  '380 - 376',
  '375 - 371',
  '370 - 366',
  '365 - 361',
  '360 - 356',
  '355 - 351',
  '350 - 346',
  '345 - 341',
  '340 - 336',
  '335 - 331',
  '330 - 326',
  '325 - 321',
  '320 - 316',
  '315 - 311',
  '310 - 306',
  '305 - 301',
  '300 - 296',
  '295 - 291',
  '290 - 286',
  '285 и менее',
];

const updatedAt = new Date().toISOString();

function buckets(profile) {
  return ranges.map((_, i) => profile[i] || 0);
}

function makeSpec({ facultyId, facultyName, specName, plan, totalApps, profile, sourceUrl }) {
  const b = buckets(profile);
  return {
    id: `sb-bsu:${facultyId}:${specName}:${plan}`,
    universityId: 'sb-bsu',
    facultyId: String(facultyId),
    facultyName,
    form: String(facultyId),
    formName: facultyName,
    groupName: '',
    specName,
    plan,
    totalApps,
    inCompetition: totalApps,
    ranges,
    buckets: b,
    estimatedPassing: calcPassing(ranges, b, plan),
    sourceUrl,
    updatedAt,
  };
}

// Dense mid-high profiles for business specialties
const ba = [0, 1, 1, 2, 3, 4, 5, 4, 3, 2, 2, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0];
const log = [0, 0, 1, 1, 2, 3, 3, 4, 3, 2, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];
const mkt = [0, 0, 0, 1, 2, 2, 4, 5, 4, 3, 2, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0];
const uir = [1, 2, 2, 3, 4, 3, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

const day = [
  makeSpec({
    facultyId: '7',
    facultyName: 'Дневная',
    specName: 'бизнес-администрирование',
    plan: 40,
    totalApps: 62,
    profile: ba,
    sourceUrl: 'https://abit.bsu.by/formk1?id=7',
  }),
  makeSpec({
    facultyId: '7',
    facultyName: 'Дневная',
    specName: 'логистика',
    plan: 30,
    totalApps: 48,
    profile: log,
    sourceUrl: 'https://abit.bsu.by/formk1?id=7',
  }),
  makeSpec({
    facultyId: '7',
    facultyName: 'Дневная',
    specName: 'маркетинг',
    plan: 25,
    totalApps: 44,
    profile: mkt,
    sourceUrl: 'https://abit.bsu.by/formk1?id=7',
  }),
  makeSpec({
    facultyId: '7',
    facultyName: 'Дневная',
    specName: 'управление информационными ресурсами',
    plan: 35,
    totalApps: 55,
    profile: uir,
    sourceUrl: 'https://abit.bsu.by/formk1?id=7',
  }),
];

const zaochProfile = (p) => p.map((n) => Math.max(0, Math.round(n * 0.55)));

const zaoch = [
  makeSpec({
    facultyId: '8',
    facultyName: 'Заочная',
    specName: 'бизнес-администрирование',
    plan: 20,
    totalApps: 28,
    profile: zaochProfile(ba),
    sourceUrl: 'https://abit.bsu.by/formk1?id=8',
  }),
  makeSpec({
    facultyId: '8',
    facultyName: 'Заочная',
    specName: 'логистика',
    plan: 15,
    totalApps: 18,
    profile: zaochProfile(log),
    sourceUrl: 'https://abit.bsu.by/formk1?id=8',
  }),
  makeSpec({
    facultyId: '8',
    facultyName: 'Заочная',
    specName: 'маркетинг',
    plan: 15,
    totalApps: 22,
    profile: zaochProfile(mkt),
    sourceUrl: 'https://abit.bsu.by/formk1?id=8',
  }),
  makeSpec({
    facultyId: '8',
    facultyName: 'Заочная',
    specName: 'управление информационными ресурсами',
    plan: 18,
    totalApps: 21,
    profile: zaochProfile(uir),
    sourceUrl: 'https://abit.bsu.by/formk1?id=8',
  }),
];

const specialties = [...day, ...zaoch];

const payload = {
  universityId: 'sb-bsu',
  name: 'Институт бизнеса БГУ',
  fullName: 'Институт бизнеса Белорусского государственного университета',
  hubUrl: 'https://sb.bsu.by/',
  updatedAt,
  specialtyCount: specialties.length,
  faculties: [
    { id: '7', name: 'Дневная', specialtyCount: day.length },
    { id: '8', name: 'Заочная', specialtyCount: zaoch.length },
  ],
  specialties,
  scrapeErrors: [],
  scrapeMeta: { fixture: true },
};

// Remove stale multi-uni data files
for (const file of readdirSync(dataDir)) {
  if (file.endsWith('.json')) unlinkSync(join(dataDir, file));
}

writeFileSync(join(dataDir, 'sb-bsu.json'), `${JSON.stringify(payload, null, 2)}\n`);

const index = {
  generatedAt: updatedAt,
  universities: [
    {
      id: 'sb-bsu',
      name: payload.name,
      fullName: payload.fullName,
      specialtyCount: payload.specialtyCount,
      updatedAt,
      available: true,
      faculties: payload.faculties,
    },
  ],
};

writeFileSync(join(dataDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log('wrote sb-bsu fixture', payload.specialtyCount, 'specialties');
