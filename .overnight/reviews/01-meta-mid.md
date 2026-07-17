# Meta overview — mid checkpoint (pre-ship R6)

**UTC:** ~2026-07-15T23:50Z · After R1–R3 judges (all **pass**) · Entering ship

## 1. Elapsed / remaining
- **Elapsed:** ~0h10m–0h15m (start 23:40:43Z)
- **Hard stop:** 8h00m–9h00m → ~2026-07-16T07:40–08:40Z
- **Budget left:** ~7h45m–8h50m
- **Pacing read:** Research burn is done early (good). Do **not** stretch later rounds with filler — spend hours on fixture-backed ships, scrape invariants, R4 UX/a11y, polish+regimes, morning packet. Idle redesign = waste.

## 2. Critical path?
**Yes — if ship is fixture-backed; no if parent lands parse fixes without goldens.**

Critical path right now is **R3 Keep stack → tests → honest snapshot**, not more research:
1. **B1+B3** (label-mapped plan/apps + rowspan in `extractTables`) **with golden HTML** for forms `2` / `29` / `32`
2. **B2** nullish zero-apps (not `||`)
3. **B4** scored-but-neutral policy
4. **B5/B6** one `competition` definition (`max(apps,bsum)` until parse is honest) — B5 is **not** new contest math
5. Design **P0#1** contradiction copy only (dual-signal honesty)

R1–R3 maps/judges are strong enough to drive that. Judges cleared compute dual-signal; scrape column model is the indictment. Do not reopen pin / peopleAbove.

## 3. Quality risks right now
- **Shipping B1–B3 too early without fixtures.** R3 judge ship readiness = **3**: audit morning-ready, **code not landable as-is**. Positional parse “truth” without stored formk1 HTML = silent re-break next scrape. **Gate:** no normalize merge until goldens + `npm test` green (baseline was 58/0).
- Treating **B5** as peer root cause equal to B1 — fix parse (or temporary max fallback), don’t invent pressure formulas.
- Design **P0#2** is still soft (“optional microcopy”) — commit one «Расчётный балл» string or demote to P1; don’t ship mush.
- **P1#8A** as written would duplicate existing `onSelectSpecialty` → `scrollIntoView` — residual gap is return-to-list, not discover scroll. Out of this ship bundle.
- Fake polish: CSS hierarchy (P0#5–#6) before poisoned «Конкурс» / underfilled lies are fixed — wrong order.
- Scope creep into redesign / motion adds / hub stubs — judges already Kill’d.

## 4. Recommended next 60–90 min
**Primary: Ship block A — parse + invariants, fixtures first.**

1. Extract/store golden HTML slices (bio `2`/`32`, military `29`) + unit asserts for plan / Всего / по конкурсу / rowspan alignment.
2. Implement B1+B3+B2 in `normalize.mjs`; B4 in `enrichSpec`; B6 (+ B5 fallback) so pressure/note share one competition definition.
3. Wire CI smells: `totalApps >= inCompetition` when both > 0; bsum band; passing recompute — extend `npm test`, don’t trust snapshot tallies alone.
4. Ship design **P0#1** contradiction sentence in the same window only if it doesn’t steal from fixture work; else immediately after tests green.
5. **Do not** rescan live HTML “for fun” after goldens exist — one regen after parser lands, then stop.

If parse+fixtures slip past ~90–120m, cut design hierarchy P0#5–#6 to later; keep honesty copy + B4/B6.

## 5. Stop doing
- Shipping normalize/apps fixes **without** formk1 goldens in-repo.
- Re-opening chance-track pin / peopleAbove / “status vs pin contradiction” theory (R3 cleared).
- Implementing P1 mobile second-scroll, Design-System LARPing, P0#2 optional waffle, S1–S3 math smells as overnight must-fix.
- Another research round before a green test delta on B1–B4.
- Padding remaining ~8h with polish-without-tests or brand re-litigation.

## 6. Morning packet readiness
**Yellow** — judge trail R1–R3 solid; product map + design brief + confirmed bug hunt exist. Still **red on shipped delta**: no overnight code land, PROGRESS board still says Round 0, production snapshot remains poisoned until B1–B3 land. Green only after: fixture-backed ship + test count written + short “what we fixed / what we refused” draft before ~T+7.5h.

---

**Hard call on parent’s planned ship (B1–B6 + P0 contradiction):**  
Proceed **only** with fixtures for B1–B3 in the same change set (or immediate follow-up commit before claiming done). B4, B6, and P0#1 copy are safe to land with unit tests without HTML. Shipping “normalize rowspan/apps” on vibes before goldens = **too early** — say revise, don’t celebrate.
