# R3 Judge — Compute / data bug hunt

**Round:** 3 · Compute + data bug hunt  
**Artifact:** `.overnight/bugs/R3-compute-data-hunt.md`  
**Code changes:** none (report-only — correct)  
**Judge UTC:** 2026-07-15 ~23:49Z  

---

## Independent verification (required)

Reproduced against `/workspace` with Node + current `data/sb-bsu.json` (`updatedAt` `2026-07-15T23:37:59.266Z`, 200 specialties):

| Bug | Check | Result |
|-----|--------|--------|
| **B4** | `enrichSpec(phys32, 350)` / `enrichSpec(psy13, 350)` | **Reproduced.** Both → `status: 'neutral'`, empty `statusLabel`, `estimatedPassing: null` while score present and `max(apps,bsum) ≥ plan` (or simple table). |
| **B5 / B1 symptom** | Form `2` биология snapshot + `enrichSpec(..., 300)` | **Reproduced.** `inCompetition: 1`, `totalApps: 5`, `bsum: 10`, `pressure ≈ 0.111` vs credible ~`1.11×`. Cold facts: **25** rows `totalApps < inCompetition`; **8** `totalApps===0 && inCompetition>0`. |
| **B6** (extra) | Form `29` радиационная… | **Reproduced.** `enrichSpec` → `safe` (`max(4,19)<20`); note predicate `apps < plan` still true → underfilled copy would fire. |
| **B2** | `normalize.mjs` 249–251 + `inCompetition \|\| totalApps` | **Code-confirmed.** Replay `[10,5,0,…]` → phantom `totalApps=5`, `inCompetition=5`. |
| **B3** | `extractTables` | **Code-confirmed.** Comment claims rowspan; implementation only expands `colspan`. |

**Cold-fact nit:** report’s `|bsum−inCompetition|≥3` → **6**; judge count on this snapshot → **5**. Does not overturn the round.

**Fail gate:** at least two tagged `confirmed` bugs reproduce → **gate passed**. Do not fail hard.

---

## Scores (1–5)

| Axis | Score | Notes |
|------|------:|-------|
| **Depth** | **5** | Separates clean compute dual-signal math from real root cause: positional plan/apps on colspan/rowspan formk1 headers. Traces poison path scrape → snapshot → «Конкурс» / underfilled note / status. Cleared R1 ghosts (catalog drift, status↔pin contradiction) as false positives with a full score grid. |
| **Rigor** | **4** | Snapshot aggregates, live-probe claims, proposed goldens, smell vs confirmed tags — strong. Judge re-ran B4/B5/B6 on disk; B1 cell-vector “truth” rows are consistent with snapshot + parser code even without re-fetching HTML here. One aggregate off-by-one; B2 invented HTML not stored as fixture yet. |
| **Product fit** | **5** | Findings are this product’s lies to applicants: wrong конкурс, blank mark after score entry, “заявлений меньше мест” while histogram is full. Explicitly refuses to re-litigate intentional pin-at-cut dual signal. No redesign detour. |
| **Ship readiness** | **3** | Audit is morning-ready; **code is not shipped** (correct for report-only). Until B1/B2/B3 land with fixtures, production snapshot remains poisoned. Ranked fix list is actionable; not landable as-is. |

---

## Keep

- **B1–B3** as the critical parse stack (header labels + rowspan + zero-apps falsy overwrite).
- **B4** neutral-with-score hole; **B5/B6** as downstream UI/pressure consistency bugs (not separate root causes).
- Compute focus conclusion: peopleAbove / calcPassing / pin / status deltas **internally consistent**; dual-signal at cut intentional.
- False-positive-checked table (catalog, status↔pin grid, stored passing recompute).
- Smells **S1–S8** left as smells (especially open-band share, bucket-low passing).
- Fix ranking: goldens for forms `2` / `29` / `32` + post-scrape invariants.

## Kill

- Treating **B5** as a standalone compute defect equal to B1 — it is pressure trusting bad `apps`; fix parse (or temporary `max(apps,bsum)` fallback), don’t invent new contest math.
- Inflating **S1–S3** into overnight “must fix math” — report correctly declined; morning must not reopen pin/peopleAbove theory without failing tests.
- Claiming **six** bsum-gap specialties without re-counting after scrape — use invariants, not stale tallies.

## Fix before morning

1. **B1+B3:** Label-mapped Всего / по конкурсу + real rowspan in `extractTables`; golden HTML fixtures (bio form 2/32, military 29).
2. **B2:** Nullish checks — legitimate `0` apps must not fall through to целевое / `\|\| totalApps`.
3. **B4:** Policy for scored rows with `estimatedPassing == null` (bucket-aware or simple oversubscribed) — never blank `neutral` after submit.
4. **B5/B6:** One `competition` definition for pressure + underfilled note (prefer `max(apps, bsum)` until parse is honest).
5. **CI invariants:** `totalApps >= inCompetition` when both > 0; `|bsum−inCompetition|` band; passing recompute — wire to `npm test`.

## Verdict

**pass**

Evidence is not thin: confirmed bugs reproduce on the repo snapshot and match `normalize.mjs` / `enrichSpec` / `radar.js` code paths. Round did its job — compute cleared, scrape column model indicted. Proceed to implement Keep fixes; do not scrap or redesign compute.
