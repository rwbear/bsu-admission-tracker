# R2 — Design research brief (bsu-admission-tracker)

**Round:** overnight Round 2 · design research only  
**Product:** БГУ · live-таблицы конкурса — score → place → chance track → histogram  
**Brand:** **r.w.b. | production** (never «Проход» as brand)  
**Visual north star already landed:** soft daylight paper `#f7f7f5`, Outfit, ink-only accents, soft TL→BR shadows, grayscale status marks  
**Code changes this round:** none  
**Audience for recommendations:** next implementers (R3+) + morning human (**Misha**)  
**Depends on:** `.overnight/audits/R1-product-map.md` (Keep); judge: do not reopen chance-track pin / peopleAbove math unless tests disagree  

---

## Sources consulted

### Internal (product ground truth)

| Source | Why it matters |
|--------|----------------|
| Live product surface (`index.html`, `css/tokens.css`, `layout.css`, `components.css`, `js/ui/radar.js`, `js/ui/charts.js`, `js/compute.js`) | Constraints are already partially implemented; research must refine, not invent a second product |
| `docs/hub-expansion-plan.md` | Hero budget = channel → faculty → score → CTA; no cards / stat strips |
| `.overnight/audits/R1-product-map.md` + `.overnight/reviews/R1-judge.md` | Dual-signal tension (status-by-delta vs peopleAbove), retention/freshness, leverage items |
| Snapshot sample `data/sb-bsu.json` (audit-time) | ~200 specialties / 13 tables / 18 faculties; **form=7 per faculty typically 1–8 (median ~4), global form×faculty max ~17** — “10–30 specialty lists” is the upper band / densest faculties, not the median default |

### External (durable principles)

| Source | URL | Takeaway used |
|--------|-----|----------------|
| NN/G — Animation purpose in UX | https://www.nngroup.com/articles/animation-purpose-ux/ | Motion for feedback / state / navigation metaphor; never delight spam; competing motions cancel each other |
| NN/G — Confidence intervals & uncertainty | https://www.nngroup.com/articles/confidence-interval/ | Point estimates without honesty about precision invite false certainty |
| NN/G — Visual hierarchy (definition + 5 principles) | https://www.nngroup.com/articles/visual-hierarchy-ux-definition/ · https://www.nngroup.com/articles/principles-visual-design/ | Hierarchy via scale/value/spacing; don’t kill legibility with contrast-only de-emphasis |
| NN/G — Anatomy of a list entry | https://www.nngroup.com/articles/list-entries/ | Consistent attribute placement + visual priority within each row for scan speed |
| ONS (UK) — Showing uncertainty in charts | https://service-manual.ons.gov.uk/data-visualisation/guidance/showing-uncertainty-in-charts | Show uncertainty when it would change interpretation; plain language; shaded bands > decorative error bars; don’t chart meaningless noise |
| GOV.UK Design System — Details / Accordion | https://design-system.service.gov.uk/components/details/ · https://design-system.service.gov.uk/components/accordion/ | Progressive disclosure: hide *minority* need, never hide majority need; Details for one secondary chunk |
| Circulus (education product) — methodology | https://circulus.education/methodology | Separate “fit on paper” vs “chance band”; label gaps; bands not placeholders for false precision; always link official source |
| Admissions portal reality (display ≠ record) | e.g. https://admission.satssat.com/how-admission-decisions-are-queued-and-released/ | Portals are display layers; users already confuse display with verdict — third-party tools must not amplify that |
| Refactoring UI (Wathan/Schoger) via durable summaries | https://superbook.ai/books/refactoring-ui · practice notes | Grayscale hierarchy first; de-emphasize secondary; labels quieter than values; constrained spacing scale |
| Android / SAP list–detail adaptive pattern | https://developer.android.com/develop/adaptive-apps/guides/list-detail · https://www.sap.com/design-system/fiori-design-android/v25-4/layouts/list-detail | Side-by-side when wide; stacked with clear back when narrow; selection must remain visible |
| Dual-axis / dual-metric caution | Perceptual Edge dual-scaled axes; dashboard misread articles | Two related but different units/meanings must not be visually “merged” into one fake story |

**Intentionally underweighted:** 2025 “motion is the brand” trend pieces, purple SaaS kit galleries, card-grid marketing dashboards.

---

## Product physics this brief refuses to forget

1. **Two arithmetic lenses, one specialty**
   - **Status / delta** = score − `estimatedPassing` → «В зоне / На грани / Ниже» (bucket-cut logic).
   - **Place / people** = `peopleAbove / plan` + chance-track pin (uniform within-band estimate for own band).
   - They can disagree by design (MO edge: pin past cut while status still `risk`). UI must narrate tension, not paint over it.

2. **Everything after the scrape is an estimate of BSU’s live table**, not an admission order.
   - Official: buckets, plan, apps on `abit.bsu.by`.
   - Derived: passing, peopleAbove, status, pressure, underfilled→safe.
   - Footer already: «Расчётный балл — не приказ».

3. **Hero is already the brand composition** — sticky `r.w.b. | production`, quiet table channel, faculty as title-weight trigger, score + CTA. Board is the data product; hero must not turn into a dashboard.

4. **List scale is faculty-scoped**, not a 200-row mega-table: usually few specialty buttons, occasionally ~10–17. Master–detail is correct; enterprise table chrome is wrong.

5. **Motion already present** (live pulse, meta fade 720ms, faculty overlay 220ms, chance fill/you, detail-in). Budget for *net adds* is nearly zero — reallocate or finish incomplete patterns, don’t stack a sixth animation layer.

---

## Principles (numbered) — with “why it fits this product”

### 1. Calm competitive UI = stadium scoreboard, not sportsbook

**Principle:** Competitive rank UIs earn trust when they feel like a public board: dense, legible, emotionally flat. Excitement belongs to the applicant reading the number — not to the chrome pulsing around it.

**Why here:** Applicants refresh under stress during приемная кампания. Flashing countdowns, neon “odds,” or green/red gambling cues turn «Над тобой / мест» into a bet. Paper + ink already points the right direction; keep scoreboard grammar (tabular nums, quiet marks, no celebration of “winning”).

### 2. Separate lenses; never collapse them into one super-metric

**Principle:** When two signals answer different questions, show them as siblings with names — like Circulus’s Fit vs Chances. Do not invent a third blended % “probability of admission.”

**Why here:** Status answers «относительно расчётного балла»; peopleAbove answers «сколько сильнее тебя в таблице». A single “chance %” would lie. Metric grid + overview columns already separate them — protect that split in copy and hierarchy.

### 3. Uncertainty is shown when it would change the read (ONS), in plain Russian

**Principle:** Surface uncertainty where silence produces a wrong action; omit decorative uncertainty chrome everywhere else. Prefer short plain statements over statistical jargon.

**Why here:** Silent false certainty cases that matter:
- peopleAbove ≥ plan while status = «На грани» (uniform-band estimate).
- underfilled → forced `safe` (passing not formed).
- soft-retained forms (mixed scrape age under one `updatedAt`).
- simple tables without buckets.

Do **not** add confidence-interval whiskers on every histogram band — that is ONS “unnecessary uncertainty” noise and fights ink-paper clarity.

### 4. Official → derived → display: label the hop

**Principle:** Admissions systems fail when display pretends to be record. Third-party UIs must name the hop loudly.

**Why here:** Source link per table + «расчётный» + footer disclaimer already start this. Detail note should remain the honesty layer; overview should not look more “official” than BSU’s own page.

### 5. Grayscale hierarchy first (Refactoring UI); color never carries the only meaning

**Principle:** Solve scan order with size, weight, position, opacity of *ink*, not chroma. If hierarchy collapses when status colors are removed, the design was cosmetic.

**Why here:** Tokens already set `--safe/--risk/--below` all to ink; marks use fill/opacity. **Keep that.** Adding green/amber/red “because dashboards do” would violate brand and create false traffic-light certainty for estimates.

### 6. One primary scan path per surface; de-emphasize the rest

**Principle:** Squint test — one thing wins. Hierarchy is usually fixed by quietening secondary chrome, not shouting the primary louder.

**Why here:**
- Hero winner: brand + faculty (+ channel quieter).
- Overview winner: specialty name → peopleAbove/plan → delta trailing.
- Detail winner: peopleAbove/plan + status line → chance track → histogram → note.

Zone labels «Обзор / Детали», uppercase captions, and summary strip are *secondary* — they must not compete with numbers.

### 7. Master–detail for ~5–20 items: list is the instrument; detail is the explanation

**Principle:** Adaptive list–detail (Android / SAP): wide = side-by-side with sticky selection; narrow = stack with obvious return-to-list. Selection state is sacred.

**Why here:** Faculty lists are short enough that a full data-grid is waste. Current CSS: stacked mobile, `0.42 / 0.58` from 768px — good skeleton. Gap: mobile shows both panels stacked (overview + detail always), so long specialties force scroll past the list without a true “list-only ↔ detail-only” mode. For ~8–17 rows that is tolerable; for denser faculties + histogram height it becomes “lose your place.”

### 8. Density without clutter: hairline list > card stack

**Principle:** Dense hierarchical lists beat card grids when every card is the same interaction. Cards are for interaction containers that need enclosure — not for every number.

**Why here:** Overview rows already hairline — preserve. Detail `metric-cell` borders are OK as *readout* frames, but stacking more card shells around track/histogram would recreate SaaS kit look. Prefer one panel = one enclosure.

### 9. Motion earns presence only if it answers “what changed?” (NN/G)

**Principle:** Brief, unobtrusive motion for feedback, mode change, or spatial metaphor. Competing loops dilute all of them. Respect `prefers-reduced-motion` (already wired).

**Why here:** The product’s “live” feeling should come from: (a) meta age/countdown honesty, (b) chance pin finding its place once, (c) overlay open/close. Not from bouncing KPI chips, chart redraw dances on every silent poll, or hero badges.

### 10. Hero budget is non-negotiable; board content never migrates upward

**Principle:** First viewport = brand + channel + faculty + score + CTA. Stats, schedules, event promos, and specialty peek cards stay below the fold.

**Why here:** Hub expansion already warned against exploding filters in hero. Any “this week / remaining seats / KPI strip” temptation is anti-product.

### 11. Accessibility of de-emphasis: quiet ≠ illegible (NN/G contrast caution)

**Principle:** Prefer smaller / uppercase-tracked / thinner secondary text over pushing `--ink-faint` into unreadable territory for the *only* copy of an important fact.

**Why here:** Summary strip and zone labels are faint by design. Conflict explanations (status vs place) must stay at `ink-dim` / `text-sm`, never faint caption — honesty text is majority need for edge cases, not GOV.UK “minority Details.”

### 12. Progressive disclosure for methodology, not for primary numbers

**Principle:** GOV.UK Details hides optional help. Never hide «Над тобой / мест», status, or scrape warnings behind expanders most users won’t open.

**Why here:** Methods paragraph (“равномерное распределение внутри интервала”) can live under Details-style line in the note area. Banner / retention / fixture warnings stay visible.

---

## Anti-patterns to reject

| Anti-pattern | Why reject for *this* site |
|--------------|----------------------------|
| Purple-on-white / indigo SaaS gradient themes | Brand forbidden; also screams “AI dashboard,” not daylight paper |
| Cream + terracotta serif / broadsheet hairlines & dense newspaper columns | Explicit brand veto; fighting Outfit + ink system |
| Dark mode + glow live badges | Sportsbook energy; contradicts paper daylight |
| Card-heavy hero / inset media / floating promo chips on hero | Hero budget + brand test failure |
| Green/amber/red status traffic lights as sole encoding | Overstates certainty of estimates; breaks grayscale-first system |
| “Admission probability: 73%” gauge / donut | Invents a number the math does not own |
| Dual-axis chart merging status and place | Implies false single story; known viz failure mode |
| KPI card strip above overview (safe/risk/below as big numbers) | Summary strip already exists as calm uppercase line; expanding it to cards is SaaS bait |
| Infinite skeleton shimmer + count-up animations on silent refresh | NN/G Hipmunk lesson: competing motions; also undermines trust (“numbers are performing”) |
| Copying Linear/Notion/AdminLTE chrome (side nav, filters tray, settings cog) | This is a single-task public tool, not an app shell |
| Treating «Проход» or product nickname as logo | Brand is **r.w.b. \| production** only |
| Hiding source link / disclaimer in footer-only after detail overload | Honesty must stay adjacent to derived numbers |
| Per-row “sparkline of mood” / emoji / stickers | Decoration calm; adds noise with zero decision value |
| Redesigning chance-track pin algorithm as a visual fix | R1 judge: do not re-litigate; fix *copy* when signals disagree |

---

## Concrete recommendations (ranked) — specific to this codebase

Legend: **P0** = morning-critical / high leverage for honesty & scan · **P1** = next polish / mobile mastery · **P2** = nice if quiet week  

### P0 — Honesty of the dual signal (copy + light structure)

1. **Detail note: conditional contradiction sentence** (`js/ui/radar.js` note builder)  
   When `peopleAbove >= plan` and `status === 'risk'` (and score present), append one calm sentence, e.g.  
   «Место по интервалам уже за чертой мест, статус — по расчётному баллу (оценка внутри своего интервала).»  
   When underfilled→safe: keep existing “ещё не сложился” — do not also say «В зоне» without that context.  
   *Fits R1 leverage #4. No math change.*

2. **Metric label clarity without renaming the product**  
   Keep «Над тобой / мест» as primary place metric. Soften misleading certainty on «Расчётный» by ensuring uppercase label stays secondary and note always says «оценка по таблице». Optional microcopy tweak: «Расчётный балл» (already footer language) in the metric label for consistency with footer «не приказ».

3. **Retention / mixed freshness: don’t only banner-global**  
   When `scrapeMeta.retainedFormIds` includes current table, surface one line under summary or in detail note («часть строк удержана с прошлого снимка») — same voice as banner, scoped. Avoid colored badge stickers; use existing `detail-note` / banner typography.

4. **Overview `aria` for status marks**  
   Marks are `aria-hidden` today; status is only visual. Add accessible name on the row button (e.g. include `statusLabel` + people/plan + delta in `aria-label`) so grayscale ink marks aren’t the sole channel for assistive tech.

### P0 — Hierarchy: teach the eye which twin to trust first

5. **Overview column grammar (CSS + row DOM)**  
   Current row: mark | name | ratio | delta. Keep. Strengthen:
   - `ov-ratio` = primary numeric (ink, weight 600) — place lens.
   - `ov-delta` = secondary (ink-dim) — status-by-score lens; optional prefix `Δ` is *not* recommended (noise); instead ensure selected row doesn’t need delta on tiny phones without losing status — mark already encodes status; on ≤420px where delta is `display:none`, **mark + ratio must be enough** (verify mark contrast in selected state).
   - Do **not** add a second colored status pill.

6. **Detail metric grid: primary pair, secondary pair**  
   Visually weight the first row (`Над тобой / мест`, `Расчётный`) heavier than (`Дельта`, `Конкурс`) via CSS (`metric-cell:nth-child` or modifier classes `is-primary` / `is-secondary`) — lighter border or slightly smaller type on secondary cells. Same enclosure, different emphasis. Prevents four equal “KPI tiles” SaaS look.

7. **Summary strip stays a whisper**  
   Keep `В зоне N · На грани N · Ниже N` as uppercase faint line. **Reject** expanding into three mini-cards. If clarity needed, increase letter-spacing / use `ink-dim` only if WCAG on `#f7f7f5` allows — else keep faint but don’t promote to board hero.

### P1 — Master–detail mobile + desktop (10–30 / dense faculties)

8. **Mobile: prefer list-first composure without inventing SPA routes**  
   Today both overview + detail stack. For faculties with ≥8 specialties + charts, detail’s histogram pushes overview off-screen after first select. Prefer **one** of:
   - **A (lighter):** on `<768px`, after select, `scrollIntoView` on `#detail-panel` with a sticky mini-bar «← Обзор · {short spec name}» (ink, no card glow) that scrolls back to `#overview-list`.
   - **B (purer list–detail):** hide overview when selected on mobile; sticky back control restores list (closer to Android stacked panes).  
   Recommend **A** first — less state risk with current `main.js` selection model.

9. **Desktop: sticky detail + sticky selected row affordance**  
   From 768px, `position: sticky; top: calc(var(--command-h) + …)` on `.detail-col .panel` so scrolling a longer overview keeps charts in view. Selected `inset` bar already good — ensure overview list scrolls independently only if panel heights diverge (`max-height` + overflow on overview panel optional when count > ~12).

10. **Zone labels**  
    «Обзор / Детали» are scaffolding. Consider retiring them on desktop (redundant with two-pane) to free vertical rhythm; keep on mobile only if list–detail navigation needs a landmark. This is de-emphasis of chrome (Principle 6).

11. **Table picker parity with faculty picker (UX quality, not visual)**  
    Faculty overlay: shell preserved, list patch, enter/leave 220ms. Table overlay: full remount on search (R1 risk). Design implication: unequal motion/focus quality between the two hero controls undermines “one composition.” Align behavior — same calm overlay language — before inventing new hero widgets.

### P1 — Motion: 2–3 intentional moves max *added* (actually: finish / prune)

Current inventory is already ≥5 motion systems. Recommendations = **rebalance**, not accumulate.

12. **Keep (intentional, on-brand)**  
    - Faculty overlay open/leave (spatial metaphor for picker — NN/G navigation metaphor).  
    - Chance fill + `you` pin enter **once per selection** (state: where you sit).  
    - Meta sequential fade (live honesty, not gamification).

13. **Tighten / don’t add**  
    - `detail-in` opacity: keep ≤200ms; do **not** add vertical slide of whole panel (competes with pin enter).  
    - Live-dot pulse: keep; never combine with badge glow.  
    - Loading dots: OK for empty board; **disable** decorative bounce when silent refresh keeps previous results (avoid “everything is dancing while numbers unchanged”).

14. **Allowed net-new motion (pick ≤2 total for later rounds)**  
    - **Selection handoff:** overview row selected inset bar eases in 160ms (background already transitions) — reinforces which specialty owns the detail.  
    - **Mobile sticky back bar** appear/fade 160ms if P1#8A lands.  
    - **Forbid:** histogram column grow-on-every-poll; confetti; number count-up; hero shimmer.

### P1 — Uncertainty without science decoration

15. **GOV.UK-style Details for methodology only**  
    After the one-line honesty note, optional «Как считается место» disclosure (plain RU: seats cut from high scores; within-band uniform; status vs pin). Not a modal. Not in hero.

16. **Histogram: keep quiet out-zone hatch; no CI whiskers**  
    Existing out-region wash + cut line already conveys “past seats.” Don’t layer probability bands. Optional caption tweak: «Интервалы баллов» → «Интервалы баллов · таблица БГУ» if source attribution needs reinforcement near the chart.

### P2 — Brand / atmosphere (no redesign)

17. **Brand weight test**  
    Faculty trigger is hero title-weight; brand is sticky left. On mobile narrow widths, ensure command-brand doesn’t shrink below recognition (`layout.css` already drops to `text-sm` at 420px). Avoid new wordmark icons or rainbow dots.

18. **Shadows ladder discipline**  
    Panels use `--shadow-ground`; overlays `--shadow-high`; command `--shadow-mid`. Reject new multi-layer marketing shadows on metric cells — hist-chart already has a softer inner lift; don’t stack another ground cast under each metric.

19. **Empty / error states stay human, not illustrated SaaS**  
    Keep short RU sentences. No empty-state illustrations or “Get started” checklists.

20. **prefs keys still say `prohod-sb-*`**  
    Internal only — OK. Do not surface «Проход» in UI, OG, or share imagery as brand.

---

## What THIS site should NOT copy from generic SaaS dashboards

| SaaS habit | Instead |
|------------|---------|
| Left nav + app shell + user avatar | Sticky thin command bar + single task |
| KPI row of 4–6 big numbers with sparklines | Uppercase summary whisper + metric grid inside one specialty |
| Filter chips / multi-facet side panels | Two overlays: table channel + faculty |
| Activity feed / “insights” cards | Source link + scrape age |
| Semantic color systems (success/warning/danger tokens) | Ink mark fill states |
| Onboarding carousels | Empty state: «Введи балл» |
| Dark analytics theme for “pro” credibility | Daylight paper for public applicants |
| Realtime websocket fireworks | Honest poll cadence + stale chase without celebration |
| Product name as logo lockup competing with university | r.w.b. brand + БГУ as data subject in title/OG only |

---

## Mapping goals → decisions

| Research goal | Decision for this codebase |
|---------------|----------------------------|
| 1. Calm competitive UIs | Scoreboard grammar; ink marks; no sportsbook color or gauges |
| 2. Uncertainty in education trackers | Plain-RU notes at moments of false certainty; bands/methodology disclosure; never fake % |
| 3. Master–detail 10–30 | Keep side-by-side ≥768; improve mobile return-to-list; sticky detail on desktop |
| 4. Dual signals hierarchy | Place ratio primary in overview; status via mark (+ delta secondary); detail weights primary metrics; contradiction copy |
| 5. Motion | Reallocate existing 2–3 meaning-carrying motions; at most 1–2 micro additions; prune silent-refresh thrash |
| 6. Anti-SaaS | No KPI strips, nav shells, traffic lights, insight cards |

---

## Open questions for human (Misha) in the morning

1. **Contradiction moments:** When pin is past seats but status is «На грани», do you want the UI to prefer explaining *place* first, *расчётный* first, or always show both as equal siblings (current) with only a note?
2. **Mobile list–detail:** Prefer light sticky «← Обзор» bar (scroll) or true hide-list / show-detail stack (stateful)? Tolerance for browser Back vs in-page control?
3. **Status color forever ink?** Confirm long-term: no green/amber/red even for marketing screenshots / OG — or allow chroma *only* in share image, never in app chrome?
4. **«Расчётный» wording:** Keep as-is, or harden everywhere to «расчётный балл / оценка» so nobody reads it as official проходной from приказа?
5. **Hero faculty weight vs brand:** Faculty trigger is currently the loudest center signal. Is that intentional (channel into faculty) or should brand occasionally appear larger above the fold on first visit only?
6. **Summary strip:** Keep counts of В зоне / На грани / Ниже, or is it expendable chrome once overview marks + sort exist?
7. **Disclosure of within-band math:** Always visible one-liner vs Details expand — how much methodology do stressed applicants want before they trust the number?
8. **Mixed retention urgency:** Global banner enough, or do you want per-table / per-row staleness even if it adds copy noise during soft-fail nights?
9. **Scope freeze:** Confirm overnight / R3 should still **not** redesign chance-track pin geometry — only copy/CSS hierarchy around it.
10. **Multi-uni:** Explicitly out of visual scope (stubs exist). Any morning desire to keep UI language BSU-specific (“таблица мониторинга”) vs future-neutral (“канал”)?

---

## Suggested R3 intake (for implementers — not this round)

If morning agrees with P0:

1. Contradiction + underfilled note sentences in `radar.js` (copy only).  
2. Metric primary/secondary CSS weight in `components.css`.  
3. Overview row `aria-label` including status.  
4. Retention-scoped note when retained form selected.  

Defer motion additions until after honesty copy lands — numbers first, presence second.

---

*End of R2 design research. No application code modified.*
