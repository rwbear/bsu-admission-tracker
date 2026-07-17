# R1 — Product surface map (bsu-admission-tracker)

**Audit mode:** read-only  
**Scope:** `/workspace` overnight quality audit  
**Product:** БГУ · live-таблицы конкурса — static site that shows where a submitted score sits in official BSU competition tables  
**Live URL:** https://rwbear.github.io/bsu-admission-tracker/  
**Stack:** static HTML/CSS/ES modules · Node scraper · GitHub Actions → Pages branch · Node test suite (`node --test`)

---

## 1. Entry points

### 1.1 `index.html` (shell)

Single-page shell (`lang="ru"`). Cache-busted assets `?v=20260715ai`.

| Layer | Markup / role |
|--------|----------------|
| Head | Outfit (Google Fonts), OG/Twitter to `assets/og-share.jpg`, three CSS files |
| Header `#command` | Brand link `r.w.b. \| production` + live meta rotator (`#command-time` / `#next-update`) |
| Hero `.hero-block` | `#table-picker-mount` → `#faculty-picker-mount` → `#score-form` (0–500) |
| Banner `#data-banner` | Fixture / retention / stale warnings |
| Board `#board` | Mutual-exclusive: loading / empty / error / `#results` |
| Results | `#summary-strip` + master-detail (`#overview-list` / `#detail-panel`) |
| Footer | Dynamic source link `#source-link` + disclaimer |
| Boot | `<script type="module" src="./js/main.js">` |

**First viewport composition:** channel (table) → faculty → score → CTA. No stats/cards in hero (matches hub-expansion plan).

### 1.2 `js/main.js` boot flow

```
bootstrap()
  ├─ loadPrefs()                    // localStorage: score, form, faculty, selected
  ├─ bindPickerChrome()             // Escape + arrow nav for overlays
  ├─ renderBoard()                  // loading shell
  ├─ await fetchData({ silent:false })
  │    ├─ loadUniversity(CONFIG.universityId)
  │    ├─ normalizeUniversityPayload()  // form-scoped specialty ids
  │    ├─ syncTableSelection / syncFacultySelection
  │    ├─ applyBanner(scrapeMeta / stale)
  │    └─ emit() → subscribe(renderBoard)
  └─ startAutoRefresh()             // 1s tick + visibility + online
```

**Render path (`renderBoard`):**

1. Sync table/faculty against live data + persist prefs  
2. Update footer source URL for selected table  
3. States: loading (no data) → error (no data) → empty (no score / no rows) → results  
4. `currentSpecialties()` = `form === formId` then `facultyId`  
5. `prepareSpecs` → `renderSummary` / `renderOverviewList` / `renderDetailPanel`  
6. Selection via `resolveSelection` (keep or first after display order)

**Refresh orchestration:**

- `fetchChain` serializes overlapping polls  
- Silent refresh keeps prior data on failure  
- `snapshotChanged` diffs `updatedAt` + `JSON.stringify(specialties)`  
- Stale snapshots tighten poll to 30s (`refresh-schedule.js`)  
- `?pollMs=` override clamped for local verify  

**Prefs keys:** `prohod-sb-score`, `prohod-sb-form`, `prohod-sb-faculty`, `prohod-sb-selected`.

**Config (`js/config.js`):**

| Key | Value |
|-----|--------|
| `universityId` | `sb-bsu` |
| `repo` | `rwbear/bsu-admission-tracker` |
| `dataBranch` | `cursor/admission-tracker-rebuild-be86` |
| `pollMs` | 180000 (3 min) |

---

## 2. Data pipeline

```
abit.bsu.by formk1?id=*
        │  (curl + SCRAPE_PROXY / discovered regional HTTP proxies)
        ▼
scripts/scrape/adapters/formk1.mjs
        │  splitFacultySections → parseScoreBucketTables / parseSimpleCompetitionTables
        ▼
scripts/scrape/normalize.mjs  (+ calcPassing from js/compute.js)
        ▼
scripts/scrape/run.mjs
        │  dedupeSpecs · per-form soft retention · faculty/table indexes
        ▼
data/sb-bsu.json  +  data/index.json  +  data/latest.json
        │  GitHub Actions commit → Pages branch
        │  tip SHA published in latest.json
        ▼
js/load-data.js → browser (SHA-pinned raw → Pages → tip raw)
```

### 2.1 Sources of truth

| Artifact | Role |
|----------|------|
| `sources/universities.json` | Enabled unis; only `sb-bsu` (`adapter: formk1`, 13 table ids) |
| `sources/bsu-tables.json` | Scraper catalog (tracks/tables) |
| `js/tables.js` | Client catalog mirror (must stay in sync) |
| `sources/CATALOG.md` / `docs/hub-expansion-plan.md` | Product + UX intent |

Stub adapters exist (`bsuir`, `bntu`, `grsu`) but are unused (`enabled` only for BSU).

### 2.2 Scrape runtime

- **Entry:** `npm run scrape` → `scripts/scrape/run.mjs`  
- **Fetch:** `proxy.mjs` — env proxies → Proxyscrape discover → curl CONNECT; `looksLikeFormk1` gate  
- **Parse:** per-faculty `td.fl` sections; score-range tables preferred; simple plan/apps fallback  
- **Ids:** `universityId:form:facultyKey:specSlug:plan`  
- **Retention:** failed form ids keep prior rows; full empty scrape retains previous snapshot (`retainedPrevious`)  
- **Outputs:** `data/{id}.json`, `index.json`, `latest.json`, `data/.changed`  
- **Fixtures:** `npm run fixtures` → demo snapshot when BSU unreachable  

### 2.3 Actions cadence (`.github/workflows/scrape.yml`)

- Cron `*/5` unreliable → self-arm: scrape → sleep 270s → `workflow_dispatch` on `main`  
- Checkout **Pages branch** (API or fallback `cursor/admission-tracker-rebuild-be86`)  
- Tests run only on push (not schedule/dispatch)  
- Soft retention failure fails job when `retainedPrevious`  
- After data commit, republish `latest.json.commitSha`  

Documented in `docs/scrape-cadence.md`.

### 2.4 Snapshot shape (`data/sb-bsu.json`)

Observed live sample (~200 specialties, 13 tables, 18 faculties):

```
{
  universityId, name, fullName, hubUrl, updatedAt, specialtyCount,
  faculties: [{ id, name, specialtyCount }],
  tables: [{ id, name, shortName, trackId, trackName, schedule, finance, default, specialtyCount, sourceUrl }],
  specialties: [{
    id, universityId, facultyId, facultyName, form, formName,
    groupName, specName, plan, totalApps, inCompetition,
    ranges[], buckets[], estimatedPassing, sourceUrl, updatedAt,
    sectionTitle, trackId, trackName, schedule, finance
  }],
  scrapeErrors[], scrapeMeta: { okFormIds, failedFormIds, retainedFormIds, retainedPrevious, fetchVia, … }
}
```

### 2.5 Client load (`js/load-data.js`)

`loadUniversity(id)` races candidates and `pickNewest` by `updatedAt` (then specialty count):

1. Tip SHA from `./data/latest.json` or branch raw (3s timeout)  
2. GitHub Commits API SHA for `data/{id}.json` (preferred over tip)  
3. SHA-pinned `raw.githubusercontent.com/{repo}/{sha}/…`  
4. Same-origin `./data/{id}.json?bust`  
5. Branch-tip raw last (CDN-stale risk)  

Empty specialties array throws. Browser never hits `abit.bsu.by`.

---

## 3. Pure math (`js/compute.js`)

Shared by site and scraper. No DOM.

| Function | Behavior |
|----------|----------|
| `bucketLow` / `bucketHigh` | Parse RU range labels: `N и более`, `N и менее`, `A-B`, single |
| `scoreInBucket` | Inclusive lo..hi |
| `calcPassing` | Walk high→low until cum ≥ plan; return that bucket’s low (null if unmet) |
| `peopleAbove` | Full higher bands + **uniform integer spread** of own closed band; open top → 0 within-band |
| `peopleAtOrAbove` | Sum buckets whose high ≥ score |
| `buildChanceTrack` | Segments + `seatCutRatio` + `myMarkerRatio ≈ (peopleAbove+0.5)/denom` |
| `getStatus` | `delta≥10` safe · `≥0` risk · `<0` below · null→neutral |
| `statusLabel` | RU: В зоне / На грани / Ниже |
| `contestRatio` | apps / plan |
| `enrichSpec` | Passing, above, status, pressure, delta, sortKey, chance; **underfilled** (apps/buckets < plan & no passing) → force `safe` |
| `prepareSpecs` | Enrich → optional query/filter → sort: Institute of Business display order → sortKey → localeCompare |

**Product interpretation shown in UI:**

- Metric **«Над тобой / мест»** = `peopleAbove / plan`  
- Status vs **расчётный** = score − `estimatedPassing`  
- Track pin aligned with peopleAbove (not mid-band width alone)  

**Known semantic tension (by design, tested):** bottom-of-passing-band can show peopleAbove ≥ plan (pin past cut) while status is still `risk` (delta 0). Uniform within-band is an estimate, not official rank.

---

## 4. UI modules

### 4.1 Master-detail — `js/ui/radar.js`

- `renderOverviewList` — status mark, name, peopleAbove/plan, delta; listbox  
- `renderDetailPanel` — title, status·faculty, metric grid, chance track, histogram, note, source link  
- `renderSummary` — «В зоне N · На грани N · Ниже N»  
- `resolveSelection` — sticky id or first row  

### 4.2 Charts — `js/ui/charts.js`

- `renderChanceTrack` — seat fill + cut + you pin; label collision nudge  
- `renderHistogram` — full-width cols; seat-cut out-zone hatch; ticks at edges + «ты»  
- Pure helpers: `summarizeStatuses`, `resolveHistCutIndex`, `histOutZoneLeftPct`  

### 4.3 Pickers

| Module | Behavior |
|--------|----------|
| `table-picker.js` | Quiet uppercase trigger; body portal overlay; grouped by cert track; search; **full remount** on each render |
| `faculty-picker.js` | Hero-title-weight trigger; portal; search patches **list only** (shell preserved); enter/exit motion 220ms |
| Shared chrome in `main.js` | Mutually exclusive menus; Escape; Arrow/Home/End; focus restore |

### 4.4 Command meta — `js/command-meta.js` + `main.js`

- Cycle: age 3.5s → countdown 8s  
- Sequential fade (out → gap → in), never crossfade; `META_FADE_MS=720` synced with CSS  
- Refreshing forces countdown («обновляю…»)  
- Reduced motion → 0 fade delay  

### 4.5 Refresh — `js/refresh-schedule.js`

| Constant / API | Role |
|----------------|------|
| `STALE_AFTER_MS` | 6 min |
| `STALE_POLL_MS` | 30 s |
| `resolvePollMs` | `?pollMs=` clamp [1s, default] |
| `resolveEffectivePollMs` | Stale/missing → fast poll |
| `shouldRefreshNow` | due ∧ !refreshing ∧ visible |

### 4.6 Support modules

- `state.js` — pub/sub + prefs  
- `spec-id.js` — client-side form scoping for legacy snapshots  
- `faculties.js` — short labels, keys, default Institute of Business  
- `tables.js` — 13-table catalog, filters, `facultiesForTable`  
- `ui/dom.js` — `$`, `el`, `fmtNum`/`fmtTime`/`fmtAge`  

---

## 5. CSS architecture

```
tokens.css  →  design tokens
layout.css  →  shell, hero, command, overlays, board grid, motion keyframes
components.css → overview rows, detail metrics, chance track, histogram
```

### Visual language (known)

| Token / cue | Value / intent |
|-------------|----------------|
| Background | Paper `#f7f7f5`; panels white; soft `#efefec` |
| Ink | Near-black `#1a1a1a`; dim/faint greys — **no chroma accents** |
| Status colors | `--safe/--risk/--below` all ink; differentiation via mark fill/opacity |
| Type | **Outfit**; uppercase tracking on secondary chrome |
| Shadows | «Daylight cast» ladder (ground/mid/high), warm-grey not purple glow |
| Radius | 0.5 / 0.375 rem |
| Max width | `--max: 44rem` |
| Brand | Header brand primary; faculty trigger acts as hero title; table channel quieter above it |
| Motion | Live pulse; meta fade 720ms; faculty overlay open/leave; chance fill/you enter; detail-in; reduced-motion kills animations |
| Breakpoints | Mobile-first; master-detail side-by-side ≥768px |

**Intentionally not:** purple gradients, cream+terracotta, card-heavy hero, colorful status badges.

---

## 6. Tests inventory (`tests/*`)

Runner: `npm test` → `node --test tests/*.test.js`  
Also: `scripts/verify-refresh.mjs` (Puppeteer smoke; not in default `npm test`).

| File | Covers | Gaps |
|------|--------|------|
| `compute.test.js` | Buckets, passing, peopleAbove uniform band, status, enrich/prepare, IoB order, pin vs cut (incl. MO edge case) | Open-ended «и более» within-band; mismatched range/bucket lengths; simple tables (empty ranges) |
| `readiness.test.js` | Form-scoped ids; underfilled→safe; `parseStoredScore` | Full `setForm`/`setFaculty` side effects; localStorage integration |
| `charts.test.js` | Status summary; hist cut %; chance object shape | DOM render of track/histogram; aria; tick collision |
| `load-data.test.js` | `pickNewest`, `resolveOrigin`, `withTimeout` | Real fetch / SHA race / CDN branches / empty specialty throw |
| `tables.test.js` | 13-id catalog, resolve, labels, group/filter, facultiesForTable | Drift vs `sources/bsu-tables.json` |
| `faculties.test.js` | Labels, keys, default, sort, filter; scrape section filter | Compound section edge titles |
| `parser.test.js` | Tiny HTML fixture → passing; dedupe | Real formk1 HTML; rowspan; plan/apps column misalignment; simple tables |
| `scrape-proxy.test.js` | `looksLikeFormk1` only | curl routes, proxy discover, encoding |
| `refresh-schedule.test.js` | Countdown, pollMs, stale chase, due gate | Integration with main timers / visibility |
| `command-meta.test.js` | Phase timing, fade, refreshing | DOM swap sequencing in main |

### Not covered (high leverage gaps)

- **`main.js` orchestration** (banner rules, fetchChain, silent keep-previous, selection reset on form change)  
- **`radar.js` / picker DOM** (table remount on search; faculty portal lifecycle)  
- **End-to-end parse fidelity** against committed `data/sb-bsu.json` or live HTML fixtures  
- **Adapter stubs** (bsuir/bntu/grsu)  
- **Catalog sync** (`js/tables.js` ↔ `sources/bsu-tables.json`)  
- **CI retain-check** scripted assertions only live in Actions YAML  

**Relative strength:** pure math + schedule/meta helpers. **Relative weakness:** scrape HTML realism + UI integration.

---

## 7. Highest-risk areas for bugs (ranked)

1. **HTML table parser heuristics (`normalize.mjs` `parseScoreBucketTables`)**  
   Plan / totalApps / inCompetition inferred from numeric cells to the left of buckets. Misaligned columns → wrong plan/passing → wrong status for many rows. Sample tests are too synthetic for BSU rowspan layout.

2. **Scrape fetch reliability (proxy stack)**  
   Depends on `SCRAPE_PROXY` secret and/or public Proxyscrape list. Flaky proxies → empty/truncated HTML → soft retention or mixed stale tables. Product truth is only as fresh as Actions + proxies.

3. **Soft retention / mixed freshness**  
   Per-form keep of prior rows can coexist with fresh tables under one `updatedAt`. UI banner covers retained forms, but overview can mix scrape ages without per-row freshness.

4. **Dual catalog drift (`js/tables.js` vs `sources/bsu-tables.json`)**  
   Scraper and client each have a catalog copy. New hub ids or renames can desync labels, defaults, or grouping silently.

5. **Semantic mismatch: status (passing) vs peopleAbove (uniform band)**  
   Correct for the MO edge case now tested, but easy to regress UI copy (“В зоне” while pin is past seats, or reverse) if either formula changes without paired tests.

6. **Client load race + GitHub API limits**  
   Commit API + multi-URL race is sophisticated; rate limits / auth-less API / tip CDN lag can serve older of several payloads or hammer API when many users stale-poll at 30s.

7. **Table picker remount-on-render**  
   Unlike faculty picker, every keystroke rebuilds the overlay (main tries to restore caret). Risk: focus loss, flicker, keyboard nav bugs on mobile.

8. **`snapshotChanged` via `JSON.stringify(specialties)`**  
   Heavy and brittle (key order); unnecessary emits or missed subtle meta changes; cost scales with ~200 dense rows every silent refresh.

9. **Form → faculty default when faculty absent in new table**  
   Resolve falls back to first faculty; specialty selection clears; easy UX “data disappeared” if user doesn’t notice faculty jumped.

10. **Unused multi-uni adapters / hub discovery off**  
    Hub discover disabled; adapters present but dead. Risk of false confidence that multi-uni path is production-ready.

---

## 8. Highest-leverage improvement opportunities

1. **Golden HTML fixtures from real formk1 pages** (at least ids 7, 32, 29) checked into `tests/fixtures/` with expected plan/passing/bucket sums — locks parser against production layout.

2. **Snapshot invariants post-scrape** (local script + CI): non-null ranges length === buckets; plan > 0 ⇒ buckets sum sensible; specialty ids unique; default table faculty IoB present when claimed; no negative counts.

3. **Catalog single source** — generate `js/tables.js` from `sources/bsu-tables.json` (or import JSON) + assert round-trip in tests.

4. **Align product copy with math** — one sentence in detail note when peopleAbove ≥ plan but status is risk (or when underfilled→safe), so the two signals don’t feel contradictory.

5. **Per-table freshness in UI** when `retainedFormIds` non-empty — badge or note on overview/detail, not only global banner.

6. **Bring table-picker up to faculty-picker shell stability** (patch list only) — fewer search/focus bugs, cheaper re-renders.

7. **Contract test for `loadUniversity` candidate order** using mocked `fetch` (SHA win over tip/Pages) — protects freshness architecture without network.

8. **Reduce GitHub API dependency** — prefer tip SHA + Pages; API as optional enrich; avoid 30s API spam in stale chase.

9. **Lightweight radar smoke** (jsdom or Puppeteer in `npm test` / optional job): score submit → overview row count → detail metrics render — catches main wiring regressions the unit suite misses.

10. **Scrape proxy hardening** — treat Proxyscrape as last resort; document/require `SCRAPE_PROXY`; alert when `retainedPrevious` or OK form count drops (Actions already fail soft-retention; surface in README/status).

---

## Appendix A — Module dependency sketch

```
index.html
  └─ main.js
       ├─ state.js ← faculties.js, tables.js
       ├─ config.js
       ├─ load-data.js ← config.js
       ├─ spec-id.js
       ├─ compute.js
       ├─ faculties.js / tables.js
       ├─ refresh-schedule.js / command-meta.js
       └─ ui/*
            radar.js → compute.js, charts.js, dom.js
            faculty-picker.js → faculties.js, dom.js
            table-picker.js → tables.js, dom.js
            charts.js → dom.js

scripts/scrape/run.mjs
  ├─ adapters/formk1.mjs → normalize.mjs, faculties.js, proxy.mjs
  ├─ normalize.mjs → compute.js (calcPassing)
  └─ tables.js / faculties.js
```

## Appendix B — File inventory (application)

| Path | Lines (approx) | Role |
|------|----------------|------|
| `index.html` | ~115 | Shell |
| `js/main.js` | ~715 | App orchestrator |
| `js/compute.js` | ~355 | Admission math |
| `js/ui/faculty-picker.js` | ~387 | Faculty overlay |
| `js/ui/charts.js` | ~322 | Track + histogram |
| `js/tables.js` | ~271 | Table catalog |
| `js/load-data.js` | ~240 | Snapshot fetch |
| `js/ui/table-picker.js` | ~207 | Table overlay |
| `js/ui/radar.js` | ~196 | Master-detail |
| `js/state.js` | ~126 | Prefs + bus |
| `js/faculties.js` | ~110 | Faculty helpers |
| `js/refresh-schedule.js` | ~96 | Poll math |
| `js/command-meta.js` | ~39 | Meta rotator |
| `js/spec-id.js` | ~41 | Id normalize |
| `js/config.js` | ~10 | Constants |
| `js/ui/dom.js` | ~71 | DOM helpers |
| `css/*` | ~3 files | Tokens / layout / components |
| `scripts/scrape/*` | run+normalize+proxy+adapters | Pipeline |
| `data/sb-bsu.json` | ~200 specialties | Live snapshot |
| `tests/*.test.js` | 10 files | Unit/integration of pure layers |

---

*End of R1 product map. No application code was modified for this audit.*


---

## Cold facts (post-judge appendix)

Recorded after R1 judge (required before leaving Round 1).

| Fact | Value |
|------|-------|
| `npm test` / `node --test tests/*.js` | **58 pass / 0 fail** (2026-07-15T23:42Z) |
| Snapshot `updatedAt` | 2026-07-15T23:37:59.266Z |
| Chance-track / within-band | Already landed pre-session; not reopened |
| Catalog ids | Same 13 ids in `js/tables.js` and `sources/bsu-tables.json` at audit time — risk is **process drift**, not current breakage |

### §7 risk tags

| # | Risk | Tag |
|---|------|-----|
| 1 | Parser heuristics | inferred-from-code |
| 2 | Proxy scrape reliability | inferred-from-code (+ known product dependency) |
| 3 | Soft retention mixed freshness | inferred-from-code |
| 4 | Dual catalog drift | inferred-from-code (ids currently aligned) |
| 5 | Status vs peopleAbove semantics | observed (tested MO edge) |
| 6 | Client load / API limits | hypothesis |
| 7 | Table picker remount | inferred-from-code |
| 8 | snapshotChanged stringify | inferred-from-code |
| 9 | Form→faculty fallback surprise | inferred-from-code |
| 10 | Dead multi-uni adapters | observed (unused) |
