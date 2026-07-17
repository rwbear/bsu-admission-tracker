# R6 Judge — Overnight SHIP (formk1 apps + blank-status / dual-signal UI)

**Round:** 6 · Ship  
**Commit:** `d8f7103` — `fix: honest formk1 apps parse + blank-status / dual-signal UI`  
**Judge UTC:** 2026-07-15T23:58Z  
**Spot-check base:** `git show d8f7103` + live `normalize.mjs` / `compute.js` / `radar.js` + fixture re-parse + `data/sb-bsu.json` (`updatedAt` **2026-07-15T23:37:59.266Z**) + `npm test`

---

## Independent verification

| Claim | Check | Result |
|-------|--------|--------|
| **`extractTables` real rowspan** | Synthetic rowspan fixture + bio form2 cells | **Pass.** Spec name / group nums occupy subsequent rows (`35`/`36` present on биология row). |
| **`resolvePlanApps` + no falsy steal** | Unit `[10,5,0,0],0` → zeros; goldens | **Pass.** `inCompetition` no longer `\|\| totalApps`. |
| **Goldens 2 / 29 / 32** | Re-parse slices | **Pass numbers.** form2 биология `9/11/10`; form32 биология `55/37/18`; form29 правоведение (м) `10/19/14`. |
| **`enrichSpec` never blank neutral when score + seats full** | readiness + live psy13@350 | **Pass.** psy13 → `risk` / `На грани`. |
| **Pressure = max(apps,bsum)** | readiness + live bio2@300 | **Pass.** Poisoned `ic=1` still yields `competition=10`, `pressure≈1.11`. |
| **Note uses competition; dual-signal sentence; aria-label; «Расчётный балл»; metric tones** | `radar.js` + `components.css` + cache-bust `aj` | **Pass (code).** |
| **Catalog sync test** | `tables.test.js` vs `sources/bsu-tables.json` | **Pass.** |
| **`npm test` 67 / 0** | Judge re-ran | **Pass.** `# tests 67` `# fail 0`. |
| **Production snapshot honest after ship** | Cold facts on `sb-bsu.json` | **FAIL.** Still poisoned (see below). No re-scrape in `d8f7103`; last data commit `baa2043` @ 23:40 **before** parser fix @ 23:57. |

### Snapshot still poisoned (harsh cold facts)

| Row | Snapshot | Golden / expected |
|-----|----------|-------------------|
| form `2` биология | `ta=5`, `ic=1`, `bsum=10` | `ta=11`, `ic=10` |
| form `32` биология | `ta=10`, `ic=18`, `bsum=18` | `ta=37`, `ic=18` |
| form `29` правоведение (м) | `ta=0`, `ic=5`, `bsum=14` | `ta=19`, `ic=14` |

Aggregates on published tip: **`totalApps < inCompetition` = 33**; **`ic` far below `bsum` = 4**; **`ta===0 && ic>0` still present**. UI `max(apps,bsum)` masks «Конкурс» / underfilled note for many rows, but **stored apps fields remain lies** until the next scrape with this parser.

### Spot-check: goldens vs `resolvePlanApps`

Logic is **bucket-aware positional inference**, not true header-label mapping (R3 Keep asked for labels). Spot-checks:

- form2 биология afterSpec ≈ `[9,0,5,11,…1…]`, `bsum=10` → `totalApps=max(≥10)=11`, last≠band → `ic=bsum=10`. Matches golden.
- form32 биология afterSpec ≈ `[55,2,10,37,2,17,18]`, `bsum=18` → `totalApps=37` (plan excluded from `rest` — correctly avoids promoting 55), `ic=18`. Matches golden.
- form32 биоинженерия (untested by golden asserts): `ta=39`, `ic=31`, `bsum=29` — **official «по конкурсу» wins via last-within-tol**; good behavior, **not locked by a test**.
- Zero-apps path: last of rest when `bsum===0` — does not steal целевое. Matches unit.

Heuristic residual: `totalApps = max(rest ≥ bucketSum)` can still pick the wrong middle column on weird layouts; goldens cover the three hung R3 cases, not the full catalog.

---

## Scores (1–5)

| Axis | Score | Notes |
|------|------:|-------|
| **Depth** | **4** | Lands the real R3 root stack (B1–B3 parse + B2 nullish + B4 status + B5/B6 shared competition) and R2 P0 hierarchy/copy hooks. Not 5: still heuristic nums, not label map; chance-track still fed raw poisoned `apps` (`buildChanceTrack({ inCompetition: apps })`) while pressure uses `competition`. |
| **Rigor** | **3** | 67/0 verified; three faculty slices are real-ish HTML and assert the hung numbers. Weak: **`id-2.html` / `id-29.html` committed but never exercised**; B4 mismatched case only `notEqual('neutral')` (doesn’t pin `risk`/`below`); **no published-snapshot invariants** (`ta≥ic`, bsum band) that meta mid demanded; form32 «по конкурсу≠bsum» path unasserted. |
| **Product fit** | **4** | Fixes the applicant-facing lies overnight cared about: blank mark, wrong конкурс pressure, underfilled note vs full histogram, dual-signal sentence, «Расчётный балл», overview aria. Contradiction copy is soft but on-brief. Deduct for shipping UI hedges while Pages JSON still teaches the old lie. |
| **Ship readiness** | **2** | Code ship is real and green — **data ship is not**. Meta mid: *“one regen after parser lands, then stop.”* Regen **did not happen**; commit message / tree has **no re-scrape note**. Calling this a finished overnight SHIP while tip snapshot still shows bio2 `ic=1` is premature. Next cron may heal it; morning must not assume it already did. |

---

## Keep

- `extractTables` rowspan/colspan grid + `resolvePlanApps` (incl. zero-apps / no `\|\|` steal).
- Faculty golden slices for forms **2 / 29 / 32** and the three R3 hang-case asserts.
- `enrichSpec` B4 full-seats policy + `competition` / `pressure` from `max(apps,bsum)`.
- Detail note competition predicate; dual-signal contradiction sentence; metric primary/secondary + «Расчётный балл»; overview `aria-label`.
- Catalog id sync test; cache-bust `20260715aj`.

## Kill

- **Celebrating SHIP while `data/sb-bsu.json` is still pre-fix poison** — treat as unfinished truth path, not a polish footnote.
- Treating **heuristic `resolvePlanApps` as “label-mapped headers”** — it isn’t; don’t close R3 B1 as fully solved in the morning packet.
- **Unused `id-2.html` / `id-29.html`** as evidence of rigor — dead weight until a test parses them.
- Inflating UI mask (`max(apps,bsum)`) into “data is honest now.”
- Re-opening pin / peopleAbove theory — not in this diff; stay killed.

## Fix before morning

1. **Re-scrape and publish** with the new parser; verify cold facts: form2 биология `11/10`, form32 биология `37/18`, form29 правоведение (м) `19/14`; `ta < ic` → ~0.
2. **Wire snapshot invariants into `npm test`** (meta mid item that this ship skipped): `totalApps >= inCompetition` when both set; `|bsum−inCompetition|` band when bands exist.
3. **Either test or delete** `id-2.html` / `id-29.html`; add one golden assert for form32 row where `ic ≠ bsum` (биоинженерия `31` vs `29`).
4. **Align chance-track input** with `competition` (or document why track keeps raw `apps`) so dual definitions don’t quietly diverge after scrape lag.
5. Morning packet: **one line** — “parser shipped `d8f7103`; snapshot healed at \<sha\> / still pending.”

## Verdict

**revise**

Parser + UI code earn a keep: fixtures aren’t theater, 67/0 is real, R3 B2/B4 and the pressure/note mask are landed. It is **not** a sealed overnight SHIP: **production snapshot remains poisoned with no re-scrape note**, full-page fixtures are untested ballast, and CI never guards the lying aggregates. Re-scrape + invariants before morning, or the ship claim stays oversold.
