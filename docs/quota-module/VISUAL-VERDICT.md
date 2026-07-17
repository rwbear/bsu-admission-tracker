# Visual verdict: how students see reserved seats

Chief-judge call on the S / E clash. Round 1 math (`openPlan` everywhere, V1 sentence in `.detail-note`) is untouched. Round 2 asks *what shape the eye lands on first*. One winner. No soft ship.

---

## 1. Decision (decisive)

**Ship a named hybrid — «Плита плана».**
Primary = **Concept S** (a short segmented block above the rail that draws `8/32` as shape). Concept E’s subtraction grammar is demoted to a single caption line above the block, so the operator `−` still tells the eye «эти места ушли до конкурса», but proportion is carried by the block, not by digits. Not «both». S is the primary; E survives only as the caption above S.

Concept E on its own is rejected as the primary visual: it is still typography, and Misha said sentence-only is no longer enough. Concept S on its own (with a generic «План мест — 32» caption) is rejected because it leaves the queue-misread defence to layout alone. The block draws the ratio; the caption sentence disambiguates its units. Two channels, one object.

---

## 2. Core ideas in plain language (for Misha)

- **Ты играешь не за 32 места, а за 24.** До общего конкурса план уже режется: БВИ, целевые, вне конкурса — они забирают места ещё до того, как считают баллы.
- **Над дорожкой конкурса — короткая плита.** Она рисует весь план (32) и штрихует ту часть, которую уже забрали (8). Один взгляд — видно, сколько «съедено» до тебя.
- **Плита — не очередь и не люди.** Штриховка — это места, а не абитуриенты. На плите нет точки «ты» и нет «выше тебя». Люди с баллами живут только на дорожке ниже.
- **Над плитой одна строчка-подпись: «План 32 − БВИ 8 = в общем 24».** Знак «минус» говорит: «эти места уже вышли». Ты не «стоишь за ними в очереди».
- **Дорожка конкурса не меняется.** Она рисует те самые 24 места и твою точку среди тех, у кого есть баллы. Плита выше, дорожка ниже, между ними воздух — они не читаются как один график.
- **Если предмет — из тех, где БВИ вообще не бывает (МО, Правоведение и т. д.), плиты нет.** Ничего не забрали до конкурса — нечего показывать. Тишина — это тоже честность.

---

## 3. Why this beats the alternative

Concept E’s subtraction line is a receipt in a nicer font. It puts `= 24` in front of the eye but never puts `8/32` in front of the eye — proportion stays encoded in glyphs, and the panicked scanner at 22:30 reads for numbers, not for arithmetic performed inside the mark. Misha explicitly asked for visual; an equation is not visual, it is typography-as-composition. Concept S makes the ratio a physical slab of ink before the reader parses any digit — that is what «увидеть» means. The queue-misread that killed the round-one stacked strip is real, but it was a property of *stacking on the rail with a bridge tick*, not of drawing a plan block at all: unequal heights, unequal denominators, a gap of daylight paper, disjoint ink tokens, and no shared axis defuse it structurally, and the E-derived caption line above kills the residual «эти люди выше меня» reading at the mark level with a `−` operator. E does one job well and S does the other; the hybrid does both without paying twice.

---

## 4. Ship spec (visual)

Math untouched: `taken = max(enrolledTargeted, planTargeted) + admittedNoExam + admittedOutOfCompetition`; `openPlan = max(0, plan − taken)`; every downstream compute uses `openPlan` per JUDGE §4b–c. This section only adds the plan block above the rail.

**Placement.** Inside the detail panel, between `detail-status` and the existing chance-track wrapper. One object, no card, no border, no `<details>`. The existing V1 sentence in `.detail-note` stays exactly where it is — below both stories, as receipt. The plan block does not replace the sentence; it precedes it.

**Structure of the object.**
- **Caption line (E grammar, one row).** 11 px Outfit, ink-60 on paper. Reads `План 32 · − БВИ 8 · − целевые 0 · − вне 0 · = в общем 24`. Labels secondary weight; values primary; `24` renders one notch stronger than the other values so weight carries the eye to the answer. Zero terms visible on desktop as parse proof (JUDGE §4d, DEBATE-E §2 «zero-handling»). Long forms of БВИ / «вне конкурса» stay in the methodology `<details>`.
- **Block (S shape, one row).** 20 px tall, full-width equals `plan` (32 seats). Paper background, ink-dim fill. Segments render left-to-right in seat-priority order п. 23 → п. 29 → п. 26 → п. 27: `admittedNoExam` → `enrolledTargeted` (or `planTargeted` pre-enrolment) → `admittedOutOfCompetition` → `openPlan`. The three «taken» segments are hatched 45° at ink-40 on paper; the `openPlan` segment is full ink. Zero-count segments collapse to zero width (not drawn). Inline segment labels appear inside segments ≥ 28 px wide; narrower segments push their label to the caption line above (already there) and stay unlabelled in-block. No pin, no «ты», no «выше», no bridge tick, no divider between block and rail — negative space is the divider.

**Interaction with the chance track.** The rail below is unchanged (JUDGE §5). Rail height = 36 px, block height = 20 px — enforced. Gap between block-bottom and rail-top = 24 px of daylight paper (16 px at ≤ 360 px, never lower). Block width represents 32, rail width represents `openPlan = 24` — widths do not align by construction, no ruler, no tick connects them. Rail caption still reads «мест 24». Hatch belongs only to the block; pin, «ты», «выше тебя», seat cut belong only to the rail. No visual token is shared between the two objects. This is the R2 anti-pattern «Dual-axis chart merging status and place» being refused by construction, not by hope.

**Methodology `<details>` role.** Unchanged from JUDGE §4e. Holds the definitions (БВИ п. 23 vs «вне конкурса» п. 26 vs целевые п. 29 vs общий п. 27) and the `taken` / `openPlan` formula. Also holds the note about целевые fallback into общий during campaign (JUDGE §6). Never carries the primary numbers; never carries the caption line; never carries the block. Progressive disclosure applies to methodology, not to the answer (R2 P12).

**Show / hide.** Show block + caption whenever `taken > 0` and `quotaParseOk === true`. Hide both entirely when `taken === 0` — silence trains the eye. On `quotaParseOk === false` with reserved seats heuristically detectable, hide the block, hide the caption, keep the V3 sentence. On `quotaParseOk === false` with nothing detectable, fall through to today’s note. On `taken > plan` (п. 26¹ edge), clamp `openPlan` at 0, render block with zero-width final segment, caption ends `= в общем 0`, status forces «Ниже» — JUDGE §4h honesty outcome. Under retained snapshot, keep the object, prefix the existing retention voice on the sentence below — no second banner.

**Mobile.** ≤ 360 px: block stays 20 px, gap shrinks to 16 px, in-block inline labels collapse (all labelling on the caption line). Caption line wraps at minus signs: line 1 `План 32 − БВИ 8 − целевые 0 − вне 0`, line 2 `= в общем 24` indented under the last minus. If line 1 still overflows, zero terms drop from the caption (block segments already at zero width so no visual desync), non-zero subtractors stay, `= в общем N` always survives on line 2. Below ~320 px or on `quotaParseOk === false`, the whole object hides and the V3 sentence in `.detail-note` carries the story — a narrow-phone two-segment approximation is worse than prose the parser can honestly write.

**Motion.** One reveal, two beats, calm.
- Block fill draws left-to-right in 320 ms cubic ease-out in seat-priority order. Caption line fades in as a single object, no per-term stagger, no numeral count-up (count-up would read as «arithmetic in progress» and break the settled-fact frame — DEBATE-E §5).
- Rail fill starts 120 ms after the block completes. The stagger tells the eye «seats first, contest second» without a caption saying so.
- Refresh delta on a growing `taken` segment: 200 ms 6 %-brightness pulse, no width jump, reflow is instant.
- `prefers-reduced-motion` cancels the stagger and the pulse; block, caption, and rail paint at once.

**Copy discipline.** «БВИ» in-object; «без вступительных испытаний» in `<details>` only. Never «олимпиадники = вне конкурса» — JUDGE §1 naming trap. The caption line uses the same lexicon as the V1 sentence («в общем конкурсе» / «в общем»), so a scanner moving from block → rail → sentence never sees three different names for the same bucket.

---

## 5. Still forbidden

- Stacking reserved seats *on* the chance rail, in the same row as pin / «ты» / «выше тебя», with or without a bridge tick.
- Any visual line, tick, ruler, or shared axis connecting the block to the rail. Widths must not align.
- Sharing hatch with the rail, or sharing pin / «ты» / «выше тебя» with the block. One ink language per object.
- Colored status pills, traffic-light green/amber/red, admission-probability %, gauges, donuts, sparklines, KPI cards, «Состав плана» as a card, borders around the block.
- Overview-row chips or badges surfacing БВИ / целевые / вне counts across specialties. Reserved-seat detail lives in one detail panel, one at a time.
- A second table or a full BSU left-column dump.
- Merging БВИ (п. 23) and «вне конкурса» (п. 26) into one label anywhere — caption, block segment, sentence, `<details>`.
- Rendering the block or caption when `taken === 0`. Silence is a feature.
- Numeral count-up animation on the caption or on any metric cell.
- Rendering `planOfficial` as «мест» anywhere except inside the caption and the sentence. Rail label stays «мест 24».
- Adding «Проход» / product nickname anywhere in the object. Brand remains **r.w.b. | production** at the shell.
- Fabricating a bucket the parser did not return. Zero is load-bearing only when parsed; `null` never renders as `0`.

---

## 6. Recommendation line

**Ship — with conditions.** Ship the hybrid «Плита плана» exactly as specified above; but block on three gates before it goes live: (a) goldens for form 2 / form 29 / form 32 must render block + caption correctly for биоинженерия (block shows `8` hatched of `32`, caption ends `= в общем 24`, rail draws to 24) and correctly render *nothing* on a `taken === 0` fixture; (b) `quotaParseOk === false` paths must be tested to hide the object and fall to V3, not to draw a two-segment guess; (c) manual eye check on ≤ 360 px that block + rail read as two objects, not one — if the queue-misread survives the layout, kill the block and fall back to E-only caption above the sentence. No phase split, no A/B — one shot, one visual.