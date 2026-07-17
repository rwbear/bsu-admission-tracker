# Verdict: Quota coverage module

Chief-judge call on the O3 / O4 clash. No hedge, no “both camps have a point” cop-out. Ship one thing.

---

## 1. What this actually is (plain language)

Four *entrances* to a BSU budget specialty. They fire in this order (Указ № 23, п. 23 → п. 24 → п. 29 → п. 26 → п. 27). Each one that fires **removes a seat from the plan before the general contest starts**:

1. **БВИ — «без вступительных испытаний» (п. 23).**
   Enrolled with **no exam scores at all**. Republic-level and international subject olympiad medalists (I–III степени, olympiad subject must match the specialty’s profile), Spec. Fund of the President laureates, National Children’s Technopark grads, some medal + рекомендация педсовета cases, and a short list of others. Goes **first**. Not applicable on a fixed spec list (МО, МП, Правоведение, Экономическое право, Гос. управление и право, Востоковедение).
2. **Целевые — целевой конкурс (п. 29, plan share reserved by п. 9).**
   A *separate first-order contest*, backed by a signed contract with a future employer. Up to 60/70/80 % of плана is reserved (`planTargeted`). Anyone who does not clear that separate contest falls back into the general contest.
3. **Вне конкурса (п. 26).**
   Statutory benefit categories: детдомовцы, дети погибших военных/МВД, отдельные чернобыльские категории, part of the военно-патриотические lists, and — narrowly — участники заключительного этапа республиканской олимпиады с похвальным отзывом на «наиболее востребованных экономикой» специальностях. Ranked among themselves by total score, capped in aggregate by п. 26¹ at ≤ 80 % плана (90 % Здравоохранение).
4. **По конкурсу (п. 27).**
   Everyone else. Ranked by total score = ЦЭ/ЦТ + внутренние + средний балл документа × 10. This is the only group the `formk1` histogram counts.

**Naming trap — correct it in copy and never again:**
Misha called olympiad winners «вне конкурса». Officially they are almost always **БВИ (п. 23)**, not «вне конкурса (п. 26)». The two labels are legally distinct. Both remove seats before the histogram, but conflating them in UI is a factual error and misrepresents the seat-order rules on the exact specialties (МО, Правоведение, …) where БВИ is forbidden but п. 26 still applies. Never write «олимпиадники = вне конкурса» in the UI. Cite the actual counter in the actual bucket.

Everything else — приоритет специальности in заявление, группа спец., АС зачисления, тайбрейкеры п. 27 ч. 2, средний балл × 10, творческие испытания, отзыв документов, доп. набор п. 35 — is out of scope for this module and stays in honesty copy.

---

## 2. What the site does wrong today

Two *different* failures. Do not treat them as one.

### 2a. Dropped columns (a parser problem)

`scripts/scrape/normalize.mjs` reads left-of-bucket cells via `afterSpecNums` — a positional fallback (`[0]` = plan, `[2]?? [1]` = totalApps, `last` = inCompetition, with a bucket-sum sanity check). The multi-row `formk1` header has «В т.ч. на целевую», «(зачислены) целевая», **«без вступительных испытаний»**, **«вне конкурса»**, «по конкурсу». On forms without a «по конкурсу» column (forms 2, 29) the last-index heuristic silently grabs the wrong cell (already documented in `.overnight/bugs/R3-compute-data-hunt.md`).

Net effect: `planTargeted`, `enrolledTargeted`, `admittedNoExam`, `admittedOutOfCompetition` are **not stored anywhere on the spec row**. The UI cannot show them because compute cannot see them.

### 2b. Wrong seat math (a compute + copy problem, load-bearing)

The bioeng counterexample from BRIEFING §“Proven lie in current math” is not a nicety, it is a status inversion:

Fixture **биоинженерия** (form 32): `plan = 32`, `безВИ = 8`, `по конкурсу = 31`, buckets ≈ 31.

| Lens                    | Current app                          | Correct with `openPlan = 24`         |
|-------------------------|--------------------------------------|--------------------------------------|
| Seats compared          | 32                                   | 24                                   |
| Oversubscribed?         | `31 < 32` → underfilled / soft-safe  | `31 > 24` → real contest, cut exists |
| `estimatedPassing`      | often null / «ещё не сложился»       | cut lands inside the histogram       |
| Status the applicant sees | «В зоне» by fallback rule in `enrichSpec` | honest «На грани / Ниже» depending on score |

`js/compute.js` currently passes raw `spec.plan` into `calcPassing`, `buildChanceTrack`, `contestRatio`, and the neutral→safe rescue in `enrichSpec` (line ~264). All of those inherit the lie. This is the primary bug. Fixing (2b) *requires* (2a); (2a) alone (parse but do not use) fixes nothing.

Biology (form 55): `plan=55`, БВИ=17, целевые зачислены=2, contest=18 → `openPlan = 36`. Still underfilled after the fix, so `estimatedPassing` remains null — but the honesty story changes from silent to «17 мест уже заняты по БВИ». Same class of correction, quieter consequence.

---

## 3. Decision (one clear winner)

**Ship Debate A (Quiet Honesty), essentially outright. Reject Debate B’s «Состав плана» hairline strip.**

Layer-by-layer adjudication (cited to the debate docs):

| Layer                          | Winner | Basis |
|--------------------------------|--------|-------|
| Math (openPlan everywhere)     | **A**  | B concedes verbatim: DEBATE-REBUTTALS §“Points of agreement (forced)”, bullets 1–2. |
| Copy (Russian sentence)        | **A**  | DEBATE-A §2 V1/V2/V3; B keeps A’s sentence verbatim as caption (DEBATE-B §2, §7). No competing text proposal on the table. |
| Visual composition             | **A**  | See below — B’s strip fails the exact misread it claims to prevent, under R2 Principles 5, 6, and R2 anti-pattern “Dual-axis chart merging status and place.” |
| Overview denominator           | Both   | Forced agreement (DEBATE-REBUTTALS, bullet 10): overview row prints `3/24`, not `3/32`, when `taken > 0`. No chip. |
| Second table / column parity   | Both reject | O5 out on R2 Principles 6, 8, 10. |
| Overview chips                 | Both reject | O6 out on R2 Principle 8; DEBATE-A §5, DEBATE-B §5. |

**Why B’s strip loses, decisively.**

B’s central claim in the opening (DEBATE-B §1) — “the rail draws to 32 while the sentence reads 24” — is a straw problem *once A’s own math change is accepted*. Under A (DEBATE-REBUTTALS §“A answers B”), «мест» resolves to `openPlan` **everywhere**: metric grid, chance-track label, `estimatedPassing`, histogram cut, sortKey. The rail already draws to 24. The label already reads «мест 24». There is no 32 on the rail to reconcile. The sentence is a receipt for where the 8 went, not a leash trying to hold a runaway chart. B’s Composition Lie exists only in a world where openPlan is refused visually — which no one is proposing.

Meanwhile the strip *creates* a new real problem: eight seat-widths of hatched segment above the rail, in the same reading column, connected by a “bridge tick” to the rail cut, will be scanned by a stressed 17-year-old as a queue — even with hatch/dot texture and a unit-label caption. Hatch vs. solid is a legend-only encoding; R2 Principle 5 rejects legend-only meaning; the R2 anti-pattern “Dual-axis chart merging status and place” exists for this exact case, and admissions-rules §133 warns explicitly that БВИ/целевые/вне are **not** in the histogram of «люди выше меня» — the strip is the fastest way to reintroduce that misread. B’s defenses (≥12 px gap, ≥28 px inline label threshold, ink-dim hatch, unit-label caption, `taken > 0` gating) are all mitigations against a misread the sentence-only version does not produce in the first place.

The one thing B earns that A doesn’t is *cross-specialty visual reserve density*. It doesn’t justify the strip, because the strip lives in the detail panel and you only see one at a time — cross-specialty triage isn’t enabled by putting a hairline in one detail view. A cross-row visual comparison would belong on overview, and both camps have already rejected overview chips.

Not a hybrid. Not a sequenced ship. A one-shot.

---

## 4. Spec to implement (when approved)

### 4a. Data fields to parse and store

Add to the normalized spec row (produced by `scripts/scrape/normalize.mjs`, consumed by `js/compute.js` and `data/sb-bsu.json`):

- `planTargeted` — «В т.ч. на целевую контрактную подготовку» (subheader of «План приёма»). Integer ≥ 0.
- `enrolledTargeted` — «на условиях целевой подготовки (зачислены)». Integer ≥ 0.
- `admittedNoExam` — «без вступительных испытаний» (БВИ, п. 23). Integer ≥ 0.
- `admittedOutOfCompetition` — «вне конкурса» (п. 26). Integer ≥ 0.
- `quotaParseOk` — boolean. `true` iff all four fields came from header-label mapping (not fallback / not synthesized). Drives copy variant selection (see 4d).

Parser must key on **exact `formk1` header labels** (per DEBATE-REBUTTALS forced-agreement §11, and admission-rules §7 ROI list). No new positional heuristics on top of `afterSpecNums`. Label the columns, then read them. If a label is missing on a given form (form 2 / 29 have no «по конкурсу»), the parser sets `quotaParseOk = false` and leaves numeric fields at `null`, **not zero**.

### 4b. `openPlan` / `taken` formula

Adopt the campaign-safer rule (DEBATE-REBUTTALS forced-agreement §7):

```
taken = max(enrolledTargeted, planTargeted)
      + admittedNoExam
      + admittedOutOfCompetition
openPlan = max(0, plan − taken)
```

Rationale (BRIEFING §“Open seats … working formula”): before the target-track enrollment stage completes, `planTargeted` reserves the seats; after it completes, `enrolledTargeted` is the truth. `max()` never double-counts and never under-counts during campaign. If either field is `null` (missing from parse), treat it as `0` **only when** `quotaParseOk === true` for the other three; otherwise skip the openPlan computation entirely and fall back (see 4h).

Document the formula verbatim inside the methodology `<details>`, with п.-numbers cited (п. 23 → п. 24 → п. 29 → п. 26 → п. 27).

### 4c. Which compute functions switch to `openPlan`

In `js/compute.js`:

- `calcPassing(ranges, buckets, plan)` — called with `openPlan`.
- `buildChanceTrack(spec, score)` — the `plan` slot on the returned object and the `seatCutRatio` denominator use `openPlan`. Do **not** change `myMarkerRatio` semantics — it is still `peopleAbove / denom` on the histogram cohort.
- `enrichSpec(spec, score)` — set `row.plan = openPlan` for downstream consumers; keep `row.planOfficial = plan` for the copy in 4d (needed for «Из плана 32:…»). All threshold/rescue branches (the neutral→safe under-filled bailout, sortKey, `pressure = contestRatio(competition, openPlan)`) use `openPlan`.
- `peopleAbove` / `peopleAtOrAbove` — **unchanged**. They count histogram people; the histogram cohort is «по конкурсу» only; BSU/п. 26/п. 23 people are not in there. This is the exact confusion the strip would reintroduce (see §3).

In `js/ui/radar.js`:

- «Над тобой / мест» renders `peopleAbove / openPlan`.
- «Расчётный балл» comes from `calcPassing(..., openPlan)`.
- «Конкурс» uses `contestRatio(competition, openPlan)`.
- Overview row `ov-ratio` prints `peopleAbove / openPlan` when `taken > 0`, else `peopleAbove / plan` (they are equal in that case — no branching needed at render, just do the math with `openPlan` always).

Never render `planOfficial` as «мест». It surfaces exactly once, inside the quota sentence «Из плана 32:…».

### 4d. UI placement + Russian copy

**Placement:** append to the existing `detail-note` sentence in `buildDetailInner` (`js/ui/radar.js` around lines 192–206), as a second sentence separated by `« · »`, **before** the existing contradiction sentence. Not a new node. Not a card. Not `<details>`. Not adjacent to the rail. The `.detail-note` slot is where honesty already lives (source link, «расчётный балл — оценка по таблице», dual-signal contradiction).

**Copy primary (V1) — when `quotaParseOk === true`:**

> «Из плана 32: без вступительных 8 · целевые 0 · вне конкурса 0 → в общем конкурсе 24 места.»

Interpolate all four numbers even when zero. Zeroes are load-bearing: they prove the tracker parsed the row and found nothing hidden, which is exactly the failure mode of pure O1 that both camps reject (DEBATE-REBUTTALS forced-agreement §12).

**Copy fallback (V2) — auto-compact when any bucket is 0 AND viewport ≤ 360 px:**

> «8 мест уже заняты по БВИ — в общем конкурсе 24 из 32.»

Compose the leading fragment from whichever bucket(s) are non-zero, joined by « · » if more than one non-zero remains: «БВИ 8 · целевые 2», «целевые 5», «БВИ 8 · вне конкурса 3». Never invent a bucket that is zero into the compact form.

**Copy fallback (V3) — when `quotaParseOk === false` and we still know that `totalApps > inCompetition` (i.e. reserved seats exist but we cannot break them down):**

> «Часть мест уже занята льготниками (БВИ, целевые, вне конкурса) — в общем конкурсе 24 места из 32.»

Never invent a specific count we did not parse. Never merge БВИ and «вне конкурса» in copy (DEBATE-A §2 discipline; BRIEFING non-negotiable §3).

**Choice for shipping:** V1 primary. V2 activates only on narrow viewports with zero buckets. V3 activates only on parse failure. Do not A/B — the compact form is a mobile fallback, not a preference.

### 4e. Show / hide rules

- **Show** whenever `taken > 0` (numerically). Always visible, never inside `<details>`.
- **Hide** whenever `taken === 0`. Silence trains the eye to notice the sentence when it appears (DEBATE-A §4; DEBATE-B §7).
- **Retention:** when the current row is in `scrapeMeta.retainedFormIds`, keep the sentence, prefix with the existing retention voice (do not add a second banner). Same voice, scoped scope.
- **Parse failure** with reserved seats detectable heuristically: V3 sentence, no numeric decomposition.
- **Parse failure** with no reserved seats detectable: fall through to today’s note verbatim. Do not fabricate.
- **Methodology `<details>`** — always available, closed by default, holds definitions (БВИ п. 23 vs «вне конкурса» п. 26 vs целевые п. 29 vs общий п. 27) and the `taken`/`openPlan` formula. Never the sentence itself.

### 4f. What stays out of v1

Explicit exclusions, so the module ships:

- Group contest / приоритет специальности in заявление (АС зачисления).
- Tie-breakers п. 27 ч. 2.
- Средний балл документа × 10 in total-score copy.
- Творческое / спортивное испытание formulas.
- Спецы, где БВИ по олимпиадам запрещён (МО, МП, Правоведение, Экономическое право, Гос. управление и право, Востоковедение) — badge/tag work.
- Дополнительный набор п. 35 timing.
- Отзыв документов dynamics.
- Медсправка / согласие на АС filters.
- Bucket-level cross-specialty visual triage (any strip / chip / secondary chart).
- Multi-uni. Multi-track (бюджет vs платное already partly separated; do not touch here).

### 4g. Tests / goldens required

- Golden HTML fixtures for **form 2, form 29, form 32** (BRIEFING non-negotiable §8). Form 32 must include биоинженерия. All three must exercise:
  - Parser produces `planTargeted`, `enrolledTargeted`, `admittedNoExam`, `admittedOutOfCompetition`, `quotaParseOk` correctly by header label, not position.
  - Form 2 / 29 with no «по конкурсу» column set `quotaParseOk = false` and do not silently mis-map `inCompetition`.
- Unit tests on `calcPassing` and `enrichSpec`:
  - биоинженерия (form 32): `openPlan === 24`; `estimatedPassing !== null`; a mid-band score no longer receives the neutral→safe rescue; status flips as expected.
  - биология (form 55): `openPlan === 36`; still underfilled at contest=18; `estimatedPassing` remains `null`; sentence still renders because `taken > 0`.
  - `taken === 0` fixture: sentence hidden; overview ratio uses same denominator as before.
- Copy tests: V1 renders zero-buckets verbatim; V2 activates only under the compact conditions; V3 activates only on `quotaParseOk === false`.
- Regression: `peopleAbove` output on identical `(ranges, buckets, score)` triples is unchanged. The strip debate exists partly because this must not silently drift.

### 4h. Failure modes

- **Parser cannot map header labels on a given form** → `quotaParseOk = false`. Use raw `plan` as denominator (today’s behavior) and render V3 sentence only if we can heuristically detect reserved seats (`totalApps` — `inCompetition` — `enrolledTargeted?` disagreement). If nothing is detectable, render today’s note verbatim. Log a scrape warning; surface via existing warning channel, not via a new UI element.
- **Only one of the four fields is present** → do not compute `openPlan` (avoid partial subtraction). Fall to V3 or today’s note per above.
- **`taken > plan`** (should not happen, but п. 26¹ interactions are finicky) → clamp `openPlan` at 0, and in the sentence write «→ в общем конкурсе 0 мест». Status forces to «Ниже» regardless of score. This is an honesty-first outcome, not an error state.
- **Retained snapshot** → keep sentence, prefix retention voice; do not upgrade or hide.

---

## 5. Look direction (final)

The shipped visual language:

- Metric grid unchanged in shape (four cells, primary/secondary weight already landed in R2). «Над тобой / мест» primary; **«мест» = `openPlan`** everywhere it appears.
- Chance track cuts at `openPlan`. Rail label reads «мест 24» when `openPlan = 24`. No reserved segment. No second hairline strip. No bridge tick.
- Histogram unchanged. Cut line derives from `openPlan`. No hatched pre-region for reserved seats — those people are not in the histogram (admission-rules §133).
- Detail note carries one Russian sentence when `taken > 0`, V1 primary, V2/V3 as narrow-viewport / parse-fail fallbacks. Always adjacent to «Обновлено …» and the source link. Never in `<details>`.
- Methodology `<details>` after the note: definitions and п.-numbers only. Never primary numbers.
- Overview row grammar unchanged: mark · name · ratio · delta. Ratio uses `openPlan`. No chip. No fifth column. No “БВИ 8” badge.
- Source link «Открыть источник →» stays at the bottom of the detail panel.
- Dual-signal contradiction sentence stays exactly as R1 fixed it (`radar.js` lines 196–206), rendered after the quota sentence when both trigger.

Accept / reject on the debate table:

- **Stacked chance-track reserved region** — **rejected.** DEBATE-A §5 case is stronger than DEBATE-B §3 on this codebase’s stress-first brand.
- **Overview chips** — **rejected.** DEBATE-A §5, DEBATE-B §5.
- **Full column table / second table** — **rejected.** R2 Principles 6, 8, 10.
- **Methodology `<details>`** — **accepted.** R2 Principle 12; both camps agree.
- **Quota sentence** — **accepted, V1 primary.** DEBATE-A §2; verbatim reused by DEBATE-B §2.

---

## 6. Blind spots still open

The winning design does not solve these. They must stay in honesty copy (either in the methodology `<details>`, in existing warning surfaces, or as future scope):

- **Групповой конкурс + приоритет специальности** (п. 30 ч. 13; admission-rules §1). Ranking inside a group blends score and application-order priority. The histogram cannot see priority. Where BSU marks a group конкурс, the specialty page is still ranking-informative but not seat-precise.
- **Автоматизированное зачисление** on mat/phys profiles (admission-rules §4). The AS distributes across the group by priority + total score; per-specialty histograms are a proxy.
- **Тайбрейкеры п. 27 ч. 2.** At equal total score, order flips on первый профильный, средний балл, льготные категории. Score-band trackers create false precision here.
- **Средний балл документа × 10** inside total score (п. 30). The applicant enters *total*; copy must remind them.
- **Творческие / спортивные испытания** — «формула нестандартная».
- **Спецы без БВИ по олимпиадам** (МО, МП, Правоведение, Экономическое право, Гос. управление и право, Востоковедение). On these, `admittedNoExam` should almost always be 0 — but the exclusion itself is a fact the applicant should know when choosing.
- **п. 26¹ aggregate cap** (≤ 80 % плана, 90 % Здравоохранение). Our formula does not enforce it because we sum observed counts, not policy caps.
- **Отзыв документов** — snapshots drift; refresh honesty already handled by `refresh-schedule.js` but the module doesn’t model it.
- **Дополнительный набор п. 35.** After основной этап, vacancies open; the module doesn’t forecast this.
- **Мониторинг ≠ списки зачисленных.** The whole tracker is a mirror of `formk1`, not of `spiski-postupivshih`.
- **Не прошедшие целевой конкурс fall back to общий (п. 29).** During campaign, `по конкурсу` can grow; `openPlan` can shrink further. The formula handles the arithmetic, but the applicant should be told this explicitly in `<details>` so a rising «Над тобой» count is not read as a bug.

---

## 7. Recommendation to Misha

**Ship — one shot, no phase split.** Debate A wins. Parse the four columns by header label, switch `calcPassing` / `buildChanceTrack` / `enrichSpec` / overview denominator to `openPlan`, render the V1 Russian sentence in `.detail-note` when `taken > 0` (with V2/V3 auto-fallbacks for narrow viewports and parse failure), add the methodology `<details>`, gate on goldens for forms 2 / 29 / 32. Do not add the «Состав плана» hairline — it fixes a lie that only exists if you refuse to fix the math, and it reintroduces the exact «olympiads are people above me» misread admission-rules §133 warns against. The bioeng row proves this is a correctness bug that flips status, not a polish item. The receipt is the sentence; the strip is chart chrome dressed as honesty. Skip the strip; ship the receipt.
