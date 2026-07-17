# Reviewer A — Honest Histogram (always visible)

The histogram («Интервалы баллов») returns to the always-visible stack. It must draw the shape of the competitive field honestly and refuse, structurally, to imply that БВИ / целевые / вне конкурса live inside its bars. Daylight paper, one ink weight, no traffic lights, no admission %.

---

## 1. What the histogram must say in ≤3 seconds

1. **Where the mass is** — how thick is «по конкурсу», where density peaks.
2. **Where the seat line falls inside that shape** — one quiet vertical at the same `openPlan` the slab drew above, now against real applicants.
3. **Where I stand** — my bucket in full ink, the rest at 38 %. No pin. The bar *is* the mark.

N, exact counts and axis edges are secondary.

---

## 2. Exact visual encodings

- **Bars.** Flex row, 1 px gaps, 7.5 rem (6.5 rem ≤ 420 px). Fill `color-mix(ink 38 %, transparent)`; `is-mine` = solid `--ink`. Minimum drawn height 8 % so a lonely bucket stays visible.
- **Cut line.** Rendered when `resolveHistCutIndex(buckets, openPlan) ≥ 0` and cut ≠ last bucket. 1 px vertical at `((cutIdx + 1) / n) × 100 %`, ink 34 %. Tooltip: `Граница мест в общем конкурсе: {openPlan}`. No axis label under it — the line is its own name (VISUAL §4). Right of it, the existing ≤ 3 % hatch reads as «за чертой».
- **Axis ticks.** Three max: leftmost band, «ты» on `mineIdx`, rightmost band. Existing overlap rule stays.
- **Panel caption.** `Интервалы баллов — по конкурсу · {N} чел.` where `N = Σ buckets`. If `mineIdx ≥ 0`, append ` · твой балл — в интервале {label(mineIdx)}`.
- **Cut-count microline (below axis, ink-faint, only when line drawn).** `слева от черты — {K}, справа — {N − K}`, where `K = Σ buckets[0..cutIdx]`. Tells the reader the cut is not a guess about seats but a count of real score-holders whose cumulative rank covers `openPlan`.
- **`openPlan` relation.** The line derives from `openPlan`, not `plan`, so its integer matches the right edge of the slab’s open segment. Same integer, two representations. No shared ruler, tick, or colour token.
- **БВИ relation.** None inside the bars. Denominator is `inCompetition`; БВИ / целевые / вне are structurally absent because subtracted upstream.

---

## 3. What stays OUT — and how those facts sit adjacent

Out of the bars: БВИ, целевые, вне конкурса, any «шанс» derivative. Those facts sit immediately above, not folded:

- The **slab** carries them as hatched segments against `plan` — the correct home for reserved seats.
- The **slab caption** (`План 32 − БВИ 8 − … = в общем 24`) names them in prose.
- The histogram’s own **«по конкурсу»** clause repeats the scope.

Slab → caption → track → histogram: by the bars, the eye has met БВИ in three registers. A fourth register *inside* the bars would be the register that lies.

---

## 4. Caption + aria copy (RU)

- **`.chart-caption`:** `Интервалы баллов — по конкурсу · {N} чел.`
- **Sub-caption microline (only when cut line drawn):** `слева от черты — {K}, справа — {N − K}`.
- **Cut-line tooltip:** `Граница мест в общем конкурсе: {openPlan}`.
- **aria-label on `.hist-chart`:** `Распределение баллов по конкурсу: {N} человек. Слева от черты — {K}, в пределах {openPlan} мест общего конкурса; справа — {N − K}, за чертой. БВИ, целевые и вне конкурса не входят в это распределение — они показаны в плите плана выше. Твой балл в интервале {label(mineIdx)}.`

Drop the last sentence when `mineIdx < 0`; drop the «слева / справа» clause when `cutIdx = −1` or cut is on the last bucket. «По конкурсу» matches the slab and the `.detail-note` clause — no new noun.

---

## 5. Placement in the always-visible stack

Order after change:

1. `detail-title`
2. `detail-status`
3. `planBlock` — плита плана
4. `chanceBlock` — дорожка конкурса
5. **`histBlock` — интервалы баллов** ← restored
6. `metric-grid` — «Над тобой / мест конкурса», «Расчётный балл»
7. `.detail-note`
8. `<details>` «Подробные данные» — only `factsBlock` + four secondary metrics
9. `<details>` «Как считается место»
10. `detail-link`

Slot 5 because histogram and track share `openPlan` and `inCompetition` — one story told twice, cut line on the same integer both times. Above the track puts density before place. Below the metrics separates it by a KPI stripe and re-opens the queue-misread the slab defused. Metrics shift down one slot; the fold loses only the histogram.

Hide rule: `!ranges.length`. On `quotaParseOk === false`, keep the histogram, drop the cut line and microline; aria falls back to `Распределение по интервалам баллов`.

---

## 6. Opening claim for the opponent

**«Гистограмма — карта того же населения, что и дорожка, только не спрессованная в один процент. Она рисует ровно то, что парсер вернул как `inCompetition`: БВИ, целевых и вне конкурса в её столбцах нет по построению — их нет в знаменателе. Черта — тот же `openPlan`, что и открытый сегмент плиты выше, но нарисованный против людей, а не против мест. Прятать её под клик — прятать половину честного слоя, где читатель видит, что «24 места» встречают не абстрактную очередь, а конкретную форму поля. Возражай не тому, что она видна, а тому, где стоит и какую подпись носит.»**
