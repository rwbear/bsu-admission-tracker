# Quota / non-contest coverage — debate briefing

**Product goal:** A calmer, clearer version of BSU’s official monitoring tables — full coverage of what the table *means* for a general-contest applicant, without inventing precision or dumping a second spreadsheet on them.

**Brand / UX constraints (locked):** r.w.b. daylight paper · Outfit · ink accents · no traffic-light status as sole encoding · no admission-% gauge · dual-signal kept · progressive disclosure for methodology, never for primary numbers · one job per section · no card-heavy chrome.

---

## What the official table actually has (left of score bands)

On `formk1` budget tables (verified against golden HTML `tests/fixtures/formk1/slice-32-biology.html`):

| Column | Meaning | Takes plan seats before general contest? |
|--------|---------|------------------------------------------|
| План · всего | Control figures (КЦП) for the specialty | Denominator raw |
| В т.ч. на целевую | Seats reserved for target contracts | Yes (reserved) |
| на условиях оплаты | Paid-track plan (same page; separate pool) | Separate contest |
| Всего подано | Apps, **excluding** already-enrolled target | Display |
| целевая (зачислены) | Target already enrolled | Yes — seat gone |
| **без вступительных испытаний** | БВИ (п. 23) — **olympiads, funds, etc.** | Yes — first |
| **вне конкурса** | Benefits (п. 26) — orphans, etc. **≠ olympiads** | Yes — after БВИ |
| по конкурсу | General contest apps | Compete for **remaining** seats |
| score bands | Histogram of **по конкурсу only** | Estimate cut |

**Critical naming:** User said olympiads = «вне конкурса». Officially olympiad winners (I–III republican/international, subject matches profile) are usually **БВИ** («без вступительных»), not «вне конкурса». Both remove seats before the histogram. The UI must not merge the labels.

**Seat order (Правила приёма, Указ № 23):** БВИ → целевой → вне конкурса → общий конкурс.

**Open seats for general contest (working formula for debate):**

```
openPlan = max(0, plan − taken)
taken = enrolledTargeted + withoutExams + outOfCompetition
# If enrolledTargeted is empty but planTargeted > 0 during campaign,
# prefer: taken = max(enrolledTargeted, planTargeted) + withoutExams + outOfCompetition
# (target seats are reserved even before enrollment completes — product must pick one rule and document it.)
```

Buckets / `peopleAbove` stay as today (only general contest). What changes is the **seat cut** and honesty about who already claimed seats.

---

## Proven lie in current math (do not soft-pedal)

Fixture **биоинженерия** (form 32): `plan=32`, `без вступ=8`, `по конкурсу=31`, buckets ≈ 31.

| Lens | Current app | Correct openPlan=24 |
|------|-------------|---------------------|
| Seats left for contest | treats 32 | 24 |
| Oversubscribed? | `31 < 32` → underfilled / soft | `31 > 24` → competition is real |
| `estimatedPassing` | often null / “план ещё не сложился” | cut inside histogram |

So this is **not** only a missing-column nicety. Using full `plan` against a histogram that excludes БВИ/вне/целевые **mis-states pressure and status** on real BSU rows.

Biology fixture: `plan=55`, БВИ=17, целевые зачислены=2, contest=18 → `openPlan=36`. Still underfilled for contest, but the honesty story changes («17 уже БВИ» vs silent).

Full research: `docs/admission-rules-research.md`. Parser today drops those columns into `afterSpecNums` and only keeps plan / Всего / по конкурсу heuristics (`scripts/scrape/normalize.mjs`).

---

## Other real gaps (scope discipline)

Must acknowledge; do **not** try to “solve” all in one module:

1. Group contest + specialty priority in the application (АС зачисления) — histogram cannot see it.
2. Tie-breakers п. 27 ч. 2.
3. Document GPA × 10 inside total score (user enters total — copy must say so).
4. Creative/sports exam formulas.
5. Specs where olympiad БВИ is forbidden (МО, МП, Правоведение, …).
6. Monitoring ≠ enrollment lists.

For *this* decision: cover what the **monitoring table already prints** that we throw away — especially seat-taking columns — without claiming we reconstruct the admissions algorithm.

---

## Solution options (for look debate)

### O1 — Math-only silent fix
Parse quotas; `openPlan` drives `calcPassing` / chance-track cut / «мест»; UI unchanged except numbers move.
- Pro: smallest chrome; fixes the lie.
- Con: user sees «мест 24» with no why vs official «план 55/32»; trust fracture when they open source table.

### O2 — Disclosure-only (no math change)
Keep full plan; methodology + note explain БВИ/вне aren’t in histogram.
- Pro: zero compute risk.
- Con: **leaves the bioeng underfilled lie**; fails product honesty.

### O3 — Correct openPlan + quiet quota line (recommended spine)
Parse + store fields; use `openPlan` for place/passing/track; always-visible one quiet line when `taken > 0`: e.g. «Из плана N: БВИ a · вне конкурса b · целевые c → в общем конкурсе M мест». When `taken === 0`, stay silent. Methodology `<details>` deepens definitions.
- Pro: numbers match contest; explanation adjacent; progressive depth.
- Con: copy length; label precision (БВИ vs вне).

### O4 — Mini “состав плана” strip / stacked cut on chance track
Visual: track shows reserved block then contest seats; or a second hairline.
- Pro: glanceable.
- Con: easy to read as “people above you include olympians” (false); two cuts fight dual-signal calm; chart noise.

### O5 — Full column parity / second table
Show every left-of-band column like BSU.
- Pro: “complete coverage” slogan literal.
- Con: antithetical to stress-reduction; dashboard clutter; mobile death; duplicates source.

### O6 — Overview badges only
Chip «БВИ 8» on list rows when >0; detail unchanged beyond math.
- Pro: scan across faculties.
- Con: overview density; Principle 10 / clutter; chips without explanation scare.

**Debate focus:** best *look* and information hierarchy for O3 vs O4 vs hybrids — given O2 is honesty-fail and O5 is product-fail. Assume parser can deliver the fields; argue presentation + what stays primary.

---

## Non-negotiables for any winning proposal

1. No invented admission %.
2. Do not hide «Над тобой / мест», status, scrape warnings behind `<details>`.
3. Do not call olympians «вне конкурса» in UI copy.
4. Do not claim openPlan is the official приказ — still «оценка по таблице».
5. Source link stays.
6. Dual-signal contradiction sentence stays when place and status disagree.
7. Prefer label-mapped parse over more heuristics (R3 residual).
8. Goldens for forms 2 / 29 / 32 (column layouts differ — form 2/29 may lack «по конкурсу»).
