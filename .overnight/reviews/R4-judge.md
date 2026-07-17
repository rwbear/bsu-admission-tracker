# R4 Judge — UX / a11y hunt + follow-up ship

**Round:** 4 · UX / mobile / a11y / freshness  
**Artifacts:** `.overnight/bugs/R4-ux-a11y-hunt.md` + ship `a9a3df3`  
**Judge UTC:** 2026-07-16T00:06Z  
**Spot-check base:** hunt text + `git show a9a3df3` + live `js/ui/table-picker.js` / `js/main.js` / `js/ui/radar.js` / `css/layout.css` / `index.html` OG + `assets/og-share.jpg` (1200×340)

---

## Independent verification

| Claim | Check | Result |
|-------|--------|--------|
| **Hunt B1** table remount vs faculty live shell | Pre-ship pattern (diff) cleared host every `renderTablePicker`; post-ship `paintTableList` + live-shell branch mirrors faculty | **Confirmed → fixed.** Search node survives query patches. |
| **Hunt B1** `#table-overlay-root` z-index | Live CSS | **Confirmed → fixed.** `#table-overlay-root { position: relative; z-index: 80; }` matches `#faculty-overlay-root`. |
| **Hunt B2** banner only on success | Diff: `applyBanner(state.uniData)` in silent-fail `catch` when prior data exists | **Confirmed → narrowed fix.** Main fail-path repro addressed; not schedule-tick / `armNextRefresh` driven. |
| **Hunt B4** aria place wording | `radar.js` aria | **Copy fixed.** Was `N из M мест выше тебя` → `над тобой N при плане M`. Remount/focus loss **not** shipped. |
| **Hunt B5** reduced-motion scroll | CSS `html { scroll-behavior: auto }` under reduce; `onSelectSpecialty` branches `behavior` | **Partial.** Score-submit `#board` scroll still hardcoded `smooth`. `CLOSE_MS = 220` still fixed (table **and** faculty); table now *gains* delayed close via faculty port. |
| **Hunt B3** Tab trap | No diff | **Unfixed** (expected if morning capped at ranking #1–2). |
| **Hunt B6** OG geometry / brand | `og-share.jpg` 1200×340; `og:image:height` 340; title product-first | **Unfixed.** Spot-check matches hunt. |
| **Hunt FP** second mobile `scrollIntoView` | `onSelectSpecialty` already scrolls detail ≤767 | **Correct FP** — ship did not add a second path. |
| **Caret hack drop** (B1 fix sketch) | `onTableQuery` still focus + `setSelectionRange` | **Left in.** Harmless with live shell; still papering. |

---

## Scores (1–5)

| Axis | Score | Notes |
|------|------:|-------|
| **Depth** | **4** | Hunt correctly separates remount flicker from focus hacks, banner honesty from poll tightening, and aria wording from list remount. Traces real call paths (`renderBoard` → `renderHeroChrome`, `fetchData` catch → `armNextRefresh`). Ship proves B1 by a faithful faculty port (`paintTableList`, `is-leaving`, opts on host). Not 5: B2/B5 incomplete under the ship’s own claim line; B4 focus half-skipped. |
| **Rigor** | **4** | Excellent FP / smell hygiene (second scroll, meta fade, fetchChain, stale *poll* vs banner). Severity stack is a bit Hot-Take (“High” ×4) but tags and repros hold under code review. Ship matches faculty structure; cache-bust `al` bumped. Deduct: commit message overclaims “motion a11y”; caret restore not removed; no schedule-driven banner. |
| **Product fit** | **5** | This product’s UX physics: equal hero pickers, stale chase must show the honesty banner, aria mirrors «Над тобой / мест», don’t invent a second mobile scroll, OG brand gap acknowledged without overnight redesign LARPing. Ranking B1→B2 first is right. |
| **Ship readiness** | **3** | `a9a3df3` is a real morning-grade polish ship for **B1 + z-index + B2 fail-path + aria copy + CSS reduce scroll**. Not sealed: Tab trap (B3), overview focus remount (B4 rest), score-submit smooth + CLOSE_MS reduce (B5 rest), OG (B6), dead caret hack. Treat as **first tranche**, not closed UX night. |

---

## Keep

- Hunt **B1–B6** ranking and the FP table (especially “no second `scrollIntoView`”).
- Ship **table-picker shell parity** (`paintTableList` / live shell / close leave animation) + `#table-overlay-root` z-index **80**.
- Ship **`applyBanner(state.uniData)` on failed silent poll** when prior snapshot exists.
- Ship overview aria → **`над тобой N при плане M`** (mirrors visible metric better than «из … мест выше»).
- CSS `scroll-behavior: auto` under `prefers-reduced-motion: reduce`; detail-select reduced branch.
- Smells **S1–S6** left as smells; B6 correctly deferred behind remount/freshness.

## Kill

- Treating **`a9a3df3` as “motion a11y done.”** Score submit still smooth; CLOSE_MS still 220; table close delay is newly inherited.
- Shipping a **second** mobile detail scroll (hunt FP — stay dead).
- Elevating Tab trap / OG into blockers for *this* tranche if morning bandwidth is only B1/B2 — they remain real, not this commit’s job.
- Re-opening faculty shell redesign while table finally caught up — parity won; don’t diverge again.
- Dropping the stale-banner complaint because poll already tightens — honesty UX is the banner, not the timer.

## Fix before morning

1. **B2 completeness:** call `applyBanner(state.uniData)` from `armNextRefresh` / schedule tick when data exists so age-crossing without a fail still reveals the banner.
2. **B5 remainder:** `prefersReducedMotion()` (or shared helper) on score-submit `scrollIntoView`; `CLOSE_MS → 0` (both pickers) under reduce.
3. **Drop caret-restore** in `onTableQuery` now that the input survives (or leave with a one-line “belt” comment — don’t pretend remount still happens).
4. **B4 rest:** incremental overview selection / focus restore when id set unchanged.
5. **B3** Tab trap (or `inert` on `.site`) for both overlays — next polish tranche.
6. **B6** OG 1200×630 + brand-forward share copy — separate asset task, not a drive-by.

## Verdict

**pass**

Hunt is solid, on-product, and correctly ranked; the ship lands the highest-leverage remount/z-index/banner-honesty slice without breaking faculty parity. Incomplete motion + deferred B3/B4-focus/B6 mean readiness is **tranche-1**, not UX closed. Do not scrap; do not invent a second scroll; finish B2 schedule banner and B5 CLOSE_MS/score-scroll next.
