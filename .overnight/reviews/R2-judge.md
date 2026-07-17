# R2 Judge — Design research

**Round:** 2 · Design research only  
**Artifact:** `.overnight/design/R2-design-research.md`  
**Code changes:** none (correct for this round)  
**Judge UTC:** ~2026-07-15T23:49Z  
**Spot-check base:** live CSS/JS + `data/sb-bsu.json` (not author claims alone)

---

## Scores (1–5)

| Axis | Score | Notes |
|------|------:|-------|
| **Depth** | **4** | Goes past mood boards into product physics: dual arithmetic lenses, official→derived hop, motion *budget already spent*, faculty-scoped list scale, grayscale as meaning not costume. Principles 1–4 / 9 / 12 are real. Stops short of measured hierarchy (no squint dump, no contrast numbers, no live interaction pass). |
| **Rigor** | **3** | Internal claims mostly verify: ink status tokens, `aria-hidden` marks, underfilled note copy, `0.42/0.58` @768, `ov-delta` hidden ≤420px, detail-in 200ms / meta 720ms / pulse + bounce present, snapshot 200 specs / 13 tables / 18 faculties, faculty×form max **17**. Failures: **P1#8A proposes `scrollIntoView` as if new — `main.js` `onSelectSpecialty` already scrolls `#detail` on &lt;768**; “median ~4” is closer to **~3** on current snapshot; “10–30” still leaks into the P1 header after the source table corrected it; no file:line motion inventory; external NN/G/ONS/Circulus are useful but unquoted paraphrase — research theater risk if implementers treat citations as proof. |
| **Product fit** | **5** | Unmistakably this site. Stadium-scoreboard vs sportsbook, reject fake admission %, keep r.w.b., no purple/cream/KPI-card migration, protect chance-track pin from visual “fixes.” Anti-pattern table and SaaS refusal map are the opposite of generic AI UI waffle. |
| **Ship readiness** | **4** | Safe driver for R3 P0: contradiction sentence, metric primary/secondary weight, overview `aria-label`, retention-scoped note — concrete hooks into `radar.js` / `components.css`. Not sealed: mobile rec needs rewriting around existing scroll behavior; P0#2 is still soft/optional; 10 morning questions will stall less decisive humans. |

---

## Keep

- Product physics § (two lenses, estimate≠order, hero budget, list scale, motion nearly maxed).
- Principles that force hierarchy decisions: dual-signal siblings, uncertainty only when read changes, grayscale-first, progressive disclosure for methodology not primary numbers.
- Anti-pattern kill list (traffic lights, 73% gauges, dual-axis merge, KPI strip above overview, pin-math redesign).
- Ranked **P0 #1, #3, #4, #5, #6** — high leverage, copy/CSS/a11y, matches R1 leverage #4–#5.
- Motion stance: **reallocate / prune**, not add a sixth layer; forbid count-up / poll redraw dance.
- Suggested R3 intake block (numbers-first order).
- Decision-blocking open questions **#1, #2, #3, #4, #9** (trim the rest for morning).

## Kill

- **P1#8A as written** — do not ship a second scroll path; rewrite as “scroll exists → add sticky «← Обзор» return (or pure stack B).”
- Residual **“10–30 specialties”** framing in section titles — current densest faculty×form is **17**, and only **one** group is ≥10. Design for ~8–17 tails, not enterprise grids.
- **P0#2 optional mush** (“optional microcopy tweak”) — either a committed label string or drop to P1. Judge hates half-recommendations.
- Expanding Design-System LARPing (full GOV.UK accordion adoption, Android pane APIs) beyond the one Details pattern already scoped.
- Any R3 temptation to turn Principle 1–12 into a redesign epic — research already says the skeleton is right.

## Fix before morning

1. **Patch P1#8 in the brief (or sibling erratum):** cite existing `onSelectSpecialty` → `scrollIntoView`; residual gap = return-to-list affordance / optional list hide — not discovery of scroll.
2. **Tighten scale numbers everywhere:** faculty×form median ~3 (not ~4); max 17; ≥8 ≈7 groups on current snapshot — so mobile pain is real but rare, not the default faculty.
3. **Commit or demote P0#2** — one exact «Расчётный балл» label decision, or it leaves the P0 list.
4. **Collapse open questions to ≤5** for Misha; move #5–#8/#10 to “if time.”

## Verdict

**pass**

On-brand, anti-SaaS, actionable enough for R3 honesty/hierarchy work. Not a rigor 5: missed an existing mobile scroll, left soft copy, and lightly overstated list density. Do **not** scrap; do **not** reopen pin math. Revise the mobile recommendation before anyone implements it overnight.
