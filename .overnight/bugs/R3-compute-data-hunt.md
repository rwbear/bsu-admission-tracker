# R3 — Compute + data bug hunt (bsu-admission-tracker)

**Mode:** report only (no application source changes)  
**UTC:** 2026-07-15 ~23:45Z  
**Snapshot:** `data/sb-bsu.json` · `updatedAt` `2026-07-15T23:37:59.266Z` · 200 specialties · 13 tables  
**Baseline tests:** `npm test` → **58 pass / 0 fail**  
**Live HTML probes:** `formk1?id=2`, `29`, `32` fetched via scrape proxy and parsed with `normalize.mjs`

---

## Executive summary

Core admission math in `js/compute.js` (`calcPassing`, uniform-band `peopleAbove`, pin vs seat cut, status deltas, underfilled→safe) is **internally consistent** with its documented semantics and existing unit tests. Across all 200 specialties × several probe scores, **no status↔pin↔peopleAbove contradictions** were found under those rules.

The **highest-severity confirmed defects** are in **`scripts/scrape/normalize.mjs` plan/apps inference** against real BSU formk1 colspan/rowspan headers. Wrong `totalApps` / `inCompetition` land in the snapshot and poison UI **«Конкурс»**, underfilled notes, and (in some rows) status. A second confirmed product-math gap: **`enrichSpec` leaves `status: 'neutral'` with a user score** when there is no estimated passing and competition is already ≥ plan (simple tables + underfilled-bucket edge).

Catalog `js/tables.js` ↔ `sources/bsu-tables.json` is **currently aligned** (drift risk remains process-level).

---

## Cold facts

| Check | Result |
|--------|--------|
| Duplicate specialty ids | 0 |
| `ranges.length !== buckets.length` | 0 |
| Stored `estimatedPassing` ≠ `calcPassing(...)` | 0 |
| Range order high→low violations | 0 |
| Specialties with buckets but `|bsum − inCompetition| ≥ 3` | **6** |
| `totalApps > 0` and `totalApps < inCompetition` | **25** |
| `totalApps === 0` but `inCompetition > 0` | **8** (all form `29` military) |
| Simple tables (empty ranges, `plan > 0`) | **2** (form `13`) |
| Form `16` specialties | **0** (listed `okFormIds` + empty error) |
| Catalog ids/fields JS ↔ JSON | **match** (JSON-only `minBytes`/`minSections` ignored by design) |
| Dual-signal: `safe`/`below` vs pin side / peopleAbove vs plan | **0 contradictions** on scores `[250,300,320,350,370,380,390,391,395,400,420]` |
| `peopleAbove` vs `myMarkerRatio` ((>= peopleAbove+0.5)/denom) | **0 disagreements** |

---

## Confirmed bugs

### B1 · Plan / apps column inference wrong on real formk1 tables  
**Tag:** `confirmed` · **Severity:** Critical · **Where:** `normalize.mjs` `parseScoreBucketTables` (~lines 224–251)

**What:** After the specialty cell, numerics are interpreted as:

- `plan = afterSpecNums[0]`
- `totalApps = afterSpecNums[2] ?? afterSpecNums[1]`
- `inCompetition = afterSpecNums[last]` (if length ≥ 3)

Real BSU headers are multi-row with colspan/rowspan. Typical left-of-bucket cells include plan, target fragments, “подано не включая…”, **Всего**, без вступительных, вне конкурса, and (on some tables) **по конкурсу**. Index `[2]` is often **not** Всего; `last` is often **not** по конкурсу—especially on forms **without** a dedicated “по конкурсу” column (forms `2`, `29`).

**Repro (live HTML, 2026-07-15):**

1. Fetch `https://abit.bsu.by/formk1?id=2`, parse with `parseScoreBucketTables` / adapter path.  
2. Inspect specialty **биология**.

| Field | Parser / snapshot | Cells after specialty (observed) | Likely truth |
|--------|-------------------|----------------------------------|--------------|
| plan | 9 | `9` | 9 |
| totalApps | **5** | `9, 0, 5, 11, "", 1` → index `[2]=5` | **~11 (Всего)** |
| inCompetition | **1** | last bare number `1` | **~10 (bucket sum)** / not “вне конкурса” |
| bucket sum | 10 | — | 10 |

3. Fetch `id=29`, specialty **правоведение … (м)**:

| Field | Parser | afterSpec nums | Likely truth |
|--------|--------|----------------|--------------|
| totalApps | **0** | `10, 0, 0, 19, "", 5` | **19** |
| inCompetition | **5** | last `5` | **~14 (bsum)** — `5` is mid-column |
| bsum | 14 | | |

4. Fetch `id=32`, specialty **биология**:

| Field | Parser | afterSpec | Likely truth |
|--------|--------|-----------|--------------|
| totalApps | **10** | `55, 2, 10, 37, 2, 17, "", 18` | **37 (Всего)** |
| inCompetition | 18 | last | 18 (по конкурсу) ✓ lucky |
| bsum | 18 | | |

**Expected:** `totalApps` = Всего; `inCompetition` = «по конкурсу» when present, else a documented derivation (e.g. Всего − льготы) consistent with bucket sum.  
**Actual:** Positional guess; **25** snapshot rows with `totalApps < inCompetition`; **8** military rows with `totalApps === 0`.

**Impact:** Wrong **«Конкурс»** (`contestRatio(apps, plan)`), wrong underfilled notes, wrong soft gates that trust apps.

**Proposed test:**

```js
// Golden: sliced real formk1 section HTML for id=2 биология
const rows = parseScoreBucketTables(fixtureHtml, meta);
const bio = rows.find(r => r.specName === 'биология');
assert.equal(bio.plan, 9);
assert.equal(bio.totalApps, 11);           // Всего
assert.ok(Math.abs(bio.inCompetition - bio.buckets.reduce((a,b)=>a+b,0)) <= 1);
// id=32 биология: totalApps === 37, inCompetition === 18
```

---

### B2 · `totalApps === 0` overwritten by second numeric column  
**Tag:** `confirmed` · **Severity:** High · **Where:** `normalize.mjs` lines 249–251 (+ `inCompetition \|\| totalApps` at push)

**Repro:**

```js
// plan=10, целевое=5, Подано/Всего=0, …, в конкурсе=0
const rows = parseScoreBucketTables(sixColHtmlWithZeroApps, meta);
```

**Expected:** `totalApps === 0`, `inCompetition === 0`.  
**Actual:** `if (!totalApps) totalApps = afterSpecNums[1]` → `totalApps === 5`, then `inCompetition: inCompetition \|\| totalApps` → **5**.

Phantom applications from the **целевое** column when truth is zero.

**Proposed test:** assert zero-apps six-column row keeps `totalApps === 0` and `inCompetition === 0` (row may still be kept if plan > 0).

---

### B3 · `extractTables` ignores `rowspan`  
**Tag:** `confirmed` · **Severity:** High · **Where:** `normalize.mjs` `extractTables` (colspan expanded, rowspan ignored)

**Repro:** Live `formk1?id=2` → `extractTables` yields header/data rows of lengths `67/66/62/57/67…` with leading empty cells and shifted “before bucket” windows. Group codes and plan/apps share a brittle right-aligned bucket slice.

**Expected:** Rowspan cells occupy subsequent rows (standard HTML table model) so specialty rows align to header columns.  
**Actual:** Only colspan duplication; rowspan headers leave holes and shift numeric columns relative to names.

**Proposed test:** Fixture with `rowspan="3"` on “Специальность” / plan headers + one data row; assert plan/apps indices match header labels, not merely `slice(-rangeCount)`.

---

### B4 · `enrichSpec` stays `neutral` when user entered a score but no passing formed and competition ≥ plan  
**Tag:** `confirmed` · **Severity:** High · **Where:** `js/compute.js` `enrichSpec` (underfilled→safe only when `competition < plan`)

**Repro (snapshot):**

```js
import { enrichSpec } from '../js/compute.js';
import data from '../data/sb-bsu.json' with { type: 'json' };

const phys = data.specialties.find(s =>
  s.form === '32' && s.specName.includes('прикладная физика - образовательная'));
enrichSpec(phys, 350);
// status === 'neutral', statusLabel === '', estimatedPassing === null
// apps 23 ≥ plan 20, bsum 15 < plan → calcPassing null; max(apps,bsum) ≥ plan → no safe override

const psy = data.specialties.find(s =>
  s.form === '13' && s.specName.includes('психология (отдельный'));
enrichSpec(psy, 350);
// simple table: ranges=[], apps 26 ≥ plan 25 → always neutral with any score
```

**Expected (product):** With a submitted score, UI status should not be blank — e.g. score-aware label for “нет расчётного / простой мониторинг”, or classify via peopleAbove/plan when buckets exist, or treat simple oversubscribed rows as `risk`/`below` by policy.  
**Actual:** Overview mark / summary omit the row from safe/risk/below counts; detail status line can show only faculty.

**Proposed tests:**

```js
assert.notEqual(enrichSpec(physFixture, 350).status, 'neutral');
assert.notEqual(enrichSpec(simpleOversubscribed, 300).status, 'neutral');
// keep existing underfilled→safe when competition < plan
```

---

### B5 · UI «Конкурс» uses corrupted `inCompetition` (pressure)  
**Tag:** `confirmed` · **Severity:** High · **Where:** `enrichSpec` → `contestRatio(apps, plan)` · shown in `js/ui/radar.js`

**Repro:** Form `2` / биология in current snapshot:

```js
enrichSpec(bio2, 300).pressure; // ≈ 0.111  (1/9)
// bucket sum 10 → credible contest ≈ 1.11×
```

Form `29` / правоведение (м): pressure `0.5` (5/10) while **14** applicants sit in score bands for plan **10**.

**Expected:** Pressure reflects competition size consistent with Всего / по конкурсу / bucket sum.  
**Actual:** Displays absurd under-competition when B1 fires.

**Proposed test:** After golden parse fix, `contestRatio(inCompetition, plan)` ≥ `0.9` for биология form 2; invariant post-scrape: if `bsum ≥ 3` then `|inCompetition − bsum| / max(bsum,1) ≤ 0.25` or flag scrape error.

---

### B6 · Underfilled **note** uses `apps` only; status gate uses `max(apps, bucketSum)`  
**Tag:** `confirmed` · **Severity:** Medium · **Where:** `radar.js` detail note vs `enrichSpec` competition

**Repro:** Form `29` радиационная…: `inCompetition=4`, `bsum=19`, `plan=20`, `estimatedPassing=null`.

- `enrichSpec` → `competition = max(4,19) = 19 < 20` → **safe** (OK given buckets).  
- Detail note condition `apps < plan` → **true** → copy *«заявлений меньше мест»* while 19 people are in the histogram.

**Expected:** Same competition definition for status and note (prefer `max(apps, bsum)` or fixed apps).  
**Actual:** Contradictory copy vs mark when apps misparsed low.

**Proposed test:** Unit on note builder (extract helper) with `{ apps: 4, bsum: 19, plan: 20, estimatedPassing: null }` does **not** claim underfilled if product uses bucket-aware competition.

---

## Suspicious smells (not yet proven as product defects)

| ID | Tag | Smell | Why not confirmed |
|----|-----|-------|-------------------|
| S1 | `smell` | Open top band («N и более»): `peopleAbove` adds **0** within-band share | Documented design; high score at band floor shows `0` above even if bucket count ≫ 0. UX can look “too safe.” |
| S2 | `smell` | «120 и менее» treated as uniform integers `[0, 120]` | Inflates within-band above for mid/low pins; no official within-band density. |
| S3 | `smell` | `calcPassing` returns **bucket low** when cum first exceeds plan | Official passing is often the lowest **admitted** score (higher within band). Estimate can sit below a stricter cut; status uses this. |
| S4 | `smell` | Form `16` empty shell → `okFormIds` + scrapeError `empty: true`, 0 rows | Intentional in `formk1.mjs`; UI still lists the channel. |
| S5 | `smell` | Dual catalog `js/tables.js` / `sources/bsu-tables.json` | No current field drift; process risk only. |
| S6 | `smell` | Small `bsum` vs `inCompetition` gaps on form 32 (e.g. биоинженерия 29 vs 31) | Empty bucket cells / льготы; may be scrape noise not always wrong. |
| S7 | `smell` | `Math.round` on fractional `peopleAbove` | Pin uses rounded value; half-up can flip past/inside at `.5`; metric and pin still agree with each other. |
| S8 | `smell` | Soft retention mixed freshness | Not active in this snapshot (`retainedFormIds: []`). |

---

## False-positive-checked (cleared this round)

| Claim from R1 / intuition | Tag | Result |
|---------------------------|-----|--------|
| Catalog JS ↔ JSON ids currently broken | `false-positive-checked` | Same 13 ids; track/name/shortName/schedule/finance/default identical |
| Status `safe` while pin past seat cut (or `below` while pin left) | `false-positive-checked` | 0 cases across full specialty × score grid |
| `peopleAbove` metric ≠ chance-track pin formula | `false-positive-checked` | Pin always `(roundedAbove + 0.5) / denom` when above known |
| Stored passing drift vs `calcPassing` | `false-positive-checked` | 0 mismatches / 200 |
| Uniform-band peopleAbove “broke” MO bottom-of-band case | `false-positive-checked` | Still: at passing, above ≥ plan, status `risk`, pin right of cut (e.g. международные отношения form 32) |
| `ranges`/`buckets` length skew in snapshot | `false-positive-checked` | 0 |

**Intentional dual signal (not a bug):** at estimated passing, status is `risk` (delta 0) while `peopleAbove` may be ≥ plan and pin may sit past the cut. Covered by `tests/compute.test.js` MO case. Copy alignment is a product polish item, not math corruption.

---

## Recommended fixes (ranked)

1. **Critical — B1+B3:** Rebuild plan/apps extraction from header labels (map “Всего”, “по конкурсу”) and implement rowspan in `extractTables`. Add golden fixtures from live formk1 (`2`, `29`, `32` bio/military).  
2. **High — B2:** Replace `if (!totalApps)` with nullish checks (`== null`) so legitimate `0` is kept; never fill apps from целевое.  
3. **High — B4:** Define status when `estimatedPassing == null` and score present: underfilled→safe (existing); else if buckets: derive from `peopleAbove` vs plan; else simple table policy (`risk` if apps≥plan, `safe` if apps<plan). Never leave blank `neutral` after submit.  
4. **High — B5:** Until parse fixed, pressure fallback `contestRatio(Math.max(apps, bsum), plan)` when `bsum` clearly exceeds apps.  
5. **Medium — B6:** Share one `competition` helper between `enrichSpec` and detail note.  
6. **Medium — invariants:** Post-scrape CI checks: `|bsum−inCompetition|`, `totalApps >= inCompetition` (when both > 0), unique ids, passing recompute.  
7. **Low — S5:** Generate `tables.js` from JSON or assert sync in `tables.test.js`.  
8. **Low — S1/S4:** Detail note when open-band pin unknown; hide or badge empty form `16`.

---

## Proposed tests per confirmed bug

| Bug | Test location (suggested) | Assertion |
|-----|---------------------------|-----------|
| B1 | `tests/parser.test.js` + `tests/fixtures/formk1-2-bio.html` | plan/Всего/по конкурсу (or bsum) match golden |
| B2 | `tests/parser.test.js` | zero Всего stays 0 |
| B3 | `tests/parser.test.js` rowspan fixture | before-bucket column count stable across rows |
| B4 | `tests/compute.test.js` / `readiness.test.js` | no `neutral` after score when plan>0; simple oversubscribed ≠ neutral |
| B5 | `tests/compute.test.js` or scrape invariant | pressure not ≪ bsum/plan when bsum≫apps |
| B6 | extract note helper test | note ↔ status competition definition |

---

## Focus-area scorecard

| Focus | Verdict |
|-------|---------|
| 1. `compute.js` peopleAbove / calcPassing / status / underfilled / pin | Math OK; **B4** status hole; dual-signal intentional at cut |
| 2. Metrics consistency across specialties | Passing/buckets OK; **apps/competition inconsistent (B1)** on many rows |
| 3. `normalize.mjs` parse hazards | **B1–B3 confirmed** via live HTML |
| 4. Catalog sync | **Aligned now** (`false-positive-checked`) |
| 5. Dual signal status vs peopleAbove vs plan vs pin | **Consistent** under design; UI copy still multi-signal by intent |

---

## If zero compute bugs?

Not zero overall: **six confirmed** issues spanning parse → snapshot → UI metrics/status.  
**Zero confirmed defects** in the narrow sense of “uniform-band peopleAbove / pin / getStatus delta math disagreeing with themselves.” Strongest remaining risks: **parser column model**, **neutral-with-score**, and **pressure trusting apps**.

---

*End of R3 report. Application source untouched.*
