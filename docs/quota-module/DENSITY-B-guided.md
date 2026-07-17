# Density B — guided reveal (Reviewer B)

A wants everything under «подробные данные» except title, status, one metric and the sentence. Clean — but the panel’s job is **rapid re-orientation**, not reading. Keep more visible than A. Not everything. Enough.

## 1. Always-visible visual hierarchy

Reading down, daylight paper, one column, no cards, no borders:

1. **Title** — `detail-title`, specialty name.
2. **Status line** — `detail-status`, «Ниже · ФКСиС», ink-70, one row.
3. **Plan slab** (`plan-slab-block`) exactly as VISUAL-VERDICT §2/§4: 20 px block drawing `plan`, hatched `taken`, full-ink `openPlan`; caption `План 32 − БВИ 8 − целевые 0 − вне 0 = в общем 24`. Rendered when `taken > 0 && quotaParseOk === true`. Hidden when `taken === 0` — silence stays a feature.
4. **Chance rail** — `renderChanceTrack`, unchanged. Rail width does not align with slab width, 24 px of daylight between them.
5. **Two-metric strip** — a calm two-cell row: **«Над тобой / мест конкурса»** and **«Расчётный балл»**. `План → общий`, `По конкурсу`, `Дельта`, `Конкурс` go behind the disclosure.
6. **Sentence** — `.detail-note`, current V1/V3 copy.
7. **«Подробные данные»** `<details>`.
8. **«Как считается место»** `<details>`.
9. **Source link.**

The slab is the one piece of *shape* the always-visible layer holds. Metrics stay calm at two cells, not six. The 9-cell «Как в таблице БГУ» is gone from the fold.

## 2. What the disclosure contains

Inside «Подробные данные», in this order:

- The full 9-cell **«Как в таблице БГУ»** (`table-facts-block`) — план, целевая, БВИ, вне конкурса, по конкурсу, план общего, план целевой, зачислено целевых, обновлено.
- The four secondary metrics — **План → общий**, **По конкурсу**, **Дельта**, **Конкурс** — as a `metric-grid` of four.
- The **интервалы баллов** histogram.

Closed by default. Opening appends below the sentence; slab and rail do not re-flow. Method stays a separate `<details>` — merging rehides methodology behind data.

## 3. RU labels

- Disclosure summary: **«Подробные данные»**.
- Always-visible metric labels unchanged: **«Над тобой / мест конкурса»**, **«Расчётный балл»**.
- Slab caption per VISUAL-VERDICT: **«План 32 − БВИ 8 − целевые 0 − вне 0 = в общем 24»**.
- Rail caption: **«мест 24»**.
- Method summary: **«Как считается место»**.

## 4. Why lean-text-only under-delivers for scanners

A scanner does three things in the first 400 ms: (a) find where they stand, (b) find how many seats are actually contested, (c) confirm the specialty. Prose answers (a) and (c). It does not answer (b) as *shape*. Without the slab, the eye must parse a sentence to learn that 8 of 32 seats already left — and VISUAL-VERDICT §3 is explicit that prose alone is no longer enough. «Плита плана» exists to stop encoding the ratio typographically; hiding it behind a click re-creates the failure round two rejected: proportion encoded in glyphs. That is the silence bug in another costume — reserved seats present in the data, invisible in the composition, until the user knows to ask.

Two metric cells instead of six concedes A’s calm; keeping the slab refuses to lose the shape.

## 5. Mobile (≤ 360 px)

Same always-visible order. Slab keeps its 20 px height, gap to rail shrinks to 16 px, caption wraps at minus signs per VISUAL-VERDICT §4. The two-metric strip stacks to one column, not hidden. «Подробные данные» is a full-width 44 px tap target; inside it, the 9-cell «Как в таблице БГУ» scrolls as a normal block — behind a click, vertical length is cheap. Below ~320 px or on `quotaParseOk === false`, the slab hides per §4 and the sentence carries the story; the disclosure still holds the 9-cell table.

## 6. Opening claim for opponent

A’s composition is honest but under-informative: it treats the detail panel like a paragraph, when the panel exists because the overview row was already a paragraph. Hide the six-metric grid, hide the 9-cell table, hide the histogram — good. Hide the slab, and you ship a receipt that says «8 мест ушло» in words while refusing to draw those 8 as ink. That is the failure VISUAL-VERDICT already adjudicated. Keep the slab always on when `taken > 0`; put everything else behind «Подробные данные». Density is a budget, not a vow of silence.
