/**
 * Writes deterministic demo fixtures so the UI works off-season / offline.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
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

function bucketsFromProfile(profile) {
  // profile: denser mid scores
  return ranges.map((_, i) => profile[i] || 0);
}

function spec(partial) {
  const buckets = partial.buckets;
  const plan = partial.plan;
  return {
    id: partial.id,
    universityId: partial.universityId,
    facultyId: partial.facultyId,
    facultyName: partial.facultyName,
    form: partial.form || '',
    formName: partial.formName || '',
    groupName: partial.groupName || '',
    specName: partial.specName,
    plan,
    totalApps: partial.totalApps,
    inCompetition: partial.inCompetition ?? partial.totalApps,
    ranges,
    buckets,
    estimatedPassing: calcPassing(ranges, buckets, plan),
    sourceUrl: partial.sourceUrl,
    updatedAt: partial.updatedAt,
  };
}

const updatedAt = '2026-07-13T12:00:00.000Z';

const bioProfile = [
  0, 0, 1, 0, 1, 2, 3, 4, 2, 3, 1, 2, 3, 2, 1, 1, 0, 1, 0, 0, 0, 0, 0,
];
const bioengProfile = [
  1, 2, 1, 3, 3, 4, 2, 2, 1, 1, 2, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];
const softProfile = [
  0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 4, 3, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0,
];

const bsuSpecs = [
  spec({
    id: 'bsu:7:bioeng:10',
    universityId: 'bsu',
    facultyId: '7',
    facultyName: 'Биологический',
    specName: 'биоинженерия и биоинформатика',
    plan: 10,
    totalApps: 28,
    buckets: bucketsFromProfile(bioengProfile),
    sourceUrl: 'https://abit.bsu.by/formk1?id=7',
    updatedAt,
  }),
  spec({
    id: 'bsu:7:biotech:20',
    universityId: 'bsu',
    facultyId: '7',
    facultyName: 'Биологический',
    specName: 'биология (направление — биотехнология)',
    plan: 20,
    totalApps: 25,
    buckets: bucketsFromProfile(bioProfile),
    sourceUrl: 'https://abit.bsu.by/formk1?id=7',
    updatedAt,
  }),
  spec({
    id: 'bsu:7:biochem:10',
    universityId: 'bsu',
    facultyId: '7',
    facultyName: 'Биологический',
    specName: 'биохимия',
    plan: 10,
    totalApps: 12,
    buckets: bucketsFromProfile(softProfile),
    sourceUrl: 'https://abit.bsu.by/formk1?id=7',
    updatedAt,
  }),
  spec({
    id: 'bsu:6:informatics:40',
    universityId: 'bsu',
    facultyId: '6',
    facultyName: 'Прикладной математики и информатики',
    specName: 'прикладная информатика',
    plan: 40,
    totalApps: 95,
    buckets: bucketsFromProfile(bioengProfile.map((n) => n * 2)),
    sourceUrl: 'https://abit.bsu.by/formk1?id=6',
    updatedAt,
  }),
];

const bspuSpecs = [
  spec({
    id: 'bspu:17:psych:15',
    universityId: 'bspu',
    facultyId: '17',
    facultyName: 'Психологии',
    specName: 'психология',
    plan: 15,
    totalApps: 40,
    buckets: bucketsFromProfile(bioProfile),
    sourceUrl: 'https://abiturient.bspu.by/formk1?id=17',
    updatedAt,
  }),
];

const bsuirRanges = [
  '396-400', '391-395', '386-390', '381-385', '376-380', '371-375',
  '366-370', '361-365', '356-360', '351-355', '346-350', '341-345',
  '336-340', '331-335', '326-330', '321-325', '316-320', '311-315',
  '306-310', '301-305', '296-300', '291-295', '286-290', '281-285',
  '280 и менее',
];
const bsuirBuckets = [
  2, 3, 4, 5, 6, 4, 5, 3, 2, 2, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

const bsuirSpecs = [
  {
    id: 'bsuir:dn_budjet:poe:25',
    universityId: 'bsuir',
    facultyId: 'dn_budjet',
    facultyName: 'Дневная бюджетная',
    form: 'dn_budjet',
    formName: 'Дневная бюджетная',
    groupName: 'ФКТиУ',
    specName: 'программная инженерия',
    plan: 25,
    totalApps: 48,
    inCompetition: 45,
    ranges: bsuirRanges,
    buckets: bsuirBuckets,
    estimatedPassing: calcPassing(bsuirRanges, bsuirBuckets, 25),
    sourceUrl: 'https://abitur.bsuir.by/statistics/2026/group/dn_budjet.html',
    updatedAt,
  },
];

const bntuSpecs = [
  spec({
    id: 'bntu:7:day_budget:robot:30',
    universityId: 'bntu',
    facultyId: '7:day_budget',
    facultyName: 'Информационных технологий и робототехники · Дневная бюджет',
    form: 'day_budget',
    formName: 'Дневная бюджет',
    specName: 'робототехнические системы',
    plan: 30,
    totalApps: 55,
    buckets: bucketsFromProfile(bioengProfile.map((n) => n + 1)),
    sourceUrl: 'http://stat.priem.bntu.by/view_.php?kf=7&forob=1&budj=1',
    updatedAt,
  }),
];

const belstuSpecs = [
  spec({
    id: 'belstu:1:chemtech:20',
    universityId: 'belstu',
    facultyId: '1',
    facultyName: 'Факультет 1',
    specName: 'химическая технология',
    plan: 20,
    totalApps: 22,
    buckets: bucketsFromProfile(softProfile),
    sourceUrl: 'https://lk.belstu.by/formk1?id=1',
    updatedAt,
  }),
];

const grsuSpecs = [
  spec({
    id: 'grsu:DF:law:25',
    universityId: 'grsu',
    facultyId: 'DF',
    facultyName: 'Дневная бюджет',
    form: 'DF',
    formName: 'Дневная бюджет',
    specName: 'правоведение',
    plan: 25,
    totalApps: 60,
    buckets: bucketsFromProfile(bioProfile),
    sourceUrl: 'https://abit.grsu.by/university.php?v=DF',
    updatedAt,
  }),
];

function pack(uni, specialties) {
  const faculties = new Map();
  for (const s of specialties) {
    if (!faculties.has(s.facultyId)) {
      faculties.set(s.facultyId, {
        id: s.facultyId,
        name: s.facultyName,
        specialtyCount: 0,
      });
    }
    faculties.get(s.facultyId).specialtyCount += 1;
  }
  return {
    universityId: uni.id,
    name: uni.name,
    fullName: uni.fullName,
    hubUrl: uni.hubUrl,
    updatedAt,
    specialtyCount: specialties.length,
    faculties: [...faculties.values()],
    specialties,
    scrapeErrors: [],
    scrapeMeta: { fixture: true },
  };
}

const unis = {
  bsu: {
    id: 'bsu',
    name: 'БГУ',
    fullName: 'Белорусский государственный университет',
    hubUrl: 'https://abit.bsu.by/formk1?id=7',
  },
  bspu: {
    id: 'bspu',
    name: 'БГПУ',
    fullName: 'Белорусский государственный педагогический университет им. М. Танка',
    hubUrl: 'https://abiturient.bspu.by/Statistics',
  },
  bsuir: {
    id: 'bsuir',
    name: 'БГУИР',
    fullName: 'Белорусский государственный университет информатики и радиоэлектроники',
    hubUrl: 'https://abitur.bsuir.by/statistics/2026/stat.html',
  },
  bntu: {
    id: 'bntu',
    name: 'БНТУ',
    fullName: 'Белорусский национальный технический университет',
    hubUrl: 'http://stat.priem.bntu.by/',
  },
  belstu: {
    id: 'belstu',
    name: 'БГТУ',
    fullName: 'Белорусский государственный технологический университет',
    hubUrl: 'https://abiturient.belstu.by/monitoring-vstupitelnoj-kampanii/',
  },
  grsu: {
    id: 'grsu',
    name: 'ГрГУ',
    fullName: 'Гродненский государственный университет имени Янки Купалы',
    hubUrl: 'https://abit.grsu.by/priemnaya-kampaniya-monitoring',
  },
};

const files = {
  bsu: pack(unis.bsu, bsuSpecs),
  bspu: pack(unis.bspu, bspuSpecs),
  bsuir: pack(unis.bsuir, bsuirSpecs),
  bntu: pack(unis.bntu, bntuSpecs),
  belstu: pack(unis.belstu, belstuSpecs),
  grsu: pack(unis.grsu, grsuSpecs),
};

for (const [id, payload] of Object.entries(files)) {
  writeFileSync(join(dataDir, `${id}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  console.log('wrote', id, payload.specialtyCount);
}

const index = {
  generatedAt: updatedAt,
  universities: Object.values(files).map((p) => ({
    id: p.universityId,
    name: p.name,
    fullName: p.fullName,
    specialtyCount: p.specialtyCount,
    updatedAt: p.updatedAt,
    available: p.specialtyCount > 0,
    faculties: p.faculties,
  })),
};

writeFileSync(join(dataDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`);
console.log('wrote index.json');
