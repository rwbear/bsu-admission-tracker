# Debate S — «Два сюжета» (Two Stories)

**Product:** BSU admission tracker · **Brand:** r.w.b. | production
**Stance:** `openPlan` math is shipped. Place a separate «План мест» visual **above** the existing «Дорожка конкурса». Two blocks, two captions, two heights, one gap. The plan story never shares an axis with «ты» or «выше тебя». A 17-year-old opening биоинженерия needs to *see* that eight of thirty‑two are already gone.

## 1. Why a separate seats story beats sentence-only AND equation-only

Sentence-only (V1 shipped) is a receipt: correct, easily skipped by the stressed scanner. Equation-only (Concept E) upgrades that receipt to typography — «`План 32` − `БВИ 8` − `целевые 0` = `в конкурсе 24`» — but still asks the reader to *perform* subtraction with their eyes. Both encode ratio only in glyphs. A block whose 8/32 slice is drawn as a hatched slab communicates «уже занято» before any digit is parsed. That is «visual» in Misha’s sense: proportion becomes shape, not a sum. Concept S adds that shape without touching the chance rail — «ты» keeps its clean rail among score-people only, the dual-axis anti-pattern stays uncrossed by construction.

## 2. Exact visual structure

Two stacked blocks inside the detail panel, above the existing chance-track wrapper.

**Story 1 — «План мест».** A single horizontal block, **20 px** tall (chance rail is 36 px — see §3). Full-width equals `plan` (official 32). Paper background, ink-dim fill. Segments render left-to-right in seat-priority order (п. 23 → п. 29 → п. 26 → п. 27):

- `admittedNoExam` → «БВИ N»
- `enrolledTargeted` (or `planTargeted` before enrolment) → «целевые N»
- `admittedOutOfCompetition` → «вне конкурса N»
- `openPlan` → «в общем конкурсе N»

The last segment is full ink; the three «taken» segments are hatched at 45° in ink-40 on paper. Caption above (11 px Outfit, ink‑60): «План мест — 32». Inline segment labels sit inside each segment at ≥ 28 px width; below that the label moves under the block as a footnote row «БВИ 8 · в общем 24». Zero-count segments collapse (removed, not shown at 0 width). When `quotaParseOk === false` but reserved seats are heuristically detectable, Story 1 collapses to two segments: «занято N» (hatched) + «в общем конкурсе M» (ink). No pin. No «ты». No «выше». Ever.

**Story 2 — «Дорожка конкурса».** Unchanged from today, denominator already `openPlan`. Caption: «Дорожка конкурса — 24 места». The rail carries the pin, «ты», the seat cut, and «выше тебя». It shows people-with-scores competing for the 24 leftover seats.

## 3. How the two stories stay mentally separate

Five layout rules, enforced together:

1. **Height contrast.** Story 1 = 20 px block; Story 2 = 36 px rail. Different objects, not two rows of one chart.
2. **Gap.** 24 px of paper between block-bottom and rail-top. No divider — negative space is the divider.
3. **Different denominators visible.** Story 1 spans 32, Story 2 spans 24. Widths do not align; no ruler connects them. No bridge tick.
4. **Different ink language.** Hatch belongs only to Story 1. Pins, «ты», «выше тебя» belong only to Story 2. No shared visual token.
5. **Different captions.** «План мест» vs «Дорожка конкурса», same 11 px Outfit weight — parallel grammar, disjoint referents. The `.detail-note` sentence still renders below both, as receipt.

## 4. Mobile

At ≤ 360 px: Story 1 keeps its 20 px height, inline labels collapse to the footnote row when any segment would fall under 28 px, gap shrinks to 16 px (never lower). If only one non-zero «taken» segment survives, Story 1 renders as two segments: «занято N» and «в общем M». If `quotaParseOk === false` on narrow screens, Story 1 hides entirely and the shipped V3 sentence carries the story — better than a two-segment bar the parser cannot label honestly.

## 5. Motion (1–2 intentional, calm)

- **Reveal.** Story 1’s fill draws left-to-right in 320 ms cubic ease-out, in seat-priority order. Story 2’s fill starts 120 ms after Story 1 completes. The stagger tells the eye «seats first, contest second» with no caption saying so.
- **Refresh delta.** When a snapshot grows `taken`, the segment does a 200 ms 6 %-brightness pulse — no width-jump, reflow is instant.

`prefers-reduced-motion` cancels both.

## 6. Risks vs Concept E

- **Footprint.** S adds ~44 px vertical (block + caption + gap); E adds ~20 px of prose. Real on short phones. Mitigation: the sentence compresses (V2 shipped), not Story 1.
- **New misread risk.** A hatched block near the rail could still be read as «people ahead of me» — the stacked-strip failure. §3 rules 1, 3, 4 exist for this: height, denominator, and ink language all differ. E has no such risk because it is text.
- **Two visuals compete for fixation.** Rule 3 fixes it: unequal widths make Story 2 the obviously smaller world; the pin lives only there.
- **Parse-failure fragility.** When `quotaParseOk === false` we degrade to two segments or hide; E must fall back to prose anyway. Parity, not a loss.

## 7. Opening claim for opponent

> «Sentences do not draw ratios. If the visual brief means anything, the eight seats that vanished before the contest must be **seen** — a hatched slice against the full plan — not spelled. Concept E is still a receipt in a nicer font; Concept S is the first thing on the page that shows the applicant they are not competing for 32.»
