import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrapeFormk1 } from './adapters/formk1.mjs';
import { scrapeBsuir } from './adapters/bsuir.mjs';
import { scrapeBntu } from './adapters/bntu.mjs';
import { scrapeGrsu } from './adapters/grsu.mjs';
import { dedupeSpecs } from './normalize.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '../..');
const dataDir = join(root, 'data');
const sourcesPath = join(root, 'sources/universities.json');

const adapters = {
  formk1: scrapeFormk1,
  bsuir: scrapeBsuir,
  bntu: scrapeBntu,
  grsu: scrapeGrsu,
};

function parseArgs(argv) {
  const args = { only: null, limit: null, dry: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--only') args.only = argv[++i];
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--dry') args.dry = true;
  }
  return args;
}

function loadExisting(uniId) {
  const path = join(dataDir, `${uniId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function stablePayload(payload) {
  const copy = structuredClone(payload);
  // Fingerprint of table numbers only (ignore scrape clocks / meta).
  delete copy.scrapeErrors;
  delete copy.scrapeMeta;
  delete copy.scrapedAt;
  delete copy.updatedAt;
  delete copy.lastAttemptAt;
  if (Array.isArray(copy.specialties)) {
    for (const row of copy.specialties) {
      if (row && typeof row === 'object') delete row.updatedAt;
    }
  }
  return JSON.stringify(copy);
}

async function main() {
  const args = parseArgs(process.argv);
  const universities = JSON.parse(readFileSync(sourcesPath, 'utf8'));
  mkdirSync(dataDir, { recursive: true });

  const enabled = universities.filter((u) => u.enabled !== false);
  const selected = args.only
    ? enabled.filter((u) => u.id === args.only)
    : enabled;

  if (!selected.length) {
    console.error('No universities matched.');
    process.exitCode = 1;
    return;
  }

  const index = {
    generatedAt: new Date().toISOString(),
    origin: {
      repo: process.env.GITHUB_REPOSITORY || 'rwbear/bsu-admission-tracker',
      // Prefer explicit Pages branch — when the workflow runs from main,
      // GITHUB_REF_NAME is "main" even though we checked out the Pages branch.
      branch:
        process.env.PROHOD_DATA_BRANCH ||
        process.env.GITHUB_REF_NAME ||
        process.env.GITHUB_HEAD_REF ||
        '',
    },
    universities: [],
  };
  if (!index.origin.branch) {
    try {
      const { execSync } = await import('node:child_process');
      index.origin.branch = execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8',
      }).trim();
    } catch {
      index.origin.branch = 'cursor/admission-tracker-rebuild-be86';
    }
  }

  let changed = false;

  for (const uni of selected) {
    const adapter = adapters[uni.adapter];
    if (!adapter) {
      console.warn(`[skip] no adapter for ${uni.id} (${uni.adapter})`);
      continue;
    }

    console.log(`[scrape] ${uni.id} via ${uni.adapter}…`);
    let result;
    try {
      result = await adapter(uni, { limit: args.limit || undefined });
    } catch (err) {
      console.error(`[error] ${uni.id}:`, err);
      const prev = loadExisting(uni.id);
      if (prev) {
        index.universities.push(summarize(uni, prev));
      }
      continue;
    }

    const specs = dedupeSpecs(result.specs || []);
    const prev = loadExisting(uni.id);

    // Soft-fail: if scrape returned zero but we had prior data, keep prior and note it
    let payload;
    if (specs.length === 0 && prev?.specialties?.length) {
      console.warn(`[keep] ${uni.id}: empty scrape, retaining previous ${prev.specialties.length} rows`);
      payload = {
        ...prev,
        scrapeErrors: result.errors || [],
        scrapeMeta: { ...(result.meta || {}), retainedPrevious: true },
        lastAttemptAt: result.updatedAt,
      };
    } else {
      const faculties = buildFacultyIndex(specs, uni);
      payload = {
        universityId: uni.id,
        name: uni.name,
        fullName: uni.fullName,
        hubUrl: uni.hubUrl || null,
        updatedAt: result.updatedAt,
        specialtyCount: specs.length,
        faculties,
        specialties: specs,
        scrapeErrors: result.errors || [],
        scrapeMeta: result.meta || {},
      };
    }

    const outPath = join(dataDir, `${uni.id}.json`);
    if (!args.dry) {
      const contentChanged =
        !prev || stablePayload(prev) !== stablePayload(payload);
      const successfulLive = specs.length > 0;
      // Always publish a successful scrape so updatedAt advances every run.
      // Retained/failed scrapes only write when the file on disk must change.
      if (successfulLive || contentChanged) {
        writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
        changed = true;
        console.log(
          `[write] ${outPath} (${payload.specialtyCount ?? payload.specialties.length} specialties)` +
            (successfulLive && !contentChanged ? ' [heartbeat]' : ''),
        );
      } else {
        console.log(`[unchanged] ${uni.id}`);
      }
    } else {
      console.log(`[dry] ${uni.id}: ${specs.length} specialties, ${result.errors?.length || 0} notes`);
    }

    index.universities.push(summarize(uni, payload));
  }

  // Merge index with universities not scraped this run
  const scrapedIds = new Set(selected.map((u) => u.id));
  for (const uni of enabled) {
    if (scrapedIds.has(uni.id)) continue;
    const prev = loadExisting(uni.id);
    if (prev) index.universities.push(summarize(uni, prev));
    else {
      index.universities.push({
        id: uni.id,
        name: uni.name,
        fullName: uni.fullName,
        specialtyCount: 0,
        updatedAt: null,
        available: false,
      });
    }
  }

  index.universities.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

  const indexPath = join(dataDir, 'index.json');
  if (!args.dry) {
    const prevIndex = existsSync(indexPath)
      ? readFileSync(indexPath, 'utf8')
      : '';
    const next = `${JSON.stringify(index, null, 2)}\n`;
    if (prevIndex !== next) {
      writeFileSync(indexPath, next, 'utf8');
      changed = true;
      console.log(`[write] ${indexPath}`);
    }
  }

  // Machine-readable output for Actions
  writeFileSync(
    join(dataDir, '.changed'),
    changed ? '1' : '0',
    'utf8',
  );
  console.log(`[done] changed=${changed}`);
}

function buildFacultyIndex(specs, uni) {
  const map = new Map();
  for (const s of specs) {
    const id = s.facultyId || 'main';
    if (!map.has(id)) {
      map.set(id, {
        id,
        name: s.facultyName || lookupFacultyName(uni, id) || id,
        specialtyCount: 0,
      });
    }
    map.get(id).specialtyCount += 1;
  }

  // Ensure configured faculties appear even if empty after scrape
  for (const f of uni.faculties || []) {
    const id = String(f.id);
    if (!map.has(id)) map.set(id, { id, name: f.name, specialtyCount: 0 });
  }
  for (const f of uni.forms || []) {
    const id = String(f.id);
    if (!map.has(id)) map.set(id, { id, name: f.name, specialtyCount: 0 });
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

function lookupFacultyName(uni, id) {
  const fac = (uni.faculties || []).find((f) => String(f.id) === String(id));
  if (fac) return fac.name;
  const form = (uni.forms || []).find((f) => String(f.id) === String(id));
  return form?.name || '';
}

function summarize(uni, payload) {
  return {
    id: uni.id,
    name: uni.name,
    fullName: uni.fullName,
    specialtyCount: payload.specialtyCount ?? payload.specialties?.length ?? 0,
    updatedAt: payload.updatedAt || null,
    available: (payload.specialtyCount ?? payload.specialties?.length ?? 0) > 0,
    faculties: (payload.faculties || []).map((f) => ({
      id: f.id,
      name: f.name,
      specialtyCount: f.specialtyCount,
    })),
  };
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
