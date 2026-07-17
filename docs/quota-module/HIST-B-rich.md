# HIST-B — Rich Interval Chart (Reviewer B)

Misha wants the histogram always visible and maximally informative of the whole distribution, not a decorative echo of the rail. Reviewer A argues restraint; I argue density that respects the same forbids — no БВИ inside bars, no green/red, no percentages, no fake precision. Density is where honesty pays for itself.

## 1. Information hierarchy on the chart surface

The histogram is a *distribution* object; everything on its surface must serve that reading. Descending weight:

1. **Bars** — full-ink columns, uniform stride, one hue. The shape of the mass is the primary sentence.
2. **Seat-cut line** — one hairline at `outLeft%`, ink-60, already drawn. Never hatch across the right half — that belongs to the slab.
3. **Cut annotation** — a small tag on the line: `мест 32`. Same word the rail uses. Never `«из плана 40»`.
4. **«ты» tick** on the axis (already present) and, when the applicant sits inside the mass, a **count-in-my-bar micro-label** above the mine column: `12 в моём интервале`. A count, not a percentage.
5. **Edge tick labels** — leftmost and rightmost range bounds, humanised (`98`, `310`, never `98.0`).
6. **Value caps on tall bars only** — the top three by height carry a small numeric cap. Not all 57 (noise), not on the mine bar (it has its own label). Cap drops when its bar falls below ~40 % of chart body after resize.
7. **Mine-band tooltip** — existing `title`; on the mine column it expands to `«98–101: 12 · твой интервал»`.

No legend, no y-axis, no gridlines, no colour ramp. Rank enforced by ink weight and by what can coexist in a ~6 px column.

## 2. Concrete RU microcopy on/near the chart

- Above-chart caption (new, one line, ink-70): `Все, кто подал: 1 240 заявлений в 57 интервалах баллов.` `1 240` = `sum(buckets)`; `57` = `ranges.length`. No rounding, no «~1.2k».
- Cut-line tag: `мест 32` (identical lexicon to the rail).
- Cut-line `title`: `Мест в общем конкурсе: 32. Правее — интервалы, где мест уже не хватит.`
- Mine-column micro-label: `12 в моём интервале`.
- Mine-column expanded `title`: `98–101: 12 абитуриентов · твой интервал`.
- Tall-bar caps: bare integer (`47`). No unit, no «чел.».
- Empty buckets: 1 px baseline stub; `title` reads `98–101: пусто`. Silence is data.

## 3. How it cooperates with the plan slab (two stories, not one)

Slab and histogram tell **different** stories and must never merge widths, ticks, or hues. Per VERDICT §2, hatch, `−` grammar, and `= в общем N` belong to the slab; the histogram is downstream of that answer, not a restatement.

The **only** shared token is `мест` and the integer after it. Slab caption ends `= в общем 32`; chart cut-tag reads `мест 32`. Same digit, same word, no arithmetic on the chart. An eye moving slab → chart lands on that number twice and confirms «this 32 is what the cut-line means». The chart never draws `«План 40 − БВИ 8»` — it has no business subtracting.

The chart’s above-caption talks about **people who applied**; the slab talks about **seats before the contest**. The slab answers «за сколько мест я борюсь»; the chart answers «сколько людей я обгоняю и где моя полка». Two objects, one number as bridge.

## 4. Mobile / dense 57-bar reality

57 bars at 360 px ≈ 6 px per column — enough for silhouette and cut line, not for per-bar text. Rules:

- Tall-bar caps: **three** on desktop, **one** at ≤ 480 px, **zero** below 320 px.
- Cut-line tag: at ≤ 360 px drops below the axis on its own row so it never collides with an edge tick. If the cut sits within 8 % of an edge, it snaps and the edge tick yields (same nudge pattern the chance-axis uses).
- Mine micro-label: at ≤ 360 px collapses into `title`; the column keeps `is-mine` weight so the eye still finds it.
- Empty-bucket 1 px stubs preserved at all widths — the only cue that these really are 57 bins, not a curve.
- Axis edge ticks capped at two on narrow screens; `«ты»` keeps priority per the existing dedup rule.

## 5. Risks of richness

- **Cap creep.** «Just one more label» ends at all 57. Hard cap of three enforced in code, not in taste.
- **Cut-tag collision.** If `outLeft` sits near an axis edge, the tag overlaps. Solved only if the nudge rule is written, not assumed.
- **Percentage temptation.** Someone will want `«12 (1 %)»`. 1 % of what — plan, applicants, cut? Raw counts pick no denominator the reader didn’t ask for.
- **Colour temptation.** The right-of-cut region stays a whisper hatch. Ink-only, opacity-only — never red.
- **Fake precision.** No trailing `.0`, no decimals in tick labels. `shortRangeLabel` already crops — keep it.
- **Duplication with slab.** If the chart ever renders `«план 40»`, the two objects fuse. Cut-tag says `мест 32`, never `«32 из 40»`.
- **Motion theatre.** Caps and tag appear at once after the last bar settles — no extra choreography over the existing per-bar stagger.

## 6. Opening claim for opponent

Reviewer A will argue that a rich histogram cannot survive at 6 px per bar without lying — that caps, tags, and micro-labels are ornament pretending to be data, and that the silhouette plus a single cut line is the honest ceiling. Opening claim: the silhouette is necessary but *insufficient*. The panicked scanner at 22:30 needs to answer «сколько таких, как я» and «где именно проходной» without moving their eye off the chart. Three tall caps, one cut-tag with the exact word «мест», and one count-in-my-bar micro-label answer both questions in ink already on the surface. Nothing here breaks a forbid; everything earns its pixel. If A can show any one of these four additions worsens the ink-to-meaning ratio, I concede that element — not the principle.
