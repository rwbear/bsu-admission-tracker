# Debate — Round 2 rebuttals

## Round 2 — Rebuttals

### Reviewer A answers B’s opening claim

B’s claim rests on a rail that draws to 32 while the sentence reads 24. That rail does not exist in my proposal. «Мест» = `openPlan` **everywhere** — chance-track label, pin denominator, `estimatedPassing`, «Над тобой / мест», histogram cut. On биоинженерия the rail is cut at **24**, the metric grid prints «Над тобой N / 24 мест», the histogram’s estimated-passing line sits inside the 24-seat span, and the sentence begins «Из плана 32:…» to answer the one remaining question — *where did the other eight go?* The chart is not being “held accountable by prose”; the chart is already honest because the math driving its geometry is `openPlan`. The sentence is a receipt, not a leash.

B’s microstrip is the composition that would reintroduce the exact misread admissions research warned us about. Two horizontal segments in reading order, joined by a 1px «bridge tick» to the pin, will be scanned by a stressed 17-year-old as a queue: БВИ people, целевые people, «вне» people, then me. Hatch versus solid ink is a texture legend, and Principle 5 explicitly rejects legend-only encodings; on a 6.7" phone at 01:40 the hatch reads as “darker = ahead.” The bridge tick B calls a bond is the exact affordance that says *these lengths compose one line*, i.e. eight olympiad seat-widths of headroom the applicant will read as eight people. That is worse than the current lie — it dresses seats as bodies.

Scan path under my proposal: metric grid (24 honest) → track (cut at 24) → histogram (cut at 24) → confirmation sentence. Principle 12 forbids hiding *primary* honesty behind disclosure; `openPlan` **is** the primary number and it sits in the metric grid, top of the scan path — not in `<details>`, not in a caption. The sentence is redundancy for auditability, not the load-bearing surface. Give me a decision the strip helps that «Над тобой 31 / 24 мест» plus one sentence does not answer more calmly.

### Reviewer B answers A’s opening claim

A asks two things: does the strip create a false «people above» reading, and does composition smuggle primary honesty into disclosure. No, and no — and A’s proposal is the one that leaves a spatial gap.

On the misread: the strip is a **different lens** in a different unit. Its title reads «Состав плана · 32», unit *seat*; the rail below reads «Дорожка конкурса», unit *applicant from the histogram cohort*. Hatch/dot versus quiet solid is a categorical break the eye refuses to fuse into one row, especially with a ≥12px vertical gap and no shared axis. The bridge tick is a single 1px ink-dim mark meaning “these two lengths agree,” not “these are the same row.” Nothing left of the rail’s `chance-fill` ever names a person; «N выше тебя» keeps counting only histogram applicants. The false-queue reading A fears comes from *unlabelled* stacked bars — this one is labelled, captioned by A’s sentence verbatim, and separated by unit.

On Principle 12: the strip is **not** disclosed. It renders inline whenever `taken > 0`, on the same trigger as A’s sentence, above the rail, above the fold. `<details>` still holds only definitions (п. 23 vs п. 26, seat order). Primary honesty is *doubled*, not hidden. Dual-signal calm survives because the strip is a third lens on plan composition, not a place↔status arbiter; the contradiction sentence keeps its job.

The decision the strip earns is cross-specialty triage: on биология (БВИ 17 of 55, ≈31%) versus биоинженерия (БВИ 8 of 32, 25%), a proportional hairline lets the eye compare *reserve density* in one saccade — «Из плана 55: БВИ 17 · целевые 2 → 36» versus «Из плана 32: БВИ 8 → 24» requires reading four numbers per row and doing mental math. A’s sentence is the receipt; my strip is the picture the receipt annotates. A rail that quietly retunes from 32 to 24 without any adjacent visual accounting is a new lie of composition, and a paragraph beside «Обновлено…» cannot repair a scan that has already left the page.

### Points of agreement (forced)

- `openPlan = max(0, plan − taken)` is the correct denominator; naive `plan` is wrong and the биоинженерия case proves it («underfilled» → real contest).
- «Мест» resolves to **one** number in the UI, and that number is `openPlan`; it drives the metric grid, the chance-track label, `estimatedPassing`, and the histogram cut.
- The O3 Russian sentence («Из плана N: БВИ a · целевые b · вне конкурса c → в общем конкурсе M мест») ships verbatim when `taken > 0`; V2 compact form drops zero buckets; V3 fallback covers form 2 / 29 layouts without «по конкурсу».
- When `taken === 0`, both proposals stay silent — no sentence, no strip.
- Never merge БВИ and «вне конкурса» in copy; olympiad winners are not «вне конкурса» in UI text.
- Methodology `<details>` holds definitions and п.-numbers only, never primary numbers.
- Campaign-phase rule: `taken = max(enrolledTargeted, planTargeted) + withoutExams + outOfCompetition`, documented in `<details>`.
- No invented admission %, no traffic-light-only status, no new colour, no card chrome, no chart motion.
- The dual-signal contradiction sentence and the source link stay exactly as R1/R2 fixed them.
- Overview rows adopt the honest denominator (`3/24`, not `3/32`) when `taken > 0`; **no** overview chips (O6 rejected).
- Full column parity / second table (O5) is out on Principles 6, 8, 10.
- Pure O1 (silent math swap) is out — trust fractures if the user compares to `formk1` and finds no receipt.
- Parser must key on exact `formk1` header labels, not new heuristics; goldens for forms 2, 29, 32 gate the change.

### Remaining disagreement (one sentence each)

- **A still insists:** because `openPlan` already retunes the rail cut, the metric grid and the histogram in one honest stroke, adding a hairline «Состав плана» strip is chart chrome that reintroduces the very «olympians above me» misread B claims to prevent, and one calm Russian sentence in the existing `.detail-note` slot carries the receipt without a second geometry.
- **B still insists:** a rail that silently retunes its cut from 32 to 24 with only a paragraph below to explain itself is a new lie of composition — not of math — and a single 6px labelled hairline above the rail, captioned by A’s sentence verbatim, is the smallest honest visual that makes the plan we draw equal the plan we describe.
