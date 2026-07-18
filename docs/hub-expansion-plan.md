# Plan: BSU monitoring hub → full table coverage

**Rollback:** branch `cursor/checkpoint-pre-hub-be86` + tag `checkpoint/pre-hub-expansion-20260714` (`5dd5330`).

## Goal
Give the site every table from
[Мониторинг подачи заявлений](https://abiturient.bsu.by/priemnaia-kampaniia/monitoring-podachi-zaiavlenii)
while the first screen stays as simple as today: one clear path → faculty → score → chances.
Data must stay true and as fresh as the scrape chain allows.

## Hub inventory (source of truth)
Scraped from the official hub (2026-07-14):

### 3 сертификата ЦТ или ЦЭ
| id | Label |
|----|--------|
| 32 | Дневная форма. Бюджет |
| 29 | Военный факультет. Дневная форма. Бюджет |
| 2 | Заочная форма. Бюджет |
| **7** | **Дневная платная форма** ← current default |
| 8 | Заочная платная форма |

### 2 сертификата ЦТ или ЦЭ
| id | Label |
|----|--------|
| 34 | Дневная форма. Бюджет |
| 21 | Дневная форма. Бюджет. Факультет социокультурных коммуникаций |
| 22 | Дневная платная форма. Факультет социокультурных коммуникаций |

### Без сертификатов ЦТ или ЦЭ
| id | Label |
|----|--------|
| 5 | Дневная форма. Бюджет |
| 6 | Заочная форма. Бюджет |
| 16 | Дневная платная форма |
| 17 | Заочная платная форма |
| 13 | Заочная платная форма получения второго высшего образования |

13 tables total. Today we only scrape **id=7**.

## UX (keep simplicity)
Do **not** explode into a budget×day×certs matrix in the hero.

Add **one** control above the faculty title, same visual language as the faculty button:

1. **Таблица / канал поступления** (searchable overlay, grouped by track)  
   Default: `3 сертификата · Дневная платная` (id=7) — identical default feel to today.
2. **Факультет** (unchanged pattern; list = faculties present in the selected table only)
3. **Балл** (unchanged)

Hero still reads as one composition: channel → faculty → score → CTA. No cards, no stat strips.

## Data architecture
- Curated catalog: `sources/bsu-tables.json` (ids, labels, track, finance, schedule, `default`).
- `universities.json`: point `hubUrl` at the official monitoring page; faculties list = catalog tables (each `formk1?id=`).
- Every specialty already has `form` / `formName` / `sourceUrl`; enrich with `trackId`, `trackName`, `finance`, `schedule`.
- Snapshot stays one file `data/sb-bsu.json`. Faculty index is derived per scrape; client filters by selected table id (`form`).
- Partial scrape failures: keep previous specialties for failed table ids; refresh successful ones; fail CI only if **no** live tables succeeded (truth > empty page).

## Scraper
- Fetch all 13 tables (sequential with small delay; reuse proxy stack).
- `parseAllSections` per table (same parser as id=7).
- Hub discovery as safety net: any new `formk1?id=` on the hub not in catalog is fetched with a placeholder name and logged.
- Soft-fail retention is per-table-id when possible.

## Client
- Prefs: `rwb-sb-form` (table id), keep `rwb-sb-faculty`, score.
- State/filter: specialties where `form === selectedFormId`, then faculty.
- Footer/source link follows the selected table URL.
- Default resolution: catalog `default: true` → id=7; faculty still prefers Институт бизнеса when present in that table.

## Freshness (priority area)
- Cadence unchanged (workflow_dispatch arm on main).
- Scrape timeout already 45m — enough for 13 pages via proxies.
- Retain-check: require at least one successful live table + nonempty faculties for default table.
- Client still SHA-pins snapshots; heartbeat `updatedAt` advances when any table is republished.
- Bug-hunt: compare specialty counts / sample plans against live `formk1` for id=7 and at least two other tables; verify `updatedAt` advances after Actions.

## Out of scope
- Multi-university hub (kudapostupat).
- Browser-side scrape of BSU.
- Changing chance math.

## Milestones
1. Catalog + scraper multi-table + partial retention  
2. Client table picker + filters + prefs  
3. Docs / CATALOG update  
4. Live scrape verification + freshness bug-hunt  

## Definition of done
- All 13 hub tables present in snapshot (or explicitly marked failed in `scrapeMeta` with prior rows kept).
- Default path still shows Институт бизнеса on daytime paid / 3-cert without extra clicks.
- UI has one new control; faculty + score unchanged in role.
- Rollback available via checkpoint branch/tag.
- Manual/proxy sample of live HTML matches committed numbers for default table.
