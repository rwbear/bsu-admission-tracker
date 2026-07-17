# Debate E — «Видимое вычитание»

**Reviewer E position.** Ship an arithmetic composition — `План 32 − БВИ 8 − целевые 0 − вне 0 = в конкурсе 24` — as the primary quota visual. The chance track then does one job: score competition among score people. `openPlan` math is already shipped (JUDGE §3); this is only about *what the eye lands on first*.

---

## 1. Why arithmetic beats a second bar for stressed scanners

Concept S stacks two bar-shaped stories with a caption gap. Bars are a spatial encoding: length ↔ quantity, position ↔ order. A 17-year-old opening биоинженерия at 22:30 is not decoding spatial encodings — they are scanning for **the number that answers the panic: «на сколько мест я реально играю?»**

The subtraction line *is* that number, in the reading order every Russian schoolchild has known since grade one. The eye lands on `= 24`; the row above already explained where the eight went. A second bar has to be *interpreted* — length compared, caption checked, connected to the rail. Every micro-step is where the queue misread sneaks back in.

Arithmetic also owns the units problem. Bars answer «места или люди?» through a caption; a minus sign between two numerals cannot be about people — you do not subtract people from seats. The operator is the disambiguator. The judge already conceded «the receipt is the sentence; the strip is chart chrome» (JUDGE §7). Concept E promotes that receipt from prose to composition — still not chrome, because no rail inherits rail semantics.

---

## 2. Exact composition

One row above «Дорожка конкурса», replacing the prose sentence with a typography object. Ink on paper, Outfit, no chip, no border, no card. Slotted as one reveal step between `detail-status` and `metric-grid`, caption «Состав плана» above in the existing `chart-block` style.

Left→right, one baseline:

- **`План`** small-caps secondary-weight label + **`32`** at metric-primary weight, ink-strong.
- Thin **`−`** (U+2212), dim-ink, generous side-margin.
- **`БВИ 8`** · **`− целевые 0`** · **`− вне 0`** — labels secondary weight, values primary.
- Thin **`=`** with slightly more side-margin than the minus (visual comma).
- **`в конкурсе 24`** — `24` alone renders ink-strong at primary weight; other values step one notch dimmer. Weight carries emphasis, not decoration.

**Zero-handling.** Zeroes stay visible on desktop — load-bearing proof the tracker parsed the row (JUDGE §4d). Zero values render one extra step dimmer, so the eye counts four subtractors while gravity leans on the real ones.

**Show / hide.** Show when `taken > 0`. Hide entirely when `taken === 0`, caption included. On parse failure with reserved seats detectable, render V3 prose in `.detail-note` and no composition — never invent a bucket. Under retained snapshot, prefix retention voice; no second banner. Long forms of БВИ / «вне конкурса» / целевые live in the methodology `<details>` — never in the composition.

---

## 3. Why it defuses «олимпиадники обгоняют мой балл» better than any bar

Admission-rules §133: БВИ / целевые / вне are **not** in the histogram of «люди выше меня». Every second-bar variant teaches that by *absence* — the user must notice «ты» is missing from the reserved bar and infer why. Absence is a weak signal under stress.

Subtraction encodes the same fact by **grammar**. БВИ sits on the left of the equals with a minus in front. «Ты» lives on the right, on the rail below. The minus says «эти люди уже вышли из выборки». You cannot read «БВИ 8» as «8 людей выше меня» when a subtraction sits in front — that is not what you do to people ahead of you in a queue.

Concept S fights this with height, gap, caption. Concept E defuses it inside the mark. A caption gap can be misread; an operator character cannot.

---

## 4. Mobile / wrap behavior

Break points are the minus signs. Below ~360 px the composition wraps to two lines: `План 32 − БВИ 8 − целевые 0 − вне 0`, then `= в конкурсе 24` indented so the equals hangs under the last minus. If line one still overflows, zero terms collapse to match V2 compact copy — only non-zero subtractors survive; line two always shows `= в конкурсе N`. Under ~320 px or `quotaParseOk === false`, fall through to V3 prose.

---

## 5. Motion

One reveal step. Whole row fades in as a single object — no per-term stagger, no counting-up on numerals. A count-up would read as *arithmetic in progress* and break the settled-fact frame. Reduce-motion: instant paint. No hover — not interactive.

---

## 6. Risks vs Concept S

- **Density.** Four terms + equals is more ink than one short bar. Mitigated by dim-ink labels and weight-only emphasis on `24`.
- **Localization.** «без вступительных» is long — hence «БВИ» in-composition; long form in `<details>`. Concept S dodges labels entirely and pays for it in legend dependence — the R2 anti-pattern.
- **Novelty.** An equation is unfamiliar in an admissions tracker. That is the point: novelty here is the honest surface of п. 23 → п. 27 order. Concept S looks like every other stacked-bar dashboard — ancestry of the round-one queue misread.
- **Cross-specialty density lost vs S.** Detail panels do not triage across specialties (JUDGE §3). No loss.

---

## 7. Opening claim for opponent

Concept S owes an answer: once `openPlan` is in the rail label and cut, what does a *second bar* add that the equation does not? «Shape memory across specialties» is the wrong surface — overview chips and cross-row visuals are already rejected. «Visual weight for stressed users» is where Concept E wins: the equation carries more weight per pixel and defuses the queue misread at the mark level, not at the layout level. Name one stressed-scanner failure Concept S catches that Concept E does not.
